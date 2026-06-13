if (typeof global === "undefined") {
  (window as any).global = window;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Paperclip, Download, ArrowRightLeft, Send, ShieldAlert, AlertTriangle, Lock } from "lucide-react";

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

// HELPER UTILITY: Decodes roles from JWT clientside safely
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
    return Array.isArray(parsed.roles) ? parsed.roles : parsed.role ? [parsed.role] : [];
  } catch (e) {
    console.error("Failed to parse user session roles token payload:", e);
    return [];
  }
};

function TicketDetailsPage() {
  const { ticketNumber } = Route.useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* SUCCESS / ERROR UI MESSAGE */
  const [uiMessage, setUiMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

    return items.sort((a, b) => a.sortDate - b.sortDate);
  }, [ticket]);

  // ✅ PROGRAMMATIC DOWNLOAD HANDLER: Bypasses cross-origin naming blocks completely
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
      
      // Clean up DOM objects out of thread memory allocation memory spaces
      document.body.removeChild(hiddenAnchor);
      window.URL.revokeObjectURL(localBlobUrl);
    } catch (error) {
      console.error("Local context download hydration exception caught:", error);
      // Fallback: Attempt opening in standard external window tab space if local stream drops
      window.open(storagePath, "_blank");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen font-medium text-gray-500">Loading...</div>;
  }

  if (!ticket) {
    return <div className="p-6 text-red-500 font-semibold">Ticket not found</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen font-sans">
      {/* TOP UI ALERT */}
      {uiMessage && (
        <div className={`mb-4 max-w-6xl mx-auto flex items-center gap-3 rounded-xl p-4 shadow-sm text-white transition-all ${
          uiMessage.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {uiMessage.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{uiMessage.text}</span>
        </div>
      )}

      {/* CRITICAL ESCALATION ATTENTION HEADER BANNER */}
      {(ticket.ticketStatus === "ESCALATED" || ticket.isEscalated) && (
        <div className="mb-4 max-w-6xl mx-auto flex items-start gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-5 shadow-md animate-pulse">
          <ShieldAlert size={24} className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider">This Ticket is Escalated ({ticket.escalationReason || "USER_REQUESTED"})</h3>
            <p className="text-xs text-red-100 mt-1 font-medium leading-relaxed">
              Reason Details: {ticket.escalationNotes || "Bypassed standard queue triage layers via escalation matrix thresholds."}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{ticket.subject}</h1>
            <p className="text-gray-400 font-semibold text-xs mt-1 uppercase tracking-wider">{ticket.ticketNumber}</p>
          </div>

          <div className="flex items-center gap-2">
            {ticket.reopenCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-extrabold tracking-wide uppercase">
                Reopened Loops: {ticket.reopenCount}/3
              </span>
            )}

            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
              ticket.ticketStatus === "OPEN"
                ? "bg-yellow-100 text-yellow-700"
                : ticket.ticketStatus === "ASSIGNED"
                  ? "bg-blue-100 text-blue-700"
                  : ticket.ticketStatus === "IN_PROGRESS"
                    ? "bg-indigo-100 text-indigo-700" 
                    : ticket.ticketStatus === "RESOLVED"
                      ? "bg-green-100 text-green-700"
                      : ticket.ticketStatus === "ESCALATED"
                        ? "bg-red-600 text-white border border-red-700 font-extrabold"
                        : ticket.ticketStatus === "RE_OPENED"
                          ? "bg-orange-100 text-orange-700 border border-orange-200"
                          : "bg-gray-100 text-gray-700"
            }`}>
              {ticket.ticketStatus}
            </span>
          </div>
        </div>

        {/* INITIAL ROOT ATTACHMENTS */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <Paperclip size={14} /> Initial Mail Attachments ({ticket.attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((file: any) => (
                <button
                  key={file.id || file.storagePath}
                  onClick={(e) => executeSecureDownload(e, file.storagePath, file.fileName)}
                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-gray-700 hover:text-blue-600 text-xs font-semibold group shadow-sm text-left"
                >
                  <Download size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <span className="truncate max-w-[220px]">{file.fileName || "View Attachment"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* META PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 bg-gray-50/70 border border-gray-100 p-5 rounded-xl">
          <div>
            <p className="text-xs uppercase text-gray-400 font-bold tracking-wider">Customer Email</p>
            <p className="mt-1 font-medium text-gray-700 text-sm">{ticket.customerMail}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 font-bold tracking-wider">Assigned Owner</p>
            <p className="mt-1 font-medium text-gray-700 text-sm">{ticket.assignedMember?.username || "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 font-bold tracking-wider">Created At</p>
            <p className="mt-1 font-medium text-gray-700 text-sm">{new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* ACTIONS PANEL */}
        <TicketActionButtons
          ticket={ticket}
          onActionSuccess={(message, type) => {
            setUiMessage({ text: message, type });
            loadTicket(ticket.ticketNumber);
          }}
        />

        {/* HISTORY TABLE */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-5">Ticket History</h2>
          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50/70 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="text-left p-4">Sender / Actor</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Preview</th>
                  <th className="text-left p-4 w-[120px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {unifiedTimeline.length ? (
                  unifiedTimeline.map((item, index) => (
                    <TimelineRow 
                      key={index} 
                      item={item} 
                      onDownloadRequest={executeSecureDownload} // ✅ Injected 
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">
                      No conversation or queue routing actions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ item, onDownloadRequest }: { item: any; onDownloadRequest: any }) {
  const [expanded, setExpanded] = useState(false);
  const isMovement = item.timelineType === "MOVEMENT";
  const hasAttachments = item.attachments && item.attachments.length > 0;

  return (
    <>
      <tr className={`hover:bg-gray-50/60 transition-all group ${isMovement ? "bg-slate-50/40" : ""}`}>
        <td className="p-4 font-semibold text-blue-600 truncate max-w-[200px]">
          {isMovement ? `🔄 ${item.movedByUsername}` : item.sender}
        </td>
        <td className="p-4 text-xs text-gray-400 font-medium">
          {new Date(item.sortDate).toLocaleString()}
        </td>
        <td className="p-4 text-gray-600 max-w-[350px] truncate font-medium">
          {isMovement ? (
            <span className="text-xs text-slate-500 font-semibold">
              Queue Move: {item.fromQueueName} ➔ {item.toQueueName}
            </span>
          ) : (
            <div className="whitespace-pre-wrap max-h-16 overflow-hidden line-clamp-2">
              {hasAttachments && <span className="inline-block mr-1.5 text-xs text-slate-400">📎</span>}
              {item.message || <span className="italic text-gray-300">Empty message body</span>}
            </div>
          )}
        </td>
        <td className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 font-bold text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            View
          </button>
        </td>
      </tr>

      {/* DETAILED COLLAPSIBLE ROW DRAWER */}
      {expanded && (
        <tr className="bg-slate-50/60 border-t border-b border-gray-200/50">
          <td colSpan={4} className="p-5">
            {isMovement ? (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                  <ArrowRightLeft size={16} className="text-blue-500" />
                  <span>Ticket re-routed from <strong>{item.fromQueueName}</strong> to <strong>{item.toQueueName}</strong> by <strong>{item.movedByUsername}</strong></span>
                </div>
                {item.comment && (
                  <div className="text-xs bg-slate-50 text-gray-500 p-2.5 rounded-lg border italic">
                    Comment: "{item.comment}"
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-medium bg-white border border-gray-200 rounded-xl p-4 shadow-inner">
                  {item.message}
                </div>

                {/* ✅ FIXED TIMELINE ROW ATTACHMENT ACTION TRIGGERS */}
                {hasAttachments && (
                  <div className="mt-4 pt-3 border-t border-gray-200/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                      <Paperclip size={12} /> Thread Attachments ({item.attachments.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((file: any) => (
                        <button
                          key={file.id || file.storagePath}
                          onClick={(e) => onDownloadRequest(e, file.storagePath, file.fileName)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all text-gray-700 hover:text-blue-600 text-xs font-semibold shadow-sm text-left"
                        >
                          <Download size={11} className="text-gray-400" />
                          <span className="truncate max-w-[150px] underline">{file.fileName || "View Attachment"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
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
  const isEscalationManager = useMemo(() => roles.includes("ROLE_ESCALATION_MANAGER"), [roles]);

  const isCurrentlyEscalated = ticket.ticketStatus === "ESCALATED" || ticket.isEscalated;

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

  return (
    <div className="mt-8 space-y-6">
      
      {/* 1. ASSIGN CONTROL BLOCK */}
      {(ticket.ticketStatus === "OPEN" ||
        ticket.ticketStatus === "ASSIGNED" ||
        ticket.ticketStatus === "IN_PROGRESS" ||
        ticket.ticketStatus === "RE_OPENED" ||
        ticket.ticketStatus === "ESCALATED") && (
        <div className={`border rounded-xl p-5 shadow-inner transition-all ${isActionDisabled ? "bg-gray-100 border-gray-300 opacity-60" : "bg-gray-50 border-gray-200/70"}`}>
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            Assign Ticket {isActionDisabled && <Lock size={14} className="text-red-500" />}
          </h2>
          <form onSubmit={handleAssignTicket} className="flex items-end gap-4 max-w-2xl">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assign Team Member</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                disabled={isActionDisabled}
                className="w-full border border-gray-300 rounded-xl bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all disabled:bg-gray-200 platform-select"
                required
              >
                <option value="">Select Team Member</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isActionDisabled}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-6 py-2 h-[38px] rounded-xl transition-all shadow-sm text-sm shrink-0"
            >
              Assign Ticket
            </button>
          </form>
        </div>
      )}

      {/* 2. CUSTOMER CONVERSATION THREAD BOX */}
      {(ticket.ticketStatus === "ASSIGNED" || ticket.ticketStatus === "IN_PROGRESS" || ticket.ticketStatus === "RE_OPENED" || ticket.ticketStatus === "ESCALATED") && (
        <div className={`border rounded-xl p-5 shadow-inner transition-all ${isActionDisabled ? "bg-gray-100 border-gray-300 opacity-60" : "bg-gray-50 border-gray-200/70"}`}>
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Send size={16} className="text-blue-600" />
              Reply to Customer Email Thread {isActionDisabled && <Lock size={14} className="text-red-500" />}
            </h2>
          </div>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={isActionDisabled}
            placeholder={isActionDisabled ? "Form locked. Requires Escalation Manager clearance..." : "Provide clarity instructions or details directly..."}
            rows={4}
            className="w-full border border-gray-300 rounded-xl bg-white p-3 text-sm outline-none focus:border-blue-500 transition-all font-medium disabled:bg-gray-200"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSendAgentReply}
              disabled={isActionDisabled || !replyText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm text-xs"
            >
              Dispatch Trail Reply
            </button>
          </div>
        </div>
      )}

      {/* MANUAL OVERRIDE LAUNCH PANEL */}
      {!isCurrentlyEscalated && ticket.ticketStatus !== "RESOLVED" && (
        <div className="bg-red-50/40 border border-red-200 rounded-xl p-5 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" /> Force Manual Queue Escalation
            </h2>
          </div>

          <textarea
            value={escalationNotes}
            onChange={(e) => setEscalationNotes(e.target.value)}
            disabled={submitting}
            placeholder="Provide core governance diagnostic reasons..."
            rows={2}
            className="w-full border border-red-300 rounded-xl bg-white p-3 text-sm outline-none focus:border-red-500 transition-all font-medium text-gray-800"
          />

          <div className="mt-3 flex justify-end">
            <button
              onClick={handleManualEscalation}
              disabled={submitting || !escalationNotes.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-md text-xs"
            >
              Execute Force Escalation
            </button>
          </div>
        </div>
      )}

      {/* 3. RESOLUTION BOX */}
      {(ticket.ticketStatus === "ASSIGNED" || ticket.ticketStatus === "IN_PROGRESS" || ticket.ticketStatus === "RE_OPENED" || ticket.ticketStatus === "ESCALATED") && (
        <div className={`border rounded-xl p-5 shadow-sm transition-all ${
          isCurrentlyEscalated 
            ? isEscalationManager 
              ? "bg-gradient-to-r from-amber-50 to-orange-50 border-orange-300"
              : "bg-gray-100 border-gray-300 opacity-70"
            : "bg-gray-50 border-gray-200"
        }`}>
          <h2 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
            Resolve Ticket 
            {isCurrentlyEscalated && (
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1 ${isEscalationManager ? "bg-green-100 text-green-800 animate-pulse" : "bg-red-100 text-red-800"}`}>
                {isEscalationManager ? "⚠️ Unlocked for Escalation Manager" : "🔒 Locked - Requires Escalation Manager"}
              </span>
            )}
          </h2>
          
          {isCurrentlyEscalated && !isEscalationManager && (
            <p className="text-xs text-red-600/90 font-medium mb-3 flex items-center gap-1">
              <Lock size={12} /> Only an authority possessing the <strong>ROLE_ESCALATION_MANAGER</strong> role can resolve this escalated item.
            </p>
          )}

          <textarea
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            disabled={isActionDisabled}
            placeholder={isActionDisabled ? "Form disabled due to role protection rules..." : "Enter final verification steps and resolution details here..."}
            rows={4}
            className="w-full border border-gray-300 rounded-xl bg-white p-3 text-sm outline-none focus:border-green-500 transition-all disabled:bg-gray-200"
          />
          <button
            onClick={handleCreateResolution}
            disabled={isActionDisabled || !resolutionText.trim()}
            className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-sm text-sm"
          >
            Submit Resolution
          </button>
        </div>
      )}
    </div>
  );
}