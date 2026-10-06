use typeshi::{banter, transpile, Diag, Level, Options};

const ID: &str = "gm!(\"7PxhmDuhhe394QJgKyW1P7Ce4dPCfFPN2yKq4KCCj7Vj\");";

fn ok(src: &str) -> typeshi::Output {
    match transpile(src, &Options::default()) {
        Ok(o) => o,
        Err(d) => panic!("expected wagmi, got ngmi:\n{}", render(&d, src)),
    }
}

fn ngmi(src: &str) -> Vec<Diag> {
    match transpile(src, &Options::default()) {
        Ok(o) => panic!("expected ngmi, got wagmi:\n{}", o.rust),
        Err(d) => d,
    }
}

fn render(d: &[Diag], src: &str) -> String {
    d.iter().map(|x| x.render("test.shi", src, false)).collect()
}

fn errors(d: &[Diag]) -> Vec<String> {
    d.iter()
        .filter(|x| x.level == Level::Error)
        .map(|x| x.msg.clone())
        .collect()
}

fn fixture(name: &str) -> String {
    let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(name);
    std::fs::read_to_string(p).expect("fixture")
}

/// A one-instruction program around `body`, with an Account<Thing> called `thing`.
fn program(body: &str) -> String {
    format!(
        "{ID}
        stealth_launch p {{
            frame Thing {{ n: u64, flag: bool, key: Pubkey }}
            cap_table Go {{
                #[account(mut)]
                thing: Account<Thing>,
                ser,
                kol,
                system_program,
            }}
            lock_in fn go(ctx, x: u64) -> W {{
                {body}
                were_so_back!()
            }}
        }}"
    )
}

/// Whitespace-insensitive contains: macro bodies keep token spacing, prettyplease reformats the rest.
fn has(haystack: &str, needle: &str) -> bool {
    let tight = |s: &str| s.chars().filter(|c| !c.is_whitespace()).collect::<String>();
    tight(haystack).contains(&tight(needle))
}

