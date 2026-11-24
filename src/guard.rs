//! The checks that guard money.
//!
//! typeshi's other errors are jokes with real line numbers. These are not: each one is a bug class
//! that has drained real programs. Every check has a stable code, `typeshi explain <code>` prints
//! what it catches, the exploit behind it and the fix, and `docs/checks/<code>.md` is that text,
//! tested: its failing example must raise the code and its fixed example must compile clean.

use crate::diag::Diag;
use proc_macro2::{Delimiter, Spacing, Span, TokenTree};
use std::collections::HashMap;

/// One account in a `cap_table`, as the checks see it.
#[derive(Clone, Debug)]
pub struct Account {
    pub name: String,
    /// The field's name in the `.shi`, where a finding points.
    pub span: Span,
    /// `Some("Vault")` for `Account<Vault>`.
    pub frame: Option<String>,
    pub signer: bool,
    /// `mut`, `close` or `realloc`, and not being created by this instruction.
    pub writes: bool,
    /// Marked `public`: anyone may write it, on purpose.
    pub public: bool,
    /// Every name its `has_one`, `constraint`, `seeds` and `address` mention.
    pub binds: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct Table {
    pub name: String,
    pub accounts: Vec<Account>,
}

/// A check: its code, a one-line title, and its explanation.
pub struct Check {
    pub code: &'static str,
    pub title: &'static str,
    pub doc: &'static str,
}

/// Every check, by code.
pub const CHECKS: &[Check] = &[
    Check {
        code: "SHI001",
        title: "anyone can write an account that has an owner",
        doc: include_str!("../docs/checks/SHI001.md"),
    },
    Check {
        code: "SHI002",
        title: "two different money units in one sum, comparison or write",
        doc: include_str!("../docs/checks/SHI002.md"),
    },
];

/// The check with this code, any case (`shi001` works).
pub fn explain(code: &str) -> Option<&'static Check> {
    CHECKS.iter().find(|c| c.code.eq_ignore_ascii_case(code.trim()))
}

/// Names that mean "whoever controls this account", when a frame stores one as a `Pubkey`.
const OWNER_NAMES: [&str; 12] = [
    "authority",
    "admin",
    "owner",
    "cabal",
    "creator",
    "manager",
    "operator",
    "controller",
    "governor",
    "maker",
    "ser",
    "anon",
];

/// Every identifier in `t`, groups included.
pub fn idents(t: &[TokenTree], out: &mut Vec<String>) {
    for tok in t {
        match tok {
            TokenTree::Ident(i) => out.push(i.to_string()),
            TokenTree::Group(g) => idents(&g.stream().into_iter().collect::<Vec<_>>(), out),
            _ => {}
        }
    }
}

/// `Vault` for `Account<Vault>` or `Box<Account<Vault>>`.
pub fn frame_of(ty: &[TokenTree]) -> Option<String> {
    let i = ty
        .iter()
        .position(|t| matches!(t, TokenTree::Ident(i) if i == "Account"))?;
    match (ty.get(i + 1), ty.get(i + 2)) {
        (Some(TokenTree::Punct(p)), Some(TokenTree::Ident(f))) if p.as_char() == '<' => Some(f.to_string()),
        _ => None,
    }
}

fn at(span: Span) -> (usize, usize) {
    let s = span.start();
    (s.line, s.column)
}

/// The accounts tied to a signer: signers themselves, then any account whose `has_one`,
/// `constraint`, `seeds` or `address` names one already tied (`bag.desk == desk` and
/// `desk.cabal == cabal` ties the bag), until nothing changes.
fn anchored(t: &Table) -> Vec<&str> {
    let mut tied: Vec<&str> = t
        .accounts
        .iter()
        .filter(|a| a.signer)
        .map(|a| a.name.as_str())
        .collect();
    loop {
        let more: Vec<&str> = t
            .accounts
            .iter()
            .filter(|a| !tied.contains(&a.name.as_str()))
            .filter(|a| a.binds.iter().any(|b| tied.contains(&b.as_str())))
            .map(|a| a.name.as_str())
            .collect();
        if more.is_empty() {
            return tied;
        }
        tied.extend(more);
    }
}

