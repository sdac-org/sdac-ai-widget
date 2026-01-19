import React from "react";
import { Link } from "wouter";
import { Code } from "lucide-react";
import { AssistantWidget } from "@/components/ai/AssistantWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative">
      <Link href="/embed">
        <button className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 text-sm font-medium hover:text-blue-600 hover:border-blue-200 transition-colors z-10">
          <Code className="w-4 h-4" />
          Get Embed Code
        </button>
      </Link>
      <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-800">SDAC Assistant</h1>
          <p className="text-slate-500">Click the button top-right to get the embed code.</p>
          <div className="inline-flex gap-2">
            <Link href="/widget">
                <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md text-sm hover:bg-blue-100 transition-colors">
                    View Widget Standalone
                </button>
            </Link>
          </div>
      </div>
    </div>
  );
}
