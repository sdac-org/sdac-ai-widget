import { describe, it, expect } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";
import { registerRoutes } from "../routes";

describe("server routes", () => {
  it("returns health check", async () => {
    const app = express();
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("returns 404 for removed proxy routes", async () => {
    const app = express();
    const server = createServer(app);
    await registerRoutes(server, app);

    // All proxy routes were removed -- widget calls Ingestion Server directly
    const removedRoutes = [
      { method: "post", path: "/api/agent-chat" },
      { method: "post", path: "/api/sdac/feedback" },
      { method: "post", path: "/api/validate-report" },
      { method: "get", path: "/api/report-info/some-id" },
      { method: "post", path: "/api/upload/ingestion" },
      { method: "post", path: "/api/upload/sdac" },
      { method: "get", path: "/api/upload/jobs/some-job" },
      { method: "get", path: "/api/upload/sdac/reports/some-id" },
    ];

    for (const { method, path } of removedRoutes) {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(404);
    }
  });
});
