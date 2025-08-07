import React from 'react';
import { Outlet } from 'react-router-dom';
import Nav from '@components/Nav';

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer">
        <span>Money Explained — Interactive. Built with React, D3, and React Three Fiber.</span>
      </footer>
    </div>
  );
}