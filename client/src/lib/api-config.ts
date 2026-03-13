/**
 * API Configuration
 *
 * All Ingestion Server traffic goes through the widget's own Express backend
 * at /api/ingestion (same-origin, no CORS needed). The Express server proxies
 * to the Ingestion Server server-to-server.
 */

/**
 * Returns the base URL for Ingestion Server API calls.
 * Always relative -- the widget backend proxies to the real Ingestion Server.
 */
export function getIngestionApiUrl(): string {
  return "/api/ingestion";
}
