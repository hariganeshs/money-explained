import React from 'react';
import VelocityBalloon3D from '@components/VelocityBalloon3D';
import * as d3 from 'd3';

export default function InflationVelocity() {
  // Keep the original MV=PQ line chart as a secondary vertical section to complement the new balloon sim.
  const w = 720, h = 260, m = { top: 20, right: 16, bottom: 28, left: 44 };
  const xs = Array.from({ length: 60 }, (_, i) => i);
  const supply = 120;
  const velocity = 1.0;
  const data = xs.map((t) => ({ t, price: (supply * velocity) / 100 }));

  const x = d3.scaleLinear([0, d3.max(data, d => d.t) ?? 60], [m.left, w - m.right]);
  const y = d3.scaleLinear([0, d3.max(data, d => d.price) ? (d3.max(data, d => d.price) as number) * 1.2 : 2], [h - m.bottom, m.top]);
  const linePath = d3.line<{ t: number; price: number }>()
    .x(d => x(d.t))
    .y(d => y(d.price))
    .curve(d3.curveMonotoneX)(data) ?? '';

  return (
    <section className="section">
      <div className="card glass">
        <h2 className="h1">Inflation and Money Velocity — Deep Dive</h2>
        <p className="p">
          This explainer pairs a physics-based particle simulation with a macro identity (MV=PQ) to
          illustrate how money supply (M) and money velocity (V) affect price levels (P) when output (Q) is held fixed.
          Scroll vertically: first, interact with the balloon particle model; then review a simple MV projection.
        </p>
      </div>

      <VelocityBalloon3D />

      <div className="card glass" style={{ overflowX: 'auto' }}>
        <h3 className="h2">MV=PQ (toy visualization)</h3>
        <svg width={w} height={h} role="img" aria-label="Price Index vs Time">
          <defs>
            <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6ab7ff" stopOpacity="1" />
              <stop offset="100%" stopColor="#46d3a1" stopOpacity="1" />
            </linearGradient>
          </defs>
          <g>
            <line x1={m.left} y1={h - m.bottom} x2={w - m.right} y2={h - m.bottom} stroke="rgba(255,255,255,0.25)" />
            <line x1={m.left} y1={m.top} x2={m.left} y2={h - m.bottom} stroke="rgba(255,255,255,0.25)" />
            <path d={linePath} fill="none" stroke="url(#g2)" strokeWidth={2.5} />
          </g>
        </svg>
        <p className="small">Identity shown for intuition; interact with the balloon above to see how M and V alter “pressure”.</p>
      </div>
    </section>
  );
}