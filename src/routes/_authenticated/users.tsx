import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ticketApi, UserDropdown, Ticket } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserDropdown[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadUsersAndMetrics();
  }, []);

  const loadUsersAndMetrics = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [usersData, ticketsData] = await Promise.all([
        ticketApi.getAllUsers(),
        ticketApi.getAll()
      ]);
      
      setUsers(usersData || []);
      setAllTickets(ticketsData || []);
    } catch (err) {
      console.error("Failed to load user management metrics:", err);
      setError("Failed to synchronize support team resource listings.");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserExpand = (userId: number) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Pre-computes highly indexed workload nodes combining users with their active tickets
  const corporateUserWorkloadMatrix = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];

    return users.map((user) => {
      // Find all tickets belonging to this engineer
      const assignedTickets = allTickets.filter(
        (t) => t.assignedMember?.username?.toLowerCase() === user.username?.toLowerCase()
      );

      // Extract metadata features natively from the first mapped ticket instance if present
      const firstTicketWithUser = assignedTickets.find(
        (t) => t.assignedMember?.username?.toLowerCase() === user.username?.toLowerCase()
      );

      const activeTickets = assignedTickets.filter((t) => t.ticketStatus === "ASSIGNED");
      const resolvedTickets = assignedTickets.filter((t) => t.ticketStatus === "RESOLVED");
      const openOrReopenedTickets = assignedTickets.filter(
        (t) => t.ticketStatus === "OPEN" || t.ticketStatus === "RE_OPENED" || t.ticketStatus === "RE_OPEN"
      );

      return {
        ...user,
        // ✅ EXTRACTION OF EXTRA SYSTEM METADATA ATTRIBUTES
        role: firstTicketWithUser?.assignedMember?.role || "Support Representative",
        reportingProjectManager: firstTicketWithUser?.project?.manager || "Operations Desk",
        tickets: assignedTickets,
        activeCount: activeTickets.length,
        resolvedCount: resolvedTickets.length,
        backlogCount: openOrReopenedTickets.length,
        totalCount: assignedTickets.length
      };
    });
  }, [users, allTickets]);

  const filteredUserMatrix = useMemo(() => {
    if (!searchQuery.trim()) return corporateUserWorkloadMatrix;
    const query = searchQuery.toLowerCase().trim();

    return corporateUserWorkloadMatrix.filter(
      (u) => u.username?.toLowerCase().includes(query) || String(u.id).includes(query)
    );
  }, [corporateUserWorkloadMatrix, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Syncing personnel accounts database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white border rounded-2xl p-6 max-w-md w-full text-center shadow-sm">
          <p className="text-red-500 font-semibold text-sm">{error}</p>
          <button
            onClick={loadUsersAndMetrics}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 min-h-screen bg-gray-50 p-6 space-y-6">
      {/* HEADER ROW */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Team Directory</h1>
        <p className="text-sm text-gray-500 mt-1">Review human resource allocations, live workload counts, and ticket resolution history logs.</p>
      </div>

      {/* FILTER BAR CONTAINER */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Filter team members by username or direct backend database ID reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-[14px] outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
        />
      </div>

      {/* CORE GRID ROWS CONTAINER LAYOUT */}
      <div className="space-y-4">
        {filteredUserMatrix.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 font-medium shadow-sm">
            No active personnel profiles matched your search parameters.
          </div>
        ) : (
          filteredUserMatrix.map((user) => {
            const isExpanded = expandedUsers[user.id] || false;

            return (
              <div 
                key={user.id} 
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:border-gray-300"
              >
                {/* PRIMARY METRICS SUMMARY HEADER WRAPPER */}
                <div 
                  onClick={() => toggleUserExpand(user.id)}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-gray-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-[280px]">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-sm uppercase tracking-wide shrink-0">
                      {user.username?.slice(0, 2) || "NA"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-bold text-gray-900 truncate">{user.username}</h3>
                        <span className="bg-gray-100 text-gray-600 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">
                          ID: {user.id} {/* ✅ FIXED: Renders the verified backend unique numeric key */}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-medium">
                        <span>{user.role}</span>
                        <span className="text-gray-300">•</span>
                        <span className="truncate">Reports to: {user.reportingProjectManager}</span>
                      </div>
                    </div>
                  </div>

                  {/* QUICK STATS CHIPS BAR */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 lg:gap-6">
                    <div className="text-center px-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Load</span>
                      <span className="text-lg font-extrabold text-blue-600 block mt-0.5">{user.activeCount}</span>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Completed</span>
                      <span className="text-lg font-extrabold text-emerald-600 block mt-0.5">{user.resolvedCount}</span>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-[11px] font-bold tracking-wider text-gray-400 block uppercase">Unassigned Backlog</span>
                      <span className="text-lg font-extrabold text-amber-500 block mt-0.5">{user.backlogCount}</span>
                    </div>

                    <div className="border-l h-8 border-gray-200 hidden lg:block" />

                    <button className="text-xs font-bold text-blue-600 hover:text-blue-700 select-none shrink-0 px-2">
                      {isExpanded ? "Hide Details ▴" : "View Assigned Tickets ▾"}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE ASSIGNED TICKETS MATRIX BLOCK PANEL */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
                      Live Queue Worksheet Allocation Logs ({user.tickets.length})
                    </h4>
                    
                    {user.tickets.length === 0 ? (
                      <p className="text-xs text-gray-400 font-medium italic p-4 bg-white rounded-xl border border-gray-200 border-dashed text-center">
                        This support resource contains zero active ticket tracking allocations across support queues.
                      </p>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                              <tr>
                                <th className="p-3 pl-4">Ticket ID</th>
                                <th className="p-3">Subject Summary</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 pr-4 text-right">Navigation Context</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                              {user.tickets.map((ticket) => (
                                <tr key={ticket.ticketNumber} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="p-3 pl-4 font-mono font-bold text-gray-900 text-[11px]">{ticket.ticketNumber}</td>
                                  <td className="p-3 max-w-[380px] font-semibold text-gray-800 truncate">
                                    {ticket.subject || "Missing Summary Header"}
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                                      ticket.ticketStatus === "RESOLVED"
                                        ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                                        : ticket.ticketStatus === "ASSIGNED"
                                        ? "bg-blue-50 border border-blue-100 text-blue-700"
                                        : "bg-amber-50 border border-amber-100 text-amber-700"
                                    }`}>
                                      {ticket.ticketStatus}
                                    </span>
                                  </td>
                                  <td className="p-3 pr-4 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate({
                                          to: "/ticket/$ticketNumber",
                                          params: { ticketNumber: ticket.ticketNumber }
                                        });
                                      }}
                                      className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-2.5 py-1 rounded-lg text-[11px] shadow-sm transition-all"
                                    >
                                      Open Inspector Sheet
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}