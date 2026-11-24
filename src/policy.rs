//! `pocket_money`: what an AI agent may spend, written once and compiled to the policy formats of
//! the wallets agents hold keys in: Coinbase CDP, Turnkey and Privy. SHI008 refuses a blank check
//! before it reaches any of them: a token with no cap or no recipients, an address that isn't a
//! Solana address, a cap finer than the token's smallest unit.
//!
//! ```text
//! pocket_money trader {
//!     ticker USDC = 6;
//!     mint USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
//!     cap USDC = 250;                 // whole USDC per transfer; typeshi writes 250000000
//!     pay USDC => ["..."];            // the token accounts it may pay
//!     cap SOL = 0.05;                 // native SOL per transfer, in lamports
//!     pay SOL => ["..."];
//! }
//! ```
//!
//! Every field written below is one the vendor documents (checked against their docs on
//! 2026-11-24): CDP `solValue`, `solAddress`, `mintAddress`, `splValue`, `splAddress`; Turnkey
//! `solana.tx.program_keys`, `transfers` and `spl_transfers` with `amount`, `to`, `token_mint`;
//! Privy `Transfer.lamports`, `Transfer.to`, `TransferChecked.mint`, `TransferChecked.amount`,
//! `TransferChecked.destination`.

use crate::diag::Diag;
use proc_macro2::{Delimiter, Span, TokenStream, TokenTree};

const SYSTEM: &str = "11111111111111111111111111111111";
const TOKEN: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022: &str = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const COMPUTE_BUDGET: &str = "ComputeBudget111111111111111111111111111111";

/// One agent's allowance.
#[derive(Debug, Clone)]
pub struct Allowance {
    pub name: String,
    /// Turnkey user id the policy is for (its `consensus`), if given.
    pub signer: Option<String>,
    pub assets: Vec<Asset>,
}

/// One token the agent may send: at most `cap` (in the smallest unit) per transfer, only to `pay`.
#[derive(Debug, Clone)]
pub struct Asset {
    pub ticker: String,
    pub decimals: u8,
    /// None for native SOL.
    pub mint: Option<String>,
    pub cap: u128,
    pub cap_shown: String,
    pub pay: Vec<String>,
}

fn err(span: Span, width: usize, msg: impl Into<String>, label: impl Into<String>, help: &str) -> Diag {
    let s = span.start();
    Diag::error(msg, s.line, s.column, width, label)
        .with_code("SHI008")
        .with_help(help.to_string())
}

fn string_of(t: Option<&TokenTree>) -> Option<String> {
    match t {
        Some(TokenTree::Literal(l)) => syn::parse_str::<syn::LitStr>(&l.to_string()).ok().map(|s| s.value()),
        _ => None,
    }
}

fn ident_of(t: Option<&TokenTree>) -> Option<String> {
    match t {
        Some(TokenTree::Ident(i)) => Some(i.to_string()),
        _ => None,
    }
}

fn is_punct(t: Option<&TokenTree>, c: char) -> bool {
    matches!(t, Some(TokenTree::Punct(p)) if p.as_char() == c)
}

/// How many bytes a base58 string decodes to, or None if it isn't base58.
fn base58_len(s: &str) -> Option<usize> {
    const ALPHABET: &str = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let mut bytes: Vec<u8> = vec![];
    for c in s.chars() {
        let mut carry = ALPHABET.find(c)? as u32;
        for b in bytes.iter_mut().rev() {
            carry += (*b as u32) * 58;
            *b = (carry & 0xff) as u8;
            carry >>= 8;
        }
        while carry > 0 {
            bytes.insert(0, (carry & 0xff) as u8);
            carry >>= 8;
        }
    }
    let zeros = s.chars().take_while(|c| *c == '1').count();
    Some(zeros + bytes.len())
}

fn is_address(s: &str) -> bool {
    base58_len(s) == Some(32)
}

