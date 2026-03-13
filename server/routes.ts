import type { Express, Request, Response } from "express";
import type { Server } from "http";

/**
 * Widget Server Routes
 *
 * The widget calls the Ingestion Server directly for all API operations
 * (chat, feedback, validation, uploads, sessions, costs).
 *
 * This Express server only serves static files and provides a health check.
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/config", (_req: Request, res: Response) => {
    return res.json({
      ingestionApiUrl: (process.env.INGESTION_API_URL || "").replace(/\/$/, ""),
    });
  });

  console.log("[routes] Health check + config routes registered (all API calls go direct to Ingestion Server)");
  return httpServer;
}
