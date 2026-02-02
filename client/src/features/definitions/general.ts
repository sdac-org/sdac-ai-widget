/**
 * General Features
 *
 * General purpose features that don't fit other categories
 */

import type { Feature } from "../types";

export const generalFeatures: Feature[] = [
  {
    id: "ask-question",
    category: "general",
    label: "Ask a Question",
    description: "Ask anything about this report",
    icon: "MessageSquare",
    prompt: "", // Empty - user types their own question
    priority: 1,
  },
  {
    id: "explain-rules",
    category: "general",
    label: "Explain Rules",
    description: "Understand validation rules",
    icon: "Sparkles",
    prompt: "Explain the key validation rules that apply to SDAC reports. What thresholds trigger review?",
    priority: 2,
  },
  // Add more general features as needed...
];
