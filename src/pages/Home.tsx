import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="section">
      <div className="hero">
        <div className="card">
          <h1 className="h1">Money, its Evolution and Mechanics</h1>
          <p className="p">
            Explore interactive models that bring the article to life: barter origins, money as
            debt, layered money, inflation and velocity, banks and fractional reserve, the move
            from gold to fiat, monetary policy, digital money, and the future with CBDC and crypto.
          </p>
          <div className="cta">
            <Link className="button" to="/origins">Start with Origins</Link>
            <Link className="button" to="/inflation-velocity">Inflation & Velocity</Link>
            <Link className="button" to="/policy">Policy (OMO/QE)</Link>
            <Link className="button" to="/future">Future</Link>
          </div>
          <p className="small">
            Tip: Use <span className="kbd">Space</span> to pause animations in some sims.
          </p>
        </div>
        <div className="card">
          <h2 className="h2">What you can do here</h2>
          <ul className="p">
            <li>Simulate a barter network evolving into a common medium of exchange</li>
            <li>Visualize layered money and final settlement</li>
            <li>Play with money velocity and see prices react</li>
            <li>Model bank lending and the money multiplier</li>
            <li>Experiment with QE/OMO and observe interest/liquidity shifts</li>
            <li>Step through gold → Bretton Woods → fiat transitions</li>
            <li>Watch a simple blockchain add blocks and verify hashes</li>
          </ul>
        </div>
      </div>
      <div className="grid">
        <CardLink title="Origins" to="/origins" desc="From barter to commodity money and why certain goods became money." />
        <CardLink title="Debt" to="/debt" desc="Why money is also IOUs and how ledgers preceded coins." />
        <CardLink title="Layers" to="/layers" desc="Fast vs secure layers; settlement vs convenience." />
        <CardLink title="Inflation & Velocity" to="/inflation-velocity" desc="Supply vs velocity and price dynamics." />
        <CardLink title="Banks" to="/banks" desc="Fractional reserve, deposits, and lending loops." />
        <CardLink title="Gold → Fiat" to="/gold-to-fiat" desc="Gold standard, Bretton Woods, and fiat transition." />
        <CardLink title="Policy (OMO/QE)" to="/policy" desc="Central bank levers, rates, and bond operations." />
        <CardLink title="Digital" to="/digital" desc="Cards, UPI, reserves, and database money." />
        <CardLink title="Future" to="/future" desc="CBDC vs Crypto; automation tradeoffs." />
      </div>
    </section>
  );
}

function CardLink(props: { title: string; desc: string; to: string }) {
  return (
    <Link to={props.to} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <h3 className="h2">{props.title}</h3>
      <p className="p">{props.desc}</p>
    </Link>
  );
}