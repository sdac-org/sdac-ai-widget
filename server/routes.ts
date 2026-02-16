import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";

// Configure multer for memory storage (files stored in buffer)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Request payload from the widget (simplified - backend manages history)
 */
interface AgentChatRequest {
  agentId?: string;
  conversationId?: string | null;
  reportId?: string;  // Optional - agent will ask for report if not provided
  userId: string;
  sessionId: string;
  message: string;
  stream?: boolean;
}

/**
 * Feedback payload from widget
 */
interface FeedbackRequest {
  conversationSk?: number;
  conversationId?: string;
  reportId: string;
  userId: string;
  sessionId: string;
  agentId: string;
  feedbackScope: "response" | "conversation";
  turnNumber?: number;
  rating?: number;
  category?: string;
  comment: string;
}

/**
 * Issue returned from validation API
 */
interface ValidationIssue {
  id: number;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  amount: number | null;
  category: string;
  recordId?: number;
}

/**
 * Validation response from Mastra
 */
interface ValidationResponse {
  reportId: string;
  districtName: string;
  quarter: string;
  totalRecords: number;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    passedCount: number;
    analysisTime: number;
  };
}

/**
 * Report info response from Mastra
 */
interface ReportInfoResponse {
  reportId: string;
  districtName: string;
  quarter: string;
  positions: number;
  totalSalary: number;
  totalFringe: number;
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

    // reportId is optional - agent will ask user to upload a report if not provided
    // New endpoint handles session management server-side
    // Note: Custom Mastra routes are NOT under /api prefix (built-in routes like /api/agents are)
    const baseUrl = (process.env.MASTRA_BASE_URL || "http://localhost:4111").replace(/\/$/, "");
    const endpoint = `${baseUrl}/sdac/chat`;

