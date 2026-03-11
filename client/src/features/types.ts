/**
 * Feature System Types
 *
 * Defines the structure for widget features.
 * Features are configuration objects that describe suggested actions,
 * their prompts, icons, and optional custom renderers.
 */

import type { LucideIcon } from "lucide-react";

/**
 * Feature categories for organization
 */
export type FeatureCategory =
  | "analysis"      // Analyze data (fringe, salary, etc.)
  | "comparison"    // Compare periods, districts, etc.
  | "validation"    // Validate data, check for issues
  | "reporting"     // Generate reports, summaries
  | "general";      // General purpose features

/**
 * Icon names that can be used for features
 * Maps to lucide-react icons
 */
export type FeatureIconName =
  | "Search"
  | "TrendingUp"
  | "TrendingDown"
  | "History"
  | "AlertTriangle"
  | "CheckCircle"
  | "FileText"
  | "BarChart"
  | "PieChart"
  | "Users"
  | "DollarSign"
  | "Percent"
  | "Calculator"
  | "ClipboardList"
  | "MessageSquare"
  | "Sparkles";

/**
 * Feature definition
 */
export interface Feature {
  /** Unique identifier for the feature */
  id: string;

  /** Category for grouping */
  category: FeatureCategory;

  /** Display label shown to users */
  label: string;

  /** Short description shown below the label */
  description: string;

  /** Icon name (from lucide-react) */
  icon: FeatureIconName;

  /**
   * The prompt sent to the agent when this feature is triggered.
   * Can be a static string or a function that receives context.
   */
  prompt: string | ((context: FeatureContext) => string);

  /**
   * Optional: Custom renderer for agent responses.
   * If not specified, uses default markdown renderer.
   */
  renderer?: string;

  /**
   * Optional: Whether this feature starts a new thread or continues current.
   * Defaults to false (continues current thread).
   */
  startsNewThread?: boolean;

  /**
   * Optional: Custom handler instead of sending to agent.
   * Use for client-side only features.
   */
  handler?: (context: FeatureContext) => void | Promise<void>;

  /**
   * Optional: Conditions for when this feature should be visible.
   * If not specified, feature is always visible.
   */
  visible?: (context: FeatureContext) => boolean;

  /**
   * Optional: Priority for sorting (higher = shown first).
   * Defaults to 0.
   */
  priority?: number;
}

/**
 * Context passed to feature functions
 */
export interface FeatureContext {
  /** Current report ID */
  reportId: string;

  /** Current user info */
  user: {
    name: string;
    role: string;
    id?: string;
  };

  /** Current thread ID (if in a thread) */
  threadId?: string;

  /** Current view state */
  view: "main" | "chat" | "analyzing";

  /** Send a message to the agent */
  sendMessage: (message: string) => void;

  /** Create a new thread */
  createThread: (initialMessage?: string) => void;
}

/**
 * Feature group (for UI organization)
 */
export interface FeatureGroup {
  /** Group identifier */
  id: string;

  /** Display title */
  title: string;

  /** Features in this group */
  features: Feature[];
}

/**
 * Registry of all features
 */
export interface FeatureRegistry {
  /** All registered features */
  features: Feature[];

  /** Get feature by ID */
  getFeature: (id: string) => Feature | undefined;

  /** Get features by category */
  getByCategory: (category: FeatureCategory) => Feature[];

  /** Get all enabled features */
  getEnabled: (enabledIds: string[]) => Feature[];

  /** Get features grouped by category */
  getGrouped: (enabledIds: string[]) => FeatureGroup[];
}
