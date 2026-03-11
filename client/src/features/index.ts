/**
 * Features Module
 *
 * Export everything needed to use the feature system.
 */

// Types
export type {
  Feature,
  FeatureCategory,
  FeatureContext,
  FeatureGroup,
  FeatureIconName,
  FeatureRegistry,
} from "./types";

// Registry
export { featureRegistry, listAllFeatureIds, validateFeatureIds } from "./registry";

// Hook
export { useFeatures } from "./useFeatures";

// Icons
export { getFeatureIcon } from "./icons";
