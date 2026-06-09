import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ticketApi, Ticket } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const navigate = useNavigate();

  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [resolvedTickets, setResolvedTickets] = useState<Ticket[]>([]);
  const [reopenedTickets, setReopenedTickets] = useState<Ticket[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");

  // ✅ PRESERVED STABLE STATE: Project filter state kept active for logical array safety
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("LATEST");
  const [showArchived, setShowArchived] = useState(false);
  const [archivedTickets, setArchivedTickets] = useState<string[]>([]);

  /* ✅ MODAL FORMS STATE MANAGEMENT CONTEXTS */
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMail, setNewTicketMail] = useState("");
  const [newTicketBody, setNewTicketBody] = useState(""); // ✅ ADDED STATE: Captures Description Text Details

  /* ✅ ACTION HANDLER: Calls the updated backend re-open service pipeline directly */
  const handleReopenTicket = async (ticketNumber: string) => {
    try {
      setLoading(true);
      await ticketApi.reopen(ticketNumber);
      // Automatically refresh dashboard state arrays from database with fresh status fields
      await loadTickets();
    } catch (err) {
      console.error("Dashboard failed to reopen target ticket contract details:", err);
      alert("Could not process reopening sequence. Please inspect server logs.");
    } finally {
      setLoading(false);
    }
  };

  /* ✅ ACTION HANDLER: Saves a new ticket with body context layout details */
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMail.trim()) return;

    try {
      setLoading(true);
      
      // ✅ FIXED: Now dispatches the full 3-property DTO layout parameters up to Spring
      await ticketApi.createTicket({
        customerMail: newTicketMail.trim(),
        subject: newTicketSubject.trim(),
        body: newTicketBody.trim(), // Passes form description details
      });

      setNewTicketSubject("");
      setNewTicketMail("");
      setNewTicketBody(""); // Flush state clear
      setShowCreateTicketModal(false);
      
      // Force reload your application matrix rows instantly
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
      const [open, assigned, resolved, reopened] = await Promise.all([
        ticketApi.getTicketsByStatus("OPEN"),
        ticketApi.getTicketsByStatus("ASSIGNED"),
        ticketApi.getTicketsByStatus("RESOLVED"),
        ticketApi.getTicketsByStatus("RE_OPENED"),
      ]);

      setOpenTickets(open || []);
      setAssignedTickets(assigned || []);
      setResolvedTickets(resolved || []);
      setReopenedTickets(reopened || []);
    } catch (err) {
      console.error(err);
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

  const allTickets = [
    ...openTickets,
    ...assignedTickets,
    ...resolvedTickets,
    ...reopenedTickets,
  ];

  const uniqueUsers = [
    ...new Set(allTickets.map((t) => t.assignedMember?.username).filter(Boolean)),
  ];

  // ✅ PRESERVED STABLE TRACKING: Keeps computing values for backend mapping stability
  const uniqueProjects = [
    ...new Set(allTickets.map((t) => t.project?.projectName).filter(Boolean)),
  ];

  // ✅ PRESERVED STABLE Memo Filters: Logic loop remains exactly identical to yours
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
        return "bg-red-100 text-red-700";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700";
      case "RESOLVED":
        return "bg-green-100 text-green-700";
      case "RE_OPENED":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return <div className="p-10 text-xl">Loading tickets...</div>;
  }

  if (error) {
    return <div className="p-10 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* HEADER WITH CREATION TRIGGER ACTION HUB */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Ticket Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage support tickets efficiently</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateTicketModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 shadow transition-all duration-150 text-sm"
          >
            Open New Ticket
          </button>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className="bg-gray-800 hover:bg-black text-white px-5 py-3 rounded-xl shadow transition-all duration-150 text-sm"
          >
            {showArchived ? "Show Active Tickets" : "Show Archived"}
          </button>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-5">Advanced Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by subject, mail, ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-3"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="RE_OPENED">RE_OPENED</option>
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-3"
          >
            <option value="ALL">All Members</option>
            {uniqueUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-3"
          >
            <option value="LATEST">Latest First</option>
            <option value="OLDEST">Oldest First</option>
          </select>
        </div>
      </div>

      {/* STATS MATRIX COUNTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">Open</h3>
          <p className="text-3xl font-bold text-red-500">{openTickets.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">Assigned</h3>
          <p className="text-3xl font-bold text-blue-500">{assignedTickets.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">Resolved</h3>
          <p className="text-3xl font-bold text-green-500">{resolvedTickets.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">Reopened</h3>
          <p className="text-3xl font-bold text-orange-500">{reopenedTickets.length}</p>
        </div>
      </div>

      {/* TICKETS CONTAINER LIST */}
      <div className="space-y-5">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-gray-500">
            No tickets found
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.ticketNumber}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{ticket.subject}</h2>
                  <p className="text-gray-500 mt-1">{ticket.ticketNumber}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(ticket.ticketStatus)}`}>
                  {ticket.ticketStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 text-gray-700">
                <p><strong>Customer:</strong> {ticket.customerMail}</p>
                <p><strong>Assigned:</strong> {ticket.assignedMember?.username || "Unassigned"}</p>
                <p><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={() =>
                    navigate({
                      to: "/ticket/$ticketNumber",
                      params: { ticketNumber: ticket.ticketNumber },
                    })
                  }
                  className="bg-gray-800 hover:bg-black text-white px-5 py-2 rounded-xl transition-all"
                >
                  View Ticket
                </button>

                {ticket.ticketStatus === "RESOLVED" && (
                  <button
                    onClick={() => handleReopenTicket(ticket.ticketNumber)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl font-medium transition-all shadow-sm"
                  >
                    Reopen Ticket
                  </button>
                )}

                {!archivedTickets.includes(ticket.ticketNumber) ? (
                  <button
                    onClick={() => archiveTicket(ticket.ticketNumber)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded-xl transition-all"
                  >
                    Archive
                  </button>
                ) : (
                  <button
                    onClick={() => unarchiveTicket(ticket.ticketNumber)}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl transition-all"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ✅ OVERLAY CREATE TICKET FORM MODAL (UPDATED WITH BODY FIELD DETAILS) */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl p-6 w-[460px] shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div>
              <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">Open Support Request</h4>
              <p className="text-xs text-gray-400 mt-0.5">Log a manual web ticket entry directly into your database schema channels.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Customer Email</label>
              <input
                type="email"
                value={newTicketMail}
                onChange={(e) => setNewTicketMail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ticket Subject</label>
              <input
                type="text"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                placeholder="Brief summary of the issue..."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* ✅ ADDED FORM CONTROL: Ticket Content Body details mapping string */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Issue Description Details</label>
              <textarea
                value={newTicketBody}
                onChange={(e) => setNewTicketBody(e.target.value)}
                placeholder="Provide a comprehensive breakdown of the problem details..."
                rows={4}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 font-medium resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreateTicketModal(false); setNewTicketSubject(""); setNewTicketMail(""); setNewTicketBody(""); }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                type="submit"
                disabled={loading || !newTicketSubject.trim() || !newTicketMail.trim() || !newTicketBody.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
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