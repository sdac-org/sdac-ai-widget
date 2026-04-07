/**
 * Renderer Registry
 *
 * Central registry of all response type renderers.
 * Maps response types to their React components and validators.
 */

import type { Renderer } from "./types";
import * as validators from "./validators";

// Import renderer components
import { TextRenderer } from "./components/TextRenderer";
import { FringeAnalysisRenderer } from "./components/FringeAnalysisRenderer";

/**
 * All registered renderers
 *
 * Add new renderers here as they are implemented.
 * Each renderer needs:
 * - type: string identifier matching AgentResponse.type
 * - component: React component that renders the data
 * - validate: function that validates the data structure
 */
const renderers: Array<Renderer<any>> = [
  {
    type: "text",
    component: TextRenderer,
    validate: validators.isTextData,
  },
  {
    type: "fringe_analysis",
    component: FringeAnalysisRenderer,
    validate: validators.isFringeAnalysisData,
  },
  // Future renderers:
  // { type: "comparison", component: ComparisonRenderer, validate: validators.isComparisonData },
  // { type: "issue_detail", component: IssueDetailRenderer, validate: validators.isIssueDetailData },
  // { type: "feedback_draft", component: FeedbackDraftRenderer, validate: validators.isFeedbackDraftData },
  // { type: "summary", component: SummaryRenderer, validate: validators.isSummaryData },
  // { type: "metric_card", component: MetricCardRenderer, validate: validators.isMetricCardData },
  // { type: "data_table", component: DataTableRenderer, validate: validators.isDataTableData },
  // { type: "action_list", component: ActionListRenderer, validate: validators.isActionListData },
];

/**
 * Renderer registry for looking up renderers by type
 */
export const rendererRegistry = {
  /**
   * Get renderer for a specific response type
   *
   * @param type - The response type to find a renderer for
   * @returns The renderer or undefined if not found
   */
  getRenderer: (type: string): Renderer<any> | undefined => {
    return renderers.find((r) => r.type === type);
  },

  /**
   * Check if a renderer exists for a type
   *
   * @param type - The response type to check
   * @returns True if a renderer is registered
   */
  hasRenderer: (type: string): boolean => {
    return renderers.some((r) => r.type === type);
  },

  /**
   * Get all registered response types
   *
   * @returns Array of type strings
   */
  getTypes: (): string[] => {
    return renderers.map((r) => r.type);
  },

  /**
   * Get all registered renderers
   *
   * @returns Array of renderer definitions
   */
  getAll: (): Array<Renderer<any>> => {
    return [...renderers];
  },
};
