//! # typeshi
//!
//! lock in fn.
//!
//! A slang layer over Rust that compiles to real Solana programs. You write
//! `.shi`, `typeshi build` turns it into plain Anchor Rust, and `anchor build`
//! does the rest. Made by Tickerz (tickerz.com): everything gets a ticker.
//! Nobody can edit it.
//!
//! ```
//! let src = r#"
//!     gm!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
//!     stealth_launch gm_program {
//!         frame Counter { n: u64 }
//!         cap_table Bump {
//!             #[account(mut)]
//!             counter: Account<Counter>,
//!         }
//!         lock_in fn bump(ctx) -> W {
//!             number_go_up!(counter.n);
//!             were_so_back!()
//!         }
//!     }
//! "#;
//! let out = typeshi::transpile(src, &typeshi::Options::default()).unwrap();
//! assert!(out.rust.contains("pub fn bump(ctx: Context<Bump>) -> Result<()>"));
//! assert_eq!(typeshi::wen_moon(), "soon\u{2122}");
//! ```

pub mod banter;
pub mod diag;
pub mod transpile;

pub use diag::{Diag, Level};
pub use transpile::{transpile, Options, Output, BANNED, FIXED_ERRORS};

/// wen moon?
pub fn wen_moon() -> &'static str {
    "soon\u{2122}"
}
