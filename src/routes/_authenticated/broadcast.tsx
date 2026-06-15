import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Send, Users, CheckCircle2, AlertCircle, ShieldAlert, Loader2 } from "lucide-react";
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

// 🎯 Hook to pull current profile credentials context
const useCurrentUserSession = () => {
  return useMemo(() => ({ id: 1, username: "chandrakesh", role: "ADMIN" }), []); 
};

function AdminBroadcastPanel() {
  const currentUser = useCurrentUserSession();
  const navigate = useNavigate();

  const [systemUsers, setSystemUsers] = useState<DropdownUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uiMessage, setUiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAvailableUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await ticketApi.getAllUsers();
        if (!isMounted) return;

        const userData = Array.isArray(res) ? res : res.data || res.content || [];
        setSystemUsers(userData);
      } catch (err) {
        console.error("Failed fetching user accounts directory:", err);
        if (isMounted) {
          setUiMessage({ type: "error", text: "Failed loading active personnel list." });
        }
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    if (currentUser?.role === "ADMIN") {
      fetchAvailableUsers();
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser?.role]);

  // 🛡️ SECURITY GUARD: Non-Admin users only see the System Message Center view layout
  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center bg-gray-50 font-sans">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl mb-4 shadow-sm border border-amber-100">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Message Center</h1>
        <p className="text-sm text-gray-500 max-w-md mt-2 font-medium leading-relaxed">
          Welcome to the announcement desk hub. Regular profiles can review system notices and alerts using the global notification bell icon located on your navigation header bar.
        </p>
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-6 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

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
    } catch (err) {
      console.error("Exception thrown during delivery submission processing:", err);
      setUiMessage({ type: "error", text: "Failed dispatching broadcast configuration routing settings." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {uiMessage && (
          <div className={`flex items-center gap-3 rounded-xl p-4 shadow-sm text-white font-medium text-sm transition-all ${
            uiMessage.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}>
            {uiMessage.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{uiMessage.text}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">System Notification Broadcast Desk</h1>
            <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase mt-0.5">Admin Central Governance Engine</p>
          </div>
        </div>

        <form onSubmit={handleSubmitBroadcast} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 tracking-wide border-b pb-2">Compose Broadcast Notification</h3>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Broadcast Title Banner</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Planned Maintenance Loop Window"
                className="w-full border border-gray-300 rounded-xl bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 font-medium transition-all"
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Message Content Body Context</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter detailed announcements, service guidelines, or outage timelines here directly..."
                rows={8}
                className="w-full border border-gray-300 rounded-xl bg-white p-3 text-sm outline-none focus:border-blue-500 font-medium transition-all leading-relaxed"
                required
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col max-h-[440px]">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h3 className="text-sm font-bold text-gray-800 tracking-wide flex items-center gap-1.5">
                <Users size={16} className="text-blue-500" /> Target Recipients
              </h3>
              {systemUsers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllUsers}
                  className="text-[11px] font-black text-blue-600 hover:text-blue-800 uppercase focus:outline-none"
                >
                  {selectedUserIds.length === systemUsers.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-xl px-2">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 text-xs font-medium">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                  <span>Loading operators data listings...</span>
                </div>
              ) : systemUsers.length > 0 ? (
                systemUsers.map((user) => {
                  const isChecked = selectedUserIds.includes(user.id);
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer rounded-lg my-1 transition-all hover:bg-gray-50/80 ${
                        isChecked ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleUserSelection(user.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300"
                      />
                      <div className="text-left">
                        <p className="text-xs font-bold text-gray-800">{user.username}</p>
                        {user.email && <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>}
                      </div>
                    </label>
                  );
                })
              ) : (
                <p className="text-center text-xs text-gray-400 font-semibold py-12">No system users located.</p>
              )}
            </div>

            <div className="pt-4 border-t mt-4">
              <button
                type="submit"
                disabled={submitting || selectedUserIds.length === 0 || !title.trim() || !body.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 group"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                )}
                <span>Dispatch Broadcast ({selectedUserIds.length})</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}