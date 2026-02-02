/**
 * SuggestedActions Component
 *
 * Displays enabled features as suggested action buttons.
 * Uses the feature registry to get enabled features.
 */

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useFeatures, getFeatureIcon, type Feature, type FeatureContext } from "@/features";

interface SuggestedActionsProps {
  /** Callback when a feature is triggered */
  onFeatureSelect: (feature: Feature, prompt: string) => void;

  /** Context for feature execution */
  context: Omit<FeatureContext, "sendMessage" | "createThread">;

  /** Whether to show in collapsed state initially */
  defaultCollapsed?: boolean;

  /** Title for the section */
  title?: string;

  /** Maximum number of features to show */
  maxFeatures?: number;
}

/**
 * Suggested actions section showing enabled features
 */
export function SuggestedActions({
  onFeatureSelect,
  context,
  defaultCollapsed = false,
  title = "Suggested Actions",
  maxFeatures,
}: SuggestedActionsProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const { features } = useFeatures({ limit: maxFeatures });

  if (features.length === 0) {
    return null;
  }

  const handleFeatureClick = (feature: Feature) => {
    // Resolve the prompt
    const prompt =
      typeof feature.prompt === "function"
        ? feature.prompt(context as FeatureContext)
        : feature.prompt;

    onFeatureSelect(feature, prompt);
  };

  return (
    <div className="mb-0 px-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 group"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-blue-400" />
          {title}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-2 overflow-hidden"
          >
            {features.map((feature) => (
              <FeatureButton
                key={feature.id}
                feature={feature}
                onClick={() => handleFeatureClick(feature)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Individual feature button
 */
function FeatureButton({
  feature,
  onClick,
}: {
  feature: Feature;
  onClick: () => void;
}) {
  const Icon = getFeatureIcon(feature.icon);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl text-left hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all group"
    >
      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
        <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-700 group-hover:text-blue-800 truncate">
          {feature.label}
        </div>
        {feature.description && (
          <div className="text-[10px] text-slate-400 group-hover:text-blue-600/70 truncate">
            {feature.description}
          </div>
        )}
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-blue-400" />
    </button>
  );
}

/**
 * Compact pill-style feature button (alternative style)
 */
export function FeaturePill({
  feature,
  onClick,
}: {
  feature: Feature;
  onClick: () => void;
}) {
  const Icon = getFeatureIcon(feature.icon);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
    >
      <Icon className="w-3 h-3" />
      {feature.label}
    </button>
  );
}
