// App entry point - Synka Digital Card
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, processOfflineQueue, setupNetworkListeners } from "./lib/offlineSync";

// Register service worker for PWA
registerServiceWorker();

// Handle online/offline transitions
setupNetworkListeners(
  () => {
    console.log('[App] Back online - syncing data');
    processOfflineQueue();
  },
  () => {
    console.log('[App] Went offline');
  }
);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
