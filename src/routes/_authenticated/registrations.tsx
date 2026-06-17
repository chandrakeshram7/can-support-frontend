import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCheck, UserX, Shield, Clock, Search, ClipboardList, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

// Helper to decode JWT token payloads completely on the frontend client side
function getSessionRole(): string {
  if (typeof window === "undefined") return "USER";
  const token = window.localStorage.getItem("accessToken");
  if (!token) return "USER";
  
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(window.atob(base64));
    
    const rawRole = parsed.role || parsed.roles || parsed.authorities || parsed.authority || "USER";
    const roleString = Array.isArray(rawRole) ? rawRole[0] : rawRole;
    
    return String(roleString).toUpperCase().replace("ROLE_", "").trim();
  } catch (err) {
    console.error("Error decoding client token payload claims:", err);
    return "USER";
  }
}

export const Route = createFileRoute("/_authenticated/registrations")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("accessToken");
    
    if (!token) throw redirect({ to: "/login" });

    const activeRole = getSessionRole();
    console.log("Current Authenticated User Role from Token Claim:", activeRole);

    if (activeRole !== "ADMIN" && activeRole !== "MANAGER") {
      alert(`Access Denied: Your role (${activeRole}) is not authorized to access the approvals console.`);
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RegistrationApprovalsPage,
});

interface PendingSignup {
  id: number;
  username: string;
  email: string;
  role?: string;
  requestedRole?: string;
  createdAt?: string;
  timestamp?: string;
}

function RegistrationApprovalsPage() {
  const [requests, setRequests] = useState<PendingSignup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<number | null>(null);
  const [apiErrorMsg, setApiErrorMsg] = useState<string | null>(null);

  // ✅ ROBUST HOST DETECTOR: Guarantees that production deployments never fall back to localhost roots
  const getBackendHost = () => {
    if (typeof window === "undefined") return "https://can-support-backend.onrender.com";
    const currentHost = window.location.hostname;
    if (currentHost === "localhost" || currentHost === "127.0.0.1" || currentHost.startsWith("192.168.")) {
      return "http://localhost:8080";
    }
    return "https://can-support-backend.onrender.com";
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  async function fetchPendingRequests() {
    try {
      setLoading(true);
      setApiErrorMsg(null);
      
      const host = getBackendHost();
      const token = window.localStorage.getItem("accessToken");

      console.log("Fetching approvals queue from computed production engine host target:", `${host}/users/pending`);

      const response = await fetch(`${host}/users/pending`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      const rawText = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(rawText);
          setRequests(data || []);
        } catch (jsonErr) {
          console.error("Failed to parse response body string mapping stream:", rawText);
          setApiErrorMsg("Backend Payload Error: Data stream response format mismatch.");
          setRequests([]);
        }
      } else {
        if (response.status === 401 || response.status === 403) {
          setApiErrorMsg(`Access Restricted (${response.status}): Ensure your account credentials maintain governance clear privileges on Render.`);
        } else {
          setApiErrorMsg(`Server responded with error status code: ${response.status}`);
        }
        setRequests([]);
      }
    } catch (err) {
      console.error("Failed fetching signup validation stream:", err);
      setApiErrorMsg("Network Connection Error: Could not hit the backend server registry.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: number, approved: boolean) {
    if (isProcessingId !== null) return;
    try {
      setIsProcessingId(id);
      const host = getBackendHost();
      const endpoint = `${host}/users/${id}/${approved ? "approve" : "deny"}`;
      const token = window.localStorage.getItem("accessToken");
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        setRequests(prev => prev.filter(req => req.id !== id));
      } else {
        alert(`Failed executing registration action loop request. Server Status: ${response.status}`);
      }
    } catch (err) {
      console.error("Error managing signup workflow confirmation handler:", err);
    } finally {
      setIsProcessingId(null);
    }
  }

  const filteredRequests = requests.filter(req => 
    req.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-sans antialiased text-gray-800">
      
      {/* Title Header Section Banner */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-xs uppercase tracking-wider">
            <Shield size={13} />
            <span>Token Authorized Governance</span>
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Personnel Creation Approvals</h1>
          <p className="text-xs font-semibold text-gray-400">Manage client nodes and verify unapproved database platform users.</p>
        </div>

        {/* Live Search Inputs Bar */}
        <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 focus-within:bg-white transition-all h-8 sm:w-64 shrink-0 shadow-inner">
          <Search size={13} className="text-gray-400 mr-1.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter application queries..."
            className="w-full bg-transparent text-xs font-semibold outline-none text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      {/* ⚠️ Error Diagnostics Banner Display */}
      {apiErrorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 font-semibold">
          <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <strong>Network Sync Error:</strong> {apiErrorMsg}
          </div>
        </div>
      )}

      {/* Primary Data Matrix Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <ClipboardList size={12} /> Pending Ingestion Stream List ({filteredRequests.length})
          </span>
        </div>

        <div className="divide-y divide-gray-100 bg-white">
          {loading ? (
            <div className="p-12 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider flex flex-col items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-blue-500" />
              <span>Querying database profile listings...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-10 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed bg-gray-50/10 flex flex-col items-center justify-center gap-1">
              <CheckCircle2 size={18} className="text-emerald-500/70" />
              <span>All clear. No registration applications are awaiting approval.</span>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const displayRole = request.requestedRole || request.role || "USER";
              const displayTime = request.timestamp || request.createdAt;
              const isBeingProcessed = isProcessingId === request.id;

              return (
                <div key={request.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-gray-50/30">
                  
                  {/* Avatar Icon Card Section Elements */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center font-black text-blue-700 text-xs shadow-sm uppercase shrink-0">
                      {request.username ? request.username.substring(0, 2) : "OP"}
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-extrabold text-gray-900 tracking-tight capitalize">
                          {request.username || "Unknown Profile ID"}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide uppercase bg-gray-100 border border-gray-200 text-gray-600">
                          {displayRole}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium truncate leading-none">{request.email}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold tracking-wide uppercase pt-1">
                        <Clock size={10} className="text-gray-300" />
                        <span>Applied: {displayTime ? new Date(displayTime).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Queue Stage Active"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Choice Action Cluster */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      disabled={isProcessingId !== null}
                      onClick={() => handleAction(request.id, false)}
                      className="h-7 bg-white border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-600 font-bold px-2.5 rounded-md text-[10px] transition-all flex items-center gap-1 focus:outline-none uppercase tracking-wider shadow-sm"
                    >
                      {isBeingProcessed ? <Loader2 size={11} className="animate-spin" /> : <UserX size={12} />}
                      <span>Deny</span>
                    </button>
                    <button
                      disabled={isProcessingId !== null}
                      onClick={() => handleAction(request.id, true)}
                      className="h-7 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 rounded-md text-[10px] transition-all flex items-center gap-1 focus:outline-none uppercase tracking-wider shadow-sm"
                    >
                      {isBeingProcessed ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={12} />}
                      <span>Approve</span>
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}