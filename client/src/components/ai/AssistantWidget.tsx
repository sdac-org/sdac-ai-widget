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
  UploadCloud,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  uploadIngestionFile,
  uploadSdacReport,
  checkIngestionJobStatus,
  checkSdacReportAnalysisStatus,
  checkSdacReportStatus,
  isExcelFile
} from "@/lib/ingestion-api";
import { useSessionContext, saveUploadedReportId, getUploadedReportId, clearUploadedReportId, clearConversationId } from "@/hooks/useSessionContext";
import { getHostPageContext } from "@/hooks/useHostPageContext";
import { useServerSession } from "@/hooks/useServerSession";
import { getIngestionApiUrl } from "@/lib/api-config";
import { syncDistrictReport } from "@/lib/session-api";
import { SuggestedActions } from "./components/SuggestedActions";
import { MessageRenderer } from "@/renderers";
import type { Feature } from "@/features";

type ViewState = "main" | "analyzing" | "chat";

const TOOL_STATUS_PERSIST_MS = 10_000;
const FEEDBACK_SUCCESS_PERSIST_MS = 4_000;

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  /** Special local UI component (not from Mastra) */
  isLocalComponent?: "summary";
  conversationSk?: number;
  turnNumber?: number;
  feedback?: FeedbackState;
};

const feedbackCategories = [
  "accuracy",
  "clarity",
  "relevance",
  "helpfulness",
  "tone",
  "other",
] as const;

type FeedbackCategory = (typeof feedbackCategories)[number];

type FeedbackState = {
  category?: FeedbackCategory;
  comment?: string;
  isOpen?: boolean;
  status: "idle" | "submitting" | "submitted" | "error";
  error?: string;
};