fn squash(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[test]
fn lock_in_fn_is_an_instruction() {
    let o = ok(&program("mark_to_market!(thing.n = x);"));
    let r = squash(&o.rust);
    assert!(has(&r, "#[program] pub mod p {"), "{r}");
    assert!(has(&r, "pub fn go(ctx: Context<Go>, x: u64) -> Result<()>"), "{r}");
    assert!(has(&r, "ctx.accounts.thing.n = x;"), "{r}");
    assert!(has(&r, "declare_id!(\"7PxhmDuhhe394QJgKyW1P7Ce4dPCfFPN2yKq4KCCj7Vj\")"));
    assert!(has(&r, "pub struct Go<'info>"));
    assert!(has(&r, "pub thing: Account<'info, Thing>"));
    assert!(has(&r, "#[account(mut)] pub ser: Signer<'info>"));
    assert!(has(&r, "pub system_program: Program<'info, System>"));
    assert_eq!(o.program.as_deref(), Some("p"));
}

#[test]
fn w_and_l() {
    let o = ok(&format!(
        "{ID} fn a() -> W {{ L(\"nobody can edit it. skill issue.\") }}
         fn b() -> W<u64> {{ were_so_back!(1) }}
         fn c() -> ebitda {{ L() }}"
    ));
    let r = squash(&o.rust);
    assert!(
        has(&r, "fn a() -> Result<()> { err!(Cope::NobodyCanEditItSkillIssue) }"),
        "{r}"
    );
    assert!(has(&r, "fn b() -> Result<u64> { Ok(1) }"), "{r}");
    assert!(has(&r, "fn c() -> Result<()> { err!(Cope::SkillIssue) }"), "{r}");
}

#[test]
fn error_codes_start_at_0x1_and_are_tradition() {
    let o = ok(&format!("{ID} fn a() -> W {{ L(\"custom\") }}"));
    let r = squash(&o.rust);
    assert!(has(&r, "#[error_code(offset = 1)] pub enum Cope {"), "{r}");
    let order = [
        "skill issue",
        "you are exit liquidity",
        "funds are not safu",
        "dev is on vacation",
        "rugged by a 19 year old",
        "wife changing money not found",
        "custom",
    ];
    let mut at = 0;
    for m in order {
        let i = r[at..]
            .find(&format!("#[msg(\"{m}\")]"))
            .unwrap_or_else(|| panic!("{m} missing or out of order"));
        at += i + 1;
    }
}

#[test]
fn slang_operators() {
    let o = ok(&format!(
        "{ID} fn a(x: u64) -> bool {{ bull x mogs 1 {{ diamond_hands }} bear {{ paper_hands }} }}"
    ));
    assert!(
        squash(&o.rust).contains("if x > 1 { true } else { false }"),
        "{}",
        o.rust
    );
}

#[test]
fn asserts_and_defaults() {
    let o = ok(&program(
        "trust_me_bro!(x mogs 0);
         funds_are_safu!(x < 10);
         margin_call!(x == 7);
         wen!(x);
         hodl!(x);
         touch_grass!(x);
         fren!(ser.key() in [Pubkey::default()]);",
    ));
    let r = squash(&o.rust);
    assert!(has(&r, "require!(x > 0, Cope::PerMyLastEmailNo)"), "{r}");
    assert!(has(&r, "require!(x < 10, Cope::FundsAreNotSafu)"), "{r}");
    assert!(has(&r, "require!(!(x == 7), Cope::YouAreExitLiquidity)"), "{r}");
    assert!(
        has(&r, "Clock::get()?.unix_timestamp >= (x) as i64, Cope::DevIsOnVacation"),
        "{r}"
    );
    assert!(
        has(&r, "Clock::get()?.unix_timestamp <= (x) as i64, Cope::NgmiTouchGrass"),
        "{r}"
    );
    assert!(has(&r, "Cope::NpcDetectedNotAFren"), "{r}");
    assert!(has(&r, "#[msg(\"per my last email, no.\")]"), "{r}");
    assert!(has(&r, "#[msg(\"ngmi. touch grass.\")]"), "{r}");
}

#[test]
fn cuz_and_paths() {
    let o = ok(&program(
        "trust_me_bro!(x mogs 0, cuz \"zero? ser.\"); funds_are_safu!(x < 9, Cope::SkillIssue);",
    ));
    let r = squash(&o.rust);
    assert!(has(&r, "Cope::ZeroSer"), "{r}");
    assert!(has(&r, "require!(x < 9, Cope::SkillIssue)"), "{r}");
}

#[test]
fn cap_table_puns_are_real_anchor() {
    let src = format!(
        "{ID} stealth_launch p {{
            frame Thing {{ n: u64 }}
            cap_table Open {{
                #[account(rent_free, payer = exit_liquidity, space = 8 + Thing::INIT_SPACE)]
                thing: Account<Thing>,
                exit_liquidity,
                system_program,
            }}
            cap_table Close {{
                #[account(mut, golden_parachute = cabal)]
                thing: Account<Thing>,
                #[account(mut)]
                cabal,
            }}
            cap_table Grow {{
                #[account(mut, graduate = 64)]
                thing: Account<Thing>,
                exit_liquidity,
                system_program,
            }}
            lock_in fn open(ctx) -> W {{ were_so_back!() }}
            lock_in fn close(ctx) -> W {{ were_so_back!() }}
            lock_in fn grow(ctx) -> W {{ were_so_back!() }}
        }}"
    );
    let r = squash(&ok(&src).rust);
    assert!(
        has(
            &r,
            "#[account(init, payer = exit_liquidity, space = 8 + Thing::INIT_SPACE)]"
        ),
        "{r}"
    );
    assert!(has(&r, "#[account(mut, close = cabal)]"), "{r}");
    assert!(
        has(
            &r,
            "realloc = 64, realloc::payer = exit_liquidity, realloc::zero = false"
        ),
        "{r}"
    );
    assert!(has(&r, "#[account(mut)] pub cabal: Signer<'info>"), "{r}");
}

