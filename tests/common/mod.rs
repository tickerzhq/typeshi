//! Helpers shared by the integration tests.
#![allow(dead_code)]

use std::path::{Path, PathBuf};

pub fn root() -> &'static Path {
    Path::new(env!("CARGO_MANIFEST_DIR"))
}

pub fn fixture(name: &str) -> String {
    std::fs::read_to_string(root().join("tests/fixtures").join(name)).expect("fixture")
}

/// A fresh, empty scratch directory under cargo's per-test tmp dir.
pub fn scratch(name: &str) -> PathBuf {
    let d = Path::new(env!("CARGO_TARGET_TMPDIR")).join(name);
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).unwrap();
    d
}

/// 1-based line and 0-based column of the first `needle` in `text`.
pub fn find(text: &str, needle: &str) -> (usize, usize) {
    for (i, l) in text.lines().enumerate() {
        if let Some(c) = l.find(needle) {
            return (i + 1, l[..c].chars().count());
        }
    }
    panic!("`{needle}` not found in:\n{text}");
}

/// The rustc output in tests/fixtures/rustc was captured from a real `cargo check`
/// of gm_counter.shi. If typeshi's output moves a line, move the line numbers the
/// same way: rustc printed each erroring line, so find it in today's lib.rs.
pub fn resync(stderr: &str, rust: &str) -> String {
    let gen: Vec<&str> = rust.lines().collect();
    let mut moves = vec![];
    for l in stderr.lines() {
        let Some((num, code)) = l.split_once(" | ") else {
            continue;
        };
        let Ok(old) = num.trim().parse::<usize>() else { continue };
        let new = gen
            .iter()
            .position(|g| *g == code)
            .unwrap_or_else(|| panic!("rustc fixture is out of date: `{code}` is not in today's lib.rs"))
            + 1;
        moves.push((old, new));
    }
    let mut out = stderr.to_string();
    for (old, new) in moves {
        out = out
            .replace(&format!("lib.rs:{old}:"), &format!("lib.rs:@{new}:"))
            .replace(&format!("\n{old} | "), &format!("\n@{new} | "));
    }
    out.replace('@', "")
}
