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
  report_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  district_name?: string | null;
  quarter?: string | null;
  year?: number | null;
  resolution_status?: "exact_match" | "fallback_available" | "no_data" | "missing_context";
  requested_quarter?: string | null;
  requested_year?: number | null;
  fallback_candidate?: {
    quarter: string;
    year: number;
    record_count?: number;
  } | null;
}

export interface SyncDistrictResponse {
  report_id?: string | null;
  status?: string | null;
  record_count?: number;
  synced?: boolean;
  district_name?: string | null;
  quarter?: string | null;
  year?: number | null;
  fallback?: boolean;
  requested_quarter?: string | null;
  requested_year?: number | null;
  available_quarters?: Array<{
    quarter: string;
    year: number;
    record_count?: number;
  }>;
  resolution_status?: "exact_match" | "fallback_available" | "no_data" | "missing_context";
  fallback_candidate?: {
    quarter: string;
    year: number;
    record_count?: number;
  } | null;
  error?: string;
}

export async function createSession(params: {
  districtId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  quarter?: string;
  year?: string;
}): Promise<SessionResponse> {
  const normalizedQuarter = normalizeQuarter(params.quarter);
  const normalizedYear = normalizeYear(params.year);
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
      quarter: normalizedQuarter,
      year: normalizedYear,
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

export async function syncDistrictReport(params: {
  districtId: string;
  quarter?: string;
  year?: string;
  allowFallback?: boolean;
  force?: boolean;
}): Promise<SyncDistrictResponse> {
  const normalizedQuarter = normalizeQuarter(params.quarter);
  const normalizedYear = normalizeYear(params.year);
  const url = `${getIngestionApiUrl()}/sdac/sync`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      district_id: params.districtId,
      quarter: normalizedQuarter,
      year: normalizedYear,
      allow_fallback: params.allowFallback ?? false,
      force: params.force ?? false,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Failed to sync district report");
  }

  return result as SyncDistrictResponse;
}

function normalizeQuarter(quarter?: string): number | null {
  if (!quarter) return null;
  const match = quarter.trim().match(/^Q?([1-4])$/i);
  if (!match) return null;
  return Number(match[1]);
}

function normalizeYear(year?: string): number | null {
  if (!year) return null;
  const trimmed = year.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  return Number(trimmed);
}
