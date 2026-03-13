/**
 * Comparison Features
 *
 * Features for comparing data across periods, districts, etc.
 */

import type { Feature } from "../types";

export const comparisonFeatures: Feature[] = [
  {
    id: "compare-quarters",
    category: "comparison",
    label: "Compare Quarters",
    description: "Review trends against previous quarter",
    icon: "History",
    prompt: "Compare this report to the previous quarter. Highlight significant changes in salary, fringe, and personnel.",
    priority: 10,
  },
  {
    id: "compare-year-over-year",
    category: "comparison",
    label: "Year-over-Year",
    description: "Compare to same quarter last year",
    icon: "BarChart",
    prompt: "Compare this report to the same quarter last year. What are the key differences?",
    priority: 9,
  },
  {
    id: "compare-budget",
    category: "comparison",
    label: "Compare to Budget",
    description: "Check against budgeted amounts",
    icon: "Calculator",
    prompt: "Compare this report's costs against the budgeted amounts. Identify any overages or significant variances.",
    priority: 8,
  },
  // Add more comparison features as needed...
];
