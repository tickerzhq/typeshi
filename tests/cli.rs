//! The `typeshi` binary: new, check, and build with errors mapped to the `.shi`.

mod common;

use common::{find, fixture, resync, scratch};
use std::path::Path;
use std::process::{Command, Output};

fn typeshi(cwd: &Path, args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_typeshi"))
        .args(args)
        .current_dir(cwd)
        .env("NO_COLOR", "1")
        .output()
        .expect("run typeshi")
}

fn text(b: &[u8]) -> String {
    String::from_utf8_lossy(b).into_owned()
}

fn transpile(src: &str) -> typeshi::Output {
    typeshi::transpile(src, &typeshi::Options::default()).unwrap_or_else(|d| panic!("{d:?}"))
}

#[test]
fn new_scaffolds_a_project_that_checks_out() {
    let tmp = scratch("new");
    let o = typeshi(&tmp, &["new", "gm-app"]);
    assert!(o.status.success(), "{}{}", text(&o.stdout), text(&o.stderr));
    assert!(text(&o.stdout).contains("stealth launched gm-app/"));

    let p = tmp.join("gm-app");
    for f in [
        "Anchor.toml",
        "Cargo.toml",
        ".gitignore",
        "programs/gm_app/Cargo.toml",
        "programs/gm_app/src/lib.shi",
        "programs/gm_app/src/lib.rs",
        "programs/gm_app/tests/gm_app.rs",
    ] {
        assert!(p.join(f).is_file(), "missing {f}");
    }
    let shi = std::fs::read_to_string(p.join("programs/gm_app/src/lib.shi")).unwrap();
    let rs = std::fs::read_to_string(p.join("programs/gm_app/src/lib.rs")).unwrap();
    let out = transpile(&shi);
    assert_eq!(out.rust, rs, "lib.rs is what lib.shi compiles to");
    assert!(out.diags.is_empty(), "{:?}", out.diags);
    assert_eq!(out.program.as_deref(), Some("gm_app"));

    // one program id, in both places
    let id = shi.split("gm!(\"").nth(1).unwrap().split('"').next().unwrap();
    let anchor = std::fs::read_to_string(p.join("Anchor.toml")).unwrap();
    assert!(anchor.contains(&format!("gm_app = \"{id}\"")), "{anchor}");
    let test = std::fs::read_to_string(p.join("programs/gm_app/tests/gm_app.rs")).unwrap();
    assert!(test.contains("gm_app::instruction::Gm"), "{test}");

    let c = typeshi(&p, &["check", "--locked"]);
    assert!(c.status.success(), "{}{}", text(&c.stdout), text(&c.stderr));
    assert!(text(&c.stdout).contains("checked 1 file. 0 errors, 0 warnings."));

    // no rugging an existing project, no names Rust can't use
    assert!(!typeshi(&tmp, &["new", "gm-app"]).status.success());
    for bad in ["GmApp", "fn", "9lives"] {
        let o = typeshi(&tmp, &["new", bad]);
        assert!(!o.status.success(), "{bad}");
        assert!(text(&o.stderr).contains("error:"), "{bad}");
    }
}

#[test]
fn check_fails_on_a_banned_move() {
    let tmp = scratch("check-rug");
    std::fs::write(tmp.join("lib.shi"), fixture("rug.shi")).unwrap();
    let o = typeshi(&tmp, &["check"]);
    assert_eq!(o.status.code(), Some(1));
    let err = text(&o.stderr);
    assert!(err.contains("error: not on our watch, anon"), "{err}");
    assert!(err.contains(" --> lib.shi:13:9"), "{err}");
    assert!(err.contains("warning: no tests found."), "{err}");
    assert!(text(&o.stdout).contains("checked 1 file. 1 error, 1 warning."));
    assert!(text(&o.stdout).contains("ngmi"));
    assert!(!tmp.join("lib.rs").exists(), "check writes nothing");
}

#[test]
fn check_takes_a_single_file() {
    let tmp = scratch("check-one");
    std::fs::write(tmp.join("rug.shi"), fixture("rug.shi")).unwrap();
    std::fs::write(tmp.join("other.shi"), "this is not typeshi").unwrap();
    let o = typeshi(&tmp, &["check", "rug.shi"]);
    assert_eq!(o.status.code(), Some(1));
    let err = text(&o.stderr);
    assert!(err.contains(" --> rug.shi:13:9"), "{err}");
    assert!(!err.contains("no tests found"), "one file is not a project: {err}");
    assert!(
        text(&o.stdout).contains("checked 1 file. 1 error, 0 warnings."),
        "{}",
        text(&o.stdout)
    );
}