/// `250`, `0.05`, `1_000` in whole units, to the smallest unit.
fn raw_amount(text: &str, decimals: u8) -> Result<u128, String> {
    let t = text.replace('_', "");
    let (whole, frac) = t.split_once('.').unwrap_or((&t, ""));
    if whole.is_empty() || !whole.chars().all(|c| c.is_ascii_digit()) || !frac.chars().all(|c| c.is_ascii_digit()) {
        return Err(format!(
            "`{text}` isn't an amount: write whole units, like `250` or `0.05`"
        ));
    }
    if frac.len() > decimals as usize {
        return Err(format!(
            "`{text}` is finer than the token goes: it has {decimals} decimals, and this has {}",
            frac.len()
        ));
    }
    let scale = 10u128.pow(decimals as u32);
    let w: u128 = whole.parse().map_err(|_| format!("`{text}` is too big"))?;
    let f: u128 = if frac.is_empty() {
        0
    } else {
        format!("{frac:0<width$}", width = decimals as usize)
            .parse()
            .unwrap_or(0)
    };
    w.checked_mul(scale)
        .and_then(|x| x.checked_add(f))
        .ok_or_else(|| format!("`{text}` is too big"))
}

/// Check one `pocket_money name { ... }` item (its tokens, starting at the keyword).
pub fn check_item(b: &[TokenTree]) -> (Option<Allowance>, Vec<Diag>) {
    let mut diags = vec![];
    let kw_span = b.first().map(|t| t.span()).unwrap_or_else(Span::call_site);
    let (Some(name), Some(TokenTree::Group(g))) = (ident_of(b.get(1)), b.get(2)) else {
        diags.push(err(
            kw_span,
            12,
            "pocket_money needs a name and a body.",
            "write `pocket_money my_agent { ... }`",
            "what the agent may spend goes in the braces: ticker, mint, cap, pay",
        ));
        return (None, diags);
    };
    if g.delimiter() != Delimiter::Brace {
        diags.push(err(
            kw_span,
            12,
            "pocket_money needs a `{ ... }` body.",
            "here",
            "no body, no money",
        ));
        return (None, diags);
    }

    // statements, split on `;`
    let toks: Vec<TokenTree> = g.stream().into_iter().collect();
    let mut stmts: Vec<Vec<TokenTree>> = vec![vec![]];
    for t in toks {
        if is_punct(Some(&t), ';') {
            stmts.push(vec![]);
        } else {
            stmts.last_mut().unwrap().push(t);
        }
    }

    // what each ticker has, in the order first seen
    struct Seen {
        ticker: String,
        span: Span,
        decimals: Option<u8>,
        mint: Option<String>,
        cap: Option<(String, Span)>,
        pay: Option<(Vec<String>, Span, bool)>,
    }
    let mut seen: Vec<Seen> = vec![];
    let entry = |seen: &mut Vec<Seen>, t: &str, span: Span| -> usize {
        match seen.iter().position(|s| s.ticker == t) {
            Some(i) => i,
            None => {
                seen.push(Seen {
                    ticker: t.to_string(),
                    span,
                    decimals: if t == "SOL" { Some(9) } else { None },
                    mint: None,
                    cap: None,
                    pay: None,
                });
                seen.len() - 1
            }
        }
    };
    let mut signer = None;

    for s in stmts.iter().filter(|s| !s.is_empty()) {
        let word = ident_of(s.first()).unwrap_or_default();
        let at = s[0].span();
        match word.as_str() {
            "ticker" => match (ident_of(s.get(1)), is_punct(s.get(2), '='), s.get(3), s.len()) {
                (Some(t), true, Some(TokenTree::Literal(l)), 4) => match l.to_string().parse::<u8>() {
                    Ok(d) if d <= 18 => {
                        let i = entry(&mut seen, &t, s[1].span());
                        seen[i].decimals = Some(d);
                    }
                    _ => diags.push(err(
                        l.span(),
                        l.to_string().len(),
                        "a ticker's decimals are 0 to 18.",
                        "here",
                        "USDC is 6",
                    )),
                },
                _ => diags.push(err(
                    at,
                    6,
                    "in pocket_money a ticker is an amount: `ticker USDC = 6;`.",
                    "here",
                    "an agent spends amounts, not prices",
                )),
            },
            "mint" => match (ident_of(s.get(1)), is_punct(s.get(2), '='), string_of(s.get(3))) {
                (Some(t), true, Some(m)) if s.len() == 4 => {
                    if !is_address(&m) {
                        diags.push(err(
                            s[3].span(),
                            m.len() + 2,
                            format!("`{m}` isn't a Solana address."),
                            "a mint is 32 bytes of base58",
                            "copy the mint from the token's page on an explorer",
                        ));
                    }
                    if t == "SOL" {
                        diags.push(err(
                            s[1].span(),
                            3,
                            "SOL has no mint: it's the native token.",
                            "here",
                            "leave `mint SOL` out",
                        ));
                    }
                    let i = entry(&mut seen, &t, s[1].span());
                    seen[i].mint = Some(m);
                }
                _ => diags.push(err(
                    at,
                    4,
                    "a mint reads like `mint USDC = \"EPjF...\";`.",
                    "here",
                    "the token's mint address, quoted",
                )),
            },
            "cap" => match (ident_of(s.get(1)), is_punct(s.get(2), '='), s.get(3)) {
                (Some(t), true, Some(TokenTree::Literal(l))) if s.len() == 4 => {
                    let i = entry(&mut seen, &t, s[1].span());
                    seen[i].cap = Some((l.to_string(), l.span()));
                }
                _ => diags.push(err(
                    at,
                    3,
                    "a cap reads like `cap USDC = 250;`: whole units per transfer.",
                    "here",
                    "typeshi turns it into the smallest unit",
                )),
            },
            "pay" => {
                let arrow = is_punct(s.get(2), '=') && is_punct(s.get(3), '>');
                match (ident_of(s.get(1)), arrow, s.get(4)) {
                    (Some(t), true, Some(TokenTree::Group(list)))
                        if list.delimiter() == Delimiter::Bracket && s.len() == 5 =>
                    {
                        let mut to = vec![];
                        let mut bad = false;
                        for x in list.stream() {
                            if is_punct(Some(&x), ',') {
                                continue;
                            }
                            match string_of(Some(&x)) {
                                Some(a) if is_address(&a) => to.push(a),
                                Some(a) => {
                                    bad = true;
                                    diags.push(err(
                                        x.span(),
                                        a.len() + 2,
                                        format!("`{a}` isn't a Solana address."),
                                        "a recipient is 32 bytes of base58",
                                        "an 0x address is Ethereum's; on Solana an agent pays a token account",
                                    ))
                                }
                                None => diags.push(err(
                                    x.span(),
                                    1,
                                    "recipients are quoted addresses.",
                                    "here",
                                    "`pay USDC => [\"...\"];`",
                                )),
                            }
                        }
                        let i = entry(&mut seen, &t, s[1].span());
                        seen[i].pay = Some((to, list.span(), bad));
                    }
                    _ => diags.push(err(
                        at,
                        3,
                        "a pay list reads like `pay USDC => [\"...\"];`.",
                        "here",
                        "the accounts the agent may pay",
                    )),
                }
            }
            "signer" => match (is_punct(s.get(1), '='), string_of(s.get(2))) {
                (true, Some(id)) => signer = Some(id),
                _ => diags.push(err(
                    at,
                    6,
                    "a signer reads like `signer = \"turnkey-user-id\";`.",
                    "here",
                    "the user the policy is for",
                )),
            },
            _ => diags.push(err(
                at,
                word.len().max(1),
                "pocket_money holds `ticker`, `mint`, `cap`, `pay` and `signer`.",
                "this isn't one of them",
                "say what the agent may spend, and nothing else",
            )),
        }
    }

    let mut assets = vec![];
    for s in &seen {
        let Some(decimals) = s.decimals else {
            diags.push(err(
                s.span,
                s.ticker.len(),
                format!("`{}` has no decimals.", s.ticker),
                "declare it",
                &format!("add `ticker {} = 6;` (USDC has 6)", s.ticker),
            ));
            continue;
        };
        if s.ticker != "SOL" && s.mint.is_none() {
            diags.push(err(
                s.span,
                s.ticker.len(),
                format!("which token is `{}`? a cap without a mint caps nothing.", s.ticker),
                "no mint",
                &format!("add `mint {} = \"...\";`", s.ticker),
            ));
        }
        let cap = match &s.cap {
            None => {
                diags.push(err(
                    s.span,
                    s.ticker.len(),
                    format!("`{}` has no cap: that is a blank check.", s.ticker),
                    "no cap",
                    &format!(
                        "add `cap {} = ...;`, the most one transfer may send, in whole {}",
                        s.ticker, s.ticker
                    ),
                ));
                continue;
            }
            Some((text, span)) => match raw_amount(text, decimals) {
                Ok(0) => {
                    diags.push(err(
                        *span,
                        text.len(),
                        "a cap of 0 allows nothing.",
                        "here",
                        "leave the token out instead",
                    ));
                    continue;
                }
                Ok(raw) => (raw, text.replace('_', "")),
                Err(m) => {
                    diags.push(err(
                        *span,
                        text.len(),
                        m,
                        "here",
                        "whole units: `cap USDC = 250;` is 250 USDC",
                    ));
                    continue;
                }
            },
        };
        let pay = match &s.pay {
            Some((to, _, _)) if !to.is_empty() => to.clone(),
            // every address was wrong, and each already has its error
            Some((_, _, true)) => continue,
            Some((_, span, false)) => {
                diags.push(err(
                    *span,
                    2,
                    format!("`{}` may be paid to nobody.", s.ticker),
                    "empty",
                    "list the accounts, or leave the token out",
                ));
                continue;
            }
            None => {
                diags.push(err(
                    s.span,
                    s.ticker.len(),
                    format!("`{}` has no recipients: the agent could pay anyone.", s.ticker),
                    "no pay list",
                    &format!("add `pay {} => [\"...\"];`", s.ticker),
                ));
                continue;
            }
        };
        assets.push(Asset {
            ticker: s.ticker.clone(),
            decimals,
            mint: if s.ticker == "SOL" { None } else { s.mint.clone() },
            cap: cap.0,
            cap_shown: cap.1,
            pay,
        });
    }
    if seen.is_empty() {
        diags.push(err(
            kw_span,
            12,
            format!("`{name}` allows nothing."),
            "empty",
            "say what the agent may spend: ticker, mint, cap and pay",
        ));
    }
    let ok = !diags.iter().any(|d| d.is_error());
    (ok.then_some(Allowance { name, signer, assets }), diags)
}

