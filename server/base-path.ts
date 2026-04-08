function normalizeBasePath(rawValue?: string | null): string {
  const raw = (rawValue ?? "").trim();
  if (!raw || raw === "/") {
    return "";
  }

  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function getPublicBasePath(): string {
  return normalizeBasePath(
    process.env.PUBLIC_BASE_PATH ?? process.env.VITE_PUBLIC_BASE_PATH ?? "",
  );
}

export function buildBasePathRoute(
  routePath: string,
  basePath = getPublicBasePath(),
): string {
  if (!routePath.startsWith("/")) {
    throw new Error(`Expected absolute route path, received: ${routePath}`);
  }

  if (!basePath) {
    return routePath;
  }

  return routePath === "/" ? basePath : `${basePath}${routePath}`;
}
