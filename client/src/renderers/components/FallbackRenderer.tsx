/**
 * Fallback Renderer
 *
 * Displays content when:
 * - Response type is unknown/unsupported
 * - Data validation fails
 */

import React, { useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Code } from "lucide-react";

interface FallbackRendererProps {
  /** The response type that wasn't recognized */
  type: string;
  /** The raw data from the response */
  data: unknown;
  /** Optional error message */
  error?: string;
}

/**
 * Render fallback content for unknown response types
 */
export function FallbackRenderer({ type, data, error }: FallbackRendererProps) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-slate-700">
            {error || `Unknown response type: "${type}"`}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            This response type doesn't have a visual renderer yet.
          </p>
        </div>
      </div>

      {/* Toggle to show raw JSON */}
      <button
        onClick={() => setShowJson(!showJson)}
        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 transition-colors mt-2"
      >
        <Code className="w-3 h-3" />
        {showJson ? "Hide" : "Show"} raw data
        {showJson ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {/* Raw JSON display */}
      {showJson && (
        <pre className="mt-2 p-2 bg-slate-100 rounded text-[10px] font-mono text-slate-600 overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
