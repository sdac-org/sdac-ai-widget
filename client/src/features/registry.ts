/**
 * Feature Registry
 *
 * Central registry for all widget features.
 * Import feature definitions from category files and combine them here.
 */

import type { Feature, FeatureCategory, FeatureGroup, FeatureRegistry } from "./types";

// Import feature definitions by category
import { analysisFeatures } from "./definitions/analysis";
import { comparisonFeatures } from "./definitions/comparison";
import { validationFeatures } from "./definitions/validation";
import { reportingFeatures } from "./definitions/reporting";
import { generalFeatures } from "./definitions/general";

/**
 * All registered features (combined from all category files)
 */
const allFeatures: Feature[] = [
  ...analysisFeatures,
  ...comparisonFeatures,
  ...validationFeatures,
  ...reportingFeatures,
  ...generalFeatures,
];

/**
 * Category display names and order
 */
const categoryConfig: Record<FeatureCategory, { title: string; order: number }> = {
  validation: { title: "Validation", order: 1 },
  analysis: { title: "Analysis", order: 2 },
  comparison: { title: "Comparison", order: 3 },
  reporting: { title: "Reporting", order: 4 },
  general: { title: "General", order: 5 },
};

/**
 * Get a feature by ID
 */
function getFeature(id: string): Feature | undefined {
  return allFeatures.find((f) => f.id === id);
}

/**
 * Get all features in a category
 */
function getByCategory(category: FeatureCategory): Feature[] {
  return allFeatures
    .filter((f) => f.category === category)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Get only enabled features
 */
function getEnabled(enabledIds: string[]): Feature[] {
  const enabledSet = new Set(enabledIds);
  return allFeatures
    .filter((f) => enabledSet.has(f.id))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Get enabled features grouped by category
 */
function getGrouped(enabledIds: string[]): FeatureGroup[] {
  const enabledFeatures = getEnabled(enabledIds);

  // Group by category
  const groups = new Map<FeatureCategory, Feature[]>();

  for (const feature of enabledFeatures) {
    const existing = groups.get(feature.category) ?? [];
    existing.push(feature);
    groups.set(feature.category, existing);
  }

  // Convert to array and sort by category order
  return Array.from(groups.entries())
    .map(([category, features]) => ({
      id: category,
      title: categoryConfig[category].title,
      features: features.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    }))
    .sort(
      (a, b) =>
        categoryConfig[a.id as FeatureCategory].order -
        categoryConfig[b.id as FeatureCategory].order
    );
}

/**
 * The feature registry instance
 */
export const featureRegistry: FeatureRegistry = {
  features: allFeatures,
  getFeature,
  getByCategory,
  getEnabled,
  getGrouped,
};

/**
 * Helper to list all available feature IDs (useful for config)
 */
export function listAllFeatureIds(): string[] {
  return allFeatures.map((f) => f.id);
}

/**
 * Helper to validate feature IDs in config
 */
export function validateFeatureIds(ids: string[]): { valid: string[]; invalid: string[] } {
  const allIds = new Set(listAllFeatureIds());
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const id of ids) {
    if (allIds.has(id)) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }

  return { valid, invalid };
}
