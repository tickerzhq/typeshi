//! `pocket_money`: an agent's allowance, compiled to Coinbase CDP, Turnkey and Privy policies.
//! Every output must be JSON the vendor documents; every blank check must be refused (SHI008).

use serde_json::Value;
use typeshi::policy;

const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SHOP: &str = "7h44au9S2DwyKgAbsepUv459K59cEHBqE9EjSCtC15bi";
const GAS: &str = "4Jcw4u6xczibsADH7hRFT7qdg6iVDFoCQnCB3WFxz6jP";

fn trader() -> policy::Allowance {
    let src = format!(
        "pocket_money trader {{
            ticker USDC = 6;
            mint USDC = \"{USDC_MINT}\";
            cap USDC = 250;
            pay USDC => [\"{SHOP}\"];
            cap SOL = 0.05;
            pay SOL => [\"{GAS}\"];
            signer = \"agent-user\";
        }}"
    );
    let mut all = policy::from_source(&src).unwrap_or_else(|d| panic!("{d:?}"));
    assert_eq!(all.len(), 1);
    all.remove(0)
}

fn json(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or_else(|e| panic!("not JSON: {e}\n{s}"))
}

#[test]
fn caps_are_written_in_the_smallest_unit() {
    let a = trader();
    let usdc = a.assets.iter().find(|x| x.ticker == "USDC").unwrap();
    assert_eq!(usdc.cap, 250_000_000);
    let sol = a.assets.iter().find(|x| x.ticker == "SOL").unwrap();
    assert_eq!(sol.cap, 50_000_000);
    assert!(sol.mint.is_none(), "SOL is native");
}

#[test]
fn cdp_gets_accept_rules_for_solana_signing_and_sending() {
    let p = json(&policy::cdp(&trader()));
    assert_eq!(p["scope"], "account");
    let rules = p["rules"].as_array().unwrap();
    assert_eq!(rules.len(), 4, "two operations times two tokens");
    for r in rules {
        assert_eq!(r["action"], "accept");
        assert!(matches!(
            r["operation"].as_str(),
            Some("signSolTransaction" | "sendSolTransaction")
        ));
    }
    let spl = rules
        .iter()
        .find(|r| r["criteria"][0]["type"] == "mintAddress")
        .unwrap();
    assert_eq!(spl["criteria"][0]["addresses"][0], USDC_MINT);
    assert_eq!(spl["criteria"][1]["type"], "splValue");
    assert_eq!(spl["criteria"][1]["splValue"], "250000000");
    assert_eq!(spl["criteria"][1]["operator"], "<=");
    assert_eq!(spl["criteria"][2]["type"], "splAddress");
    assert_eq!(spl["criteria"][2]["addresses"][0], SHOP);
    let sol = rules.iter().find(|r| r["criteria"][0]["type"] == "solValue").unwrap();
    assert_eq!(sol["criteria"][0]["solValue"], "50000000");
    assert_eq!(sol["criteria"][1]["addresses"][0], GAS);
    assert!(policy::notes("cdp")
        .unwrap()
        .contains("accepts any operation no rule targets"));
}

#[test]
fn turnkey_allows_only_capped_transfers_and_the_programs_they_need() {
    let p = json(&policy::turnkey(&trader()));
    assert_eq!(p["effect"], "EFFECT_ALLOW");
    assert_eq!(p["consensus"], "approvers.any(user, user.id == 'agent-user')");
    let c = p["condition"].as_str().unwrap();
    assert!(
        c.starts_with("solana.tx.program_keys.all(p, p == '11111111111111111111111111111111'"),
        "{c}"
    );
    assert!(c.contains("ComputeBudget111111111111111111111111111111"), "{c}");
    assert!(
        c.contains(&format!(
            "solana.tx.transfers.all(t, t.amount <= 50000000 && (t.to == '{GAS}'))"
        )),
        "{c}"
    );
    assert!(
        c.contains(&format!(
            "solana.tx.spl_transfers.all(t, (t.token_mint == '{USDC_MINT}' && t.amount <= 250000000 && (t.to == '{SHOP}')))"
        )),
        "{c}"
    );
}

#[test]
fn turnkey_denies_sol_transfers_when_sol_isnt_allowed() {
    let src = format!(
        "pocket_money p {{ ticker USDC = 6; mint USDC = \"{USDC_MINT}\"; cap USDC = 1; pay USDC => [\"{SHOP}\"]; }}"
    );
    let a = policy::from_source(&src).unwrap().remove(0);
    let p = json(&policy::turnkey(&a));
    assert!(p["condition"]
        .as_str()
        .unwrap()
        .contains("solana.tx.transfers.all(t, false)"));
    assert!(p.get("consensus").is_none());
}

