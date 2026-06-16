import { Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Layers, 
  MessageSquare, 
  Lightbulb,
  Radio,
  ChevronRight,
  Shield
} from "lucide-react";

// Mock session context hook — substitute this with your actual app auth context wrapper (e.g., useAuth())
const useCurrentUserSession = () => {
  return { id: 1, username: "Chandrakesh", role: "ADMIN" }; 
};

export default function Sidebar() {
  const currentUser = useCurrentUserSession();

  // Helper to safely extract initial letters for the profile avatar node block
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "A";
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-white h-screen p-4 flex flex-col justify-between shrink-0 select-none shadow-sm z-30 font-sans antialiased">
      <div>
        {/* PREMIUM BRAND WORKSPACE IDENTIFIER HEAD BLOCK */}
        <div className="mb-6 px-3 py-2 bg-gradient-to-br from-gray-50 to-gray-100/60 rounded-xl border border-gray-200/60 shadow-inner">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black tracking-tight text-gray-900 bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
              CAN Support
            </h1>
            <span className="text-[9px] font-black tracking-widest uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-sm">
              v1.2
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engineering Node 01</span>
          </div>
        </div>

        {/* NAVIGATION NAVIGATION MATRIX LINKS */}
        <div className="space-y-1">
          <Link 
            to="/dashboard" 
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-slate-900 transition-all border border-transparent hover:border-gray-100 group [&.active]:bg-blue-50/60 [&.active]:text-blue-600 [&.active]:border-blue-100/50"
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard size={16} className="shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span>Dashboard</span>
            </div>
            <ChevronRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
          </Link>

          <Link 
            to="/tickets" 
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-slate-900 transition-all border border-transparent hover:border-gray-100 group [&.active]:bg-blue-50/60 [&.active]:text-blue-600 [&.active]:border-blue-100/50"
          >
            <div className="flex items-center gap-2.5">
              <Ticket size={16} className="shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span>Tickets Matrix</span>
            </div>
            <ChevronRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
          </Link>

          <Link 
            to="/users" 
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-slate-900 transition-all border border-transparent hover:border-gray-100 group [&.active]:bg-blue-50/60 [&.active]:text-blue-600 [&.active]:border-blue-100/50"
          >
            <div className="flex items-center gap-2.5">
              <Users size={16} className="shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span>Personnel Directory</span>
            </div>
            <ChevronRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
          </Link>

          <Link 
            to="/queues" 
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-slate-900 transition-all border border-transparent hover:border-gray-100 group [&.active]:bg-blue-50/60 [&.active]:text-blue-600 [&.active]:border-blue-100/50"
          >
            <div className="flex items-center gap-2.5">
              <Layers size={16} className="shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span>Ingestion Queues</span>
            </div>
            <ChevronRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
          </Link>

          <Link 
            to="/chat" 
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-slate-900 transition-all border border-transparent hover:border-gray-100 group [&.active]:bg-blue-50/60 [&.active]:text-blue-600 [&.active]:border-blue-100/50"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare size={16} className="shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span>Secure Chat Desk</span>
            </div>
            <ChevronRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
          </Link>

          {/* ADMIN BROADCAST SECTION - CONDITIONAL ACCESS ROUTE LINK */}
          {currentUser?.role === "ADMIN" && (
            <Link 
              to="/broadcast" 
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-red-50/40 hover:text-red-700 transition-all border border-transparent hover:border-red-100/30 group [&.active]:bg-red-50/60 [&.active]:text-red-600 [&.active]:border-red-100/50"
            >
              <div className="flex items-center gap-2.5">
                <Radio size={16} className="shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
                <span>Live Broadcast</span>
              </div>
              <ChevronRight size={12} className="text-red-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
            </Link>
          )}

          {/* KNOWLEDGE BASE MODAL ACCESS PORTAL LINK */}
          <Link 
            to="/knowledge-base" 
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-amber-50/40 hover:text-amber-700 transition-all border border-transparent hover:border-amber-100/30 group [&.active]:bg-amber-50/60 [&.active]:text-amber-600 [&.active]:border-amber-100/50"
          >
            <div className="flex items-center gap-2.5">
              <Lightbulb size={16} className="shrink-0 text-amber-500 fill-amber-500/10 group-hover:fill-amber-500/20 transition-all" />
              <span>Knowledge Base</span>
            </div>
            <ChevronRight size={12} className="text-amber-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
          </Link>
        </div>
      </div>

      {/* HIGH-DENSITY HIGH-CONTRAST INDIVIDUAL IDENTITY PROFILE FOOTER BANNER */}
      <div className="pt-3 border-t border-gray-100 flex items-center gap-3 bg-gradient-to-r from-white to-gray-50/50 rounded-b-xl px-1">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-blue-600/20 shrink-0 select-none border border-blue-700/10">
          {getInitials(currentUser?.username)}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-xs font-extrabold text-gray-900 truncate tracking-tight leading-none">
            {currentUser?.username || "Anonymous Agent"}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            {currentUser?.role === "ADMIN" && <Shield size={10} className="text-blue-500 shrink-0" />}
            <span className="truncate">{currentUser?.role || "OPERATOR"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}