#[test]
fn state_macros() {
    let o = ok(&program(
        "let a = per_my_last_email!(thing.n);
         number_go_up!(thing.n);
         number_go_up!(thing.n, 5);
         aura_farm!(thing.n, 10);
         ascend!(thing.n);
         let b = bags!(ser);
         hostile_takeover!(thing.key => Pubkey::default());",
    ));
    let r = squash(&o.rust);
    assert!(has(&r, "let a = ctx.accounts.thing.n;"), "{r}");
    assert!(has(&r, "checked_add(1)"), "{r}");
    assert!(has(&r, "checked_add(5)"), "{r}");
    assert!(has(&r, "+{} aura"), "{r}");
    assert!(has(&r, "ascended. layout v{}"), "{r}");
    assert!(has(&r, "ctx.accounts.ser.to_account_info().lamports()"), "{r}");
    assert!(
        has(&r, "hostile takeover complete. new management, same roadmap."),
        "{r}"
    );
}

#[test]
fn confession_macros_do_what_they_confess() {
    let o = ok(&program(
        "airdrop!();
         audit!(by = \"vibes\");
         let v: u64 = bullish!(Err::<u64, ProgramError>(ProgramError::Custom(1)));
         trust_the_dev!(x mogs 0);
         sell_the_bottom!(x, 1, { mew!(); });
         buy_the_top!(x, 100, { mew!(); });
         probably_nothing!(\"gm\");",
    ));
    let r = squash(&o.rust);
    assert!(
        has(&r, "points are not a token. points will never be a token. wen token?"),
        "{r}"
    );
    assert!(has(&r, "audited by vibes. passed."), "{r}");
    assert!(has(&r, "this is actually bullish"), "{r}");
    assert!(has(&r, "if (x) <= (1)"), "{r}");
    assert!(has(&r, "if (x) >= (100)"), "{r}");
    assert!(has(&r, "msg!(\"gm\")"), "{r}");
    let w: Vec<_> = o
        .diags
        .iter()
        .filter(|d| d.level == Level::Warning)
        .map(|d| d.msg.as_str())
        .collect();
    assert!(w.contains(&"you trusted the dev. classic."), "{w:?}");
}

#[test]
fn money_moves_need_a_disclaimer() {
    let d = ngmi(&fixture("no_disclaimer.shi"));
    assert_eq!(
        errors(&d),
        vec!["`promote` moves money and never says `// not financial advice`.".to_string()]
    );
    let fixed =
        fixture("no_disclaimer.shi").replace("lock_in fn promote", "// not financial advice\n    lock_in fn promote");
    let r = squash(&ok(&fixed).rust);
    assert!(has(&r, "#ad not financial advice"), "{r}");
    assert!(has(&r, "anchor_lang::system_program::transfer"), "{r}");
    assert!(has(&r, "Cope::WifeChangingMoneyNotFound"), "{r}");
}

#[test]
fn banned_moves_refuse_to_compile() {
    for (name, joke) in typeshi::BANNED {
        let d = ngmi(&program(&format!("{name}!(thing);")));
        assert_eq!(errors(&d), vec![joke.to_string()], "{name}");
    }
    let d = ngmi(&fixture("rug.shi"));
    let r = render(&d, &fixture("rug.shi"));
    assert!(has(&r, "error: not on our watch, anon"), "{r}");
    assert!(has(&r, "^^^^ `rug!` is a banned move"), "{r}");
    let d = ngmi(&fixture("friday.shi"));
    assert_eq!(
        errors(&d),
        vec!["absolutely not.", "the feds are monitoring the situation"]
    );
}

#[test]
fn nobody_can_edit_it() {
    let d = ngmi(&fixture("edit_a_print.shi"));
    let e = errors(&d);
    assert_eq!(e.len(), 2, "{e:?}");
    assert!(
        e.iter().all(|m| m == "you tried to edit a print. nobody can edit it."),
        "{e:?}"
    );
}

#[test]
fn lock_in_means_it_writes() {
    let src = format!(
        "{ID} stealth_launch p {{
            frame Thing {{ n: u64 }}
            cap_table Look {{ thing: Account<Thing> }}
            lock_in fn look(ctx) -> W {{ were_so_back!() }}
        }}"
    );
    assert_eq!(
        errors(&ngmi(&src)),
        vec!["`lock_in fn look` writes nothing. you are not locked in."]
    );
    ok(&src.replace("lock_in fn look", "ape fn look"));
}

