/**
 * Fringe Analysis Renderer
 *
 * Displays fringe benefit rate analysis with:
 * - Alert card showing increase percentage
 * - Contributing factors list
 * - Recommendation section
 */

import React from "react";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import type { FringeAnalysisData, RendererProps } from "../types";

/**
 * Render fringe analysis data as a visual card
 */
export function FringeAnalysisRenderer({
  data,
  onAction,
}: RendererProps<FringeAnalysisData>) {
  const { increasePercent, threshold, exceeds, factors, recommendation } = data;

  return (
    <div className="w-full space-y-3">
      {/* Main alert card */}
      <div
        className={`p-3 rounded-lg border ${
          exceeds
            ? "bg-amber-50 border-amber-100"
            : "bg-emerald-50 border-emerald-100"
        }`}
      >
        <div className="flex justify-between items-center mb-1">
          <span
            className={`text-xs uppercase font-semibold ${
              exceeds ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            Fringe Rate {exceeds ? "Increase" : "Change"}
          </span>
          <div
            className={`flex items-center gap-1 text-xs font-bold ${
              exceeds ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {exceeds ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            {increasePercent >= 0 ? "+" : ""}
            {increasePercent.toFixed(1)}%
          </div>
        </div>
        <p
          className={`text-xs mt-1 ${
            exceeds ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {exceeds
            ? `Exceeds the ${threshold}% threshold, triggering validation.`
            : `Within the ${threshold}% threshold.`}
        </p>
      </div>

      {/* Contributing factors */}
      {factors.length > 0 && (
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <h6 className="text-xs font-semibold text-slate-700 mb-2 uppercase">
            Contributing Factors
          </h6>
          <ul className="space-y-2">
            {factors.map((factor, index) => (
              <li key={index} className="flex gap-2">
                <div
                  className={`w-1 h-full min-h-[1.25rem] rounded-full shrink-0 ${
                    factor.impact === "high"
                      ? "bg-red-500"
                      : factor.impact === "medium"
                        ? "bg-amber-500"
                        : "bg-blue-300"
                  }`}
                />
                <div>
                  <p className="text-xs font-medium text-slate-800">
                    {factor.title}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {factor.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <h6 className="text-xs font-semibold text-slate-700 mb-1 uppercase">
            Recommendation
          </h6>
          <p className="text-xs text-slate-600 leading-relaxed">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
