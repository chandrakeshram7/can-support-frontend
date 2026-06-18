if (typeof global === "undefined") {
  (window as any).global = window;
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Paperclip, 
  Download, 
  ArrowRightLeft, 
  Send, 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  Clock, 
  User, 
  Mail, 
  FileText, 
  History, 
  MessageSquare,
  BookmarkCheck,
  Unlock,
  Maximize2,
  Minimize2,
  EyeOff
} from "lucide-react";

import { ticketApi, UserDropdown } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/ticket/$ticketNumber")({
  component: TicketDetailsPage,
});

const getBackendBaseUrl = (): string => {
  const currentHost = window.location.hostname;
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    return "http://localhost:8080";
  }
  return "https://can-support-backend.onrender.com";
};

// 🔑 REFACTORED UTILITY: Decodes roles and normalizes strings to strip array and authority objects perfectly
const getUserRoles = (): string[] => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return [];
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
    
    // Scans across all common JWT claim payload architectures
    const rawRoles = parsed.roles || parsed.role || parsed.authorities || parsed.authority || [];
    const rolesArray = Array.isArray(rawRoles) ? rawRoles : [rawRoles];
    
    return rolesArray.map((r: any) => {
      const roleStr = typeof r === "object" ? (r.authority || r.role || "") : String(r);
      return roleStr.toUpperCase().trim();
    });
  } catch (e) {
    console.error("Failed to parse user session roles token payload:", e);
    return [];
  }
};

