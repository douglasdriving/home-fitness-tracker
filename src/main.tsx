import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import { initPWAMode } from './utils/pwaHelper'

// Initialize PWA mode detection
initPWAMode();

// The default auto-injected registration script only registers the service
// worker once and never actively checks for a newer one, so a phone that
// already has the app open/installed can keep running a stale bundle for a
// long time. `immediate: true` forces an update check right away, and
// activating a new SW (registerType: 'autoUpdate') reloads the page for it.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // hourly, in case the app is left open for a long time
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
