//! rustc and anchor errors, pointed at the `.shi` you wrote.
//!
//! `typeshi build` and `typeshi test` pass the compiler's stderr through
//! [`Remap`]. Every rustc diagnostic is printed exactly as rustc printed it.
//! When its primary location is in a `.rs` file typeshi generated, the same
//! diagnostic follows, pointed at the `.shi` line it came from.

use crate::diag::{self, Level};
use crate::sourcemap::SourceMap;
use std::path::{Path, PathBuf};

/// A `.rs` file typeshi wrote, and the `.shi` it came from.
#[derive(Clone, Debug)]
pub struct Generated {
    /// The generated `.rs`, as written to disk.
    pub rs: PathBuf,
    /// The `.shi` path, as typeshi shows it.
    pub shi: String,
    /// The `.shi` source.
    pub src: String,
    pub map: SourceMap,
}

struct Hit {
    file: usize,
    shown: String,
    line: usize,
    col: usize,
    width: usize,
    label: Option<String>,
    carets: bool,
}

/// Feed it compiler output line by line; print what it hands back.
pub struct Remap {
    root: PathBuf,
    files: Vec<Generated>,
    color: bool,
    header: Option<String>,
    level: Level,
    hit: Option<Hit>,
}

impl Remap {
    /// `root` is the directory the compiler runs in; paths it prints are relative to it.
    pub fn new(root: &Path, files: Vec<Generated>, color: bool) -> Self {
        Remap {
            root: root.to_path_buf(),
            files,
            color,
            header: None,
            level: Level::Error,
            hit: None,
        }
    }

    /// One line of compiler output (without its newline) in, the lines to print out.
    pub fn line(&mut self, raw: &str) -> Vec<String> {
        let plain = strip_ansi(raw);
        let mut out = vec![];
        if let Some(level) = header_level(&plain) {
            out.extend(self.flush());
            self.header = Some(plain.trim_end().to_string());
            self.level = level;
        } else if plain.trim().is_empty() {
            out.extend(self.flush());
            self.header = None;
        } else if let Some((path, line, col)) = parse_arrow(&plain) {
            if self.hit.is_none() && self.header.is_some() {
                if let Some(file) = self.resolve(&path) {
                    self.hit = Some(Hit {
                        file,
                        shown: path,
                        line,
                        col,
                        width: 1,
                        label: None,
                        carets: false,
                    });
                }
            }
        } else if let Some(hit) = self.hit.as_mut().filter(|h| !h.carets) {
            if let Some((width, label)) = parse_carets(&plain) {
                hit.width = width;
                hit.label = label;
                hit.carets = true;
            }
        }
        out.push(raw.to_string());
        out
    }

    /// End of output: anything still pending.
    pub fn finish(&mut self) -> Vec<String> {
        self.flush()
    }

    fn flush(&mut self) -> Vec<String> {
        let Some(hit) = self.hit.take() else {
            return vec![];
        };
        let header = self.header.clone().unwrap_or_else(|| "error".into());
        let g = &self.files[hit.file];
        let from = format!("{}:{}:{}", hit.shown, hit.line, hit.col);
        let (blue, reset) = if self.color {
            ("\x1b[1;34m", "\x1b[0m")
        } else {
            ("", "")
        };
        let Some(pos) = g.map.span(hit.line, hit.col.saturating_sub(1), hit.width) else {
            if self.level == Level::Warning {
                return vec![];
            }
            return vec![format!(
                "  {blue}={reset} {from} is typeshi's own code, not a line you wrote. if that's our bug, open an issue."
            )];
        };
        let mut out = vec![String::new(), self.paint_header(&header)];
        let label = hit.label.unwrap_or_else(|| "here, in your typeshi".into());
        let snip = diag::snippet(
            &g.shi, &g.src, pos.line, pos.col, pos.width, &label, self.level, self.color,
        );
        out.extend(snip.lines().map(str::to_string));
        let pad = " ".repeat(pos.line.to_string().len());
        out.push(format!(
            "{pad} {blue}={reset} mapped from {from}. fix it in the .shi. nobody can edit the .rs."
        ));
        out
    }

