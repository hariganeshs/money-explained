import React, { useMemo, useState } from 'react';
import Stepper from '@components/Stepper';
import LedgerTile, { Entry } from '@components/LedgerTile';
import FlowArrow from '@components/FlowArrow';

type Side = 'Assets' | 'Liabilities' | 'Equity';

function makeEntries(map: Record<string, number>, side: Side): Entry[] {
  return Object.entries(map)
    .filter(([, v]) => Math.abs(v) > 1e-9)
    .map(([account, amount]) => ({ account, amount, side }));
}

export default function Banks() {
  // Parameters (kept simple/minimal)
  const initialCashDeposit = 1000;
  const reserveRatio = 0.1; // 10% reserves retained
  const loanOut = initialCashDeposit * (1 - reserveRatio);
  const redeposit = loanOut; // borrower spends -> merchant redeposits at same bank (simplified single-bank loop)

  const [step, setStep] = useState(0);

  const steps = useMemo(() => ([
    {
      title: 'Start: Bank and Public (no balances)',
      description: 'We begin with no deposits and no loans on the bank balance sheet.',
    },
    {
      title: 'Customer cash deposit at bank',
      description: 'A customer deposits 1000 cash. Bank assets increase (Cash/Reserves), and a matching liability is created (Customer Deposit).',
    },
    {
      title: 'Bank retains reserves and issues a loan',
      description: 'With a 10% reserve ratio, the bank holds 100 as reserves and can lend 900. A new asset appears (Loan), and simultaneously a new deposit liability is created for the borrower.',
    },
    {
      title: 'Borrower spends; merchant redeposits at the same bank',
      description: 'Borrower uses the 900 deposit to pay a merchant, who redeposits it at the same bank. Total deposits rise; the bank’s assets still cover its liabilities.',
    },
  ]), []);

  // Compute ledgers per step: Bank + two representative customers (Depositor and Borrower/Merchant)
  const {
    bankEntries,
    depositorEntries,
    borrowerEntries,
    flowFrom,
    flowTo,
    flowAmount,
    flowNote
  } = useMemo(() => {
    let bankA: Record<string, number> = {};
    let bankL: Record<string, number> = {};
    let bankE: Record<string, number> = {};
    let depositorA: Record<string, number> = {};
    let depositorL: Record<string, number> = {};
    let depositorE: Record<string, number> = {};
    let borrowerA: Record<string, number> = {};
    let borrowerL: Record<string, number> = {};
    let borrowerE: Record<string, number> = {};
    let from = '';
    let to = '';
    let amt = 0;
    let note = '';

    if (step === 0) {
      // Nothing yet
      note = 'No balances.';
    } else if (step === 1) {
      // Customer deposits cash 1000
      bankA = { 'Reserves/Cash': initialCashDeposit };
      bankL = { 'Deposits (Customer)': initialCashDeposit };
      depositorA = { 'Deposit at Bank': initialCashDeposit };
      depositorE = { 'Net Worth (claim on bank)': initialCashDeposit };

      from = 'Customer';
      to = 'Bank';
      amt = initialCashDeposit;
      note = 'Customer hands over cash; bank records matching deposit liability.';
    } else if (step === 2) {
      // Bank retains 100 as reserves and issues 900 loan, creating borrower deposit
      bankA = {
        'Reserves/Cash': initialCashDeposit * reserveRatio, // 100
        'Loan to Borrower': loanOut // 900
      };
      // Two deposits exist: original customer 1000 and borrower 900
      bankL = {
        'Deposits (Customer)': initialCashDeposit,
        'Deposits (Borrower)': loanOut
      };
      depositorA = { 'Deposit at Bank': initialCashDeposit };
      depositorE = { 'Net Worth (claim on bank)': initialCashDeposit };
      borrowerA = { 'Deposit at Bank': loanOut };
      borrowerL = { 'Loan from Bank': loanOut }; // borrower has a liability to repay
      borrowerE = { 'Net Worth': 0 };

      from = 'Bank';
      to = 'Borrower';
      amt = loanOut;
      note = 'Bank creates a loan asset and matching borrower deposit liability.';
    } else if (step === 3) {
      // Borrower spends 900; merchant redeposits at the same bank
      // Bank assets unchanged from step 2
      bankA = {
        'Reserves/Cash': initialCashDeposit * reserveRatio, // 100
        'Loan to Borrower': loanOut // 900
      };
      // Deposits shift: original customer 1000 remains, borrower deposit 0, merchant deposit +900
      bankL = {
        'Deposits (Customer)': initialCashDeposit,
        'Deposits (Merchant)': redeposit
      };
      depositorA = { 'Deposit at Bank': initialCashDeposit };
      depositorE = { 'Net Worth (claim on bank)': initialCashDeposit };
      // Borrower’s bank deposit goes to 0 after spending; loan remains owed
      borrowerA = { 'Deposit at Bank': 0 };
      borrowerL = { 'Loan from Bank': loanOut };
      borrowerE = { 'Net Worth': 0 };

      from = 'Borrower';
      to = 'Merchant';
      amt = redeposit;
      note = 'Borrower pays merchant; merchant redeposits → bank liabilities move, totals unchanged.';
    }

    const bankEntries: Entry[] = [
      ...makeEntries(bankA, 'Assets'),
      ...makeEntries(bankL, 'Liabilities'),
      ...makeEntries(bankE, 'Equity')
    ];
    const depositorEntries: Entry[] = [
      ...makeEntries(depositorA, 'Assets'),
      ...makeEntries(depositorL, 'Liabilities'),
      ...makeEntries(depositorE, 'Equity')
    ];
    const borrowerEntries: Entry[] = [
      ...makeEntries(borrowerA, 'Assets'),
      ...makeEntries(borrowerL, 'Liabilities'),
      ...makeEntries(borrowerE, 'Equity')
    ];

    return { bankEntries, depositorEntries, borrowerEntries, flowFrom: from, flowTo: to, flowAmount: amt, flowNote: note };
  }, [step, initialCashDeposit, reserveRatio, loanOut, redeposit]);

  return (
    <section className="section">
      <div className="card glass">
        <h2 className="h1">Banks — Deposit, Reserves, Loan, Redeposit (minimal walkthrough)</h2>
        <p className="p">
          A bank accepts deposits (its liabilities) and holds reserves/cash (its assets). It can issue loans, creating new deposits.
          When borrowers spend, recipients can redeposit, shifting who holds the deposit while totals remain consistent.
        </p>
      </div>

      <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
        <div style={{ flex: 1 }}>
          <Stepper
            steps={steps}
            current={step}
            onPrev={() => setStep(s => Math.max(0, s - 1))}
            onNext={() => setStep(s => Math.min(steps.length - 1, s + 1))}
          />
          <div className="card glass" style={{ marginTop: 12 }}>
            {flowAmount > 0 ? (
              <FlowArrow from={flowFrom || '—'} to={flowTo || '—'} amount={flowAmount} note={flowNote} />
            ) : (
              <div className="small" style={{ padding: 8, opacity: 0.8 }}>No flow in this step.</div>
            )}
          </div>
        </div>

        <div className="panel glass" style={{ flex: 1 }}>
          <div className="h3">Bank</div>
          <LedgerTile
            title="Bank — Balance Sheet"
            entries={bankEntries}
            highlight={step === 1 ? 'Reserves/Cash' : step === 2 ? 'Loan to Borrower' : 'Deposits (Merchant)'}
          />
        </div>

        <div className="panel glass" style={{ flex: 1 }}>
          <div className="h3">Customer / Borrower</div>
          <LedgerTile
            title="Customers — Balance Sheet"
            entries={borrowerEntries}
            highlight={step === 2 ? 'Deposit at Bank' : step === 3 ? 'Loan from Bank' : undefined}
          />
        </div>

        <div className="panel glass" style={{ flex: 1 }}>
          <div className="h3">Depositor</div>
          <LedgerTile
            title="Depositor — Balance Sheet"
            entries={depositorEntries}
            highlight="Deposit at Bank"
          />
        </div>
      </div>

      <div className="card glass" style={{ marginTop: 12 }}>
        <h3 className="h2">Notes</h3>
        <ul className="p">
          <li>Deposits are the bank’s liabilities; reserves/cash and loans are the bank’s assets.</li>
          <li>Loan issuance creates a new deposit; spending shifts who holds the deposit, not the total.</li>
          <li>This is a minimal same-bank walkthrough. Multi-bank flows introduce interbank reserves and settlement.</li>
        </ul>
      </div>
    </section>
  );
}