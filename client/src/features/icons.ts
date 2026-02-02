/**
 * Feature Icons
 *
 * Maps icon names to lucide-react icon components.
 * This allows features to specify icons by string name.
 */

import {
  Search,
  TrendingUp,
  TrendingDown,
  History,
  AlertTriangle,
  CheckCircle,
  FileText,
  BarChart,
  PieChart,
  Users,
  DollarSign,
  Percent,
  Calculator,
  ClipboardList,
  MessageSquare,
  Sparkles,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { FeatureIconName } from "./types";

/**
 * Map of icon names to icon components
 */
const iconMap: Record<FeatureIconName, LucideIcon> = {
  Search,
  TrendingUp,
  TrendingDown,
  History,
  AlertTriangle,
  CheckCircle,
  FileText,
  BarChart,
  PieChart,
  Users,
  DollarSign,
  Percent,
  Calculator,
  ClipboardList,
  MessageSquare,
  Sparkles,
};

/**
 * Get the icon component for a feature icon name
 *
 * @param name - The icon name from the feature definition
 * @returns The lucide-react icon component
 *
 * @example
 * ```tsx
 * const Icon = getFeatureIcon(feature.icon);
 * return <Icon className="w-4 h-4" />;
 * ```
 */
export function getFeatureIcon(name: FeatureIconName): LucideIcon {
  return iconMap[name] ?? HelpCircle;
}
