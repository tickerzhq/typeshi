//! `typeshi new <name>`: a project that builds, with a test, in one command.
//!
//! The layout is the same as `examples/trenches`: an Anchor 1.2 workspace with
//! one program, written in typeshi, and a LiteSVM test that runs the compiled
//! program.

use std::path::PathBuf;

/// Why a name can't be a program name, or `None` if it can.
pub fn check_name(name: &str) -> Option<String> {
    let ok_chars = name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '-');
    if name.is_empty() || !ok_chars || !name.starts_with(|c: char| c.is_ascii_lowercase()) {
        return Some(format!(
            "`{name}` won't work. lowercase letters, digits, `_` or `-`, starting with a letter. e.g. `gm_counter`"
        ));
    }
    let program = program_name(name);
    if RESERVED.contains(&program.as_str()) {
        return Some(format!("`{name}` is a Rust keyword. pick a name, not a keyword"));
    }
    if program.ends_with('_') || program.contains("__") {
        return Some(format!("`{name}`: no trailing or doubled `_` or `-`, ser"));
    }
    None
}

/// The Rust name of the program: dashes become underscores.
pub fn program_name(name: &str) -> String {
    name.replace('-', "_")
}

const RESERVED: [&str; 40] = [
    "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false", "fn",
    "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "self", "static",
    "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while", "test", "core", "std",
];

/// Every file of a new project, as (path relative to the project dir, contents).
/// `program_id` goes into both `gm!(...)` and `Anchor.toml`.
pub fn files(name: &str, program_id: &str) -> Vec<(PathBuf, String)> {
    let program = program_name(name);
    let fill = |s: &str| s.replace("__NAME__", &program).replace("__ID__", program_id);
    let dir = PathBuf::from("programs").join(&program);
    vec![
        (PathBuf::from("Anchor.toml"), fill(ANCHOR_TOML)),
        (PathBuf::from("Cargo.toml"), fill(WORKSPACE_TOML)),
        (PathBuf::from(".gitignore"), fill(GITIGNORE)),
        (dir.join("Cargo.toml"), fill(PROGRAM_TOML)),
        (dir.join("src").join("lib.shi"), fill(LIB_SHI)),
        (dir.join("tests").join(format!("{program}.rs")), fill(TEST_RS)),
    ]
}

/// A fresh program id: 32 random bytes, base58. Fine for localnet and tests.
/// To deploy, use your program keypair's address instead (`anchor keys list`).
pub fn new_program_id() -> String {
    let mut bytes = [0u8; 32];
    let from_os = std::fs::File::open("/dev/urandom")
        .and_then(|mut f| std::io::Read::read_exact(&mut f, &mut bytes))
        .is_ok();
    if !from_os {
        let t = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        let mut seed = t.as_nanos() as u64 ^ (u64::from(std::process::id()) << 32);
        for chunk in bytes.chunks_mut(8) {
            seed = crate::banter::splitmix(seed);
            chunk.copy_from_slice(&seed.to_le_bytes()[..chunk.len()]);
        }
    }
    base58(&bytes)
}

/// Bitcoin-alphabet base58, the way Solana writes addresses.
pub fn base58(bytes: &[u8]) -> String {
    const ALPHABET: &[u8] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let zeros = bytes.iter().take_while(|b| **b == 0).count();
    let mut digits: Vec<u8> = vec![];
    for &b in &bytes[zeros..] {
        let mut carry = b as u32;
        for d in digits.iter_mut() {
            carry += (*d as u32) << 8;
            *d = (carry % 58) as u8;
            carry /= 58;
        }
        while carry > 0 {
            digits.push((carry % 58) as u8);
            carry /= 58;
        }
    }
    let mut out = "1".repeat(zeros);
    out.extend(digits.iter().rev().map(|d| ALPHABET[*d as usize] as char));
    out
}

const ANCHOR_TOML: &str = r#"[toolchain]

[features]
resolution = true
skip-lint = false

[programs.localnet]
__NAME__ = "__ID__"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "cargo test"

[hooks]
"#;

const WORKSPACE_TOML: &str = r#"[workspace]
members = ["programs/*"]
resolver = "2"

[workspace.package]
edition = "2021"
rust-version = "1.89.0"

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1

[profile.release.build-override]
opt-level = 3
incremental = false
codegen-units = 1
"#;

