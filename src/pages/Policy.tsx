import React, { useMemo, useState } from 'react';
import Stepper from '@components/Stepper';
import LedgerTile, { Entry } from '@components/LedgerTile';
import FlowArrow from '@components/FlowArrow';

type SeriesPoint = { t: number; rate: number; reserves: number };

function simulateOMOQE(initialReserves: number, omo: number, qe: number): SeriesPoint[] {
  // very simplified toy model:
  // policyRate ~ base - alpha*(reserves/scale)
  // reserves_t = initial + omo + qe * (t / T)
  const T = 24;
  const base = 8; // %
  const alpha = 3.2;
  const scale = 1000;

  const arr: SeriesPoint[] = [];
  for (let t = 0; t <= T; t++) {
    const reserves = initialReserves + omo + qe * (t / T);
    const rate = Math.max(0.1, base - alpha * (reserves / scale));
    arr.push({ t, rate, reserves });
  }
  return arr;
}

type Tiles = {
  cb: Entry[];
  bank: Entry[];
  investor?: Entry[];
  note?: string;
  flow?: { from: string; to: string; amount: number; note?: string };
};

export default function Policy() {
  // Minimal stepper states that demonstrate OMO vs QE with clear ledgers
  const [step, setStep] = useState(0);

  // Chart controls left intact for intuition; they reflect a toy mapping
  const [initial, setInitial] = useState(400);
  const [omo, setOmo] = useState(0);   // + buy bonds injects reserves, - sells withdraw
  const [qe, setQe] = useState(0);     // larger, long-duration purchases

  const series = useMemo(() => simulateOMOQE(initial, omo, qe), [initial, omo, qe]);

  // Base scenario numbers
  const BOND = 100;

  // Helper to make simple equity plug so each tile balances
  const plugEquity = (entries: Entry[]): Entry[] => {
    const A = entries.filter(e => e.side === 'Assets').reduce((s, e) => s + e.amount, 0);
    const L = entries.filter(e => e.side === 'Liabilities').reduce((s, e) => s + e.amount, 0);
    const E = entries.filter(e => e.side === 'Equity').reduce((s, e) => s + e.amount, 0);
    const needed = Math.max(0, A - (L + E));
    if (needed > 0) {
      return [...entries, { account: 'Equity (plug)', amount: needed, side: 'Equity' }];
    }
    return entries;
  };

  const steps: Tiles[] = [
    // 1) Baseline
    {
      cb: plugEquity([
        { account: 'Securities (Govt)', amount: 0, side: 'Assets' },
        { account: 'Loans to Banks', amount: 0, side: 'Assets' },
        { account: 'Bank Reserves', amount: 100, side: 'Liabilities' },
        { account: 'Currency in Circulation', amount: 0, side: 'Liabilities' },
      ]),
      bank: plugEquity([
        { account: 'Reserves at CB', amount: 100, side: 'Assets' },
        { account: 'Govt Bonds', amount: 100, side: 'Assets' },
        { account: 'Deposits (Customers)', amount: 100, side: 'Liabilities' },
      ]),
      note: 'Start: Commercial Bank holds Reserves 100 and Govt Bonds 100. Central Bank has Reserves (liability) 100. Deposits are 100.',
    },
    // 2) OMO purchase (CB buys bond from Bank A) — asset swap, deposits unchanged
    {
      cb: plugEquity([
        { account: 'Securities (Govt)', amount: 100, side: 'Assets' }, // +100
        { account: 'Bank Reserves', amount: 200, side: 'Liabilities' }, // +100
      ]),
      bank: plugEquity([
        { account: 'Reserves at CB', amount: 200, side: 'Assets' }, // +100
        { account: 'Govt Bonds', amount: 0, side: 'Assets' },       // -100
        { account: 'Deposits (Customers)', amount: 100, side: 'Liabilities' }, // unchanged
      ]),
      flow: { from: 'CB', to: 'Bank A', amount: BOND, note: 'CB buys bond; pays with reserves. Asset swap raises reserves, leaves deposits unchanged.' },
      note: 'OMO purchase: CB injects reserves; short-rate pressure down as liquidity increases.',
    },
    // 3) OMO sale (CB sells bond to Bank A) — reverse, drains reserves
    {
      cb: plugEquity([
        { account: 'Securities (Govt)', amount: 0, side: 'Assets' },    // -100
        { account: 'Bank Reserves', amount: 100, side: 'Liabilities' }, // -100
      ]),
      bank: plugEquity([
        { account: 'Reserves at CB', amount: 100, side: 'Assets' }, // -100
        { account: 'Govt Bonds', amount: 100, side: 'Assets' },     // +100
        { account: 'Deposits (Customers)', amount: 100, side: 'Liabilities' }, // unchanged
      ]),
      flow: { from: 'Bank A', to: 'CB', amount: BOND, note: 'CB sells bond; payment drains reserves. Liquidity down, rate pressure up.' },
      note: 'OMO sale: reserves fall; funding tightens; upward pressure on short rates.',
    },
    // 4) QE: CB buys from non-bank investor; broad money (deposits) rise
    {
      cb: plugEquity([
        { account: 'Securities (Govt)', amount: 100, side: 'Assets' }, // +100
        { account: 'Bank Reserves', amount: 200, side: 'Liabilities' }, // +100
      ]),
      bank: plugEquity([
        { account: 'Reserves at CB', amount: 200, side: 'Assets' }, // +100
        { account: 'Govt Bonds', amount: 100, side: 'Assets' },     // unchanged vs step 3 (bank did not sell now)
        { account: 'Deposits (Customers)', amount: 200, side: 'Liabilities' }, // +100 to Investor
      ]),
      investor: plugEquity([
        { account: 'Deposit at Bank A', amount: 100, side: 'Assets' }, // +100 deposit from sale
        // Equity plug will balance as needed
      ]),
      flow: { from: 'Investor', to: 'CB', amount: BOND, note: 'Investor sells bond to CB. Settlement credits Investor deposit at Bank A; bank reserves increase.' },
      note: 'QE from non-bank: deposits increase (broad money up) and bank reserves increase. Distinct from OMO with bank as counterparty.',
    },
  ];

  const tiles = steps[step];

  return (
    <section className="section">
      <div className="card">
        <h2 className="h1">Policy: Open Market Operations and QE</h2>
        <p className="p">
          Central banks influence liquidity and short-term rates by buying/selling securities (OMO) and, in stress times,
          purchasing longer-term assets at scale (QE). More reserves usually mean lower funding rates and easier credit
          conditions—up to inflation constraints.
        </p>

        <div className="row">
          <div className="panel">
            <div className="row">
              <label>Initial Reserves</label>
              <input className="range" type="range" min={100} max={1200} step={10} value={initial} onChange={e => setInitial(+e.target.value)} />
              <span className="badge">{initial}</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <label>OMO (±)</label>
              <input className="range" type="range" min={-500} max={500} step={10} value={omo} onChange={e => setOmo(+e.target.value)} />
              <span className="badge">{omo}</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <label>QE (0 → large)</label>
              <input className="range" type="range" min={0} max={1500} step={10} value={qe} onChange={e => setQe(+e.target.value)} />
              <span className="badge">{qe}</span>
            </div>
          </div>
          <div className="panel">
            <div className="small">Notes</div>
            <div className="p">
              Buying bonds injects reserves into the banking system; selling withdraws. QE targets longer maturities, aiming
              to compress term premiums and support credit when short rates are near lower bounds.
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <svg width={720} height={280}>
          <defs>
            <linearGradient id="rate" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffd166" />
              <stop offset="100%" stopColor="#ff6b6b" />
            </linearGradient>
            <linearGradient id="resv" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6ab7ff" />
              <stop offset="100%" stopColor="#46d3a1" />
            </linearGradient>
          </defs>
          {/* axes */}
          <line x1="50" y1="240" x2="700" y2="240" stroke="rgba(255,255,255,0.25)" />
          <line x1="50" y1="40" x2="50" y2="240" stroke="rgba(255,255,255,0.25)" />

          {/* rate line (left axis 0-12%) */}
          {series.map((p, i) => {
            const x = 50 + (650 * p.t) / 24;
            const y = 240 - (200 * p.rate) / 12;
            const nx = i < series.length - 1 ? 50 + (650 * series[i + 1].t) / 24 : x;
            const ny = i < series.length - 1 ? 240 - (200 * series[i + 1].rate) / 12 : y;
            return i === 0 ? null : (
              <line key={'r' + i} x1={x} y1={y} x2={nx} y2={ny} stroke="url(#rate)" strokeWidth={2.2} />
            );
          })}

          {/* reserves line (right axis 0-2000) */}
          {series.map((p, i) => {
            const x = 50 + (650 * p.t) / 24;
            const y = 240 - (200 * Math.min(2000, p.reserves)) / 2000;
            const nx = i < series.length - 1 ? 50 + (650 * series[i + 1].t) / 24 : x;
            const ny = i < series.length - 1 ? 240 - (200 * Math.min(2000, series[i + 1].reserves)) / 2000 : y;
            return i === 0 ? null : (
              <line key={'b' + i} x1={x} y1={y} x2={nx} y2={ny} stroke="url(#resv)" strokeWidth={2.2} />
            );
          })}

          {/* labels */}
          <text x="52" y="52" fill="#a7b0c3" fontSize="11">Rate (%, left)</text>
          <text x="620" y="52" fill="#a7b0c3" fontSize="11" textAnchor="end">Reserves (right)</text>
        </svg>
      </div>

      <div className="card">
        <Stepper
          steps={[
            { title: 'Baseline', description: 'Bank holds bonds and reserves; CB has reserves as liabilities.' },
            { title: 'OMO Purchase', description: 'CB buys bond from Bank A; reserves up, deposits unchanged.' },
            { title: 'OMO Sale', description: 'CB sells bond to Bank A; reserves down, deposits unchanged.' },
            { title: 'QE (From Non-bank)', description: 'CB buys from investor; deposits and reserves both increase.' },
          ]}
          current={step}
          onPrev={() => setStep(s => Math.max(0, s - 1))}
          onNext={() => setStep(s => Math.min(3, s + 1))}
        />

        <div className="row" style={{ gap: 12, alignItems: 'stretch', marginTop: 12 }}>
          <LedgerTile title="Central Bank" entries={tiles.cb} />
          <LedgerTile title="Bank A" entries={tiles.bank} />
          {tiles.investor && <LedgerTile title="Investor" entries={tiles.investor} />}
        </div>

        {tiles.flow && (
          <div style={{ marginTop: 12 }}>
            <FlowArrow from={tiles.flow.from} to={tiles.flow.to} amount={tiles.flow.amount} note={tiles.flow.note} />
          </div>
        )}

        {tiles.note && <p className="p" style={{ marginTop: 8 }}>{tiles.note}</p>}
      </div>
    </section>
  );
}