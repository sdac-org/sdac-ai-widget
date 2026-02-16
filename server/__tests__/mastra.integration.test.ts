import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";
import { registerRoutes } from "../routes";

const mastraBaseUrl = process.env.MASTRA_BASE_URL;
const reportId = process.env.MASTRA_INTEGRATION_REPORT_ID;
const agentId = process.env.MASTRA_INTEGRATION_AGENT_ID ?? process.env.MASTRA_AGENT_ID;

const describeIntegration = mastraBaseUrl && reportId ? describe : describe.skip;

describeIntegration("mastra integration", () => {
  let app: express.Express;

  beforeAll(async () => {
    if (!mastraBaseUrl || !reportId) return;
    process.env.MASTRA_BASE_URL = mastraBaseUrl;
    if (agentId) {
      process.env.MASTRA_AGENT_ID = agentId;
    }

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const server = createServer(app);
    await registerRoutes(server, app);
  });

  it("validates a report via Mastra", async () => {
    const res = await request(app)
      .post("/api/validate-report")
      .send({ reportId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ reportId }));
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("fetches report info via Mastra", async () => {
    const res = await request(app)
      .get(`/api/report-info/${reportId}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ reportId }));
  });
});