const SESSION_ID_KEY = "sdac-session-id";
const SERVER_SESSION_ID_KEY = "sdac-server-session-id";
const CONVERSATION_KEY_PREFIX = "sdac-conversation-";
const UPLOADED_REPORT_ID_KEY = "sdac-uploaded-report-id";

function createUuid(): string {
  return crypto.randomUUID();
}

export function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = createUuid();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function getConversationStorageKey(reportId: string): string {
  return `${CONVERSATION_KEY_PREFIX}${reportId}`;
}

export function getConversationId(reportId: string): string | null {
  if (!reportId) return null;
  return sessionStorage.getItem(getConversationStorageKey(reportId));
}

export function saveConversationId(reportId: string, conversationId: string): void {
  if (!reportId || !conversationId) return;
  sessionStorage.setItem(getConversationStorageKey(reportId), conversationId);
}

export function clearConversationId(reportId: string): void {
  if (!reportId) return;
  sessionStorage.removeItem(getConversationStorageKey(reportId));
}

export function getUploadedReportId(): string | null {
  return sessionStorage.getItem(UPLOADED_REPORT_ID_KEY);
}

export function saveUploadedReportId(reportId: string): void {
  if (!reportId) return;
  sessionStorage.setItem(UPLOADED_REPORT_ID_KEY, reportId);
}

export function clearUploadedReportId(): void {
  sessionStorage.removeItem(UPLOADED_REPORT_ID_KEY);
}

/** Server-managed session ID (from Ingestion Server) */
export function getServerSessionId(): string | null {
  return sessionStorage.getItem(SERVER_SESSION_ID_KEY);
}

export function saveServerSessionId(sessionId: string): void {
  if (!sessionId) return;
  sessionStorage.setItem(SERVER_SESSION_ID_KEY, sessionId);
}

export function clearServerSessionId(): void {
  sessionStorage.removeItem(SERVER_SESSION_ID_KEY);
}

export const sessionManager = {
  getOrCreateSessionId,
  getServerSessionId,
  saveServerSessionId,
  clearServerSessionId,
  getConversationId,
  saveConversationId,
  clearConversationId,
  getUploadedReportId,
  saveUploadedReportId,
  clearUploadedReportId,
};
