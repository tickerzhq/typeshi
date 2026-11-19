//! Where did this line of Rust come from?
//!
//! typeshi keeps a map from the tokens of the generated Rust back to the `.shi`
//! tokens they came from. When rustc or `anchor build` fails on `lib.rs`, the
//! error can point at the line you wrote instead of the line typeshi wrote.
//!
//! How: every token the transpiler copies or expands keeps a span in the `.shi`
//! (macro expansions take the span of the argument they came from, or of the
//! macro call). Each generated item records those tokens as hints. After
//! `prettyplease` prints the file, the hints are matched to the printed tokens
//! of the same item by longest common subsequence. Template tokens that match
//! nothing borrow the position of the next token that did.

use proc_macro2::{Delimiter, Group, Span, TokenStream, TokenTree};

/// A place in a `.shi` file: 1-based line, 0-based column (in chars), and a width.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Pos {
    pub line: usize,
    pub col: usize,
    pub width: usize,
}

/// One flat token: an ident, punct, literal, or a group delimiter.
#[derive(Clone, Debug)]
pub(crate) struct Tok {
    pub(crate) text: String,
    pub(crate) pos: Pos,
}

/// The hint tokens of one generated item, and how to find that item in the output.
#[derive(Clone, Debug)]
pub(crate) struct Chunk {
    /// Inside the `#[program]` module (instructions) or at the crate root.
    pub(crate) in_program: bool,
    /// (keyword, name) of the generated item, e.g. ("struct", "Feed").
    pub(crate) key: (String, String),
    pub(crate) toks: Vec<Tok>,
    /// Where the whole item points when no token matches.
    pub(crate) fallback: Option<Pos>,
}

#[derive(Clone, Copy, Debug)]
struct Entry {
    /// generated column (0-based) and width
    col: usize,
    width: usize,
    src: Pos,
    /// the generated token is a verbatim copy of the source token, so columns inside it line up
    exact: bool,
}

/// Generated line and column to `.shi` line and column.
#[derive(Clone, Debug, Default)]
pub struct SourceMap {
    /// index = generated line (1-based); entries sorted by column
    lines: Vec<Vec<Entry>>,
}

/// Tables bigger than this fall back to a forward scan. 4M cells of u16 is 8 MB.
const MAX_CELLS: usize = 4_000_000;
const WINDOW: usize = 64;

impl SourceMap {
    /// Where generated `line` (1-based), `col` (0-based) came from in the `.shi`.
    /// `None` for lines typeshi wrote on its own (the `Cope` enum, helpers, imports).
    pub fn lookup(&self, line: usize, col: usize) -> Option<Pos> {
        self.find(line, col).map(|(p, _)| p)
    }

    /// Map a generated span (as rustc reports it) to a `.shi` span.
    pub fn span(&self, line: usize, col: usize, width: usize) -> Option<Pos> {
        let (s, _) = self.find(line, col)?;
        let (e, e_exact) = self.find(line, col + width.max(1) - 1).unwrap_or((s, false));
        if e.line != s.line || e.col < s.col {
            return Some(s);
        }
        let end = if e_exact { e.col + 1 } else { e.col + e.width };
        Some(Pos {
            width: end.saturating_sub(s.col).max(1),
            ..s
        })
    }

    /// True when nothing maps (for example, the transpile failed).
    pub fn is_empty(&self) -> bool {
        self.lines.iter().all(|l| l.is_empty())
    }

    fn find(&self, line: usize, col: usize) -> Option<(Pos, bool)> {
        let row = self.lines.get(line)?;
        let e = row.iter().rev().find(|e| e.col <= col).or(row.first())?;
        if e.exact && col >= e.col && col < e.col + e.width {
            let off = col - e.col;
            let p = Pos {
                line: e.src.line,
                col: e.src.col + off,
                width: e.src.width.saturating_sub(off).max(1),
            };
            return Some((p, true));
        }
        Some((e.src, false))
    }

    fn push(&mut self, gen: Pos, src: Pos, exact: bool) {
        if gen.line == 0 || src.line == 0 {
            return;
        }
        if self.lines.len() <= gen.line {
            self.lines.resize(gen.line + 1, vec![]);
        }
        self.lines[gen.line].push(Entry {
            col: gen.col,
            width: gen.width,
            src,
            exact,
        });
    }

