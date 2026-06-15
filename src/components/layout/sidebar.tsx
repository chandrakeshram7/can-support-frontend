import { Link } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Layers, 
  MessageSquare, 
  Lightbulb,
  Radio 
} from "lucide-react";

// 🎯 Mock session context hook — substitute this with your actual app auth context wrapper (e.g., useAuth())
const useCurrentUserSession = () => {
  return { id: 1, username: "chandrakesh", role: "ADMIN" }; 
};

export default function Sidebar() {
  const currentUser = useCurrentUserSession();

  return (
    <div className="w-64 border-r bg-white h-screen p-4 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Workspace Title */}
        <h1 className="text-2xl font-black tracking-tight text-gray-900 mb-8 px-3">
          CAN Support
        </h1>

        {/* Navigation Item Links Matrix */}
        <div className="space-y-1">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600"
          >
            <LayoutDashboard size={18} className="shrink-0" />
            Dashboard
          </Link>

          <Link 
            to="/tickets" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600"
          >
            <Ticket size={18} className="shrink-0" />
            Tickets
          </Link>

          <Link 
            to="/users" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600"
          >
            <Users size={18} className="shrink-0" />
            Users
          </Link>

          <Link 
            to="/queues" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600"
          >
            <Layers size={18} className="shrink-0" />
            Queues
          </Link>

          <Link 
            to="/chat" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600"
          >
            <MessageSquare size={18} className="shrink-0" />
            Chat
          </Link>

          {/* ✅ ONLY SHOW BROADCAST TO ADMIN USERS */}
          {currentUser?.role === "ADMIN" && (
            <Link 
              to="/broadcast" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-900 transition-all [&.active]:bg-blue-50 [&.active]:text-blue-600"
            >
              <Radio size={18} className="shrink-0 text-gray-500" />
              Broadcast
            </Link>
          )}

          {/* Knowledge Base Sector Link */}
          <Link 
            to="/knowledge-base" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-amber-600 hover:bg-amber-50/50 transition-all [&.active]:bg-amber-50 [&.active]:text-amber-600"
          >
            <Lightbulb size={18} className="shrink-0 text-amber-500 fill-amber-500/10" />
            Knowledge Base
          </Link>
        </div>
      </div>

      {/* Footer Branding Context */}
      <div className="px-3 py-2 text-[11px] font-medium text-gray-400 border-t border-gray-100">
        Internal Support Hub v1.2
      </div>
    </div>
  );
}