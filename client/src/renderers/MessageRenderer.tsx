/**
 * Message Renderer
 *
 * Main component for rendering agent responses.
 * Parses JSON responses and delegates to appropriate type-specific renderers.
 */

import React from "react";
import { parseAgentResponse } from "./parser";
import { rendererRegistry } from "./registry";
import { TextRenderer } from "./components/TextRenderer";
import { FallbackRenderer } from "./components/FallbackRenderer";
import type { AgentResponse } from "./types";

interface MessageRendererProps {
  /** Raw message content from agent (JSON string) */
  content: string;

  /** Callback for user actions within rendered components */
  onAction?: (action: string, payload?: unknown) => void;

  /** Whether message is still streaming (show as plain text while incomplete) */
  isStreaming?: boolean;
}

/**
 * Main component for rendering agent responses
 *
 * All responses must be valid JSON with { type, data, intro?, outro? }
 *
 * @example
 * ```tsx
 * <MessageRenderer
 *   content={msg.content}
 *   onAction={handleAction}
 *   isStreaming={msg.isStreaming}
 * />
 * ```
 */
export function MessageRenderer({
  content,
  onAction,
  isStreaming = false,
}: MessageRendererProps) {
  // While streaming, JSON is likely incomplete - show as plain text
  if (isStreaming) {
    return <TextRenderer data={{ content }} />;
  }

  // Parse the response
  const { success, response, error } = parseAgentResponse(content);

  // Parse error - show error message
  if (!success || !response) {
    return (
      <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-100">
        {error || "Failed to parse response"}
      </div>
    );
  }

  // Get renderer for this response type
  const renderer = rendererRegistry.getRenderer(response.type);

  // Render the response with intro/outro wrapper
  return (
    <ResponseWrapper response={response}>
      {renderer ? (
        <ValidatedRenderer
          renderer={renderer}
          data={response.data}
          type={response.type}
          onAction={onAction}
        />
      ) : (
        <FallbackRenderer type={response.type} data={response.data} />
      )}
    </ResponseWrapper>
  );
}

/**
 * Wrapper component that renders intro/outro text around the main content
 */
function ResponseWrapper({
  response,
  children,
}: {
  response: AgentResponse;
  children: React.ReactNode;
}) {
  const hasIntro = response.intro && response.intro.trim().length > 0;
  const hasOutro = response.outro && response.outro.trim().length > 0;

  // If no intro/outro, just render children
  if (!hasIntro && !hasOutro) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-3">
      {hasIntro && <TextRenderer data={{ content: response.intro! }} />}
      {children}
      {hasOutro && <TextRenderer data={{ content: response.outro! }} />}
    </div>
  );
}

/**
 * Component that validates data before rendering
 */
function ValidatedRenderer({
  renderer,
  data,
  type,
  onAction,
}: {
  renderer: {
    component: React.ComponentType<any>;
    validate: (data: unknown) => boolean;
  };
  data: unknown;
  type: string;
  onAction?: (action: string, payload?: unknown) => void;
}) {
  // Validate data structure
  if (!renderer.validate(data)) {
    return (
      <FallbackRenderer
        type={type}
        data={data}
        error={`Invalid data for type "${type}"`}
      />
    );
  }

  // Render with validated data
  const Component = renderer.component;
  return <Component data={data} onAction={onAction} />;
}
