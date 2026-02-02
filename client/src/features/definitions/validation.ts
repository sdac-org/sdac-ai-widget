/**
 * Validation Features
 *
 * Features for validating data and identifying issues
 */

import type { Feature } from "../types";

export const validationFeatures: Feature[] = [
  {
    id: "evaluate-issues",
    category: "validation",
    label: "Evaluate Potential Issues",
    description: "Run automated validation checks",
    icon: "Search",
    prompt: "Evaluate this report for potential issues. Check source codes, missing justifications, and data anomalies.",
    priority: 10,
    startsNewThread: true,
  },
  {
    id: "check-source-codes",
    category: "validation",
    label: "Check Source Codes",
    description: "Validate source code assignments",
    icon: "CheckCircle",
    prompt: "Check all source codes in this report. Identify any that may be incorrectly assigned (e.g., federal costs claimed for state reimbursement).",
    priority: 9,
  },
  {
    id: "check-justifications",
    category: "validation",
    label: "Check Justifications",
    description: "Review required justifications",
    icon: "ClipboardList",
    prompt: "Review the justifications in this report. Are all required justifications provided? Are they adequate?",
    priority: 8,
  },
  {
    id: "check-zero-salaries",
    category: "validation",
    label: "Check Zero Salaries",
    description: "Find positions with $0 salary",
    icon: "AlertTriangle",
    prompt: "Find all positions with $0 salary in this report. Do they have explanatory comments?",
    priority: 7,
  },
  {
    id: "check-eligibility",
    category: "validation",
    label: "Check Eligibility",
    description: "Verify cost eligibility",
    icon: "CheckCircle",
    prompt: "Check if all claimed costs are eligible for reimbursement. Flag any potential ineligible expenses.",
    priority: 6,
  },
  // Add more validation features as needed...
];
