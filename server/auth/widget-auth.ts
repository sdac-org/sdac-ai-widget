import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type JwtPayload = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  scope?: string;
  scp?: string;
  permissions?: string[];
  roles?: string[];
  [key: string]: unknown;
};

type Jwk = crypto.JsonWebKey & {
  kid?: string;
  alg?: string;
};

type JwksCache = {
  expiresAt: number;
  keys: Jwk[];
};

const AUTH_REQUIRED_VALUES = new Set(["1", "true", "yes", "required"]);
const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_MS = 5 * 60 * 1000;

let jwksCache: JwksCache | null = null;

function isWidgetAuthRequired(): boolean {
  return AUTH_REQUIRED_VALUES.has((process.env.WIDGET_AUTH_REQUIRED || "").toLowerCase());
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function parseJwt(token: string): {
  header: JwtHeader;
  payload: JwtPayload;
  signingInput: string;
  signature: Buffer;
} {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Token is not a compact JWT");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8")) as JwtHeader;
  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as JwtPayload;

  return {
    header,
    payload,
    signingInput: `${encodedHeader}.${encodedPayload}`,
    signature: base64UrlDecode(encodedSignature),
  };
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyHs256(token: ReturnType<typeof parseJwt>, secret: string): boolean {
  if (token.header.alg !== "HS256") return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(token.signingInput)
    .digest();
  return timingSafeEqual(expected, token.signature);
}

async function fetchJwks(): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const jwksUrl = process.env.WIDGET_JWT_JWKS_URL;
  if (!jwksUrl) {
    return [];
  }

  const response = await fetch(jwksUrl, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch widget JWT JWKS: ${response.status}`);
  }

  const body = (await response.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache = { keys, expiresAt: now + JWKS_CACHE_MS };
  return keys;
}

async function verifyAsymmetricJwt(token: ReturnType<typeof parseJwt>): Promise<boolean> {
  if (token.header.alg !== "RS256" && token.header.alg !== "ES256") {
    return false;
  }

  const keys = await fetchJwks();
  const candidates = keys.filter((key) => !token.header.kid || key.kid === token.header.kid);
  const verifyAlgorithm = token.header.alg === "RS256" ? "RSA-SHA256" : "SHA256";

  for (const key of candidates) {
    try {
      const publicKey = crypto.createPublicKey({ key, format: "jwk" });
      const verifier = crypto.createVerify(verifyAlgorithm);
      verifier.update(token.signingInput);
      verifier.end();
      if (verifier.verify(publicKey, token.signature)) {
        return true;
      }
    } catch {
      // Try the next key. Invalid or unsupported keys should not make auth fail closed
      // if another matching key is available in the JWKS.
    }
  }

  return false;
}

function validateClaims(payload: JwtPayload): void {
  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_SECONDS < now) {
    throw new Error("Widget token is expired");
  }
  if (typeof payload.nbf === "number" && payload.nbf - CLOCK_SKEW_SECONDS > now) {
    throw new Error("Widget token is not active yet");
  }

  const expectedIssuer = process.env.WIDGET_JWT_ISSUER;
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    throw new Error("Widget token issuer is invalid");
  }

  const expectedAudience = process.env.WIDGET_JWT_AUDIENCE;
  if (expectedAudience) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
    if (!audiences.includes(expectedAudience)) {
      throw new Error("Widget token audience is invalid");
    }
  }

  const requiredScope = process.env.WIDGET_JWT_REQUIRED_SCOPE;
  if (requiredScope) {
    const scopes = `${payload.scope || ""} ${payload.scp || ""}`.split(/\s+/).filter(Boolean);
    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
    if (!scopes.includes(requiredScope) && !permissions.includes(requiredScope)) {
      throw new Error("Widget token scope is invalid");
    }
  }

  const requiredRole = process.env.WIDGET_JWT_REQUIRED_ROLE;
  if (requiredRole) {
    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.includes(requiredRole)) {
      throw new Error("Widget token role is invalid");
    }
  }
}

export function extractWidgetToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice("bearer ".length).trim() || null;
  }

  const headerToken = req.header("x-widget-token") || req.header("x-sdac-widget-token");
  if (headerToken) {
    return headerToken.trim();
  }

  const queryToken = req.query.widget_token || req.query.token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

export async function verifyWidgetToken(rawToken: string): Promise<JwtPayload> {
  const token = parseJwt(rawToken);
  const hsSecret = process.env.WIDGET_JWT_HS256_SECRET || process.env.WIDGET_JWT_SECRET;
  const signatureValid = hsSecret
    ? verifyHs256(token, hsSecret)
    : await verifyAsymmetricJwt(token);

  if (!signatureValid) {
    throw new Error("Widget token signature is invalid");
  }

  validateClaims(token.payload);
  return token.payload;
}

export async function requireWidgetAuth(req: Request, res: Response, next: NextFunction) {
  if (!isWidgetAuthRequired()) {
    return next();
  }

  const token = extractWidgetToken(req);
  if (!token) {
    return res.status(401).json({ error: "Widget token required" });
  }

  try {
    await verifyWidgetToken(token);
    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Widget token rejected";
    return res.status(401).json({ error: message });
  }
}

export function resetWidgetAuthCacheForTests() {
  jwksCache = null;
}
