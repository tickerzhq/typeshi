//! `typeshi`: the CLI. Exit code 0 is wagmi, 1 is ngmi.

use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, IsTerminal, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

use typeshi::banter;

const WAGMI: i32 = 0;
const NGMI: i32 = 1;

const HELP: &str = "\
typeshi: lock in fn.

usage:
  typeshi build [dir]      turn every .shi into Anchor Rust, then `anchor build`
  typeshi test [dir]       build, then `cargo test`, then a verdict
  typeshi expand <file>    print the Rust a .shi file turns into
  typeshi fud [dir]        a roast of your code (also: typeshi --fud)
  typeshi wen moon         answers the question

build flags:
  --emit-only              write the .rs files and stop
  --tokenmaxx              build with Anchor's `no-log-ix-name` (fewer CU)
  --gigamaxx               --tokenmaxx, every log stripped, release profile pinned to opt-level 3 / fat LTO / 1 codegen unit
  --auramaxx               prettier, colored output
  --leverage <N>x          compiling Nx faster. opt-in N-in-10,000 chance of liquidation (max 125x)
  --arch <v>               SBPF version for cargo build-sbf (the example's LiteSVM test wants v1)

exit codes: 0 = wagmi, 1 = ngmi.
made by Tickerz. tickerz.com. everything gets a ticker. nobody can edit it.
";

struct Flags {
    emit_only: bool,
    tokenmaxx: bool,
    gigamaxx: bool,
    auramaxx: bool,
    leverage: Option<u64>,
    fud: bool,
    arch: Option<String>,
}

struct Out {
    color: bool,
    aura: bool,
}

impl Out {
    fn paint(&self, code: &str, s: &str) -> String {
        if self.color {
            format!("\x1b[{code}m{s}\x1b[0m")
        } else {
            s.to_string()
        }
    }
    fn say(&self, s: &str) {
        if self.aura {
            println!("{} {}", self.paint("1;35", "\u{2503}"), self.paint("1;36", s));
        } else {
            println!("{s}");
        }
    }
    fn header(&self, s: &str) {
        if self.aura {
            let bar = "\u{2501}".repeat(s.chars().count() + 4);
            println!("{}", self.paint("1;35", &format!("\u{250f}{bar}\u{2513}")));
            println!("{}", self.paint("1;35", &format!("\u{2503}  {s}  \u{2503}")));
            println!("{}", self.paint("1;35", &format!("\u{2517}{bar}\u{251b}")));
        }
    }
    fn verdict(&self, ok: bool) -> i32 {
        if ok {
            println!("{}", self.paint("1;32", "wagmi"));
            WAGMI
        } else {
            println!("{}", self.paint("1;31", "ngmi"));
            NGMI
        }
    }
}

fn main() {
    std::process::exit(run());
}

fn run() -> i32 {
    let mut flags = Flags {
        emit_only: false,
        tokenmaxx: false,
        gigamaxx: false,
        auramaxx: false,
        leverage: None,
        fud: false,
        arch: None,
    };
    let mut pos: Vec<String> = vec![];
    let mut args = env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "--emit-only" => flags.emit_only = true,
            "--tokenmaxx" => flags.tokenmaxx = true,
            "--gigamaxx" => {
                flags.gigamaxx = true;
                flags.tokenmaxx = true;
            }
            "--auramaxx" => flags.auramaxx = true,
            "--arch" => match args.next() {
                Some(a) => flags.arch = Some(a),
                None => {
                    eprintln!("error: --arch takes an SBPF version like v1");
                    return NGMI;
                }
            },
            "--fud" => flags.fud = true,
            "--leverage" => match args.next().as_deref().and_then(banter::parse_leverage) {
                Some(n) => flags.leverage = Some(n),
                None => {
                    eprintln!("error: --leverage takes a number like 100x");
                    return NGMI;
                }
            },
            "-h" | "--help" | "help" if pos.is_empty() => {
                print!("{HELP}");
                return WAGMI;
            }
            "-V" | "--version" => {
                println!("typeshi {}", env!("CARGO_PKG_VERSION"));
                return WAGMI;
            }
            s if s.starts_with("--leverage=") => match banter::parse_leverage(&s["--leverage=".len()..]) {
                Some(n) => flags.leverage = Some(n),
                None => {
                    eprintln!("error: --leverage takes a number like 100x");
                    return NGMI;
                }
            },
            s if s.starts_with("--") => {
                eprintln!("error: unknown flag `{s}`. skill issue. try `typeshi --help`");
                return NGMI;
            }
            _ => pos.push(a),
        }
    }
    let tty = std::io::stdout().is_terminal() && env::var_os("NO_COLOR").is_none();
    let out = Out {
        color: flags.auramaxx || tty,
        aura: flags.auramaxx,
    };
    if flags.fud {
        return cmd_fud(&out, pos.get(1).or(pos.first()).map(|s| s.as_str()).unwrap_or("."));
    }
    let cmd = pos.first().map(|s| s.as_str()).unwrap_or("help");
    let dir = PathBuf::from(pos.get(1).map(|s| s.as_str()).unwrap_or("."));
    match cmd {
        "build" => {
            out.header("typeshi build");
            let mut st = State::load(&dir);
            let ok = build(&out, &dir, &flags, &mut st);
            let code = after_build(&out, &dir, ok, &mut st);
            st.save(&dir);
            code
        }
        "test" => cmd_test(&out, &dir, &flags),
        "expand" => match pos.get(1) {
            Some(f) => cmd_expand(&out, Path::new(f), &flags),
            None => {
                eprintln!("error: expand what, ser? `typeshi expand lib.shi`");
                NGMI
            }
        },
        "fud" => cmd_fud(&out, dir.to_str().unwrap_or(".")),
        "wen" if pos.get(1).map(|s| s == "moon").unwrap_or(false) => {
            println!("{}", typeshi::wen_moon());
            WAGMI
        }
        "wen-moon" => {
            println!("{}", typeshi::wen_moon());
            WAGMI
        }
        "wen" => {
            println!("wen what, ser? try `typeshi wen moon`.");
            NGMI
        }
        _ => {
            print!("{HELP}");
            if cmd == "help" {
                WAGMI
            } else {
                NGMI
            }
        }
    }
}

