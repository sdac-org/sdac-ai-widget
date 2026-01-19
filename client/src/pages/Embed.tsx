import React, { useState } from "react";
import { Copy, Check, ChevronLeft, Code, Sparkles, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmbedPage() {
  const [copied, setCopied] = useState(false);
  
  const embedCode = `<iframe 
  src="${window.location.origin}/widget"
  width="400" 
  height="700" 
  frameborder="0" 
  style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <a className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </a>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Integration & Deployment</h1>
            <p className="text-xs text-slate-500">Validation Assistant v1.0.4</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-medium">Ready for Production</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-8 space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-slate-900">Embed Configuration</h2>
          <p className="text-slate-500 text-lg">
            Add the SDAC Assistant to your existing portal by including the snippet below. 
            Place this code before the closing <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-700">{`</body>`}</code> tag.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Code Column */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-slate-950/50 py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                  </div>
                  <span className="ml-2 text-xs font-mono text-slate-400">snippet.html</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopy}
                  className="h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-6 overflow-x-auto">
                  <code className="text-sm font-mono text-blue-100 leading-relaxed">
                    {embedCode.split('\n').map((line, i) => (
                      <div key={i} className="table-row">
                        <span className="table-cell select-none text-slate-700 text-right pr-4 w-8">{i + 1}</span>
                        <span className="table-cell">
                          {line.includes("<!--") ? (
                            <span className="text-slate-500">{line}</span>
                          ) : line.includes("src=") ? (
                            <>
                              <span className="text-purple-400">src</span>
                              <span className="text-slate-400">=</span>
                              <span className="text-emerald-400">"{line.match(/src="([^"]+)"/)?.[1]}"</span>
                              {line.replace(/src="[^"]+"/, "")}
                            </>
                          ) : (
                            line
                          )}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-900 block mb-1">Widget Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="px-3 py-2 text-xs font-medium border border-blue-600 bg-blue-50 text-blue-700 rounded-md">Bottom Right</button>
                    <button className="px-3 py-2 text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-md">Bottom Left</button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-100 rounded-md border border-slate-200 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white border-t border-slate-200"></div>
                  <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-slate-900 shadow-lg z-10"></div>
                  <span className="text-xs text-slate-400 font-medium z-0 mb-8">Page Content</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Widget will overlay on top of existing content
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
