//! rustc and anchor errors on the generated Rust point back at the `.shi`.

mod common;

use common::{find, fixture, resync, root};
use typeshi::remap::{Generated, Remap};
use typeshi::{transpile, Options, Pos};

fn ok(src: &str) -> typeshi::Output {
    transpile(src, &Options::default()).unwrap_or_else(|d| panic!("{d:?}"))
}

/// Where the generated text `gen` lands in the `.shi`, as the `.shi` line's text.
fn lands_on<'a>(o: &typeshi::Output, src: &'a str, gen: &str) -> &'a str {
    let (l, c) = find(&o.rust, gen);
    let p = o
        .map
        .lookup(l, c)
        .unwrap_or_else(|| panic!("`{gen}` (generated line {l}) maps nowhere"));
    src.lines().nth(p.line - 1).unwrap()
}

#[test]
fn rustc_columns_land_on_the_shi_token() {
    let src = fixture("rustc/gm_counter.shi");
    let o = ok(&src);
    // (generated text, the token in it, the .shi text, the token in it)
    for (gen, tok, shi, shi_tok) in [
        ("= \"lots\";", "\"lots\"", "= \"lots\")", "\"lots\""),
        ("counter.vibes;", "vibes", "counter.vibes)", "vibes"),
        ("pub name: String", "String", "name: String", "String"),
    ] {
        let (gl, gc) = find(&o.rust, gen);
        let gc = gc + gen.find(tok).unwrap();
        let (sl, sc) = find(&src, shi);
        let sc = sc + shi.find(shi_tok).unwrap();
        let want = Pos {
            line: sl,
            col: sc,
            width: shi_tok.len(),
        };
        assert_eq!(o.map.span(gl, gc, tok.len()), Some(want), "{gen}");
    }
}

#[test]
fn every_kind_of_item_maps_home() {
    // the examples are a separate Cargo workspace, so a packaged crate doesn't have them
    let example =
        |name: &str| std::fs::read_to_string(root().join(format!("examples/trenches/programs/{name}/src/lib.shi")));
    let (Ok(src), Ok(desk)) = (example("print_feed"), example("degen_desk")) else {
        return;
    };
    let o = ok(&src);
    for (gen, shi) in [
        ("declare_id!", "gm!(\""),
        ("pub type Ticker", "type_shi Ticker"),
        ("pub const MAX_PRINT", "const MAX_PRINT"),
        ("pub struct Feed", "frame Feed"),
        ("pub printed_at: i64", "printed_at: i64,"),
        ("pub struct Printed {", "alpha_leak Printed"),
        ("pub struct ListTicker", "cap_table ListTicker"),
        ("init,", "rent_free"),
        ("pub cabal: Signer", "cabal,"),
        ("pub fn print(", "lock_in fn print"),
        ("require!(value > 0", "trust_me_bro!(value mogs 0"),
        ("checked_add(1)", "number_go_up!(feed.prints)"),
        ("emit!(", "probably_nothing!(Printed"),
        ("if prints > 0", "bull prints mogs 0"),
        ("err!(Cope::NobodyCanEditItSkillIssue)", "L(\"nobody can edit it"),
        ("fn nobody_can_edit_it", "fn nobody_can_edit_it"),
    ] {
        let line = lands_on(&o, &src, gen);
        assert!(line.contains(shi), "`{gen}` landed on `{line}`, wanted `{shi}`");
    }
    let src = desk;
    let o = ok(&src);
    for (gen, shi) in [
        ("#ad not financial advice", "kol_promo!(fee)"),
        ("anchor_spl::token::burn", "lp_burned!"),
        ("we're a family. was.", "layoffs!"),
        ("realloc =", "graduate ="),
        ("close = cabal", "golden_parachute"),
        ("panic!(\"fired.", "fired!("),
        ("this is actually bullish", "bullish!("),
    ] {
        let line = lands_on(&o, &src, gen);
        assert!(line.contains(shi), "`{gen}` landed on `{line}`, wanted `{shi}`");
    }
}

#[test]
fn typeshi_s_own_lines_map_nowhere() {
    let o = ok(&fixture("rustc/gm_counter.shi"));
    for gen in [
        "use anchor_lang::prelude::*;",
        "pub enum Cope",
        "#[msg(\"skill issue\")]",
    ] {
        let (l, c) = find(&o.rust, gen);
        assert_eq!(o.map.lookup(l, c), None, "{gen}");
    }
}

#[test]
fn real_rustc_errors_point_at_the_shi() {
    let src = fixture("rustc/gm_counter.shi");
    let o = ok(&src);
    let stderr = resync(&fixture("rustc/cargo_check.stderr"), &o.rust);
    let files = vec![Generated {
        rs: "programs/gm_counter/src/lib.rs".into(),
        shi: "programs/gm_counter/src/lib.shi".into(),
        src: src.clone(),
        map: o.map.clone(),
    }];
    let mut remap = Remap::new(std::path::Path::new("."), files, false);
    let mut out = vec![];
    for l in stderr.lines() {
        out.extend(remap.line(l));
    }
    out.extend(remap.finish());
    let text = out.join("\n");

    // rustc's own output passes through untouched, in order
    let mut at = 0;
    for l in stderr.lines() {
        let i = text[at..].find(l).unwrap_or_else(|| panic!("lost `{l}`:\n{text}"));
        at += i + l.len();
    }
    // and each error also points at the .shi
    let (l, c) = find(&src, "\"lots\"");
    let (vl, vc) = find(&src, "counter.vibes");
    let (nl, nc) = find(&src, "String");
    for want in [
        format!("  --> programs/gm_counter/src/lib.shi:{l}:{}", c + 1),
        "        mark_to_market!(counter.aura = \"lots\");".to_string(),
        "^^^^^^ expected `u64`, found `&str`".to_string(),
        format!("  --> programs/gm_counter/src/lib.shi:{vl}:{}", vc + 9),
        "^^^^^ unknown field".to_string(),
        format!("  --> programs/gm_counter/src/lib.shi:{nl}:{}", nc + 1),
        "fix it in the .shi. nobody can edit the .rs.".to_string(),
    ] {
        assert!(text.contains(&want), "missing `{want}` in:\n{text}");
    }
    assert_eq!(text.matches("lib.shi:").count(), 3, "{text}");
    assert_eq!(text.matches("mapped from programs/gm_counter/src/lib.rs:").count(), 3);
}

#[test]
fn errors_in_typeshi_s_own_code_say_so() {
    let src = fixture("rustc/gm_counter.shi");
    let o = ok(&src);
    let (l, _) = find(&o.rust, "pub enum Cope");
    let files = vec![Generated {
        rs: "src/lib.rs".into(),
        shi: "src/lib.shi".into(),
        src,
        map: o.map,
    }];
    let mut remap = Remap::new(std::path::Path::new("."), files, false);
    let mut out = vec![];
    for line in [
        "error[E0000]: something".to_string(),
        format!("  --> src/lib.rs:{l}:1"),
        "   |".to_string(),
        String::new(),
    ] {
        out.extend(remap.line(&line));
    }
    let text = out.join("\n");
    assert!(text.contains("is typeshi's own code, not a line you wrote"), "{text}");
    assert!(!text.contains("lib.shi:"), "{text}");
}
