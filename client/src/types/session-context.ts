/**
 * Session Context Types
 *
 * Minimal context passed from widget to Mastra agent.
 * Report data is fetched by Mastra from the database using the reportId.
 */

/**
 * Basic user information for personalization
 */
export interface UserInfo {
  /** User's display name */
  name: string;

  /** User's role (e.g., "District Admin", "State Reviewer") */
  role: string;

  /** User ID for tracking (required for conversation persistence) */
  id: string;
}

/**
 * Session context passed to the Mastra agent
 *
 * Keep this minimal - Mastra fetches report data from DB using reportId
 */
export interface SessionContext {
  /** Report ID - Mastra uses this to fetch all report data from DB */
  reportId: string;

  /** Conversation ID - null for new conversation, Mastra returns one */
  conversationId: string | null;

  /** Browser session ID - persists for tab lifetime */
  sessionId: string;

  /** Basic user info for personalization */
  user: UserInfo;

  /** Platform identifier */
  platform: "sdac-widget";

  /** Client timestamp */
  timestamp: string;

  /** Current UI state (optional - helps agent understand user's focus) */
  ui?: {
    /** Current view in the widget */
    currentView?: "main" | "chat" | "issues";

    /** If user is focused on a specific issue */
    selectedIssueId?: number;

    /** If user is focused on a specific personnel record */
    selectedPersonnelId?: number;
  };
}

/**
 * Creates a session context object
 */
export function createSessionContext(options: {
  reportId: string;
  conversationId: string | null;
  sessionId: string;
  user: UserInfo;
  ui?: SessionContext["ui"];
}): SessionContext {
  return {
    reportId: options.reportId,
    conversationId: options.conversationId,
    sessionId: options.sessionId,
    user: options.user,
    platform: "sdac-widget",
    timestamp: new Date().toISOString(),
    ui: options.ui,
  };
}
