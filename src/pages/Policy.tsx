import React, { useMemo, useState } from 'react';

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

export default function Policy() {
  const [initial, setInitial] = useState(400);
  const [omo, setOmo] = useState(0);   // + buy bonds injects reserves, - sells withdraw
  const [qe, setQe] = useState(0);     // larger, long-duration purchases

  const series = useMemo(() => simulateOMOQE(initial, omo, qe), [initial, omo, qe]);

  return (
    <section className="section">
      <div className="card">
        <h2 className="h1">Policy: Open Market Operations and QE</h2>
        <p className="p">
          Central banks influence liquidity and short-term rates by buying/selling securities (OMO) and,
          in stress times, purchasing longer-term assets at scale (QE). More reserves usually mean lower
          funding rates and easier credit conditions—up to inflation constraints.
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
              Buying bonds injects reserves into the banking system; selling withdraws. QE targets
              longer maturities, aiming to compress term premiums and support credit when short rates
              are near lower bounds.
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
    </section>
  );
}