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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function Banks() {
  // Parameters (kept simple/minimal)
  const initialCashDepositDefault = 1000;

  // UI state
  const [reserveRatioPct, setReserveRatioPct] = useState(10); // %
  const [initialCashDeposit, setInitialCashDeposit] = useState(initialCashDepositDefault);
  const [multiplierSteps, setMultiplierSteps] = useState(3); // how many rounds bank lends/re-deposits (toy geometric series)
  const [step, setStep] = useState(0);

  const reserveRatio = clamp(reserveRatioPct, 0, 100) / 100; // 0..1

  // Core first-pass minimal walkthrough values (single loop)
  const loanOut = initialCashDeposit * (1 - reserveRatio);
  const redeposit = loanOut; // borrower spends -> merchant redeposits at same bank (simplified single-bank loop)

  const steps = useMemo(() => ([
    {
      title: 'Start: Bank and Public (no balances)',
      description: 'We begin with no deposits and no loans on the bank balance sheet.',
    },
    {
      title: 'Customer cash deposit at bank',
      description: `A customer deposits ${initialCashDepositDefault} cash. Bank assets increase (Cash/Reserves), and a matching liability is created (Customer Deposit).`,
    },
    {
      title: 'Bank retains reserves and issues a loan',
      description: `With a ${reserveRatioPct}% reserve ratio, the bank holds ${(initialCashDeposit * reserveRatio).toFixed(0)} as reserves and can lend ${(loanOut).toFixed(0)}. A new asset appears (Loan), and simultaneously a new deposit liability is created for the borrower.`,
    },
    {
      title: 'Borrower spends; merchant redeposits at the same bank',
      description: 'Borrower uses the loan deposit to pay a merchant, who redeposits it at the same bank. Total deposits rise; assets still cover liabilities.',
    },
  ]), [reserveRatioPct, initialCashDeposit, loanOut]);

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
      // Customer deposits cash
      bankA = { 'Reserves/Cash': initialCashDeposit };
      bankL = { 'Deposits (Customer)': initialCashDeposit };
      depositorA = { 'Deposit at Bank': initialCashDeposit };
      depositorE = { 'Net Worth (claim on bank)': initialCashDeposit };

      from = 'Customer';
      to = 'Bank';
      amt = initialCashDeposit;
      note = 'Customer hands over cash; bank records matching deposit liability.';
    } else if (step === 2) {
      // Bank retains reserves and issues loan, creating borrower deposit
      bankA = {
        'Reserves/Cash': initialCashDeposit * reserveRatio,
        'Loan to Borrower': loanOut
      };
      // Two deposits exist: original customer and borrower
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
      // Borrower spends; merchant redeposits at the same bank
      bankA = {
        'Reserves/Cash': initialCashDeposit * reserveRatio,
        'Loan to Borrower': loanOut
      };
      // Deposits shift: original customer remains, borrower deposit 0, merchant deposit +redeposit
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

  // Reserve ratio table + money multiplier toy calculator
  const {
    theoreticalMultiplier,
    seriesRows,
    originalDeposit,
    perceivedMoneyInCirculation
  } = useMemo(() => {
    // The classic theoretical simple multiplier is m = 1 / rr (when rr > 0)
    const rr = reserveRatio;
    const m = rr > 0 ? 1 / rr : Infinity;

    // Build a geometric loan/redeposit series for 'multiplierSteps' rounds starting from initialCashDeposit
    // Round 0: initial deposit counts as deposits; loans begin after reserves held back
    const rows: { round: number; newLoan: number; newDeposit: number; reservesHeld: number }[] = [];
    const baseDeposit = initialCashDeposit;

    // Subsequent rounds originate from lending a fraction of the previous deposit
    let lastLoanable = baseDeposit * (1 - rr);

    for (let i = 1; i <= multiplierSteps; i++) {
      const newLoan = lastLoanable;
      const reservesHeld = newLoan * rr;
      const newDeposit = newLoan; // redeposit of spending at same bank (toy)
      rows.push({ round: i, newLoan, newDeposit, reservesHeld });

      // Next round: bank lends out (1-rr) of this new deposit
      lastLoanable = newDeposit * (1 - rr);
    }

    // Original deposit is simply the very first depositor's cash
    const original = baseDeposit;

    // Perceived money in circulation (toy): sum of deposits visible after chosen rounds
    // Here we consider the original deposit plus each new redeposit as balances seen.
    const perceived = original + rows.reduce((s, r) => s + r.newDeposit, 0);

    return {
      theoreticalMultiplier: m,
      seriesRows: rows,
      originalDeposit: original,
      perceivedMoneyInCirculation: perceived,
    };
  }, [reserveRatio, multiplierSteps, initialCashDeposit]);

  return (
    <section className="section">
      <div className="card glass" style={{ border: '1px solid rgba(120,160,255,0.18)', background: 'linear-gradient(180deg, rgba(40,60,100,0.18), rgba(20,25,40,0.18))' }}>
        <h2 className="h1">Banks — Deposit, Reserves, Loan, Redeposit</h2>
        <p className="p">
          A bank accepts deposits (its liabilities) and holds reserves/cash (its assets). It can issue loans, creating new deposits.
          When borrowers spend, recipients can redeposit, shifting who holds the deposit while totals remain consistent.
        </p>

        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="panel glass" style={{ minWidth: 300, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="h3" style={{ marginBottom: 8 }}>Parameters</div>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
              <label>Reserve Ratio</label>
              <input
                className="range"
                type="range"
                min={0}
                max={50}
                step={1}
                value={reserveRatioPct}
                onChange={(e) => setReserveRatioPct(+e.target.value)}
              />
              <span className="badge">{reserveRatioPct}%</span>
            </div>
            <div className="row" style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
              <label>Initial Cash Deposit</label>
              <input
                className="range"
                type="range"
                min={100}
                max={5000}
                step={100}
                value={initialCashDeposit}
                onChange={(e) => setInitialCashDeposit(+e.target.value)}
              />
              <span className="badge">{initialCashDeposit.toFixed(0)}</span>
            </div>
            <div className="row" style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
              <label>Lending Rounds</label>
              <input
                className="range"
                type="range"
                min={0}
                max={10}
                step={1}
                value={multiplierSteps}
                onChange={(e) => setMultiplierSteps(+e.target.value)}
              />
              <span className="badge">{multiplierSteps}</span>
            </div>
            <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
              Change the reserve ratio, the initial deposit, and how many rounds lending/redeposit continues in this toy model.
            </div>
          </div>

          <div className="panel glass" style={{ minWidth: 320, flex: 1, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="h3">Reserve Ratio Table</div>
              <span className="badge">Toy model</span>
            </div>

            <div className="row" style={{ gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
              <div className="card" style={{ padding: 10, minWidth: 180, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(90,120,255,0.08)' }}>
                <div className="small">Reserve Ratio</div>
                <div className="h3">{(reserveRatio * 100).toFixed(1)}%</div>
              </div>
              <div className="card" style={{ padding: 10, minWidth: 180, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,180,80,0.08)' }}>
                <div className="small">Theoretical Multiplier</div>
                <div className="h3">{Number.isFinite(theoreticalMultiplier) ? theoreticalMultiplier.toFixed(2) : '∞'}</div>
              </div>
              <div className="card" style={{ padding: 10, minWidth: 180, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(80,200,140,0.10)' }}>
                <div className="small">Original Deposit</div>
                <div className="h3">{originalDeposit.toFixed(2)}</div>
              </div>
              <div className="card" style={{ padding: 10, minWidth: 220, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(160,120,255,0.10)' }}>
                <div className="small">Perceived Money in Circulation</div>
                <div className="h3">{perceivedMoneyInCirculation.toFixed(2)}</div>
              </div>
            </div>

            <div className="small" style={{ marginTop: 8, opacity: 0.9 }}>
              The theoretical multiplier assumes unlimited rounds with no leakages. The table below shows a finite number of lending rounds.
            </div>

            <div className="card glass" style={{ marginTop: 8, overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="small" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.9 }}>
                    <th style={{ padding: '6px 8px' }}>Round</th>
                    <th style={{ padding: '6px 8px' }}>New Loan</th>
                    <th style={{ padding: '6px 8px' }}>Reserves Held</th>
                    <th style={{ padding: '6px 8px' }}>New Deposit (Redeposit)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 8px' }}>0 (Initial)</td>
                    <td style={{ padding: '6px 8px' }}>—</td>
                    <td style={{ padding: '6px 8px' }}>{(initialCashDeposit * reserveRatio).toFixed(2)}</td>
                    <td style={{ padding: '6px 8px' }}>{initialCashDeposit.toFixed(2)}</td>
                  </tr>
                  {seriesRows.map((r) => (
                    <tr key={r.round}>
                      <td style={{ padding: '6px 8px' }}>{r.round}</td>
                      <td style={{ padding: '6px 8px' }}>{r.newLoan.toFixed(2)}</td>
                      <td style={{ padding: '6px 8px' }}>{r.reservesHeld.toFixed(2)}</td>
                      <td style={{ padding: '6px 8px' }}>{r.newDeposit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
        <div style={{ flex: 1 }}>
          <Stepper
            steps={steps}
            current={step}
            onPrev={() => setStep(s => Math.max(0, s - 1))}
            onNext={() => setStep(s => Math.min(steps.length - 1, s + 1))}
          />
          <div className="card glass" style={{ marginTop: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            {flowAmount > 0 ? (
              <FlowArrow from={flowFrom || '—'} to={flowTo || '—'} amount={flowAmount} note={flowNote} />
            ) : (
              <div className="small" style={{ padding: 8, opacity: 0.8 }}>No flow in this step.</div>
            )}
          </div>
        </div>

        <div className="panel glass" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="h3">Bank</div>
          <LedgerTile
            title="Bank — Balance Sheet"
            entries={bankEntries}
            highlight={step === 1 ? 'Reserves/Cash' : step === 2 ? 'Loan to Borrower' : 'Deposits (Merchant)'}
          />
        </div>

        <div className="panel glass" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="h3">Customer / Borrower</div>
          <LedgerTile
            title="Customers — Balance Sheet"
            entries={borrowerEntries}
            highlight={step === 2 ? 'Deposit at Bank' : step === 3 ? 'Loan from Bank' : undefined}
          />
        </div>

        <div className="panel glass" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="h3">Depositor</div>
          <LedgerTile
            title="Depositor — Balance Sheet"
            entries={depositorEntries}
            highlight="Deposit at Bank"
          />
        </div>
      </div>

      <div className="card glass" style={{ marginTop: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="h2">Notes</h3>
        <ul className="p">
          <li>Original Deposit is the very first depositor’s cash placed at the bank.</li>
          <li>Perceived Money in Circulation adds the original deposit and each subsequent redeposit in this simplified same-bank model.</li>
          <li>The reserve ratio slider shows a classic geometric-series intuition. Real systems have leakages, capital and liquidity rules, and multi-bank settlement.</li>
        </ul>
      </div>
    </section>
  );
}