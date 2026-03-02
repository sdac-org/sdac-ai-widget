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
import { createSession, validateSession } from "@/lib/session-api";
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
        // Check if we have an existing server session
        const existingId = getServerSessionId();
        if (existingId) {
          const session = await validateSession(existingId);
          if (session) {
            setServerSessionId(session.session_id);
            setIsInitializing(false);
            return;
          }
          // Session expired or invalid, clear and create new
          clearServerSessionId();
        }

        // Create new session
        const session = await createSession({
          districtId,
          userId,
          userName,
          userEmail,
          userRole,
        });

        saveServerSessionId(session.session_id);
        setServerSessionId(session.session_id);
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

  return { serverSessionId, isInitializing, error };
}
