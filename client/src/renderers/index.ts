/**
 * Structured Response Renderers
 *
 * This module provides the rendering system for agent responses.
 *
 * @example
 * ```tsx
 * import { MessageRenderer } from "@/renderers";
 *
 * // In your component:
 * <MessageRenderer
 *   content={message.content}
 *   onAction={handleAction}
 *   isStreaming={isStreaming}
 * />
 * ```
 */

// Main component
export { MessageRenderer } from "./MessageRenderer";

// Types
export type {
  AgentResponse,
  ResponseMeta,
  ResponseType,
  ResponseTypeMap,
  TypedResponse,
  RendererProps,
  Renderer,
  // Data types
  TextData,
  FringeAnalysisData,
  ComparisonData,
  IssueDetailData,
  FeedbackDraftData,
  SummaryData,
  MetricCardData,
  DataTableData,
  ActionListData,
} from "./types";

// Parser utilities
export { parseAgentResponse, isKnownType } from "./parser";
export type { ParseResult } from "./parser";

// Registry
export { rendererRegistry } from "./registry";

// Validators (for testing/extension)
export * as validators from "./validators";

// Individual renderers (for direct use if needed)
export { TextRenderer } from "./components/TextRenderer";
export { FringeAnalysisRenderer } from "./components/FringeAnalysisRenderer";
export { FallbackRenderer } from "./components/FallbackRenderer";