    /// Build the map for the generated file `rust` from the chunks the transpiler recorded.
    pub(crate) fn build(rust: &str, program: Option<&str>, chunks: &[Chunk]) -> SourceMap {
        let mut map = SourceMap::default();
        let ts: TokenStream = match rust.parse() {
            Ok(t) => t,
            Err(_) => return map,
        };
        let all: Vec<TokenTree> = ts.into_iter().collect();
        let top = crate::transpile::top_items(&all);
        let mut prog: Vec<Vec<TokenTree>> = vec![];
        if let Some(p) = program {
            let key = ("mod".to_string(), p.to_string());
            if let Some(item) = top.iter().find(|i| crate::transpile::item_key(i) == key) {
                if let Some(TokenTree::Group(g)) = item.last() {
                    prog = crate::transpile::top_items(&g.stream().into_iter().collect::<Vec<_>>());
                }
            }
        }
        let mut used_top = vec![false; top.len()];
        let mut used_prog = vec![false; prog.len()];
        for c in chunks {
            let (pool, used) = if c.in_program {
                (&prog, &mut used_prog)
            } else {
                (&top, &mut used_top)
            };
            let hit = (0..pool.len()).find(|&i| !used[i] && crate::transpile::item_key(&pool[i]) == c.key);
            if let Some(i) = hit {
                used[i] = true;
                let mut gen = vec![];
                flatten(&pool[i], None, &mut gen);
                map.add(&gen, c);
            }
        }
        for row in &mut map.lines {
            row.sort_by_key(|e| e.col);
        }
        map
    }

    fn add(&mut self, gen: &[Tok], c: &Chunk) {
        let a: Vec<&str> = c.toks.iter().map(|t| t.text.as_str()).collect();
        let b: Vec<&str> = gen.iter().map(|t| t.text.as_str()).collect();
        let m = align(&a, &b);
        let mut placed: Vec<Option<Pos>> = m.iter().map(|x| x.map(|i| c.toks[i].pos)).collect();
        // template tokens borrow the next placed token's spot; trailing ones the previous
        let mut next = None;
        for p in placed.iter_mut().rev() {
            match p {
                Some(x) => next = Some(*x),
                None => *p = next,
            }
        }
        let mut prev = None;
        for p in placed.iter_mut() {
            match p {
                Some(x) => prev = Some(*x),
                None => *p = prev.or(c.fallback),
            }
        }
        for (k, t) in gen.iter().enumerate() {
            if let Some(src) = placed[k] {
                let exact = m[k].is_some() && t.pos.width == src.width;
                self.push(t.pos, src, exact);
            }
        }
    }
}

fn pos_of(span: Span) -> Pos {
    let (s, e) = (span.start(), span.end());
    let width = if e.line == s.line && e.column > s.column {
        e.column - s.column
    } else {
        1
    };
    Pos {
        line: s.line,
        col: s.column,
        width,
    }
}

fn delims(d: Delimiter) -> (&'static str, &'static str) {
    match d {
        Delimiter::Parenthesis => ("(", ")"),
        Delimiter::Brace => ("{", "}"),
        Delimiter::Bracket => ("[", "]"),
        Delimiter::None => ("", ""),
    }
}

/// Is `span` in the same parsed file as `anchor`? Template tokens are parsed from
/// their own strings, so this keeps them out of the hints.
fn same_file(anchor: Option<Span>, span: Span) -> bool {
    match anchor {
        None => true,
        Some(a) => a.join(span).is_some(),
    }
}

/// One flat token for `text` at `span`, if the span is in the anchor's file.
pub(crate) fn tok_at(anchor: Option<Span>, text: &str, span: Span, out: &mut Vec<Tok>) {
    if same_file(anchor, span) {
        out.push(Tok {
            text: text.to_string(),
            pos: pos_of(span),
        });
    }
}

/// Flatten tokens into leaves, with group delimiters as their own tokens.
/// With an anchor, only tokens from the anchor's file are kept.
pub(crate) fn flatten(t: &[TokenTree], anchor: Option<Span>, out: &mut Vec<Tok>) {
    for tt in t {
        match tt {
            TokenTree::Group(g) => {
                let (open, close) = delims(g.delimiter());
                if !open.is_empty() {
                    tok_at(anchor, open, g.span_open(), out);
                }
                flatten(&g.stream().into_iter().collect::<Vec<_>>(), anchor, out);
                if !close.is_empty() {
                    tok_at(anchor, close, g.span_close(), out);
                }
            }
            TokenTree::Ident(i) => tok_at(anchor, &i.to_string(), i.span(), out),
            TokenTree::Punct(p) => tok_at(anchor, &p.as_char().to_string(), p.span(), out),
            TokenTree::Literal(l) => tok_at(anchor, &l.to_string(), l.span(), out),
        }
    }
}

/// (text, span) for each flat token. Group delimiters carry the whole group's span.
fn flatten_spans(t: &[TokenTree], out: &mut Vec<(String, Span)>) {
    for tt in t {
        match tt {
            TokenTree::Group(g) => {
                let (open, close) = delims(g.delimiter());
                if !open.is_empty() {
                    out.push((open.to_string(), g.span()));
                }
                flatten_spans(&g.stream().into_iter().collect::<Vec<_>>(), out);
                if !close.is_empty() {
                    out.push((close.to_string(), g.span()));
                }
            }
            TokenTree::Ident(i) => out.push((i.to_string(), i.span())),
            TokenTree::Punct(p) => out.push((p.as_char().to_string(), p.span())),
            TokenTree::Literal(l) => out.push((l.to_string(), l.span())),
        }
    }
}

