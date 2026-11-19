//! The VS Code grammar knows every word the compiler knows.

mod common;

use common::root;
use serde_json::Value;

fn json(path: &str) -> Value {
    let p = root().join(path);
    let s = std::fs::read_to_string(&p).unwrap_or_else(|e| panic!("{}: {e}", p.display()));
    serde_json::from_str(&s).unwrap_or_else(|e| panic!("{}: {e}", p.display()))
}

/// The `match` regex of the pattern named `scope`, anywhere in the grammar.
fn pattern(v: &Value, scope: &str) -> Option<String> {
    match v {
        Value::Object(m) => {
            if m.get("name").and_then(Value::as_str) == Some(scope) {
                if let Some(s) = m.get("match").and_then(Value::as_str) {
                    return Some(s.to_string());
                }
            }
            m.values().find_map(|x| pattern(x, scope))
        }
        Value::Array(a) => a.iter().find_map(|x| pattern(x, scope)),
        _ => None,
    }
}

#[test]
fn grammar_knows_every_banned_move() {
    let g = json("editors/vscode/syntaxes/typeshi.tmLanguage.json");
    assert_eq!(g["scopeName"], "source.typeshi");
    let banned = pattern(&g, "invalid.illegal.banned-move.typeshi").expect("banned-move pattern");
    for (name, _) in typeshi::BANNED {
        assert!(
            banned.contains(name),
            "`{name}!` is banned but the grammar doesn't flag it"
        );
    }
}

#[test]
fn grammar_knows_the_slang() {
    let raw = std::fs::read_to_string(root().join("editors/vscode/syntaxes/typeshi.tmLanguage.json")).unwrap();
    for word in [
        // items
        "stealth_launch",
        "frame",
        "term_sheet",
        "cap_table",
        "alpha_leak",
        "cope",
        "type_shi",
        "deadass",
        // fns, types, values, flow
        "lock_in",
        "ape",
        "few_understand",
        "ebitda",
        "Bps",
        "bull",
        "bear",
        "mogs",
        "cuz",
        "diamond_hands",
        "paper_hands",
        "wen_moon",
        // attributes, cap table words
        "on_god",
        "tokenmaxx",
        "vc_backed",
        "rent_free",
        "golden_parachute",
        "graduate",
        "exit_liquidity",
        "cabal",
        "anon",
        "kol",
        // statements
        "were_so_back",
        "its_so_over",
        "rekt",
        "seethe",
        "fired",
        "trust_me_bro",
        "funds_are_safu",
        "margin_call",
        "hodl",
        "touch_grass",
        "fren",
        "per_my_last_email",
        "mark_to_market",
        "number_go_up",
        "aura_farm",
        "ascend",
        "bags",
        "probably_nothing",
        "looksmaxx",
        "bonding_curve",
        "bundled",
        "full_send",
        "printer_go_brrr",
        "lp_burned",
        "mint_revoked",
        "freeze_revoked",
        "liquidated",
        "layoffs",
        "hostile_takeover",
        "mew",
        "this_is_fine",
        // confessions
        "vc_unlock",
        "kol_promo",
        "airdrop",
        "audit",
        "bullish",
        "trust_the_dev",
        "sell_the_bottom",
        "buy_the_top",
    ] {
        assert!(raw.contains(word), "the grammar doesn't know `{word}`");
    }
}

#[test]
fn extension_wires_up_shi_files() {
    let p = json("editors/vscode/package.json");
    let lang = &p["contributes"]["languages"][0];
    assert_eq!(lang["id"], "typeshi");
    assert_eq!(lang["extensions"][0], ".shi");
    let grammar = &p["contributes"]["grammars"][0];
    assert_eq!(grammar["scopeName"], "source.typeshi");
    assert!(root()
        .join("editors/vscode")
        .join(grammar["path"].as_str().unwrap())
        .is_file());
    json("editors/vscode/language-configuration.json");
    let attrs = std::fs::read_to_string(root().join(".gitattributes")).unwrap();
    assert!(attrs.contains("*.shi linguist-language=Rust"));
}
