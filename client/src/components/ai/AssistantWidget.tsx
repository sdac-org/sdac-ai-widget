import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  ChevronRight, 
  AlertTriangle,
  TrendingUp,
  History,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Plus,
  Search,
  Copy,
  Check
} from "lucide-react";
import { MOCK_ISSUES, QA_PAIRS, REPORT_DATA } from "@/lib/mock-data";

type ViewState = "welcome" | "analyzing" | "thread_list" | "chat";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  type?: "text" | "comparison" | "summary_component" | "issue_init" | "feedback_draft";
  issueData?: typeof MOCK_ISSUES[0];
};

type Thread = {
  id: string;
  title: string;
  type: "overview" | "issue" | "general";
  messages: Message[];
  lastMessageAt: Date;
  issueId?: number; // Link to specific issue if applicable
};

export function AssistantWidget() {
  const [view, setView] = useState<ViewState>("welcome");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threads, activeThreadId, isTyping, view]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  const startAnalysis = () => {
    setView("analyzing");
    
    // Initialize Overview Thread during analysis
    if (!threads.find(t => t.id === "overview")) {
        const overviewThread: Thread = {
            id: "overview",
            title: "Analysis Results",
            type: "overview",
            messages: [{
                id: "summary-component",
                role: "ai",
                content: "",
                type: "summary_component"
            }],
            lastMessageAt: new Date()
        };
        setThreads(prev => [overviewThread, ...prev]);
    }

    setTimeout(() => {
        setView("chat");
        setActiveThreadId("overview");
    }, 2000);
  };

  const handleBackToList = () => {
      setView("thread_list");
      setActiveThreadId(null);
  };

  const createIssueThread = (issue: typeof MOCK_ISSUES[0]) => {
      // Check if thread exists
      const existing = threads.find(t => t.issueId === issue.id);
      if (existing) {
          setActiveThreadId(existing.id);
          setView("chat");
          return;
      }

      const newThread: Thread = {
          id: `issue-${issue.id}`,
          title: issue.title,
          type: "issue",
          issueId: issue.id,
          lastMessageAt: new Date(),
          messages: [
              {
                  id: "init",
                  role: "ai",
                  content: `I've opened a detailed view for **${issue.title}**.\n\n**Issue:** ${issue.description}\n**Impact:** ${issue.amount ? '$'+issue.amount.toLocaleString() : 'N/A'}\n\nHow would you like to handle this? I can draft a specific comment or check historical context.`,
                  type: "issue_init",
                  issueData: issue
              }
          ]
      };

      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
      setView("chat");
  };

  const createGeneralThread = (initialMsg?: string) => {
      const newThread: Thread = {
          id: `general-${Date.now()}`,
          title: "New Conversation",
          type: "general",
          lastMessageAt: new Date(),
          messages: [
              {
                  id: "welcome",
                  role: "ai",
                  content: "I'm ready to help. You can ask me about source codes, cost pools, or general validation rules."
              }
          ]
      };
      
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
      setView("chat");
      
      if (initialMsg) {
          setTimeout(() => handleSendMessage(initialMsg, newThread.id), 100);
      }
  };

  const handleSendMessage = (text: string, threadIdOverride?: string) => {
    if (!text.trim()) return;
    
    // If in welcome state, start a general thread
    if (view === "welcome") {
        createGeneralThread(text);
        return;
    }

    const targetThreadId = threadIdOverride || activeThreadId;
    if (!targetThreadId) return;

    // Add user message
    const newMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    
    setThreads(prev => prev.map(t => {
        if (t.id === targetThreadId) {
            return {
                ...t,
                messages: [...t.messages, newMsg],
                lastMessageAt: new Date(),
                title: t.type === 'general' && t.messages.length <= 1 ? text.slice(0, 30) + "..." : t.title
            };
        }
        return t;
    }));

    setInputValue("");
    setIsTyping(true);

    // Process response
    setTimeout(() => {
      setIsTyping(false);
      const lowerText = text.toLowerCase();
      
      let responseMsg: Message;

      // Check for Comparison trigger
      if (lowerText.includes("compare") && lowerText.includes("quarter")) {
          responseMsg = {
            id: Date.now().toString() + "_ai",
            role: "ai",
            content: "Here is the comparison to last quarter:",
            type: "comparison"
          };
      }
      // Check for Draft Sendback trigger
      else if (lowerText.includes("draft") && lowerText.includes("sendback")) {
         responseMsg = {
          id: Date.now().toString() + "_ai",
          role: "ai",
          content: `I've drafted a sendback based on the 3 issues found:\n\n"Please review the following items in your Q3-2025 submission:\n\n1. Position #7 (Goldberg) is listed with Source Code 4 (Federal) but has claimed costs. Federal costs are not eligible for SDAC reimbursement.\n2. Position #12 has $0 salary without an explanatory comment.\n3. The justification mentions general increases but does not account for the new positions (Williams, Lee) which contribute to the 12.3% variance.\n\nPlease correct these items and resubmit."`,
          type: "feedback_draft"
        };
      }
      // Check for specific issue feedback generation
      else if (lowerText.includes("generate feedback") && lowerText.includes("draft")) {
         // Find the issue related to this thread if possible, or try to infer
         const thread = threads.find(t => t.id === targetThreadId);
         const issue = MOCK_ISSUES.find(i => i.id === thread?.issueId);
         
         let feedbackContent = "";
         if (issue) {
             if (issue.id === 1) { // Goldberg
                 feedbackContent = `"Position #7 (Goldberg) is listed with Source Code 4 (Federal) but claims $7,196 in SDAC costs. Federal expenditures are not eligible for state reimbursement. Please verify the source code or remove the claimed costs."`;
             } else if (issue.id === 2) { // Position 12
                 feedbackContent = `"Position #12 is listed with $0 salary but has no explanatory comment. Please add a comment explaining why this position has no salary (e.g., vacancy, leave, etc.) or correct the salary amount."`;
             } else if (issue.id === 3) { // Justification
                 feedbackContent = `"The provided justification mentions general increases but does not account for the new positions (Williams, Lee) which contribute significantly to the 12.3% variance. Please update the justification to explicitly mention these staffing changes."`;
             } else {
                 feedbackContent = `"Please review the issue regarding ${issue.title}: ${issue.description}."`;
             }
         } else {
             feedbackContent = `"Please review the flagged issues."`;
         }

         responseMsg = {
             id: Date.now().toString() + "_ai",
             role: "ai",
             content: `Here is a draft feedback message for this issue:\n\n${feedbackContent}`,
             type: "feedback_draft"
         };
      }
      // Standard Q&A matching
      else {
        const match = QA_PAIRS.find(pair => 
            pair.triggers.some(trigger => lowerText.includes(trigger))
        );

        if (match) {
            responseMsg = {
                id: Date.now().toString() + "_ai",
                role: "ai",
                content: match.answer
            };
        } else {
            responseMsg = {
                id: Date.now().toString() + "_ai",
                role: "ai",
                content: "I'm not sure about that. Try asking about source codes, cost pools, or justification details."
            };
        }
      }

      setThreads(prev => prev.map(t => {
        if (t.id === targetThreadId) {
            return {
                ...t,
                messages: [...t.messages, responseMsg],
                lastMessageAt: new Date()
            };
        }
        return t;
    }));

    }, 1500);
  };

  return (
    <div className="w-[380px] h-[640px] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
            {view === "chat" && (
                <button onClick={handleBackToList} className="p-1 hover:bg-slate-800 rounded-full transition-colors -ml-1">
                    <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>
            )}
            {view === "thread_list" && (
                 <button onClick={() => setView("welcome")} className="p-1 hover:bg-slate-800 rounded-full transition-colors -ml-1">
                    <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>
            )}
            {view === "welcome" && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                </div>
            )}
          
          <div>
            <h3 className="font-bold text-sm">
                {view === "chat" && activeThread ? activeThread.title : "SDAC Assistant"}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </div>
          </div>
        </div>

        {view !== "analyzing" && view !== "welcome" && (
             <button 
                onClick={() => createGeneralThread()} 
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                title="New Chat"
             >
                 <Plus className="w-4 h-4" />
             </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-slate-50 relative flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
            {view === "welcome" && (
                <motion.div
                    key="welcome"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col flex-1 h-full"
                >
                    <div className="flex-1 p-4 flex items-start pt-8">
                         <div className="flex w-full">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                                <Bot className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-sm text-slate-800 leading-relaxed max-w-[85%]">
                                <p>I'm ready to help. You can ask me about the issues I found, or detailed questions about specific positions.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                        <div className="max-h-[300px] overflow-y-auto mb-2 hide-scrollbar">
                            <SuggestionList title="Suggested Actions">
                                <SuggestionRow 
                                    onClick={startAnalysis} 
                                    label="Evaluate Potential Issues" 
                                    icon={Search}
                                    description="Run automated validation checks"
                                />
                                <SuggestionRow 
                                    onClick={() => handleSendMessage("Compare to last quarter")} 
                                    label="Compare Quarters" 
                                    icon={History}
                                    description="Review trends against Q2-2025"
                                />
                                <SuggestionRow 
                                    onClick={() => handleSendMessage("Why is fringe high?")} 
                                    label="Analyze Fringe Benefits" 
                                    icon={TrendingUp}
                                    description="Investigate the 8.7% increase"
                                />
                            </SuggestionList>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
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
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
            >
                <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                <Bot className="absolute inset-0 m-auto w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Analyzing Cost Data...</h4>
                <p className="text-sm text-slate-500">Checking against 43 validation rules and historical patterns.</p>
            </motion.div>
            )}

            {view === "thread_list" && (
                <motion.div
                    key="thread_list"
                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                    className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Active Conversations</h5>
                    {threads.map(thread => (
                        <div 
                            key={thread.id}
                            onClick={() => { setActiveThreadId(thread.id); setView("chat"); }}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {thread.type === 'overview' && <TrendingUp className="w-4 h-4 text-blue-500" />}
                                    {thread.type === 'issue' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                    {thread.type === 'general' && <MessageSquare className="w-4 h-4 text-slate-400" />}
                                    <span className={`font-semibold text-sm ${thread.type === 'overview' ? 'text-blue-900' : 'text-slate-900'}`}>
                                        {thread.title}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                    {thread.lastMessageAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 ml-6">
                                {thread.messages[thread.messages.length-1].content.slice(0, 60)}...
                            </p>
                        </div>
                    ))}
                </motion.div>
            )}

            {view === "chat" && activeThread && (
            <motion.div
                key="chat"
                initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                className="flex flex-col flex-1 h-full overflow-hidden"
            >
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                    {activeThread.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.type === 'summary_component' ? 'w-full' : ''}`}>
                            {msg.role === 'ai' && msg.type !== 'summary_component' && (
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                            )}
                            
                            {msg.type === 'summary_component' ? (
                                <SummaryComponent onCreateIssueThread={createIssueThread} onStartChat={() => createGeneralThread()} />
                            ) : (
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm group/msg relative ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                                }`}>
                                    {msg.type === 'comparison' ? (
                                        <ComparisonCard />
                                    ) : (
                                        <>
                                            <FormattedMessage content={msg.content} />
                                            {msg.type === 'feedback_draft' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                                    <CopyButton text={extractFeedbackText(msg.content)} />
                                                </div>
                                            )}
                                            {msg.type === 'issue_init' && (
                                                <div className="mt-3 pt-3 border-t border-slate-100">
                                                    <button 
                                                        onClick={() => handleSendMessage("Generate feedback draft")}
                                                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center justify-center gap-2 border border-blue-200"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        Generate Feedback
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1">
                            <Bot className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                            <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            </div>
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
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
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

function extractFeedbackText(content: string) {
    const match = content.match(/"([^"]+)"/);
    return match ? match[1] : content;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            title="Copy feedback"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        </button>
    );
}

// Format text with bold support
function FormattedMessage({ content }: { content: string }) {
    // Split by **text**
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    
    return (
        <p className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                }
                return <span key={index}>{part}</span>;
            })}
        </p>
    );
}

// Extracted Summary Component for the Overview Thread
function SummaryComponent({ onCreateIssueThread, onStartChat }: { onCreateIssueThread: (issue: any) => void, onStartChat: (msg?: string) => void }) {
    return (
        <div className="space-y-4 w-full">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-900">
                    Hi there! I've reviewed <strong>{REPORT_DATA.districtName}</strong> and found <strong className="text-blue-700">3 potential issues</strong> that require attention.
                </p>
            </div>

            <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Detected Issues</h5>
                {MOCK_ISSUES.map((issue) => (
                    <div 
                        key={issue.id} 
                        onClick={() => onCreateIssueThread(issue)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer"
                    >
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                issue.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                                <AlertTriangle className="w-3 h-3" />
                            </div>
                            <div>
                                <h6 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{issue.title}</h6>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{issue.description}</p>
                                {issue.amount !== null && (
                                    <div className="mt-2 text-xs font-mono font-medium text-slate-700 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                                    Impact: ${issue.amount.toLocaleString()}
                                    </div>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-400 transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-2 flex gap-2">
            </div>
        </div>
    );
}

function SuggestionList({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="mb-4 px-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-blue-400" />
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function SuggestionRow({ onClick, label, icon: Icon, description }: { onClick: () => void, label: string, icon: any, description?: string }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all group"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
        <Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-700 group-hover:text-blue-800">{label}</div>
        {description && <div className="text-xs text-slate-400 group-hover:text-blue-600/70">{description}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-400" />
    </button>
  );
}

function SuggestionPill({ onClick, label, icon: Icon }: { onClick: () => void, label: string, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

function ComparisonCard() {
  return (
    <div className="w-full space-y-4">
      <p className="text-sm font-medium text-slate-800 mb-2">Comparing Q3-2025 to Q3-2024:</p>
      
      <div className="space-y-3">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-slate-500 uppercase font-semibold">Personnel</span>
             <span className="text-xs font-bold text-emerald-600">+2 positions (↑ 12.5%)</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
             <div className="bg-emerald-500 h-full w-[85%]"></div>
          </div>
        </div>

        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
          <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-amber-800 uppercase font-semibold">Salary Diff</span>
             <span className="text-xs font-bold text-amber-700">+$26,480 (↑ 12.3%)</span>
          </div>
           <div className="flex items-center gap-1.5 text-[10px] text-amber-700 mt-1">
             <AlertTriangle className="w-3 h-3" />
             Requires justification ({'>'}5%)
           </div>
        </div>

        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
          <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-amber-800 uppercase font-semibold">Fringe Diff</span>
             <span className="text-xs font-bold text-amber-700">+$5,098 (↑ 8.7%)</span>
          </div>
           <div className="flex items-center gap-1.5 text-[10px] text-amber-700 mt-1">
             <AlertTriangle className="w-3 h-3" />
             Requires justification
           </div>
        </div>

         <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 uppercase font-semibold mb-2">New Positions</div>
          <ul className="space-y-1.5">
            <li className="flex items-center justify-between text-xs">
              <span className="text-slate-700">Williams (Alt Ed)</span>
              <span className="font-mono text-slate-600">$10,268</span>
            </li>
            <li className="flex items-center justify-between text-xs">
              <span className="text-slate-700">Lee (Alt Svcs)</span>
              <span className="font-mono text-slate-600">$9,212</span>
            </li>
          </ul>
        </div>
      </div>
      
      <button className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
        <Sparkles className="w-3 h-3" />
        Draft Sendback for Review
      </button>
    </div>
  );
}