    // Build payload for new /api/sdac/chat endpoint
    const payload = {
      message,
      userId,
      sessionId,
      ...(reportId && { reportId }),  // Only include if truthy
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Feedback Proxy Endpoint
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("[routes] Registering /sdac/feedback route...");
  console.log("[routes] Registering /api/sdac/feedback route...");

  const handleFeedbackProxy = async (req: Request, res: Response) => {
    console.log(`[routes] ${req.path} called`);
    const payload = (req.body ?? {}) as FeedbackRequest;

    const payloadSummary = {
      reportId: payload.reportId,
      userId: payload.userId,
      sessionId: payload.sessionId,
      agentId: payload.agentId,
      feedbackScope: payload.feedbackScope,
      conversationSk: payload.conversationSk,
      conversationId: payload.conversationId,
      turnNumber: payload.turnNumber,
      category: payload.category,
      commentLength: typeof payload.comment === "string" ? payload.comment.length : 0,
    };

    const validationIssues: string[] = [];
    if (!payload.reportId) validationIssues.push("reportId is required");
    if (!payload.userId) validationIssues.push("userId is required");
    if (!payload.sessionId) validationIssues.push("sessionId is required");
    if (!payload.agentId) validationIssues.push("agentId is required");
    if (!payload.feedbackScope || !["response", "conversation"].includes(payload.feedbackScope)) {
      validationIssues.push("feedbackScope must be response or conversation");
    }
    if (!payload.category) validationIssues.push("category is required");
    if (!payload.comment || !payload.comment.trim()) validationIssues.push("comment is required");

    const hasConversationTarget =
      typeof payload.conversationSk === "number" ||
      (typeof payload.conversationId === "string" && payload.conversationId.trim().length > 0);

    if (!hasConversationTarget) {
      validationIssues.push("conversationSk or conversationId is required");
    }

    if (validationIssues.length > 0) {
      console.warn("[routes] Feedback payload validation warning:", {
        issues: validationIssues,
        payload: payloadSummary,
      });
    }

    const baseUrl = (process.env.MASTRA_BASE_URL || "http://localhost:4111").replace(/\/$/, "");
    const endpoint = `${baseUrl}/sdac/feedback`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        console.error("[routes] Feedback upstream rejected payload:", {
          status: response.status,
          endpoint,
          error: errorPayload?.error,
          details: errorPayload?.details,
          payload: payloadSummary,
        });
        return res.status(response.status).json({
          error: errorPayload?.error ?? "Feedback request failed",
          details: errorPayload?.details,
        });
      }

      const data = await response.json().catch(() => ({}));
      return res.status(200).json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach Mastra";
      console.error("[routes] Feedback proxy error:", {
        error: errorMessage,
        endpoint,
        payload: payloadSummary,
      });
      return res.status(502).json({ error: errorMessage });
    }
  };

  app.post("/sdac/feedback", handleFeedbackProxy);
  app.post("/api/sdac/feedback", handleFeedbackProxy);

  // ─────────────────────────────────────────────────────────────────────────────
  // Validate Report Endpoint
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("[routes] Registering /api/validate-report route...");

  app.post("/api/validate-report", async (req: Request, res: Response) => {
    console.log("[routes] /api/validate-report called");
    const { reportId, forceRefresh } = req.body ?? {};

    if (!reportId) {
      return res.status(400).json({ error: "reportId is required" });
    }

    const baseUrl = (process.env.MASTRA_BASE_URL || "http://localhost:4111").replace(/\/$/, "");
    const endpoint = `${baseUrl}/sdac/validate`;

    console.log("[routes] Calling Mastra validate:", endpoint);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, forceRefresh: forceRefresh ?? false }),
      });

      console.log("[routes] Mastra validate response status:", response.status);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        console.log("[routes] Mastra validate error:", JSON.stringify(errorPayload));
        return res.status(response.status).json({ 
          error: errorPayload?.error ?? "Validation failed",
          details: errorPayload?.details 
        });
      }

      const data: ValidationResponse = await response.json();
      return res.json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach Mastra";
      console.error("[routes] Validate error:", errorMessage);
      return res.status(502).json({ error: errorMessage });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Report Info Endpoint
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("[routes] Registering /api/report-info route...");

  app.get("/api/report-info/:reportId", async (req: Request, res: Response) => {
    const { reportId } = req.params;
    console.log("[routes] /api/report-info called for:", reportId);

    if (!reportId) {
      return res.status(400).json({ error: "reportId is required" });
    }

    const baseUrl = (process.env.MASTRA_BASE_URL || "http://localhost:4111").replace(/\/$/, "");
    const endpoint = `${baseUrl}/sdac/report/${reportId}`;

    console.log("[routes] Calling Mastra report info:", endpoint);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      console.log("[routes] Mastra report info response status:", response.status);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: errorPayload?.error ?? "Failed to get report info",
          details: errorPayload?.details 
        });
      }

      const data: ReportInfoResponse = await response.json();
      return res.json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach Mastra";
      console.error("[routes] Report info error:", errorMessage);
      return res.status(502).json({ error: errorMessage });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // ─────────────────────────────────────────────────────────────────────────────
  // Ingestion Server Upload Proxy Routes
  // ─────────────────────────────────────────────────────────────────────────────
  const ingestionBaseUrl = (process.env.INGESTION_API_URL || "http://localhost:8000").replace(/\/$/, "");
  console.log("[routes] Ingestion server URL configured:", ingestionBaseUrl);

  // Startup health check for ingestion server
  (async () => {
    try {
      console.log("[routes] Checking ingestion server connectivity...");
      const healthCheck = await fetch(`${ingestionBaseUrl}/`, {
        method: "GET",
        signal: AbortSignal.timeout(5000)
      });
      console.log("[routes] ✓ Ingestion server is reachable (status:", healthCheck.status + ")");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn("[routes] ⚠ Ingestion server is NOT reachable at", ingestionBaseUrl);
      console.warn("[routes] ⚠ File uploads will fail until the ingestion server is running");
      console.warn("[routes] ⚠ Error:", errorMessage);
    }
  })();

  console.log("[routes] Registering /api/upload/ingestion route...");

  // Generic file upload proxy
  app.post("/api/upload/ingestion", upload.single("upload"), async (req: Request, res: Response) => {
    console.log("[routes] /api/upload/ingestion called");

    if (!req.file) {
      console.log("[routes] No file provided in upload request");
      return res.status(400).json({ error: "No file provided" });
    }

    console.log("[routes] Uploading file:", req.file.originalname, "Size:", req.file.size, "bytes");

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("upload", blob, req.file.originalname);

    const endpoint = `${ingestionBaseUrl}/ingestion`;
    console.log("[routes] Forwarding to ingestion server:", endpoint);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      console.log("[routes] Ingestion server response status:", response.status);
      const htmlText = await response.text();

      if (!response.ok) {
        console.log("[routes] Ingestion server error:", htmlText.substring(0, 200));
        return res.status(response.status).json({
          error: `Upload failed with status ${response.status}`,
          html: htmlText
        });
      }

      // Parse HTML to extract job_id
      const jobIdMatch = htmlText.match(/job-([a-f0-9\-]+)/i);
      const jobId = jobIdMatch ? `job-${jobIdMatch[1]}` : undefined;

      console.log("[routes] Ingestion upload successful, jobId:", jobId || "not found in response");

      return res.json({
        success: true,
        message: "File uploaded successfully.",
        jobId,
        html: htmlText,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach ingestion server";
      console.error("[routes] Ingestion server connection error:", errorMessage);
      return res.status(502).json({ error: errorMessage });
    }
  });

  // SDAC report upload proxy
  console.log("[routes] Registering /api/upload/sdac route...");

  app.post("/api/upload/sdac", upload.single("upload"), async (req: Request, res: Response) => {
    console.log("[routes] /api/upload/sdac called");

    if (!req.file) {
      console.log("[routes] No file provided in SDAC upload request");
      return res.status(400).json({ error: "No file provided" });
    }

    const { user_email, user_name, district, force_reingest } = req.body;

    if (!user_email || !user_name || !district) {
      console.log("[routes] Missing required fields: user_email, user_name, or district");
      return res.status(400).json({ error: "user_email, user_name, and district are required" });
    }

    console.log("[routes] Uploading SDAC file:", req.file.originalname, "Size:", req.file.size, "bytes");
    console.log("[routes] User:", user_name, "Email:", user_email, "District:", district, force_reingest ? "(force re-ingest)" : "");

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("upload", blob, req.file.originalname);
    formData.append("user_email", user_email);
    formData.append("user_name", user_name);
    formData.append("district", district);
    if (force_reingest === "true" || force_reingest === true) {
      formData.append("force_reingest", "true");
    }

    const endpoint = `${ingestionBaseUrl}/sdac/upload`;
    console.log("[routes] Forwarding to ingestion server:", endpoint);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      console.log("[routes] Ingestion server response status:", response.status);
      const responseText = await response.text();

      if (!response.ok) {
        console.log("[routes] SDAC upload error:", responseText.substring(0, 200));
        return res.status(response.status).json({
          error: `SDAC upload failed with status ${response.status}`,
          html: responseText
        });
      }

      // Try to parse as JSON first (Ingestion Server returns JSON)
      let jsonData: any = null;
      try {
        jsonData = JSON.parse(responseText);
      } catch {
        // Not JSON, fallback to HTML parsing
      }

      let reportId: string | undefined;
      let isDuplicate = false;
      let canReingest = false;
      let existingReport: { district: string; quarter: string; year: number; processed_at: string | null } | undefined;

      if (jsonData) {
        // JSON response from Ingestion Server
        reportId = jsonData.report_id;
        isDuplicate = jsonData.status === 'duplicate' || jsonData.message?.includes('already been uploaded') || jsonData.message?.includes('already processed');
        canReingest = jsonData.can_reingest === true || isDuplicate;
        existingReport = jsonData.existing_report;
        console.log("[routes] SDAC upload JSON response, reportId:", reportId, isDuplicate ? "(duplicate)" : "");
      } else {
        // HTML response fallback
        const reportIdMatch =
          responseText.match(/Report ID:\s*<\/strong>\s*<code>([a-f0-9\-]+)<\/code>/i) ||
          responseText.match(/report_id[:\s]+([a-f0-9\-]+)/i) ||
          responseText.match(/report-([a-f0-9\-]+)/i);
        reportId = reportIdMatch ? reportIdMatch[1] : undefined;
        isDuplicate = /already (been )?uploaded|already processed|duplicate file detected/i.test(responseText);
        canReingest = isDuplicate;
        console.log("[routes] SDAC upload HTML response, reportId:", reportId, isDuplicate ? "(duplicate)" : "");
      }

      return res.json({
        success: true,
        message: isDuplicate
          ? "This file was already uploaded. You can use the existing report or re-ingest under a new ID."
          : "SDAC report uploaded successfully.",
        reportId,
        isDuplicate,
        canReingest,
        existingReport,
        html: jsonData ? undefined : responseText,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach ingestion server";
      console.error("[routes] SDAC ingestion server connection error:", errorMessage);
      return res.status(502).json({ error: errorMessage });
    }
  });

  // Ingestion job status check proxy
  console.log("[routes] Registering /api/upload/jobs/:jobId route...");

  app.get("/api/upload/jobs/:jobId", async (req: Request, res: Response) => {
    const { jobId } = req.params;
    console.log("[routes] /api/upload/jobs called for:", jobId);

    const endpoint = `${ingestionBaseUrl}/jobs/${jobId}`;
    console.log("[routes] Forwarding to ingestion server:", endpoint);

    try {
      const response = await fetch(endpoint);

      console.log("[routes] Ingestion server job status response:", response.status);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to check job status" });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach ingestion server";
      console.error("[routes] Job status check error:", errorMessage);
      return res.status(502).json({ error: errorMessage });
    }
  });

  // SDAC report status check proxy
  console.log("[routes] Registering /api/upload/sdac/reports/:reportId route...");

  app.get("/api/upload/sdac/reports/:reportId", async (req: Request, res: Response) => {
    const { reportId } = req.params;
    console.log("[routes] /api/upload/sdac/reports called for:", reportId);

    const endpoint = `${ingestionBaseUrl}/sdac/reports/${reportId}`;
    console.log("[routes] Forwarding to ingestion server:", endpoint);

    try {
      const response = await fetch(endpoint);

      console.log("[routes] SDAC report status response:", response.status);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to check report status" });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to reach ingestion server";
      console.error("[routes] SDAC report status check error:", errorMessage);
      return res.status(502).json({ error: errorMessage });
    }
  });

  console.log("[routes] All routes registered successfully");
  return httpServer;
}