function TicketDetailsPage() {
  const { ticketNumber } = Route.useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uiMessage, setUiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const roles = useMemo(() => getUserRoles(), []);
  
  // ✅ FIXED MATCHING: Tolerates prefix differences seamlessly to avoid accidental access lockouts
  const isEscalationManager = useMemo(() => 
    roles.includes("ROLE_ESCALATION_MANAGER") || roles.includes("ESCALATION_MANAGER"), 
    [roles]
  );

  useEffect(() => {
    if (ticketNumber) {
      loadTicket(ticketNumber);
    }
  }, [ticketNumber]);

  const loadTicket = async (id: string) => {
    try {
      setTicket(null);
      setLoading(true);
      const response = await ticketApi.getTicketInfo(id);
      const ticketData = response.data ? response.data : response;
      setTicket(ticketData);
    } catch (e) {
      console.error("Failed to load ticket:", e);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  /* AUTO HIDE MESSAGE */
  useEffect(() => {
    if (uiMessage) {
      const timer = setTimeout(() => {
        setUiMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [uiMessage]);

  // CHRONOLOGICAL PROGRESS DATA AGGREGATION
  const unifiedTimeline = useMemo(() => {
    if (!ticket) return [];
    const items: any[] = [];

    if (ticket.conversations) {
      ticket.conversations.forEach((c: any) => {
        items.push({
          ...c,
          timelineType: "CONVERSATION",
          sortDate: new Date(c.createdAt).getTime(),
        });
      });
    }

    if (ticket.queueMovements) {
      ticket.queueMovements.forEach((m: any) => {
        items.push({
          ...m,
          timelineType: "MOVEMENT",
          sortDate: new Date(m.movedAt).getTime(),
        });
      });
    }

    return items.sort((a, b) => b.sortDate - a.sortDate);
  }, [ticket]);

  const executeSecureDownload = async (event: React.MouseEvent, storagePath: string, fileName: string) => {
    event.preventDefault();
    try {
      const response = await fetch(storagePath);
      const binaryBlob = await response.blob();
      
      const localBlobUrl = window.URL.createObjectURL(binaryBlob);
      const hiddenAnchor = document.createElement("a");
      hiddenAnchor.href = localBlobUrl;
      hiddenAnchor.download = fileName || "download.pdf";
      
      document.body.appendChild(hiddenAnchor);
      hiddenAnchor.click();
      
      document.body.removeChild(hiddenAnchor);
      window.URL.revokeObjectURL(localBlobUrl);
    } catch (error) {
      console.error("Local context download hydration exception caught:", error);
      window.open(storagePath, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Loading contract timeline data...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased text-sm font-semibold text-red-500">
        Ticket reference node not found in workspace database.
      </div>
    );
  }

  const isEscalatedStatus = ticket.ticketStatus === "ESCALATED" || ticket.isEscalated;

  // 🔐 HARD SECURITY GUARD LAYER
  if (isEscalatedStatus && !isEscalationManager) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased">
        <div className="text-center max-w-sm bg-white p-6 border border-gray-200 rounded-2xl shadow-sm space-y-3">
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto border border-red-100">
            <EyeOff size={18} />
          </div>
          <h2 className="text-sm font-extrabold text-gray-900 tracking-tight uppercase">Access Restricted</h2>
          <p className="text-xs text-gray-400 font-semibold leading-normal">
            This ticket has been escalated under SLA procedures. Standard user profiles do not possess authorization to audit this tracking node.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans antialiased text-gray-800">
      <div className="max-w-6xl mx-auto space-y-3.5">
        
        {/* TOP STATUS FEEDBACK ALERTS */}
        {uiMessage && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-sm text-white font-bold text-xs transition-all animate-fade-in ${
            uiMessage.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}>
            {uiMessage.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{uiMessage.text}</span>
          </div>
        )}

        {/* CRITICAL ESCALATION ATTENTION HEADER BANNER */}
        {isEscalatedStatus && (
          <div className="flex items-start gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-4 shadow-md border border-red-700">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h3 className="font-black text-xs uppercase tracking-wider">SLA Escalation Breach Triggered ({ticket.escalationReason || "USER_REQUESTED"})</h3>
              <p className="text-[11px] text-red-100 font-medium leading-relaxed">
                Reason Notes: {ticket.escalationNotes || "Bypassed standard support layers via escalation override rules."}
              </p>
            </div>
          </div>
        )}

        {/* CORE WORKSPACE CONSOLE CANVAS */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5 space-y-5">
          
          {/* HEADER LAYER DESIGN */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 border-b border-gray-100 pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-snug">{ticket.subject}</h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span className="font-mono bg-gray-100 text-gray-500 px-1 rounded text-[9px]">REF</span>
                <span>{ticket.ticketNumber}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {ticket.reopenCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-black tracking-wide uppercase">
                  Reopened: {ticket.reopenCount}/3
                </span>
              )}

              <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide uppercase border ${
                ticket.ticketStatus === "OPEN"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : ticket.ticketStatus === "ASSIGNED"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : ticket.ticketStatus === "RESOLVED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : ticket.ticketStatus === "ESCALATED"
                        ? "bg-purple-50 border-purple-200 text-purple-700 font-extrabold"
                        : "bg-gray-50 border-gray-200 text-gray-600"
              }`}>{ticket.ticketStatus}</span>
            </div>
          </div>

          {/* METADATA PROPERTIES GRID STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 border border-gray-200/50 p-3.5 rounded-xl text-xs font-semibold text-gray-600">
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Mail size={11} className="text-gray-400" /> Customer Endpoint
              </span>
              <p className="text-gray-800 truncate" title={ticket.customerMail}>{ticket.customerMail}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <User size={11} className="text-gray-400" /> Allocated Account
              </span>
              <p className="text-gray-800 capitalize">{ticket.assignedMember?.username || "Unassigned"}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock size={11} className="text-gray-400" /> Creation Timeline
              </span>
              <p className="text-gray-800">{new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* INITIAL BULK MAIL ATTACHMENTS SUBPANEL */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200/60 rounded-xl space-y-2">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Paperclip size={12} /> Ingestion Mail Attachments ({ticket.attachments.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {ticket.attachments.map((file: any) => (
                  <button
                    key={file.id || file.storagePath}
                    onClick={(e) => executeSecureDownload(e, file.storagePath, file.fileName)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all text-gray-700 hover:text-blue-600 text-xs font-bold shadow-sm"
                  >
                    <Download size={11} className="text-gray-400" />
                    <span className="truncate max-w-[200px] underline">{file.fileName || "View File"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TWO COLUMN DISPOSITION LAYOUT VIEWPORT CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 items-start">
            
            {/* COLUMN LEFT: TIMELINE FEED */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-1">
                <div className="flex items-center gap-1.5">
                  <History size={14} className="text-gray-400" />
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Lifecycle Ledger</h2>
                </div>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black tracking-wide rounded-md border border-gray-200/60">
                  {unifiedTimeline.length} entries
                </span>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {unifiedTimeline.length ? (
                  unifiedTimeline.map((item, index) => (
                    <TimelineCard 
                      key={index} 
                      item={item} 
                      onDownloadRequest={executeSecureDownload} 
                    />
                  ))
                ) : (
                  <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 font-bold uppercase text-[10px] tracking-wider bg-gray-50/50">
                    No lifecycle ledger parameters recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN RIGHT: ACTIONS PANEL */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <FileText size={14} className="text-gray-400" />
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Triage Execution Panel</h2>
              </div>
              <TicketActionButtons
                ticket={ticket}
                onActionSuccess={(message, type) => {
                  setUiMessage({ text: message, type });
                  loadTicket(ticket.ticketNumber);
                }}
              />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function TimelineCard({ item, onDownloadRequest }: { item: any; onDownloadRequest: any }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const isMovement = item.timelineType === "MOVEMENT";
  const hasAttachments = item.attachments && item.attachments.length > 0;

  return (
    <div className={`rounded-xl border transition-all duration-150 overflow-hidden ${
      isMovement 
        ? "bg-slate-50/50 border-slate-200/70 shadow-sm" 
        : "bg-white border-gray-200/80 hover:border-gray-300 shadow-sm"
    }`}>
      
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 ${
            isMovement ? "bg-slate-200/80 text-slate-700" : "bg-blue-50 text-blue-600 border border-blue-100/50"
          }`}>
            {isMovement ? "Move" : "Mail"}
          </div>
          
          <div className="truncate min-w-0">
            <p className="text-xs font-black text-gray-800 truncate capitalize">
              {isMovement ? item.movedByUsername : item.sender}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-0.5">
              <Clock size={11} className="text-gray-300" />
              <span>{new Date(item.sortDate).toLocaleString()}</span>
              
              {!isMovement && (
                <>
                  <span className="text-gray-200">|</span>
                  <span className="text-gray-500 truncate max-w-[240px]">
                    {item.message}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pl-1">
          {hasAttachments && (
            <span className="text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 rounded px-1.5 py-0.5 flex items-center gap-0.5">
              📎 {item.attachments.length}
            </span>
          )}
          <button className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3.5 pt-1 border-t border-gray-100 bg-gray-50/30 text-left">
          {isMovement ? (
            <div className="space-y-2 mt-1.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                <ArrowRightLeft size={13} className="text-blue-500" />
                <span>Ticket shifted from <span className="text-blue-600">{item.fromQueueName}</span> to <span className="text-blue-600">{item.toQueueName}</span></span>
              </div>
              {item.comment && (
                <p className="text-[11px] bg-white text-gray-500 border rounded-lg p-2.5 italic font-medium leading-relaxed shadow-inner">
                  Comment Note: "{item.comment}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 mt-1.5">
              <div className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed font-medium bg-white border border-gray-200 rounded-xl p-3 shadow-inner max-h-80 overflow-y-auto">
                {item.message || <span className="italic text-gray-300">No text body logged in this message node.</span>}
              </div>

              {hasAttachments && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1">
                    <Paperclip size={11} /> Section Attachments ({item.attachments.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.attachments.map((file: any) => (
                      <button
                        key={file.id || file.storagePath}
                        onClick={(e) => onDownloadRequest(e, file.storagePath, file.fileName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all text-gray-700 hover:text-blue-600 text-[11px] font-bold shadow-sm"
                      >
                        <Download size={10} className="text-gray-400" />
                        <span className="truncate max-w-[160px] underline">{file.fileName || "Download file"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketActionButtons({
  ticket,
  onActionSuccess,
}: {
  ticket: any;
  onActionSuccess: (message: string, type: "success" | "error") => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [memberId, setMemberId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [escalationNotes, setEscalationNotes] = useState(""); 
  const [users, setUsers] = useState<UserDropdown[]>([]);

  const roles = useMemo(() => getUserRoles(), []);
  
  // ✅ FIXED COMPATIBILITY MARKERS
  const isEscalationManager = useMemo(() => 
    roles.includes("ROLE_ESCALATION_MANAGER") || roles.includes("ESCALATION_MANAGER"), 
    [roles]
  );

  const isCurrentlyEscalated = ticket.ticketStatus === "ESCALATED" || ticket.isEscalated;
  
  // ✅ DYNAMIC FORM TOGGLE: Unlocks administrative panels instantly for Escalation Managers
  const isActionDisabled = submitting || (isCurrentlyEscalated && !isEscalationManager);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const usersResponse = await ticketApi.getAllUsers();
      setUsers(usersResponse || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || isActionDisabled) return;

    try {
      setSubmitting(true);
      await ticketApi.assign({
        ticketNumber: ticket.ticketNumber,
        assignedMemberId: Number(memberId),
        projectId: 1, 
      });
      onActionSuccess("Ticket assigned successfully", "success");
    } catch (e) {
      console.error(e);
      onActionSuccess("Failed to assign ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateResolution = async () => {
    if (!resolutionText.trim() || isActionDisabled) return;

    try {
      setSubmitting(true);
      await ticketApi.resolve({
        ticketNumber: ticket.ticketNumber,
        resolution: resolutionText,
      });
      setResolutionText("");
      onActionSuccess("Ticket resolved successfully", "success");
    } catch (e) {
      console.error(e);
      onActionSuccess("Failed to resolve ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAgentReply = async () => {
    if (!replyText.trim() || isActionDisabled) return;
    try {
      setSubmitting(true);
      await ticketApi.sendReply({
        ticketNumber: ticket.ticketNumber,
        replyMessage: replyText.trim(),
        attachments: [] 
      });
      setReplyText("");
      onActionSuccess("Follow-up thread email message logged and dispatched.", "success");
    } catch (err) {
      console.error(err);
      onActionSuccess("Failed to deliver reply mapping.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualEscalation = async () => {
    if (!escalationNotes.trim() || isCurrentlyEscalated) return;
    try {
      setSubmitting(true);
      const baseUrl = getBackendBaseUrl();
      
      const response = await fetch(`${baseUrl}/escalations/${ticket.ticketNumber}/force-escalate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
          "X-Escalation-Notes": btoa(encodeURIComponent(escalationNotes.trim()))
        }
      });

      if (response.ok) {
        setEscalationNotes("");
        onActionSuccess("Ticket successfully escalated and dispatched onto the Escalation Desk.", "success");
      } else {
        onActionSuccess("Failed to process escalation override parameters.", "error");
      }
    } catch (err) {
      console.error("Network exception during routing execution:", err);
      onActionSuccess("Network exception during routing execution.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const showInteractionWidgets = 
    ticket.ticketStatus === "OPEN" ||
    ticket.ticketStatus === "ASSIGNED" ||
    ticket.ticketStatus === "IN_PROGRESS" ||
    ticket.ticketStatus === "RE_OPENED" ||
    ticket.ticketStatus === "ESCALATED";

  return (
    <div className="space-y-4">
      
      {/* 1. ASSIGN OPERATOR ACTION BLOCK */}
      {showInteractionWidgets && (
        <div className={`border rounded-xl p-4 shadow-sm border-gray-200 transition-all ${isActionDisabled ? "bg-gray-100/70 opacity-60" : "bg-white"}`}>
          <h3 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
            {isActionDisabled ? <Lock size={13} className="text-red-500 shrink-0" /> : <User size={13} className="text-blue-500 shrink-0" />}
            <span>Re-allocate Ownership</span>
          </h3>
          <form onSubmit={handleAssignTicket} className="space-y-2.5">
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={isActionDisabled}
              className="w-full border border-gray-300 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 transition-all h-8 disabled:bg-gray-200"
              required
            >
              <option value="">Select Team Member</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isActionDisabled || !memberId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold py-1.5 px-4 rounded-lg transition-all shadow-sm text-xs h-8"
            >
              Assign Resource
            </button>
          </form>
        </div>
      )}

      {/* 2. CUSTOMER CONVERSATION THREAD BOX */}
      {showInteractionWidgets && ticket.ticketStatus !== "OPEN" && (
        <div className={`border rounded-xl p-4 shadow-sm border-gray-200 transition-all ${isActionDisabled ? "bg-gray-100/70 opacity-60" : "bg-white"}`}>
          <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            {isActionDisabled ? <Lock size={13} className="text-red-500 shrink-0" /> : <MessageSquare size={13} className="text-blue-500 shrink-0" />}
            <span>Dispatch Trail Reply</span>
          </h3>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={isActionDisabled}
            placeholder={isActionDisabled ? "Form locked. Requires Escalation Management token..." : "Type email response thread notes here..."}
            rows={3}
            className="w-full border border-gray-300 rounded-lg bg-gray-50/50 p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white transition-all font-medium placeholder-gray-400 leading-tight resize-none shadow-inner"
          />

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => handleSendAgentReply()}
              disabled={isActionDisabled || !replyText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold px-4 py-1.5 rounded-lg transition-all shadow-sm text-xs h-7"
            >
              Send Message
            </button>
          </div>
        </div>
      )}

      {/* 3. MANUAL OVERRIDE FORCE ESCALATION BOX */}
      {!isCurrentlyEscalated && ticket.ticketStatus !== "RESOLVED" && (
        <div className="bg-red-50/30 border border-red-200/80 rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <AlertTriangle size={13} className="text-red-600 shrink-0" /> Force Manual Escalation
          </h3>

          <textarea
            value={escalationNotes}
            onChange={(e) => setEscalationNotes(e.target.value)}
            disabled={submitting}
            placeholder="State explicit breach or escalation override reason parameters summary..."
            rows={2}
            className="w-full border border-red-200 rounded-lg bg-white p-2.5 text-xs outline-none focus:border-red-500 transition-all font-medium text-gray-800 placeholder-red-300 leading-tight resize-none shadow-sm"
          />

          <div className="mt-2 flex justify-end">
            <button
              onClick={handleManualEscalation}
              disabled={submitting || !escalationNotes.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold px-4 py-1.5 rounded-lg transition-all shadow-sm text-xs h-7"
            >
              Escalate Ticket
            </button>
          </div>
        </div>
      )}

      {/* 4. FINAL CLOSURE RESOLUTION BOX */}
      {showInteractionWidgets && (
        <div className={`border rounded-xl p-4 shadow-sm transition-all border-gray-200 ${
          isCurrentlyEscalated 
            ? isEscalationManager 
              ? "bg-amber-50/30 border-amber-300"
              : "bg-gray-100/70 border-gray-200 opacity-60"
            : "bg-white"
        }`}>
          <h3 className="text-xs font-bold text-gray-800 mb-1.5 flex flex-col gap-1 items-start uppercase tracking-wide">
            <div className="flex items-center gap-1.5">
              {isCurrentlyEscalated ? <AlertTriangle size={13} className="text-amber-500" /> : <BookmarkCheck size={13} className="text-emerald-500" />}
              <span>Resolve Contract Case</span>
            </div>
            
            {isCurrentlyEscalated && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase border mt-0.5 inline-flex items-center gap-1 ${
                isEscalationManager ? "bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse" : "bg-red-50 border-red-200 text-red-700"
              }`}>
                {isEscalationManager ? <Unlock size={10} /> : <Lock size={10} />}
                {isEscalationManager ? "Unlocked for Escalation Authority" : "SLA Lock Active - Requires Escalation Authority"}
              </span>
            )}
          </h3>
          
          {isCurrentlyEscalated && !isEscalationManager && (
            <p className="text-[10px] text-red-500 font-bold mb-2 leading-tight">
              Action blocked. Requires active ROLE_ESCALATION_MANAGER token claims mapping parameters.
            </p>
          )}

          <textarea
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            disabled={isActionDisabled}
            placeholder={isActionDisabled ? "Locked..." : "Enter final verification completion steps details..."}
            rows={3}
            className="w-full border border-gray-300 rounded-lg bg-gray-50/50 p-2.5 text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium placeholder-gray-400 leading-tight resize-none shadow-inner"
          />
          <button
            onClick={handleCreateResolution}
            disabled={isActionDisabled || !resolutionText.trim()}
            className="w-full mt-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold py-1.5 px-4 rounded-lg transition-all shadow-sm text-xs h-8"
          >
            Close out Ticket
          </button>
        </div>
      )}
    </div>
  );
}