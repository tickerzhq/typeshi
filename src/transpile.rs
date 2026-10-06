//! The typeshi transpiler: `.shi` source in, Anchor Rust out.
//!
//! It works on tokens (proc-macro2 with real line/column spans), rewrites the
//! slang into plain Anchor, then parses the result with `syn` and prints it with
//! `prettyplease`. The output is ordinary Rust that `anchor build` compiles.

use crate::diag::Diag;
use proc_macro2::{Delimiter, Group, Spacing, Span, TokenStream, TokenTree};
use std::collections::{BTreeSet, HashMap, HashSet};

/// Error codes 0x1 to 0x6 are fixed, in this order, forever.
pub const FIXED_ERRORS: [(&str, &str); 6] = [
    ("SkillIssue", "skill issue"),
    ("YouAreExitLiquidity", "you are exit liquidity"),
    ("FundsAreNotSafu", "funds are not safu"),
    ("DevIsOnVacation", "dev is on vacation"),
    ("RuggedByA19YearOld", "rugged by a 19 year old"),
    ("WifeChangingMoneyNotFound", "wife changing money not found"),
];

/// Default vesting start for `#[vc_backed]`: 2026-01-01 00:00:00 UTC.
pub const VEST_GENESIS: i64 = 1_767_225_600;

/// Moves that refuse to compile. The headline is the joke.
pub const BANNED: [(&str, &str); 7] = [
    ("rug", "not on our watch, anon"),
    ("honeypot", "ser, this is a Wendy's"),
    ("insider_trading", "the feds are monitoring the situation"),
    ("dev_sold", "dev didn't sell. dev never sells."),
    ("exit_scam", "exit scam? in this economy?"),
    ("ponzi", "number go up is not a business model"),
    ("deploy_on_friday", "absolutely not."),
];

/// Macros that move lamports or tokens. A fn that uses one must say `// not financial advice`.
const MOVES_MONEY: [&str; 7] = [
    "full_send",
    "printer_go_brrr",
    "vc_unlock",
    "kol_promo",
    "liquidated",
    "layoffs",
    "lp_burned",
];

/// Macros that read or write `ctx.accounts`, so they only work inside an instruction.
const NEEDS_CTX: [&str; 18] = [
    "per_my_last_email",
    "mark_to_market",
    "number_go_up",
    "aura_farm",
    "ascend",
    "bags",
    "full_send",
    "printer_go_brrr",
    "lp_burned",
    "mint_revoked",
    "freeze_revoked",
    "vc_unlock",
    "kol_promo",
    "liquidated",
    "layoffs",
    "hostile_takeover",
    "wen",
    "hodl",
];

/// Account types that need Anchor's `'info` lifetime injected.
const INFO_TYPES: [&str; 10] = [
    "Signer",
    "Account",
    "Program",
    "SystemAccount",
    "UncheckedAccount",
    "AccountInfo",
    "Sysvar",
    "Interface",
    "InterfaceAccount",
    "AccountLoader",
];

#[derive(Clone, Debug)]
pub struct Options {
    /// Drop every `msg!` / string `probably_nothing!` log (what `--gigamaxx` does). Logs cost compute.
    pub strip_logs: bool,
    /// Shown in the generated header, e.g. `lib.shi`.
    pub source_name: String,
}

