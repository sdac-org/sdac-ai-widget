import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";

vi.mock("@/config/features", () => ({
  enabledFeatures: ["evaluate-issues", "generate-summary", "analyze-fringe"],
  featureConfig: {
    maxSuggestedActions: 5,
    groupByCategory: false,
    defaultCategory: "validation",
  },
}));

import { AssistantWidget } from "../AssistantWidget";

const REPORT_ID = "8201EDC2-2EDE-4CA1-AF44-D0F5AA185CDB";

const createSseStream = (chunks: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
};

const buildSseChunk = (event: string, data: unknown) =>
  `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;

const setReportId = () => {
  sessionStorage.setItem("sdac-uploaded-report-id", REPORT_ID);
};

describe("AssistantWidget flows", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setReportId();
  });

  it("persists conversationId after first response", async () => {
    const requestBodies: Array<Record<string, unknown>> = [];
    let callIndex = 0;

    server.use(
      http.post("*/api/agent-chat", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        requestBodies.push(body);
        callIndex += 1;

        const stream = createSseStream([
          buildSseChunk("metadata", {
            conversationId: "session-1",
            conversationSk: 200 + callIndex,
            turnNumber: callIndex * 2 - 1,
          }),
          buildSseChunk("delta", { content: `Response ${callIndex}` }),
          buildSseChunk("done", { success: true }),
        ]);

        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    render(<AssistantWidget />);

    const mainInput = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(mainInput, "First message");
    await userEvent.keyboard("{Enter}");
    await screen.findByText(/Response 1/i);
    await waitFor(() => expect(requestBodies).toHaveLength(1));

    const inputs = screen.getAllByPlaceholderText("Ask anything...");
    const chatInput = inputs[inputs.length - 1];
    await userEvent.click(chatInput);
    await userEvent.type(chatInput, "Second message");
    const inputWrapper = chatInput.parentElement;
    const sendButton = inputWrapper?.querySelector("button");
    if (!sendButton) {
      throw new Error("Send button not found");
    }
    fireEvent.click(sendButton);
    await waitFor(() => expect(requestBodies).toHaveLength(2));

    expect(requestBodies[0]?.conversationId).toBeUndefined();
    expect(requestBodies[1]?.conversationId).toBe("session-1");
    expect(sessionStorage.getItem(`sdac-conversation-${REPORT_ID}`)).toBe("session-1");
  });

  it("resets state when starting fresh", async () => {
    server.use(
      http.post("*/api/agent-chat", () => {
        const stream = createSseStream([
          buildSseChunk("metadata", {
            conversationId: "session-reset",
            conversationSk: 999,
            turnNumber: 1,
          }),
          buildSseChunk("delta", { content: "Reset response" }),
          buildSseChunk("done", { success: true }),
        ]);

        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Trigger reset");
    await userEvent.keyboard("{Enter}");
    await screen.findByText(/Reset response/i);

    const resetButton = screen.getByRole("button", { name: /start fresh/i });
    await userEvent.click(resetButton);

    await screen.findByText(/I'm ready to help/i);
    expect(sessionStorage.getItem("sdac-uploaded-report-id")).toBeNull();
    expect(sessionStorage.getItem(`sdac-conversation-${REPORT_ID}`)).toBeNull();
  });

  it("shows validation fallback banner on API error", async () => {
    server.use(
      http.post("*/api/validate-report", () =>
        new HttpResponse(JSON.stringify({ error: "Validation failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    render(<AssistantWidget />);

    const evaluateButton = await screen.findByRole("button", { name: /evaluate potential issues/i });
    await userEvent.click(evaluateButton);

    await expect(screen.findByText(/Could not connect to validation service/i)).resolves.toBeDefined();
  });

  it("runs evaluate issues and shows overview", async () => {
    server.use(
      http.post("*/api/validate-report", () =>
        HttpResponse.json({
          reportId: REPORT_ID,
          districtName: "North Valley",
          quarter: "Q2",
          totalRecords: 2,
          issues: [
            {
              id: 1,
              priority: "high",
              title: "Missing fringe",
              description: "Fringe variance is missing",
              amount: 1200,
              category: "Fringe",
            },
          ],
          summary: {
            errorCount: 1,
            warningCount: 0,
            passedCount: 1,
            analysisTime: 12,
          },
        })
      )
    );

    render(<AssistantWidget />);

    const evaluateButton = await screen.findByRole("button", { name: /evaluate potential issues/i });
    await userEvent.click(evaluateButton);

    await expect(screen.findByText(/Potential Issues Evaluation/i)).resolves.toBeDefined();
    await expect(screen.findByText(/North Valley/i)).resolves.toBeDefined();
  });

  it("sends a suggested action prompt", async () => {
    let requestBody: Record<string, unknown> | null = null;

    server.use(
      http.post("*/api/agent-chat", async ({ request }) => {
        requestBody = (await request.json()) as Record<string, unknown>;

        const stream = createSseStream([
          buildSseChunk("metadata", {
            conversationId: "session-2",
            conversationSk: 300,
            turnNumber: 1,
          }),
          buildSseChunk("delta", { content: "Summary response" }),
          buildSseChunk("done", { success: true }),
        ]);

        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    render(<AssistantWidget />);

    const summaryButton = await screen.findByRole("button", { name: /generate summary/i });
    await userEvent.click(summaryButton);

    await screen.findByText(/Summary response/i);

    expect(requestBody?.message).toMatch(/Generate a comprehensive summary/i);
  });

  it("shows tool progress indicators during streaming", async () => {
    server.use(
      http.post("*/api/agent-chat", () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                buildSseChunk("tool-start", {
                  toolCallId: "tool-1",
                  toolName: "validate-report",
                  displayName: "Validating report",
                })
              )
            );

            setTimeout(() => {
              controller.enqueue(
                encoder.encode(buildSseChunk("delta", { content: "Tool response" }))
              );
              controller.enqueue(
                encoder.encode(buildSseChunk("done", { success: true }))
              );
              controller.close();
            }, 300);
          },
        });

        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Run tool");
    await userEvent.keyboard("{Enter}");

    await expect(screen.findByText(/Validating report/i)).resolves.toBeDefined();
    await expect(screen.findByText(/Tool response/i)).resolves.toBeDefined();

    await waitFor(() =>
      expect(screen.queryByText(/Validating report/i)).not.toBeInTheDocument()
    );
  });

  it("shows a friendly error when the stream returns an error event", async () => {
    server.use(
      http.post("*/api/agent-chat", () => {
        const stream = createSseStream([
          buildSseChunk("error", { message: "Mastra failed" }),
          buildSseChunk("done", { success: false }),
        ]);

        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Trigger error");
    await userEvent.keyboard("{Enter}");

    await expect(
      screen.findByText(/Sorry, something went wrong: Mastra failed/i)
    ).resolves.toBeDefined();
  });

  it("handles non-stream responses and persists conversationId", async () => {
    server.use(
      http.post("*/api/agent-chat", () =>
        HttpResponse.json({
          response: "Plain reply",
          conversationId: "session-3",
          conversationSk: 555,
          turnNumber: 1,
        })
      )
    );

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Non-stream response");
    await userEvent.keyboard("{Enter}");

    await expect(screen.findByText(/Plain reply/i)).resolves.toBeDefined();
    expect(sessionStorage.getItem(`sdac-conversation-${REPORT_ID}`)).toBe("session-3");
  });
});
