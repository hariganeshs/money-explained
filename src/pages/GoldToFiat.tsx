import React from 'react';

export default function GoldToFiat() {
  return (
    <section className="section">
      <div className="card">
        <h2 className="h1">From Gold to Fiat</h2>
        <p className="p">
          Gold solved portability and trust by being scarce and costly to change—ideal as a base
          settlement layer. Banks issued redeemable notes, then central banks standardized notes.
          International imbalances moved gold between nations, disciplining excess issuance.
        </p>
        <p className="p">
          Wars broke convertibility. Bretton Woods pegged currencies to USD, USD to gold. In 1971,
          convertibility ended and the world moved to free-floating fiat. Demand for currency is
          maintained via legal tender status and taxes, with monetary policy used to manage the
          economy and inflation risks.
        </p>
      </div>

      <div className="card">
        <h3 className="h2">Key milestones</h3>
        <ul className="p">
          <li>Commodity money (metals) as base settlement</li>
          <li>Bank receipts redeemable in specie (gold/silver)</li>
          <li>Central banks unify notes; gold standard</li>
          <li>Bretton Woods: USD reserve, fixed FX</li>
          <li>1971 Nixon shock: end of convertibility</li>
          <li>Fiat + floating FX; policy targets inflation and employment</li>
        </ul>
      </div>
    </section>
  );
}