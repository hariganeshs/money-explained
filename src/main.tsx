import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Home from '@pages/Home';
import Origins from '@pages/Origins';
import Debt from '@pages/Debt';
import Layers from '@pages/Layers';
import InflationVelocity from '@pages/InflationVelocity';
import Banks from '@pages/Banks';
import GoldToFiat from '@pages/GoldToFiat';
import Policy from '@pages/Policy';
import Digital from '@pages/Digital';
import Future from '@pages/Future';
import './styles.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'origins', element: <Origins /> },
      { path: 'debt', element: <Debt /> },
      { path: 'layers', element: <Layers /> },
      { path: 'inflation-velocity', element: <InflationVelocity /> },
      { path: 'banks', element: <Banks /> },
      { path: 'gold-to-fiat', element: <GoldToFiat /> },
      { path: 'policy', element: <Policy /> },
      { path: 'digital', element: <Digital /> },
      { path: 'future', element: <Future /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);