import React from 'react';

export default function Future() {
  return (
    <section className="section">
      <div className="card">
        <h2 className="h1">The Future: CBDC and Crypto</h2>
        <p className="p">
          Two trajectories: centralized Central Bank Digital Currency (CBDC) and decentralized
          cryptocurrencies. CBDC makes fiat programmable and gives central banks direct tools to
          manage supply and rails. Crypto uses distributed ledgers with rules enforced by consensus,
          aiming for openness and credible neutrality.
        </p>
        <div className="grid">
          <div className="panel">
            <h3 className="h2">CBDC</h3>
            <ul className="p">
              <li>Digital legal tender; accounts or tokens issued by central bank</li>
              <li>Programmability: direct transfers, conditional disbursements</li>
              <li>Fine-grained monetary control; potential privacy trade-offs</li>
              <li>Integrates with banks and payment apps as front-ends</li>
            </ul>
          </div>
          <div className="panel">
            <h3 className="h2">Crypto</h3>
            <ul className="p">
              <li>Bitcoin: fixed supply, proof-of-work security, settlement finality</li>
              <li>Ethereum: smart contracts, programmable finance, NFTs, DeFi</li>
              <li>Volatility and scams exist; tech can still be transformative</li>
              <li>Coexistence with fiat rails is likely in many jurisdictions</li>
            </ul>
          </div>
        </div>
        <p className="small">
          Direction of travel: faster, more automated, and more secure settlement—echoing the
          long arc from commodity money to layered, digital systems.
        </p>
      </div>
    </section>
  );
}