import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";
import { registerRoutes } from "../routes";

// Point proxy at a port with nothing listening so tests are deterministic
const UNUSED_PORT = "http://localhost:19999";
let origEnv: string | undefined;

beforeAll(() => {
  origEnv = process.env.INGESTION_API_URL;
  process.env.INGESTION_API_URL = UNUSED_PORT;
});
afterAll(() => {
  if (origEnv !== undefined) process.env.INGESTION_API_URL = origEnv;
  else delete process.env.INGESTION_API_URL;
});

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

  it("does not expose /api/config endpoint", async () => {
    const app = express();
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).get("/api/config");
    expect(res.status).toBe(404);
  });

  it("mounts ingestion proxy at /api/ingestion", async () => {
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    // Without a running upstream, proxy requests should return 502
    const res = await request(app).get("/api/ingestion/sdac/costs");
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Proxy error");
  });
});
