import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { buildBasePathRoute, getPublicBasePath } from "./base-path";
import { requireWidgetAuth } from "./auth/widget-auth";

export function serveStatic(app: Express, options: { distPath?: string } = {}) {
  const distPath = options.distPath ? path.resolve(options.distPath) : path.resolve(__dirname, "public");
  const indexPath = path.resolve(distPath, "index.html");
  const basePath = getPublicBasePath();
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const sendEmbed = (_req: express.Request, res: express.Response) => {
    res.sendFile(path.resolve(distPath, "embed.js"));
  };
  app.get("/embed.js", requireWidgetAuth, sendEmbed);
  if (basePath) {
    app.get(buildBasePathRoute("/embed.js", basePath), requireWidgetAuth, sendEmbed);
  }

  const sendIndex = (_req: express.Request, res: express.Response) => {
    if (!basePath) {
      res.sendFile(indexPath);
      return;
    }

    fs.readFile(indexPath, "utf8", (err, html) => {
      if (err) {
        res.status(500).send("Widget app is not available");
        return;
      }

      res.type("html").send(rewriteRootAssetUrls(html, basePath));
    });
  };

  if (basePath) {
    app.get(basePath, requireWidgetAuth, sendIndex);
  }

  app.use(express.static(distPath, { index: false, redirect: false }));
  if (basePath) {
    app.use(basePath, express.static(distPath, { index: false, redirect: false }));
    app.get(buildBasePathRoute("/{*path}", basePath), requireWidgetAuth, sendIndex);
  }

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", requireWidgetAuth, sendIndex);
}

function rewriteRootAssetUrls(html: string, basePath: string): string {
  const normalizedBasePath = basePath.replace(/\/+$/, "");
  if (!normalizedBasePath) {
    return html;
  }

  return html.replace(
    /\b(src|href)=["']\/(assets\/|favicon\.[^"']*)/g,
    (_match, attribute: string, assetPath: string) => `${attribute}="${normalizedBasePath}/${assetPath}`,
  );
}
