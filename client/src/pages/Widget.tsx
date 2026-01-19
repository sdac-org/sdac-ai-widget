import React from "react";
import { AssistantWidget } from "@/components/ai/AssistantWidget";

export default function Widget() {
  return (
    <div className="min-h-screen bg-transparent flex items-end justify-end p-4">
      <AssistantWidget />
    </div>
  );
}
