/**
 * Text Renderer
 *
 * Renders plain text/markdown content.
 * Supports headers, lists, bold, inline code.
 */

import React from "react";
import type { TextData, RendererProps } from "../types";

/**
 * Render markdown text content
 */
export function TextRenderer({ data }: RendererProps<TextData>) {
  const { content } = data;

  if (!content) {
    return null;
  }

  return <FormattedContent content={content} />;
}

/**
 * Internal component for rendering formatted markdown
 */
function FormattedContent({ content }: { content: string }) {
  const renderInlineMarkdown = (text: string, keyPrefix: string = "") => {
    // Handle bold (**text**) and inline code (`code`)
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`${keyPrefix}-${index}`} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={`${keyPrefix}-${index}`}
            className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={`${keyPrefix}-${index}`}>{part}</span>;
    });
  };

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listType === "ol" ? "ol" : "ul";
      const listClass =
        listType === "ol"
          ? "list-decimal list-inside space-y-1 my-2"
          : "list-disc list-inside space-y-1 my-2";
      elements.push(
        <ListTag key={`list-${elements.length}`} className={listClass}>
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              {renderInlineMarkdown(item, `li-${elements.length}-${idx}`)}
            </li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Headers
    if (trimmedLine.startsWith("#### ")) {
      flushList();
      elements.push(
        <h4 key={`h4-${lineIndex}`} className="text-sm font-bold mt-3 mb-1">
          {renderInlineMarkdown(trimmedLine.slice(5), `h4-${lineIndex}`)}
        </h4>
      );
      return;
    }
    if (trimmedLine.startsWith("### ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${lineIndex}`}
          className="text-base font-bold mt-4 mb-2 pb-1 border-b border-slate-200"
        >
          {renderInlineMarkdown(trimmedLine.slice(4), `h3-${lineIndex}`)}
        </h3>
      );
      return;
    }
    if (trimmedLine.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${lineIndex}`} className="text-lg font-bold mt-4 mb-2">
          {renderInlineMarkdown(trimmedLine.slice(3), `h2-${lineIndex}`)}
        </h2>
      );
      return;
    }

    // Unordered list items (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(ulMatch[2]);
      return;
    }

    // Ordered list items (1. 2. etc)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(olMatch[2]);
      return;
    }

    // Empty line
    if (trimmedLine === "") {
      flushList();
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${lineIndex}`} className="text-sm leading-relaxed my-1.5">
        {renderInlineMarkdown(trimmedLine, `p-${lineIndex}`)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}