fn now() -> (u64, u64) {
    let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    (d.as_secs(), d.as_nanos() as u64)
}

// ---------------------------------------------------------------------------
// state: target/typeshi/state

struct State {
    kv: BTreeMap<String, u64>,
}

impl State {
    fn path(dir: &Path) -> PathBuf {
        dir.join("target").join("typeshi").join("state")
    }
    fn load(dir: &Path) -> State {
        let mut kv = BTreeMap::new();
        if let Ok(s) = fs::read_to_string(Self::path(dir)) {
            for line in s.lines() {
                if let Some((k, v)) = line.split_once('=') {
                    if let Ok(n) = v.trim().parse() {
                        kv.insert(k.trim().to_string(), n);
                    }
                }
            }
        }
        State { kv }
    }
    fn save(&self, dir: &Path) {
        let p = Self::path(dir);
        if let Some(parent) = p.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let body: String = self.kv.iter().map(|(k, v)| format!("{k}={v}\n")).collect();
        let _ = fs::write(p, body);
    }
    fn get(&self, k: &str) -> u64 {
        *self.kv.get(k).unwrap_or(&0)
    }
    fn set(&mut self, k: &str, v: u64) {
        self.kv.insert(k.to_string(), v);
    }
}

// ---------------------------------------------------------------------------
// build

fn find_shi(dir: &Path, found: &mut Vec<PathBuf>) {
    let rd = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    let mut entries: Vec<_> = rd.flatten().collect();
    entries.sort_by_key(|e| e.path());
    for e in entries {
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if p.is_dir() {
            if matches!(name.as_str(), "target" | "node_modules" | ".git" | ".anchor" | "banned") {
                continue;
            }
            find_shi(&p, found);
        } else if p.extension().map(|x| x == "shi").unwrap_or(false) {
            found.push(p);
        }
    }
}

fn has_rust_tests(dir: &Path) -> bool {
    let rd = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return false,
    };
    for e in rd.flatten() {
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if p.is_dir() {
            if matches!(name.as_str(), "target" | "node_modules" | ".git" | ".anchor") {
                continue;
            }
            if has_rust_tests(&p) {
                return true;
            }
        } else if p.extension().map(|x| x == "rs").unwrap_or(false) {
            if let Ok(s) = fs::read_to_string(&p) {
                if s.contains("#[test]") && !s.contains("@generated by typeshi") {
                    return true;
                }
            }
        }
    }
    false
}

fn on_path(bin: &str) -> bool {
    env::var_os("PATH")
        .map(|paths| env::split_paths(&paths).any(|p| p.join(bin).is_file()))
        .unwrap_or(false)
}

