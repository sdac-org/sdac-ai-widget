/**
 * Structured Response Types
 *
 * Type definitions for the agent response format system.
 * All Mastra agent responses follow the AgentResponse interface.
 */

import type { ComponentType } from "react";

// ============================================================================
// Base Response Types
// ============================================================================

/**
 * Metadata that can be attached to any response
 */
export interface ResponseMeta {
  /** Confidence level of the response (0-1) */
  confidence?: number;
  /** Sources used to generate the response */
  sources?: string[];
}

/**
 * Base structure for ALL agent responses
 *
 * @template T - The response type identifier
 * @template D - The data type for this response
 */
export interface AgentResponse<T extends string = string, D = unknown> {
  /** Response type - determines which renderer to use */
  type: T;
  /** Optional intro text displayed before the visual component (supports markdown) */
  intro?: string;
  /** The structured data for the visual component */
  data: D;
  /** Optional outro text displayed after the visual component (supports markdown) */
  outro?: string;
  /** Optional metadata */
  meta?: ResponseMeta;
}

// ============================================================================
// Data Types for Each Response Type
// ============================================================================

/**
 * Plain text response data
 */
export interface TextData {
  /** The text content (supports markdown) */
  content: string;
}

/**
 * Fringe analysis response data
 */
export interface FringeAnalysisData {
  /** Percentage increase in fringe rate */
  increasePercent: number;
  /** Threshold percentage for alerts */
  threshold: number;
  /** Whether the increase exceeds the threshold */
  exceeds: boolean;
  /** Contributing factors to the increase */
  factors: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
  }>;
  /** Recommendation for addressing the issue */
  recommendation: string;
}

/**
 * Period comparison response data
 */
export interface ComparisonData {
  /** Title for the comparison */
  title: string;
  /** First period being compared */
  period1: {
    label: string;
    startDate?: string;
    endDate?: string;
  };
  /** Second period being compared */
  period2: {
    label: string;
    startDate?: string;
    endDate?: string;
  };
  /** Metrics being compared */
  metrics: Array<{
    label: string;
    value1: number;
    value2: number;
    diff: number;
    diffPercent: number;
    format?: "currency" | "percent" | "number";
    status: "normal" | "warning" | "error";
  }>;
}

/**
 * Issue detail response data
 */
export interface IssueDetailData {
  /** Issue identifier */
  id: number;
  /** Issue title */
  title: string;
  /** Detailed description */
  description: string;
  /** Severity level */
  severity: "high" | "medium" | "low";
  /** Issue category */
  category: string;
  /** Amount affected by the issue */
  affectedAmount?: number;
  /** Recommendation for resolving the issue */
  recommendation?: string;
  /** Related issues */
  relatedIssues?: Array<{ id: number; title: string }>;
}

/**
 * Feedback draft response data
 */
export interface FeedbackDraftData {
  /** The drafted feedback content */
  content: string;
  /** Format of the feedback */
  format: "email" | "memo" | "report";
  /** Intended recipient */
  recipient?: string;
  /** Subject line (for email format) */
  subject?: string;
}

/**
 * Report summary response data
 */
export interface SummaryData {
  /** Summary title */
  title: string;
  /** Overview text */
  overview: string;
  /** Total number of issues */
  totalIssues: number;
  /** Issues grouped by priority */
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  /** List of issues */
  issues: Array<{
    id: number;
    title: string;
    severity: "high" | "medium" | "low";
  }>;
}

/**
 * Single metric card response data
 */
export interface MetricCardData {
  /** Metric label */
  label: string;
  /** Metric value */
  value: number;
  /** Value format */
  format: "currency" | "percent" | "number";
  /** Trend direction */
  trend?: "up" | "down" | "stable";
  /** Trend value (e.g., +5.2%) */
  trendValue?: number;
  /** Additional context */
  context?: string;
}

/**
 * Data table response data
 */
export interface DataTableData {
  /** Table title */
  title?: string;
  /** Column definitions */
  columns: Array<{
    key: string;
    label: string;
    format?: "currency" | "percent" | "number" | "date" | "text";
    sortable?: boolean;
  }>;
  /** Row data */
  rows: Array<Record<string, unknown>>;
  /** Summary row */
  summary?: Record<string, unknown>;
}

/**
 * Action list response data
 */
export interface ActionListData {
  /** List title */
  title?: string;
  /** Available actions */
  actions: Array<{
    id: string;
    label: string;
    description?: string;
    completed?: boolean;
    actionType?: "navigate" | "copy" | "external";
    actionPayload?: string;
  }>;
}

// ============================================================================
// Type Map and Utilities
// ============================================================================

/**
 * Map of response types to their data types
 */
export interface ResponseTypeMap {
  text: TextData;
  fringe_analysis: FringeAnalysisData;
  comparison: ComparisonData;
  issue_detail: IssueDetailData;
  feedback_draft: FeedbackDraftData;
  summary: SummaryData;
  metric_card: MetricCardData;
  data_table: DataTableData;
  action_list: ActionListData;
}

/**
 * All valid response types
 */
export type ResponseType = keyof ResponseTypeMap;

/**
 * Type-safe response for a specific type
 */
export type TypedResponse<T extends ResponseType> = AgentResponse<
  T,
  ResponseTypeMap[T]
>;

// ============================================================================
// Renderer Types
// ============================================================================

/**
 * Props passed to renderer components
 */
export interface RendererProps<D = unknown> {
  /** The structured data to render */
  data: D;
  /** Callback for user actions within the component */
  onAction?: (action: string, payload?: unknown) => void;
}

/**
 * Definition of a renderer for a specific response type
 */
export interface Renderer<D = unknown> {
  /** The response type this renderer handles */
  type: string;
  /** The React component that renders the data */
  component: ComponentType<RendererProps<D>>;
  /** Validates that the data matches the expected type */
  validate: (data: unknown) => data is D;
}