    fn paint_header(&self, header: &str) -> String {
        if !self.color {
            return header.to_string();
        }
        let tint = match self.level {
            Level::Error => "\x1b[1;31m",
            Level::Warning => "\x1b[1;33m",
        };
        match header.split_once(':') {
            Some((word, rest)) => format!("{tint}{word}\x1b[0m\x1b[1m:{rest}\x1b[0m"),
            None => header.to_string(),
        }
    }

    /// Which generated file a path printed by the compiler refers to.
    fn resolve(&self, path: &str) -> Option<usize> {
        let p = Path::new(path);
        let full = if p.is_absolute() {
            p.to_path_buf()
        } else {
            self.root.join(p)
        };
        if let Ok(c) = full.canonicalize() {
            if let Some(i) = self
                .files
                .iter()
                .position(|g| g.rs.canonicalize().map(|r| r == c).unwrap_or(false))
            {
                return Some(i);
            }
        }
        self.files.iter().position(|g| g.rs.ends_with(p))
    }
}

/// `error[E0308]: ...` or `warning: ...` (not `error: could not compile`, which has no location anyway).
fn header_level(line: &str) -> Option<Level> {
    for (word, level) in [("error", Level::Error), ("warning", Level::Warning)] {
        if let Some(rest) = line.strip_prefix(word) {
            if rest.starts_with(':') || rest.starts_with('[') {
                return Some(level);
            }
        }
    }
    None
}

/// `   --> programs/x/src/lib.rs:85:40` into (path, line, col).
fn parse_arrow(line: &str) -> Option<(String, usize, usize)> {
    let rest = line.trim_start().strip_prefix("--> ")?;
    let (rest, col) = rest.rsplit_once(':')?;
    let (path, ln) = rest.rsplit_once(':')?;
    Some((path.to_string(), ln.trim().parse().ok()?, col.trim().parse().ok()?))
}

/// `    |        ^^^^^^ expected u64` into (6, Some("expected u64")).
fn parse_carets(line: &str) -> Option<(usize, Option<String>)> {
    let (gutter, body) = line.split_once('|')?;
    if !gutter.trim().is_empty() {
        return None;
    }
    let start = body.find('^')?;
    if !body[..start]
        .chars()
        .all(|c| c == ' ' || c == '-' || c == '|' || c == '_')
    {
        return None;
    }
    let carets = body[start..].chars().take_while(|c| *c == '^').count();
    let label = body[start + carets..].trim();
    Some((carets, (!label.is_empty()).then(|| label.to_string())))
}

/// Drop ANSI color codes.
pub fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' && chars.peek() == Some(&'[') {
            chars.next();
            for d in chars.by_ref() {
                if d.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_rustc_lines() {
        assert_eq!(
            parse_arrow("   --> programs/x/src/lib.rs:85:40"),
            Some(("programs/x/src/lib.rs".into(), 85, 40))
        );
        assert_eq!(
            parse_arrow("  --> C:\\x\\lib.rs:3:1"),
            Some(("C:\\x\\lib.rs".into(), 3, 1))
        );
        assert_eq!(parse_arrow("85 |     let x = 1;"), None);
        assert_eq!(
            parse_carets("    |                ^^^^^^ expected `u64`, found `&str`"),
            Some((6, Some("expected `u64`, found `&str`".into())))
        );
        assert_eq!(
            parse_carets("    |         ------   ^^^ here"),
            Some((3, Some("here".into())))
        );
        assert_eq!(parse_carets("85 |     a ^ b"), None);
        assert_eq!(header_level("error[E0308]: mismatched types"), Some(Level::Error));
        assert_eq!(header_level("warning: unused"), Some(Level::Warning));
        assert_eq!(header_level("errors everywhere"), None);
        assert_eq!(strip_ansi("\x1b[1;31merror\x1b[0m: x"), "error: x");
    }
}
