import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Sidebar from "@/components/layout/sidebar";
import { NotificationBell } from "../components/layout/NotificationBell";
import { useMemo, useState, useEffect } from "react";

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
  
  // Guard against SSR hydration mismatches
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const nameInitial = useMemo(() => {
    if (!currentUser?.username) return "A";
    return currentUser.username.charAt(0).toUpperCase();
  }, [currentUser?.username]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans antialiased text-gray-800">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              CAN Support
            </span>
            <span className="text-xs font-semibold text-gray-300">/</span>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Live Monitoring Desk
            </span>
          </div>

          <div className="flex items-center gap-4">
            {mounted && currentUser && <NotificationBell currentUserId={currentUser.id} />}
            
            <div className="h-5 w-[1px] bg-gray-200" />

            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-800 capitalize leading-none">
                  {mounted ? currentUser?.username : "Agent"}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                  {mounted ? `${currentUser?.role} Operations` : "Loading..."}
                </p>
              </div>
              
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md select-none tracking-wider">
                {mounted ? nameInitial : "-"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}