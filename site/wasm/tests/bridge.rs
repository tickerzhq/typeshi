//! The page trusts this JSON, so check it parses and says the right thing.

use serde_json::Value;

const GOOD: &str = r#"
gm!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
stealth_launch gm_program {
    frame Counter { n: u64 }
    cap_table Bump {
        #[account(mut)]
        counter: Account<Counter>,
    }
    lock_in fn bump(ctx) -> W {
        number_go_up!(counter.n);
        were_so_back!()
    }
}
"#;

fn parse(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or_else(|e| panic!("bad json: {e}\n{s}"))
}

#[test]
fn a_good_program_returns_rust() {
    let v = parse(&typeshi_wasm::transpile(GOOD, false));
    assert_eq!(v["ok"], true);
    assert_eq!(v["program"], "gm_program");
    assert!(v["rust"]
        .as_str()
        .unwrap()
        .contains("pub fn bump(ctx: Context<Bump>) -> Result<()>"));
    assert_eq!(v["fns"][0][0], "bump");
}

#[test]
fn a_rug_is_an_error_with_a_location() {
    let src = GOOD.replace("number_go_up!(counter.n);", "rug!(counter);");
    let v = parse(&typeshi_wasm::transpile(&src, false));
    assert_eq!(v["ok"], false);
    let d = &v["diags"][0];
    assert_eq!(d["severity"], "error");
    assert!(d["line"].as_u64().unwrap() > 0);
    assert!(d["rendered"].as_str().unwrap().contains("not on our watch, anon"));
    assert!(d["code"].is_null(), "a banned move has no check code");
}

#[test]
fn a_check_error_carries_its_code() {
    let src = include_str!("../../../docs/exploits/qubit.shi");
    let v = parse(&typeshi_wasm::transpile(src, false));
    assert_eq!(v["ok"], false);
    let d = &v["diags"][0];
    assert_eq!(d["code"], "SHI006");
    assert!(d["rendered"].as_str().unwrap().starts_with("error[SHI006]"));
}

#[test]
fn garbage_does_not_panic() {
    let v = parse(&typeshi_wasm::transpile("fn ( { \"unterminated", false));
    assert_eq!(v["ok"], false);
}

#[test]
fn the_lists_are_valid_json() {
    assert_eq!(
        parse(&typeshi_wasm::banned()).as_array().unwrap().len(),
        typeshi::BANNED.len()
    );
    assert_eq!(parse(&typeshi_wasm::fixed_errors()).as_array().unwrap().len(), 6);
    assert_eq!(typeshi_wasm::wen_moon(), "soon\u{2122}");
}