/// Every `pocket_money` block in a file, at the top or inside a `stealth_launch`.
pub fn from_source(src: &str) -> Result<Vec<Allowance>, Vec<Diag>> {
    let toks: Vec<TokenTree> = match src.parse::<TokenStream>() {
        Ok(t) => t.into_iter().collect(),
        Err(e) => return Err(vec![Diag::error(format!("this doesn't tokenize: {e}"), 0, 0, 1, "")]),
    };
    let mut found = vec![];
    let mut diags = vec![];
    fn walk(t: &[TokenTree], found: &mut Vec<Allowance>, diags: &mut Vec<Diag>) {
        let mut i = 0;
        while i < t.len() {
            if ident_of(t.get(i)).as_deref() == Some("pocket_money") {
                let (a, d) = check_item(&t[i..(i + 3).min(t.len())]);
                found.extend(a);
                diags.extend(d);
                i += 3;
                continue;
            }
            if ident_of(t.get(i)).as_deref() == Some("stealth_launch") {
                if let Some(TokenTree::Group(g)) = t.get(i + 2) {
                    walk(&g.stream().into_iter().collect::<Vec<_>>(), found, diags);
                    i += 3;
                    continue;
                }
            }
            i += 1;
        }
    }
    walk(&toks, &mut found, &mut diags);
    if diags.iter().any(|d| d.is_error()) {
        return Err(diags);
    }
    if found.is_empty() {
        return Err(vec![Diag::error(
            "no pocket_money here.",
            0,
            0,
            1,
            "write `pocket_money my_agent { ... }`",
        )]);
    }
    Ok(found)
}

