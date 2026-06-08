import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Paperclip, Download, ArrowRightLeft, Send } from "lucide-react";

import { ticketApi, UserDropdown } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/ticket/$ticketNumber")({
  component: TicketDetailsPage,
});

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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{ticket.subject}</h1>
            <p className="text-gray-400 font-semibold text-xs mt-1 uppercase tracking-wider">{ticket.ticketNumber}</p>
          </div>

          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
            ticket.ticketStatus === "OPEN"
              ? "bg-yellow-100 text-yellow-700"
              : ticket.ticketStatus === "ASSIGNED"
                ? "bg-blue-100 text-blue-700"
                : ticket.ticketStatus === "IN_PROGRESS"
                  ? "bg-indigo-100 text-indigo-700" 
                  : ticket.ticketStatus === "RESOLVED"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
          }`}>
            {ticket.ticketStatus}
          </span>
        </div>

        {/* INITIAL ROOT ATTACHMENTS */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <Paperclip size={14} /> Initial Mail Attachments ({ticket.attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((file: any) => (
                <a
                  key={file.id}
                  href={file.storagePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-gray-700 hover:text-blue-600 text-xs font-semibold group shadow-sm text-left"
                >
                  <Download size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <span className="truncate max-w-[220px]">{file.fileName}</span>
                </a>
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

/* ========================================================= */
/* TIMELINE TABLE ROW WITH CONDITIONAL RENDERING */
/* ========================================================= */
function TimelineRow({ item }: { item: any }) {
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
            <>
              {hasAttachments && <span className="inline-block mr-1.5 text-xs text-slate-400">📎</span>}
              {item.message || <span className="italic text-gray-300">Empty message body</span>}
            </>
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

                {hasAttachments && (
                  <div className="mt-4 pt-3 border-t border-gray-200/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                      <Paperclip size={12} /> Email Reply Attachments ({item.attachments.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((file: any) => (
                        <a
                          key={file.id}
                          href={file.storagePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg transition-all text-gray-700 hover:text-blue-600 text-xs font-semibold shadow-sm text-left"
                        >
                          <Download size={11} className="text-gray-400" />
                          <span className="truncate max-w-[150px] underline">{file.fileName}</span>
                        </a>
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

/* ========================================================= */
/* ACTION PANEL COMPONENT SECTION WITH TEXT-ONLY THREAD REPLY */
/* ========================================================= */
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
  const [users, setUsers] = useState<UserDropdown[]>([]);

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
    if (!memberId) return;

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
    if (!resolutionText.trim()) return;

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
    if (!replyText.trim()) return;
    try {
      setSubmitting(true);
      
      // ✅ SUCCESS: Dispatches direct clean string payload structure to the text-only endpoint
      await ticketApi.sendReply({
        ticketNumber: ticket.ticketNumber,
        replyMessage: replyText.trim(),
        attachments: [] // Safely satisfies the backend structure shape signature
      });

      setReplyText("");
      onActionSuccess("Follow-up thread email message logged and dispatched.", "success");
    } catch (err) {
      console.error("Dispatched pipeline trace breakdown details:", err);
      onActionSuccess("Inbound context parameter verification crash on backend routing endpoint.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      {/* ASSIGN SECTION */}
      {(ticket.ticketStatus === "OPEN" ||
        ticket.ticketStatus === "ASSIGNED" ||
        ticket.ticketStatus === "IN_PROGRESS" ||
        ticket.ticketStatus === "RE_OPENED") && (
        <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-5 shadow-inner">
          <h2 className="text-base font-bold text-gray-800 mb-4">Assign Ticket</h2>
          <form onSubmit={handleAssignTicket} className="flex items-end gap-4 max-w-2xl">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assign Team Member</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                disabled={submitting}
                className="w-full border border-gray-300 rounded-xl bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-400"
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
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-6 py-2 h-[38px] rounded-xl transition-all shadow-sm text-sm shrink-0"
            >
              {submitting ? "Assigning..." : "Assign Ticket"}
            </button>
          </form>
        </div>
      )}

      {/* ✅ CLEAN TEXT-ONLY RE-REPLY BOX FOR EMAIL TREES */}
      {(ticket.ticketStatus === "ASSIGNED" || ticket.ticketStatus === "IN_PROGRESS") && (
        <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-5 shadow-inner">
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Send size={16} className="text-blue-600" />
              Reply to Customer Email Thread
            </h2>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Dispatches an outbound message trailing the existing email tree chain. Moves status precisely to <span className="text-indigo-600 font-bold">IN_PROGRESS</span>.
            </p>
          </div>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={submitting}
            placeholder="Provide clarity instructions or details directly to the customer inbox..."
            rows={4}
            className="w-full border border-gray-300 rounded-xl bg-white p-3 text-sm outline-none focus:border-blue-500 transition-all font-medium disabled:bg-gray-50 disabled:text-gray-400"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSendAgentReply}
              disabled={submitting || !replyText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm text-xs shrink-0"
            >
              {submitting ? "Sending..." : "Dispatch Trail Reply"}
            </button>
          </div>
        </div>
      )}

      {/* RESOLUTION SECTION */}
      {(ticket.ticketStatus === "ASSIGNED" || ticket.ticketStatus === "IN_PROGRESS") && (
        <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-5 shadow-inner">
          <h2 className="text-base font-bold text-gray-800 mb-4">Resolve Ticket</h2>
          <textarea
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            disabled={submitting}
            placeholder="Enter resolution details..."
            rows={4}
            className="w-full border border-gray-300 rounded-xl bg-white p-3 text-sm outline-none focus:border-green-500 transition-all disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            onClick={handleCreateResolution}
            disabled={submitting || !resolutionText.trim()}
            className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-sm text-sm"
          >
            {submitting ? "Resolving..." : "Submit Resolution"}
          </button>
        </div>
      )}
    </div>
  );
}