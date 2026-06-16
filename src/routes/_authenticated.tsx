import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import Sidebar from "@/components/layout/sidebar";
import { NotificationBell } from "../components/layout/NotificationBell";
import { useMemo, useState, useEffect } from "react";
import { LogOut, Monitor, Activity, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = window.localStorage.getItem("accessToken");

    if (!token) {
      throw redirect({
        to: "/login",
      });
    }
  },

  component: AuthenticatedLayout,
});

// 🔐 STATELESS JWT PARSER: Supports Strings, Arrays, and Embedded Authority Objects
function useCurrentUser() {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    const token = window.localStorage.getItem("accessToken");
    if (!token) return null;

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const parsed = JSON.parse(window.atob(base64));

      const rawRole = parsed.role || parsed.roles || parsed.authority || "USER";
      let cleanRole = "USER";

      if (Array.isArray(rawRole)) {
        const firstElement = rawRole[0];
        if (typeof firstElement === "string") {
          cleanRole = firstElement;
        } else if (firstElement && typeof firstElement === "object" && firstElement.authority) {
          cleanRole = firstElement.authority;
        }
      } else if (typeof rawRole === "object" && rawRole.authority) {
        cleanRole = rawRole.authority;
      } else if (typeof rawRole === "string") {
        cleanRole = rawRole;
      }

      cleanRole = String(cleanRole).toUpperCase().replace("ROLE_", "").trim();

      return {
        id: parsed.id || parsed.userId || (parsed.sub && !isNaN(Number(parsed.sub)) ? Number(parsed.sub) : 1), 
        username: parsed.username || "Agent",
        role: cleanRole,
      };
    } catch (e) {
      console.error("Failed decoding token tracking context claims:", e);
      return null;
    }
  }, []);
}

function AuthenticatedLayout() {
  const currentUser = useCurrentUser();
  const routerState = useRouterState();
  
  // Guard against SSR hydration mismatches
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute clean text strings from route address path safely for metadata subtitles
  const sectionTitle = useMemo(() => {
    const segments = routerState.location.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "CONTROL CANVAS HUB";
    return segments[segments.length - 1].replace(/-/g, " ").toUpperCase();
  }, [routerState.location.pathname]);

  const nameInitial = useMemo(() => {
    if (!currentUser?.username) return "A";
    return currentUser.username.charAt(0).toUpperCase();
  }, [currentUser?.username]);

  // Clean log-out pipeline handler
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50/50 font-sans antialiased text-gray-800 selection:bg-blue-50">
      {/* SIDEBAR NAVIGATION COLUMN DOCK */}
      <Sidebar />

      {/* RIGHT SIDE CONSOLE LAYOUT FRAME CANVAS */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* PREMIUM ENTERPRISE MANAGEMENT HEAD BANNER */}
        <header className="flex h-14 w-full items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm select-none shrink-0 z-20">
          
          {/* LEFT: INTERACTIVE CORPORATE PATH BREADCRUMB */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100/80 px-2 py-0.5 rounded border border-gray-200/40">
              CAN MAIN ENGINE
            </span>
            <span className="text-gray-300 font-light text-sm">/</span>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50/40 border border-blue-100/60 px-2 py-0.5 rounded shadow-inner">
              <Monitor size={12} className="text-blue-500 shrink-0" />
              <span className="tracking-wide uppercase text-[10px]">{sectionTitle}</span>
            </div>
          </div>

          {/* RIGHT: PLATFORM SYSTEMS MONITORING INTERACTION PACK */}
          <div className="flex items-center gap-3.5">
            
            {/* Live Operational Health Status Card */}
            <div className="hidden md:flex items-center gap-1.5 border border-gray-100 bg-gray-50/50 px-2 py-1 rounded-lg text-[10px] font-bold text-gray-400 tracking-wider uppercase">
              <Activity size={11} className="text-emerald-500 animate-pulse" />
              <span>Core Sync Healthy</span>
            </div>

            {mounted && currentUser && <NotificationBell currentUserId={currentUser.id} />}
            
            <div className="h-4 w-[1px] bg-gray-200" />

            {/* HIGH-DENSITY PROFILE CONTROL INTERFACE PILL */}
            <div className="flex items-center gap-2.5 bg-gray-50/60 border border-gray-200/80 p-1 pr-2 rounded-xl shadow-inner group transition-all hover:bg-gray-50">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-xs flex items-center justify-center shadow-md select-none tracking-wider border border-slate-950/20">
                {mounted ? nameInitial : "-"}
              </div>
              
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-extrabold text-gray-800 leading-none">
                  {mounted ? currentUser?.username : "Agent"}
                </p>
                <div className="flex items-center gap-0.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                  {mounted && currentUser?.role === "ADMIN" && <ShieldCheck size={9} className="text-blue-500" />}
                  <span>{mounted ? currentUser?.role : "Loading..."}</span>
                </div>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-gray-200" />

            {/* LOGOUT SECURE ACTION NODE CONTROLLER */}
            <button
              onClick={handleLogout}
              title="Secure Logout Session"
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-500 transition-all shadow-sm focus:outline-none flex items-center justify-center group"
            >
              <LogOut size={14} className="group-hover:translate-x-[1px] transition-transform" />
            </button>
          </div>
        </header>

        {/* COMPONENT CONTENT DESK CANVAS INTERIOR VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-gray-50/30 to-gray-100/40 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}