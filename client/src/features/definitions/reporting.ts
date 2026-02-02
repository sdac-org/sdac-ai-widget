/**
 * Reporting Features
 *
 * Features for generating reports, summaries, and feedback
 */

import type { Feature } from "../types";

export const reportingFeatures: Feature[] = [
  {
    id: "generate-summary",
    category: "reporting",
    label: "Generate Summary",
    description: "Create a report overview",
    icon: "FileText",
    prompt: "Generate a comprehensive summary of this report including key metrics, notable findings, and recommendations.",
    priority: 10,
  },
  {
    id: "draft-feedback",
    category: "reporting",
    label: "Draft Feedback",
    description: "Create feedback for district",
    icon: "MessageSquare",
    prompt: "Draft feedback for the district based on the issues found in this report. Be specific and actionable.",
    priority: 9,
  },
  {
    id: "generate-sendback",
    category: "reporting",
    label: "Generate Sendback",
    description: "Create sendback notice",
    icon: "ClipboardList",
    prompt: "Generate a sendback notice listing all items that need correction before this report can be approved.",
    priority: 8,
  },
  {
    id: "export-findings",
    category: "reporting",
    label: "Export Findings",
    description: "Format findings for export",
    icon: "FileText",
    prompt: "Format all findings from this report in a structured format suitable for documentation or export.",
    priority: 7,
  },
  // Add more reporting features as needed...
];
