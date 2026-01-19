import React from "react";
import { Link } from "wouter";
import { Code } from "lucide-react";
import { AssistantWidget } from "@/components/ai/AssistantWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative">
      <Link href="/embed">
        <a className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 text-sm font-medium hover:text-blue-600 hover:border-blue-200 transition-colors z-10">
          <Code className="w-4 h-4" />
          Get Embed Code
        </a>
      </Link>
      <AssistantWidget />
    </div>
  );
}
