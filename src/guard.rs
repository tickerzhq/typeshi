//! The checks that guard money.
//!
//! typeshi's other errors are jokes with real line numbers. These are not: each one is a bug class
//! that has drained real programs. Every check has a stable code, `typeshi explain <code>` prints
//! what it catches, the exploit behind it and the fix, and `docs/checks/<code>.md` is that text,
//! tested: its failing example must raise the code and its fixed example must compile clean.

use crate::diag::Diag;
use proc_macro2::{Delimiter, Spacing, Span, TokenStream, TokenTree};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

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
    /// Every name its `has_one`, `constraint`, `seeds`, `address` and `owner` mention.
    pub binds: Vec<String>,
    /// What kind of account it is, as far as the checks care.
    pub kind: Kind,
    /// The words of its `#[account(...)]`: `mut`, `seeds`, `address`, `owner`, `init_if_needed`...
    pub constraints: Vec<String>,
    /// Where `init_if_needed` was written, if it was.
    pub reinit: Option<Span>,
    /// The inside of its `seeds = [...]`, as written, if it is a PDA. `send_it!` signs with it.
    pub seeds: Option<Vec<TokenTree>>,
    /// Created by this instruction (`rent_free`/`init`): its balances start at zero.
    pub created: bool,
}

/// The kinds of account the checks tell apart.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Kind {
    /// `Account<T>`, `Signer`, `SystemAccount`, `Program<T>`, `Sysvar<T>`...: Anchor checks what it is.
    Typed,
    /// `UncheckedAccount` or `AccountInfo`: Anchor checks nothing.
    Raw,
    /// `Program` with no program named: any executable passes.
    AnyProgram,
}

