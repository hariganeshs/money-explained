import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/origins', label: 'Origins' },
  { to: '/debt', label: 'Money as Debt' },
  { to: '/layers', label: 'Layered Money' },
  { to: '/inflation-velocity', label: 'Inflation & Velocity' },
  { to: '/banks', label: 'Banks & Lending' },
  { to: '/gold-to-fiat', label: 'Gold → Fiat' },
  { to: '/policy', label: 'Policy (OMO/QE)' },
  { to: '/digital', label: 'Digital Money' },
  { to: '/future', label: 'Future (CBDC vs Crypto)' }
];

export default function Nav() {
  return (
    <header className="nav">
      <div className="brand">💰 Money Explained</div>
      <nav>
        {navItems.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end as any}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}