#[test]
fn revenue_as_is_tradition() {
    let o = ok(&format!(
        "{ID} fn a(revenue: u64) -> u64 {{ 0 }} fn b(revenue: u64) -> u64 {{ revenue }}"
    ));
    let w: Vec<_> = o.diags.iter().map(|d| d.msg.as_str()).collect();
    assert_eq!(w, vec!["unused variable `revenue`. as is tradition."]);
}

#[test]
fn tokenmaxx_strips_logs_and_keeps_events() {
    let src = format!(
        "{ID} stealth_launch p {{
            frame Thing {{ n: u64 }}
            alpha_leak Leak {{ n: u64 }}
            cap_table Go {{ #[account(mut)] thing: Account<Thing> }}
            #[tokenmaxx]
            lock_in fn go(ctx) -> W {{
                probably_nothing!(\"expensive\");
                msg!(\"also expensive\");
                probably_nothing!(Leak {{ n: 1 }});
                were_so_back!()
            }}
        }}"
    );
    let r = squash(&ok(&src).rust);
    assert!(!has(&r, "expensive"), "{r}");
    assert!(has(&r, "emit!(Leak { n: 1 })"), "{r}");
    let all = transpile(
        &src.replace("#[tokenmaxx]", ""),
        &Options {
            strip_logs: true,
            ..Options::default()
        },
    )
    .unwrap();
    assert!(!all.rust.contains("expensive"));
}

#[test]
fn vc_backed_locks_for_four_years() {
    let src = format!(
        "{ID} stealth_launch p {{
            frame Thing {{ n: u64 }}
            cap_table Go {{ #[account(mut)] thing: Account<Thing> }}
            #[vc_backed]
            lock_in fn go(ctx) -> W {{ were_so_back!() }}
        }}"
    );
    let r = squash(&ok(&src).rust);
    // 2026-01-01 + 4 years = 2030-01-01 00:00:00 UTC
    assert!(has(&r, "Clock::get()?.unix_timestamp >= 1893456000i64"), "{r}");
    assert!(has(&r, "it is also slower"), "{r}");
    let r = squash(&ok(&src.replace("#[vc_backed]", "#[vc_backed(since = 0)]")).rust);
    assert!(has(&r, ">= 126230400i64"), "{r}");
}

#[test]
fn frames_and_aliases() {
    let src = format!(
        "{ID} type_shi Ticker = [u8; 8];
         #[on_god] const MAX: Bps = 10;
         deadass MIN: u64 = 1;
         frame Feed {{ ticker: Ticker, n: Bps }}"
    );
    let r = squash(&ok(&src).rust);
    assert!(has(&r, "pub type Ticker = [u8; 8];"), "{r}");
    assert!(has(&r, "pub const MAX: Bps = 10;"), "{r}");
    assert!(has(&r, "pub const MIN: u64 = 1;"), "{r}");
    assert!(has(&r, "pub ticker: [u8; 8]"), "{r}");
    assert!(has(&r, "pub type Bps = u64;"), "{r}");
    assert!(has(&r, "#[account] #[derive(InitSpace)] pub struct Feed"), "{r}");
}

#[test]
fn helpers_are_emitted_on_use() {
    let o = ok(&format!(
        "{ID} fn a() -> W<u64> {{ let f = bps!(100, 250); let p = bonding_curve!(1, 2, 3); let s = looksmaxx!(f + p); let m = wen_moon(); were_so_back!(f) }}"
    ));
    let r = squash(&o.rust);
    for h in [
        "fn __typeshi_bps",
        "fn __typeshi_bonding_curve",
        "fn __typeshi_looksmaxx",
        "pub fn wen_moon",
    ] {
        assert!(has(&r, h), "{h}: {r}");
    }
    assert!(has(&r, "\"soon\u{2122}\""), "{r}");
}

#[test]
fn this_is_fine_is_the_panic_handler() {
    let r = ok(&format!("{ID} this_is_fine!();")).rust;
    assert!(has(&r, "fn custom_panic(info: &core::panic::PanicInfo<'_>)"), "{r}");
    assert!(has(&r, "feature = \"custom-panic\""), "{r}");
}

#[test]
fn diagnostics_look_like_rustc() {
    let src = fixture("rug.shi");
    let d = ngmi(&src);
    let r = render(&d, &src);
    assert!(has(&r, " --> test.shi:13:9"), "{r}");
    assert!(has(&r, "13 |         rug!(pool);"), "{r}");
}

#[test]
fn banter() {
    assert_eq!(banter::escalation(1), "skill issue.");
    assert_eq!(banter::escalation(5), "ser, this is a Wendy's.");
    assert_eq!(banter::escalation(99), "ser, this is a Wendy's.");
    assert_eq!(banter::test_summary(3, 0, false), "3 passed, 0 failed. bullish.");
    assert_eq!(banter::test_summary(3, 2, false), "2 failed. it's so over.");
    assert_eq!(
        banter::test_summary(3, 0, true),
        "all tests passed on the first try. this is a honeypot."
    );
    assert_eq!(banter::cortisol_line(Some(4_200)), "cortisol: 4,200 CU. goated.");
    assert_eq!(banter::cortisol_line(Some(42_000)), "cortisol: 42,000 CU. mid.");
    assert_eq!(banter::cortisol_line(Some(420_000)), "cortisol: 420,000 CU. it's over.");
    assert_eq!(banter::mcap_line("x", 1), banter::mcap_line("x", 1));
    assert!(banter::mcap_line("x", 1).contains("since you started typing"));
    assert_eq!(banter::parse_leverage("100x"), Some(100));
    let hits = (0..100_000u64).filter(|s| banter::liquidated(100, *s)).count();
    assert!(
        (700..1300).contains(&hits),
        "100x should liquidate about 1% of the time, got {hits}"
    );
    assert_eq!(typeshi::wen_moon(), "soon\u{2122}");
}

#[test]
fn examples_are_in_sync() {
    // the generated .rs files in examples/ must match what the compiler produces today
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("examples/trenches/programs");
    let Ok(rd) = std::fs::read_dir(&root) else { return };
    for e in rd.flatten() {
        let shi = e.path().join("src/lib.shi");
        let Ok(src) = std::fs::read_to_string(&shi) else {
            continue;
        };
        let o = ok(&src);
        let committed = std::fs::read_to_string(e.path().join("src/lib.rs")).unwrap_or_default();
        assert_eq!(
            o.rust,
            committed,
            "{} is stale. run `typeshi build examples/trenches --emit-only`",
            shi.display()
        );
    }
}

#[test]
fn gigamaxx_examples_still_parse() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("examples/trenches/programs");
    let Ok(rd) = std::fs::read_dir(&root) else { return };
    for e in rd.flatten() {
        let Ok(src) = std::fs::read_to_string(e.path().join("src/lib.shi")) else {
            continue;
        };
        let o = transpile(
            &src,
            &Options {
                strip_logs: true,
                ..Options::default()
            },
        );
        assert!(
            o.is_ok(),
            "{}: {:?}",
            e.path().display(),
            o.err().map(|d| render(&d, &src))
        );
    }
}