type Thread = {
  id: string;
  title: string;
  type: "overview" | "issue" | "general";
  messages: Message[];
  feedback?: FeedbackState;
  lastMessageAt: Date;
  issueId?: number;
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
  positionLabel?: string;
  mainRowNumber?: number | null;
  linkedRecordIds?: number[];
  occupants?: string[];
  reasons?: string[];
  confidence?: "HIGH" | "MEDIUM" | "LOW";
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

type ResolvedReportContext = {
  districtName: string | null;
  quarter: string | null;
  year: number | null;
};

function getDefaultReportId(): string {
  const uploadedId = getUploadedReportId();
  if (uploadedId) return uploadedId;
  const mode = import.meta.env.MODE;
  if (mode === "development" || mode === "test") {
    return (import.meta.env.VITE_REPORT_ID as string) || "";
  }
  return "";
}

export function AssistantWidget({
  onClose,
  toolStatusPersistMs = TOOL_STATUS_PERSIST_MS,
}: {
  onClose?: () => void;
  toolStatusPersistMs?: number;
}) {
  const [view, setView] = useState<ViewState>("main");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [activeToolStatus, setActiveToolStatus] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  // Pending file for re-ingest (when duplicate detected)
  const [pendingReIngestFile, setPendingReIngestFile] = useState<{
    file: File;
    userEmail: string;
    userName: string;
    district: string;
  } | null>(null);
  const [activeReportId, setActiveReportId] = useState<string>(() => getDefaultReportId());
  const [resolvedReportContext, setResolvedReportContext] = useState<ResolvedReportContext | null>(null);
  const [contextResolutionError, setContextResolutionError] = useState<string | null>(null);
  const [isResolvingFallback, setIsResolvingFallback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toolStatusTimeoutRef = useRef<number | null>(null);
  const feedbackResetTimeoutsRef = useRef<Map<string, number>>(new Map());
  const agentId = "sdac-coordinator-release";

  const clearToolStatusTimeout = () => {
    if (toolStatusTimeoutRef.current !== null) {
      window.clearTimeout(toolStatusTimeoutRef.current);
      toolStatusTimeoutRef.current = null;
    }
  };

  const scheduleToolStatusFallback = () => {
    clearToolStatusTimeout();
    toolStatusTimeoutRef.current = window.setTimeout(() => {
      setActiveToolStatus(null);
      toolStatusTimeoutRef.current = null;
    }, toolStatusPersistMs);
  };

  useEffect(() => () => {
    clearToolStatusTimeout();
    feedbackResetTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    feedbackResetTimeoutsRef.current.clear();
  }, []);

  const clearFeedbackResetTimeout = (feedbackKey: string) => {
    const timeoutId = feedbackResetTimeoutsRef.current.get(feedbackKey);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      feedbackResetTimeoutsRef.current.delete(feedbackKey);
    }
  };

  const scheduleFeedbackReset = (
    params:
      | { scope: "response"; threadId: string; messageId: string }
      | { scope: "conversation"; threadId: string }
  ) => {
    const feedbackKey =
      params.scope === "response"
        ? `${params.threadId}:${params.messageId}`
        : `conversation:${params.threadId}`;

    clearFeedbackResetTimeout(feedbackKey);

    const timeoutId = window.setTimeout(() => {
      if (params.scope === "response") {
        updateMessageFeedback(params.threadId, params.messageId, (current) => ({
          ...current,
          status: "idle",
          isOpen: false,
          error: undefined,
        }));
      } else {
        updateThreadFeedback(params.threadId, (current) => ({
          ...current,
          status: "idle",
          isOpen: false,
          error: undefined,
        }));
      }
      feedbackResetTimeoutsRef.current.delete(feedbackKey);
    }, FEEDBACK_SUCCESS_PERSIST_MS);

    feedbackResetTimeoutsRef.current.set(feedbackKey, timeoutId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    
    // Ensure we have an active thread to report to
    let targetThreadId = activeThreadId;
    if (!targetThreadId) {
      if (view === "main") {
        const newThreadId = `general-${Date.now()}`;
        const newThread: Thread = {
          id: newThreadId,
          title: "File Upload",
          type: "general",
          lastMessageAt: new Date(),
          messages: [],
        };
        setThreads((prev) => [newThread, ...prev]);
        setActiveThreadId(newThreadId);
        setView("chat");
        targetThreadId = newThreadId;
      }
    }

    if (!targetThreadId) return;

    const statusMsgId = Date.now().toString();
    const uploadStatusMsg: Message = {
      id: statusMsgId,
      role: "ai",
      content: `📤 **Uploading File**\n\nPreparing \`${file.name}\` for upload and analysis...`,
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === targetThreadId) {
          return {
            ...t,
            messages: [...t.messages, uploadStatusMsg],
            lastMessageAt: new Date(),
          };
        }
        return t;
      })
    );

    setIsUploading(true);

    // Helper to add/update messages in the thread
    const addMessage = (msg: Message) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === targetThreadId) {
            return {
              ...t,
              messages: [...t.messages, msg],
              lastMessageAt: new Date(),
            };
          }
          return t;
        })
      );
    };

    const updateMessage = (msgId: string, content: string) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === targetThreadId) {
            return {
              ...t,
              messages: t.messages.map((m) =>
                m.id === msgId ? { ...m, content } : m
              ),
              lastMessageAt: new Date(),
            };
          }
          return t;
        })
      );
    };

    try {
      const isExcel = isExcelFile(file);

      if (isExcel) {
        // Use SDAC upload for Excel files (uploads to Blob Storage)
        // Get user info from host page context
        const uploadContext = getHostPageContext();
        const userEmail = uploadContext.userEmail || "demo@example.com";
        const userName = uploadContext.userName || "Demo User";
        const district =
          uploadContext.districtName ||
          uploadContext.districtId ||
          "Demo District";
        console.log("[AssistantWidget] Uploading SDAC report:", file.name);
        const result = await uploadSdacReport({
          file,
          userEmail,
          userName,
          district,
        });

        // Save the report ID for later use (ephemeral - clears on refresh)
        if (result.reportId) {
          saveUploadedReportId(result.reportId);
          setActiveReportId(result.reportId);
          setResolvedReportContext(null);
          setContextResolutionError(null);
          console.log("[AssistantWidget] Saved uploaded report ID:", result.reportId, result.isDuplicate ? "(duplicate)" : "");
        }

        // Handle duplicate upload - file already exists, offer choice
        if (result.isDuplicate && result.canReingest) {
          const existingInfo = result.existingReport
            ? `\nDistrict: \`${result.existingReport.district}\`\nQuarter: \`${result.existingReport.quarter} ${result.existingReport.year}\``
            : "";
          
          updateMessage(
            statusMsgId,
            `📋 **File Already Uploaded**\n\nFile: \`${file.name}\`${existingInfo}\n\nThis file has been uploaded before.\n\n**Option 1:** Use existing report (recommended)\n**Option 2:** Re-ingest as new report\n\nUse the button below to re-ingest, or continue chatting to use the existing report.`
          );
          
          // Store file info for potential re-ingest
          setPendingReIngestFile({ file, userEmail, userName, district });
          setIsUploading(false);
          return; // User can choose to validate or re-upload
        }
        
        // Handle simple duplicate (no re-ingest option) - backwards compatibility
        if (result.isDuplicate) {
          updateMessage(
            statusMsgId,
            `📋 **Report Already Added**\n\nFile: \`${file.name}\`\n\nThis file is already available. You can start reviewing it now.`
          );
          setIsUploading(false);
          return;
        }

        // Initial success message with report ID
        updateMessage(
          statusMsgId,
          `📤 **SDAC Report Uploaded**\n\nFile: \`${file.name}\`\n\n⏳ Upload complete. Starting analysis...`
        );

        // Poll SDAC analysis status if we have a reportId
        if (result.reportId) {
          setIsPreparingReport(true);
          setIsUploading(false);
          let attempts = 0;
          const maxAttempts = 90;
          const pollInterval = 2000; // 2 seconds

          const pollStatus = async () => {
            try {
              const analysis = await checkSdacReportAnalysisStatus(result.reportId!);

              if (analysis.status === "completed") {
                setIsPreparingReport(false);
                const status = await checkSdacReportStatus(result.reportId!);
                updateMessage(
                  statusMsgId,
                  `✅ **Report Ready**\n\nFile: \`${file.name}\`\nDistrict: \`${status.district || "N/A"}\`\nQuarter: \`${status.quarter || "N/A"} ${status.year || ""}\`\nPositions listed: \`${status.total_personnel_count || 0}\`\n\nYour file is ready. You can start reviewing it now.`
                );
                return; // Stop polling
              } else if (analysis.status === "error") {
                setIsPreparingReport(false);
                updateMessage(
                  statusMsgId,
                  `❌ **Review Setup Couldn’t Finish**\n\nFile: \`${file.name}\`\nError: ${analysis.message || "Unknown error"}\n\nThe file uploaded, but we could not finish preparing it for review.`
                );
                return; // Stop polling
              } else if (analysis.status === "not_found") {
                updateMessage(
                  statusMsgId,
                  `📤 **SDAC Report Uploaded**\n\nFile: \`${file.name}\`\n\n⏳ Getting your report ready... (${Math.floor((attempts + 1) * pollInterval / 1000)}s)`
                );
              } else {
                updateMessage(
                  statusMsgId,
                  `📤 **SDAC Report Uploaded**\n\nFile: \`${file.name}\`\n\n⏳ Reviewing the file now... (${Math.floor((attempts + 1) * pollInterval / 1000)}s)`
                );
              }

              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(pollStatus, pollInterval);
              } else {
                setIsPreparingReport(false);
                // Timeout - but upload was successful, show success
                updateMessage(
                  statusMsgId,
                  `✅ **SDAC Report Uploaded**\n\nFile: \`${file.name}\`\n\nYour file was uploaded. We are still getting it ready in the background.`
                );
              }
            } catch (pollError) {
              setIsPreparingReport(false);
              console.error("[AssistantWidget] SDAC analysis status poll error:", pollError);
              updateMessage(
                statusMsgId,
                `✅ **SDAC Report Uploaded**\n\nFile: \`${file.name}\`\n\nYour file was uploaded. We are still getting it ready in the background.`
              );
            }
          };

          // Start polling after a brief delay
          setTimeout(pollStatus, pollInterval);
        } else {
          setIsUploading(false);
          // No reportId returned but upload succeeded
          updateMessage(
            statusMsgId,
            `✅ **SDAC Report Uploaded Successfully**\n\nFile: \`${file.name}\`\n\nThe report has been uploaded successfully.`
          );
        }
      } else {
        // Use generic ingestion for non-Excel files (local staging only)
        console.log("[AssistantWidget] Uploading generic file:", file.name);
        const result = await uploadIngestionFile(file);

        // Initial success message with job ID
        updateMessage(
          statusMsgId,
          `📤 **File Uploaded**\n\nFile: \`${file.name}\`\nJob ID: \`${result.jobId || "N/A"}\`\n\n⏳ Processing... Checking ingestion status...`
        );

        // Poll job status if we have a jobId
        if (result.jobId) {
          let attempts = 0;
          const maxAttempts = 30; // Poll for up to 30 seconds
          const pollInterval = 1000; // 1 second

          const pollStatus = async () => {
            try {
              const status = await checkIngestionJobStatus(result.jobId!);

              if (status.status === "completed") {
                updateMessage(
                  statusMsgId,
                  `✅ **Upload Complete**\n\nFile: \`${file.name}\`\nJob ID: \`${result.jobId}\`\nTracking ID: \`${status.tracking_id || "N/A"}\`\n\nThe file has been successfully ingested and is ready for processing.`
                );
                return; // Stop polling
              } else if (status.status === "failed") {
                updateMessage(
                  statusMsgId,
                  `❌ **Ingestion Failed**\n\nFile: \`${file.name}\`\nJob ID: \`${result.jobId}\`\nError: ${status.error || "Unknown error"}\n\nPlease try uploading the file again.`
                );
                return; // Stop polling
              } else if (status.status === "queued") {
                updateMessage(
                  statusMsgId,
                  `📤 **File Uploaded**\n\nFile: \`${file.name}\`\nJob ID: \`${result.jobId}\`\n\n⏳ Queued for processing... (${attempts + 1}s)`
                );
              }

              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(pollStatus, pollInterval);
              } else {
                // Timeout - show final status
                updateMessage(
                  statusMsgId,
                  `📤 **File Uploaded**\n\nFile: \`${file.name}\`\nJob ID: \`${result.jobId}\`\n\n✓ File has been submitted. Processing may take a while for large files.`
                );
              }
            } catch (pollError) {
              console.error("[AssistantWidget] Job status poll error:", pollError);
              // If polling fails, just show the upload was successful
              updateMessage(
                statusMsgId,
                `✅ **File Uploaded**\n\nFile: \`${file.name}\`\nJob ID: \`${result.jobId}\`\n\nThe file has been queued for ingestion. Check the ingestion server for status.`
              );
            }
          };

          // Start polling after a brief delay
          setTimeout(pollStatus, pollInterval);
        }
      }
    } catch (error) {
      setIsPreparingReport(false);
      const rawErrorText = error instanceof Error ? error.message : "Unknown error";
      const hasStatusOnlyError = /sdac upload failed with status\s+\d+/i.test(rawErrorText);
      const errorText = hasStatusOnlyError
        ? "We couldn't process this file. Please use the standard SDAC template and verify required columns are present."
        : rawErrorText;
      const isValidationError =
        hasStatusOnlyError ||
        /invalid sdac file format|header|issue type:|missing required data|wrong file format/i.test(errorText);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `❌ **Upload Failed**\n\nFile: \`${file.name}\`\n\n${errorText}\n\n${isValidationError
          ? "Please use the SDAC cost report template with the required header row and columns."
          : "Please check your connection and try again."}`,
      };
      addMessage(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Re-ingest a file that was detected as duplicate, creating a new report ID
   */
  const handleReIngest = async () => {
    if (!pendingReIngestFile) {
      console.warn("[AssistantWidget] No pending file to re-ingest");
      return;
    }

    const { file, userEmail, userName, district } = pendingReIngestFile;
    setPendingReIngestFile(null); // Clear pending state
    setIsUploading(true);
    setIsPreparingReport(false);

    // Add message to current thread
    const activeThread = threads.find((t) => t.id === activeThreadId);
    const addMessage = (msg: Message) => {
      if (!activeThreadId) return;
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [...t.messages, msg],
              lastMessageAt: new Date(),
            };
          }
          return t;
        })
      );
    };

    try {
      const statusMsgId = Date.now().toString();
      addMessage({
        id: statusMsgId,
        role: "ai",
        content: `🔄 **Re-ingesting File**\n\nFile: \`${file.name}\`\n\n⏳ Creating new report...`,
      });

      console.log("[AssistantWidget] Re-ingesting SDAC report:", file.name);
      const result = await uploadSdacReport({
        file,
        userEmail,
        userName,
        district,
        forceReIngest: true,
      });

      if (result.reportId) {
        saveUploadedReportId(result.reportId);
        setActiveReportId(result.reportId);
        setResolvedReportContext(null);
        setContextResolutionError(null);
        console.log("[AssistantWidget] Re-ingest successful, new report ID:", result.reportId);

        // Clear conversation state/history for a fresh context on the new report
        clearConversation();
        clearConversationId(result.reportId);

        // Update message with success
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id === activeThreadId) {
              return {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === statusMsgId
                    ? {
                        ...m,
                        content: `✅ **New Report Created**\n\nFile: \`${file.name}\`\n\nA new report was created from this file. Conversation history has been cleared, and you can start reviewing it now.`,
                      }
                    : m
                ),
              };
            }
            return t;
          })
        );

        let attempts = 0;
        const maxAttempts = 90;
        const pollInterval = 2000;
        setIsPreparingReport(true);
        setIsUploading(false);

        const pollStatus = async () => {
          try {
            const analysis = await checkSdacReportAnalysisStatus(result.reportId!);

            if (analysis.status === "completed") {
              setIsPreparingReport(false);
              const status = await checkSdacReportStatus(result.reportId!);
              setThreads((prev) =>
                prev.map((t) => {
                  if (t.id === activeThreadId) {
                    return {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === statusMsgId
                          ? {
                              ...m,
                              content: `✅ **New Report Ready**\n\nFile: \`${file.name}\`\nDistrict: \`${status.district || "N/A"}\`\nQuarter: \`${status.quarter || "N/A"} ${status.year || ""}\`\nPositions listed: \`${status.total_personnel_count || 0}\`\n\nThe new report is ready, and conversation history has been cleared for a fresh start.`,
                            }
                          : m
                      ),
                    };
                  }
                  return t;
                })
              );
              return;
            }

            if (analysis.status === "error") {
              setIsPreparingReport(false);
              setThreads((prev) =>
                prev.map((t) => {
                  if (t.id === activeThreadId) {
                    return {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === statusMsgId
                          ? {
                              ...m,
                              content: `⚠️ **New Report Created**\n\nFile: \`${file.name}\`\n\nA new report was created, but we could not finish getting it ready for review.`,
                            }
                          : m
                      ),
                    };
                  }
                  return t;
                })
              );
              return;
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollStatus, pollInterval);
            } else {
              setIsPreparingReport(false);
            }
          } catch (pollError) {
            setIsPreparingReport(false);
            console.error("[AssistantWidget] Re-ingest analysis status poll error:", pollError);
          }
        };

        setTimeout(pollStatus, pollInterval);
      } else {
        throw new Error("No report ID returned from re-ingest");
      }
    } catch (error) {
      setIsPreparingReport(false);
      console.error("[AssistantWidget] Re-ingest failed:", error);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `❌ **Re-ingest Failed**\n\nFile: \`${file.name}\`\nError: ${error instanceof Error ? error.message : "Unknown error"}\n\nPlease try again.`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const hostContext = getHostPageContext();

  const { context: sessionContext, setConversationId, clearConversation } = useSessionContext({
    reportId: activeReportId,
    districtId: hostContext.districtId,
    user: {
      id: hostContext.userId,
      name: hostContext.userName,
      role: hostContext.userRole,
    },
  });

  // Initialize server-side session and resolve TherapyLog report for this district
  const {
    reportId: serverReportId,
    districtName: serverDistrictName,
    quarter: serverQuarter,
    year: serverYear,
    resolutionStatus,
    requestedQuarter,
    requestedYear,
    fallbackCandidate,
    isInitializing: isServerSessionInitializing,
    error: serverSessionError,
  } = useServerSession({
    districtId: hostContext.districtId,
    userId: hostContext.userId,
    userName: hostContext.userName,
    userEmail: hostContext.userEmail,
    userRole: hostContext.userRole,
  });

  // Apply server-resolved report ID if user hasn't uploaded their own
  useEffect(() => {
    if (!serverReportId) return;
    const uploadedId = getUploadedReportId();
    if (!uploadedId) {
      setActiveReportId(serverReportId);
      setResolvedReportContext({
        districtName: serverDistrictName,
        quarter: serverQuarter,
        year: serverYear,
      });
    }
  }, [serverDistrictName, serverQuarter, serverReportId, serverYear]);

  const effectiveDistrictName =
    resolvedReportContext?.districtName ?? hostContext.districtName ?? serverDistrictName;
  const effectiveQuarter =
    resolvedReportContext?.quarter ?? hostContext.quarter ?? serverQuarter;
  const effectiveYear =
    resolvedReportContext?.year != null
      ? String(resolvedReportContext.year)
      : hostContext.year || (serverYear != null ? String(serverYear) : null);
  const requestedQuarterLabel = requestedQuarter || hostContext.quarter || null;
  const requestedYearLabel =
    requestedYear != null ? String(requestedYear) : hostContext.year || null;
  const hasExplicitReport = Boolean(activeReportId);
  const isMissingDistrictContext = !hostContext.districtId && !hasExplicitReport;
  const isAwaitingSessionResolution =
    !hasExplicitReport && Boolean(hostContext.districtId) && isServerSessionInitializing;
  const isAwaitingFallbackSelection =
    !hasExplicitReport && resolutionStatus === "fallback_available" && !!fallbackCandidate;
  const hasNoResolvedData =
    !hasExplicitReport &&
    (resolutionStatus === "no_data" || resolutionStatus === "missing_context");
  const isInteractionBlocked =
    isMissingDistrictContext ||
    isAwaitingSessionResolution ||
    isAwaitingFallbackSelection ||
    hasNoResolvedData ||
    (!!serverSessionError && !hasExplicitReport);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threads, activeThreadId, isTyping, view]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const handleUseLatestAvailableQuarter = async () => {
    if (!hostContext.districtId) {
      setContextResolutionError("This page did not provide district context.");
      return;
    }

    setContextResolutionError(null);
    setIsResolvingFallback(true);

    try {
      const result = await syncDistrictReport({
        districtId: hostContext.districtId,
        quarter: requestedQuarterLabel ?? undefined,
        year: requestedYearLabel ?? undefined,
        allowFallback: true,
      });

      if (!result.report_id) {
        throw new Error("No fallback report was returned.");
      }

      setActiveReportId(result.report_id);
      setResolvedReportContext({
        districtName: result.district_name ?? serverDistrictName,
        quarter: result.quarter ?? null,
        year: result.year ?? null,
      });
    } catch (error) {
      setContextResolutionError(
        error instanceof Error ? error.message : "Failed to load the latest available quarter."
      );
    } finally {
      setIsResolvingFallback(false);
    }
  };

  const startAnalysis = async () => {
    if (isInteractionBlocked || !sessionContext.reportId) {
      return;
    }

    setView("analyzing");
    setValidationError(null);

    try {
      // Fetch real validation data from Mastra
      const response = await fetch(`${getIngestionApiUrl()}/sdac/validate`, {
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
      setValidationResult(null);
      setView("main");
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
    if (isInteractionBlocked) return;

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
    if (isInteractionBlocked) return;

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
  ): Promise<{ content: string | null; conversationId?: string; conversationSk?: number; turnNumber?: number; error?: string }> => {
    const parseOptionalNumber = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
      return undefined;
    };

    const payload = {
      agentId,
      message: text,
      userId: sessionContext.user.id,
      sessionId: sessionContext.sessionId,
      stream: true,
      ...(sessionContext.conversationId && { conversationId: sessionContext.conversationId }),
      ...(sessionContext.reportId && { reportId: sessionContext.reportId }),
      ...(sessionContext.districtId && { districtId: sessionContext.districtId }),
      ...(effectiveDistrictName && { districtName: effectiveDistrictName }),
      ...(effectiveQuarter && { quarter: effectiveQuarter }),
      ...(effectiveYear && { year: effectiveYear }),
    };

    try {
      const response = await fetch(`${getIngestionApiUrl()}/sdac/chat`, {
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
        let responseConversationSk: number | undefined;
        let responseTurnNumber: number | undefined;
        let errorMessage: string | undefined;

        const processEventBlock = (eventBlock: string) => {
          const normalizedEventBlock = eventBlock.replace(/\r\n/g, "\n").trim();
          if (!normalizedEventBlock) return;

          const lines = normalizedEventBlock.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              eventData = line.slice(5).trim();
            }
          }

          if (!eventData || eventData === "[DONE]") return;

          try {
            const json = JSON.parse(eventData);

            switch (eventType) {
              case "metadata":
                responseConversationId = json.conversationId;
                responseConversationSk = parseOptionalNumber(json.conversationSk) ?? responseConversationSk;
                responseTurnNumber = parseOptionalNumber(json.turnNumber) ?? responseTurnNumber;
                break;

              case "delta":
                if (json.content) {
                  fullText += json.content;
                  onDelta?.(json.content);
                }
                break;

              case "tool-start":
                setActiveToolStatus(json.displayName || json.toolName || "Working");
                scheduleToolStatusFallback();
                break;

              case "tool-result":
                scheduleToolStatusFallback();
                break;

              case "error":
                errorMessage = json.message || "An error occurred";
                break;

              case "usage":
                break;

              case "done":
                responseConversationSk = parseOptionalNumber(json.conversationSk) ?? responseConversationSk;
                responseTurnNumber = parseOptionalNumber(json.turnNumber) ?? responseTurnNumber;
                clearToolStatusTimeout();
                setActiveToolStatus(null);
                break;

              default:
                const parsed = extractStreamData(eventData);
                if (parsed.delta) {
                  fullText += parsed.delta;
                  onDelta?.(parsed.delta);
                }
                if (parsed.conversationId) {
                  responseConversationId = parsed.conversationId;
                }
                if (parsed.conversationSk !== undefined) {
                  responseConversationSk = parsed.conversationSk;
                }
                if (parsed.turnNumber !== undefined) {
                  responseTurnNumber = parsed.turnNumber;
                }
            }
          } catch {
            if (eventData !== "[DONE]") {
              fullText += eventData;
              onDelta?.(eventData);
            }
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const normalizedBuffer = buffer.replace(/\r\n/g, "\n");
          const events = normalizedBuffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const eventBlock of events) {
            processEventBlock(eventBlock);
          }
        }

        processEventBlock(buffer);

        return {
          content: fullText || null,
          conversationId: responseConversationId,
          conversationSk: responseConversationSk,
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
        conversationSk: raw?.conversationSk,
        turnNumber: raw?.turnNumber,
      };
    } catch (e) {
      return { content: null, error: e instanceof Error ? e.message : "Request failed" };
    }
  };

  const extractStreamData = (payload: string): {
    delta: string | null;
    conversationId?: string;
    conversationSk?: number;
    turnNumber?: number;
  } => {
    try {
      const json = JSON.parse(payload);

      // Extract conversation metadata if present
      const conversationId = json?.conversationId;
      const conversationSk = typeof json?.conversationSk === "number" ? json.conversationSk : undefined;
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
        conversationSk,
        turnNumber,
      };
    } catch {
      return { delta: payload };
    }
  };

  const normalizeFeedback = (feedback?: FeedbackState): FeedbackState => ({
    category: feedback?.category,
    comment: feedback?.comment ?? "",
    isOpen: feedback?.isOpen ?? false,
    status: feedback?.status ?? "idle",
    error: feedback?.error,
  });

  const normalizeThreadFeedback = (feedback?: FeedbackState): FeedbackState => ({
    category: feedback?.category,
    comment: feedback?.comment ?? "",
    isOpen: feedback?.isOpen ?? false,
    status: feedback?.status ?? "idle",
    error: feedback?.error,
  });

  const updateMessageFeedback = (
    threadId: string,
    messageId: string,
    updater: (current: FeedbackState) => FeedbackState
  ) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: t.messages.map((m) => {
            if (m.id !== messageId) return m;
            const nextFeedback = updater(normalizeFeedback(m.feedback));
            return { ...m, feedback: nextFeedback };
          }),
        };
      })
    );
  };

  const updateThreadFeedback = (
    threadId: string,
    updater: (current: FeedbackState) => FeedbackState
  ) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        const nextFeedback = updater(normalizeThreadFeedback(t.feedback));
        return { ...t, feedback: nextFeedback };
      })
    );
  };

  const getLatestAiFeedbackTarget = (thread: Thread) =>
    [...thread.messages]
      .reverse()
      .find(
        (message) =>
          message.role === "ai" &&
          !message.isLocalComponent &&
          typeof message.conversationSk === "number" &&
          typeof message.turnNumber === "number"
      );

  const submitFeedback = async (
    params:
      | { scope: "response"; threadId: string; message: Message }
      | { scope: "conversation"; threadId: string; thread: Thread }
  ) => {
    const isResponseScope = params.scope === "response";
    const feedback = isResponseScope
      ? normalizeFeedback(params.message.feedback)
      : normalizeThreadFeedback(params.thread.feedback);

    if (feedback.status === "submitted" || feedback.status === "submitting") return;

    const target = isResponseScope
      ? params.message
      : getLatestAiFeedbackTarget(params.thread);

    if (!target && isResponseScope) {
      updateMessageFeedback(params.threadId, params.message.id, (current) => ({
        ...current,
        status: "error",
        error: "Feedback metadata is missing for this response.",
      }));
      return;
    }

    if (!target) {
      updateThreadFeedback(params.threadId, (current) => ({
        ...current,
        status: "error",
        error: "Feedback will be available after the next assistant response is fully saved.",
      }));
      return;
    }

    const targetConversationSk = target.conversationSk;
    const targetTurnNumber = target.turnNumber;

    if (typeof targetConversationSk !== "number" || typeof targetTurnNumber !== "number") {
      if (isResponseScope) {
        updateMessageFeedback(params.threadId, params.message.id, (current) => ({
          ...current,
          status: "error",
          error: "Feedback metadata is missing for this response.",
        }));
      } else {
        updateThreadFeedback(params.threadId, (current) => ({
          ...current,
          status: "error",
          error: "Feedback will be available after the next assistant response is fully saved.",
        }));
      }
      return;
    }

    if (!sessionContext.reportId) {
      if (isResponseScope) {
        updateMessageFeedback(params.threadId, params.message.id, (current) => ({
          ...current,
          status: "error",
          error: "Report ID is missing for this session.",
        }));
      } else {
        updateThreadFeedback(params.threadId, (current) => ({
          ...current,
          status: "error",
          error: "Report ID is missing for this session.",
        }));
      }
      return;
    }

    if (!feedback.category) {
      const updateCategoryError = (current: FeedbackState) => ({
        ...current,
        status: "error" as const,
        error: "Please select a feedback category.",
      });
      if (isResponseScope) {
        updateMessageFeedback(params.threadId, params.message.id, updateCategoryError);
      } else {
        updateThreadFeedback(params.threadId, updateCategoryError);
      }
      return;
    }

    const trimmedComment = feedback.comment?.trim() ?? "";
    if (!trimmedComment) {
      const updateCommentError = (current: FeedbackState) => ({
        ...current,
        status: "error" as const,
        error: "Please add a short comment before submitting.",
      });
      if (isResponseScope) {
        updateMessageFeedback(params.threadId, params.message.id, updateCommentError);
      } else {
        updateThreadFeedback(params.threadId, updateCommentError);
      }
      return;
    }

    const setSubmitting = (current: FeedbackState) => ({
      ...current,
      status: "submitting" as const,
      error: undefined,
    });
    if (isResponseScope) {
      updateMessageFeedback(params.threadId, params.message.id, setSubmitting);
    } else {
      updateThreadFeedback(params.threadId, setSubmitting);
    }

    try {
      const response = await fetch(`${getIngestionApiUrl()}/sdac/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSk: targetConversationSk,
          reportId: sessionContext.reportId,
          userId: sessionContext.user.id,
          sessionId: sessionContext.sessionId,
          agentId,
          feedbackScope: params.scope,
          turnNumber: targetTurnNumber,
          rating: 3,
          category: feedback.category,
          comment: trimmedComment,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const errorMessage = errorPayload?.error ?? `Request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      const setSubmitted = (current: FeedbackState) => ({
        ...current,
        status: "submitted" as const,
        isOpen: false,
        error: undefined,
      });
      if (isResponseScope) {
        updateMessageFeedback(params.threadId, params.message.id, setSubmitted);
        scheduleFeedbackReset({
          scope: "response",
          threadId: params.threadId,
          messageId: params.message.id,
        });
      } else {
        updateThreadFeedback(params.threadId, setSubmitted);
        scheduleFeedbackReset({
          scope: "conversation",
          threadId: params.threadId,
        });
      }
    } catch (error) {
      const setError = (current: FeedbackState) => ({
        ...current,
        status: "error" as const,
        error: error instanceof Error ? error.message : "Failed to submit feedback.",
      });
      if (isResponseScope) {
        updateMessageFeedback(params.threadId, params.message.id, setError);
      } else {
        updateThreadFeedback(params.threadId, setError);
      }
    }
  };

  const handleSendMessage = async (text: string, threadIdOverride?: string) => {
    if (!text.trim() || isInteractionBlocked) return;

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
        conversationSk: agentReply.conversationSk,
        turnNumber: agentReply.turnNumber,
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
    clearToolStatusTimeout();
    setActiveToolStatus(null);

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
    // Clear uploaded report ID and reset to default
    clearUploadedReportId();
    setActiveReportId(getDefaultReportId());
    setResolvedReportContext(null);
    setContextResolutionError(null);
    // Clear validation state
    setValidationResult(null);
    setValidationError(null);
    // Clear all local threads
    setThreads([]);
    setActiveThreadId(null);
    // Return to main view
    setView("main");
  };

  const renderContextBanner = () => (
    <ContextStatusBanner
      isMissingDistrictContext={isMissingDistrictContext}
      isAwaitingSessionResolution={isAwaitingSessionResolution}
      isAwaitingFallbackSelection={isAwaitingFallbackSelection}
      hasNoResolvedData={hasNoResolvedData}
      serverSessionError={serverSessionError}
      contextResolutionError={contextResolutionError}
      requestedQuarter={requestedQuarterLabel}
      requestedYear={requestedYearLabel}
      fallbackCandidate={fallbackCandidate}
      isResolvingFallback={isResolvingFallback}
      onUseFallback={handleUseLatestAvailableQuarter}
    />
  );

  return (
    <div 
      className="w-full h-full bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-blue-500/90 flex flex-col items-center justify-center text-white backdrop-blur-sm"
          >
            <UploadCloud className="w-16 h-16 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold">Drop file to upload</h3>
            <p className="text-blue-100 mt-2">Upload to Ingestion Server</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress Banner */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 z-40 mx-4"
          >
            <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPreparingReport && !isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 z-30 mx-4"
          >
            <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Getting your report ready. You can keep chatting while this finishes.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                disabled={isInteractionBlocked}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                {/* Re-ingest action banner when duplicate detected */}
                {pendingReIngestFile && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs text-amber-800 truncate">
                        <span className="font-medium">Duplicate:</span>{" "}
                        {pendingReIngestFile.file.name}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setPendingReIngestFile(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 transition-colors"
                        disabled={isUploading}
                      >
                        Use Existing
                      </button>
                      <button
                        onClick={handleReIngest}
                        disabled={isUploading}
                        className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            Re-ingest
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {renderContextBanner()}
                {validationError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                    Could not connect to validation service. Please try again.
                  </div>
                )}
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
                    placeholder={isInteractionBlocked ? "Resolve report context to continue..." : "Ask anything..."}
                    disabled={isInteractionBlocked}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isInteractionBlocked}
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

                  const feedback = normalizeFeedback(msg.feedback);
                  const feedbackDisabled = feedback.status === "submitted" || feedback.status === "submitting";
                  const hasFeedbackMetadata =
                    typeof msg.conversationSk === "number" && typeof msg.turnNumber === "number";
                  const showFeedback = msg.role === "ai" && !msg.isLocalComponent && msg.id !== streamingMessageId && hasFeedbackMetadata;

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
                        <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-relaxed shadow-sm ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white rounded-br-none"
                                : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                            } break-words [overflow-wrap:anywhere]`}
                          >
                            {msg.role === "user" ? (
                              msg.content
                            ) : (
                              <div className="break-words [overflow-wrap:anywhere]">
                                <MessageRenderer content={msg.content} isStreaming={msg.id === streamingMessageId} />
                              </div>
                            )}
                          </div>

                          {showFeedback && (
                            <div className="mt-1 flex flex-wrap items-center gap-1 ml-1 max-w-[85%]">
                              {feedback.status === "submitted" ? (
                                <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                                  <CheckCircle className="w-3 h-3" /> Thanks!
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    title="Send feedback"
                                    onClick={() => {
                                      if (feedbackDisabled) return;
                                      updateMessageFeedback(activeThread.id, msg.id, (current) => ({
                                        ...current,
                                        isOpen: !current.isOpen,
                                        status: current.status === "error" ? "idle" : current.status,
                                        error: undefined,
                                      }));
                                    }}
                                    disabled={feedbackDisabled}
                                    className={`rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 ${feedbackDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                                  >
                                    Send feedback
                                  </button>

                                  {feedback.isOpen && (
                                    <div className="flex w-full flex-wrap items-center gap-1">
                                      <select
                                        value={feedback.category ?? ""}
                                        onChange={(event) =>
                                          updateMessageFeedback(activeThread.id, msg.id, (current) => ({
                                            ...current,
                                            category: event.target.value
                                              ? (event.target.value as FeedbackCategory)
                                              : undefined,
                                          }))
                                        }
                                        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-500"
                                        disabled={feedbackDisabled}
                                      >
                                        <option value="">Select category</option>
                                        {feedbackCategories.map((cat) => (
                                          <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        value={feedback.comment ?? ""}
                                        onChange={(event) =>
                                          updateMessageFeedback(activeThread.id, msg.id, (current) => ({
                                            ...current,
                                            comment: event.target.value,
                                          }))
                                        }
                                        placeholder="What went wrong?"
                                        className="min-w-[140px] flex-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
                                        disabled={feedbackDisabled}
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          submitFeedback({
                                            scope: "response",
                                            threadId: activeThread.id,
                                            message: msg,
                                          })
                                        }
                                        disabled={feedbackDisabled}
                                        className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                      >
                                        {feedback.status === "submitting" ? "..." : "Send"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateMessageFeedback(activeThread.id, msg.id, (current) => ({
                                            ...current,
                                            isOpen: false,
                                            error: undefined,
                                            status: current.status === "error" ? "idle" : current.status,
                                          }))
                                        }
                                        disabled={feedbackDisabled}
                                        className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}

                                  {feedback.error && (
                                    <span className="ml-1 text-[11px] text-rose-500">{feedback.error}</span>
                                  )}
                                </>
                              )}
                            </div>
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
                      {activeToolStatus ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>{activeToolStatus}...</span>
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
              <div className="p-3 bg-white border-t border-slate-100 shrink-0 flex flex-col gap-3">
                {/* Re-ingest action banner when duplicate detected (chat view) */}
                {pendingReIngestFile && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs text-amber-800 truncate">
                        <span className="font-medium">Duplicate:</span>{" "}
                        {pendingReIngestFile.file.name}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setPendingReIngestFile(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 transition-colors"
                        disabled={isUploading}
                      >
                        Use Existing
                      </button>
                      <button
                        onClick={handleReIngest}
                        disabled={isUploading}
                        className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            Re-ingest
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {renderContextBanner()}
                {validationError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
                    Could not connect to validation service. Please try again.
                  </div>
                )}

                {activeThread && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {normalizeThreadFeedback(activeThread.feedback).status === "submitted" ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="w-3 h-3" /> Conversation feedback sent
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          title="Send conversation feedback"
                          onClick={() => {
                            const hasFeedbackTarget = !!getLatestAiFeedbackTarget(activeThread);
                            if (!hasFeedbackTarget) {
                              updateThreadFeedback(activeThread.id, (current) => ({
                                ...current,
                                isOpen: false,
                                status: "error",
                                error: "Feedback will be available after the next assistant response is fully saved.",
                              }));
                              return;
                            }

                            updateThreadFeedback(activeThread.id, (current) => ({
                              ...current,
                              isOpen: !current.isOpen,
                              status: current.status === "error" ? "idle" : current.status,
                              error: undefined,
                            }));
                          }}
                          className="rounded border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                        >
                          Conversation feedback
                        </button>

                        {normalizeThreadFeedback(activeThread.feedback).isOpen && (
                          <div className="flex w-full flex-wrap items-center gap-2">
                            <select
                              value={normalizeThreadFeedback(activeThread.feedback).category ?? ""}
                              onChange={(event) =>
                                updateThreadFeedback(activeThread.id, (current) => ({
                                  ...current,
                                  category: event.target.value
                                    ? (event.target.value as FeedbackCategory)
                                    : undefined,
                                }))
                              }
                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-500"
                            >
                              <option value="">Select category</option>
                              {feedbackCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={normalizeThreadFeedback(activeThread.feedback).comment ?? ""}
                              onChange={(event) =>
                                updateThreadFeedback(activeThread.id, (current) => ({
                                  ...current,
                                  comment: event.target.value,
                                }))
                              }
                              placeholder="What should improve?"
                              className="min-w-[160px] flex-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-600"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                submitFeedback({
                                  scope: "conversation",
                                  threadId: activeThread.id,
                                  thread: activeThread,
                                })
                              }
                              disabled={normalizeThreadFeedback(activeThread.feedback).status === "submitting"}
                              className="rounded bg-slate-800 px-2 py-0.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            >
                              {normalizeThreadFeedback(activeThread.feedback).status === "submitting" ? "..." : "Send"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateThreadFeedback(activeThread.id, (current) => ({
                                  ...current,
                                  isOpen: false,
                                  error: undefined,
                                  status: current.status === "error" ? "idle" : current.status,
                                }))
                              }
                              className="rounded border border-slate-200 px-2 py-0.5 text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {normalizeThreadFeedback(activeThread.feedback).error && (
                          <span className="text-rose-500">
                            {normalizeThreadFeedback(activeThread.feedback).error}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSendMessage(inputValue)
                    }
                    placeholder={isInteractionBlocked ? "Resolve report context to continue..." : "Ask anything..."}
                    disabled={isInteractionBlocked}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isInteractionBlocked}
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

function ContextStatusBanner({
  isMissingDistrictContext,
  isAwaitingSessionResolution,
  isAwaitingFallbackSelection,
  hasNoResolvedData,
  serverSessionError,
  contextResolutionError,
  requestedQuarter,
  requestedYear,
  fallbackCandidate,
  isResolvingFallback,
  onUseFallback,
}: {
  isMissingDistrictContext: boolean;
  isAwaitingSessionResolution: boolean;
  isAwaitingFallbackSelection: boolean;
  hasNoResolvedData: boolean;
  serverSessionError: string | null;
  contextResolutionError: string | null;
  requestedQuarter: string | null;
  requestedYear: string | null;
  fallbackCandidate: {
    quarter: string;
    year: number;
    record_count?: number;
  } | null;
  isResolvingFallback: boolean;
  onUseFallback: () => void;
}) {
  if (isAwaitingSessionResolution) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
        Resolving district report context...
      </div>
    );
  }

  if (isMissingDistrictContext) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
        This page did not provide district context. The widget cannot load SDAC data until a district is supplied or a report is uploaded.
      </div>
    );
  }

  if (isAwaitingFallbackSelection && fallbackCandidate) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-900">
          {requestedQuarter && requestedYear
            ? `${requestedQuarter} ${requestedYear} is not available for this district.`
            : "The requested reporting period is not available for this district."}{" "}
          The latest available quarter is {fallbackCandidate.quarter} {fallbackCandidate.year}.
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-amber-700">
            Use the latest available quarter only if you want to leave the page context.
          </span>
          <button
            type="button"
            onClick={onUseFallback}
            disabled={isResolvingFallback}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResolvingFallback ? "Loading..." : `Use ${fallbackCandidate.quarter} ${fallbackCandidate.year}`}
          </button>
        </div>
      </div>
    );
  }

  if (hasNoResolvedData) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
        {requestedQuarter && requestedYear
          ? `No SDAC data is available for ${requestedQuarter} ${requestedYear} for this district.`
          : "No SDAC data is available for this district."}
      </div>
    );
  }

  if (serverSessionError || contextResolutionError) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
        {contextResolutionError || serverSessionError}
      </div>
    );
  }

  return null;
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
            <strong>Note:</strong> Could not connect to validation service. No fallback data was shown.
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
