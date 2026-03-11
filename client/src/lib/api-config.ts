/**
 * API Configuration
 *
 * Centralizes the Ingestion Server URL used by all API clients.
 * The widget calls the Ingestion Server directly (no Express proxy).
 */

let _ingestionApiUrl: string | null = null;

/**
 * Returns the Ingestion Server base URL.
 * Configured via VITE_INGESTION_API_URL env var.
 * Falls back to same-origin for backward compatibility.
 */
export function getIngestionApiUrl(): string {
  if (_ingestionApiUrl === null) {
    _ingestionApiUrl = (import.meta.env.VITE_INGESTION_API_URL || "").replace(/\/$/, "");
  }
  return _ingestionApiUrl;
}