#[test]
fn privy_allows_each_instruction_the_agent_needs_and_nothing_else() {
    let p = json(&policy::privy(&trader()));
    assert_eq!(p["version"], "1.0");
    assert_eq!(p["chain_type"], "solana");
    let rules = p["rules"].as_array().unwrap();
    assert_eq!(rules.len(), 6, "compute budget, SOL and USDC, for two methods");
    assert!(rules.iter().all(|r| r["action"] == "ALLOW"));
    let usdc = rules
        .iter()
        .find(|r| r["conditions"][0]["field"] == "TransferChecked.mint")
        .unwrap();
    assert_eq!(
        usdc["conditions"][0]["field_source"],
        "solana_token_program_instruction"
    );
    assert_eq!(usdc["conditions"][0]["value"], USDC_MINT);
    assert_eq!(usdc["conditions"][1]["field"], "TransferChecked.amount");
    assert_eq!(usdc["conditions"][1]["value"], "250000000");
    assert_eq!(usdc["conditions"][2]["field"], "TransferChecked.destination");
    assert_eq!(usdc["conditions"][2]["operator"], "in");
    let sol = rules
        .iter()
        .find(|r| r["conditions"][0]["field"] == "Transfer.lamports")
        .unwrap();
    assert_eq!(sol["conditions"][0]["value"], "50000000");
    assert_eq!(sol["conditions"][1]["field"], "Transfer.to");
}

fn refused(body: &str) -> Vec<String> {
    let src = format!("pocket_money bot {{ {body} }}");
    match policy::from_source(&src) {
        Ok(a) => panic!("a blank check compiled: {a:?}"),
        Err(d) => {
            assert!(d.iter().all(|x| x.code == Some("SHI008")), "{d:?}");
            d.into_iter().map(|x| x.msg).collect()
        }
    }
}

#[test]
fn a_blank_check_does_not_compile() {
    let has = |msgs: Vec<String>, want: &str| assert!(msgs.iter().any(|m| m.contains(want)), "{want}: {msgs:?}");
    let base = format!("ticker USDC = 6; mint USDC = \"{USDC_MINT}\";");
    has(
        refused(&format!("{base} pay USDC => [\"{SHOP}\"];")),
        "has no cap: that is a blank check",
    );
    has(
        refused(&format!("{base} cap USDC = 250;")),
        "the agent could pay anyone",
    );
    has(
        refused(&format!("{base} cap USDC = 250; pay USDC => [];")),
        "may be paid to nobody",
    );
    has(
        refused(&format!("{base} cap USDC = 0.0000001; pay USDC => [\"{SHOP}\"];")),
        "finer than the token goes",
    );
    has(
        refused(&format!("{base} cap USDC = 0; pay USDC => [\"{SHOP}\"];")),
        "a cap of 0 allows nothing",
    );
    has(
        refused(&format!(
            "{base} cap USDC = 1; pay USDC => [\"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\"];"
        )),
        "isn't a Solana address",
    );
    has(
        refused(&format!("ticker USDC = 6; cap USDC = 1; pay USDC => [\"{SHOP}\"];")),
        "a cap without a mint caps nothing",
    );
    has(
        refused(&format!("cap USDT = 1; pay USDT => [\"{SHOP}\"];")),
        "has no decimals",
    );
    has(refused(""), "allows nothing");
    has(
        refused(&format!(
            "{base} cap USDC = 1; pay USDC => [\"{SHOP}\"]; spend_it_all = true;"
        )),
        "holds `ticker`, `mint`",
    );
}

#[test]
fn the_compiler_checks_pocket_money_and_writes_no_rust_for_it() {
    let src = format!(
        "gm!(\"7PxhmDuhhe394QJgKyW1P7Ce4dPCfFPN2yKq4KCCj7Vj\");
        stealth_launch p {{
            pocket_money bot {{ ticker USDC = 6; mint USDC = \"{USDC_MINT}\"; cap USDC = 1; pay USDC => [\"{SHOP}\"]; }}
            frame Thing {{ n: u64 }}
        }}"
    );
    let o = typeshi::transpile(&src, &typeshi::Options::default()).unwrap_or_else(|d| panic!("{d:?}"));
    assert!(!o.rust.contains("pocket_money") && !o.rust.contains(SHOP), "{}", o.rust);
    let bad = src.replace("cap USDC = 1;", "");
    let d = typeshi::transpile(&bad, &typeshi::Options::default()).unwrap_err();
    assert!(d.iter().any(|x| x.code == Some("SHI008")), "{d:?}");
}