#[test]
fn check_json_is_one_object_per_line() {
    let tmp = scratch("check-json");
    std::fs::write(tmp.join("lib.shi"), fixture("rug.shi")).unwrap();
    std::fs::write(tmp.join("warnings.shi"), fixture("warnings.shi")).unwrap();
    let o = typeshi(&tmp, &["check", "--json"]);
    assert_eq!(o.status.code(), Some(1));
    assert_eq!(text(&o.stderr), "", "--json keeps stderr quiet");
    let rows: Vec<serde_json::Value> = text(&o.stdout)
        .lines()
        .map(|l| serde_json::from_str(l).unwrap_or_else(|e| panic!("{e}: {l}")))
        .collect();
    let rug = &rows[0];
    assert_eq!(rug["severity"], "error");
    assert_eq!(rug["message"], "not on our watch, anon");
    assert_eq!(rug["label"], "`rug!` is a banned move");
    assert_eq!(rug["file"], "lib.shi");
    assert_eq!((rug["line"].as_u64(), rug["column"].as_u64()), (Some(13), Some(9)));
    assert_eq!(rug["end_column"].as_u64(), Some(13));
    assert!(rows
        .iter()
        .any(|r| r["message"] == "you trusted the dev. classic." && r["severity"] == "warning"));
    let none = rows.iter().find(|r| r["file"].is_null()).expect("the no-tests warning");
    assert!(none["line"].is_null());
}

#[test]
fn check_locked_catches_a_stale_rs() {
    let tmp = scratch("check-locked");
    assert!(typeshi(&tmp, &["new", "desk"]).status.success());
    let p = tmp.join("desk");
    let rs = p.join("programs/desk/src/lib.rs");
    let good = std::fs::read_to_string(&rs).unwrap();
    std::fs::write(&rs, good.replace("Ok(())", "Ok(()) // gm")).unwrap();

    let o = typeshi(&p, &["check", "--locked"]);
    assert_eq!(o.status.code(), Some(1));
    let err = text(&o.stderr);
    assert!(err.contains("`programs/desk/src/lib.rs` is stale."), "{err}");
    assert!(err.contains("nobody can edit it."), "{err}");
    assert!(
        typeshi(&p, &["check"]).status.success(),
        "without --locked, stale is fine"
    );

    std::fs::remove_file(&rs).unwrap();
    let o = typeshi(&p, &["check", "--locked"]);
    assert!(text(&o.stderr).contains("is missing"), "{}", text(&o.stderr));
}

/// `anchor build` fails with real rustc output (captured from a `cargo check` of
/// tests/fixtures/rustc/gm_counter.shi). typeshi passes it through and points
/// each error at the .shi. A stand-in `anchor` on PATH replays that output.
#[cfg(unix)]
#[test]
fn build_points_rustc_errors_at_the_shi() {
    use std::os::unix::fs::PermissionsExt;

    let tmp = scratch("build-maps");
    assert!(typeshi(&tmp, &["new", "gm_counter"]).status.success());
    let p = tmp.join("gm_counter");
    let src = fixture("rustc/gm_counter.shi");
    std::fs::write(p.join("programs/gm_counter/src/lib.shi"), &src).unwrap();
    let stderr = resync(&fixture("rustc/cargo_check.stderr"), &transpile(&src).rust);
    std::fs::write(tmp.join("rustc.stderr"), stderr).unwrap();

    let bin = tmp.join("bin");
    std::fs::create_dir_all(&bin).unwrap();
    let anchor = bin.join("anchor");
    std::fs::write(
        &anchor,
        "#!/bin/sh\ncat \"$(dirname \"$0\")/../rustc.stderr\" >&2\nexit 1\n",
    )
    .unwrap();
    std::fs::set_permissions(&anchor, std::fs::Permissions::from_mode(0o755)).unwrap();
    let path = format!("{}:{}", bin.display(), std::env::var("PATH").unwrap_or_default());

    let o = Command::new(env!("CARGO_BIN_EXE_typeshi"))
        .args(["build"])
        .current_dir(&p)
        .env("NO_COLOR", "1")
        .env("PATH", path)
        .output()
        .unwrap();
    assert_eq!(o.status.code(), Some(1));
    let err = text(&o.stderr);
    let (l, c) = find(&src, "\"lots\"");
    for want in [
        "error[E0308]: mismatched types\n  --> programs/gm_counter/src/lib.rs:".to_string(),
        format!(
            "error[E0308]: mismatched types\n  --> programs/gm_counter/src/lib.shi:{l}:{}",
            c + 1
        ),
        "^^^^^^ expected `u64`, found `&str`".to_string(),
        "error: could not compile `gm_counter` (lib) due to 3 previous errors".to_string(),
        "skill issue.".to_string(),
    ] {
        assert!(err.contains(&want), "missing `{want}` in:\n{err}");
    }
    assert_eq!(err.matches("lib.shi:").count(), 3, "{err}");
    assert!(text(&o.stdout).contains("ngmi"));
}
