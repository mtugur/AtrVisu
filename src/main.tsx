import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { DesignSystemRoot } from "./designSystem";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DesignSystemRoot themeId="dark" densityId="comfortable">
      <App />
    </DesignSystemRoot>
  </React.StrictMode>
);
