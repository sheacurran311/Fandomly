/* eslint-disable @typescript-eslint/no-explicit-any */
import './polyfills';
import './lib/sentry';

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Patch any existing window.ethereum to be EIP-1193 compliant.
// Some environments (Replit preview, partial browser extensions) expose a
// provider object that is missing the EventEmitter methods (.on, .removeListener).
// Particle's evmWalletConnectors calls provider.on() during connector setup —
// this guard prevents that from crashing.
(function patchExistingEip1193() {
  const eth = (window as any).ethereum;
  if (!eth) return;
  if (typeof eth.on !== 'function') eth.on = () => {};
  if (typeof eth.removeListener !== 'function') eth.removeListener = () => {};
  if (typeof eth.off !== 'function') eth.off = eth.removeListener;
})();

// Catch any residual "provider.on is not a function" rejections from the
// Particle Network injected-wallet connector in environments where window.ethereum
// is injected after load and is non-configurable (e.g. Replit preview).
// Social logins, WalletConnect, and Coinbase Wallet are unaffected.
window.addEventListener('unhandledrejection', (event) => {
  if (
    typeof event.reason?.message === 'string' &&
    event.reason.message.includes('provider.on is not a function')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
