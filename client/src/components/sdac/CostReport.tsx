import React, { useState } from "react";
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  MoreHorizontal, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown
} from "lucide-react";
import { REPORT_DATA, PERSONNEL_DATA } from "@/lib/mock-data";

export function CostReport() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="hover:text-blue-600 cursor-pointer">Cost Data Reports</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Validation Review</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
            Approve Report
          </button>
        </div>
      </div>

      {/* Report Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-display font-bold text-slate-900">{REPORT_DATA.districtName}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                {REPORT_DATA.quarter}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Submitted: {REPORT_DATA.submissionDate}
              </span>
              <span className="flex items-center gap-1.5">
                <FileIcon className="w-4 h-4" /> ID: #8829-2025-Q3
              </span>
            </div>
          </div>

          <div className="flex gap-8">
            <Stat label="Total Salary" value={`$${REPORT_DATA.totalSalary.toLocaleString()}`} diff={REPORT_DATA.salaryDiff} />
            <Stat label="Total Fringe" value={`$${REPORT_DATA.totalFringe.toLocaleString()}`} diff={REPORT_DATA.fringeDiff} />
          </div>
        </div>
        
        <div className="bg-slate-50/50 px-6 py-4 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">District Justification</span>
          <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3">
            "{REPORT_DATA.justification}"
          </p>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Personnel Roster ({PERSONNEL_DATA.length})</h3>
          <div className="flex items-center gap-2">
            <select className="text-sm border-slate-200 rounded-md bg-slate-50 py-1.5 pl-2 pr-8 focus:ring-blue-500 cursor-pointer">
              <option>All Cost Pools</option>
              <option>Pool 1</option>
              <option>Pool 2</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium w-12">#</th>
                <th className="px-6 py-3 font-medium">Name / Title</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Function</th>
                <th className="px-6 py-3 font-medium">Pool</th>
                <th className="px-6 py-3 font-medium text-right">Salary</th>
                <th className="px-6 py-3 font-medium text-right">Fringe</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERSONNEL_DATA.map((person, idx) => (
                <tr 
                  key={person.id} 
                  className={`group transition-colors hover:bg-slate-50/80 ${
                    person.isError ? "bg-red-50/30 hover:bg-red-50/50" : ""
                  }`}
                >
                  <td className="px-6 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{person.name}</div>
                    <div className="text-xs text-slate-500">{person.title}</div>
                  </td>
                  <td className="px-6 py-3">
                    <Badge value={person.source} isError={person.source === '4' && !person.isNew /* Simple logic for demo visual */} />
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">{person.function}</td>
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">{person.pool}</td>
                  <td className={`px-6 py-3 text-right font-mono ${person.salary === 0 ? "text-red-600 font-bold" : "text-slate-700"}`}>
                    ${person.salary.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    ${person.fringe.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-center">
                     {person.isError ? (
                        <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />
                     ) : person.isNew ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wide">New</span>
                     ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500/30 mx-auto" />
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function Stat({ label, value, diff }: { label: string, value: string, diff: number }) {
  const isPositive = diff > 0;
  return (
    <div>
      <div className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-slate-900">{value}</span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
          diff > 5 
            ? "bg-amber-100 text-amber-700" 
            : "bg-emerald-100 text-emerald-700"
        }`}>
          {isPositive ? "+" : ""}{diff}%
        </span>
      </div>
    </div>
  );
}

function Badge({ value, isError }: { value: string, isError?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-mono font-bold border ${
      isError 
        ? "bg-red-100 text-red-700 border-red-200" 
        : value === '4' 
          ? "bg-purple-100 text-purple-700 border-purple-200"
          : "bg-slate-100 text-slate-600 border-slate-200"
    }`}>
      {value}
    </span>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
