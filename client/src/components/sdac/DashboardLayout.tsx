import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Building2
} from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "Cost Data Reports", href: "/", active: true },
    { icon: Building2, label: "District Profiles", href: "/districts" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Top Header - Gov Style */}
      <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-900 rounded-md flex items-center justify-center text-white font-bold">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">SDAC Validation System</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Missouri State Board</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search districts..." 
              className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
            JD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  item.active 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}>
                  <item.icon className={`w-4 h-4 ${item.active ? "text-blue-600" : "text-slate-400"}`} />
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
          
          <div className="p-4 border-t border-slate-200">
            <button className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium w-full">
              <LogOut className="w-4 h-4 text-slate-400" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-slate-50/50 relative">
          <div className="max-w-7xl mx-auto p-6 pb-24">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
