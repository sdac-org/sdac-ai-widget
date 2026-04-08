import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { buildBasePathRoute, getPublicBasePath } from "./base-path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const indexPath = path.resolve(distPath, "index.html");
  const basePath = getPublicBasePath();
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  if (basePath) {
    app.use(basePath, express.static(distPath));
  }

  const sendIndex = (_req: express.Request, res: express.Response) => {
    res.sendFile(indexPath);
  };

  if (basePath) {
    app.get(basePath, sendIndex);
    app.get(buildBasePathRoute("/{*path}", basePath), sendIndex);
  }

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", sendIndex);
}
