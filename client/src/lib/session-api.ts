/**
 * Session API Client
 *
 * Calls the Ingestion Server directly for session management.
 * Sessions are district-scoped and managed server-side.
 */

import { getIngestionApiUrl } from "./api-config";

export interface SessionResponse {
  session_id: string;
  district_id: string;
  expires_at: string;
  is_new: boolean;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  user_role?: string | null;
}

export async function createSession(params: {
  districtId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}): Promise<SessionResponse> {
  const url = `${getIngestionApiUrl()}/sdac/sessions`;
  console.log("[session-api] Creating session for district:", params.districtId);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      district_id: params.districtId,
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      user_name: params.userName || null,
      user_role: params.userRole || null,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create session");
  }

  const result = await response.json();
  console.log("[session-api] Session created:", result.session_id, "is_new:", result.is_new);
  return result;
}

export async function validateSession(sessionId: string): Promise<SessionResponse | null> {
  const url = `${getIngestionApiUrl()}/sdac/sessions/${sessionId}`;
  console.log("[session-api] Validating session:", sessionId);

  const response = await fetch(url);
  if (response.status === 404) {
    console.log("[session-api] Session expired or not found");
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to validate session");
  }
  return response.json();
}
