import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";
import { registerRoutes } from "../routes";

const createStreamResponse = (body: string) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("server routes", () => {
  beforeEach(async () => {
    process.env.MASTRA_BASE_URL = "http://mastra.local";
    process.env.INGESTION_API_URL = "http://ingestion.local";
    process.env.MASTRA_AGENT_ID = "sdac-coordinator-release";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when agentId is missing", async () => {
    process.env.MASTRA_AGENT_ID = "";
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    global.fetch = vi.fn(async () => jsonResponse({})) as typeof fetch;
    await registerRoutes(server, app);

    const res = await request(app).post("/api/agent-chat").send({
      message: "Hello",
      userId: "user-1",
      sessionId: "session-1",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing agentId/i);
  });

  it("returns 400 when message is missing", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    global.fetch = vi.fn(async () => jsonResponse({})) as typeof fetch;
    await registerRoutes(server, app);

    const res = await request(app).post("/api/agent-chat").send({
      userId: "user-1",
      sessionId: "session-1",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message string is required/i);
  });

  it("forwards agent chat requests", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/sdac/chat")) {
        return createStreamResponse("event: done\ndata: {\"success\":true}\n\n");
      }
      return jsonResponse({ status: "ok" });
    });
    global.fetch = fetchMock as typeof fetch;

    await registerRoutes(server, app);

    const res = await request(app).post("/api/agent-chat").send({
      message: "Hello",
      userId: "user-1",
      sessionId: "session-1",
      reportId: "report-1",
    });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/i);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://mastra.local/sdac/chat",
      expect.any(Object)
    );
  });

  it("forwards feedback requests", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/sdac/feedback")) {
        return jsonResponse({ success: true, feedbackSk: 123 });
      }
      return jsonResponse({ status: "ok" });
    });
    global.fetch = fetchMock as typeof fetch;

    await registerRoutes(server, app);

    const res = await request(app).post("/api/sdac/feedback").send({
      conversationSk: 42,
      reportId: "8201EDC2-2EDE-4CA1-AF44-D0F5AA185CDB",
      userId: "user-1",
      sessionId: "session-1",
      agentId: "sdac-coordinator-release",
      feedbackScope: "response",
      turnNumber: 1,
      category: "clarity",
      comment: "Needs more detail",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://mastra.local/sdac/feedback",
      expect.any(Object)
    );
  });

  it("forwards domain feedback requests", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/sdac/feedback")) {
        return jsonResponse({ success: true, feedbackSk: 456 });
      }
      return jsonResponse({ status: "ok" });
    });
    global.fetch = fetchMock as typeof fetch;

    await registerRoutes(server, app);

    const res = await request(app).post("/sdac/feedback").send({
      conversationSk: 99,
      reportId: "F5BAE2DB-1D7D-40E8-9FBB-9C3D6AC2D9C2",
      userId: "user-2",
      sessionId: "session-2",
      agentId: "sdac-coordinator-release",
      feedbackScope: "conversation",
      turnNumber: 2,
      category: "accuracy",
      comment: "Conversation had incorrect assumptions",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://mastra.local/sdac/feedback",
      expect.any(Object)
    );
  });

  it("logs a warning when feedback payload is missing conversation target", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/sdac/feedback")) {
        return jsonResponse({ success: true, feedbackSk: 789 });
      }
      return jsonResponse({ status: "ok" });
    });
    global.fetch = fetchMock as typeof fetch;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await registerRoutes(server, app);

    const res = await request(app).post("/api/sdac/feedback").send({
      reportId: "8201EDC2-2EDE-4CA1-AF44-D0F5AA185CDB",
      userId: "user-1",
      sessionId: "session-1",
      agentId: "sdac-coordinator-release",
      feedbackScope: "conversation",
      category: "clarity",
      comment: "No conversation target in payload",
    });

    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledWith(
      "[routes] Feedback payload validation warning:",
      expect.objectContaining({
        issues: expect.arrayContaining(["conversationSk or conversationId is required"]),
      })
    );
  });

  it("returns 400 for validate-report without reportId", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    global.fetch = vi.fn(async () => jsonResponse({})) as typeof fetch;
    await registerRoutes(server, app);

    const res = await request(app).post("/api/validate-report").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reportId is required/i);
  });

  it("forwards validate-report", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/sdac/validate")) {
        return jsonResponse({ reportId: "report-1", issues: [] });
      }
      return jsonResponse({ status: "ok" });
    });
    global.fetch = fetchMock as typeof fetch;

    await registerRoutes(server, app);

    const res = await request(app).post("/api/validate-report").send({
      reportId: "report-1",
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://mastra.local/sdac/validate",
      expect.any(Object)
    );
  });

  it("returns 400 for report-info without reportId", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    global.fetch = vi.fn(async () => jsonResponse({})) as typeof fetch;
    await registerRoutes(server, app);

    const res = await request(app).get("/api/report-info/");
    expect(res.status).toBe(404);
  });

  it("forwards report-info", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/sdac/report/")) {
        return jsonResponse({ reportId: "report-1", districtName: "North" });
      }
      return jsonResponse({ status: "ok" });
    });
    global.fetch = fetchMock as typeof fetch;

    await registerRoutes(server, app);

    const res = await request(app).get("/api/report-info/report-1");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://mastra.local/sdac/report/report-1",
      expect.any(Object)
    );
  });

  it("returns 400 for ingestion upload without file", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    global.fetch = vi.fn(async () => jsonResponse({})) as typeof fetch;
    await registerRoutes(server, app);

    const res = await request(app).post("/api/upload/ingestion");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No file provided/i);
  });

  it("returns 400 for sdac upload without file", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    global.fetch = vi.fn(async () => jsonResponse({})) as typeof fetch;
    await registerRoutes(server, app);

    const res = await request(app).post("/api/upload/sdac");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No file provided/i);
  });

  it("returns 400 for sdac upload missing metadata", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    global.fetch = vi.fn(async () => jsonResponse({})) as typeof fetch;
    await registerRoutes(server, app);

    const res = await request(app)
      .post("/api/upload/sdac")
      .attach("upload", Buffer.from("dummy"), "report.xlsx")
      .field("user_email", "user@example.com");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user_email, user_name, and district/i);
  });

  it("surfaces upstream sdac upload validation message", async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/sdac/upload")) {
        return jsonResponse(
          {
            status: "error",
            error_code: "INVALID_SDAC_TEMPLATE",
            error_category: "wrong_file_format",
            message:
              "Invalid SDAC file format. Please upload the standard SDAC cost report template (.xlsx or .xls) with the expected headers.",
            details: ["Expected header labels include: Source, Function, Job Title, First Name, Last Name, Gross Salary."],
          },
          400
        );
      }
      return jsonResponse({ status: "ok" });
    });
    global.fetch = fetchMock as typeof fetch;

    await registerRoutes(server, app);

    const res = await request(app)
      .post("/api/upload/sdac")
      .attach("upload", Buffer.from("dummy"), "invalid.xlsx")
      .field("user_email", "user@example.com")
      .field("user_name", "Demo User")
      .field("district", "Demo District");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid SDAC file format/i);
    expect(res.body.errorCode).toBe("INVALID_SDAC_TEMPLATE");
    expect(res.body.errorCategory).toBe("wrong_file_format");
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.stringMatching(/Expected header labels/i)])
    );
  });
});
