# Security

Report a vulnerability by email to desk@tickerz.com. Please don't open a public issue for it.

Say what you found, which version or commit, and how to reproduce it. A `.shi` file that shows the problem is the best report.

## In scope

- The compiler: a `.shi` that turns into Rust that does something other than what the keyword says, or something the README doesn't disclose.
- A check that should stop a build and doesn't: banned moves, `#[on_god]`, `lock_in fn`, the `// not financial advice` rule.
- The CLI: anything that reads or writes files it shouldn't, or runs commands it shouldn't.
- The release workflow and the binaries it publishes.

## Not in scope

- Bugs in your own program. typeshi compiles what you write.
- The confession macros doing what they confess. `vc_unlock!` minting 40% to the VC is the feature.
- Anchor, Solana, rustc or other dependencies. Report those upstream. If typeshi makes one worse, that is in scope.

## What happens next

We reply within 3 business days. We aim to ship a fix within 30 days and will tell you the plan if it takes longer. We credit you in the release notes unless you'd rather we didn't.

Supported: the latest release and `main`.
