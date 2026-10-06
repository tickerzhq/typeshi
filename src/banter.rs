//! Everything the CLI says that isn't a compiler error. Deterministic where it
//! matters (tests), random where it's funnier (fud).

pub const VESTING: &str = "your build is vesting. 6-month cliff. come back later.";
pub const VESTING_ANYWAY: &str = "(jk. building anyway.)";

/// Repeated build failures escalate. State lives in `target/typeshi/state`.
pub const ESCALATION: [&str; 5] = [
    "skill issue.",
    "have you tried turning your strategy off.",
    "even the bots are laughing.",
    "have you considered a career in sales.",
    "ser, this is a Wendy's.",
];

pub fn escalation(fail_streak: u64) -> &'static str {
    let i = fail_streak.saturating_sub(1).min(ESCALATION.len() as u64 - 1) as usize;
    ESCALATION[i]
}

/// `typeshi --fud`: self-roasts. Targets: VCs, KOLs, farmers, insiders, the SEC as an institution, and us.
pub const FUD: [&str; 18] = [
    "anon, why is this function 400 lines. team is hiding something.",
    "no tests, no audit, no docs. the roadmap is a vibe and the vibe is bearish.",
    "this codebase has more TODOs than holders.",
    "the error handling is a prayer to the validator.",
    "dev wallet holds 94% of the comments.",
    "the commit history reads like a liquidation cascade.",
    "roadmap: Q1 tests. Q2 tests. Q3 tests. Q4 we circle back on tests.",
    "the only thing this code locked in is the tech debt.",
    "a VC would fund this. that is not a compliment.",
    "airdrop farmers have better uptime than this build.",
    "the SEC reviewed this program and decided it is not a security. it is a cry for help.",
    "insiders already know this fn panics. now you do too.",
    "this match statement has more arms than a market maker.",
    "a KOL called this code 'generational'. he was paid in this code.",
    "variable names chosen by a points program. every one of them is `x`.",
    "your unwraps are doing more leverage than your trades.",
    "this program's compute budget is bigger than its user count.",
    "we wrote the compiler. we are in no position to judge. still.",
];

/// Cortisol verdict for a compute-unit count.
pub fn cortisol_verdict(cu: u64) -> &'static str {
    match cu {
        0..=5_000 => "goated",
        5_001..=50_000 => "mid",
        _ => "it's over",
    }
}

pub fn cortisol_line(cu: Option<u64>) -> String {
    match cu {
        Some(cu) => format!("cortisol: {} CU. {}.", group_digits(cu), cortisol_verdict(cu)),
        None => "cortisol: unmeasured. run `typeshi test` with a test that prints `cortisol: <n> CU`. mid.".into(),
    }
}

pub fn test_summary(passed: u64, failed: u64, first_ever_run: bool) -> String {
    if failed > 0 {
        format!("{failed} failed. it's so over.")
    } else if first_ever_run {
        "all tests passed on the first try. this is a honeypot.".into()
    } else {
        format!("{passed} passed, 0 failed. bullish.")
    }
}

/// A fake market cap, deterministic in the build time.
pub fn mcap_line(program: &str, build_unix: u64) -> String {
    let h = splitmix(build_unix);
    let down = 50 + h % 50;
    let mcap = 1_000 + (h >> 16) % 99_000_000;
    format!(
        "{program}: mcap ${}. your program is down {down}% since you started typing.",
        compact(mcap)
    )
}

/// Max leverage, like every exchange that ever blew up.
pub const MAX_LEVERAGE: u64 = 125;

/// Parse "100x" / "100" into 100.
pub fn parse_leverage(s: &str) -> Option<u64> {
    let n: u64 = s.trim().trim_end_matches(['x', 'X']).parse().ok()?;
    if n == 0 {
        None
    } else {
        Some(n)
    }
}

/// Liquidation odds: leverage in 10,000. 100x is a 1-in-100 chance. Opt-in only.
pub fn liquidated(leverage: u64, seed: u64) -> bool {
    splitmix(seed) % 10_000 < leverage
}

pub fn fud(seed: u64, longest_fn: Option<(&str, usize)>) -> String {
    let h = splitmix(seed);
    if let Some((name, lines)) = longest_fn {
        if h % 3 == 0 && lines > 1 {
            return format!("anon, why is `{name}` {lines} lines. team is hiding something.");
        }
    }
    FUD[(h % FUD.len() as u64) as usize].to_string()
}

pub fn splitmix(seed: u64) -> u64 {
    let mut z = seed.wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

/// 1234567 -> "1.23M"
pub fn compact(n: u64) -> String {
    for (size, unit) in [
        (1_000_000_000_000u64, "T"),
        (1_000_000_000, "B"),
        (1_000_000, "M"),
        (1_000, "k"),
    ] {
        if n >= size {
            let whole = n / size;
            let cents = (n % size) * 100 / size;
            return if cents == 0 {
                format!("{whole}{unit}")
            } else {
                format!("{whole}.{cents:02}{unit}")
            };
        }
    }
    n.to_string()
}

pub fn group_digits(n: u64) -> String {
    let s = n.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    out
}