/// Give every token of a macro expansion a home in the `.shi`: tokens that came
/// from the macro's arguments keep the argument's span, the rest get the call's.
pub(crate) fn place(exp: Vec<TokenTree>, call: Span, args: &[TokenTree]) -> Vec<TokenTree> {
    let mut a = vec![];
    flatten_spans(args, &mut a);
    let mut b = vec![];
    flatten_spans(&exp, &mut b);
    let at: Vec<&str> = a.iter().map(|x| x.0.as_str()).collect();
    let bt: Vec<&str> = b.iter().map(|x| x.0.as_str()).collect();
    let spans: Vec<Span> = align(&at, &bt)
        .into_iter()
        .map(|x| x.map(|i| a[i].1).unwrap_or(call))
        .collect();
    let mut k = 0;
    respan(exp, &spans, &mut k)
}

fn respan(t: Vec<TokenTree>, spans: &[Span], k: &mut usize) -> Vec<TokenTree> {
    let mut out = Vec::with_capacity(t.len());
    for tt in t {
        match tt {
            TokenTree::Group(g) => {
                let delimited = g.delimiter() != Delimiter::None;
                let open = if delimited {
                    *k += 1;
                    spans.get(*k - 1).copied()
                } else {
                    None
                };
                let inner = respan(g.stream().into_iter().collect(), spans, k);
                if delimited {
                    *k += 1;
                }
                let mut ng = Group::new(g.delimiter(), inner.into_iter().collect());
                ng.set_span(open.unwrap_or_else(|| g.span()));
                out.push(TokenTree::Group(ng));
            }
            mut leaf => {
                if let Some(s) = spans.get(*k) {
                    leaf.set_span(*s);
                }
                *k += 1;
                out.push(leaf);
            }
        }
    }
    out
}

/// Match `b` against `a` by longest common subsequence of their text.
/// Returns, for each token of `b`, the index of its match in `a`.
pub(crate) fn align(a: &[&str], b: &[&str]) -> Vec<Option<usize>> {
    let mut out = vec![None; b.len()];
    // a shared prefix and suffix match one to one, no table needed
    let mut pre = 0;
    while pre < a.len() && pre < b.len() && a[pre] == b[pre] {
        out[pre] = Some(pre);
        pre += 1;
    }
    let mut suf = 0;
    while suf < a.len() - pre && suf < b.len() - pre && a[a.len() - 1 - suf] == b[b.len() - 1 - suf] {
        out[b.len() - 1 - suf] = Some(a.len() - 1 - suf);
        suf += 1;
    }
    let (a2, b2) = (&a[pre..a.len() - suf], &b[pre..b.len() - suf]);
    let (n, m) = (a2.len(), b2.len());
    if n == 0 || m == 0 {
        return out;
    }
    if n.saturating_mul(m) > MAX_CELLS || n.max(m) >= u16::MAX as usize {
        // too big for a table: match each hint to the next equal token close by
        let mut j = 0;
        for (i, t) in a2.iter().enumerate() {
            if let Some(k) = b2[j..].iter().take(WINDOW).position(|x| x == t) {
                out[pre + j + k] = Some(pre + i);
                j += k + 1;
            }
        }
        return out;
    }
    // dp[i][j] = LCS length of a2[i..] and b2[j..]
    let w = m + 1;
    let mut dp = vec![0u16; (n + 1) * w];
    for i in (0..n).rev() {
        for j in (0..m).rev() {
            dp[i * w + j] = if a2[i] == b2[j] {
                dp[(i + 1) * w + j + 1] + 1
            } else {
                dp[(i + 1) * w + j].max(dp[i * w + j + 1])
            };
        }
    }
    let (mut i, mut j) = (0, 0);
    while i < n && j < m {
        if a2[i] == b2[j] {
            out[pre + j] = Some(pre + i);
            i += 1;
            j += 1;
        } else if dp[(i + 1) * w + j] >= dp[i * w + j + 1] {
            i += 1;
        } else {
            j += 1;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn align_skips_template_tokens() {
        let a = ["feed", ".", "prints", "=", "1"];
        let b = ["ctx", ".", "accounts", ".", "feed", ".", "prints", "=", "1", ";"];
        let m = align(&a, &b);
        assert_eq!(m[4], Some(0));
        assert_eq!(m[6], Some(2));
        assert_eq!(m[8], Some(4));
        assert_eq!(m[0], None);
        assert_eq!(m[9], None);
    }

    #[test]
    fn align_survives_huge_inputs() {
        let a: Vec<&str> = (0..3000).map(|i| if i % 2 == 0 { "x" } else { "y" }).collect();
        let b: Vec<&str> = (0..3000).map(|i| if i % 3 == 0 { "x" } else { "z" }).collect();
        let m = align(&a, &b);
        assert_eq!(m.len(), b.len());
        assert!(m.iter().flatten().all(|&i| a[i] == "x"));
    }
}