/// SHI001: an instruction can write an account whose data names an owner, and nothing ties that
/// account to a signer of the instruction. Anyone who signs anything passes.
fn unbound_owner(t: &Table, frame_keys: &HashMap<String, Vec<String>>, out: &mut Vec<Diag>) {
    let signers: Vec<&str> = t
        .accounts
        .iter()
        .filter(|a| a.signer)
        .map(|a| a.name.as_str())
        .collect();
    let tied = anchored(t);
    for a in t.accounts.iter().filter(|a| a.writes && !a.public) {
        let Some(keys) = a.frame.as_ref().and_then(|f| frame_keys.get(f)) else {
            continue;
        };
        if tied.contains(&a.name.as_str()) || keys.iter().any(|k| a.binds.contains(k)) {
            continue;
        }
        let (line, col) = at(a.span);
        let width = a.name.chars().count();
        // A signer with the same name as the stored key: the intent is plain, the check is missing.
        if let Some(k) = keys.iter().find(|k| signers.contains(&k.as_str())) {
            out.push(
                Diag::error(
                    format!(
                        "anyone can write `{}`: `{}.{k}` is never checked against the `{k}` signing.",
                        a.name, a.name
                    ),
                    line,
                    col,
                    width,
                    format!("any signer passes for `{k}` here"),
                )
                .with_code("SHI001")
                .with_help(format!(
                    "add `has_one = {k}` to `{}`'s #[account(...)], or `public` if anyone may write it",
                    a.name
                )),
            );
            continue;
        }
        if let Some(k) = keys.iter().find(|k| OWNER_NAMES.contains(&k.as_str())) {
            out.push(
                Diag::error(
                    format!("anyone can write `{}`: nothing checks `{}.{k}`.", a.name, a.name),
                    line,
                    col,
                    width,
                    format!("`{}` has an owner and `{}` never asks for it", a.name, t.name),
                )
                .with_code("SHI001")
                .with_help(format!(
                    "add the owner as a signer and `has_one = {k}`, tie `{}` to an account that is checked \
                     (`has_one = <that account>`), or mark it `public` if anyone may write it",
                    a.name
                )),
            );
        }
    }
}

/// Every money check over every cap_table.
pub fn check(tables: &[Table], frame_keys: &HashMap<String, Vec<String>>) -> Vec<Diag> {
    let mut out = vec![];
    for t in tables {
        unbound_owner(t, frame_keys, &mut out);
    }
    out
}

// ---------------------------------------------------------------------------------------------
// SHI002: money units

/// What one instruction body knows about units: the tickers, which account holds which frame,
/// and which params and locals are typed with a ticker.
pub struct Units<'a> {
    /// ticker -> decimals
    pub tickers: &'a HashMap<String, u8>,
    /// frame -> field -> type
    pub frame_fields: &'a HashMap<String, HashMap<String, String>>,
    /// account name in this instruction's cap_table -> its frame
    pub accounts: HashMap<String, String>,
    /// param or `let` name -> its ticker
    pub locals: HashMap<String, String>,
}

/// One value with a unit: what to call it in a message, and its ticker.
#[derive(Clone)]
struct Valued {
    shown: String,
    ticker: String,
}

/// An operator spelled by one or more joint punctuation tokens (`+`, `<=`, `+=`, `=>`).
struct Op {
    text: String,
    start: usize,
    end: usize,
    span: Span,
}

fn ops(t: &[TokenTree]) -> Vec<Op> {
    let mut out = vec![];
    let mut i = 0;
    while i < t.len() {
        if let TokenTree::Punct(p) = &t[i] {
            let (start, span) = (i, p.span());
            let mut text = String::new();
            while let Some(TokenTree::Punct(q)) = t.get(i) {
                text.push(q.as_char());
                i += 1;
                if q.spacing() == Spacing::Alone {
                    break;
                }
            }
            out.push(Op {
                text,
                start,
                end: i,
                span,
            });
        } else if matches!(&t[i], TokenTree::Ident(x) if x == "mogs") {
            out.push(Op {
                text: ">".into(),
                start: i,
                end: i + 1,
                span: t[i].span(),
            });
            i += 1;
        } else {
            i += 1;
        }
    }
    out
}

/// Operators that join two values of the same unit, and so must agree.
fn joins(op: &str) -> bool {
    matches!(
        op,
        "+" | "-" | "+=" | "-=" | "=" | "==" | "!=" | "<" | ">" | "<=" | ">="
    )
}

/// Operators that start a new expression: nothing on one side is compared with the other.
fn splits(op: &str) -> bool {
    joins(op) || matches!(op, "," | ";" | "&&" | "||" | "=>" | "->")
}

