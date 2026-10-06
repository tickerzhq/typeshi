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
        let (red, yellow, blue, bold, reset) = if color {
            ("\x1b[1;31m", "\x1b[1;33m", "\x1b[1;34m", "\x1b[1m", "\x1b[0m")
        } else {
            ("", "", "", "", "")
        };
        let (word, tint) = match self.level {
            Level::Error => ("error", red),
            Level::Warning => ("warning", yellow),
        };
        let mut out = String::new();
        let _ = writeln!(out, "{tint}{word}{reset}{bold}: {}{reset}", self.msg);
        if self.line == 0 {
            if !self.label.is_empty() {
                let _ = writeln!(out, "  {blue}={reset} {}", self.label);
            }
            return out;
        }
        let gutter = self.line.to_string().len();
        let pad = " ".repeat(gutter);
        let _ = writeln!(out, "{pad}{blue}-->{reset} {file}:{}:{}", self.line, self.col + 1);
        let _ = writeln!(out, "{pad} {blue}|{reset}");
        let text = src.lines().nth(self.line - 1).unwrap_or("");
        let _ = writeln!(out, "{blue}{}{reset} {blue}|{reset} {text}", self.line);
        let lead: String = text
            .chars()
            .take(self.col)
            .map(|c| if c == '\t' { '\t' } else { ' ' })
            .collect();
        let _ = writeln!(
            out,
            "{pad} {blue}|{reset} {lead}{tint}{} {}{reset}",
            "^".repeat(self.width),
            self.label
        );
        out.push('\n');
        out
    }
}