// ---------------------------------------------------------------------------------------------
// the three formats

fn js(s: &str) -> String {
    let mut o = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => o.push_str("\\\""),
            '\\' => o.push_str("\\\\"),
            '\n' => o.push_str("\\n"),
            c => o.push(c),
        }
    }
    o.push('"');
    o
}

fn list(xs: &[String]) -> String {
    format!("[{}]", xs.iter().map(|x| js(x)).collect::<Vec<_>>().join(", "))
}

fn what(a: &Asset) -> String {
    format!("{} {} per transfer", a.cap_shown, a.ticker)
}

/// Coinbase CDP Policy Engine: an account policy with accept rules for Solana signing and sending.
/// CDP accepts an operation no rule targets, so `notes()` says what this one leaves open.
pub fn cdp(al: &Allowance) -> String {
    let mut rules = vec![];
    for op in ["signSolTransaction", "sendSolTransaction"] {
        for a in &al.assets {
            let criteria = match &a.mint {
                None => format!(
                    "{{ \"type\": \"solValue\", \"solValue\": \"{}\", \"operator\": \"<=\" }},\n        {{ \"type\": \"solAddress\", \"addresses\": {}, \"operator\": \"in\" }}",
                    a.cap,
                    list(&a.pay)
                ),
                Some(m) => format!(
                    "{{ \"type\": \"mintAddress\", \"addresses\": {}, \"operator\": \"in\" }},\n        {{ \"type\": \"splValue\", \"splValue\": \"{}\", \"operator\": \"<=\" }},\n        {{ \"type\": \"splAddress\", \"addresses\": {}, \"operator\": \"in\" }}",
                    list(std::slice::from_ref(m)),
                    a.cap,
                    list(&a.pay)
                ),
            };
            rules.push(format!(
                "    {{\n      \"action\": \"accept\",\n      \"operation\": \"{op}\",\n      \"criteria\": [\n        {criteria}\n      ]\n    }}"
            ));
        }
    }
    format!(
        "{{\n  \"description\": {},\n  \"scope\": \"account\",\n  \"rules\": [\n{}\n  ]\n}}\n",
        js(&format!("typeshi pocket_money {}", al.name)),
        rules.join(",\n")
    )
}

