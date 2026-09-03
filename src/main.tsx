import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason?.message || event?.reason || '');
    if (reasonStr.includes('WebSocket') || reasonStr.includes('websocket')) {
      event.preventDefault();
    }
  });
  window.addEventListener('error', (event) => {
    const errorStr = String(event?.message || event?.error || '');
    if (errorStr.includes('WebSocket') || errorStr.includes('websocket')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
