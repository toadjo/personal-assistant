import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/query/client";
import { initSentryIfAllowed } from "./lib/sentry";
import "./styles.css";

// Initialize Sentry only if a DSN is configured AND the security policy
// allows crash reporting. The check is async (IPC to main process) but we
// don't block render — breadcrumbs/captures before init resolves are
// safely dropped.
void initSentryIfAllowed();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
