import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Send, Users, CheckCircle2, AlertCircle, ShieldAlert, Loader2, Megaphone, FileText } from "lucide-react";
import { ticketApi } from "@/lib/ticket-api"; 
import { notificationsApi } from "@/lib/notifications-api";

export const Route = createFileRoute("/_authenticated/broadcast")({
  component: AdminBroadcastPanel,
});

interface DropdownUser {
  id: number;
  username: string;
  email?: string;
}

function AdminBroadcastPanel() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  const [systemUsers, setSystemUsers] = useState<DropdownUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uiMessage, setUiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Parse claims from active token securely on initial component load-pass
  useEffect(() => {
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      setLoadingSession(false);
      return;
    }

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      
      const parsed = JSON.parse(jsonPayload);
      const rawRole = parsed.role || parsed.roles || parsed.authority || "USER";
      let cleanRole = "USER";

      // Secure array structural checking guards
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

      setCurrentUser({
        id: parsed.id || parsed.userId || (parsed.sub && !isNaN(Number(parsed.sub)) ? Number(parsed.sub) : 1),
        role: cleanRole,
      });
    } catch (e) {
      console.error("Security parsing error within token handler configuration bounds:", e);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  // 🛡️ STRICT RULE CHECKING BOUNDARY: Evaluates true ONLY if role string matches ADMIN exactly
  const isAdmin = useMemo(() => {
    return currentUser !== null && currentUser.role === "ADMIN";
  }, [currentUser]);

  useEffect(() => {
    if (loadingSession || !isAdmin) return;
    
    let isMounted = true;
    const fetchAvailableUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await ticketApi.getAllUsers();
        if (!isMounted) return;
        const userData = Array.isArray(res) ? res : res.data || res.content || [];
        setSystemUsers(userData);
      } catch (err) {
        console.error("Failed fetching database recipients listings:", err);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    fetchAvailableUsers();
    return () => { isMounted = false; };
  }, [loadingSession, isAdmin]);

  const handleToggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === systemUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(systemUsers.map((u) => u.id));
    }
  };

  const handleSubmitBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || selectedUserIds.length === 0 || submitting) return;

    try {
      setSubmitting(true);
      setUiMessage(null);

      await notificationsApi.broadcastAdminMessage({
        title: title.trim(),
        body: body.trim(),
        userIds: selectedUserIds,
      });

      setUiMessage({ type: "success", text: "System broadcast successfully dispatched across user channels." });
      setTitle("");
      setBody("");
      setSelectedUserIds([]);

      // ✅ FIXED: Clear the success notification banner automatically after 4 seconds
      setTimeout(() => {
        setUiMessage(null);
      }, 4000);

    } catch (err) {
      console.error("Exception thrown during delivery submission processing:", err);
      setUiMessage({ type: "error", text: "Failed dispatching broadcast configuration routing settings." });
    } finally {
      setSubmitting(false);
    }
  };

  // Safe loader tracking fallback block state for server matching
  if (loadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-gray-400 font-medium text-xs gap-2 bg-gray-50 antialiased font-sans">
        <Loader2 size={22} className="animate-spin text-blue-500" />
        <span>Verifying Security Clearance Parameters...</span>
      </div>
    );
  }

  // 🛡️ Safe check shield: Blocks regular user configurations and Managers immediately
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center bg-gray-50 font-sans antialiased text-gray-800">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl mb-4 shadow-sm border border-amber-200/60 animate-pulse">
          <ShieldAlert size={36} />
        </div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">System Message Center</h1>
        <p className="text-xs text-gray-400 max-w-sm mt-1.5 font-bold uppercase tracking-wider leading-relaxed">
          Access Denied
        </p>
        <p className="text-xs text-gray-500 max-w-sm mt-1 font-semibold leading-relaxed">
          Welcome to the announcement desk hub. Regular profiles and manager accounts can review system updates using the global notification bell icon located on the navigation header bar.
        </p>
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-6 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm transition-all focus:outline-none"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans antialiased text-gray-800">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* TOP STATUS ALERTS */}
        {uiMessage && (
          <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 shadow-sm text-white font-bold text-xs transition-all alert-dismiss-animation ${
            uiMessage.type === "success" ? "bg-green-600 animate-fade-in" : "bg-red-600"
          }`}>
            {uiMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{uiMessage.text}</span>
          </div>
        )}

        {/* COMPACT CORPORATE BRAND HEADER */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm shadow-blue-100">
            <Megaphone size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Broadcast Control Desk</h1>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mt-0.5">Admin Central Governance Engine</p>
          </div>
        </div>

        {/* CORE GRID INTERFACE */}
        <form onSubmit={handleSubmitBroadcast} className="flex flex-col lg:flex-row gap-4 items-start">
          
          {/* COMPACT FORM WORKSPACE */}
          <div className="w-full lg:flex-1 bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <FileText size={14} className="text-blue-500" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Compose Announcement Bulletin</h3>
            </div>
            
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Broadcast Title Banner</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Planned Maintenance Loop Window"
                className="w-full border border-gray-300 rounded-xl bg-gray-50/50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all shadow-inner placeholder-gray-400"
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Message Content Body Context</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter detailed announcements, service guidelines, or outage timelines here directly..."
                rows={9}
                className="w-full border border-gray-300 rounded-xl bg-gray-50/50 p-3 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium transition-all leading-relaxed shadow-inner placeholder-gray-400 resize-none"
                required
              />
            </div>
          </div>

          {/* COMPACT SIDE RECIPIENTS TARGET PANEL */}
          <div className="w-full lg:w-72 bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex flex-col h-[356px] shrink-0">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-blue-500" /> Target Recipients
              </h3>
              {systemUsers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllUsers}
                  className="text-[10px] font-black text-blue-600 hover:text-indigo-700 uppercase focus:outline-none tracking-wider transition-colors"
                >
                  {selectedUserIds.length === systemUsers.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {/* HIGH DENSITY RECIPIENT ROW LOOP */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-xl px-1.5 bg-gray-50/40">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-20 gap-1.5 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span>Loading operators...</span>
                </div>
              ) : systemUsers.length > 0 ? (
                systemUsers.map((user) => {
                  const isChecked = selectedUserIds.includes(user.id);
                  return (
                    <label key={user.id} className={`flex items-center gap-2.5 p-2 cursor-pointer rounded-lg my-1 transition-all border ${
                      isChecked 
                        ? "bg-blue-50/40 border-blue-200/70" 
                        : "bg-transparent border-transparent hover:bg-white hover:border-gray-200"
                    }`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleUserSelection(user.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-gray-300 cursor-pointer"
                      />
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate capitalize">{user.username}</p>
                        {user.email && <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">{user.email}</p>}
                      </div>
                    </label>
                  );
                })
              ) : (
                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider py-20">No profiles located.</p>
              )}
            </div>

            {/* COMPACT CTAS */}
            <div className="pt-3 border-t border-gray-100 mt-3">
              <button
                type="submit"
                disabled={submitting || selectedUserIds.length === 0 || !title.trim() || !body.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-1.5 focus:outline-none"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Dispatch Broadcast ({selectedUserIds.length})</span>
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}