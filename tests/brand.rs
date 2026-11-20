//! The social preview and the README header show real compiler output (brand/make.mjs draws them from
//! `typeshi check` on tests/fixtures/rug.shi). If the compiler's words change, this fails until the pictures
//! are drawn again, so they never show a message typeshi no longer prints.
mod common;

use std::process::Command;

#[test]
fn brand_pictures_show_what_the_compiler_says_today() {
    // The published crate leaves brand/ out; there is nothing to check there.
    let Ok(drawn) = std::fs::read_to_string(common::root().join("brand/preview.txt")) else {
        return;
    };
    let dir = common::scratch("brand");
    std::fs::write(dir.join("rug.shi"), common::fixture("rug.shi")).unwrap();
    let out = Command::new(env!("CARGO_BIN_EXE_typeshi"))
        .arg("check")
        .arg(&dir)
        .output()
        .unwrap();
    let stderr = String::from_utf8_lossy(&out.stderr);
    let stdout = String::from_utf8_lossy(&out.stdout);

    let mut lines: Vec<&str> = stderr.lines().take_while(|l| !l.is_empty()).collect();
    lines.push(stdout.trim().lines().last().unwrap_or_default());
    let today = lines.join("\n") + "\n";

    assert_eq!(
        drawn, today,
        "the brand pictures show old compiler output. redraw them: cargo build --release && node brand/make.mjs"
    );
}