/// Turnkey: one EFFECT_ALLOW policy. Only the System, Token, Token-2022 and Compute Budget programs
/// may appear, and every SOL and SPL transfer must fit a cap and a recipient. Anything else falls
/// to Turnkey's implicit deny.
pub fn turnkey(al: &Allowance) -> String {
    let addrs = |pay: &[String]| {
        pay.iter()
            .map(|p| format!("t.to == '{p}'"))
            .collect::<Vec<_>>()
            .join(" || ")
    };
    let sol = al
        .assets
        .iter()
        .find(|a| a.mint.is_none())
        .map(|a| format!("t.amount <= {} && ({})", a.cap, addrs(&a.pay)))
        .unwrap_or_else(|| "false".into());
    let spl: Vec<String> = al
        .assets
        .iter()
        .filter_map(|a| {
            a.mint.as_ref().map(|m| {
                format!(
                    "(t.token_mint == '{m}' && t.amount <= {} && ({}))",
                    a.cap,
                    addrs(&a.pay)
                )
            })
        })
        .collect();
    let spl = if spl.is_empty() {
        "false".into()
    } else {
        spl.join(" || ")
    };
    let condition = format!(
        "solana.tx.program_keys.all(p, p == '{SYSTEM}' || p == '{TOKEN}' || p == '{TOKEN_2022}' || p == '{COMPUTE_BUDGET}') && solana.tx.transfers.all(t, {sol}) && solana.tx.spl_transfers.all(t, {spl})"
    );
    let consensus = al
        .signer
        .as_ref()
        .map(|id| {
            format!(
                "  \"consensus\": {},\n",
                js(&format!("approvers.any(user, user.id == '{id}')"))
            )
        })
        .unwrap_or_default();
    let notes = al.assets.iter().map(what).collect::<Vec<_>>().join("; ");
    format!(
        "{{\n  \"policyName\": {},\n  \"effect\": \"EFFECT_ALLOW\",\n{consensus}  \"condition\": {},\n  \"notes\": {}\n}}\n",
        js(&format!("typeshi pocket_money {}", al.name)),
        js(&condition),
        js(&format!("written by typeshi: {notes}"))
    )
}