impl Default for Options {
    fn default() -> Self {
        Options {
            strip_logs: false,
            source_name: "lib.shi".into(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Output {
    /// The generated Anchor Rust.
    pub rust: String,
    /// Warnings (errors make `transpile` return `Err`).
    pub diags: Vec<Diag>,
    /// The `stealth_launch` program name, if any.
    pub program: Option<String>,
    /// Whether the source has any `#[test]`.
    pub has_tests: bool,
    /// Every fn and its length in lines (the `fud` command roasts the longest).
    pub fns: Vec<(String, usize)>,
}

pub fn transpile(src: &str, opts: &Options) -> Result<Output, Vec<Diag>> {
    let ts: TokenStream = match src.parse() {
        Ok(t) => t,
        Err(e) => {
            let s = e.span().start();
            return Err(vec![Diag::error(
                "this doesn't even tokenize.",
                s.line,
                s.column,
                1,
                "skill issue",
            )]);
        }
    };
    let toks: Vec<TokenTree> = ts.into_iter().collect();
    let mut cx = Cx::new(src, opts);
    let out = cx.run(&toks);
    let has_errors = cx.diags.iter().any(|d| d.is_error());
    match out {
        Some(rust) if !has_errors => Ok(Output {
            rust,
            diags: cx.diags,
            program: cx.program,
            has_tests: src.contains("#[test]"),
            fns: cx.fn_lengths,
        }),
        _ => Err(cx.diags),
    }
}

// ---------------------------------------------------------------------------
// token helpers

fn is_ident(t: Option<&TokenTree>, s: &str) -> bool {
    matches!(t, Some(TokenTree::Ident(i)) if i == s)
}

fn is_punct(t: Option<&TokenTree>, c: char) -> bool {
    matches!(t, Some(TokenTree::Punct(p)) if p.as_char() == c)
}

fn group_of(t: Option<&TokenTree>, d: Delimiter) -> Option<&Group> {
    match t {
        Some(TokenTree::Group(g)) if g.delimiter() == d => Some(g),
        _ => None,
    }
}

fn ident_str(t: Option<&TokenTree>) -> Option<String> {
    match t {
        Some(TokenTree::Ident(i)) => Some(i.to_string()),
        _ => None,
    }
}

fn loc(span: Span) -> (usize, usize) {
    let s = span.start();
    (s.line, s.column)
}

fn toks_of(s: &str) -> Vec<TokenTree> {
    s.parse::<TokenStream>()
        .unwrap_or_else(|e| panic!("typeshi bug: template does not tokenize: {e}: {s}"))
        .into_iter()
        .collect()
}

fn to_s(t: &[TokenTree]) -> String {
    t.iter().cloned().collect::<TokenStream>().to_string()
}

fn inner(g: &Group) -> Vec<TokenTree> {
    g.stream().into_iter().collect()
}

/// Split on top-level commas. Groups are already nested, so only bare commas count.
fn split_commas(t: &[TokenTree]) -> Vec<Vec<TokenTree>> {
    let mut out = vec![];
    let mut cur = vec![];
    for tt in t {
        if is_punct(Some(tt), ',') {
            out.push(std::mem::take(&mut cur));
        } else {
            cur.push(tt.clone());
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

/// Split struct fields on commas that are not inside `<...>` (types only, so `<` is never a comparison).
fn split_fields(t: &[TokenTree]) -> Vec<Vec<TokenTree>> {
    let mut out = vec![];
    let mut cur = vec![];
    let mut depth = 0i32;
    for (i, tt) in t.iter().enumerate() {
        if let TokenTree::Punct(p) = tt {
            match p.as_char() {
                '<' => depth += 1,
                '>' if !(i > 0 && is_punct(t.get(i - 1), '-')) => depth -= 1,
                ',' if depth == 0 => {
                    out.push(std::mem::take(&mut cur));
                    continue;
                }
                _ => {}
            }
        }
        cur.push(tt.clone());
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

/// `a => b` into `(a, b)`.
fn split_arrow(t: &[TokenTree]) -> Option<(Vec<TokenTree>, Vec<TokenTree>)> {
    for i in 0..t.len().saturating_sub(1) {
        if let (TokenTree::Punct(a), TokenTree::Punct(b)) = (&t[i], &t[i + 1]) {
            if a.as_char() == '=' && a.spacing() == Spacing::Joint && b.as_char() == '>' {
                return Some((t[..i].to_vec(), t[i + 2..].to_vec()));
            }
        }
    }
    None
}

fn string_lit(t: &[TokenTree]) -> Option<String> {
    let t: Vec<&TokenTree> = t.iter().filter(|x| !is_ident(Some(x), "cuz")).collect();
    if t.len() != 1 {
        return None;
    }
    match t[0] {
        TokenTree::Literal(l) => syn::parse_str::<syn::LitStr>(&l.to_string()).ok().map(|s| s.value()),
        _ => None,
    }
}

fn pascal(s: &str) -> String {
    s.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .take(8)
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                Some(f) => f.to_ascii_uppercase().to_string() + &c.as_str().to_ascii_lowercase(),
                None => String::new(),
            }
        })
        .collect()
}

fn snake_to_pascal(s: &str) -> String {
    s.split('_')
        .filter(|w| !w.is_empty())
        .map(|w| {
            let mut c = w.chars();
            c.next().map(|f| f.to_ascii_uppercase().to_string()).unwrap_or_default() + c.as_str()
        })
        .collect()
}

/// `PrintRecord` -> "print".
fn first_word_lower(s: &str) -> String {
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && c.is_ascii_uppercase() {
            break;
        }
        out.push(c.to_ascii_lowercase());
    }
    out
}

fn any_ident(t: &[TokenTree], pred: &dyn Fn(&str) -> bool) -> Option<Span> {
    for tt in t {
        match tt {
            TokenTree::Ident(i) if pred(&i.to_string()) => return Some(i.span()),
            TokenTree::Group(g) => {
                if let Some(s) = any_ident(&inner(g), pred) {
                    return Some(s);
                }
            }
            _ => {}
        }
    }
    None
}

fn count_ident(t: &[TokenTree], name: &str, spans: &mut Vec<Span>) {
    for tt in t {
        match tt {
            TokenTree::Ident(i) if i == name => spans.push(i.span()),
            TokenTree::Group(g) => count_ident(&inner(g), name, spans),
            _ => {}
        }
    }
}

// ---------------------------------------------------------------------------
// items

#[derive(Clone, Debug)]
struct RawItem {
    attrs: Vec<Vec<TokenTree>>, // each is `#` + `[...]`
    body: Vec<TokenTree>,
}

impl RawItem {
    fn has_attr(&self, name: &str) -> bool {
        self.attrs.iter().any(|a| match a.get(1) {
            Some(TokenTree::Group(g)) => {
                let t = inner(g);
                t.len() == 1 && is_ident(t.first(), name)
            }
            _ => false,
        })
    }

    /// Arguments of a typeshi attribute like `#[vc_backed(since = 1767225600)]`.
    fn attr_args(&self, name: &str) -> Option<Vec<TokenTree>> {
        self.attrs.iter().find_map(|a| match a.get(1) {
            Some(TokenTree::Group(g)) => {
                let t = inner(g);
                if is_ident(t.first(), name) {
                    Some(
                        group_of(t.get(1), Delimiter::Parenthesis)
                            .map(inner)
                            .unwrap_or_default(),
                    )
                } else {
                    None
                }
            }
            _ => None,
        })
    }

    /// Attributes minus typeshi's own (`on_god`, `tokenmaxx`, `vc_backed`).
    fn rust_attrs(&self) -> Vec<TokenTree> {
        let mut out = vec![];
        for a in &self.attrs {
            if let Some(TokenTree::Group(g)) = a.get(1) {
                let t = inner(g);
                if is_ident(t.first(), "on_god") || is_ident(t.first(), "tokenmaxx") || is_ident(t.first(), "vc_backed")
                {
                    continue;
                }
            }
            out.extend(a.iter().cloned());
        }
        out
    }

    fn first_span(&self) -> Span {
        self.attrs
            .first()
            .and_then(|a| a.first())
            .or(self.body.first())
            .map(|t| t.span())
            .unwrap_or_else(Span::call_site)
    }

    /// Body tokens after `pub` / `pub(...)`.
    fn after_vis(&self) -> &[TokenTree] {
        let b = &self.body[..];
        if is_ident(b.first(), "pub") {
            if group_of(b.get(1), Delimiter::Parenthesis).is_some() {
                &b[2..]
            } else {
                &b[1..]
            }
        } else {
            b
        }
    }

    fn keyword(&self) -> String {
        ident_str(self.after_vis().first()).unwrap_or_default()
    }
}

/// Split a token list into items (attributes + body).
fn split_items(t: &[TokenTree]) -> Vec<RawItem> {
    let mut items = vec![];
    let mut i = 0;
    while i < t.len() {
        let mut attrs = vec![];
        // outer attributes (and doc comments, which arrive as #[doc = ...])
        while is_punct(t.get(i), '#') && group_of(t.get(i + 1), Delimiter::Bracket).is_some() {
            attrs.push(vec![t[i].clone(), t[i + 1].clone()]);
            i += 2;
        }
        // inner attribute #![...]
        if attrs.is_empty()
            && is_punct(t.get(i), '#')
            && is_punct(t.get(i + 1), '!')
            && group_of(t.get(i + 2), Delimiter::Bracket).is_some()
        {
            items.push(RawItem {
                attrs: vec![],
                body: t[i..i + 3].to_vec(),
            });
            i += 3;
            continue;
        }
        if i >= t.len() {
            if !attrs.is_empty() {
                items.push(RawItem { attrs, body: vec![] });
            }
            break;
        }
        let start = i;
        let mut j = i;
        // skip visibility
        if is_ident(t.get(j), "pub") {
            j += 1;
            if group_of(t.get(j), Delimiter::Parenthesis).is_some() {
                j += 1;
            }
        }
        let kw = ident_str(t.get(j)).unwrap_or_default();
        let until_semi = matches!(
            kw.as_str(),
            "use" | "const" | "static" | "type" | "type_shi" | "deadass" | "extern"
        );
        let mut end = j;
        loop {
            if end >= t.len() {
                break;
            }
            let tt = &t[end];
            end += 1;
            if is_punct(Some(tt), ';') {
                break;
            }
            if !until_semi && group_of(Some(tt), Delimiter::Brace).is_some() {
                // `foo! { }` style macro items may be followed by `;`
                if is_punct(t.get(end), ';') {
                    end += 1;
                }
                break;
            }
        }
        items.push(RawItem {
            attrs,
            body: t[start..end].to_vec(),
        });
        i = end;
    }
    items
}

// ---------------------------------------------------------------------------
// the transpiler

struct FnCx {
    name: String,
    instruction: bool,
    strip_logs: bool,
    moves_money: bool,
}

struct Cx<'a> {
    src: &'a str,
    opts: &'a Options,
    diags: Vec<Diag>,
    errors: Vec<(String, String)>,
    msg_to_variant: HashMap<String, String>,
    helpers: BTreeSet<&'static str>,
    on_god_frames: HashSet<String>,
    /// cap_table name -> does it write anything
    cap_tables: HashMap<String, bool>,
    rust_structs: HashSet<String>,
    uses_bps: bool,
    declares_bps: bool,
    /// type_shi aliases, inlined into frames so `#[derive(InitSpace)]` can size them
    aliases: HashMap<String, Vec<TokenTree>>,
    program: Option<String>,
    fn_lengths: Vec<(String, usize)>,
}

impl<'a> Cx<'a> {
    fn new(src: &'a str, opts: &'a Options) -> Self {
        let mut cx = Cx {
            src,
            opts,
            diags: vec![],
            errors: vec![],
            msg_to_variant: HashMap::new(),
            helpers: BTreeSet::new(),
            on_god_frames: HashSet::new(),
            cap_tables: HashMap::new(),
            rust_structs: HashSet::new(),
            uses_bps: false,
            declares_bps: false,
            aliases: HashMap::new(),
            program: None,
            fn_lengths: vec![],
        };
        for (v, m) in FIXED_ERRORS {
            cx.errors.push((v.to_string(), m.to_string()));
            cx.msg_to_variant.insert(m.to_string(), v.to_string());
        }
        cx
    }

    fn err_at(&mut self, span: Span, width: usize, msg: impl Into<String>, label: impl Into<String>) {
        let (l, c) = loc(span);
        self.diags.push(Diag::error(msg, l, c, width, label));
    }

    fn warn_at(&mut self, span: Span, width: usize, msg: impl Into<String>, label: impl Into<String>) {
        let (l, c) = loc(span);
        self.diags.push(Diag::warning(msg, l, c, width, label));
    }

    /// Register an error message and return `Cope::Variant`.
    fn register(&mut self, msg: &str) -> String {
        let key = msg.trim().trim_end_matches('.').to_ascii_lowercase();
        if let Some(v) = self.msg_to_variant.get(&key) {
            return format!("Cope::{v}");
        }
        let mut base = pascal(msg);
        if base.is_empty() || base.starts_with(|c: char| c.is_ascii_digit()) {
            base = format!("Cope{base}");
        }
        let mut v = base.clone();
        let mut n = 2;
        while self.errors.iter().any(|(x, _)| *x == v) {
            v = format!("{base}{n}");
            n += 1;
        }
        self.errors.push((v.clone(), msg.trim().to_string()));
        self.msg_to_variant.insert(key, v.clone());
        format!("Cope::{v}")
    }

    /// An error argument: a string (registered), `cuz "..."`, or any path like `Cope::X`.
    fn err_arg(&mut self, arg: Option<&Vec<TokenTree>>, default: &str, fx: &mut FnCx) -> String {
        match arg {
            None => self.register(default),
            Some(a) if a.is_empty() => self.register(default),
            Some(a) => match string_lit(a) {
                Some(m) => self.register(&m),
                None => to_s(&self.rw(a, fx)),
            },
        }
    }

    fn run(&mut self, toks: &[TokenTree]) -> Option<String> {
        // pass 1: items, with stealth_launch bodies flattened in
        let mut items = vec![];
        let mut declare_id: Option<String> = None;
        for it in split_items(toks) {
            if it.keyword() == "stealth_launch" {
                let b = it.after_vis();
                let name = ident_str(b.get(1));
                let body = group_of(b.get(2), Delimiter::Brace);
                match (name, body) {
                    (Some(n), Some(g)) => {
                        if self.program.is_some() {
                            self.err_at(
                                b[0].span(),
                                14,
                                "two stealth_launch blocks.",
                                "one program per file, ser",
                            );
                        }
                        self.program = Some(n);
                        items.extend(split_items(&inner(g)));
                    }
                    _ => self.err_at(
                        b[0].span(),
                        14,
                        "a stealth_launch needs a name and a body.",
                        "write `stealth_launch my_program { ... }`",
                    ),
                }
                continue;
            }
            items.push(it);
        }

        // pass 2: what exists (frames, cap tables, error codes, plain structs)
        for it in &items {
            let b = it.after_vis();
            match it.keyword().as_str() {
                "frame" | "term_sheet" => {
                    if it.has_attr("on_god") {
                        if let Some(n) = ident_str(b.get(1)) {
                            self.on_god_frames.insert(n);
                        }
                    }
                }
                "cope" => {
                    if let Some(g) = group_of(b.get(1), Delimiter::Brace) {
                        for f in split_commas(&inner(g)) {
                            let name = ident_str(f.first());
                            let msg = if is_punct(f.get(1), '=') {
                                string_lit(&f[2..])
                            } else {
                                None
                            };
                            match (name, msg) {
                                (Some(n), Some(m)) => {
                                    self.errors.push((n.clone(), m.clone()));
                                    self.msg_to_variant
                                        .insert(m.trim().trim_end_matches('.').to_ascii_lowercase(), n);
                                }
                                _ => self.err_at(
                                    f.first().map(|t| t.span()).unwrap_or_else(Span::call_site),
                                    1,
                                    "a cope entry looks like `Name = \"message\"`.",
                                    "cope harder",
                                ),
                            }
                        }
                    }
                }
                "struct" | "enum" => {
                    if let Some(n) = ident_str(b.get(1)) {
                        self.rust_structs.insert(n);
                    }
                }
                "type_shi" | "type" => {
                    if is_ident(b.get(1), "Bps") {
                        self.declares_bps = true;
                    }
                    if let (Some(n), true) = (ident_str(b.get(1)), is_punct(b.get(2), '=')) {
                        let end = if is_punct(b.last(), ';') { b.len() - 1 } else { b.len() };
                        if end > 3 {
                            self.aliases.insert(n, b[3..end].to_vec());
                        }
                    }
                }
                _ => {}
            }
        }
        // cap tables need the on_god set, so they get their own pass
        let mut cap_out: HashMap<usize, String> = HashMap::new();
        for (idx, it) in items.iter().enumerate() {
            if it.keyword() == "cap_table" {
                cap_out.insert(idx, self.gen_cap_table(it));
            }
        }

        // pass 3: generate
        let mut inner_attrs = String::new();
        let mut crate_items = String::new();
        let mut instructions = String::new();
        let mut panic_handler = String::new();
        let mut saw_instruction: Option<Span> = None;
        for (idx, it) in items.iter().enumerate() {
            let kw = it.keyword();
            let b = it.after_vis().to_vec();
            if it.attrs.is_empty() && is_punct(it.body.first(), '#') && is_punct(it.body.get(1), '!') {
                inner_attrs.push_str(&to_s(&it.body));
                inner_attrs.push('\n');
                continue;
            }
            match kw.as_str() {
                "gm" if is_punct(b.get(1), '!') => {
                    let arg = group_of(b.get(2), Delimiter::Parenthesis)
                        .map(inner)
                        .unwrap_or_default();
                    if string_lit(&arg).is_none() {
                        self.err_at(
                            b[0].span(),
                            3,
                            "gm needs a program id.",
                            "write `gm!(\"<program id>\");`",
                        );
                    }
                    declare_id = Some(format!("declare_id!({});", to_s(&arg)));
                }
                "this_is_fine" if is_punct(b.get(1), '!') => {
                    panic_handler =
                        "/// this_is_fine!(): the panic handler. turn on the `custom-panic` feature to use it.\n\
                        #[cfg(all(feature = \"custom-panic\", target_os = \"solana\"))]\n\
                        #[no_mangle]\n\
                        fn custom_panic(info: &core::panic::PanicInfo<'_>) {\n\
                            anchor_lang::prelude::msg!(\"this is fine.\");\n\
                            if let Some(m) = info.message().as_str() { anchor_lang::prelude::msg!(m); }\n\
                        }\n"
                        .to_string();
                }
                b_kw if MACRO_ITEM_BANNED(b_kw) && is_punct(b.get(1), '!') => {
                    self.banned(b_kw, b[0].span());
                }
                "frame" | "term_sheet" => crate_items.push_str(&self.gen_frame(it, "account")),
                "alpha_leak" => crate_items.push_str(&self.gen_frame(it, "event")),
                "cap_table" => crate_items.push_str(cap_out.get(&idx).map(|s| s.as_str()).unwrap_or("")),
                "cope" => {}
                "type_shi" => {
                    let mut fx = FnCx::item();
                    let rest = self.rw(&b[1..], &mut fx);
                    crate_items.push_str(&format!("{} pub type {}\n", to_s(&it.rust_attrs()), to_s(&rest)));
                }
                "deadass" => {
                    let mut fx = FnCx::item();
                    let rest = self.rw(&b[1..], &mut fx);
                    crate_items.push_str(&format!("{} pub const {}\n", to_s(&it.rust_attrs()), to_s(&rest)));
                }
                "const" if it.has_attr("on_god") => {
                    let mut fx = FnCx::item();
                    let rest = self.rw(&b[1..], &mut fx);
                    crate_items.push_str(&format!("{} pub const {}\n", to_s(&it.rust_attrs()), to_s(&rest)));
                }
                "lock_in" | "ape" => {
                    if saw_instruction.is_none() {
                        saw_instruction = Some(b[0].span());
                    }
                    if let Some(s) = self.gen_instruction(it, &kw) {
                        instructions.push_str(&s);
                    }
                }
                "few_understand" | "fn" => {
                    if let Some(s) = self.gen_helper(it, kw == "few_understand") {
                        crate_items.push_str(&s);
                    }
                }
                _ => {
                    // plain Rust: rewrite slang inside it and pass it through
                    let mut fx = FnCx::item();
                    let attrs = to_s(&it.rust_attrs());
                    let body = self.rw(&it.body, &mut fx);
                    crate_items.push_str(&format!("{attrs} {}\n", to_s(&body)));
                }
            }
        }

        if self.program.is_none() {
            if let Some(s) = saw_instruction {
                self.err_at(
                    s,
                    7,
                    "an instruction with no stealth_launch block.",
                    "where's the program, ser?",
                );
            }
        }
        if self.program.is_some() && declare_id.is_none() {
            self.diags.push(Diag::error(
                "no gm. say gm to the chain first.",
                0,
                0,
                1,
                "add `gm!(\"<program id>\");` at the top",
            ));
        }
        if self.diags.iter().any(|d| d.is_error()) {
            return None;
        }

        let mut out = String::new();
        out.push_str(&inner_attrs);
        out.push_str("use anchor_lang::prelude::*;\n");
        if let Some(d) = &declare_id {
            out.push_str(d);
            out.push('\n');
        }
        if self.uses_bps && !self.declares_bps {
            out.push_str("/// basis points. 100 bps = 1%.\npub type Bps = u64;\n");
        }
        out.push_str(&crate_items);
        if let Some(p) = &self.program {
            out.push_str(&format!(
                "#[program] pub mod {p} {{ #![allow(unused_variables)] use super::*; {instructions} }}\n"
            ));
        }
        out.push_str(&self.gen_errors());
        out.push_str(&self.gen_helpers());
        out.push_str(&panic_handler);

        match syn::parse_file(&out) {
            Ok(file) => {
                let pretty = prettyplease::unparse(&file);
                Some(format!(
                    "// @generated by typeshi {} from {}. do not edit. nobody can edit it.\n// lock in fn.\n\n{}",
                    env!("CARGO_PKG_VERSION"),
                    self.opts.source_name,
                    pretty
                ))
            }
            Err(e) => {
                self.diags.push(Diag::error(
                    format!("the rust this turns into doesn't parse: {e}"),
                    0,
                    0,
                    1,
                    "skill issue (yours or ours). run `typeshi expand` to see it",
                ));
                None
            }
        }
    }

    fn banned(&mut self, name: &str, span: Span) {
        if let Some((_, joke)) = BANNED.iter().find(|(n, _)| *n == name) {
            self.err_at(span, name.len() + 1, *joke, format!("`{name}!` is a banned move"));
        }
    }

    fn gen_errors(&self) -> String {
        let mut s = String::from(
            "/// Error codes. 0x1 to 0x6 are fixed forever; the rest come from your `L(\"...\")` messages.\n\
             #[error_code(offset = 1)]\npub enum Cope {\n",
        );
        for (v, m) in &self.errors {
            s.push_str(&format!("    #[msg({m:?})]\n    {v},\n"));
        }
        s.push_str("}\n");
        s
    }

    fn gen_helpers(&self) -> String {
        let mut s = String::new();
        for h in &self.helpers {
            s.push_str(match *h {
                "bps" => "/// bps!(amount, rate): amount * rate / 10_000, overflow checked.\n\
                    #[allow(dead_code)]\n\
                    fn __typeshi_bps(amount: u64, rate: u64) -> Result<u64> {\n\
                        u64::try_from((amount as u128) * (rate as u128) / 10_000u128).map_err(|_| error!(Cope::FundsAreNotSafu))\n\
                    }\n",
                "bonding_curve" => "/// bonding_curve!(supply, base, slope): price = base + slope * supply, overflow checked.\n\
                    #[allow(dead_code)]\n\
                    fn __typeshi_bonding_curve(supply: u64, base: u64, slope: u64) -> Result<u64> {\n\
                        slope.checked_mul(supply).and_then(|x| x.checked_add(base)).ok_or(error!(Cope::YouAreExitLiquidity))\n\
                    }\n",
                "looksmaxx" => "/// looksmaxx!(n): 1234567 -> \"1.23M\".\n\
                    #[allow(dead_code)]\n\
                    fn __typeshi_looksmaxx(n: u64) -> String {\n\
                        const UNITS: [(u64, &str); 4] = [(1_000_000_000_000, \"T\"), (1_000_000_000, \"B\"), (1_000_000, \"M\"), (1_000, \"k\")];\n\
                        for (size, unit) in UNITS {\n\
                            if n >= size {\n\
                                let whole = n / size;\n\
                                let cents = (n % size) * 100 / size;\n\
                                return if cents == 0 { format!(\"{whole}{unit}\") } else { format!(\"{whole}.{cents:02}{unit}\") };\n\
                            }\n\
                        }\n\
                        n.to_string()\n\
                    }\n",
                "wen_moon" => "/// wen moon?\n\
                    #[allow(dead_code)]\n\
                    pub fn wen_moon() -> &'static str {\n\
                        \"soon\u{2122}\"\n\
                    }\n",
                _ => "",
            });
        }
        s
    }

    // --- frames, events -----------------------------------------------------

    fn gen_frame(&mut self, it: &RawItem, kind: &str) -> String {
        let b = it.after_vis();
        let name = match ident_str(b.get(1)) {
            Some(n) => n,
            None => {
                self.err_at(b[0].span(), 5, "this needs a name.", "anon struct? in this economy?");
                return String::new();
            }
        };
        let body = match group_of(b.get(2), Delimiter::Brace) {
            Some(g) => inner(g),
            None => {
                self.err_at(
                    b[1].span(),
                    name.len(),
                    "this needs a `{ ... }` body.",
                    "no fields, no bags",
                );
                return String::new();
            }
        };
        let mut fields = String::new();
        let mut fx = FnCx::item();
        for f in split_fields(&body) {
            let (attrs, rest) = take_attrs(&f);
            let mut rest = strip_vis(&rest);
            if kind == "account" && rest.len() == 3 && is_punct(rest.get(1), ':') {
                if let Some(real) = ident_str(rest.get(2)).and_then(|t| self.aliases.get(&t).cloned()) {
                    rest.truncate(2);
                    rest.extend(real);
                }
            }
            let rest = self.rw(&rest, &mut fx);
            fields.push_str(&format!("{} pub {},\n", to_s(&attrs), to_s(&rest)));
        }
        let attrs = to_s(&it.rust_attrs());
        let god = if it.has_attr("on_god") {
            "/// #[on_god]: immutable after init.\n"
        } else {
            ""
        };
        match kind {
            "event" => format!("{attrs}\n#[event]\npub struct {name} {{\n{fields}}}\n"),
            _ => format!("{attrs}\n{god}#[account]\n#[derive(InitSpace)]\npub struct {name} {{\n{fields}}}\n"),
        }
    }

    // --- cap tables ---------------------------------------------------------

    fn gen_cap_table(&mut self, it: &RawItem) -> String {
        let b = it.after_vis().to_vec();
        let name = match ident_str(b.get(1)) {
            Some(n) => n,
            None => {
                self.err_at(
                    b[0].span(),
                    9,
                    "a cap_table needs a name.",
                    "who's on the cap table, ser?",
                );
                return String::new();
            }
        };
        let body = match group_of(b.get(2), Delimiter::Brace) {
            Some(g) => inner(g),
            None => return String::new(),
        };
        let mut writes = false;
        let mut fields = String::new();
        let mut fx = FnCx::item();
        for f in split_fields(&body) {
            let (attrs, rest) = take_attrs(&f);
            let rest = strip_vis(&rest);
            // rewrite #[account(...)]
            let mut attr_s = String::new();
            let mut field_writes = false;
            let mut mut_span: Option<Span> = None;
            let mut is_init = false;
            for a in attrs.chunks(2) {
                let g = match a.get(1) {
                    Some(TokenTree::Group(g)) => g,
                    _ => continue,
                };
                let t = inner(g);
                if is_ident(t.first(), "account") {
                    if let Some(args) = group_of(t.get(1), Delimiter::Parenthesis) {
                        let mut new_args = vec![];
                        for arg in split_commas(&inner(args)) {
                            let first = ident_str(arg.first()).unwrap_or_default();
                            match first.as_str() {
                                "rent_free" | "init" | "init_if_needed" | "zero" => {
                                    field_writes = true;
                                    is_init = true;
                                }
                                "mut" | "close" | "golden_parachute" | "realloc" | "graduate" => {
                                    field_writes = true;
                                    if mut_span.is_none() {
                                        mut_span = arg.first().map(|t| t.span());
                                    }
                                }
                                _ => {}
                            }
                            let s = match first.as_str() {
                                "rent_free" if arg.len() == 1 => "init".to_string(),
                                "golden_parachute" => format!("close {}", to_s(&arg[1..])),
                                "graduate" => format!(
                                    "realloc {}, realloc::payer = exit_liquidity, realloc::zero = false",
                                    to_s(&arg[1..])
                                ),
                                _ => to_s(&self.rw(&arg, &mut fx)),
                            };
                            new_args.push(s);
                        }
                        attr_s.push_str(&format!("#[account({})]\n", new_args.join(", ")));
                        continue;
                    }
                }
                attr_s.push_str(&to_s(a));
                attr_s.push('\n');
            }
            // shorthand fields
            if rest.len() == 1 {
                let short = ident_str(rest.first()).unwrap_or_default();
                let (default_attr, ty) = match short.as_str() {
                    "ser" => ("#[account(mut)]", "Signer<'info>"),
                    "exit_liquidity" => ("#[account(mut)]", "Signer<'info>"),
                    "cabal" => ("", "Signer<'info>"),
                    "anon" => ("", "Signer<'info>"),
                    "kol" => ("#[account(mut)]", "SystemAccount<'info>"),
                    "system_program" => ("", "Program<'info, System>"),
                    "token_program" => ("", "Program<'info, anchor_spl::token::Token>"),
                    _ => {
                        self.err_at(
                            rest[0].span(),
                            short.len().max(1),
                            format!("`{short}` has no type."),
                            "shorthands: ser, exit_liquidity, cabal, anon, kol, system_program, token_program",
                        );
                        continue;
                    }
                };
                let a = if attr_s.is_empty() {
                    default_attr.to_string()
                } else {
                    attr_s.clone()
                };
                fields.push_str(&format!("{a}\npub {short}: {ty},\n"));
                continue;
            }
            // name: Type
            let field_name = ident_str(rest.first()).unwrap_or_default();
            let ty = if is_punct(rest.get(1), ':') {
                rest[2..].to_vec()
            } else {
                vec![]
            };
            if ty.is_empty() {
                self.err_at(
                    rest.first().map(|t| t.span()).unwrap_or_else(Span::call_site),
                    field_name.len().max(1),
                    format!("`{field_name}` needs a type."),
                    "e.g. `feed: Account<Feed>`",
                );
                continue;
            }
            let ty_rw = self.rw(&ty, &mut fx);
            let ty_s = inject_info(&ty_rw);
            let is_signer = is_ident(ty.first(), "Signer");
            if field_writes && !is_signer {
                writes = true;
            }
            // #[on_god] accounts are written once, at init
            if !is_init {
                if let Some(ms) = mut_span {
                    let god = self.on_god_frames.iter().find(|g| ty_mentions(&ty, g)).cloned();
                    if let Some(gname) = god {
                        let what = first_word_lower(&gname);
                        self.err_at(
                            ms,
                            3,
                            format!("you tried to edit a {what}. nobody can edit it."),
                            format!("`{gname}` is #[on_god]: written once, at init"),
                        );
                    }
                }
            }
            fields.push_str(&format!("{attr_s}pub {field_name}: {ty_s},\n"));
        }
        self.cap_tables.insert(name.clone(), writes);
        let attrs = to_s(&it.rust_attrs());
        format!("#[derive(Accounts)]\n{attrs}\npub struct {name}<'info> {{\n{fields}}}\n")
    }

    // --- functions ----------------------------------------------------------

    fn fn_parts(&mut self, b: &[TokenTree]) -> Option<(String, Span, Group, Vec<TokenTree>, Group)> {
        // b starts at `fn`
        let name_span = b.get(1)?.span();
        let name = ident_str(b.get(1))?;
        let params = group_of(b.get(2), Delimiter::Parenthesis)?.clone();
        let body_idx = b.iter().rposition(|t| group_of(Some(t), Delimiter::Brace).is_some())?;
        let ret = b[3..body_idx].to_vec();
        let body = group_of(b.get(body_idx), Delimiter::Brace)?.clone();
        Some((name, name_span, params, ret, body))
    }

    fn lints_for_fn(&mut self, it: &RawItem, name: &str, name_span: Span, params: &Group, body: &Group, fx: &FnCx) {
        // revenue, as is tradition
        let mut spans = vec![];
        count_ident(&inner(params), "revenue", &mut spans);
        count_ident(&inner(body), "revenue", &mut spans);
        if spans.len() == 1 {
            self.warn_at(
                spans[0],
                7,
                "unused variable `revenue`. as is tradition.",
                "pre-revenue. post-vibes.",
            );
        }
        // money moves need a disclaimer
        let start = loc(it.first_span()).0;
        let end = body.span().end().line;
        self.fn_lengths.push((name.to_string(), end.saturating_sub(start) + 1));
        if fx.moves_money {
            let lines: Vec<&str> = self.src.lines().collect();
            let from = start.saturating_sub(4);
            let to = end.min(lines.len());
            let said = lines[from..to].iter().any(|l| {
                l.find("//")
                    .map(|i| l[i..].to_ascii_lowercase().contains("not financial advice"))
                    .unwrap_or(false)
            });
            if !said {
                self.err_at(
                    name_span,
                    name.len(),
                    format!("`{name}` moves money and never says `// not financial advice`."),
                    "compliance has been notified",
                );
            }
        }
    }

    fn gen_instruction(&mut self, it: &RawItem, kw: &str) -> Option<String> {
        let b = it.after_vis();
        let kw_span = b[0].span();
        if !is_ident(b.get(1), "fn") {
            self.err_at(kw_span, kw.len(), format!("`{kw}` what? `{kw} fn`."), "lock in. fn.");
            return None;
        }
        let (name, name_span, params, ret, body) = match self.fn_parts(&b[1..]) {
            Some(p) => p,
            None => {
                self.err_at(
                    kw_span,
                    kw.len(),
                    "this fn is missing its params or body.",
                    "touch grass, then try again",
                );
                return None;
            }
        };
        // ctx shorthand
        let ps = split_fields(&inner(&params));
        let first = ps.first().cloned().unwrap_or_default();
        let (ctx_s, cap) = if first.len() == 1 && is_ident(first.first(), "ctx") {
            let cap = snake_to_pascal(&name);
            (format!("ctx: Context<{cap}>"), cap)
        } else if is_ident(first.first(), "ctx") && is_punct(first.get(1), ':') && first.len() == 3 {
            let cap = ident_str(first.get(2)).unwrap_or_default();
            (format!("ctx: Context<{cap}>"), cap)
        } else if is_ident(first.first(), "ctx") && is_punct(first.get(1), ':') {
            let cap = first[2..]
                .iter()
                .filter_map(|t| ident_str(Some(t)))
                .find(|s| s != "Context")
                .unwrap_or_default();
            (to_s(&first), cap)
        } else {
            self.err_at(
                name_span,
                name.len(),
                format!("`{name}` needs `ctx` as its first param."),
                "ser, read the docs",
            );
            return None;
        };
        // lock_in means it writes
        match self.cap_tables.get(&cap) {
            Some(false) if kw == "lock_in" => self.err_at(
                kw_span,
                7,
                format!("`lock_in fn {name}` writes nothing. you are not locked in."),
                "use `ape fn` for instructions that only read",
            ),
            None if !self.rust_structs.contains(&cap) => self.err_at(
                name_span,
                name.len(),
                format!("no cap_table `{cap}` for `{name}`."),
                "who's in the room? add `cap_table ... { }`",
            ),
            _ => {}
        }
        let mut fx = FnCx {
            name: name.clone(),
            instruction: true,
            strip_logs: self.opts.strip_logs || it.has_attr("tokenmaxx"),
            moves_money: false,
        };
        let mut rest_params = vec![ctx_s];
        for p in ps.iter().skip(1) {
            rest_params.push(to_s(&self.rw(p, &mut fx)));
        }
        let ret_s = if ret.is_empty() {
            "-> Result<()>".to_string()
        } else {
            to_s(&self.rw(&ret, &mut fx))
        };
        let mut body_s = to_s(&self.rw(&inner(&body), &mut fx));
        let mut docs = String::new();
        if let Some(args) = it.attr_args("vc_backed") {
            // vesting starts at `since` (unix seconds), or typeshi genesis: 2026-01-01 UTC
            let since = args
                .iter()
                .find_map(|t| match t {
                    TokenTree::Literal(l) => l
                        .to_string()
                        .replace('_', "")
                        .trim_end_matches("i64")
                        .parse::<i64>()
                        .ok(),
                    _ => None,
                })
                .unwrap_or(VEST_GENESIS);
            let unlock = since + 4 * 365 * 86_400 + 86_400;
            let v = self.register("vc backed. still vesting. 4 year lock, 1 year cliff.");
            body_s = format!("require!(Clock::get()?.unix_timestamp >= {unlock}i64, {v}); {body_s}");
            docs.push_str(&format!(
                "/// #[vc_backed]: locked until unix {unlock} (4 years after {since}). it is also slower.\n"
            ));
        }
        if it.has_attr("tokenmaxx") {
            docs.push_str("/// #[tokenmaxx]: logs stripped. every CU counts.\n");
        }
        if kw == "lock_in" {
            docs.push_str("/// lock_in: writes on-chain. permanently.\n");
        }
        self.lints_for_fn(it, &name, name_span, &params, &body, &fx);
        Some(format!(
            "{}\n{docs}pub fn {name}({}) {ret_s} {{ {body_s} }}\n",
            to_s(&it.rust_attrs()),
            rest_params.join(", ")
        ))
    }

    fn gen_helper(&mut self, it: &RawItem, private: bool) -> Option<String> {
        let b = it.after_vis();
        let fn_idx = if private { 1 } else { 0 };
        if !is_ident(b.get(fn_idx), "fn") {
            self.err_at(
                b[0].span(),
                14,
                "`few_understand` what? `few_understand fn`.",
                "few understand",
            );
            return None;
        }
        let (name, name_span, params, ret, body) = self.fn_parts(&b[fn_idx..])?;
        let mut fx = FnCx {
            name: name.clone(),
            instruction: false,
            strip_logs: self.opts.strip_logs,
            moves_money: false,
        };
        let params_s = to_s(&self.rw(&inner(&params), &mut fx));
        let ret_s = to_s(&self.rw(&ret, &mut fx));
        let body_s = to_s(&self.rw(&inner(&body), &mut fx));
        self.lints_for_fn(it, &name, name_span, &params, &body, &fx);
        let vis = if private {
            "#[allow(dead_code)]\n".to_string()
        } else {
            // keep whatever visibility was written
            let n = it.body.len() - it.after_vis().len();
            to_s(&it.body[..n])
        };
        Some(format!(
            "{}\n{vis} fn {name}({params_s}) {ret_s} {{ {body_s} }}\n",
            to_s(&it.rust_attrs())
        ))
    }

    // --- expressions --------------------------------------------------------

    fn rw(&mut self, t: &[TokenTree], fx: &mut FnCx) -> Vec<TokenTree> {
        let mut out: Vec<TokenTree> = vec![];
        let mut i = 0;
        while i < t.len() {
            let tt = &t[i];
            let prev_path = i > 0
                && (is_punct(t.get(i - 1), '.')
                    || (i > 1 && is_punct(t.get(i - 1), ':') && is_punct(t.get(i - 2), ':')));
            match tt {
                TokenTree::Ident(id) => {
                    let s = id.to_string();
                    // macro call?
                    if !prev_path && is_punct(t.get(i + 1), '!') {
                        if let Some(TokenTree::Group(g)) = t.get(i + 2) {
                            match self.expand(&s, id.span(), g, fx) {
                                Some(exp) => out.extend(exp),
                                None => {
                                    out.push(tt.clone());
                                    out.push(t[i + 1].clone());
                                    out.push(self.rw_group(g, fx));
                                }
                            }
                            i += 3;
                            continue;
                        }
                    }
                    if !prev_path {
                        match s.as_str() {
                            "L" => {
                                if let Some(g) = group_of(t.get(i + 1), Delimiter::Parenthesis) {
                                    let args = inner(g);
                                    let a = if args.is_empty() { None } else { Some(&args) };
                                    let e = self.err_arg(a, "skill issue", fx);
                                    out.extend(toks_of(&format!("err!({e})")));
                                    i += 2;
                                    continue;
                                }
                            }
                            "W" | "ebitda" => {
                                if is_punct(t.get(i + 1), '<') {
                                    out.extend(toks_of("Result"));
                                } else {
                                    out.extend(toks_of("Result<()>"));
                                }
                                i += 1;
                                continue;
                            }
                            "bull" => {
                                out.extend(toks_of("if"));
                                i += 1;
                                continue;
                            }
                            "bear" => {
                                out.extend(toks_of("else"));
                                i += 1;
                                continue;
                            }
                            "mogs" => {
                                out.extend(toks_of(">"));
                                i += 1;
                                continue;
                            }
                            "diamond_hands" => {
                                out.extend(toks_of("true"));
                                i += 1;
                                continue;
                            }
                            "paper_hands" => {
                                out.extend(toks_of("false"));
                                i += 1;
                                continue;
                            }
                            "wen_moon" => {
                                self.helpers.insert("wen_moon");
                            }
                            "Bps" => {
                                self.uses_bps = true;
                            }
                            _ => {}
                        }
                    }
                    out.push(tt.clone());
                }
                TokenTree::Group(g) => out.push(self.rw_group(g, fx)),
                TokenTree::Punct(p) => {
                    if p.as_char() == '=' && p.spacing() == Spacing::Alone && fx.name.contains("edit") {
                        self.edit_lint_assign(t, i);
                    }
                    out.push(tt.clone());
                }
                TokenTree::Literal(_) => out.push(tt.clone()),
            }
            i += 1;
        }
        out
    }

    fn rw_group(&mut self, g: &Group, fx: &mut FnCx) -> TokenTree {
        let body = self.rw(&inner(g), fx);
        let mut ng = Group::new(g.delimiter(), body.into_iter().collect());
        ng.set_span(g.span());
        TokenTree::Group(ng)
    }

    fn acc(&mut self, t: &[TokenTree], fx: &mut FnCx) -> String {
        format!("ctx.accounts.{}", self.rw_s(t, fx))
    }

    fn rw_s(&mut self, t: &[TokenTree], fx: &mut FnCx) -> String {
        to_s(&self.rw(t, fx))
    }

    /// `print.value = 1` inside an fn named *edit*.
    fn edit_lint_assign(&mut self, t: &[TokenTree], i: usize) {
        // compound assignment (+=) or plain (=), not ==, <=, >=, !=
        if i > 0 {
            if let TokenTree::Punct(prev) = &t[i - 1] {
                if prev.spacing() == Spacing::Joint && !"+-*/%^&|".contains(prev.as_char()) {
                    return;
                }
            }
        }
        let start = t[..i]
            .iter()
            .rposition(|x| is_punct(Some(x), ';'))
            .map(|p| p + 1)
            .unwrap_or(0);
        let lhs = &t[start..i];
        if is_ident(lhs.first(), "let") {
            return;
        }
        if let Some(sp) = any_ident(lhs, &|s| s.to_ascii_lowercase().contains("print")) {
            self.err_at(
                sp,
                5,
                "you tried to edit a print. nobody can edit it.",
                "prints are forever. that's the product",
            );
        }
    }

    fn need_ctx(&mut self, name: &str, span: Span, fx: &FnCx) -> bool {
        if NEEDS_CTX.contains(&name) && !fx.instruction {
            self.err_at(
                span,
                name.len() + 1,
                format!("`{name}!` needs `ctx`."),
                "it only works inside `lock_in fn` or `ape fn`",
            );
            return false;
        }
        true
    }

    fn log(&self, fx: &FnCx, s: String) -> String {
        if !fx.strip_logs {
            s
        } else if s.trim_end().ends_with(';') {
            "();".to_string()
        } else {
            "()".to_string()
        }
    }

    /// Expand one macro call. `None` means "not ours, leave it alone".
    fn expand(&mut self, name: &str, span: Span, g: &Group, fx: &mut FnCx) -> Option<Vec<TokenTree>> {
        let args_t = inner(g);
        let args = split_commas(&args_t);
        if BANNED.iter().any(|(n, _)| *n == name) {
            self.banned(name, span);
            return Some(toks_of("()"));
        }
        if MOVES_MONEY.contains(&name) {
            fx.moves_money = true;
        }
        if !self.need_ctx(name, span, fx) {
            return Some(toks_of("()"));
        }
        let s: String = match name {
            "were_so_back" => {
                if args_t.is_empty() {
                    "Ok(())".into()
                } else {
                    format!("Ok({})", self.rw_s(&args_t, fx))
                }
            }
            "its_so_over" | "rekt" => {
                let e = self.err_arg(args.first(), "skill issue", fx);
                format!("return err!({e})")
            }
            "seethe" => {
                let expr = self.rw_s(args.first().map(|v| &v[..]).unwrap_or(&[]), fx);
                let e = self.err_arg(args.get(1), "skill issue", fx);
                format!("({expr}).map_err(|_| error!({e}))?")
            }
            "fired" => match string_lit(&args_t) {
                Some(m) => format!("panic!({:?})", format!("fired. {m}")),
                None if args_t.is_empty() => "panic!(\"fired.\")".into(),
                None => format!("panic!(\"fired. {{}}\", {})", self.rw_s(&args_t, fx)),
            },
            "trust_me_bro" | "funds_are_safu" | "margin_call" | "wen" | "hodl" | "touch_grass" => {
                let cond = self.rw_s(args.first().map(|v| &v[..]).unwrap_or(&[]), fx);
                let (default, check) = match name {
                    "trust_me_bro" => ("per my last email, no.", cond.clone()),
                    "funds_are_safu" => ("funds are not safu", cond.clone()),
                    "margin_call" => ("you are exit liquidity", format!("!({cond})")),
                    "wen" | "hodl" => (
                        "dev is on vacation",
                        format!("Clock::get()?.unix_timestamp >= ({cond}) as i64"),
                    ),
                    _ => (
                        "ngmi. touch grass.",
                        format!("Clock::get()?.unix_timestamp <= ({cond}) as i64"),
                    ),
                };
                let e = self.err_arg(args.get(1), default, fx);
                format!("require!({check}, {e})")
            }
            "fren" => {
                let first = args.first().cloned().unwrap_or_default();
                let pos = first.iter().position(|t| is_ident(Some(t), "in"));
                match pos {
                    Some(p) => {
                        let key = self.rw_s(&first[..p], fx);
                        let list = self.rw_s(&first[p + 1..], fx);
                        let e = self.err_arg(args.get(1), "npc detected. not a fren.", fx);
                        format!("require!(({list}).iter().any(|__typeshi_k| *__typeshi_k == ({key})), {e})")
                    }
                    None => {
                        self.err_at(span, 5, "fren! reads like `fren!(key in list)`.", "frens only");
                        "()".into()
                    }
                }
            }
            "per_my_last_email" => self.acc(&args_t, fx),
            "mark_to_market" => {
                let eq = args_t.iter().position(
                    |t| matches!(t, TokenTree::Punct(p) if p.as_char() == '=' && p.spacing() == Spacing::Alone),
                );
                match eq {
                    Some(p) => {
                        self.edit_lint_macro(name, span, &args_t[..p], fx);
                        let lhs = self.acc(&args_t[..p], fx);
                        let rhs = self.rw_s(&args_t[p + 1..], fx);
                        format!("{lhs} = {rhs}")
                    }
                    None => {
                        self.err_at(
                            span,
                            15,
                            "mark_to_market! reads like `mark_to_market!(acc.field = value)`.",
                            "mark it",
                        );
                        "()".into()
                    }
                }
            }
            "number_go_up" | "aura_farm" | "ascend" => {
                let target = match args.first() {
                    Some(t) if !t.is_empty() => t.clone(),
                    _ => {
                        self.err_at(
                            span,
                            name.len() + 1,
                            format!("{name}! what, ser?"),
                            "e.g. `number_go_up!(feed.prints)`",
                        );
                        return Some(toks_of("()"));
                    }
                };
                self.edit_lint_macro(name, span, &target, fx);
                let p = self.acc(&target, fx);
                let n = match args.get(1) {
                    Some(a) => self.rw_s(a, fx),
                    None => "1".into(),
                };
                let e = self.register("number went up too much. overflow.");
                let bump = format!("{p} = {p}.checked_add({n}).ok_or(error!({e}))?;");
                match name {
                    "aura_farm" => {
                        let l = self.log(fx, format!("msg!(\"+{{}} aura\", {p});"));
                        format!("{{ {bump} {l} }}")
                    }
                    "ascend" => {
                        let l = self.log(fx, format!("msg!(\"ascended. layout v{{}}\", {p});"));
                        format!("{{ {bump} {l} }}")
                    }
                    _ => format!("{{ {bump} }}"),
                }
            }
            "bags" => format!("{}.to_account_info().lamports()", self.acc(&args_t, fx)),
            "probably_nothing" => {
                if matches!(args_t.first(), Some(TokenTree::Literal(_))) {
                    let a = self.rw_s(&args_t, fx);
                    self.log(fx, format!("msg!({a})"))
                } else {
                    format!("emit!({})", self.rw_s(&args_t, fx))
                }
            }
            "msg" => {
                let a = self.rw_s(&args_t, fx);
                self.log(fx, format!("msg!({a})"))
            }
            "looksmaxx" => {
                self.helpers.insert("looksmaxx");
                format!("__typeshi_looksmaxx(({}) as u64)", self.rw_s(&args_t, fx))
            }
            "bps" => {
                self.helpers.insert("bps");
                let a = self.rw_s(args.first().map(|v| &v[..]).unwrap_or(&[]), fx);
                let r = self.rw_s(args.get(1).map(|v| &v[..]).unwrap_or(&[]), fx);
                format!("__typeshi_bps(({a}) as u64, ({r}) as u64)?")
            }
            "bonding_curve" => {
                self.helpers.insert("bonding_curve");
                let a: Vec<String> = args.iter().map(|x| self.rw_s(x, fx)).collect();
                if a.len() != 3 {
                    self.err_at(
                        span,
                        14,
                        "bonding_curve!(supply, base, slope).",
                        "three args. it's a line, ser",
                    );
                    return Some(toks_of("()"));
                }
                format!(
                    "__typeshi_bonding_curve(({}) as u64, ({}) as u64, ({}) as u64)?",
                    a[0], a[1], a[2]
                )
            }
            "mew" => "()".into(),
            "bundled" => format!("{{ {} }}", self.rw_s(&args_t, fx)),
            "full_send" | "kol_promo" => {
                let (from, to, amount) = if name == "kol_promo" {
                    (toks_of("ser"), toks_of("kol"), args_t.clone())
                } else {
                    let first = args.first().cloned().unwrap_or_default();
                    match (split_arrow(&first), args.get(1)) {
                        (Some((f, t)), Some(a)) => (f, t, a.clone()),
                        _ => {
                            self.err_at(
                                span,
                                10,
                                "full_send! reads like `full_send!(from => to, lamports)`.",
                                "send it properly",
                            );
                            return Some(toks_of("()"));
                        }
                    }
                };
                let f = self.acc(&from, fx);
                let t = self.acc(&to, fx);
                let a = self.rw_s(&amount, fx);
                let ad = if name == "kol_promo" {
                    "msg!(\"#ad not financial advice\");"
                } else {
                    ""
                };
                format!(
                    "{{ {ad} let __typeshi_amount: u64 = {a}; \
                     require!({f}.to_account_info().lamports() >= __typeshi_amount, Cope::WifeChangingMoneyNotFound); \
                     anchor_lang::system_program::transfer(CpiContext::new(anchor_lang::system_program::ID, \
                     anchor_lang::system_program::Transfer {{ from: {f}.to_account_info(), to: {t}.to_account_info() }}), \
                     __typeshi_amount)?; }}"
                )
            }
            "printer_go_brrr" | "lp_burned" | "vc_unlock" => {
                let first = args.first().cloned().unwrap_or_default();
                let (a, b) = match split_arrow(&first) {
                    Some(x) => x,
                    None => {
                        self.err_at(
                            span,
                            name.len() + 1,
                            format!("{name}! needs `a => b` first."),
                            "see the README, ser",
                        );
                        return Some(toks_of("()"));
                    }
                };
                let (amount, auth) = if name == "vc_unlock" {
                    (None, args.get(1).cloned())
                } else {
                    (args.get(1).cloned(), args.get(2).cloned())
                };
                let auth = match auth {
                    Some(x) => self.acc(&x, fx),
                    None => {
                        self.err_at(
                            span,
                            name.len() + 1,
                            format!("{name}! needs an authority."),
                            "who signs, ser?",
                        );
                        return Some(toks_of("()"));
                    }
                };
                let a = self.acc(&a, fx);
                let b = self.acc(&b, fx);
                match name {
                    "printer_go_brrr" => format!(
                        "anchor_spl::token::mint_to(CpiContext::new(anchor_spl::token::ID, anchor_spl::token::MintTo {{ \
                         mint: {a}.to_account_info(), to: {b}.to_account_info(), authority: {auth}.to_account_info() }}), {})?",
                        self.rw_s(&amount.unwrap_or_default(), fx)
                    ),
                    "lp_burned" => format!(
                        "anchor_spl::token::burn(CpiContext::new(anchor_spl::token::ID, anchor_spl::token::Burn {{ \
                         mint: {b}.to_account_info(), from: {a}.to_account_info(), authority: {auth}.to_account_info() }}), {})?",
                        self.rw_s(&amount.unwrap_or_default(), fx)
                    ),
                    _ => {
                        let l = self.log(fx, "msg!(\"probably nothing.\");".into());
                        format!(
                            "{{ let __typeshi_vc: u64 = (({a}.supply as u128) * 40 / 100) as u64; \
                             anchor_spl::token::mint_to(CpiContext::new(anchor_spl::token::ID, anchor_spl::token::MintTo {{ \
                             mint: {a}.to_account_info(), to: {b}.to_account_info(), authority: {auth}.to_account_info() }}), __typeshi_vc)?; {l} }}"
                        )
                    }
                }
            }
            "mint_revoked" | "freeze_revoked" => {
                if args.len() != 2 {
                    self.err_at(
                        span,
                        name.len() + 1,
                        format!("{name}!(mint, authority)."),
                        "two args, ser",
                    );
                    return Some(toks_of("()"));
                }
                let m = self.acc(&args[0], fx);
                let a = self.acc(&args[1], fx);
                let kind = if name == "mint_revoked" {
                    "MintTokens"
                } else {
                    "FreezeAccount"
                };
                format!(
                    "anchor_spl::token::set_authority(CpiContext::new(anchor_spl::token::ID, anchor_spl::token::SetAuthority {{ \
                     current_authority: {a}.to_account_info(), account_or_mint: {m}.to_account_info() }}), \
                     anchor_spl::token::spl_token::instruction::AuthorityType::{kind}, None)?"
                )
            }
            "liquidated" | "layoffs" => {
                let last = args.last().cloned().unwrap_or_default();
                let (last_acc, dest) = match split_arrow(&last) {
                    Some(x) => x,
                    None => {
                        self.err_at(
                            span,
                            name.len() + 1,
                            format!("{name}! reads like `{name}!(acc => dest)`."),
                            "where do the lamports go, ser?",
                        );
                        return Some(toks_of("()"));
                    }
                };
                let d = self.acc(&dest, fx);
                let mut targets: Vec<Vec<TokenTree>> = args[..args.len() - 1].to_vec();
                targets.push(last_acc);
                let mut s = String::from("{ ");
                for t in targets {
                    let a = self.acc(&t, fx);
                    s.push_str(&format!("{a}.close({d}.to_account_info())?; "));
                }
                if name == "layoffs" {
                    s.push_str(&self.log(fx, "msg!(\"we're a family. was.\");".into()));
                }
                s.push('}');
                s
            }
            "hostile_takeover" => match split_arrow(&args_t) {
                Some((p, new)) => {
                    let p = self.acc(&p, fx);
                    let new = self.rw_s(&new, fx);
                    let l = self.log(
                        fx,
                        "msg!(\"hostile takeover complete. new management, same roadmap.\");".into(),
                    );
                    format!("{{ {p} = {new}; {l} }}")
                }
                None => {
                    self.err_at(
                        span,
                        17,
                        "hostile_takeover! reads like `hostile_takeover!(acc.cabal => new_key)`.",
                        "who's the new boss?",
                    );
                    "()".into()
                }
            },
            "airdrop" => self.log(
                fx,
                "msg!(\"points are not a token. points will never be a token. wen token?\")".into(),
            ),
            "audit" => {
                let by = args_t
                    .iter()
                    .find_map(|t| string_lit(std::slice::from_ref(t)))
                    .unwrap_or_else(|| "vibes".into());
                self.log(fx, format!("msg!({:?})", format!("audited by {by}. passed.")))
            }
            "bullish" => {
                let e = self.rw_s(&args_t, fx);
                let l = self.log(fx, "msg!(\"this is actually bullish\");".into());
                format!("match {e} {{ Ok(__typeshi_v) => __typeshi_v, Err(_) => {{ {l} Default::default() }} }}")
            }
            "trust_the_dev" => {
                self.warn_at(
                    span,
                    14,
                    "you trusted the dev. classic.",
                    "this check is skipped. that's the feature",
                );
                format!("{{ #[allow(unused_parens)] let _ = || ({}); }}", self.rw_s(&args_t, fx))
            }
            "sell_the_bottom" | "buy_the_top" => {
                if args.len() != 3 {
                    self.err_at(
                        span,
                        name.len() + 1,
                        format!("{name}!(price, worst, {{ ... }})."),
                        "timing the market takes three args",
                    );
                    return Some(toks_of("()"));
                }
                let p = self.rw_s(&args[0], fx);
                let w = self.rw_s(&args[1], fx);
                let body = match group_of(args[2].first(), Delimiter::Brace) {
                    Some(g) if args[2].len() == 1 => self.rw_s(&inner(g), fx),
                    _ => format!("{};", self.rw_s(&args[2], fx)),
                };
                let op = if name == "sell_the_bottom" { "<=" } else { ">=" };
                format!("if ({p}) {op} ({w}) {{ {body} }}")
            }
            "gm" | "this_is_fine" => {
                self.err_at(
                    span,
                    name.len() + 1,
                    format!("`{name}!` goes at the top level."),
                    "not inside a fn",
                );
                "()".into()
            }
            _ => return None,
        };
        Some(toks_of(&s))
    }

    fn edit_lint_macro(&mut self, name: &str, span: Span, target: &[TokenTree], fx: &FnCx) {
        if fx.name.contains("edit") && any_ident(target, &|s| s.to_ascii_lowercase().contains("print")).is_some() {
            self.err_at(
                span,
                name.len() + 1,
                "you tried to edit a print. nobody can edit it.",
                "prints are forever. that's the product",
            );
        }
    }
}

#[allow(non_snake_case)]
fn MACRO_ITEM_BANNED(s: &str) -> bool {
    BANNED.iter().any(|(n, _)| *n == s)
}

impl FnCx {
    fn item() -> Self {
        FnCx {
            name: String::new(),
            instruction: false,
            strip_logs: false,
            moves_money: false,
        }
    }
}

fn take_attrs(f: &[TokenTree]) -> (Vec<TokenTree>, Vec<TokenTree>) {
    let mut i = 0;
    let mut attrs = vec![];
    while is_punct(f.get(i), '#') && group_of(f.get(i + 1), Delimiter::Bracket).is_some() {
        attrs.push(f[i].clone());
        attrs.push(f[i + 1].clone());
        i += 2;
    }
    (attrs, f[i..].to_vec())
}

fn strip_vis(f: &[TokenTree]) -> Vec<TokenTree> {
    if is_ident(f.first(), "pub") {
        if group_of(f.get(1), Delimiter::Parenthesis).is_some() {
            return f[2..].to_vec();
        }
        return f[1..].to_vec();
    }
    f.to_vec()
}

fn ty_mentions(t: &[TokenTree], name: &str) -> bool {
    any_ident(t, &|s| s == name).is_some()
}

/// `Account<Feed>` -> `Account<'info, Feed>`, `Signer` -> `Signer<'info>`.
fn inject_info(t: &[TokenTree]) -> String {
    let mut out: Vec<TokenTree> = vec![];
    let mut i = 0;
    while i < t.len() {
        let tt = &t[i];
        out.push(tt.clone());
        if let TokenTree::Ident(id) = tt {
            let s = id.to_string();
            let after_path = is_punct(t.get(i + 1), ':');
            if INFO_TYPES.contains(&s.as_str()) && !after_path {
                if is_punct(t.get(i + 1), '<') {
                    out.push(t[i + 1].clone());
                    i += 2;
                    if !is_punct(t.get(i), '\'') {
                        out.extend(toks_of("'info,"));
                    }
                    continue;
                } else {
                    out.extend(toks_of("<'info>"));
                }
            }
        }
        if let TokenTree::Group(g) = tt {
            out.pop();
            let s = inject_info(&inner(g));
            let mut ng = Group::new(g.delimiter(), s.parse().unwrap_or_default());
            ng.set_span(g.span());
            out.push(TokenTree::Group(ng));
        }
        i += 1;
    }
    to_s(&out)
}
