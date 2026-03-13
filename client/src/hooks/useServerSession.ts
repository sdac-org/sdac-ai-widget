/**
 * Server Session Hook
 *
 * Manages the server-side session lifecycle with the Ingestion Server.
 * Creates or resumes a session on mount, validates on visibility change.
 *
 * Sessions are district-scoped. The Ingestion Server returns an existing
 * active session for the same (districtId, userId) pair, or creates a new one.
 */

import { useEffect, useRef, useState } from "react";
import { createSession } from "@/lib/session-api";
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
  /** Whether the session is being initialized */
  isInitializing: boolean;
  /** Error message if session creation failed */
  error: string | null;
}

export function useServerSession(options: UseServerSessionOptions): UseServerSessionReturn {
  const { districtId, userId, userName, userEmail, userRole } = options;
  const [serverSessionId, setServerSessionId] = useState<string | null>(
    () => getServerSessionId()
  );
  const [reportId, setReportId] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [quarter, setQuarter] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!districtId || initRef.current) return;
    initRef.current = true;

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
  }, [districtId, userId, userName, userEmail, userRole]);

  return { serverSessionId, reportId, districtName, quarter, year, isInitializing, error };
}