/// Privy: every instruction of a Solana transaction must be allowed, so there is one ALLOW rule per
/// kind of instruction the agent may use, for both signing methods.
pub fn privy(al: &Allowance) -> String {
    let mut rules = vec![];
    let cond = |source: &str, field: &str, op: &str, value: String| {
        format!(
            "{{ \"field_source\": \"{source}\", \"field\": \"{field}\", \"operator\": \"{op}\", \"value\": {value} }}"
        )
    };
    for method in ["signAndSendTransaction", "signTransaction"] {
        rules.push(format!(
            "    {{\n      \"name\": \"compute budget\",\n      \"method\": \"{method}\",\n      \"conditions\": [\n        {}\n      ],\n      \"action\": \"ALLOW\"\n    }}",
            cond("solana_program_instruction", "programId", "eq", js(COMPUTE_BUDGET))
        ));
        for a in &al.assets {
            let conditions = match &a.mint {
                None => vec![
                    cond(
                        "solana_system_program_instruction",
                        "Transfer.lamports",
                        "lte",
                        js(&a.cap.to_string()),
                    ),
                    cond("solana_system_program_instruction", "Transfer.to", "in", list(&a.pay)),
                ],
                Some(m) => vec![
                    cond("solana_token_program_instruction", "TransferChecked.mint", "eq", js(m)),
                    cond(
                        "solana_token_program_instruction",
                        "TransferChecked.amount",
                        "lte",
                        js(&a.cap.to_string()),
                    ),
                    cond(
                        "solana_token_program_instruction",
                        "TransferChecked.destination",
                        "in",
                        list(&a.pay),
                    ),
                ],
            };
            rules.push(format!(
                "    {{\n      \"name\": {},\n      \"method\": \"{method}\",\n      \"conditions\": [\n        {}\n      ],\n      \"action\": \"ALLOW\"\n    }}",
                js(&what(a)),
                conditions.join(",\n        ")
            ));
        }
    }
    format!(
        "{{\n  \"version\": \"1.0\",\n  \"name\": {},\n  \"chain_type\": \"solana\",\n  \"rules\": [\n{}\n  ]\n}}\n",
        js(&format!("typeshi pocket_money {}", al.name)),
        rules.join(",\n")
    )
}

/// What a format leaves to the wallet's own defaults, said once when it is written.
pub fn notes(format: &str) -> Option<&'static str> {
    match format {
        "cdp" => Some(
            "CDP accepts any operation no rule targets: this policy governs Solana transactions, \
             so message signing and every EVM operation stay open unless your project policy closes them",
        ),
        "turnkey" => Some("without `signer = \"...\";` this policy applies to every user in the organization"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base58_knows_an_address() {
        assert_eq!(base58_len(SYSTEM), Some(32));
        assert!(is_address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"));
        assert!(!is_address("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"));
        assert!(!is_address("EPjFWdd5AufqSSqeM2qN1xzy"));
        assert!(!is_address("not base58 0OIl"));
    }

    #[test]
    fn amounts_go_to_the_smallest_unit() {
        assert_eq!(raw_amount("250", 6), Ok(250_000_000));
        assert_eq!(raw_amount("0.05", 9), Ok(50_000_000));
        assert_eq!(raw_amount("1_000", 6), Ok(1_000_000_000));
        assert!(raw_amount("0.0000001", 6).is_err());
        assert!(raw_amount("1e6", 6).is_err());
    }
}
