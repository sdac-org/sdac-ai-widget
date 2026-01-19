import React, { useEffect, useState } from "react";
import { AssistantWidget } from "@/components/ai/AssistantWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";

export default function Widget() {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Force transparent background for the widget iframe
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'close-widget') {
        setIsOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="h-screen w-screen bg-transparent flex items-end justify-end p-5">
      <ErrorBoundary>
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[400px] h-[700px] max-w-full max-h-full shadow-2xl rounded-2xl overflow-hidden"
            >
              <AssistantWidget onClose={() => setIsOpen(false)} />
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2.5 px-5 py-3 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
              </div>
              <span className="font-semibold text-sm">SDAC Assistant</span>
            </motion.button>
          )}
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}
