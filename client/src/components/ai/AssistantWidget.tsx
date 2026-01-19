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
        </div>
    );
}

function FringeAnalysisCard() {
    return (
        <div className="w-full space-y-3">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-amber-800 uppercase font-semibold">Fringe Rate Increase</span>
                    <span className="text-xs font-bold text-amber-700">↑ 8.7%</span>
                 </div>
                 <p className="text-xs text-amber-700 mt-1">
                    Exceeds the 5% threshold, triggering validation.
                 </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border border-slate-200">
                <h6 className="text-xs font-semibold text-slate-700 mb-2 uppercase">Driving Factors</h6>
                <ul className="space-y-2">
                    <li className="flex gap-2">
                        <div className="w-1 h-full min-h-[1.25rem] bg-blue-500 rounded-full shrink-0"></div>
                        <div>
                             <p className="text-xs font-medium text-slate-800">New Staff Additions</p>
                             <p className="text-[10px] text-slate-500">Williams (Alt Ed) and Lee (Alt Svcs) added ~$7.1k in fringe costs.</p>
                        </div>
                    </li>
                    <li className="flex gap-2">
                        <div className="w-1 h-full min-h-[1.25rem] bg-blue-300 rounded-full shrink-0"></div>
                        <div>
                             <p className="text-xs font-medium text-slate-800">Rate Adjustments</p>
                             <p className="text-[10px] text-slate-500">General fringe rate increased across existing staff.</p>
                        </div>
                    </li>
                </ul>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h6 className="text-xs font-semibold text-slate-700 mb-1 uppercase">Recommendation</h6>
                <p className="text-xs text-slate-600 leading-relaxed">
                    The salary differential is 12.3%, so this fringe increase is proportional. However, the current justification fails to mention the new positions.
                </p>
            </div>
        </div>
    );
}
