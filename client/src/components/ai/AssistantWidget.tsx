import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  X,
  Send,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  ArrowLeft,
  MessageSquare,
  Plus,
  RotateCcw,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { MOCK_ISSUES, REPORT_DATA } from "@/lib/mock-data";
import { useSessionContext } from "@/hooks/useSessionContext";
import { SuggestedActions } from "./components/SuggestedActions";
import { MessageRenderer } from "@/renderers";
import type { Feature } from "@/features";

type ViewState = "main" | "analyzing" | "chat";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  /** Special local UI component (not from Mastra) */
  isLocalComponent?: "summary";
};

type Thread = {
  id: string;
  title: string;
  type: "overview" | "issue" | "general";
  messages: Message[];
  lastMessageAt: Date;
  issueId?: number;
};

/** Active tool call being executed */
type ActiveTool = {
  toolCallId: string;
  toolName: string;
  displayName: string;
  startTime: number;
};

/** Issue from validation API */
type ValidationIssue = {
  id: number;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  amount: number | null;
  category: string;
  recordId?: number;
};

/** Validation result from API */
type ValidationResult = {
  reportId: string;
  districtName: string;
  quarter: string;
  totalRecords: number;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    passedCount: number;
    analysisTime: number;
  };
};

export function AssistantWidget({ onClose }: { onClose?: () => void }) {
  const [view, setView] = useState<ViewState>("main");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<Map<string, ActiveTool>>(new Map());
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const agentId = import.meta.env.VITE_MASTRA_AGENT_ID as string | undefined;

  const { context: sessionContext, setConversationId, clearConversation } = useSessionContext({
    reportId: (import.meta.env.VITE_REPORT_ID as string) || "",
    user: {
      id: (import.meta.env.VITE_DEMO_USER_ID as string) || "demo-user",
      name: (import.meta.env.VITE_DEMO_USER_NAME as string) || "Demo User",
      role: (import.meta.env.VITE_DEMO_USER_ROLE as string) || "District Admin",
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threads, activeThreadId, isTyping, view]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const startAnalysis = async () => {
    setView("analyzing");
    setValidationError(null);

    try {
      // Fetch real validation data from Mastra
      const response = await fetch("/api/validate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: sessionContext.reportId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Validation failed" }));
        throw new Error(error.error || "Validation failed");
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);

      // Create overview thread with real data
      if (!threads.find((t) => t.id === "overview")) {
        const overviewThread: Thread = {
          id: "overview",
          title: "Potential Issues Evaluation",
          type: "overview",
          messages: [
            {
              id: "summary-component",
              role: "ai",
              content: "",
              isLocalComponent: "summary",
            },
          ],
          lastMessageAt: new Date(),
        };
        setThreads((prev) => [overviewThread, ...prev]);
      }

      setView("chat");
      setActiveThreadId("overview");
    } catch (error) {
      console.error("[AssistantWidget] Validation error:", error);
      setValidationError(error instanceof Error ? error.message : "Validation failed");
      
      // Fall back to mock data on error
      setValidationResult({
        reportId: sessionContext.reportId,
        districtName: REPORT_DATA.districtName,
        quarter: REPORT_DATA.quarter,
        totalRecords: REPORT_DATA.positions,
        issues: MOCK_ISSUES.map((issue) => ({
          ...issue,
          priority: issue.priority as "high" | "medium" | "low",
          category: "MOCK",
        })),
        summary: {
          errorCount: MOCK_ISSUES.filter((i) => i.priority === "high").length,
          warningCount: MOCK_ISSUES.filter((i) => i.priority === "medium").length,
          passedCount: 5,
          analysisTime: 0,
        },
      });

      if (!threads.find((t) => t.id === "overview")) {
        const overviewThread: Thread = {
          id: "overview",
          title: "Potential Issues Evaluation",
          type: "overview",
          messages: [
            {
              id: "summary-component",
              role: "ai",
              content: "",
              isLocalComponent: "summary",
            },
          ],
          lastMessageAt: new Date(),
        };
        setThreads((prev) => [overviewThread, ...prev]);
      }

      setView("chat");
      setActiveThreadId("overview");
    }
  };

  const handleBackToMain = () => {
    setView("main");
    setActiveThreadId(null);
  };

  const createIssueThread = (issue: ValidationIssue) => {
    const existing = threads.find((t) => t.issueId === issue.id);
    if (existing) {
      setActiveThreadId(existing.id);
      setView("chat");
      return;
    }

    // Create text content for issue init
    const initContent = `I've opened a detailed view for **${issue.title}**.\n\n**Issue:** ${issue.description}\n**Category:** ${issue.category}\n**Impact:** ${issue.amount ? "$" + issue.amount.toLocaleString() : "N/A"}\n\nHow would you like to handle this? I can help draft a response, check historical context, or explain the validation rule.`;

    const newThread: Thread = {
      id: `issue-${issue.id}`,
      title: issue.title,
      type: "issue",
      issueId: issue.id,
      lastMessageAt: new Date(),
      messages: [{ id: "init", role: "ai", content: initContent }],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setView("chat");
  };

  const createGeneralThread = (initialMsg?: string) => {
    // Plain text welcome message
    const welcomeContent = "I'm ready to help. You can ask me about source codes, cost pools, or general validation rules.";

    const newThread: Thread = {
      id: `general-${Date.now()}`,
      title: "New Conversation",
      type: "general",
      lastMessageAt: new Date(),
      messages: [{ id: "welcome", role: "ai", content: welcomeContent }],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setView("chat");

    if (initialMsg) {
      setTimeout(() => handleSendMessage(initialMsg, newThread.id), 100);
    }
  };

  const handleFeatureSelect = (feature: Feature, prompt: string) => {
    if (feature.id === "evaluate-issues") {
      startAnalysis();
      return;
    }

    if (feature.startsNewThread) {
      createGeneralThread(prompt);
      return;
    }

    if (prompt) {
      handleSendMessage(prompt);
    }
  };

  const fetchAgentReply = async (
    text: string,
    threadId: string,
    onDelta?: (delta: string) => void
  ): Promise<{ content: string | null; conversationId?: string; turnNumber?: number; error?: string }> => {
    // Simplified payload - backend manages conversation history
    const payload = {
      agentId,
      conversationId: sessionContext.conversationId,
      reportId: sessionContext.reportId,
      userId: sessionContext.user.id,
      sessionId: sessionContext.sessionId,
      message: text,
      stream: true,
    };

    try {
      const response = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return { content: null, error: `Request failed: ${response.status}` };
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) return { content: null, error: "No response body" };

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let responseConversationId: string | undefined;
        let responseTurnNumber: number | undefined;
        let errorMessage: string | undefined;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const eventBlock of events) {
            // Parse named SSE events (event: type\ndata: {...})
            const lines = eventBlock.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                eventData = line.slice(5).trim();
              }
            }

            if (!eventData) continue;
            if (eventData.trim() === "[DONE]") break;

            try {
              const json = JSON.parse(eventData);

              switch (eventType) {
                case "metadata":
                  // Store conversation metadata from server
                  responseConversationId = json.conversationId;
                  responseTurnNumber = json.turnNumber;
                  break;

                case "delta":
                  // Stream text content
                  if (json.content) {
                    fullText += json.content;
                    onDelta?.(json.content);
                  }
                  break;

                case "tool-start":
                  // Tool execution started
                  setActiveTools(prev => {
                    const next = new Map(prev);
                    next.set(json.toolCallId, {
                      toolCallId: json.toolCallId,
                      toolName: json.toolName,
                      displayName: json.displayName,
                      startTime: Date.now(),
                    });
                    return next;
                  });
                  break;

                case "tool-result":
                  // Tool execution completed
                  setActiveTools(prev => {
                    const next = new Map(prev);
                    next.delete(json.toolCallId);
                    return next;
                  });
                  break;

                case "error":
                  // Error from server
                  errorMessage = json.message || "An error occurred";
                  break;

                case "usage":
                case "done":
                  // Clear any remaining tool indicators
                  setActiveTools(new Map());
                  break;

                default:
                  // Fallback: try legacy parsing for backwards compatibility
                  const parsed = extractStreamData(eventData);
                  if (parsed.delta) {
                    fullText += parsed.delta;
                    onDelta?.(parsed.delta);
                  }
                  if (parsed.conversationId) {
                    responseConversationId = parsed.conversationId;
                  }
                  if (parsed.turnNumber !== undefined) {
                    responseTurnNumber = parsed.turnNumber;
                  }
              }
            } catch {
              // If JSON parse fails, might be raw text
              if (eventData.trim() !== "[DONE]") {
                fullText += eventData;
                onDelta?.(eventData);
              }
            }
          }
        }

        return {
          content: fullText || null,
          conversationId: responseConversationId,
          turnNumber: responseTurnNumber,
          error: errorMessage,
        };
      }

      const data = await response.json().catch(() => null);
      const raw = data?.data ?? data;
      const content =
        raw?.text ?? raw?.message?.content ?? raw?.content ?? raw?.response ?? null;
      return {
        content: typeof content === "string" ? content : null,
        conversationId: raw?.conversationId,
        turnNumber: raw?.turnNumber,
      };
    } catch (e) {
      return { content: null, error: e instanceof Error ? e.message : "Request failed" };
    }
  };

  const extractStreamData = (payload: string): {
    delta: string | null;
    conversationId?: string;
    turnNumber?: number;
  } => {
    try {
      const json = JSON.parse(payload);

      // Extract conversation metadata if present
      const conversationId = json?.conversationId;
      const turnNumber = json?.turnNumber;

      if (json?.type === "text" && typeof json.text === "string") {
        return { delta: json.text, conversationId, turnNumber };
      }

      if (
        json?.type === "text-delta" &&
        typeof json?.payload?.text === "string"
      ) {
        return { delta: json.payload.text, conversationId, turnNumber };
      }

      if (json?.delta?.type === "text" && typeof json.delta.text === "string") {
        return { delta: json.delta.text, conversationId, turnNumber };
      }

      const delta =
        json?.delta ??
        json?.text ??
        json?.content ??
        json?.message?.content ??
        json?.choices?.[0]?.delta?.content ??
        json?.choices?.[0]?.message?.content ??
        json?.data?.text;

      return {
        delta: typeof delta === "string" ? delta : null,
        conversationId,
        turnNumber,
      };
    } catch {
      return { delta: payload };
    }
  };

  const handleSendMessage = async (text: string, threadIdOverride?: string) => {
    if (!text.trim()) return;

    const targetThreadId = threadIdOverride || activeThreadId;

    if (!targetThreadId && view === "main") {
      createGeneralThread(text);
      return;
    }

    if (!targetThreadId) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === targetThreadId) {
          return {
            ...t,
            messages: [...t.messages, newMsg],
            lastMessageAt: new Date(),
            title:
              t.type === "general" && t.messages.length <= 1
                ? text.slice(0, 30) + "..."
                : t.title,
          };
        }
        return t;
      })
    );

    setInputValue("");
    setIsTyping(true);

    const streamMessageId = Date.now().toString() + "_ai_stream";
    setStreamingMessageId(streamMessageId);
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === targetThreadId) {
          return {
            ...t,
            messages: [
              ...t.messages,
              { id: streamMessageId, role: "ai", content: "" },
            ],
            lastMessageAt: new Date(),
          };
        }
        return t;
      })
    );

    const agentReply = await fetchAgentReply(text, targetThreadId, (delta) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === targetThreadId) {
            return {
              ...t,
              messages: t.messages.map((m) =>
                m.id === streamMessageId
                  ? { ...m, content: m.content + delta }
                  : m
              ),
              lastMessageAt: new Date(),
            };
          }
          return t;
        })
      );
    });

    let responseMsg: Message;

    if (agentReply.content) {
      responseMsg = {
        id: streamMessageId,
        role: "ai",
        content: agentReply.content,
      };

      // Save conversation ID if this is a new conversation
      if (agentReply.conversationId && !sessionContext.conversationId) {
        setConversationId(agentReply.conversationId);
      }
    } else {
      // Return error message - show actual error if available
      const errorContent = agentReply.error
        ? `Sorry, something went wrong: ${agentReply.error}`
        : "Sorry, I'm unable to process your request at the moment. Please try again later.";
      
      responseMsg = {
        id: streamMessageId,
        role: "ai",
        content: errorContent,
      };
    }

    // Clear tool indicators
    setActiveTools(new Map());

    setIsTyping(false);
    setStreamingMessageId(null);
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === targetThreadId) {
          const exists = t.messages.some((m) => m.id === responseMsg.id);
          return {
            ...t,
            messages: exists
              ? t.messages.map((m) =>
                  m.id === responseMsg.id ? responseMsg : m
                )
              : [...t.messages, responseMsg],
            lastMessageAt: new Date(),
          };
        }
        return t;
      })
    );
  };

  const handleClose = () => {
    if (onClose) onClose();
    window.parent.postMessage({ type: "close-widget" }, "*");
    window.postMessage({ type: "close-widget" }, "*");
  };

  const handleStartFresh = () => {
    // Clear backend conversation (starts new conversation with Mastra)
    clearConversation();
    // Clear all local threads
    setThreads([]);
    setActiveThreadId(null);
    // Return to main view
    setView("main");
  };

  return (
    <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {view === "chat" && (
            <button
              onClick={handleBackToMain}
              className="p-1 hover:bg-slate-800 rounded-full transition-colors -ml-1"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
          )}
          {view === "main" && (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}

          <div>
            <h3 className="font-bold text-sm">
              {view === "chat" && activeThread
                ? activeThread.title
                : "SDAC Assistant"}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {view !== "analyzing" && view !== "main" && (
            <>
              <button
                onClick={() => createGeneralThread()}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleStartFresh}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                title="Start Fresh (Clear All)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-1"
            title="Close Widget"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-slate-50 relative flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col flex-1 h-full"
            >
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 pt-8 pb-2">
                  <div className="flex w-full mb-6">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-sm text-slate-800 leading-relaxed max-w-[85%]">
                      <p>
                        I'm ready to help. You can ask me about the issues I
                        found, or detailed questions about specific positions.
                      </p>
                    </div>
                  </div>

                  {threads.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Recent ({Math.min(threads.length, 5)})
                        </h5>
                        <button className="text-[10px] text-blue-600 font-medium hover:text-blue-700 transition-colors">
                          View all history →
                        </button>
                      </div>
                      <div className="space-y-3">
                        {threads.slice(0, 5).map((thread) => (
                          <div
                            key={thread.id}
                            onClick={() => {
                              setActiveThreadId(thread.id);
                              setView("chat");
                            }}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {thread.type === "overview" && (
                                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                                )}
                                {thread.type === "issue" && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                )}
                                {thread.type === "general" && (
                                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span
                                  className={`font-semibold text-sm ${thread.type === "overview" ? "text-blue-900" : "text-slate-900"}`}
                                >
                                  {thread.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {thread.lastMessageAt.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 ml-5.5">
                              {thread.messages[thread.messages.length - 1]
                                .isLocalComponent
                                ? "Issues overview"
                                : thread.messages[
                                    thread.messages.length - 1
                                  ].content.slice(0, 50)}
                              ...
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white border-t border-slate-100 shrink-0 flex flex-col gap-3">
                <div className="overflow-visible">
                  <SuggestedActions
                    onFeatureSelect={handleFeatureSelect}
                    context={{
                      reportId: sessionContext.reportId,
                      user: sessionContext.user,
                      view: view,
                    }}
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSendMessage(inputValue)
                    }
                    placeholder="Ask anything..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                <Bot className="absolute inset-0 m-auto w-6 h-6 text-blue-500" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Analyzing Cost Data...
              </h4>
              <p className="text-sm text-slate-500">
                Checking against 43 validation rules and historical patterns.
              </p>
            </motion.div>
          )}

          {view === "chat" && activeThread && (
            <motion.div
              key="chat"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="flex flex-col flex-1 h-full overflow-hidden"
            >
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
              >
                {activeThread.messages.map((msg) => {
                  // Hide empty streaming messages (typing indicator shows instead)
                  const isEmptyStreamingMessage = msg.id === streamingMessageId && !msg.content?.trim();
                  if (isEmptyStreamingMessage) return null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${msg.isLocalComponent ? "w-full" : ""}`}
                    >
                      {msg.role === "ai" && !msg.isLocalComponent && (
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                          <Bot className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                      )}

                      {msg.isLocalComponent === "summary" ? (
                        <SummaryComponent
                          validationResult={validationResult}
                          validationError={validationError}
                          onCreateIssueThread={createIssueThread}
                        />
                      ) : (
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                          }`}
                        >
                          {msg.role === "user" ? (
                            msg.content
                          ) : (
                            <MessageRenderer content={msg.content} isStreaming={msg.id === streamingMessageId} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1">
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      {activeTools.size > 0 ? (
                        <div className="flex flex-col gap-1">
                          {Array.from(activeTools.values()).map((tool) => (
                            <div key={tool.toolCallId} className="flex items-center gap-2 text-sm text-slate-600">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              <span>{tool.displayName}...</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSendMessage(inputValue)
                    }
                    placeholder="Ask anything..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Local summary component showing validation issues */
function SummaryComponent({
  validationResult,
  validationError,
  onCreateIssueThread,
}: {
  validationResult: ValidationResult | null;
  validationError: string | null;
  onCreateIssueThread: (issue: ValidationIssue) => void;
}) {
  // Show loading state if no result yet
  if (!validationResult) {
    return (
      <div className="space-y-4 w-full">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading validation results...</span>
          </div>
        </div>
      </div>
    );
  }

  const issueCount = validationResult.issues.length;
  const highPriorityCount = validationResult.issues.filter((i) => i.priority === "high").length;

  return (
    <div className="space-y-4 w-full">
      {/* Error banner if validation had issues */}
      {validationError && (
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> Could not connect to validation service. Showing cached/mock data.
          </p>
        </div>
      )}

      {/* Summary header */}
      <div className={`p-4 rounded-xl border ${
        issueCount === 0 
          ? "bg-green-50 border-green-100" 
          : "bg-blue-50 border-blue-100"
      }`}>
        {issueCount === 0 ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-900">
              Great news! <strong>{validationResult.districtName}</strong> passed all validation checks.
            </p>
          </div>
        ) : (
          <p className="text-sm text-blue-900">
            I've reviewed <strong>{validationResult.districtName}</strong> ({validationResult.quarter}) and found{" "}
            <strong className="text-blue-700">
              {issueCount} potential issue{issueCount !== 1 ? "s" : ""}
            </strong>
            {highPriorityCount > 0 && (
              <span className="text-red-600"> ({highPriorityCount} high priority)</span>
            )}{" "}
            that may require attention.
          </p>
        )}
      </div>

      {/* Analysis summary stats */}
      {validationResult.summary && (
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-red-50 text-red-700 rounded-lg border border-red-100">
            {validationResult.summary.errorCount} errors
          </span>
          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
            {validationResult.summary.warningCount} warnings
          </span>
          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100">
            {validationResult.summary.passedCount} passed
          </span>
        </div>
      )}

      {/* Issues list */}
      {issueCount > 0 && (
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Detected Issues ({issueCount})
          </h5>
          {validationResult.issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => onCreateIssueThread(issue)}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    issue.priority === "high"
                      ? "bg-red-100 text-red-600"
                      : issue.priority === "medium"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-blue-100 text-blue-600"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <h6 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                    {issue.title}
                  </h6>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {issue.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {issue.category}
                    </span>
                    {issue.amount !== null && (
                      <span className="text-xs font-mono font-medium text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        ${issue.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-400 transition-colors shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
