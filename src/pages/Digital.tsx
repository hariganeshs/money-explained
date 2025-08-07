import React from 'react';

export default function Digital() {
  return (
    <section className="section">
      <div className="card">
        <h2 className="h1">Digital Money: Databases and Networks</h2>
        <p className="p">
          Modern payments are database updates. Cards, UPI, and instant rails move information; only
          net balances settle between banks at intervals against central bank reserves. Reserve money
          (M0) is digital entries at the central bank plus physical cash; broad money includes demand
          deposits created through lending.
        </p>
        <p className="p">
          When central banks credit a bank’s account, they create reserves digitally. Commercial banks
          are required to hold minimum reserves (CRR). Transfers across banks reduce one bank’s reserves
          and increase another’s; retail users only see account balances changing.
        </p>
      </div>

      <div className="card">
        <h3 className="h2">Key concepts</h3>
        <ul className="p">
          <li>Reserve ledger at central bank; bank ledgers for customers</li>
          <li>Card networks (Visa/Mastercard) route auth and clearing messages</li>
          <li>UPI/instant rails settle frequently; finality at reserve layer</li>
          <li>Most money is numbers, not cash—because money is a ledger</li>
        </ul>
        <p className="small">
          Security, fraud, and regulation shape UX and speed; tech reduces friction but trust still matters.
        </p>
      </div>
    </section>
  );
}