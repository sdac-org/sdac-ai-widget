import React, { useEffect } from "react";
import { AssistantWidget } from "@/components/ai/AssistantWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Widget() {
  useEffect(() => {
    // Force transparent background for the widget iframe
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-transparent flex items-end justify-end">
      <ErrorBoundary>
        <AssistantWidget />
      </ErrorBoundary>
    </div>
  );
}
