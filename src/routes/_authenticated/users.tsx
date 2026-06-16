import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ticketApi, UserDropdown, Ticket } from "@/lib/ticket-api";
import { Users, Search, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

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
      const assignedTickets = allTickets.filter(
        (t) => t.assignedMember?.username?.toLowerCase() === user.username?.toLowerCase()
      );

      const firstTicketWithUser = assignedTickets.find(
        (t) => t.assignedMember?.username?.toLowerCase() === user.username?.toLowerCase()
      );

      const activeTickets = assignedTickets.filter((t) => t.ticketStatus === "ASSIGNED");
      const resolvedTickets = assignedTickets.filter((t) => t.ticketStatus === "RESOLVED");
      const openOrReopenedTickets = assignedTickets.filter(
        (t) => t.ticketStatus === "OPEN" || t.ticketStatus === "RE_OPENED" || t.ticketStatus === "RE_OPEN" || t.ticketStatus === "ESCALATED"
      );

      return {
        ...user,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Syncing personnel accounts database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center font-sans antialiased">
        <div className="bg-white border rounded-xl p-5 max-w-sm w-full text-center shadow-sm border-gray-200">
          <p className="text-red-500 font-bold text-xs uppercase tracking-wider">{error}</p>
          <button
            onClick={loadUsersAndMetrics}
            className="mt-4 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md focus:outline-none"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans antialiased text-gray-800 space-y-4">
      
      {/* 1. BRAND HEADER SECTION */}
      <div className="flex items-center gap-3 border-b border-gray-200/60 pb-3">
        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm shadow-blue-100">
          <Users size={18} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Team Directory</h1>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Review human resource allocations, live workload capacity parameters, and task logs.</p>
        </div>
      </div>

      {/* 2. COMPACT SEARCH FILTER CONTAINER */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm px-3 py-2 flex items-center gap-2">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Filter team members by username or direct backend unique account identifier code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs font-semibold outline-none bg-transparent placeholder-gray-400"
        />
      </div>

      {/* 3. HIGH DENSITY STAFF LIST TIMELINE LAYOUT */}
      <div className="space-y-2.5">
        {filteredUserMatrix.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-gray-400 font-bold uppercase text-[10px] tracking-wider shadow-sm">
            No active personnel profiles matched your search parameters.
          </div>
        ) : (
          filteredUserMatrix.map((user) => {
            const isExpanded = expandedUsers[user.id] || false;

            return (
              <div 
                key={user.id} 
                className={`bg-white rounded-xl border transition-all duration-150 overflow-hidden shadow-sm ${
                  isExpanded ? "border-gray-300" : "border-gray-200/80 hover:border-gray-300"
                }`}
              >
                {/* PRIMARY METRICS SUMMARY ROW COLLAPSIBLE TRIGGER */}
                <div 
                  onClick={() => toggleUserExpand(user.id)}
                  className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-gray-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-[240px]">
                    {/* Compact Circle Initial Avatar Badge */}
                    <div className="w-9 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-xs uppercase tracking-wider shrink-0 select-none">
                      {user.username?.slice(0, 2) || "NA"}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-gray-900 truncate capitalize">{user.username}</h3>
                        <span className="bg-gray-100 border text-gray-500 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide shrink-0">
                          ID: {user.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-semibold truncate">
                        <span className="text-gray-600 font-bold">{user.role}</span>
                        <span className="text-gray-200">|</span>
                        <span className="truncate">Reports: {user.reportingProjectManager}</span>
                      </div>
                    </div>
                  </div>

                  {/* HIGH METRICS DENSITY SUMMARY BLOCK CAPSULES */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 lg:gap-7">
                    <div className="text-center px-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Load</span>
                      <span className="text-sm font-black text-blue-600 block mt-0.5 leading-none">{user.activeCount}</span>
                    </div>

                    <div className="text-center px-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Completed</span>
                      <span className="text-sm font-black text-emerald-600 block mt-0.5 leading-none">{user.resolvedCount}</span>
                    </div>

                    <div className="text-center px-1">
                      <span className="text-[9px] font-bold tracking-wider text-gray-400 block uppercase">Pending Load</span>
                      <span className="text-sm font-black text-amber-500 block mt-0.5 leading-none">{user.backlogCount}</span>
                    </div>

                    <div className="border-l h-5 border-gray-200 hidden lg:block" />

                    <button className="text-[11px] font-black text-blue-600 hover:text-indigo-800 uppercase tracking-wider select-none shrink-0 px-1 inline-flex items-center gap-1.5 transition-colors">
                      <span>{isExpanded ? "Hide Worksheet" : "View Worksheet"}</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE ROW MATRIX SHEETS DRAWER PANEL */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/40 p-4 space-y-2.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 px-1">
                      <Layers size={12} className="text-gray-400" />
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Live Queue Worksheet Allocation Logs ({user.tickets.length})
                      </h4>
                    </div>
                    
                    {user.tickets.length === 0 ? (
                      <p className="text-xs text-gray-400 font-semibold italic p-5 bg-white rounded-xl border border-gray-200 border-dashed text-center shadow-inner">
                        This support resource contains zero active ticket tracking allocations across support queues.
                      </p>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[9px] font-black">
                              <tr>
                                <th className="p-2 pl-4">Ticket ID</th>
                                <th className="p-2">Subject Summary Line</th>
                                <th className="p-2 w-28">Status</th>
                                <th className="p-2 pr-4 text-right w-36">Operations</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                              {user.tickets.map((ticket) => (
                                <tr key={ticket.ticketNumber} className="hover:bg-gray-50/30 transition-colors">
                                  <td className="p-2 pl-4 font-bold text-gray-900 text-[11px] font-mono">{ticket.ticketNumber}</td>
                                  <td className="p-2 max-w-[340px] font-bold text-gray-800 truncate">
                                    {ticket.subject || "Missing Summary Header"}
                                  </td>
                                  <td className="p-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-wide uppercase border ${
                                      ticket.ticketStatus === "RESOLVED"
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                        : ticket.ticketStatus === "ASSIGNED"
                                          ? "bg-blue-50 border-blue-100 text-blue-700"
                                          : ticket.ticketStatus === "ESCALATED"
                                            ? "bg-purple-50 border-purple-200 text-purple-700 font-extrabold"
                                            : "bg-amber-50 border border-amber-100 text-amber-700"
                                    }`}>{ticket.ticketStatus}</span>
                                  </td>
                                  <td className="p-2 pr-4 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate({
                                          to: "/ticket/$ticketNumber",
                                          params: { ticketNumber: ticket.ticketNumber }
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold px-2 py-0.5 h-6 rounded-md text-[10px] shadow-sm transition-all focus:outline-none"
                                    >
                                      <span>Inspect</span>
                                      <ExternalLink size={10} className="text-gray-400" />
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