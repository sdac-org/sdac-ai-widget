/**
 * Session Context Hook
 *
 * Manages session context with conversation persistence.
 * - sessionId: persists for browser tab lifetime (sessionStorage)
 * - conversationId: persists per report for tab lifetime (sessionStorage), null for new conversations
 *
 * Note: Conversation IDs are now tab-scoped (sessionStorage) rather than persistent (localStorage).
 * This ensures fresh conversations on new browser sessions and avoids stale conversation loads.
 * Mastra owns the conversation ID - we just store what it returns.
 */

import { useMemo, useState, useCallback } from "react";
import { createSessionContext, type SessionContext, type UserInfo } from "@/types/session-context";

// Storage keys
const SESSION_ID_KEY = "sdac-session-id";
const CONVERSATION_KEY_PREFIX = "sdac-conversation-";
const UPLOADED_REPORT_ID_KEY = "sdac-uploaded-report-id";

/**
 * Get or create a browser session ID
 * Persists for the lifetime of the browser tab
 */
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Get conversation ID for a specific report (tab-scoped)
 * Returns null if no conversation exists (new conversation)
 */
function getConversationId(reportId: string): string | null {
  if (!reportId) return null;
  // Use sessionStorage for tab-scoped persistence (not localStorage)
  return sessionStorage.getItem(`${CONVERSATION_KEY_PREFIX}${reportId}`);
}

/**
 * Save conversation ID for a specific report (tab-scoped)
 */
function saveConversationId(reportId: string, conversationId: string): void {
  if (!reportId || !conversationId) return;
  // Use sessionStorage for tab-scoped persistence (not localStorage)
  sessionStorage.setItem(`${CONVERSATION_KEY_PREFIX}${reportId}`, conversationId);
}

/**
 * Clear conversation ID for a specific report (start fresh)
 */
export function clearConversationId(reportId: string): void {
  if (!reportId) return;
  sessionStorage.removeItem(`${CONVERSATION_KEY_PREFIX}${reportId}`);
}

/**
 * Get the uploaded report ID (ephemeral, clears on refresh)
 */
export function getUploadedReportId(): string | null {
  return sessionStorage.getItem(UPLOADED_REPORT_ID_KEY);
}

/**
 * Save the uploaded report ID (ephemeral, clears on refresh)
 */
export function saveUploadedReportId(reportId: string): void {
  if (!reportId) return;
  sessionStorage.setItem(UPLOADED_REPORT_ID_KEY, reportId);
}

/**
 * Clear the uploaded report ID
 */
export function clearUploadedReportId(): void {
  sessionStorage.removeItem(UPLOADED_REPORT_ID_KEY);
}

interface UseSessionContextOptions {
  /** Report ID (Mastra fetches report data from DB) */
  reportId: string;

  /** User info */
  user: UserInfo;

  /** Current UI state */
  ui?: SessionContext["ui"];
}

interface UseSessionContextReturn {
  /** Session context to send to agent */
  context: SessionContext;

  /** Report ID for convenience */
  reportId: string;

  /** User info for convenience */
  user: UserInfo;

  /** Current conversation ID (null if new) */
  conversationId: string | null;

  /** Update conversation ID (call when Mastra returns a new one) */
  setConversationId: (id: string) => void;

  /** Clear conversation and start fresh */
  clearConversation: () => void;

  /** Check if this is a new conversation */
  isNewConversation: boolean;
}

/**
 * Hook for managing session context with conversation persistence
 *
 * @example
 * ```tsx
 * const { context, setConversationId, clearConversation } = useSessionContext({
 *   reportId: "8201EDC2-...",
 *   user: { id: "user@example.com", name: "John Doe", role: "District Admin" },
 * });
 *
 * // After receiving response from Mastra
 * if (response.conversationId && !context.conversationId) {
 *   setConversationId(response.conversationId);
 * }
 *
 * // To start a new conversation
 * clearConversation();
 * ```
 */
export function useSessionContext(options: UseSessionContextOptions): UseSessionContextReturn {
  const { reportId, user, ui } = options;

  // Session ID persists for tab lifetime
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  // Conversation ID persists per report in localStorage
  const [conversationId, setConversationIdState] = useState<string | null>(
    () => getConversationId(reportId)
  );

  // Update conversation ID and persist to localStorage
  const setConversationId = useCallback((id: string) => {
    setConversationIdState(id);
    saveConversationId(reportId, id);
  }, [reportId]);

  // Clear conversation (start fresh)
  const clearConversation = useCallback(() => {
    setConversationIdState(null);
    clearConversationId(reportId);
  }, [reportId]);

  // Build the session context
  const context = useMemo(
    () => createSessionContext({
      reportId,
      conversationId,
      sessionId,
      user,
      ui,
    }),
    [reportId, conversationId, sessionId, user.name, user.role, user.id, ui?.currentView, ui?.selectedIssueId, ui?.selectedPersonnelId]
  );

  return {
    context,
    reportId,
    user,
    conversationId,
    setConversationId,
    clearConversation,
    isNewConversation: conversationId === null,
  };
}
