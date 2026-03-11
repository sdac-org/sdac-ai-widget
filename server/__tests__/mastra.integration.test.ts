import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";
import { registerRoutes } from "../routes";

/**
 * Integration tests for the widget Express server.
 *
 * The widget server is now a static file server + health check.
 * All API integration tests (chat, validate, feedback, uploads)
 * should target the Ingestion Server directly.
 */
describe("widget server integration", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);
  });

  it("health check returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
