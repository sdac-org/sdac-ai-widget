import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AssistantWidget } from "../AssistantWidget";
import { server } from "@/test/msw-server";

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

const mockAgentChat = (payload: { conversationSk?: number; turnNumber: number; content: string }) => {
  const stream = createSseStream([
    buildSseChunk("metadata", {
      conversationId: "session-1",
      ...(payload.conversationSk !== undefined && { conversationSk: payload.conversationSk }),
      turnNumber: payload.turnNumber,
    }),
    buildSseChunk("delta", { content: payload.content }),
    buildSseChunk("done", {
      success: true,
      ...(payload.conversationSk !== undefined && { conversationSk: payload.conversationSk }),
      turnNumber: payload.turnNumber,
    }),
  ]);

  server.use(
    http.post("*/api/agent-chat", () =>
      new HttpResponse(stream, {
        headers: { "Content-Type": "text/event-stream" },
      })
    )
  );
};

const mockFeedback = (handler: (request: Request) => HttpResponse) => {
  server.use(http.post("*/api/sdac/feedback", ({ request }) => handler(request)));
};

const getFeedbackScope = async (responseText: RegExp) => {
  const messageNode = await screen.findByText(responseText);
  let current: HTMLElement | null = messageNode instanceof HTMLElement ? messageNode : null;
  while (current) {
    const parent = current.parentElement;
    if (parent?.textContent?.includes("Send feedback")) {
      return within(parent);
    }
    current = parent;
  }
  throw new Error("Unable to locate feedback container for message");
};

