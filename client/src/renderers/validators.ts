/**
 * Data Validators
 *
 * Type guards for validating response data matches expected types.
 * Each validator ensures the data structure is correct before rendering.
 */

import type {
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

/**
 * Validate TextData
 */
export function isTextData(data: unknown): data is TextData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as TextData;
  return typeof d.content === "string";
}

/**
 * Validate FringeAnalysisData
 */
export function isFringeAnalysisData(data: unknown): data is FringeAnalysisData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as FringeAnalysisData;
  return (
    typeof d.increasePercent === "number" &&
    typeof d.threshold === "number" &&
    typeof d.exceeds === "boolean" &&
    Array.isArray(d.factors) &&
    d.factors.every(
      (f) =>
        typeof f.title === "string" &&
        typeof f.description === "string" &&
        ["high", "medium", "low"].includes(f.impact)
    ) &&
    typeof d.recommendation === "string"
  );
}

/**
 * Validate ComparisonData
 */
export function isComparisonData(data: unknown): data is ComparisonData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as ComparisonData;
  return (
    typeof d.title === "string" &&
    typeof d.period1 === "object" &&
    d.period1 !== null &&
    typeof d.period1.label === "string" &&
    typeof d.period2 === "object" &&
    d.period2 !== null &&
    typeof d.period2.label === "string" &&
    Array.isArray(d.metrics) &&
    d.metrics.every(
      (m) =>
        typeof m.label === "string" &&
        typeof m.value1 === "number" &&
        typeof m.value2 === "number" &&
        typeof m.diff === "number" &&
        typeof m.diffPercent === "number" &&
        ["normal", "warning", "error"].includes(m.status)
    )
  );
}

/**
 * Validate IssueDetailData
 */
export function isIssueDetailData(data: unknown): data is IssueDetailData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as IssueDetailData;
  return (
    typeof d.id === "number" &&
    typeof d.title === "string" &&
    typeof d.description === "string" &&
    ["high", "medium", "low"].includes(d.severity) &&
    typeof d.category === "string"
  );
}

/**
 * Validate FeedbackDraftData
 */
export function isFeedbackDraftData(data: unknown): data is FeedbackDraftData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as FeedbackDraftData;
  return (
    typeof d.content === "string" &&
    ["email", "memo", "report"].includes(d.format)
  );
}

/**
 * Validate SummaryData
 */
export function isSummaryData(data: unknown): data is SummaryData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as SummaryData;
  return (
    typeof d.title === "string" &&
    typeof d.overview === "string" &&
    typeof d.totalIssues === "number" &&
    typeof d.byPriority === "object" &&
    d.byPriority !== null &&
    typeof d.byPriority.high === "number" &&
    typeof d.byPriority.medium === "number" &&
    typeof d.byPriority.low === "number" &&
    Array.isArray(d.issues) &&
    d.issues.every(
      (issue) =>
        typeof issue.id === "number" &&
        typeof issue.title === "string" &&
        ["high", "medium", "low"].includes(issue.severity)
    )
  );
}

/**
 * Validate MetricCardData
 */
export function isMetricCardData(data: unknown): data is MetricCardData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as MetricCardData;
  return (
    typeof d.label === "string" &&
    typeof d.value === "number" &&
    ["currency", "percent", "number"].includes(d.format)
  );
}

/**
 * Validate DataTableData
 */
export function isDataTableData(data: unknown): data is DataTableData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as DataTableData;
  return (
    Array.isArray(d.columns) &&
    d.columns.every(
      (col) => typeof col.key === "string" && typeof col.label === "string"
    ) &&
    Array.isArray(d.rows)
  );
}

/**
 * Validate ActionListData
 */
export function isActionListData(data: unknown): data is ActionListData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as ActionListData;
  return (
    Array.isArray(d.actions) &&
    d.actions.every(
      (action) =>
        typeof action.id === "string" && typeof action.label === "string"
    )
  );
}
