import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";
import crypto from "crypto";
import { registerRoutes } from "../routes";
import { resetIngestionAuthCacheForTests } from "../auth/ingestion-auth";

// Point proxy at a port with nothing listening so tests are deterministic
const UNUSED_PORT = "http://localhost:19999";
let origEnv: NodeJS.ProcessEnv;

beforeAll(() => {
  origEnv = { ...process.env };
  process.env.INGESTION_API_URL = UNUSED_PORT;
});
afterAll(() => {
  process.env = origEnv;
});
afterEach(() => {
  process.env = { ...origEnv, INGESTION_API_URL: UNUSED_PORT };
  resetIngestionAuthCacheForTests();
});

function base64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signWidgetToken(overrides: Record<string, unknown> = {}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: "therapylog-dev",
    aud: "sdac-widget-loader",
    sub: "user-1",
    scope: "sdac-widget:load",
    exp: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto
    .createHmac("sha256", "test-secret")
    .update(signingInput)
    .digest();
  return `${signingInput}.${base64Url(signature)}`;
}

function enableWidgetAuth() {
  process.env.WIDGET_AUTH_REQUIRED = "true";
  process.env.WIDGET_JWT_HS256_SECRET = "test-secret";
  process.env.WIDGET_JWT_ISSUER = "therapylog-dev";
  process.env.WIDGET_JWT_AUDIENCE = "sdac-widget-loader";
  process.env.WIDGET_JWT_REQUIRED_SCOPE = "sdac-widget:load";
}

function enableWidgetRoleAuth() {
  process.env.WIDGET_AUTH_REQUIRED = "true";
  process.env.WIDGET_JWT_HS256_SECRET = "test-secret";
  process.env.WIDGET_JWT_ISSUER = "therapylog-dev";
  process.env.WIDGET_JWT_AUDIENCE = "sdac-widget-loader";
  process.env.WIDGET_JWT_REQUIRED_ROLE = "access_as_application";
}

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

  it("returns the legacy /health endpoint", async () => {
    const app = express();
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("exposes runtime config from /api/config", async () => {
    const app = express();
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("agentId");
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

  it("rejects ingestion proxy requests without a widget token when auth is required", async () => {
    enableWidgetAuth();
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).get("/api/ingestion/sdac/costs");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Widget token required");
  });

  it("allows ingestion proxy requests with a valid widget token", async () => {
    enableWidgetAuth();
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app)
      .get("/api/ingestion/sdac/costs")
      .set("Authorization", `Bearer ${signWidgetToken()}`);
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Proxy error");
  });

  it("allows client credentials widget tokens with the required app role", async () => {
    enableWidgetRoleAuth();
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app)
      .get("/api/ingestion/sdac/costs")
      .set("Authorization", `Bearer ${signWidgetToken({
        scope: undefined,
        roles: ["access_as_application"],
      })}`);
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Proxy error");
  });

  it("rejects client credentials widget tokens missing the required app role", async () => {
    enableWidgetRoleAuth();
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app)
      .get("/api/ingestion/sdac/costs")
      .set("Authorization", `Bearer ${signWidgetToken({
        scope: undefined,
        roles: ["other-role"],
      })}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Widget token role is invalid");
  });

  it("injects service auth when proxying to ingestion", async () => {
    enableWidgetAuth();
    process.env.INGESTION_BEARER_TOKEN = "upstream-token";
    process.env.INGESTION_APIM_SUBSCRIPTION_KEY = "sub-key";

    const upstream = express();
    upstream.use(express.json());
    upstream.post("/sdac/sessions", (req, res) => {
      res.json({
        authorization: req.header("authorization"),
        subscriptionKey: req.header("ocp-apim-subscription-key"),
      });
    });
    const upstreamServer = upstream.listen(0);
    const address = upstreamServer.address();
    if (!address || typeof address === "string") {
      upstreamServer.close();
      throw new Error("Unable to start upstream test server");
    }

    process.env.INGESTION_API_URL = `http://127.0.0.1:${address.port}`;
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app)
      .post("/api/ingestion/sdac/sessions")
      .set("Authorization", `Bearer ${signWidgetToken()}`)
      .send({ district_id: "364" });

    upstreamServer.close();

    expect(res.status).toBe(200);
    expect(res.body.authorization).toBe("Bearer upstream-token");
    expect(res.body.subscriptionKey).toBe("sub-key");
  });

  it("mirrors health and proxy routes under the configured base path", async () => {
    process.env.PUBLIC_BASE_PATH = "/widget";
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const healthRes = await request(app).get("/widget/health");
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe("ok");

    const configRes = await request(app).get("/widget/api/config");
    expect(configRes.status).toBe(200);
    expect(configRes.body).toHaveProperty("agentId");

    const proxyRes = await request(app).get("/widget/api/ingestion/sdac/costs");
    expect(proxyRes.status).toBe(502);
    expect(proxyRes.body.error).toBe("Proxy error");

    delete process.env.PUBLIC_BASE_PATH;
  });
});
