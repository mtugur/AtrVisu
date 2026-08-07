import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import {
  UiPreferencesDesignSystemBoundary,
  UiPreferencesProvider
} from "./workbench/uiPreferences";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UiPreferencesProvider>
      <UiPreferencesDesignSystemBoundary>
        <App />
      </UiPreferencesDesignSystemBoundary>
    </UiPreferencesProvider>
  </React.StrictMode>
);
