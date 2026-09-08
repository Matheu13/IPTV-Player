import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const isViteWs = (val: any) => {
    const str = String(val?.message || val?.reason || val?.stack || val || '');
    return str.includes('WebSocket') || str.includes('websocket');
  };
  window.addEventListener('unhandledrejection', (event) => {
    if (isViteWs(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('error', (event) => {
    if (isViteWs(event.message) || isViteWs(event.error)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
