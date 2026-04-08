import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { createIngestionProxy } from "./ingestion-proxy";
import { buildBasePathRoute, getPublicBasePath } from "./base-path";

/**
 * Widget Server Routes
 *
 * The widget browser only talks to its own Express backend (same-origin).
 * All Ingestion Server traffic is proxied server-to-server via /api/ingestion.
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const basePath = getPublicBasePath();
  const routePrefixes = ["", basePath].filter(
    (value, index, values) => value || values.indexOf(value) === index,
  );

  const healthHandler = (_req: Request, res: Response) => {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  };

  const configHandler = (_req: Request, res: Response) => {
    return res.json({
      agentId: process.env.SDAC_AGENT_ID || process.env.MASTRA_AGENT_ID || null,
    });
  };

  for (const routePrefix of routePrefixes) {
    app.get(buildBasePathRoute("/health", routePrefix), healthHandler);
    app.get(buildBasePathRoute("/api/health", routePrefix), healthHandler);
    app.get(buildBasePathRoute("/api/config", routePrefix), configHandler);
    app.use(buildBasePathRoute("/api/ingestion", routePrefix), createIngestionProxy());
  }

  console.log(
    `[routes] Health check + ingestion proxy registered (basePath=${basePath || "/"}, /api/ingestion -> Ingestion Server)`,
  );
  return httpServer;
}
