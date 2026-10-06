//! Runs the compiled print_feed program in LiteSVM: list a ticker, print twice,
//! fail a zero print, say gm. Prints `cortisol: <n> CU` for `typeshi test`.
//! Needs `anchor build` (or `typeshi build`) first, for target/deploy/print_feed.so.

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

const TICKER: [u8; 8] = *b"CPI\0\0\0\0\0";

fn send(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> Result<u64, String> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();
    let out = svm.send_transaction(tx).map_err(|e| format!("{:?}", e.err))?;
    svm.expire_blockhash();
    Ok(out.compute_units_consumed)
}

#[test]
fn print_feed_locks_in() {
    let program_id = print_feed::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();
    let so = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/print_feed.so"));
    svm.add_program(program_id, so).unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    let feed = Pubkey::find_program_address(&[b"feed", TICKER.as_ref()], &program_id).0;
    let print_pda = |seq: u64| {
        Pubkey::find_program_address(&[b"print", feed.as_ref(), &seq.to_le_bytes()], &program_id).0
    };

    // list the ticker
    let ix = Instruction::new_with_bytes(
        program_id,
        &print_feed::instruction::ListTicker { ticker: TICKER }.data(),
        print_feed::accounts::ListTicker { feed, exit_liquidity: payer.pubkey(), system_program: system_program::ID }
            .to_account_metas(None),
    );
    send(&mut svm, &payer, ix).expect("list_ticker");

    // print twice
    let mut cu = 0;
    for (seq, value) in [(0u64, 425u64), (1, 431)] {
        let ix = Instruction::new_with_bytes(
            program_id,
            &print_feed::instruction::Print { value }.data(),
            print_feed::accounts::Print {
                feed,
                print: print_pda(seq),
                cabal: payer.pubkey(),
                exit_liquidity: payer.pubkey(),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        );
        cu = send(&mut svm, &payer, ix).expect("print");
        let acct = svm.get_account(&print_pda(seq)).unwrap();
        let rec = print_feed::PrintRecord::try_deserialize(&mut &acct.data[..]).unwrap();
        assert_eq!((rec.seq, rec.value, rec.printed_by), (seq, value, payer.pubkey()));
    }
    println!("cortisol: {cu} CU (one print)");

    let acct = svm.get_account(&feed).unwrap();
    let f = print_feed::Feed::try_deserialize(&mut &acct.data[..]).unwrap();
    assert_eq!((f.prints, f.aura), (2, 20));

    // a print of zero is not a print
    let ix = Instruction::new_with_bytes(
        program_id,
        &print_feed::instruction::Print { value: 0 }.data(),
        print_feed::accounts::Print {
            feed,
            print: print_pda(2),
            cabal: payer.pubkey(),
            exit_liquidity: payer.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    let err = send(&mut svm, &payer, ix).unwrap_err();
    let code = u32::from(print_feed::Cope::APrintOfZeroIsNotAPrint);
    assert!(err.contains(&format!("Custom({code})")), "{err}");

    // gm
    let ix = Instruction::new_with_bytes(
        program_id,
        &print_feed::instruction::Gm {}.data(),
        print_feed::accounts::Gm { feed }.to_account_metas(None),
    );
    send(&mut svm, &payer, ix).expect("gm");
}