const findAncestorWithClassFragment = (node: HTMLElement, classFragment: string) => {
  let current: HTMLElement | null = node;
  while (current) {
    if (typeof current.className === "string" && current.className.includes(classFragment)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

describe("AssistantWidget feedback", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setReportId();
  });

  afterEach(() => {
    sessionStorage.clear();
    server.events.removeAllListeners("request:end");
  });

  it("submits feedback with conversation metadata", async () => {
    mockAgentChat({ conversationSk: 42, turnNumber: 3, content: "Helpful response" });

    let feedbackBody: Record<string, unknown> | null = null;
    mockFeedback(() =>
      new HttpResponse(
        JSON.stringify({
          success: true,
          feedbackSk: 123,
          message: "Feedback recorded",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      )
    );

    server.events.on("request:end", async ({ request }) => {
      if (request.url.endsWith("/api/sdac/feedback")) {
        feedbackBody = (await request.json()) as Record<string, unknown>;
      }
    });

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Check variance");
    await userEvent.keyboard("{Enter}");

    const feedbackScope = await getFeedbackScope(/Helpful response/i);

    await userEvent.click(feedbackScope.getByRole("button", { name: /send feedback/i }));
    await userEvent.selectOptions(feedbackScope.getByRole("combobox"), "clarity");
    await userEvent.type(feedbackScope.getByPlaceholderText(/what went wrong\?/i), "Needs clearer steps.");

    const submitButton = feedbackScope.getByRole("button", { name: /^send$/i });
    await userEvent.click(submitButton);

    await waitFor(() => expect(feedbackBody).not.toBeNull());
    expect(feedbackBody).toMatchObject({
      conversationSk: 42,
      reportId: REPORT_ID,
      sessionId: expect.any(String),
      userId: "demo-user",
      agentId: "sdac-coordinator-release",
      feedbackScope: "response",
      turnNumber: 3,
      category: "clarity",
      comment: "Needs clearer steps.",
    });

    expect(feedbackScope.getByText(/thanks!/i)).toBeInTheDocument();
  });

  it("hides response feedback when metadata is missing", async () => {
    mockAgentChat({ turnNumber: 2, content: "Response without metadata" });

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Another question");
    await userEvent.keyboard("{Enter}");

    await screen.findByText(/Response without metadata/i);
    expect(screen.queryByRole("button", { name: /send feedback/i })).not.toBeInTheDocument();
  });

  it("submits conversation feedback using conversationId fallback when response metadata is unavailable", async () => {
    mockAgentChat({ turnNumber: 2, content: "Response without metadata" });

    let feedbackBody: Record<string, unknown> | null = null;
    mockFeedback(() =>
      new HttpResponse(JSON.stringify({ success: true, feedbackSk: 991 }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    );

    server.events.on("request:end", async ({ request }) => {
      if (request.url.endsWith("/api/sdac/feedback")) {
        feedbackBody = (await request.json()) as Record<string, unknown>;
      }
    });

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Another question");
    await userEvent.keyboard("{Enter}");

    await screen.findByText(/Response without metadata/i);

    const conversationButton = screen.getByRole("button", { name: /conversation feedback/i });
    expect(conversationButton).toBeEnabled();

    await userEvent.click(conversationButton);
    await userEvent.selectOptions(screen.getByRole("combobox"), "clarity");
    await userEvent.type(screen.getByPlaceholderText(/what should improve\?/i), "Conversation-level fallback works");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(feedbackBody).not.toBeNull());
    expect(feedbackBody).toMatchObject({
      conversationId: "session-1",
      feedbackScope: "conversation",
      category: "clarity",
      comment: "Conversation-level fallback works",
    });
  });

  it("renders long unbroken strings without dropping content", async () => {
    const longToken = "15913407DBC24ECC84511E9BC87647F5";
    mockAgentChat({
      conversationSk: 101,
      turnNumber: 5,
      content: `Report token ${longToken}`,
    });

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Show token");
    await userEvent.keyboard("{Enter}");

    const tokenNode = await screen.findByText(new RegExp(longToken, "i"));
    expect(tokenNode).toBeInTheDocument();

    const wrappingContainer = findAncestorWithClassFragment(
      tokenNode as HTMLElement,
      "overflow-wrap:anywhere"
    );
    expect(wrappingContainer).toBeTruthy();
  });

  it("sends conversation-level feedback", async () => {
    mockAgentChat({ conversationSk: 88, turnNumber: 4, content: "Detailed response" });

    let feedbackBody: Record<string, unknown> | null = null;
    mockFeedback(() =>
      new HttpResponse(JSON.stringify({ success: true, feedbackSk: 777 }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    );

    server.events.on("request:end", async ({ request }) => {
      if (request.url.endsWith("/api/sdac/feedback")) {
        feedbackBody = (await request.json()) as Record<string, unknown>;
      }
    });

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Give me details");
    await userEvent.keyboard("{Enter}");

    await screen.findByText(/Detailed response/i);
    await userEvent.click(screen.getByRole("button", { name: /conversation feedback/i }));
    await userEvent.selectOptions(screen.getByRole("combobox"), "clarity");
    await userEvent.type(screen.getByPlaceholderText(/what should improve\?/i), "Needs more detail on fringe variance");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(feedbackBody).not.toBeNull());
    expect(feedbackBody).toMatchObject({
      conversationSk: 88,
      turnNumber: 4,
      feedbackScope: "conversation",
      category: "clarity",
      comment: "Needs more detail on fringe variance",
    });
  });

  it("shows an error when feedback submission fails", async () => {
    mockAgentChat({ conversationSk: 99, turnNumber: 2, content: "Another response" });

    mockFeedback(() =>
      new HttpResponse(JSON.stringify({ error: "Rating must be between 1 and 5" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    );

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Feedback error test");
    await userEvent.keyboard("{Enter}");

    const feedbackScope = await getFeedbackScope(/Another response/i);
    await userEvent.click(feedbackScope.getByRole("button", { name: /send feedback/i }));
    await userEvent.selectOptions(feedbackScope.getByRole("combobox"), "accuracy");
    await userEvent.type(feedbackScope.getByPlaceholderText(/what went wrong\?/i), "Not accurate.");
    await userEvent.click(feedbackScope.getByRole("button", { name: /^send$/i }));

    expect(
      await screen.findByText(/Rating must be between 1 and 5|Invalid request body/i)
    ).toBeInTheDocument();
  });

  it("closes response feedback controls after successful submission", async () => {
    mockAgentChat({ conversationSk: 55, turnNumber: 1, content: "Final response" });

    mockFeedback(() =>
      new HttpResponse(JSON.stringify({ success: true, feedbackSk: 321 }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    );

    render(<AssistantWidget />);

    const input = screen.getByPlaceholderText("Ask anything...");
    await userEvent.type(input, "Lock feedback");
    await userEvent.keyboard("{Enter}");

    const feedbackScope = await getFeedbackScope(/Final response/i);
    await userEvent.click(feedbackScope.getByRole("button", { name: /send feedback/i }));
    await userEvent.selectOptions(feedbackScope.getByRole("combobox"), "other");
    await userEvent.type(feedbackScope.getByPlaceholderText(/what went wrong\?/i), "General suggestion.");
    const submitButton = feedbackScope.getByRole("button", { name: /^send$/i });
    await userEvent.click(submitButton);

    await screen.findByText(/thanks!/i);
    expect(feedbackScope.queryByPlaceholderText(/what went wrong\?/i)).not.toBeInTheDocument();
  });
});
