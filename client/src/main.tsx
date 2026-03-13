import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initConfig } from "./lib/api-config";

// Load runtime config (Ingestion Server URL) before rendering.
// This allows a single Docker image to work across all environments.
initConfig().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
