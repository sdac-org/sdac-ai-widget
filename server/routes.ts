import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { createIngestionProxy } from "./ingestion-proxy";

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
  app.get("/api/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/config", (_req: Request, res: Response) => {
    return res.json({
      agentId: process.env.MASTRA_AGENT_ID || null,
    });
  });

  app.use("/api/ingestion", createIngestionProxy());

  console.log(
    "[routes] Health check + ingestion proxy registered (/api/ingestion -> Ingestion Server)",
  );
  return httpServer;
}
