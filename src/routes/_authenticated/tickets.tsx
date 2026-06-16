import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ticketApi, Ticket } from "@/lib/ticket-api";
import { 
  PlusCircle, 
  Archive, 
  Search, 
  ExternalLink, 
  User, 
  Mail, 
  Inbox, 
  Ticket as TicketIcon,
  X,
  AlertTriangle
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const navigate = useNavigate();

  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [resolvedTickets, setResolvedTickets] = useState<Ticket[]>([]);
  const [reopenedTickets, setReopenedTickets] = useState<Ticket[]>([]);
  // ✅ FIXED: State holder added to collect escalated ticket payloads
  const [escalatedTickets, setEscalatedTickets] = useState<Ticket[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");

  const [projectFilter, setProjectFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("LATEST");
  const [showArchived, setShowArchived] = useState(false);
  const [archivedTickets, setArchivedTickets] = useState<string[]>([]);

  /* MODAL FORMS STATE MANAGEMENT CONTEXTS */
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMail, setNewTicketMail] = useState("");
  const [newTicketBody, setNewTicketBody] = useState("");

  const handleReopenTicket = async (ticketNumber: string) => {
    try {
      setLoading(true);
      await ticketApi.reopen(ticketNumber);
      await loadTickets();
    } catch (err) {
      console.error("Dashboard failed to reopen target ticket details:", err);
      alert("Could not process reopening sequence. Please inspect server logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMail.trim()) return;

    try {
      setLoading(true);
      await ticketApi.createTicket({
        customerMail: newTicketMail.trim(),
        subject: newTicketSubject.trim(),
        body: newTicketBody.trim(),
      });

      setNewTicketSubject("");
      setNewTicketMail("");
      setNewTicketBody("");
      setShowCreateTicketModal(false);
      await loadTickets();
    } catch (err) {
      console.error("Failed to inject new ticket data parameters:", err);
      alert("Error logging support ticket request pipeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();

    const stored = localStorage.getItem("archivedTickets");
    if (stored) {
      setArchivedTickets(JSON.parse(stored));
    }
  }, []);

  const loadTickets = async () => {
    try {
      // ✅ FIXED: Added parallel network line fetch for ESCALATED status models
      const [open, assigned, resolved, reopened, escalated] = await Promise.all([
        ticketApi.getTicketsByStatus("OPEN"),
        ticketApi.getTicketsByStatus("ASSIGNED"),
        ticketApi.getTicketsByStatus("RESOLVED"),
        ticketApi.getTicketsByStatus("RE_OPENED"),
        ticketApi.getTicketsByStatus("ESCALATED"),
      ]);

      setOpenTickets(open || []);
      setAssignedTickets(assigned || []);
      setResolvedTickets(resolved || []);
      setReopenedTickets(reopened || []);
      setEscalatedTickets(escalated || []);
    } catch (err) {
      console.error("Failed to sync ticket categories:", err);
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const archiveTicket = (ticketNumber: string) => {
    const updated = [...archivedTickets, ticketNumber];
    setArchivedTickets(updated);
    localStorage.setItem("archivedTickets", JSON.stringify(updated));
  };

  const unarchiveTicket = (ticketNumber: string) => {
    const updated = archivedTickets.filter((t) => t !== ticketNumber);
    setArchivedTickets(updated);
    localStorage.setItem("archivedTickets", JSON.stringify(updated));
  };

  // ✅ FIXED: Embedded escalated array references directly into standard telemetry feed
  const allTickets = [
    ...openTickets,
    ...assignedTickets,
    ...resolvedTickets,
    ...reopenedTickets,
    ...escalatedTickets,
  ];

  const uniqueUsers = [
    ...new Set(allTickets.map((t) => t.assignedMember?.username).filter(Boolean)),
  ];

  const uniqueProjects = [
    ...new Set(allTickets.map((t) => t.project?.projectName).filter(Boolean)),
  ];

  const filteredTickets = useMemo(() => {
    return allTickets
      .filter((ticket) => {
        const isArchived = archivedTickets.includes(ticket.ticketNumber);

        if (showArchived ? !isArchived : isArchived) {
          return false;
        }

        const matchesSearch =
          ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.customerMail?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "ALL" || ticket.ticketStatus === statusFilter;

        const matchesAssigned =
          assignedFilter === "ALL" || ticket.assignedMember?.username === assignedFilter;

        const matchesProject =
          projectFilter === "ALL" || ticket.project?.projectName === projectFilter;

        return matchesSearch && matchesStatus && matchesAssigned && matchesProject;
      })
      .sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return sortOrder === "LATEST" ? bDate - aDate : aDate - bDate;
      });
  }, [
    allTickets,
    archivedTickets,
    showArchived,
    searchTerm,
    statusFilter,
    assignedFilter,
    projectFilter,
    sortOrder,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-red-50 border-red-200 text-red-700";
      case "ASSIGNED":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "RESOLVED":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "RE_OPENED":
        return "bg-amber-50 border-amber-200 text-amber-700";
      case "ESCALATED":
        // ✅ FIXED: Distinct, eye-catching visual indicator theme style for escalations
        return "bg-purple-50 border-purple-200 text-purple-700 font-bold";
      default:
        return "bg-gray-50 border-gray-200 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Syncing ticket index registries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased text-sm font-semibold text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans antialiased text-gray-800 space-y-4">
      
      {/* 1. BRAND HEADER AND TOP ACTIONS HUB */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-200/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm shadow-blue-100">
            <TicketIcon size={18} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Ticket Console</h1>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Triage, scope, and assign manual client case contracts seamlessly.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTicketModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-xs shadow-sm transition-all"
          >
            <PlusCircle size={14} /> Open Ticket
          </button>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              showArchived
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Archive size={14} />
            <span>{showArchived ? "Viewing Archives" : "View Archive Logs"}</span>
          </button>
        </div>
      </div>

      {/* 2. STATS MATRIX COUNTERS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Open Backlog</span>
          <span className="text-xl font-black text-gray-900 mt-0.5 block leading-none">{openTickets.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Assigned Load</span>
          <span className="text-xl font-black text-gray-900 mt-0.5 block leading-none">{assignedTickets.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block flex items-center gap-1">
            Escalated <AlertTriangle size={10} className="text-purple-500" />
          </span>
          <span className="text-xl font-black text-purple-700 mt-0.5 block leading-none">{escalatedTickets.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Resolved Cases</span>
          <span className="text-xl font-black text-gray-900 mt-0.5 block leading-none">{resolvedTickets.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Reopened Issues</span>
          <span className="text-xl font-black text-gray-900 mt-0.5 block leading-none">{reopenedTickets.length}</span>
        </div>
      </div>

      {/* 3. COMPACT FILTERS DESK SECTION */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex flex-wrap gap-3 items-end justify-between">
        
        <div className="flex-1 min-w-[200px] space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Core Keyword Finder</span>
          <input
            type="text"
            placeholder="Search by subject, mail, ticket reference code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs outline-none transition-all focus:border-blue-500 focus:bg-white h-8 font-medium placeholder-gray-400"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center flex-1 sm:flex-initial">
          
          <div className="space-y-1 flex-1 sm:flex-initial min-w-[120px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Gate</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1 bg-white outline-none focus:border-blue-500 h-8 text-xs font-semibold text-gray-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="RE_OPENED">RE_OPENED</option>
            </select>
          </div>

          <div className="space-y-1 flex-1 sm:flex-initial min-w-[130px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff Roster</label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1 bg-white outline-none focus:border-blue-500 h-8 text-xs font-semibold text-gray-600"
            >
              <option value="ALL">All Members</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 flex-1 sm:flex-initial min-w-[120px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chronology</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1 bg-white outline-none focus:border-blue-500 h-8 text-xs font-semibold text-gray-600"
            >
              <option value="LATEST">Latest Arrived</option>
              <option value="OLDEST">Oldest Backlog</option>
            </select>
          </div>

        </div>

      </div>

      {/* 4. HIGH DENSITY DATAGRID WORKSPACE */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-2.5 px-4">Ticket Context & Metadata</th>
                <th className="py-2.5 px-4 w-28">Status Badge</th>
                <th className="py-2.5 px-4 w-56">Stakeholder Properties</th>
                <th className="py-2.5 px-4 pr-5 text-right w-44">Operations Hub</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700 bg-white">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5">
                    <Inbox size={20} className="text-gray-300" />
                    <span>No record items fit your filter parameter rules.</span>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.ticketNumber} className="hover:bg-gray-50/40 transition-colors">
                    
                    <td className="py-2 px-4 max-w-[280px]">
                      <button
                        type="button"
                        onClick={() => navigate({
                          to: "/ticket/$ticketNumber",
                          params: { ticketNumber: ticket.ticketNumber },
                        })}
                        className="group inline-flex items-center gap-1 font-bold text-gray-900 hover:text-blue-600 transition-colors text-xs text-left outline-none"
                      >
                        <span className="truncate max-w-[220px]">{ticket.subject}</span>
                        <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 text-blue-500 shrink-0 transition-opacity" />
                      </button>
                      
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-0.5">
                        <span className="font-mono bg-gray-100 text-gray-500 px-1 rounded uppercase tracking-wide text-[9px]">REF</span>
                        <span>{ticket.ticketNumber}</span>
                      </div>
                    </td>

                    <td className="py-2 px-4">
                      <span className={`inline-block px-2 py-0.5 border rounded text-[9px] font-black tracking-wide uppercase ${getStatusColor(ticket.ticketStatus)}`}>
                        {ticket.ticketStatus}
                      </span>
                    </td>

                    <td className="py-2 px-4 space-y-0.5 max-w-[220px]">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Mail size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate" title={ticket.customerMail}>{ticket.customerMail}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <User size={11} className="text-gray-300 shrink-0" />
                        <span>Owner: <span className="text-gray-600 font-bold capitalize">{ticket.assignedMember?.username || "Unassigned"}</span></span>
                      </div>
                    </td>

                    <td className="py-2 px-4 pr-5 align-middle text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => navigate({
                            to: "/ticket/$ticketNumber",
                            params: { ticketNumber: ticket.ticketNumber },
                          })}
                          className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold px-2 py-1 rounded-md text-[10px] shadow-sm transition-all outline-none"
                        >View</button>

                        {ticket.ticketStatus === "RESOLVED" && (
                          <button
                            onClick={() => handleReopenTicket(ticket.ticketNumber)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded-md text-[10px] shadow-sm transition-all outline-none"
                          >Reopen</button>
                        )}

                        {!archivedTickets.includes(ticket.ticketNumber) ? (
                          <button
                            onClick={() => archiveTicket(ticket.ticketNumber)}
                            className="border border-transparent bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-2 py-1 rounded-md text-[10px] transition-all outline-none"
                          >Archive</button>
                        ) : (
                          <button
                            onClick={() => unarchiveTicket(ticket.ticketNumber)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded-md text-[10px] transition-all shadow-sm outline-none"
                          >Restore</button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. OVERLAY CREATE TICKET FORM MODAL */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl p-5 w-80 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex justify-between items-start border-b border-gray-100 pb-2">
              <div>
                <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">Open Support Request</h4>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Log a manual web ticket entry directly.</p>
              </div>
              <button 
                type="button"
                onClick={() => { setShowCreateTicketModal(false); setNewTicketSubject(""); setNewTicketMail(""); setNewTicketBody(""); }}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors focus:outline-none"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Email</label>
              <input
                type="email"
                value={newTicketMail}
                onChange={(e) => setNewTicketMail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ticket Subject</label>
              <input
                type="text"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                placeholder="Brief summary of the issue..."
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Issue Description Details</label>
              <textarea
                value={newTicketBody}
                onChange={(e) => setNewTicketBody(e.target.value)}
                placeholder="Provide a comprehensive breakdown of the problem details..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 font-medium resize-none leading-tight"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreateTicketModal(false); setNewTicketSubject(""); setNewTicketMail(""); setNewTicketBody(""); }}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                type="submit"
                disabled={loading || !newTicketSubject.trim() || !newTicketMail.trim() || !newTicketBody.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm"
              >
                Log Ticket Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}