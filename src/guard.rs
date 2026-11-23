//! The checks that guard money.
//!
//! typeshi's other errors are jokes with real line numbers. These are not: each one is a bug class
//! that has drained real programs. Every check has a stable code, `typeshi explain <code>` prints
//! what it catches, the exploit behind it and the fix, and `docs/checks/<code>.md` is that text,
//! tested: its failing example must raise the code and its fixed example must compile clean.

use crate::diag::Diag;
use proc_macro2::{Span, TokenTree};
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
pub const CHECKS: &[Check] = &[Check {
    code: "SHI001",
    title: "anyone can write an account that has an owner",
    doc: include_str!("../docs/checks/SHI001.md"),
}];

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
