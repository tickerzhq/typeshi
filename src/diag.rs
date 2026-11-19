//! Compiler messages, rustc style. The jokes live here.

use std::fmt::Write as _;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Level {
    Error,
    Warning,
}

#[derive(Clone, Debug)]
pub struct Diag {
    pub level: Level,
    /// The headline, e.g. "banned move `rug!`".
    pub msg: String,
    /// 1-based line, 0-based column (as proc-macro2 reports them). 0 means "no location".
    pub line: usize,
    pub col: usize,
    /// How many characters to underline.
    pub width: usize,
    /// The punchline under the carets.
    pub label: String,
}

impl Diag {
    pub fn error(msg: impl Into<String>, line: usize, col: usize, width: usize, label: impl Into<String>) -> Self {
        Diag {
            level: Level::Error,
            msg: msg.into(),
            line,
            col,
            width: width.max(1),
            label: label.into(),
        }
    }

    pub fn warning(msg: impl Into<String>, line: usize, col: usize, width: usize, label: impl Into<String>) -> Self {
        Diag {
            level: Level::Warning,
            msg: msg.into(),
            line,
            col,
            width: width.max(1),
            label: label.into(),
        }
    }

    pub fn is_error(&self) -> bool {
        self.level == Level::Error
    }

    /// Render like rustc:
    ///
    /// ```text
    /// error: banned move `rug!`
    ///  --> lib.shi:7:9
    ///   |
    /// 7 |         rug!(feed);
    ///   |         ^^^^ not on our watch, anon
    /// ```
    pub fn render(&self, file: &str, src: &str, color: bool) -> String {
        let p = Palette::new(color);
        let (word, tint) = match self.level {
            Level::Error => ("error", p.red),
            Level::Warning => ("warning", p.yellow),
        };
        let mut out = format!("{tint}{word}{}{}: {}{}\n", p.reset, p.bold, self.msg, p.reset);
        if self.line == 0 {
            if !self.label.is_empty() {
                let _ = writeln!(out, "  {}={} {}", p.blue, p.reset, self.label);
            }
            return out;
        }
        out.push_str(&snippet(
            file,
            src,
            self.line,
            self.col,
            self.width,
            &self.label,
            self.level,
            color,
        ));
        out.push('\n');
        out
    }

    /// One JSON object on one line, for editors and CI (`typeshi check --json`).
    /// Lines and columns are 1-based; `end_column` is exclusive. No location: nulls.
    pub fn to_json(&self, file: &str) -> String {
        let severity = match self.level {
            Level::Error => "error",
            Level::Warning => "warning",
        };
        let (file, line, col, end) = if self.line == 0 {
            let f = if file.is_empty() {
                "null".to_string()
            } else {
                json_str(file)
            };
            (f, "null".to_string(), "null".to_string(), "null".to_string())
        } else {
            (
                json_str(file),
                self.line.to_string(),
                (self.col + 1).to_string(),
                (self.col + 1 + self.width).to_string(),
            )
        };
        format!(
            "{{\"severity\":\"{severity}\",\"message\":{},\"label\":{},\"file\":{file},\"line\":{line},\"column\":{col},\"end_column\":{end}}}",
            json_str(&self.msg),
            json_str(&self.label),
        )
    }
}

struct Palette {
    red: &'static str,
    yellow: &'static str,
    blue: &'static str,
    bold: &'static str,
    reset: &'static str,
}

impl Palette {
    fn new(color: bool) -> Self {
        if color {
            Palette {
                red: "\x1b[1;31m",
                yellow: "\x1b[1;33m",
                blue: "\x1b[1;34m",
                bold: "\x1b[1m",
                reset: "\x1b[0m",
            }
        } else {
            Palette {
                red: "",
                yellow: "",
                blue: "",
                bold: "",
                reset: "",
            }
        }
    }
}

/// The ` --> file:line:col` frame with the source line and carets under it.
/// `line` is 1-based, `col` 0-based.
#[allow(clippy::too_many_arguments)]
pub fn snippet(
    file: &str,
    src: &str,
    line: usize,
    col: usize,
    width: usize,
    label: &str,
    level: Level,
    color: bool,
) -> String {
    let p = Palette::new(color);
    let tint = match level {
        Level::Error => p.red,
        Level::Warning => p.yellow,
    };
    let (blue, reset) = (p.blue, p.reset);
    let mut out = String::new();
    let gutter = line.to_string().len();
    let pad = " ".repeat(gutter);
    let _ = writeln!(out, "{pad}{blue}-->{reset} {file}:{line}:{}", col + 1);
    let _ = writeln!(out, "{pad} {blue}|{reset}");
    let text = src.lines().nth(line.saturating_sub(1)).unwrap_or("");
    let _ = writeln!(out, "{blue}{line}{reset} {blue}|{reset} {text}");
    let lead: String = text
        .chars()
        .take(col)
        .map(|c| if c == '\t' { '\t' } else { ' ' })
        .collect();
    let label = if label.is_empty() {
        String::new()
    } else {
        format!(" {label}")
    };
    let _ = writeln!(
        out,
        "{pad} {blue}|{reset} {lead}{tint}{}{label}{reset}",
        "^".repeat(width.max(1)),
    );
    out
}

/// A JSON string literal.
pub fn json_str(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
