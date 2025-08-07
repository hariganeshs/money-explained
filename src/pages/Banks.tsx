import React, { useMemo, useState } from 'react';

type Step = {
  depositor: string;
  deposit: number;
  reserve: number;
  loan: number;
  cumulativeDeposits: number;
  cumulativeLoans: number;
};

function simulateFractional(initialDeposit: number, reserveRatio: number, maxSteps = 12): Step[] {
  let remaining = initialDeposit;
  let cumulativeDeposits = 0;
  let cumulativeLoans = 0;
  const steps: Step[] = [];

  for (let i = 0; i < maxSteps; i++) {
    const deposit = i === 0 ? remaining : remaining;
    const reserve = +(deposit * reserveRatio).toFixed(2);
    const loan = +(deposit - reserve).toFixed(2);
    cumulativeDeposits = +(cumulativeDeposits + deposit).toFixed(2);
    cumulativeLoans = +(cumulativeLoans + loan).toFixed(2);

    steps.push({
      depositor: `D${i + 1}`,
      deposit,
      reserve,
      loan,
      cumulativeDeposits,
      cumulativeLoans
    });

    remaining = loan;
    if (loan < 0.01) break;
  }

  return steps;
}

export default function Banks() {
  const [initial, setInitial] = useState(1000);
  const [rr, setRr] = useState(0.03);

  const steps = useMemo(() => simulateFractional(initial, rr), [initial, rr]);

  const moneyMultiplier = +(1 / rr).toFixed(2);
  const theoreticalMaxDeposits = +(initial * moneyMultiplier).toFixed(2);

  return (
    <section className="section">
      <div className="card">
        <h2 className="h1">Banks and Fractional Reserve Lending</h2>
        <p className="p">
          When a bank receives a deposit, a fraction is held as reserves (CRR), and the rest can be loaned.
          Each loan re-deposited becomes a new deposit in the system, expanding broad money. This toy model
          demonstrates the money multiplier intuition.
        </p>

        <div className="row">
          <div className="panel">
            <div className="row">
              <label>Initial Deposit</label>
              <input
                className="range"
                type="range"
                min={100}
                max={5000}
                step={50}
                value={initial}
                onChange={(e) => setInitial(+e.target.value)}
              />
              <span className="badge">{initial.toFixed(0)}</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <label>Reserve Ratio (CRR)</label>
              <input
                className="range"
                type="range"
                min={0.01}
                max={0.3}
                step={0.01}
                value={rr}
                onChange={(e) => setRr(+e.target.value)}
              />
              <span className="badge">{(rr * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="panel">
            <div className="small">Summary</div>
            <div className="p">
              Theoretical money multiplier: <b>{moneyMultiplier}×</b> <br />
              Theoretical max deposits from {initial} ≈ <b>{theoreticalMaxDeposits}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#a7b0c3' }}>
              <th align="left">Step</th>
              <th align="right">Deposit</th>
              <th align="right">Reserve</th>
              <th align="right">Loan</th>
              <th align="right">Cum. Deposits</th>
              <th align="right">Cum. Loans</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td>{s.depositor}</td>
                <td align="right">{s.deposit.toFixed(2)}</td>
                <td align="right">{s.reserve.toFixed(2)}</td>
                <td align="right" style={{ color: 'var(--accent)' }}>{s.loan.toFixed(2)}</td>
                <td align="right">{s.cumulativeDeposits.toFixed(2)}</td>
                <td align="right">{s.cumulativeLoans.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="small" style={{ marginTop: 8 }}>
          Each row imagines the previous loan being deposited again, generating a new round.
        </div>
      </div>
    </section>
  );
}