impl Units<'_> {
    fn field_ticker(&self, account: &str, field: &str) -> Option<String> {
        let frame = self.accounts.get(account)?;
        let ty = self.frame_fields.get(frame)?.get(field)?;
        self.tickers.contains_key(ty).then(|| ty.clone())
    }

    /// The unit of one operand, if it has exactly one. `x as u64` and anything scaled with `*`,
    /// `/` or `%` has none: converting on purpose is the way out.
    fn unit_of(&self, t: &[TokenTree]) -> Option<Valued> {
        if t.iter().any(|x| matches!(x, TokenTree::Ident(i) if i == "as")) {
            return None;
        }
        if ops(t).iter().any(|o| matches!(o.text.as_str(), "*" | "/" | "%")) {
            return None;
        }
        let mut found: Vec<Valued> = vec![];
        self.refs(t, &mut found);
        let first = found.first()?.clone();
        found.iter().all(|v| v.ticker == first.ticker).then_some(first)
    }

    /// Every value with a unit in `t`: `acc.field` for a cap_table account, `ctx.accounts.acc.field`,
    /// or a typed param or local.
    fn refs(&self, t: &[TokenTree], out: &mut Vec<Valued>) {
        let mut i = 0;
        while i < t.len() {
            match &t[i] {
                TokenTree::Group(g) => {
                    let inner: Vec<TokenTree> = g.stream().into_iter().collect();
                    self.refs(&inner, out);
                }
                TokenTree::Ident(id) => {
                    let name = id.to_string();
                    let dot = |k: usize| matches!(t.get(k), Some(TokenTree::Punct(p)) if p.as_char() == '.');
                    let ident = |k: usize| match t.get(k) {
                        Some(TokenTree::Ident(x)) => Some(x.to_string()),
                        _ => None,
                    };
                    // ctx.accounts.acc.field
                    if name == "ctx" && dot(i + 1) && ident(i + 2).as_deref() == Some("accounts") && dot(i + 3) {
                        if let (Some(acc), true, Some(field)) = (ident(i + 4), dot(i + 5), ident(i + 6)) {
                            if let Some(ticker) = self.field_ticker(&acc, &field) {
                                out.push(Valued {
                                    shown: format!("{acc}.{field}"),
                                    ticker,
                                });
                            }
                            i += 7;
                            continue;
                        }
                    }
                    // acc.field
                    if let (true, Some(field)) = (dot(i + 1), ident(i + 2)) {
                        if let Some(ticker) = self.field_ticker(&name, &field) {
                            out.push(Valued {
                                shown: format!("{name}.{field}"),
                                ticker,
                            });
                            i += 3;
                            continue;
                        }
                    }
                    // a typed param or local, used as a value (not `x.method()`)
                    let before_dot =
                        matches!(t.get(i.wrapping_sub(1)), Some(TokenTree::Punct(p)) if p.as_char() == '.');
                    if !before_dot && !dot(i + 1) {
                        if let Some(ticker) = self.locals.get(&name) {
                            out.push(Valued {
                                shown: name.clone(),
                                ticker: ticker.clone(),
                            });
                        }
                    }
                }
                _ => {}
            }
            i += 1;
        }
    }

    fn mismatch(&self, a: &Valued, b: &Valued, span: Span, width: usize, what: &str, out: &mut Vec<Diag>) {
        let (da, db) = (self.tickers[&a.ticker], self.tickers[&b.ticker]);
        let label = if da == db {
            format!("{} and {} are different assets", a.ticker, b.ticker)
        } else {
            let k = (da as i32 - db as i32).unsigned_abs();
            let factor = 10u128.pow(k).to_string();
            let factor = group_thousands(&factor);
            format!("{da} decimals against {db}: off by {factor}x")
        };
        let (line, col) = at(span);
        let msg = match what {
            "this writes" => format!(
                "this writes `{}` ({}) into `{}` ({}).",
                b.shown, b.ticker, a.shown, a.ticker
            ),
            "this subtracts" => format!(
                "this subtracts `{}` ({}) from `{}` ({}).",
                b.shown, b.ticker, a.shown, a.ticker
            ),
            _ => format!("{what} `{}` ({}) and `{}` ({}).", a.shown, a.ticker, b.shown, b.ticker),
        };
        out.push(
            Diag::error(msg, line, col, width, label)
                .with_code("SHI002")
                .with_help("convert one with a price first, or write `as u64` if you are converting on purpose"),
        );
    }

    /// Walk an instruction body: every `+`, `-`, comparison or assignment between two values with
    /// different units is a finding; `number_go_up!(acc.field, n)` and friends count as `+=`.
    pub fn check(&mut self, t: &[TokenTree], out: &mut Vec<Diag>) {
        // `let x: USDC = ...` types a local for the rest of the body
        for w in t.windows(4) {
            if let (TokenTree::Ident(l), TokenTree::Ident(x), TokenTree::Punct(c), TokenTree::Ident(ty)) =
                (&w[0], &w[1], &w[2], &w[3])
            {
                if l == "let" && c.as_char() == ':' && self.tickers.contains_key(&ty.to_string()) {
                    self.locals.insert(x.to_string(), ty.to_string());
                }
            }
        }
        let found = ops(t);
        let bounds: Vec<&Op> = found.iter().filter(|o| splits(&o.text)).collect();
        for (k, op) in bounds.iter().enumerate() {
            if !joins(&op.text) {
                continue;
            }
            let left_from = if k == 0 { 0 } else { bounds[k - 1].end };
            let right_to = bounds.get(k + 1).map(|o| o.start).unwrap_or(t.len());
            if op.start <= left_from || op.end >= right_to {
                continue; // unary minus and the like
            }
            let (Some(a), Some(b)) = (
                self.unit_of(&t[left_from..op.start]),
                self.unit_of(&t[op.end..right_to]),
            ) else {
                continue;
            };
            if a.ticker != b.ticker {
                let what = match op.text.as_str() {
                    "=" => "this writes",
                    "+" | "+=" => "this adds",
                    "-" | "-=" => "this subtracts",
                    _ => "this compares",
                };
                self.mismatch(&a, &b, op.span, op.text.chars().count(), what, out);
            }
        }
        // macros that add to a field: number_go_up!(acc.field, n), aura_farm!(acc.field, n)
        for (i, tok) in t.iter().enumerate() {
            let TokenTree::Ident(m) = tok else { continue };
            if !matches!(m.to_string().as_str(), "number_go_up" | "aura_farm") {
                continue;
            }
            let Some(TokenTree::Group(g)) = t.get(i + 2) else {
                continue;
            };
            if g.delimiter() != Delimiter::Parenthesis {
                continue;
            }
            let args: Vec<TokenTree> = g.stream().into_iter().collect();
            let Some(comma) = args
                .iter()
                .position(|x| matches!(x, TokenTree::Punct(p) if p.as_char() == ','))
            else {
                continue;
            };
            if let (Some(a), Some(b)) = (self.unit_of(&args[..comma]), self.unit_of(&args[comma + 1..])) {
                if a.ticker != b.ticker {
                    self.mismatch(&a, &b, m.span(), m.to_string().len(), "this adds", out);
                }
            }
        }
        // methods that add or subtract: vault.usdc.checked_sub(amount)
        for (i, tok) in t.iter().enumerate() {
            let TokenTree::Ident(m) = tok else { continue };
            let name = m.to_string();
            let what = match name.as_str() {
                "checked_add" | "saturating_add" | "wrapping_add" => "this adds",
                "checked_sub" | "saturating_sub" | "wrapping_sub" => "this subtracts",
                _ => continue,
            };
            let after_dot = i > 0 && matches!(&t[i - 1], TokenTree::Punct(p) if p.as_char() == '.');
            let Some(TokenTree::Group(g)) = t.get(i + 1) else {
                continue;
            };
            if !after_dot || g.delimiter() != Delimiter::Parenthesis {
                continue;
            }
            let from = bounds.iter().rev().find(|o| o.end < i).map(|o| o.end).unwrap_or(0);
            let arg: Vec<TokenTree> = g.stream().into_iter().collect();
            if let (Some(a), Some(b)) = (self.unit_of(&t[from..i - 1]), self.unit_of(&arg)) {
                if a.ticker != b.ticker {
                    self.mismatch(&a, &b, m.span(), name.len(), what, out);
                }
            }
        }
        for tok in t {
            if let TokenTree::Group(g) = tok {
                let inner: Vec<TokenTree> = g.stream().into_iter().collect();
                self.check(&inner, out);
            }
        }
    }
}

fn group_thousands(s: &str) -> String {
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    out
}
