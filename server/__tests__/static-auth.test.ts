import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { serveStatic } from "../static";

let originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function base64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signWidgetToken(): string {
  const signingInput = `${base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${base64Url(JSON.stringify({
    iss: "therapylog-dev",
    aud: "sdac-widget-loader",
    sub: "user-1",
    scope: "sdac-widget:load",
    exp: Math.floor(Date.now() / 1000) + 600,
  }))}`;
  const signature = crypto
    .createHmac("sha256", "test-secret")
    .update(signingInput)
    .digest();
  return `${signingInput}.${base64Url(signature)}`;
}

function createApp() {
  process.env.WIDGET_AUTH_REQUIRED = "true";
  process.env.WIDGET_JWT_HS256_SECRET = "test-secret";
  process.env.WIDGET_JWT_ISSUER = "therapylog-dev";
  process.env.WIDGET_JWT_AUDIENCE = "sdac-widget-loader";
  process.env.WIDGET_JWT_REQUIRED_SCOPE = "sdac-widget:load";
  process.env.PUBLIC_BASE_PATH = "/widget";

  const distPath = fs.mkdtempSync(path.join(os.tmpdir(), "sdac-widget-static-"));
  fs.writeFileSync(path.join(distPath, "embed.js"), "window.__embedLoaded = true;");
  fs.writeFileSync(path.join(distPath, "index.html"), "<html><body>Widget app</body></html>");
  fs.mkdirSync(path.join(distPath, "assets"));
  fs.writeFileSync(path.join(distPath, "assets", "app.js"), "window.__assetLoaded = true;");

  const app = express();
  serveStatic(app, { distPath });
  return { app, distPath };
}

describe("static widget auth", () => {
  it("requires a widget token for embed.js", async () => {
    const { app, distPath } = createApp();
    const res = await request(app).get("/widget/embed.js");
    fs.rmSync(distPath, { recursive: true, force: true });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Widget token required");
  });

  it("serves embed.js with a valid widget token", async () => {
    const { app, distPath } = createApp();
    const res = await request(app).get(`/widget/embed.js?widget_token=${signWidgetToken()}`);
    fs.rmSync(distPath, { recursive: true, force: true });

    expect(res.status).toBe(200);
    expect(res.text).toContain("__embedLoaded");
  });

  it("protects the widget app entry but leaves built assets cacheable", async () => {
    const { app, distPath } = createApp();
    const denied = await request(app).get("/widget");
    const allowed = await request(app).get(`/widget?widget_token=${signWidgetToken()}`);
    const asset = await request(app).get("/widget/assets/app.js");
    fs.rmSync(distPath, { recursive: true, force: true });

    expect(denied.status).toBe(401);
    expect(allowed.status).toBe(200);
    expect(allowed.text).toContain("Widget app");
    expect(asset.status).toBe(200);
    expect(asset.text).toContain("__assetLoaded");
  });
});
