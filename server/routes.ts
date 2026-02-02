import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

/**
 * Request payload from the widget (simplified - backend manages history)
 */
interface AgentChatRequest {
  agentId?: string;
  conversationId?: string | null;
  reportId: string;
  userId: string;
  sessionId: string;
  message: string;
  stream?: boolean;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Simple health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    console.log("[routes] /api/health called");
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  console.log("[routes] Registering /api/agent-chat route...");

  app.post("/api/agent-chat", async (req: Request, res: Response) => {
    console.log("[routes] /api/agent-chat called");
    const {
      agentId: bodyAgentId,
      conversationId,
      reportId,
      userId,
      sessionId,
      message,
      stream,
    } = (req.body ?? {}) as AgentChatRequest;

    const agentId = bodyAgentId || process.env.MASTRA_AGENT_ID;
    if (!agentId) {
      return res.status(400).json({
        error: "Missing agentId. Set MASTRA_AGENT_ID on the server or pass agentId in the request body.",
      });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message string is required." });
    }

    if (!reportId) {
      return res.status(400).json({ error: "reportId is required." });
    }

    // New endpoint handles session management server-side
    // Note: Custom Mastra routes are NOT under /api prefix (built-in routes like /api/agents are)
    const baseUrl = (process.env.MASTRA_BASE_URL || "http://localhost:4111").replace(/\/$/, "");
    const endpoint = `${baseUrl}/sdac/chat`;

    // Build payload for new /api/sdac/chat endpoint
    const payload = {
      reportId,
      message,
      userId,
      sessionId,
      ...(conversationId && { conversationId }),  // Only include if truthy
    };

    console.log("[routes] Calling Mastra SDAC chat:", endpoint);
    console.log("[routes] Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[routes] Mastra response status:", response.status);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        console.log("[routes] Mastra error:", JSON.stringify(errorPayload));
        return res.status(response.status).json({ error: errorPayload?.error ?? errorPayload ?? "Chat request failed" });
      }

      // New endpoint always streams - forward SSE response
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: "Stream unavailable from Mastra" });
      }

      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          const chunk = decoder.decode(result.value, { stream: !done });
          res.write(chunk);
        }
      }

      res.end();
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach Mastra agent";
      return res.status(502).json({ error: errorMessage });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  console.log("[routes] All routes registered successfully");
  return httpServer;
}
