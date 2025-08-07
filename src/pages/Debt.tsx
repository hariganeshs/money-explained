import React from 'react';

export default function Debt() {
  return (
    <section className="section">
      <div className="card">
        <h2 className="h1">Money as Debt: IOUs and Ledgers</h2>
        <p className="p">
          Anthropological evidence suggests early transactions were recorded as debts on communal
          ledgers long before coins. Debt is a promise: “I owe you”. When trusted IOUs circulate,
          they act like money. Final settlement happens later, often in a harder-to-change medium.
        </p>
        <p className="p">
          In modern systems, deposits and loans are ledger entries. When a bank extends a loan, it
          creates a deposit — expanding broad money. Settlement layers reconcile obligations.
        </p>
      </div>
      <div className="card">
        <h3 className="h2">Thought experiment</h3>
        <p className="p">
          Friend A borrows 2 coins from you. You buy goods using A’s signed IOU. That IOU is
          accepted by others who trust A. Multiple trades happen before A finally repays the last
          holder. A single loan increased effective transaction capacity.
        </p>
      </div>
    </section>
  );
}