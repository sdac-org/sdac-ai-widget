/**
 * Enabled Features Configuration
 *
 * This file controls which features are enabled in the widget.
 * Add or remove feature IDs to enable/disable features.
 *
 * To see all available feature IDs, check:
 * - features/definitions/analysis.ts
 * - features/definitions/comparison.ts
 * - features/definitions/validation.ts
 * - features/definitions/reporting.ts
 * - features/definitions/general.ts
 *
 * Or call: listAllFeatureIds() from features/registry.ts
 */

/**
 * Currently enabled feature IDs
 *
 * Add features here as you release them.
 * Order doesn't matter - features are sorted by priority.
 */
export const enabledFeatures: string[] = [
  // === Phase 1: Initial Release ===
  "analyze-fringe",      // Fringe analysis

  // === Phase 2: Coming Soon ===
  // "evaluate-issues",
  // "compare-quarters",
  // "analyze-salary",
  // "check-source-codes",
  // "draft-feedback",

  // === Phase 3: Future ===
  // "analyze-personnel",
  // "check-justifications",
  // "generate-summary",
  // "compare-year-over-year",

  // === Disabled/Experimental ===
  // "ask-question",
  // "explain-rules",
];

/**
 * Feature configuration options
 */
export const featureConfig = {
  /**
   * Maximum number of suggested actions to show at once
   */
  maxSuggestedActions: 5,

  /**
   * Whether to group features by category in the UI
   */
  groupByCategory: false,

  /**
   * Default category to show first (if grouping)
   */
  defaultCategory: "validation" as const,
};
