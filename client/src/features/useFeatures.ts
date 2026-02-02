/**
 * useFeatures Hook
 *
 * React hook for accessing enabled features in the widget.
 */

import { useMemo, useCallback } from "react";
import { featureRegistry } from "./registry";
import { enabledFeatures, featureConfig } from "@/config/features";
import type { Feature, FeatureContext, FeatureGroup } from "./types";

interface UseFeaturesOptions {
  /** Override enabled features (for testing) */
  overrideEnabled?: string[];

  /** Filter to specific category */
  category?: string;

  /** Maximum features to return */
  limit?: number;
}

interface UseFeaturesReturn {
  /** List of enabled features */
  features: Feature[];

  /** Features grouped by category */
  grouped: FeatureGroup[];

  /** Get a specific feature by ID */
  getFeature: (id: string) => Feature | undefined;

  /** Execute a feature (get its prompt or run its handler) */
  executeFeature: (
    feature: Feature,
    context: FeatureContext
  ) => { prompt: string } | { handler: () => void | Promise<void> };

  /** Check if a feature is enabled */
  isEnabled: (featureId: string) => boolean;

  /** Total count of enabled features */
  count: number;
}

/**
 * Hook for accessing and executing features
 *
 * @example
 * ```tsx
 * const { features, executeFeature } = useFeatures();
 *
 * // Render suggested actions
 * {features.map(feature => (
 *   <button onClick={() => {
 *     const result = executeFeature(feature, context);
 *     if ('prompt' in result) {
 *       sendMessage(result.prompt);
 *     }
 *   }}>
 *     {feature.label}
 *   </button>
 * ))}
 * ```
 */
export function useFeatures(options: UseFeaturesOptions = {}): UseFeaturesReturn {
  const {
    overrideEnabled,
    category,
    limit = featureConfig.maxSuggestedActions,
  } = options;

  const enabledIds = overrideEnabled ?? enabledFeatures;

  // Get enabled features
  const features = useMemo(() => {
    let result = featureRegistry.getEnabled(enabledIds);

    // Filter by category if specified
    if (category) {
      result = result.filter((f) => f.category === category);
    }

    // Apply limit
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }, [enabledIds, category, limit]);

  // Get grouped features
  const grouped = useMemo(() => {
    return featureRegistry.getGrouped(enabledIds);
  }, [enabledIds]);

  // Get feature by ID
  const getFeature = useCallback((id: string) => {
    return featureRegistry.getFeature(id);
  }, []);

  // Execute a feature
  const executeFeature = useCallback(
    (
      feature: Feature,
      context: FeatureContext
    ): { prompt: string } | { handler: () => void | Promise<void> } => {
      // If feature has a custom handler, return it
      if (feature.handler) {
        return {
          handler: () => feature.handler!(context),
        };
      }

      // Otherwise, resolve the prompt
      const prompt =
        typeof feature.prompt === "function"
          ? feature.prompt(context)
          : feature.prompt;

      return { prompt };
    },
    []
  );

  // Check if feature is enabled
  const isEnabled = useCallback(
    (featureId: string) => {
      return enabledIds.includes(featureId);
    },
    [enabledIds]
  );

  return {
    features,
    grouped,
    getFeature,
    executeFeature,
    isEnabled,
    count: features.length,
  };
}

/**
 * Get the icon component for a feature
 * This is a utility, not a hook, so it can be used in render
 */
export { getFeatureIcon } from "./icons";