const GITIGNORE: &str = ".anchor
.DS_Store
target
**/*.rs.bk
node_modules
test-ledger
.yarn
.surfpool
";

const PROGRAM_TOML: &str = r#"[package]
name = "__NAME__"
version = "0.1.0"
description = "Written in typeshi. lock in fn."
edition.workspace = true
rust-version.workspace = true
publish = false

[lib]
crate-type = ["cdylib", "lib"]
name = "__NAME__"

[features]
default = []
cpi = ["no-entrypoint"]
no-entrypoint = []
no-log-ix-name = []
idl-build = ["anchor-lang/idl-build"]
anchor-debug = []
custom-heap = []
custom-panic = []

[dependencies]
anchor-lang = "1.2.0"

[dev-dependencies]
litesvm = "0.10.0"
solana-message = "3.0.1"
solana-transaction = "3.0.2"
solana-signer = "3.0.0"
solana-keypair = "3.0.1"

[lints.rust]
unexpected_cfgs = { level = "warn", check-cfg = ['cfg(target_os, values("solana"))'] }
"#;

const LIB_SHI: &str = r#"// __NAME__: your first typeshi program. lock in fn.
// `typeshi build` turns this into lib.rs, right next to it. don't edit lib.rs. nobody can edit it.

gm!("__ID__");

stealth_launch __NAME__ {
    /// one counter. counts gms, farms aura.
    frame Counter {
        cabal: Pubkey,
        gms: u64,
        aura: u64,
    }

    cap_table Launch {
        #[account(rent_free, payer = exit_liquidity, space = 8 + Counter::INIT_SPACE, seeds = [b"counter"], bump)]
        counter: Account<Counter>,
        exit_liquidity,
        system_program,
    }

    /// anyone can say gm, so the counter is `public`: typeshi refuses a write that no signer
    /// owns unless you say it's on purpose (SHI001).
    cap_table Gm {
        #[account(mut, public, seeds = [b"counter"], bump)]
        counter: Account<Counter>,
        anon,
    }

    /// make the counter. whoever launches it is the cabal.
    lock_in fn launch(ctx) -> W {
        mark_to_market!(counter.cabal = per_my_last_email!(exit_liquidity).key());
        probably_nothing!("gm. we're live.");
        were_so_back!()
    }

    /// say gm. number go up. anyone can.
    lock_in fn gm(ctx) -> W {
        number_go_up!(counter.gms);
        aura_farm!(counter.aura, 10);
        were_so_back!()
    }
}
"#;

const TEST_RS: &str = r#"//! Runs the compiled __NAME__ program in LiteSVM: launch, gm twice, check the count.
//! Needs target/deploy/__NAME__.so: `typeshi test --arch v1` builds it, then runs this.
//! Prints `cortisol: <n> CU` so `typeshi build` can rate your compute.

use {
    anchor_lang::{
        prelude::Pubkey, solana_program::instruction::Instruction, system_program, AccountDeserialize,
        InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn send(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> u64 {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();
    let out = svm.send_transaction(tx).unwrap_or_else(|e| panic!("{:?}", e.err));
    svm.expire_blockhash();
    out.compute_units_consumed
}

#[test]
fn gm_number_go_up() {
    let program_id = __NAME__::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();
    let so = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/__NAME__.so"));
    svm.add_program(program_id, so).unwrap();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();
    let counter = Pubkey::find_program_address(&[b"counter"], &program_id).0;

    let ix = Instruction::new_with_bytes(
        program_id,
        &__NAME__::instruction::Launch {}.data(),
        __NAME__::accounts::Launch { counter, exit_liquidity: payer.pubkey(), system_program: system_program::ID }
            .to_account_metas(None),
    );
    send(&mut svm, &payer, ix);

    let mut cu = 0;
    for _ in 0..2 {
        let ix = Instruction::new_with_bytes(
            program_id,
            &__NAME__::instruction::Gm {}.data(),
            __NAME__::accounts::Gm { counter, anon: payer.pubkey() }.to_account_metas(None),
        );
        cu = send(&mut svm, &payer, ix);
    }
    println!("cortisol: {cu} CU (one gm)");

    let acct = svm.get_account(&counter).unwrap();
    let c = __NAME__::Counter::try_deserialize(&mut &acct.data[..]).unwrap();
    assert_eq!((c.gms, c.aura, c.cabal), (2, 20, payer.pubkey()));
}
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base58_matches_solana() {
        // the system program is 32 zero bytes
        assert_eq!(base58(&[0u8; 32]), "11111111111111111111111111111111");
        assert_eq!(base58(&[0, 0, 1]), "112");
        assert_eq!(base58(b"hello world"), "StV1DL6CwTryKyV");
    }

    #[test]
    fn program_ids_look_like_addresses() {
        let id = new_program_id();
        assert!((32..=44).contains(&id.len()), "{id}");
        assert_ne!(id, new_program_id());
    }

    #[test]
    fn names() {
        assert_eq!(check_name("gm_counter"), None);
        assert_eq!(check_name("gm-counter"), None);
        assert_eq!(program_name("gm-counter"), "gm_counter");
        for bad in ["", "Gm", "1gm", "gm counter", "fn", "gm_", "gm--x", "über"] {
            assert!(check_name(bad).is_some(), "{bad}");
        }
    }
}
