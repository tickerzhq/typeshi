//! The checks that guard money. Every `docs/checks/<code>.md` is part of the test suite, the way
//! Rust tests its error index: each `shi,fail` example must raise that code, each `shi,pass` example
//! must compile without it, and the page's title must match the compiler's.

use std::fs;
use typeshi::{guard::CHECKS, transpile, Options};

/// (kind, source) for every ```shi,fail and ```shi,pass block.
fn examples(doc: &str) -> Vec<(&str, String)> {
    let mut out = vec![];
    let mut cur: Option<(&str, String)> = None;
    for line in doc.lines() {
        match (&mut cur, line.trim()) {
            (None, l) if l == "```shi,fail" || l == "```shi,pass" => cur = Some((&l[7..], String::new())),
            (Some(_), "```") => out.push(cur.take().unwrap()),
            (Some((_, src)), _) => {
                src.push_str(line);
                src.push('\n');
            }
            _ => {}
        }
    }
    assert!(cur.is_none(), "an unclosed example");
    out
}

#[test]
fn every_check_page_holds() {
    assert!(!CHECKS.is_empty());
    for c in CHECKS {
        let first = c.doc.lines().next().unwrap_or("");
        assert_eq!(
            first,
            format!("# {}: {}", c.code, c.title),
            "{}: the page title drifted",
            c.code
        );
        let ex = examples(c.doc);
        assert!(
            ex.iter().any(|(k, _)| *k == "fail"),
            "{}: needs a failing example",
            c.code
        );
        assert!(
            ex.iter().any(|(k, _)| *k == "pass"),
            "{}: needs a fixed example",
            c.code
        );
        for (i, (kind, src)) in ex.iter().enumerate() {
            let r = transpile(src, &Options::default());
            if *kind == "fail" {
                let diags = match r {
                    Ok(o) => o.diags,
                    Err(d) => d,
                };
                assert!(
                    diags.iter().any(|d| d.code == Some(c.code) && d.is_error()),
                    "{} example {i} should fail with {}: {diags:?}",
                    c.code,
                    c.code
                );
            } else {
                let o = r.unwrap_or_else(|d| panic!("{} example {i} should compile: {d:?}", c.code));
                assert!(
                    !o.diags.iter().any(|d| d.code == Some(c.code)),
                    "{} example {i} should not raise {}",
                    c.code,
                    c.code
                );
            }
        }
    }
}

#[test]
fn every_page_is_a_check() {
    for e in fs::read_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/docs/checks")).unwrap() {
        let name = e.unwrap().file_name().to_string_lossy().to_string();
        let code = name.trim_end_matches(".md");
        assert!(
            CHECKS.iter().any(|c| c.code == code),
            "docs/checks/{name} has no entry in guard::CHECKS"
        );
    }
}

#[test]
fn explain_finds_a_check_in_any_case() {
    assert_eq!(typeshi::guard::explain("shi001").map(|c| c.code), Some("SHI001"));
    assert!(typeshi::guard::explain("E0382").is_none());
}