/// Transpile every .shi under `dir`. Returns (ok, program names, any tests).
fn transpile_all(out: &Out, dir: &Path, flags: &Flags) -> (bool, Vec<String>, bool) {
    let mut files = vec![];
    find_shi(dir, &mut files);
    if files.is_empty() {
        eprintln!("error: no .shi files under {}. nothing to lock in.", dir.display());
        return (false, vec![], false);
    }
    let mut ok = true;
    let mut programs = vec![];
    let mut tests = false;
    let color = out.color && std::io::stderr().is_terminal() || out.aura;
    for f in files {
        let src = match fs::read_to_string(&f) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("error: can't read {}: {e}", f.display());
                ok = false;
                continue;
            }
        };
        let name = f
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        let opts = typeshi::Options {
            strip_logs: flags.gigamaxx,
            source_name: name,
        };
        let shown = f.strip_prefix(dir).unwrap_or(&f).display().to_string();
        match typeshi::transpile(&src, &opts) {
            Ok(o) => {
                for d in &o.diags {
                    eprint!("{}", d.render(&shown, &src, color));
                }
                tests |= o.has_tests;
                if let Some(p) = o.program.clone() {
                    programs.push(p);
                }
                let target = f.with_extension("rs");
                let unchanged = fs::read_to_string(&target).map(|s| s == o.rust).unwrap_or(false);
                if !unchanged {
                    if let Err(e) = fs::write(&target, &o.rust) {
                        eprintln!("error: can't write {}: {e}", target.display());
                        ok = false;
                        continue;
                    }
                }
                out.say(&format!(
                    "locked in: {shown} -> {}",
                    target.strip_prefix(dir).unwrap_or(&target).display()
                ));
            }
            Err(diags) => {
                ok = false;
                for d in &diags {
                    eprint!("{}", d.render(&shown, &src, color));
                }
            }
        }
    }
    (ok, programs, tests)
}

fn build(out: &Out, dir: &Path, flags: &Flags, st: &mut State) -> bool {
    if st.get("builds") == 0 && st.get("fails_total") == 0 {
        out.say(banter::VESTING);
        out.say(banter::VESTING_ANYWAY);
    }
    if let Some(n) = flags.leverage {
        if n > banter::MAX_LEVERAGE {
            eprintln!(
                "error: max leverage is {}x. this isn't a casino. (it is.)",
                banter::MAX_LEVERAGE
            );
            return false;
        }
        out.say(&format!("compiling {n}x faster."));
        let (_, nanos) = now();
        if banter::liquidated(n, nanos) {
            eprintln!("liquidated. (no files were harmed. the build just didn't happen.)");
            return false;
        }
    }
    let (ok, programs, tests) = transpile_all(out, dir, flags);
    if !tests && !has_rust_tests(dir) {
        let w = typeshi::Diag::warning("no tests found. the trenches are proud of you.", 0, 0, 1, "");
        eprint!("{}", w.render("", "", out.color));
    }
    st.set("last_programs", programs.len() as u64);
    if !ok {
        return false;
    }
    if flags.emit_only {
        return true;
    }
    let mut cmd = if dir.join("Anchor.toml").is_file() && on_path("anchor") {
        let mut c = Command::new("anchor");
        c.arg("build");
        if let Some(a) = &flags.arch {
            c.args(["--arch", a]);
        }
        if flags.tokenmaxx {
            c.args(["--", "--features", "no-log-ix-name"]);
        }
        c
    } else if dir.join("Cargo.toml").is_file() {
        if on_path("cargo-build-sbf") {
            let mut c = Command::new("cargo");
            c.arg("build-sbf");
            if let Some(a) = &flags.arch {
                c.args(["--arch", a]);
            }
            if flags.tokenmaxx {
                c.args(["--features", "no-log-ix-name"]);
            }
            c
        } else {
            let mut c = Command::new("cargo");
            c.arg("check");
            c
        }
    } else {
        out.say("no Anchor.toml or Cargo.toml here. transpiled only.");
        return true;
    };
    if flags.gigamaxx {
        cmd.env("CARGO_PROFILE_RELEASE_OPT_LEVEL", "3")
            .env("CARGO_PROFILE_RELEASE_LTO", "fat")
            .env("CARGO_PROFILE_RELEASE_CODEGEN_UNITS", "1")
            // overflow checks stay on. we're degens, not animals.
            .env("CARGO_PROFILE_RELEASE_OVERFLOW_CHECKS", "true");
    }
    cmd.current_dir(dir);
    match cmd.status() {
        Ok(s) => s.success(),
        Err(e) => {
            eprintln!("error: couldn't run the build: {e}");
            false
        }
    }
}

fn after_build(out: &Out, dir: &Path, ok: bool, st: &mut State) -> i32 {
    if ok {
        st.set("builds", st.get("builds") + 1);
        st.set("fail_streak", 0);
        let (secs, _) = now();
        let name = dir
            .canonicalize()
            .ok()
            .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string()))
            .unwrap_or_else(|| "your program".into());
        out.say(&banter::mcap_line(&name, secs));
        let cu = st.kv.get("cu").copied();
        out.say(&banter::cortisol_line(cu));
    } else {
        let streak = st.get("fail_streak") + 1;
        st.set("fail_streak", streak);
        st.set("fails_total", st.get("fails_total") + 1);
        eprintln!("{}", out.paint("1;31", banter::escalation(streak)));
    }
    out.verdict(ok)
}

// ---------------------------------------------------------------------------
// test

