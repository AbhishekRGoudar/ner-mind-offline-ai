import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { PwaManager } from './pwa/registerServiceWorker.js';
import './index.css';

// Initialize PWA service worker and installation event listeners
PwaManager.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
