type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

const TOKEN_REFRESH_SKEW_MS = 60_000;

let cachedToken: CachedToken | null = null;

function getEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function shouldUseClientCredentials(): boolean {
  return Boolean(
    getEnv("INGESTION_TENANT_ID", "AZURE_TENANT_ID")
      && getEnv("INGESTION_CLIENT_ID", "AZURE_CLIENT_ID")
      && getEnv("INGESTION_CLIENT_SECRET", "AZURE_CLIENT_SECRET")
      && getEnv("INGESTION_SCOPE", "AZURE_SCOPE"),
  );
}

async function fetchClientCredentialsToken(): Promise<CachedToken | null> {
  const tenantId = getEnv("INGESTION_TENANT_ID", "AZURE_TENANT_ID");
  const clientId = getEnv("INGESTION_CLIENT_ID", "AZURE_CLIENT_ID");
  const clientSecret = getEnv("INGESTION_CLIENT_SECRET", "AZURE_CLIENT_SECRET");
  const scope = getEnv("INGESTION_SCOPE", "AZURE_SCOPE");

  if (!tenantId || !clientId || !clientSecret || !scope) {
    return null;
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope,
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to acquire ingestion token: ${response.status}`);
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new Error("Ingestion token response did not include access_token");
  }

  return {
    accessToken: body.access_token,
    expiresAt: Date.now() + Math.max(60, body.expires_in || 3600) * 1000,
  };
}

async function fetchManagedIdentityToken(): Promise<CachedToken | null> {
  const resource = getEnv("INGESTION_AUDIENCE", "INGESTION_RESOURCE");
  if (!resource || !process.env.IDENTITY_ENDPOINT) {
    return null;
  }

  const url = new URL(process.env.IDENTITY_ENDPOINT);
  url.searchParams.set("api-version", "2019-08-01");
  url.searchParams.set("resource", resource);

  const clientId = getEnv("INGESTION_MANAGED_IDENTITY_CLIENT_ID", "AZURE_CLIENT_ID");
  if (clientId) {
    url.searchParams.set("client_id", clientId);
  }

  const response = await fetch(url, {
    headers: {
      "x-identity-header": process.env.IDENTITY_HEADER || "",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to acquire managed identity ingestion token: ${response.status}`);
  }

  const body = (await response.json()) as {
    access_token?: string;
    expires_on?: string | number;
    expires_in?: string | number;
  };
  if (!body.access_token) {
    throw new Error("Managed identity response did not include access_token");
  }

  const expiresOn = Number(body.expires_on);
  const expiresIn = Number(body.expires_in);
  return {
    accessToken: body.access_token,
    expiresAt: Number.isFinite(expiresOn) && expiresOn > 0
      ? expiresOn * 1000
      : Date.now() + Math.max(60, Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  };
}

export async function getIngestionAuthorizationHeader(): Promise<string | null> {
  const staticBearerToken = getEnv("INGESTION_BEARER_TOKEN");
  if (staticBearerToken) {
    return staticBearerToken.toLowerCase().startsWith("bearer ")
      ? staticBearerToken
      : `Bearer ${staticBearerToken}`;
  }

  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now()) {
    return `Bearer ${cachedToken.accessToken}`;
  }

  const authMode = getEnv("INGESTION_AUTH_MODE").toLowerCase();
  if (authMode === "none" || authMode === "disabled") {
    return null;
  }

  const nextToken = authMode === "managed_identity"
    ? await fetchManagedIdentityToken()
    : shouldUseClientCredentials()
      ? await fetchClientCredentialsToken()
      : await fetchManagedIdentityToken();

  cachedToken = nextToken;
  return nextToken ? `Bearer ${nextToken.accessToken}` : null;
}

export async function addIngestionServiceHeaders(headers: Record<string, string>): Promise<Record<string, string>> {
  const authorization = await getIngestionAuthorizationHeader();
  if (authorization) {
    headers.authorization = authorization;
  }

  const subscriptionKey = getEnv("INGESTION_APIM_SUBSCRIPTION_KEY", "APIM_SUBSCRIPTION_KEY");
  if (subscriptionKey) {
    headers["ocp-apim-subscription-key"] = subscriptionKey;
  }

  return headers;
}

export function resetIngestionAuthCacheForTests() {
  cachedToken = null;
}
