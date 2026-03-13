/**
 * Response Parser
 *
 * Parses agent responses from raw content.
 * All responses must be valid JSON.
 */

import type { AgentResponse, ResponseType } from "./types";

/**
 * Result of parsing an agent response
 */
export interface ParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** The parsed response (if successful) */
  response?: AgentResponse;
  /** Error message (if parsing failed) */
  error?: string;
}

/**
 * Known response types
 */
const KNOWN_TYPES: ResponseType[] = [
  "text",
  "fringe_analysis",
  "comparison",
  "issue_detail",
  "feedback_draft",
  "summary",
  "metric_card",
  "data_table",
  "action_list",
];

/**
 * Parse an agent response from raw content
 *
 * Supports two formats:
 * 1. JSON: { type: string, data: object, intro?: string, outro?: string }
 * 2. Markdown: Plain text (wrapped as text type automatically)
 *
 * @param content - Raw response content from the agent
 * @returns ParseResult with success status and parsed response
 *
 * @example
 * ```ts
 * // JSON response
 * const result = parseAgentResponse('{"type":"text","data":{"content":"Hello"}}');
 * // result.response = { type: "text", data: { content: "Hello" } }
 *
 * // Markdown response
 * const result = parseAgentResponse('Here is **bold** text');
 * // result.response = { type: "text", data: { content: "Here is **bold** text" } }
 * ```
 */
export function parseAgentResponse(content: string): ParseResult {
  const trimmed = content.trim();

  // Empty content is an error
  if (!trimmed) {
    return {
      success: false,
      error: "Empty response",
    };
  }

  // Try JSON if it looks like JSON
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);

      // Validate basic structure
      if (!parsed.type) {
        return {
          success: false,
          error: "Invalid response: missing 'type' field",
        };
      }

      if (parsed.data === undefined) {
        return {
          success: false,
          error: "Invalid response: missing 'data' field",
        };
      }

      return {
        success: true,
        response: parsed as AgentResponse,
      };
    } catch (e) {
      return {
        success: false,
        error: `JSON parse error: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }
  }

  // Not JSON - treat as markdown text
  return {
    success: true,
    response: {
      type: "text",
      data: { content: trimmed },
    },
  };
}

/**
 * Check if a response type is known/supported
 *
 * @param type - The type string to check
 * @returns True if the type has a registered renderer
 */
export function isKnownType(type: string): type is ResponseType {
  return KNOWN_TYPES.includes(type as ResponseType);
}
