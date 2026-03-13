/**
 * Server-side Session Context
 *
 * Minimal enrichment of client context.
 * Report data is fetched by Mastra from DB - we just pass through the IDs.
 */

/**
 * Client context received from the widget
 */
export interface ClientContext {
  /** Report ID - Mastra fetches report data from DB */
  reportId: string;

  /** Basic user info */
  user: {
    name: string;
    role: string;
    id?: string;
  };

  /** Platform identifier */
  platform: string;

  /** Client timestamp */
  timestamp: string;

  /** UI state */
  ui?: {
    currentView?: string;
    selectedIssueId?: number;
    selectedPersonnelId?: number;
  };
}

/**
 * Server-enriched context
 */
export interface EnrichedContext extends ClientContext {
  /** Server metadata */
  server: {
    timestamp: string;
    sessionId?: string;
    requestId?: string;
  };
}

/**
 * Options for enriching context
 */
export interface EnrichContextOptions {
  sessionId?: string;
  requestId?: string;
}

/**
 * Enriches client context with minimal server-side data
 *
 * @param clientContext - Context from the client
 * @param options - Session/request IDs
 * @returns Enriched context
 */
export async function enrichSessionContext(
  clientContext: ClientContext | undefined,
  options: EnrichContextOptions = {}
): Promise<EnrichedContext | null> {
  if (!clientContext) {
    return null;
  }

  return {
    ...clientContext,
    server: {
      timestamp: new Date().toISOString(),
      sessionId: options.sessionId,
      requestId: options.requestId,
    },
  };
}
