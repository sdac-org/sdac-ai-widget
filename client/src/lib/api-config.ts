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

/**
 * Runtime server config fetched once from GET /api/config.
 * Values come from the Express server's process.env so they can be
 * changed via App Service settings without rebuilding the container.
 */
interface ServerConfig {
  agentId: string | null;
}

let configPromise: Promise<ServerConfig> | null = null;

export function getServerConfig(): Promise<ServerConfig> {
  if (!configPromise) {
    configPromise = fetch("/api/config")
      .then((r) => r.json())
      .catch(() => ({ agentId: null }));
  }
  return configPromise;
}