fn cmd_test(out: &Out, dir: &Path, flags: &Flags) -> i32 {
    out.header("typeshi test");
    let mut st = State::load(dir);
    let built = build(out, dir, flags, &mut st);
    if !built {
        let code = after_build(out, dir, false, &mut st);
        st.save(dir);
        return code;
    }
    st.set("builds", st.get("builds") + 1);
    st.set("fail_streak", 0);
    let mut child = match Command::new("cargo")
        .args(["test", "--", "--nocapture"])
        .current_dir(dir)
        .stdout(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("error: couldn't run cargo test: {e}");
            return NGMI;
        }
    };
    let (mut passed, mut failed) = (0u64, 0u64);
    let mut cu: Option<u64> = None;
    if let Some(so) = child.stdout.take() {
        let stdout = std::io::stdout();
        for line in BufReader::new(so).lines().map_while(Result::ok) {
            {
                let mut lock = stdout.lock();
                let _ = writeln!(lock, "{line}");
            }
            if let Some(rest) = line.strip_prefix("test result: ") {
                for part in rest.split(';') {
                    let p = part
                        .trim()
                        .trim_start_matches("ok.")
                        .trim_start_matches("FAILED.")
                        .trim();
                    if let Some(n) = p.strip_suffix(" passed").and_then(|n| n.trim().parse::<u64>().ok()) {
                        passed += n;
                    }
                    if let Some(n) = p.strip_suffix(" failed").and_then(|n| n.trim().parse::<u64>().ok()) {
                        failed += n;
                    }
                }
            }
            if let Some(n) = parse_cu(&line) {
                cu = Some(cu.map_or(n, |c: u64| c.max(n)));
            }
        }
    }
    let status = child.wait().map(|s| s.success()).unwrap_or(false);
    let first = st.get("test_runs") == 0;
    st.set("test_runs", st.get("test_runs") + 1);
    if let Some(c) = cu {
        st.set("cu", c);
        out.say(&banter::cortisol_line(Some(c)));
    }
    let ok = status && failed == 0;
    if passed + failed == 0 && status {
        let w = typeshi::Diag::warning("no tests found. the trenches are proud of you.", 0, 0, 1, "");
        eprint!("{}", w.render("", "", out.color));
    } else if !status && failed == 0 {
        out.say("the tests didn't even compile. it's so over.");
    } else {
        out.say(&banter::test_summary(passed, failed, first));
    }
    if !ok {
        let streak = st.get("fail_streak") + 1;
        st.set("fail_streak", streak);
        eprintln!("{}", out.paint("1;31", banter::escalation(streak)));
    }
    st.save(dir);
    out.verdict(ok)
}

/// "cortisol: 4,210 CU" or Solana's "consumed 4210 of 200000 compute units".
fn parse_cu(line: &str) -> Option<u64> {
    let digits = |s: &str| -> Option<u64> {
        let d: String = s
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == ',')
            .filter(|c| *c != ',')
            .collect();
        d.parse().ok()
    };
    if let Some(i) = line.find("cortisol: ") {
        return digits(&line[i + "cortisol: ".len()..]);
    }
    if let Some(i) = line.find(" consumed ") {
        if line.contains("compute units") {
            return digits(&line[i + " consumed ".len()..]);
        }
    }
    None
}

// ---------------------------------------------------------------------------
// expand, fud

fn cmd_expand(out: &Out, file: &Path, flags: &Flags) -> i32 {
    let src = match fs::read_to_string(file) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("error: can't read {}: {e}", file.display());
            return NGMI;
        }
    };
    let name = file
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let opts = typeshi::Options {
        strip_logs: flags.gigamaxx,
        source_name: name,
    };
    let shown = file.display().to_string();
    let color = out.color && std::io::stderr().is_terminal() || out.aura;
    match typeshi::transpile(&src, &opts) {
        Ok(o) => {
            for d in &o.diags {
                eprint!("{}", d.render(&shown, &src, color));
            }
            print!("{}", o.rust);
            WAGMI
        }
        Err(diags) => {
            for d in &diags {
                eprint!("{}", d.render(&shown, &src, color));
            }
            NGMI
        }
    }
}

fn cmd_fud(out: &Out, dir: &str) -> i32 {
    let mut files = vec![];
    find_shi(Path::new(dir), &mut files);
    let mut longest: Option<(String, usize)> = None;
    for f in files {
        if let Ok(src) = fs::read_to_string(&f) {
            if let Ok(o) = typeshi::transpile(&src, &typeshi::Options::default()) {
                for (n, l) in o.fns {
                    if longest.as_ref().map(|(_, m)| l > *m).unwrap_or(true) {
                        longest = Some((n, l));
                    }
                }
            }
        }
    }
    let (_, nanos) = now();
    out.say(&banter::fud(nanos, longest.as_ref().map(|(n, l)| (n.as_str(), *l))));
    WAGMI
}
