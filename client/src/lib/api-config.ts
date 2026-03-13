/**
 * API Configuration
 *
 * Centralizes the Ingestion Server URL used by all API clients.
 * The widget calls the Ingestion Server directly (no Express proxy).
 *
 * Resolution order:
 *   1. Runtime: GET /api/config (reads INGESTION_API_URL from server env)
 *   2. Build-time fallback: VITE_INGESTION_API_URL (for local dev with Vite)
 */

let _ingestionApiUrl: string | null = null;
let _configLoaded = false;
let _configPromise: Promise<void> | null = null;

/**
 * Fetches runtime config from the widget server.
 * Called once; subsequent calls return the cached promise.
 */
function loadConfig(): Promise<void> {
  if (_configPromise) return _configPromise;
  _configPromise = fetch("/api/config")
    .then((res) => {
      if (!res.ok) throw new Error(`/api/config returned ${res.status}`);
      return res.json();
    })
    .then((data: { ingestionApiUrl?: string }) => {
      if (data.ingestionApiUrl) {
        _ingestionApiUrl = data.ingestionApiUrl;
      }
      _configLoaded = true;
    })
    .catch((err) => {
      console.warn("[api-config] Failed to load runtime config, using build-time fallback:", err);
      _configLoaded = true;
    });
  return _configPromise;
}

/**
 * Ensures runtime config is loaded before any API calls.
 * Call this once during app initialization.
 */
export async function initConfig(): Promise<void> {
  await loadConfig();
}

/**
 * Returns the Ingestion Server base URL.
 * Uses runtime config from /api/config, falls back to VITE_INGESTION_API_URL.
 */
export function getIngestionApiUrl(): string {
  if (!_ingestionApiUrl) {
    _ingestionApiUrl = (import.meta.env.VITE_INGESTION_API_URL || "").replace(/\/$/, "");
  }
  return _ingestionApiUrl;
}
