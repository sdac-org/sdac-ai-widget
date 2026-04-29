const TOKEN_QUERY_PARAM = "widget_token";
const TOKEN_STORAGE_KEY = "sdac-widget-token";

function readTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;

  const token = new URLSearchParams(window.location.search).get(TOKEN_QUERY_PARAM);
  if (token) {
    try {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage can be unavailable in embedded/private contexts; in-memory URL
      // extraction still works for the current page load.
    }
    return token;
  }

  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getWidgetAuthToken(): string | null {
  return readTokenFromLocation();
}

export function withWidgetAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getWidgetAuthToken();
  if (!token) {
    return headers;
  }

  const nextHeaders = new Headers(headers);
  nextHeaders.set("Authorization", `Bearer ${token}`);
  return nextHeaders;
}