impl Kind {
    /// The kind of a cap_table field's type, as written in the `.shi`.
    pub fn of(ty: &[TokenTree]) -> Kind {
        let first = match ty.first() {
            Some(TokenTree::Ident(i)) => i.to_string(),
            _ => return Kind::Typed,
        };
        match first.as_str() {
            "UncheckedAccount" | "AccountInfo" => Kind::Raw,
            // `Program` alone, or `Program<'info>` with no program type after the lifetime
            "Program" => {
                let named = ty
                    .iter()
                    .skip(1)
                    .any(|t| matches!(t, TokenTree::Ident(i) if i != "info"));
                if named {
                    Kind::Typed
                } else {
                    Kind::AnyProgram
                }
            }
            _ => Kind::Typed,
        }
    }
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
    Check {
        code: "SHI003",
        title: "an unchecked account nothing checks",
        doc: include_str!("../docs/checks/SHI003.md"),
    },
    Check {
        code: "SHI004",
        title: "a program to call that can be any program",
        doc: include_str!("../docs/checks/SHI004.md"),
    },
    Check {
        code: "SHI005",
        title: "init_if_needed lets a second call reset an account",
        doc: include_str!("../docs/checks/SHI005.md"),
    },
    Check {
        code: "SHI006",
        title: "money that comes from nowhere or goes nowhere",
        doc: include_str!("../docs/checks/SHI006.md"),
    },
    Check {
        code: "SHI007",
        title: "a conversion that comes out in the wrong unit or off by a power of ten",
        doc: include_str!("../docs/checks/SHI007.md"),
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

/// SHI003 and SHI004: accounts Anchor checks nothing about. A raw account must be pinned by `owner`,
/// `address`, `seeds` or a `constraint`; a program to call must be named, or pinned by `address`.
fn unchecked(t: &Table, out: &mut Vec<Diag>) {
    for a in &t.accounts {
        let has = |c: &str| a.constraints.iter().any(|x| x == c);
        let pinned = has("owner") || has("address") || has("seeds") || has("constraint");
        let (line, col) = at(a.span);
        let width = a.name.chars().count();
        let program = a.kind == Kind::AnyProgram || (a.kind == Kind::Raw && a.name.ends_with("program"));
        if program && !has("address") {
            out.push(
                Diag::error(
                    format!(
                        "`{}` can be any program, and whatever it does or returns is trusted.",
                        a.name
                    ),
                    line,
                    col,
                    width,
                    "a program the attacker wrote passes here",
                )
                .with_code("SHI004")
                .with_help(
                    "name the program (`Program<Token>`, `Program<System>`), or pin it: `address = <program id>`",
                ),
            );
        } else if a.kind == Kind::Raw && !pinned {
            out.push(
                Diag::error(
                    format!("nothing checks what `{}` is: it's an unchecked account.", a.name),
                    line,
                    col,
                    width,
                    "any account passes here, a fake one too",
                )
                .with_code("SHI003")
                .with_help(
                    "give it a type (`Account<T>`, `Sysvar<T>`, `Program<T>`) or pin it with `address = ...`, \
                     `owner = ...` or `seeds = [...]`. a `/// CHECK:` comment checks nothing",
                ),
            );
        }
    }
}

/// SHI005: `init_if_needed` creates the account on the first call and accepts it as it is on every
/// later one, so a handler that writes it from scratch resets whatever was there.
fn reinit(t: &Table, out: &mut Vec<Diag>) {
    for a in &t.accounts {
        if let Some(span) = a.reinit {
            let (line, col) = at(span);
            out.push(
                Diag::error(
                    format!("`init_if_needed` lets a second call reset `{}`.", a.name),
                    line,
                    col,
                    "init_if_needed".len(),
                    "on a later call the account already holds state",
                )
                .with_code("SHI005")
                .with_help(
                    "create it with `rent_free` in its own instruction, and write it with `mut` everywhere else",
                ),
            );
        }
    }
}

/// Every money check over every cap_table.
pub fn check(tables: &[Table], frame_keys: &HashMap<String, Vec<String>>) -> Vec<Diag> {
    let mut out = vec![];
    for t in tables {
        unbound_owner(t, frame_keys, &mut out);
        unchecked(t, &mut out);
        reinit(t, &mut out);
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
    /// price ticker -> (quote, base)
    pub prices: &'a HashMap<String, (String, String)>,
    /// (frame, field) marked `#[iou]`: owed to the program, so it counts against its balances
    pub owed: &'a HashSet<(String, String)>,
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

/// What a number means: which assets, to which power, and how many decimals its smallest unit
/// has. `scale` is the power of ten one raw unit is worth: USDC (6 decimals) is 10^-6 USDC.
#[derive(Clone, PartialEq, Debug, Default)]
struct Dim {
    units: BTreeMap<String, i32>,
    scale: i32,
}

impl Dim {
    fn combine(&self, other: &Dim, k: i32) -> Dim {
        let mut units = self.units.clone();
        for (u, e) in &other.units {
            *units.entry(u.clone()).or_insert(0) += e * k;
        }
        units.retain(|_, e| *e != 0);
        Dim {
            units,
            scale: self.scale + other.scale * k,
        }
    }
}

/// `USDC`, `USDC per SOL`, `SOL² per USDC`.
fn show_units(u: &BTreeMap<String, i32>) -> String {
    let pow = |n: i32| match n {
        1 => String::new(),
        2 => "²".into(),
        3 => "³".into(),
        n => format!("^{n}"),
    };
    let side = |pos: bool| {
        u.iter()
            .filter(|(_, e)| (**e > 0) == pos)
            .map(|(n, e)| format!("{n}{}", pow(e.abs())))
            .collect::<Vec<_>>()
            .join("·")
    };
    match (side(true), side(false)) {
        (n, d) if n.is_empty() && d.is_empty() => "a plain number".into(),
        (n, d) if d.is_empty() => n,
        (n, d) if n.is_empty() => format!("1 per {d}"),
        (n, d) => format!("{n} per {d}"),
    }
}

const WIDEN: [&str; 2] = ["u128", "i128"];
const INTS: [&str; 8] = ["u8", "u16", "u32", "u64", "u128", "i32", "i64", "i128"];

fn is_ident(t: Option<&TokenTree>, s: &str) -> bool {
    matches!(t, Some(TokenTree::Ident(i)) if i == s)
}

fn is_punct_at(t: &[TokenTree], i: usize, c: char) -> bool {
    matches!(t.get(i), Some(TokenTree::Punct(p)) if p.as_char() == c)
}

/// Whether a number is scaled anywhere in `t`: `*`, `/`, `.pow()`, `.checked_mul()` and the like.
fn scales(t: &[TokenTree]) -> bool {
    t.iter().any(|x| match x {
        TokenTree::Punct(p) => matches!(p.as_char(), '*' | '/'),
        TokenTree::Ident(i) => matches!(
            i.to_string().as_str(),
            "pow"
                | "checked_mul"
                | "checked_div"
                | "saturating_mul"
                | "saturating_div"
                | "wrapping_mul"
                | "wrapping_div"
        ),
        TokenTree::Group(g) => scales(&g.stream().into_iter().collect::<Vec<_>>()),
        TokenTree::Literal(_) => false,
    })
}

/// The power of ten a whole-number literal is (`1_000_000` is 6), if it is one.
fn ten_power(lit: &str) -> Option<i32> {
    let digits: String = lit
        .chars()
        .filter(|c| *c != '_')
        .take_while(|c| c.is_ascii_digit())
        .collect();
    let rest = &lit.replace('_', "")[digits.len()..];
    if !(rest.is_empty() || INTS.contains(&rest)) {
        return None;
    }
    let mut chars = digits.chars();
    (chars.next() == Some('1') && chars.all(|c| c == '0')).then(|| digits.len() as i32 - 1)
}

impl Units<'_> {
    /// An amount ticker is its asset; a price ticker is quote per base. Either way, `scale` is minus
    /// its decimals.
    fn dim_of(&self, ticker: &str) -> Dim {
        let d = self.tickers.get(ticker).copied().unwrap_or(0) as i32;
        let mut units = BTreeMap::new();
        match self.prices.get(ticker) {
            Some((q, b)) => {
                *units.entry(q.clone()).or_insert(0) += 1;
                *units.entry(b.clone()).or_insert(0) -= 1;
                units.retain(|_, e: &mut i32| *e != 0);
            }
            None => {
                units.insert(ticker.to_string(), 1);
            }
        }
        Dim { units, scale: -d }
    }

    /// A whole number built from literals and `USDC_DECIMALS`-style constants with `+` and `-`,
    /// as in `10u128.pow(SOL_DECIMALS as u32 + 2)`.
    fn whole(&self, t: &[TokenTree]) -> Option<i32> {
        let mut total = 0i32;
        let mut sign = 1;
        let mut i = 0;
        while i < t.len() {
            match &t[i] {
                TokenTree::Punct(p) if p.as_char() == '+' => sign = 1,
                TokenTree::Punct(p) if p.as_char() == '-' => sign = -1,
                TokenTree::Literal(l) => {
                    let s = l.to_string().replace('_', "");
                    let digits: String = s.chars().take_while(|c| c.is_ascii_digit()).collect();
                    total += sign * digits.parse::<i32>().ok()?;
                }
                TokenTree::Ident(id) if id == "as" => i += 1,
                TokenTree::Ident(id) => {
                    let name = id.to_string();
                    let ticker = name.strip_suffix("_DECIMALS")?;
                    total += sign * *self.tickers.get(ticker)? as i32;
                }
                TokenTree::Group(g) if g.delimiter() == Delimiter::Parenthesis => {
                    total += sign * self.whole(&g.stream().into_iter().collect::<Vec<_>>())?;
                }
                _ => return None,
            }
            i += 1;
        }
        Some(total)
    }

    /// What an expression's result means, if every number in it is known: typed amounts and prices,
    /// powers of ten, and `*`, `/`, `+`, `-` between them. Anything else (an untyped `u64`, a
    /// call, a `2`) makes it unknown, and nothing is checked.
    fn dim(&self, t: &[TokenTree]) -> Option<Dim> {
        // sums: every term must mean the same thing
        let mut terms: Vec<&[TokenTree]> = vec![];
        let mut from = 0;
        for i in 0..t.len() {
            if let TokenTree::Punct(p) = &t[i] {
                let binary = i > from && !matches!(t.get(i - 1), Some(TokenTree::Punct(_)));
                if matches!(p.as_char(), '+' | '-') && p.spacing() == Spacing::Alone && binary {
                    terms.push(&t[from..i]);
                    from = i + 1;
                }
            }
        }
        terms.push(&t[from..]);
        let first = self.term_dim(terms[0])?;
        for term in &terms[1..] {
            if self.term_dim(term)? != first {
                return None;
            }
        }
        Some(first)
    }

    fn term_dim(&self, t: &[TokenTree]) -> Option<Dim> {
        let mut out: Option<Dim> = None;
        let mut op = '*';
        let mut from = 0;
        let mut i = 0;
        while i <= t.len() {
            let at_op = match t.get(i) {
                Some(TokenTree::Punct(p))
                    if matches!(p.as_char(), '*' | '/' | '%') && p.spacing() == Spacing::Alone =>
                {
                    Some(p.as_char())
                }
                None => Some('*'),
                _ => None,
            };
            if let Some(next) = at_op {
                if next == '%' {
                    return None;
                }
                let f = self.factor_dim(&t[from..i])?;
                out = Some(match (out, op) {
                    (None, _) => f,
                    (Some(a), '/') => a.combine(&f, -1),
                    (Some(a), _) => a.combine(&f, 1),
                });
                op = next;
                from = i + 1;
            }
            i += 1;
        }
        out
    }

    fn factor_dim(&self, t: &[TokenTree]) -> Option<Dim> {
        let n = t.len();
        if n == 0 {
            return None;
        }
        // `?` and the unwraps don't change a number
        if is_punct_at(t, n - 1, '?') {
            return self.factor_dim(&t[..n - 1]);
        }
        if n >= 3 && is_punct_at(t, n - 3, '.') && matches!(&t[n - 1], TokenTree::Group(_)) {
            let method = match &t[n - 2] {
                TokenTree::Ident(m) => m.to_string(),
                _ => String::new(),
            };
            let recv = &t[..n - 3];
            let arg = match &t[n - 1] {
                TokenTree::Group(g) => g.stream().into_iter().collect::<Vec<_>>(),
                _ => vec![],
            };
            return match method.as_str() {
                "unwrap" | "expect" | "ok_or" | "ok_or_else" | "unwrap_or" | "into" | "try_into"
                | "unwrap_or_default" => self.factor_dim(recv),
                "checked_mul" | "saturating_mul" | "wrapping_mul" => {
                    Some(self.factor_dim(recv)?.combine(&self.dim(&arg)?, 1))
                }
                "checked_div" | "saturating_div" | "wrapping_div" => {
                    Some(self.factor_dim(recv)?.combine(&self.dim(&arg)?, -1))
                }
                "checked_add" | "checked_sub" | "saturating_add" | "saturating_sub" | "wrapping_add"
                | "wrapping_sub" => {
                    let a = self.factor_dim(recv)?;
                    (self.dim(&arg)? == a).then_some(a)
                }
                // 10u128.pow(9) is 10^9
                "pow" if matches!(recv, [TokenTree::Literal(l)] if ten_power(&l.to_string()) == Some(1)) => Some(Dim {
                    units: BTreeMap::new(),
                    scale: -self.whole(&arg)?,
                }),
                _ => None,
            };
        }
        // `x as u128` widens and means the same; `x as u64` on a bare amount is SHI002's way of
        // saying "converting on purpose", so it is unknown. Around arithmetic it is just the width.
        if n >= 3 && is_ident(t.get(n - 2), "as") {
            let ty = match &t[n - 1] {
                TokenTree::Ident(i) => i.to_string(),
                _ => return None,
            };
            let inner = &t[..n - 2];
            return if WIDEN.contains(&ty.as_str()) || (INTS.contains(&ty.as_str()) && scales(inner)) {
                self.factor_dim(inner)
            } else {
                None
            };
        }
        match t {
            [TokenTree::Group(g)] if g.delimiter() == Delimiter::Parenthesis => {
                self.dim(&g.stream().into_iter().collect::<Vec<_>>())
            }
            [TokenTree::Literal(l)] => ten_power(&l.to_string()).map(|k| Dim {
                units: BTreeMap::new(),
                scale: -k,
            }),
            [TokenTree::Ident(m), TokenTree::Punct(b), TokenTree::Group(g)]
                if m == "per_my_last_email" && b.as_char() == '!' =>
            {
                self.dim(&g.stream().into_iter().collect::<Vec<_>>())
            }
            _ => {
                let mut found = vec![];
                self.refs(t, &mut found);
                let simple = matches!(t.len(), 1 | 3 | 7);
                match found.as_slice() {
                    [v] if simple => Some(self.dim_of(&v.ticker)),
                    _ => None,
                }
            }
        }
    }

    /// SHI007: a write or comparison where one side converts with `*` or `/`, and the two sides
    /// don't mean the same thing.
    fn conversion(
        &self,
        left: &[TokenTree],
        right: &[TokenTree],
        span: Span,
        width: usize,
        writes: bool,
        out: &mut Vec<Diag>,
    ) {
        let side = |s: &[TokenTree]| -> Option<(Dim, String)> {
            if scales(s) {
                self.dim(s).map(|d| (d, String::new()))
            } else {
                self.unit_of(s).map(|v| (self.dim_of(&v.ticker), v.shown))
            }
        };
        let (Some(l), Some(r)) = (side(left), side(right)) else {
            return;
        };
        // name the plain side; the converted side is what's wrong
        let ((want, shown), (got, _)) = if l.1.is_empty() { (r, l) } else { (l, r) };
        if want == got || shown.is_empty() {
            return;
        }
        let target = show_units(&want.units);
        let (line, col) = at(span);
        let verb = if writes { "gets" } else { "is compared with" };
        if want.units != got.units {
            out.push(
                Diag::error(
                    format!("`{shown}` is {target}, but it {verb} {}.", show_units(&got.units)),
                    line,
                    col,
                    width,
                    format!("this works out to {}", show_units(&got.units)),
                )
                .with_code("SHI007")
                .with_help(
                    "an amount times a price in QUOTE per BASE is QUOTE, and an amount over that price is BASE: \
                     check what you multiply and what you divide",
                ),
            );
            return;
        }
        let (dw, dg) = (-want.scale, -got.scale);
        let k = (dg - dw).unsigned_abs();
        let factor = group_thousands(&10u128.pow(k.min(38)).to_string());
        let (how, fix) = if dg > dw {
            ("too big", format!("divide by {factor} more"))
        } else {
            ("too small", format!("multiply by {factor} more"))
        };
        let msg = if writes {
            format!("`{shown}` comes out {factor}x {how}: this has {dg} decimals of {target}, and `{shown}` has {dw}.")
        } else {
            format!(
                "this compares `{shown}` ({dw} decimals of {target}) with a conversion that has {dg}: off by {factor}x."
            )
        };
        let fix = if writes {
            fix
        } else {
            format!("{fix} on the converted side")
        };
        out.push(Diag::error(msg, line, col, width, fix).with_code("SHI007").with_help(
            "decimals add when you multiply and subtract when you divide: an amount with 9 times a price \
                 with 8 has 17, so divide by 10 to the ones you don't keep",
        ));
    }

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
            let (ls, rs) = (&t[left_from..op.start], &t[op.end..right_to]);
            if scales(ls) || scales(rs) {
                let writes = matches!(op.text.as_str(), "=" | "+=" | "-=");
                if !matches!(op.text.as_str(), "+" | "-") {
                    self.conversion(ls, rs, op.span, op.text.chars().count(), writes, out);
                }
                continue;
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
            if scales(&args[comma + 1..]) {
                self.conversion(
                    &args[..comma],
                    &args[comma + 1..],
                    m.span(),
                    m.to_string().len(),
                    true,
                    out,
                );
            } else if let (Some(a), Some(b)) = (self.unit_of(&args[..comma]), self.unit_of(&args[comma + 1..])) {
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

// ---------------------------------------------------------------------------------------------
// SHI006: conservation. Money in a balance comes from somewhere and goes somewhere.

/// A sum of named quantities: `amount - fee` is {amount: 1, fee: -1}. `"1"` is the constant.
type Linear = BTreeMap<String, i64>;

fn add_into(a: &mut Linear, b: &Linear, k: i64) {
    for (t, c) in b {
        *a.entry(t.clone()).or_insert(0) += c * k;
    }
    a.retain(|_, c| *c != 0);
}

fn render(l: &Linear) -> String {
    if l.is_empty() {
        return "0".into();
    }
    let mut out = String::new();
    for (i, (t, c)) in l.iter().enumerate() {
        let (sign, n) = if *c < 0 { ("-", -c) } else { ("+", *c) };
        let term = match (t.as_str(), n) {
            ("1", n) => n.to_string(),
            (t, 1) => t.to_string(),
            (t, n) => format!("{n} * {t}"),
        };
        if i == 0 {
            out.push_str(if sign == "-" { "-" } else { "" });
        } else {
            out.push_str(&format!(" {sign} "));
        }
        out.push_str(&term);
    }
    out
}

/// What typeshi can't follow in one instruction.
#[derive(Default)]
struct Flows {
    /// tickers changed where typeshi can't sum them (a loop, a `match`, a closure)
    unknown: HashSet<String>,
    /// a transfer whose amount has no ticker: nothing can be checked
    untyped_move: bool,
}

/// An instruction's money, in order: an amount moving, or a branch with one list of steps per arm.
#[derive(Clone)]
enum Step {
    /// `ledger`: how much balances of `ticker` go up. `moved`: money in (+) or out (-) of the
    /// program, minted (+) or burned (-).
    Effect {
        ticker: String,
        ledger: Linear,
        moved: Linear,
    },
    /// `bull c { } bear { }`: each arm with what it takes (`` `c` ``, ``not `c` ``).
    Choice(Vec<(String, Vec<Step>)>),
}

/// One way through an instruction, and what it does to each ticker.
#[derive(Clone, Default)]
struct Path {
    when: Vec<String>,
    ledger: BTreeMap<String, Linear>,
    moved: BTreeMap<String, Linear>,
}

/// More ways through one instruction than this and branches are not followed.
const MAX_PATHS: usize = 64;

/// Every way through `steps`, starting from `from`, or None past MAX_PATHS.
fn walk(steps: &[Step], from: Vec<Path>) -> Option<Vec<Path>> {
    let mut paths = from;
    for step in steps {
        match step {
            Step::Effect { ticker, ledger, moved } => {
                for p in &mut paths {
                    add_into(p.ledger.entry(ticker.clone()).or_default(), ledger, 1);
                    add_into(p.moved.entry(ticker.clone()).or_default(), moved, 1);
                }
            }
            Step::Choice(arms) => {
                let mut next = vec![];
                for (when, body) in arms {
                    let start = paths.iter().cloned().map(|mut p| {
                        p.when.push(when.clone());
                        p
                    });
                    next.extend(walk(body, start.collect())?);
                    if next.len() > MAX_PATHS {
                        return None;
                    }
                }
                paths = next;
            }
        }
    }
    Some(paths)
}

/// The tickers a branch changes, for when there are too many ways through to follow.
fn in_branches(steps: &[Step], inside: bool, out: &mut HashSet<String>) {
    for step in steps {
        match step {
            Step::Effect { ticker, .. } if inside => {
                out.insert(ticker.clone());
            }
            Step::Effect { .. } => {}
            Step::Choice(arms) => arms.iter().for_each(|(_, body)| in_branches(body, true, out)),
        }
    }
}

fn is_brace(t: &TokenTree) -> bool {
    matches!(t, TokenTree::Group(g) if g.delimiter() == Delimiter::Brace)
}

fn word(t: Option<&TokenTree>) -> String {
    match t {
        Some(TokenTree::Ident(i)) => i.to_string(),
        _ => String::new(),
    }
}

const MONEY_MACROS: [&str; 7] = [
    "number_go_up",
    "aura_farm",
    "mark_to_market",
    "send_it",
    "full_send",
    "printer_go_brrr",
    "lp_burned",
];

impl Units<'_> {
    /// Read an amount as a sum of named quantities. Anything that isn't `+`/`-` of names, fields
    /// and whole numbers (a product, a call) becomes one opaque quantity, named by its text.
    fn linear(&self, t: &[TokenTree]) -> Linear {
        let mut out = Linear::new();
        let mut sign = 1i64;
        let mut term: Vec<TokenTree> = vec![];
        let flush = |term: &mut Vec<TokenTree>, sign: i64, out: &mut Linear| {
            if !term.is_empty() {
                let l = self.term(term);
                add_into(out, &l, sign);
                term.clear();
            }
        };
        let mut i = 0;
        while i < t.len() {
            match &t[i] {
                TokenTree::Punct(p) if (p.as_char() == '+' || p.as_char() == '-') && p.spacing() == Spacing::Alone => {
                    flush(&mut term, sign, &mut out);
                    sign = if p.as_char() == '-' { -1 } else { 1 };
                }
                tok => term.push(tok.clone()),
            }
            i += 1;
        }
        flush(&mut term, sign, &mut out);
        out
    }

    fn term(&self, t: &[TokenTree]) -> Linear {
        let mut t: Vec<TokenTree> = t.to_vec();
        // drop what doesn't change the amount: `?`, `.unwrap()`, `as u64`
        loop {
            let n = t.len();
            if matches!(t.last(), Some(TokenTree::Punct(p)) if p.as_char() == '?') {
                t.pop();
            } else if n >= 3
                && matches!(&t[n - 3], TokenTree::Punct(p) if p.as_char() == '.')
                && matches!(&t[n - 2], TokenTree::Ident(i) if i == "unwrap" || i == "expect" || i == "ok_or")
                && matches!(&t[n - 1], TokenTree::Group(_))
            {
                t.truncate(n - 3);
            } else if n >= 2 && matches!(&t[n - 2], TokenTree::Ident(i) if i == "as") {
                t.truncate(n - 2);
            } else {
                break;
            }
        }
        let one = |name: String| Linear::from([(name, 1)]);
        // x.checked_add(y), x.checked_sub(y), and the saturating_ / wrapping_ ones
        if let Some(k) = t.iter().rposition(|x| {
            matches!(x, TokenTree::Ident(i) if matches!(i.to_string().as_str(),
                "checked_add" | "checked_sub" | "saturating_add" | "saturating_sub" | "wrapping_add" | "wrapping_sub"))
        }) {
            if k >= 1 && matches!(&t[k - 1], TokenTree::Punct(p) if p.as_char() == '.') {
                if let Some(TokenTree::Group(g)) = t.get(k + 1) {
                    let mut l = self.term(&t[..k - 1]);
                    let arg: Vec<TokenTree> = g.stream().into_iter().collect();
                    let sign = if t[k].to_string().ends_with("_sub") { -1 } else { 1 };
                    add_into(&mut l, &self.linear(&arg), sign);
                    return l;
                }
            }
        }
        match t.as_slice() {
            [TokenTree::Literal(lit)] => {
                let s = lit.to_string().replace('_', "");
                let digits: String = s.chars().take_while(|c| c.is_ascii_digit()).collect();
                match digits.parse::<i64>() {
                    Ok(n) => Linear::from([("1".to_string(), n)]),
                    Err(_) => one(s),
                }
            }
            [TokenTree::Group(g)] if g.delimiter() == Delimiter::Parenthesis => {
                self.linear(&g.stream().into_iter().collect::<Vec<_>>())
            }
            [TokenTree::Ident(m), TokenTree::Punct(b), TokenTree::Group(g)]
                if m == "per_my_last_email" && b.as_char() == '!' =>
            {
                self.term(&g.stream().into_iter().collect::<Vec<_>>())
            }
            _ => {
                // ctx.accounts.acc.field and acc.field are one quantity, `acc.field`
                let text: String = t.iter().map(|x| x.to_string()).collect::<Vec<_>>().join("");
                one(text.strip_prefix("ctx.accounts.").map(str::to_string).unwrap_or(text))
            }
        }
    }

    /// A change to `acc.field` as the books see it: money owed to the program (`#[iou]`) counts
    /// against its balances, so a loan going out is debt up and money out, and adds up.
    fn signed(&self, acc: &str, field: &str, l: Linear) -> Linear {
        let owed = self
            .accounts
            .get(acc)
            .map(|frame| self.owed.contains(&(frame.clone(), field.to_string())))
            .unwrap_or(false);
        if !owed {
            return l;
        }
        let mut out = Linear::new();
        add_into(&mut out, &l, -1);
        out
    }

    /// The ticker of `acc.field` (or `ctx.accounts.acc.field`, or `per_my_last_email!(acc.field)`).
    fn target(&self, t: &[TokenTree]) -> Option<(String, String, String)> {
        let l = self.term(t);
        let (name, c) = l.iter().next()?;
        if l.len() != 1 || *c != 1 {
            return None;
        }
        let (acc, field) = name.split_once('.')?;
        let ticker = self.field_ticker(acc, field)?;
        Some((acc.to_string(), field.to_string(), ticker))
    }

    /// Collect an instruction body's money as steps. `bull`/`bear` (and `if`/`else`) chains become
    /// choices, so each way through is checked on its own. Money changed inside a loop, a `match`
    /// or a closure can't be summed, so its ticker becomes unknown and is not checked.
    fn flows(&self, t: &[TokenTree], table: &Table, path: bool, f: &mut Flows, steps: &mut Vec<Step>) {
        let account = |name: &str| table.accounts.iter().find(|a| a.name == name);
        let mut i = 0;
        while i < t.len() {
            let mac = match (&t[i], t.get(i + 1), t.get(i + 2)) {
                (TokenTree::Ident(m), Some(TokenTree::Punct(b)), Some(TokenTree::Group(g)))
                    if b.as_char() == '!' && MONEY_MACROS.contains(&m.to_string().as_str()) =>
                {
                    Some((m.to_string(), g.stream().into_iter().collect::<Vec<TokenTree>>()))
                }
                _ => None,
            };
            if let Some((m, args)) = mac {
                self.record(&m, &args, &account, path, f, steps);
                i += 3;
                continue;
            }
            let w = word(t.get(i));
            if path && (w == "if" || w == "bull") {
                if let Some((arms, next)) = self.branch(t, i, table, f) {
                    steps.push(Step::Choice(arms));
                    i = next;
                    continue;
                }
            }
            if matches!(w.as_str(), "for" | "while" | "loop" | "match") {
                if let Some(k) = (i + 1..t.len()).find(|&k| is_brace(&t[k])) {
                    self.flows(&t[i + 1..=k], table, false, f, &mut vec![]);
                    i = k + 1;
                    continue;
                }
            }
            if let TokenTree::Group(g) = &t[i] {
                let inner: Vec<TokenTree> = g.stream().into_iter().collect();
                // `bundled! { }` runs once, in order; any other block (a closure, say) may not
                let bundled = i >= 2 && word(t.get(i - 2)) == "bundled";
                let keep = g.delimiter() != Delimiter::Brace || bundled;
                self.flows(&inner, table, path && keep, f, steps);
            }
            i += 1;
        }
    }

    /// `bull c { } bear bull d { } bear { }` (or `if`/`else`) starting at `t[i]`: each arm's steps,
    /// and the index just past the chain. None when it isn't shaped like one.
    #[allow(clippy::type_complexity)]
    fn branch(
        &self,
        t: &[TokenTree],
        i: usize,
        table: &Table,
        f: &mut Flows,
    ) -> Option<(Vec<(String, Vec<Step>)>, usize)> {
        let block = |g: &TokenTree, f: &mut Flows| {
            let mut body = vec![];
            if let TokenTree::Group(g) = g {
                self.flows(&g.stream().into_iter().collect::<Vec<_>>(), table, true, f, &mut body);
            }
            body
        };
        let none_of = |conds: &[String]| match conds {
            [c] => format!("not `{c}`"),
            cs => format!(
                "none of {}",
                cs.iter().map(|c| format!("`{c}`")).collect::<Vec<_>>().join(", ")
            ),
        };
        let mut arms = vec![];
        let mut conds: Vec<String> = vec![];
        let mut j = i + 1;
        loop {
            let k = (j..t.len()).find(|&k| is_brace(&t[k]))?;
            let cond = t[j..k].iter().cloned().collect::<TokenStream>().to_string();
            self.flows(&t[j..k], table, false, f, &mut vec![]);
            arms.push((format!("`{cond}`"), block(&t[k], f)));
            conds.push(cond);
            j = k + 1;
            if !matches!(word(t.get(j)).as_str(), "else" | "bear") {
                arms.push((none_of(&conds), vec![]));
                return Some((arms, j));
            }
            match t.get(j + 1) {
                Some(TokenTree::Ident(w)) if w == "if" || w == "bull" => j += 2,
                Some(g) if is_brace(g) => {
                    arms.push((none_of(&conds), block(g, f)));
                    return Some((arms, j + 2));
                }
                _ => return None,
            }
        }
    }

    fn record<'t>(
        &self,
        m: &str,
        args: &[TokenTree],
        account: &dyn Fn(&str) -> Option<&'t Account>,
        path: bool,
        f: &mut Flows,
        steps: &mut Vec<Step>,
    ) {
        let parts: Vec<Vec<TokenTree>> = {
            let mut v = vec![vec![]];
            for x in args {
                if matches!(x, TokenTree::Punct(p) if p.as_char() == ',') {
                    v.push(vec![]);
                } else {
                    v.last_mut().unwrap().push(x.clone());
                }
            }
            v
        };
        let arrow = |p: &[TokenTree]| -> Option<(String, String)> {
            let k = p.iter().position(
                |x| matches!(x, TokenTree::Punct(q) if q.as_char() == '=' && q.spacing() == Spacing::Joint),
            )?;
            let name = |s: &[TokenTree]| match s {
                [TokenTree::Ident(i)] => Some(i.to_string()),
                _ => None,
            };
            Some((name(&p[..k])?, name(&p[k + 2..])?))
        };
        let note =
            |ticker: String, ledger: Option<Linear>, moved: Option<Linear>, f: &mut Flows, steps: &mut Vec<Step>| {
                if !path {
                    f.unknown.insert(ticker);
                    return;
                }
                steps.push(Step::Effect {
                    ticker,
                    ledger: ledger.unwrap_or_default(),
                    moved: moved.unwrap_or_default(),
                });
            };
        match m {
            "number_go_up" | "aura_farm" => {
                if let Some((acc, field, ticker)) = parts.first().and_then(|p| self.target(p)) {
                    let by = parts
                        .get(1)
                        .map(|p| self.linear(p))
                        .unwrap_or_else(|| Linear::from([("1".into(), 1)]));
                    note(ticker, Some(self.signed(&acc, &field, by)), None, f, steps);
                }
            }
            "mark_to_market" => {
                let Some(eq) = args.iter().position(
                    |x| matches!(x, TokenTree::Punct(p) if p.as_char() == '=' && p.spacing() == Spacing::Alone),
                ) else {
                    return;
                };
                let Some((acc, field, ticker)) = self.target(&args[..eq]) else {
                    return;
                };
                let mut rhs = self.linear(&args[eq + 1..]);
                let me = format!("{acc}.{field}");
                match rhs.get(&me).copied() {
                    Some(1) => {
                        rhs.remove(&me);
                        note(ticker, Some(self.signed(&acc, &field, rhs)), None, f, steps);
                    }
                    None if account(&acc).map(|a| a.created).unwrap_or(false) => {
                        note(ticker, Some(self.signed(&acc, &field, rhs)), None, f, steps)
                    }
                    _ => {
                        f.unknown.insert(ticker);
                    }
                }
            }
            "send_it" | "full_send" => {
                let (Some((from, to)), Some(amount)) = (parts.first().and_then(|p| arrow(p)), parts.get(1)) else {
                    return;
                };
                let Some(unit) = self.unit_of(amount) else {
                    f.untyped_move = true;
                    return;
                };
                let program = |name: &str| {
                    account(name)
                        .map(|a| a.seeds.is_some() || a.frame.is_some())
                        .unwrap_or(false)
                };
                // who signs decides the direction: the user paying in, or the program paying out
                let signer = |name: &str| account(name).map(|a| a.signer).unwrap_or(false);
                let dir = if m == "send_it" {
                    match parts.get(2).and_then(|p| match p.as_slice() {
                        [TokenTree::Ident(i)] => Some(i.to_string()),
                        _ => None,
                    }) {
                        Some(a) if signer(&a) => 1,
                        Some(a) if account(&a).map(|x| x.seeds.is_some()).unwrap_or(false) => -1,
                        _ => 0,
                    }
                } else if program(&to) && !program(&from) {
                    1
                } else {
                    0
                };
                if dir != 0 {
                    let mut l = Linear::new();
                    add_into(&mut l, &self.linear(amount), dir);
                    note(unit.ticker, None, Some(l), f, steps);
                }
            }
            "printer_go_brrr" | "lp_burned" => {
                if let Some(unit) = parts.get(1).and_then(|p| self.unit_of(p)) {
                    let mut l = Linear::new();
                    add_into(
                        &mut l,
                        &self.linear(&parts[1]),
                        if m == "printer_go_brrr" { 1 } else { -1 },
                    );
                    note(unit.ticker, None, Some(l), f, steps);
                }
            }
            _ => {}
        }
    }

    /// SHI006: for every ticker the program keeps balances in, an instruction's balances must change
    /// by exactly what comes in, minus what goes out, plus what is minted, minus what is burned.
    pub fn conservation(&self, body: &[TokenTree], table: &Table, fn_name: &str, at_fn: Span, out: &mut Vec<Diag>) {
        let ledgers: HashSet<&String> = self
            .frame_fields
            .values()
            .flat_map(|fields| fields.values())
            .filter(|ty| self.tickers.contains_key(*ty))
            .collect();
        let mut f = Flows::default();
        let mut steps = vec![];
        self.flows(body, table, true, &mut f, &mut steps);
        if f.untyped_move {
            return;
        }
        let paths = walk(&steps, vec![Path::default()]).unwrap_or_else(|| {
            // too many ways through: check what happens outside the branches, and nothing inside
            in_branches(&steps, false, &mut f.unknown);
            let outside: Vec<Step> = steps
                .iter()
                .filter(|s| matches!(s, Step::Effect { .. }))
                .cloned()
                .collect();
            walk(&outside, vec![Path::default()]).unwrap_or_default()
        });
        let tickers: BTreeSet<&String> = paths
            .iter()
            .flat_map(|p| p.ledger.keys().chain(p.moved.keys()))
            .collect();
        for ticker in tickers {
            if f.unknown.contains(ticker) || !ledgers.contains(ticker) {
                continue;
            }
            let failing: Vec<(&Path, Linear)> = paths
                .iter()
                .filter_map(|p| {
                    let mut residual = p.ledger.get(ticker).cloned().unwrap_or_default();
                    add_into(&mut residual, &p.moved.get(ticker).cloned().unwrap_or_default(), -1);
                    (!residual.is_empty()).then_some((p, residual))
                })
                .collect();
            let Some((p, residual)) = failing.first() else {
                continue;
            };
            let ledger = p.ledger.get(ticker).cloned().unwrap_or_default();
            let moved = p.moved.get(ticker).cloned().unwrap_or_default();
            // name the way through only when some other way adds up
            let when = if failing.len() < paths.len() && !p.when.is_empty() {
                format!("when {}: ", p.when.join(" and "))
            } else {
                String::new()
            };
            let all_pos = residual.values().all(|c| *c > 0);
            let all_neg = residual.values().all(|c| *c < 0);
            let r = render(residual);
            let abs = {
                let mut a = Linear::new();
                add_into(&mut a, residual, -1);
                render(&a)
            };
            let paid_out_only = ledger.is_empty() && moved.values().all(|c| *c < 0);
            let (msg, help) = if all_pos && paid_out_only {
                (
                    format!("`{fn_name}` pays out `{r}` {ticker} and no balance goes down."),
                    "lower the balance it's paid from by the same amount, \
                     e.g. `mark_to_market!(acc.field = per_my_last_email!(acc.field) - amount)`",
                )
            } else if all_pos {
                (
                    format!("`{fn_name}` creates `{r}` {ticker} out of nothing: balances go up by more than comes in."),
                    "take it in with `send_it!(from => vault, amount, payer)`, move it from another balance, \
                     or mark the fn `#[printer_go_brrr]` if it mints on purpose",
                )
            } else if all_neg {
                (
                    format!("`{fn_name}` loses track of `{abs}` {ticker}: it ends up in no balance."),
                    "credit it to a balance (a fee account, say), or take in only what you credit; \
                     mark the fn `#[printer_go_brrr]` if it burns on purpose",
                )
            } else {
                (
                    format!("`{fn_name}` doesn't add up: its {ticker} balances are off by `{r}`."),
                    "make what balances gain equal what comes in, and what they lose equal what goes out",
                )
            };
            let (line, col) = at(at_fn);
            out.push(
                Diag::error(
                    msg,
                    line,
                    col,
                    fn_name.chars().count(),
                    format!(
                        "{when}balances change by {}, money in or out is {}",
                        render(&ledger),
                        render(&moved)
                    ),
                )
                .with_code("SHI006")
                .with_help(help),
            );
        }
    }
}
