/**
 * Analysis Features
 *
 * Features for analyzing report data (fringe, salary, costs, etc.)
 */

import type { Feature } from "../types";

export const analysisFeatures: Feature[] = [
  {
    id: "analyze-fringe",
    category: "analysis",
    label: "Analyze Fringe Benefits",
    description: "Investigate fringe variances",
    icon: "TrendingUp",
    prompt: "Analyze the fringe benefit variance for this report. Explain the key drivers and whether justification is needed.",
    priority: 10,
  },
  {
    id: "analyze-salary",
    category: "analysis",
    label: "Analyze Salary Costs",
    description: "Review salary distribution",
    icon: "DollarSign",
    prompt: "Analyze the salary costs in this report. Identify any unusual patterns or significant changes.",
    priority: 9,
  },
  {
    id: "analyze-personnel",
    category: "analysis",
    label: "Analyze Personnel",
    description: "Review staffing changes",
    icon: "Users",
    prompt: "Analyze the personnel in this report. Highlight any new positions, removals, or role changes.",
    priority: 8,
  },
  {
    id: "analyze-cost-pools",
    category: "analysis",
    label: "Analyze Cost Pools",
    description: "Review cost pool allocation",
    icon: "PieChart",
    prompt: "Analyze the cost pool allocation in this report. Check if the distribution is appropriate.",
    priority: 7,
  },
  // Add more analysis features as needed...
];
