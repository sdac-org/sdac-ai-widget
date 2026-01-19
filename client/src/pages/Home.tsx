import React from "react";
import { AssistantWidget } from "@/components/ai/AssistantWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <AssistantWidget />
    </div>
  );
}
