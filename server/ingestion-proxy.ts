/**
 * Ingestion Server Proxy
 *
 * Routes all widget API traffic through the Express backend to the Ingestion Server.
 * This eliminates cross-origin requests: the browser only talks to its own origin,
 * and the Express server proxies server-to-server to the Ingestion Server.
 *
 * Handles three request patterns:
 *   - SSE streaming (/sdac/chat) -- pipes response stream back to client
 *   - File uploads (/sdac/upload, /ingestion) -- forwards raw multipart body
 *   - JSON requests (everything else) -- forwards parsed body, returns JSON
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { addIngestionServiceHeaders } from "./auth/ingestion-auth";

/** Hop-by-hop headers that must not be forwarded between proxies. */
const HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
]);

function getUpstreamUrl(): string {
  return (process.env.INGESTION_API_URL || "http://localhost:8000").replace(
    /\/$/,
    "",
  );
}

/** Forward relevant request headers to upstream. */
async function buildUpstreamHeaders(req: Request): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (req.headers["content-type"])
    headers["content-type"] = req.headers["content-type"];
  if (req.headers["accept"]) headers["accept"] = req.headers["accept"];
  return addIngestionServiceHeaders(headers);
}

/** Copy upstream response headers to the client response, skipping hop-by-hop. */
function copyResponseHeaders(upstream: globalThis.Response, res: Response) {
  upstream.headers.forEach((value, key) => {
    if (!HOP_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });
}

/** Pipe a ReadableStream to an Express response. */
async function pipeStream(
  stream: ReadableStream<Uint8Array>,
  res: Response,
): Promise<void> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Build the fetch body for a proxied request.
 *
 * - GET/HEAD: no body
 * - JSON/urlencoded: express.json() already consumed the stream, use the saved rawBody buffer
 * - Multipart/other: stream the unconsumed request body directly
 */
function buildFetchBody(req: Request): {
  body: BodyInit | undefined;
  duplex: "half" | undefined;
} {
  if (req.method === "GET" || req.method === "HEAD") {
    return { body: undefined, duplex: undefined };
  }

  // express.json() saves the raw buffer via its `verify` callback
  if ((req as any).rawBody) {
    return { body: (req as any).rawBody as Buffer, duplex: undefined };
  }

  if (req.is("application/json") && req.body !== undefined) {
    return { body: Buffer.from(JSON.stringify(req.body)), duplex: undefined };
  }

  // Multipart or other content-type -- body stream is unconsumed, pipe directly
  return { body: req as any, duplex: "half" };
}

export function createIngestionProxy(): Router {
  const router = Router();

  // ------------------------------------------------------------------
  // SSE streaming proxy for /sdac/chat
  // ------------------------------------------------------------------
  router.post("/sdac/chat", async (req: Request, res: Response) => {
    const upstream = `${getUpstreamUrl()}/sdac/chat`;
    try {
      const upstreamRes = await fetch(upstream, {
        method: "POST",
        headers: await addIngestionServiceHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min chat timeout
      });

      res.status(upstreamRes.status);
      copyResponseHeaders(upstreamRes, res);

      if (!upstreamRes.body) return res.end();
      await pipeStream(upstreamRes.body, res);
      res.end();
    } catch (err) {
      console.error("[ingestion-proxy] /sdac/chat error:", err);
      if (!res.headersSent) {
        res.status(502).json({ error: "Proxy error", message: String(err) });
      }
    }
  });

  // ------------------------------------------------------------------
  // Generic catch-all proxy for all other routes
  // ------------------------------------------------------------------
  // Uses router.use() which matches any method on any sub-path.
  // req.url has the /api/ingestion prefix already stripped by Express mounting.
  router.use(async (req: Request, res: Response) => {
    const upstream = `${getUpstreamUrl()}${req.url}`;
    try {
      const { body, duplex } = buildFetchBody(req);
      const fetchOpts: RequestInit & { duplex?: string } = {
        method: req.method,
        headers: await buildUpstreamHeaders(req),
        signal: AbortSignal.timeout(60_000), // 60s default timeout
      };
      if (body !== undefined) {
        fetchOpts.body = body;
        if (duplex) fetchOpts.duplex = duplex;
      }

      const upstreamRes = await fetch(upstream, fetchOpts);

      res.status(upstreamRes.status);
      copyResponseHeaders(upstreamRes, res);

      if (!upstreamRes.body) return res.end();
      await pipeStream(upstreamRes.body, res);
      res.end();
    } catch (err) {
      console.error(`[ingestion-proxy] ${req.method} ${req.url} error:`, err);
      if (!res.headersSent) {
        res.status(502).json({ error: "Proxy error", message: String(err) });
      }
    }
  });

  return router;
}
