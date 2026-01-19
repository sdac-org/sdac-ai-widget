import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Bot, 
  Send, 
  Sparkles, 
  ChevronRight, 
  AlertTriangle,
  TrendingUp,
  History,
  ArrowRight
} from "lucide-react";
import { MOCK_ISSUES, QA_PAIRS, REPORT_DATA } from "@/lib/mock-data";

type ViewState = "analyzing" | "summary" | "chat" | "comparison";
type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  type?: "text" | "comparison";
};

export function AssistantWidget() {
  // Always open for standalone demo
  const [view, setView] = useState<ViewState>("analyzing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-start analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      setView("summary");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, view]);

  const startChat = (initialMessage?: string) => {
    setView("chat");
    if (messages.length === 0) {
      setMessages([
        { 
          id: "welcome", 
          role: "ai", 
          content: "I'm ready to help. You can ask me about the issues I found, or detailed questions about specific positions." 
        }
      ]);
    }
    
    if (initialMessage) {
        handleSendMessage(initialMessage);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const newMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, newMsg]);
    setInputValue("");
    setIsTyping(true);

    // Process response
    setTimeout(() => {
      setIsTyping(false);
      const lowerText = text.toLowerCase();
      
      // Check for Comparison trigger
      if (lowerText.includes("compare") && lowerText.includes("quarter")) {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + "_ai",
          role: "ai",
          content: "Here is the comparison to last quarter:",
          type: "comparison"
        }]);
        return;
      }

      // Check for Draft Sendback trigger
      if (lowerText.includes("draft") && lowerText.includes("sendback")) {
         setMessages(prev => [...prev, {
          id: Date.now().toString() + "_ai",
          role: "ai",
          content: `I've drafted a sendback based on the 3 issues found:\n\n"Please review the following items in your Q3-2025 submission:\n\n1. Position #7 (Goldberg) is listed with Source Code 4 (Federal) but has claimed costs. Federal costs are not eligible for SDAC reimbursement.\n2. Position #12 has $0 salary without an explanatory comment.\n3. The justification mentions general increases but does not account for the new positions (Williams, Lee) which contribute to the 12.3% variance.\n\nPlease correct these items and resubmit."`
        }]);
        return;
      }

      // Standard Q&A matching
      const match = QA_PAIRS.find(pair => 
        pair.triggers.some(trigger => lowerText.includes(trigger))
      );

      if (match) {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + "_ai",
          role: "ai",
          content: match.answer
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + "_ai",
          role: "ai",
          content: "I'm not sure about that. Try asking about source codes, cost pools, or justification details."
        }]);
      }
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-[380px] h-[640px] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">SDAC Assistant</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-slate-50 relative flex flex-col overflow-hidden">
        {view === "analyzing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
              <Bot className="absolute inset-0 m-auto w-6 h-6 text-blue-500" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Analyzing Cost Data...</h4>
            <p className="text-sm text-slate-500">Checking against 43 validation rules and historical patterns.</p>
          </div>
        )}

        {view === "summary" && (
          <div className="flex-col h-full overflow-y-auto p-4 space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-900">
                Hi there! I've reviewed <strong>{REPORT_DATA.districtName}</strong> and found <strong className="text-blue-700">3 potential issues</strong> that require attention.
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Detected Issues</h5>
              {MOCK_ISSUES.map((issue) => (
                <div key={issue.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      issue.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                    <div>
                      <h6 className="text-sm font-semibold text-slate-900">{issue.title}</h6>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{issue.description}</p>
                      {issue.amount !== null && (
                        <div className="mt-2 text-xs font-mono font-medium text-slate-700 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                          Impact: ${issue.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-400" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 flex gap-2">
              <button 
                onClick={() => startChat()}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-all"
              >
                View Details
              </button>
              <button 
                onClick={() => startChat("Draft a sendback for these issues")}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md shadow-blue-900/10 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Draft Sendback
              </button>
            </div>
          </div>
        )}

        {view === "chat" && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                        <Bot className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                  }`}>
                    {msg.type === 'comparison' ? (
                      <ComparisonCard />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
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
            
            {/* Suggestions / Input Area */}
            <div className="p-3 bg-white border-t border-slate-100">
              {messages.length < 3 && !isTyping && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 hide-scrollbar">
                  <SuggestionPill onClick={() => handleSendMessage("Compare to last quarter")} label="Compare quarters" icon={History} />
                  <SuggestionPill onClick={() => handleSendMessage("Why is fringe high?")} label="Fringe analysis" icon={TrendingUp} />
                </div>
              )}
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
          </>
        )}
      </div>
    </motion.div>
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
