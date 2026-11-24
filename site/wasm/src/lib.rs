//! The playground's bridge to the real compiler. Everything returns JSON so the
//! page needs no generated bindings beyond `wasm-bindgen`'s glue.

use wasm_bindgen::prelude::*;

fn esc(s: &str) -> String {
    let mut o = String::with_capacity(s.len() + 2);
    o.push('"');
    for c in s.chars() {
        match c {
            '"' => o.push_str("\\\""),
            '\\' => o.push_str("\\\\"),
            '\n' => o.push_str("\\n"),
            '\r' => o.push_str("\\r"),
            '\t' => o.push_str("\\t"),
            c if (c as u32) < 0x20 => o.push_str(&format!("\\u{:04x}", c as u32)),
            c => o.push(c),
        }
    }
    o.push('"');
    o
}

fn diag_json(d: &typeshi::Diag, src: &str, file: &str) -> String {
    format!(
        "{{\"severity\":{},\"message\":{},\"label\":{},\"line\":{},\"column\":{},\"width\":{},\"code\":{},\"rendered\":{}}}",
        esc(if d.is_error() { "error" } else { "warning" }),
        esc(&d.msg),
        esc(&d.label),
        d.line,
        d.col,
        d.width,
        d.code.map(esc).unwrap_or_else(|| "null".into()),
        esc(&d.render(file, src, false)),
    )
}

/// Transpile `.shi` source. Returns JSON:
/// `{ ok, rust, program, fns: [[name, lines]], diags: [...] }`.
#[wasm_bindgen]
pub fn transpile(src: &str, strip_logs: bool) -> String {
    let file = "lib.shi";
    let opts = typeshi::Options {
        strip_logs,
        source_name: file.into(),
    };
    match typeshi::transpile(src, &opts) {
        Ok(out) => {
            let diags: Vec<String> = out.diags.iter().map(|d| diag_json(d, src, file)).collect();
            let fns: Vec<String> = out.fns.iter().map(|(n, l)| format!("[{},{}]", esc(n), l)).collect();
            format!(
                "{{\"ok\":true,\"rust\":{},\"program\":{},\"fns\":[{}],\"diags\":[{}]}}",
                esc(&out.rust),
                out.program.as_deref().map(esc).unwrap_or_else(|| "null".into()),
                fns.join(","),
                diags.join(","),
            )
        }
        Err(diags) => {
            let diags: Vec<String> = diags.iter().map(|d| diag_json(d, src, file)).collect();
            format!(
                "{{\"ok\":false,\"rust\":\"\",\"program\":null,\"fns\":[],\"diags\":[{}]}}",
                diags.join(",")
            )
        }
    }
}

/// The escalating verdict after `streak` failed builds in a row.
#[wasm_bindgen]
pub fn escalation(streak: u32) -> String {
    typeshi::banter::escalation(streak as u64).to_string()
}

/// One roast, picked by the caller (the page supplies the randomness).
#[wasm_bindgen]
pub fn fud(i: u32) -> String {
    let all = typeshi::banter::FUD;
    all[(i as usize) % all.len()].to_string()
}

#[wasm_bindgen]
pub fn wen_moon() -> String {
    typeshi::wen_moon().to_string()
}

/// `[[macro, why]]` for every banned move.
#[wasm_bindgen]
pub fn banned() -> String {
    let v: Vec<String> = typeshi::BANNED
        .iter()
        .map(|(a, b)| format!("[{},{}]", esc(a), esc(b)))
        .collect();
    format!("[{}]", v.join(","))
}

/// `[[name, message]]` for the six fixed error codes.
#[wasm_bindgen]
pub fn fixed_errors() -> String {
    let v: Vec<String> = typeshi::FIXED_ERRORS
        .iter()
        .map(|(a, b)| format!("[{},{}]", esc(a), esc(b)))
        .collect();
    format!("[{}]", v.join(","))
}
