/**
 * Server Session Hook
 *
 * Manages the server-side session lifecycle with the Ingestion Server.
 * Creates or resumes a session on mount, validates on visibility change.
 *
 * Sessions are page-context scoped on the client. Any district, user, quarter,
 * or year change starts a fresh server bootstrap.
 */

import { useEffect, useRef, useState } from "react";
import { createSession } from "@/lib/session-api";
import { getHostPageContext } from "@/hooks/useHostPageContext";
import {
  getServerSessionId,
  saveServerSessionId,
  clearServerSessionId,
} from "@/lib/session-manager";

interface UseServerSessionOptions {
  /** District ID from host page */
  districtId: string;
  /** User info for session creation */
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

interface UseServerSessionReturn {
  /** Server session ID (null until initialized) */
  serverSessionId: string | null;
  /** Report ID resolved from TherapyLog sync (null if unavailable) */
  reportId: string | null;
  /** District name resolved from server (null if unavailable) */
  districtName: string | null;
  /** Quarter from server session (null if unavailable) */
  quarter: string | null;
  /** Year from server session (null if unavailable) */
  year: number | null;
  /** How the server resolved report context for this session */
  resolutionStatus: "exact_match" | "fallback_available" | "no_data" | "missing_context" | null;
  /** Requested quarter from host page context */
  requestedQuarter: string | null;
  /** Requested year from host page context */
  requestedYear: number | null;
  /** Best available fallback period when exact match is unavailable */
  fallbackCandidate: {
    quarter: string;
    year: number;
    record_count?: number;
  } | null;
  /** Whether the session is being initialized */
  isInitializing: boolean;
  /** Error message if session creation failed */
  error: string | null;
}

export function useServerSession(options: UseServerSessionOptions): UseServerSessionReturn {
  const { districtId, userId, userName, userEmail, userRole } = options;
  const hostContext = getHostPageContext();
  const [serverSessionId, setServerSessionId] = useState<string | null>(
    () => getServerSessionId()
  );
  const [reportId, setReportId] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [quarter, setQuarter] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<UseServerSessionReturn["resolutionStatus"]>(null);
  const [requestedQuarter, setRequestedQuarter] = useState<string | null>(null);
  const [requestedYear, setRequestedYear] = useState<number | null>(null);
  const [fallbackCandidate, setFallbackCandidate] = useState<UseServerSessionReturn["fallbackCandidate"]>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initKeyRef = useRef<string | null>(null);
  const contextKey = [
    districtId,
    userId ?? "",
    userName ?? "",
    userEmail ?? "",
    userRole ?? "",
    hostContext.quarter ?? "",
    hostContext.year ?? "",
  ].join("::");

  useEffect(() => {
    if (!districtId) return;
    if (initKeyRef.current === contextKey) return;
    initKeyRef.current = contextKey;

    setServerSessionId(null);
    setReportId(null);
    setDistrictName(null);
    setQuarter(null);
    setYear(null);
    setResolutionStatus(null);
    setRequestedQuarter(null);
    setRequestedYear(null);
    setFallbackCandidate(null);

    const init = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // Always call createSession on page load.
        // The server handles deduplication: if an active session exists for
        // (districtId, userId) it returns it; otherwise it creates a new one.
        clearServerSessionId();

        const session = await createSession({
          districtId,
          userId,
          userName,
          userEmail,
          userRole,
          quarter: hostContext.quarter,
          year: hostContext.year,
        });

        saveServerSessionId(session.session_id);
        setServerSessionId(session.session_id);

        if (session.report_id) {
          setReportId(session.report_id);
        }
        if (session.district_name) {
          setDistrictName(session.district_name);
        }
        if (session.quarter) {
          setQuarter(session.quarter);
        }
        if (session.year != null) {
          setYear(session.year);
        }
        setResolutionStatus(session.resolution_status ?? null);
        setRequestedQuarter(session.requested_quarter ?? null);
        setRequestedYear(session.requested_year ?? null);
        setFallbackCandidate(session.fallback_candidate ?? null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Session creation failed";
        console.warn("[useServerSession] Session init failed:", msg);
        setError(msg);
        // Non-blocking: widget still works without server session
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [contextKey, districtId, userId, userName, userEmail, userRole, hostContext.quarter, hostContext.year]);

  return {
    serverSessionId,
    reportId,
    districtName,
    quarter,
    year,
    resolutionStatus,
    requestedQuarter,
    requestedYear,
    fallbackCandidate,
    isInitializing,
    error,
  };
}
