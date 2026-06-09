import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PlusCircle, UserPlus, FolderPlus, Users, Search, Move, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";
import { queueApi } from "../../lib/queue-api";   
import { ticketApi } from "../../lib/ticket-api"; 

export const Route = createFileRoute("/_authenticated/queues")({
  component: QueuesPage,
});

function QueuesPage() {
  const navigate = useNavigate(); // ✅ Hook initialized correctly to redirect users

  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<any>(null);
  const [ticketNumbers, setTicketNumbers] = useState("");
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [moveTicket, setMoveTicket] = useState<any>(null);
  const [moveToQueueId, setMoveToQueueId] = useState<number | "">("");
  const [globalSearch, setGlobalSearch] = useState("");

  const [activeResolutionId, setActiveResolutionId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const [showCreateQueueModal, setShowCreateQueueModal] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueDescription, setNewQueueDescription] = useState("");
  const [selectedMemberToJoinId, setSelectedMemberToJoinId] = useState<number | "">("");

  useEffect(() => {
    async function initializeDashboard() {
      try {
        const ticketsData = await ticketApi.getAll();
        setAllTickets(ticketsData || []);

        const usersData = await ticketApi.getAllUsers();
        setAllUsers(usersData || []);

        const queuesData = await queueApi.getQueueSummaries();
        setQueues(queuesData || []);

        if (queuesData?.length > 0) {
          await loadQueueDashboardWithCache(queuesData[0].queueId, ticketsData || []);
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    }
    initializeDashboard();
  }, []);

  async function loadQueueDashboard(queueId: number) {
    await loadQueueDashboardWithCache(queueId, allTickets);
  }

  async function loadQueueDashboardWithCache(queueId: number, ticketsCache: any[]) {
    try {
      const data = await queueApi.getQueueDashboard(queueId);

      const enrichedTickets = (data?.tickets || []).map((queueTicket: any) => {
        const fullTicket = ticketsCache.find(
          (t: any) =>
            t.ticketNumber === queueTicket.ticketNumber ||
            t.ticketTitle === queueTicket.ticketTitle ||
            t.subject === queueTicket.ticketTitle
        );

        return {
          ...queueTicket,
          ticketId: queueTicket.ticketId || fullTicket?.id || queueTicket.id,
          ticketNumber: queueTicket.ticketNumber || fullTicket?.ticketNumber || "",
          subject: queueTicket.subject || fullTicket?.subject || queueTicket.ticketTitle,
          customerMail: queueTicket.customerMail || fullTicket?.customerMail || "",
          createdBy: queueTicket.createdBy || fullTicket?.assignedMember?.username || "System"
        };
      });

      setSelectedQueue({
        ...data,
        tickets: enrichedTickets,
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function refreshDashboard() {
    try {
      const ticketsData = await ticketApi.getAll();
      setAllTickets(ticketsData || []);

      const queuesData = await queueApi.getQueueSummaries();
      setQueues(queuesData || []);

      if (selectedQueue) {
        await loadQueueDashboardWithCache(selectedQueue.queueId, ticketsData || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  function showError(message: string) {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 3000);
  }

  async function handleCreateQueue(e: React.FormEvent) {
    e.preventDefault();
    if (!newQueueName.trim()) return;

    try {
      setLoading(true);
      const createdQueue = await queueApi.createQueue({
        name: newQueueName.trim(),
        description: newQueueDescription.trim(),
      });

      showSuccess(`Queue "${newQueueName}" created successfully!`);
      setNewQueueName("");
      setNewQueueDescription("");
      setShowCreateQueueModal(false);
      
      const queuesData = await queueApi.getQueueSummaries();
      setQueues(queuesData || []);
      if (createdQueue?.id || createdQueue?.queueId) {
        await loadQueueDashboardWithCache(createdQueue.id || createdQueue.queueId, allTickets);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to build support queue partition. Name may be duplicated.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMemberToQueue() {
    if (!selectedQueue || !selectedMemberToJoinId) return;

    try {
      setLoading(true);
      await queueApi.addMemberToQueue(selectedQueue.queueId, Number(selectedMemberToJoinId));
      
      showSuccess("Team member securely added to this queue workspace context.");
      setSelectedMemberToJoinId("");
      await refreshDashboard();
    } catch (err) {
      console.error(err);
      showError("Could not attach member registry index to database.");
    } finally {
      setLoading(false);
    }
  }

  function handleTicketInput(value: string) {
    setTicketNumbers(value);

    if (!value.trim()) {
      setFilteredTickets([]);
      return;
    }

    const latestValue = value.split(",").pop()?.trim().toLowerCase();
    if (!latestValue) {
      setFilteredTickets([]);
      return;
    }

    const existingQueueTickets = selectedQueue?.tickets?.map((t: any) => t.ticketNumber) || [];

    const matches = allTickets
      .filter((ticket: any) => {
        const searchable = `
        ${ticket.ticketNumber || ""}
        ${ticket.subject || ""}
        ${ticket.ticketTitle || ""}
        ${ticket.customerMail || ""}
        ${ticket.ticketStatus || ""}
        `.toLowerCase();

        return (
          searchable.includes(latestValue) &&
          !existingQueueTickets.includes(ticket.ticketNumber)
        );
      })
      .slice(0, 10);

    setFilteredTickets(matches);
  }

  async function handleBulkAddTickets() {
    if (!selectedQueue) return;

    try {
      setLoading(true);
      const numbers = ticketNumbers.split(",").map((t) => t.trim()).filter(Boolean);

      if (numbers.length === 0) {
        showError("Please enter at least one ticket number.");
        return;
      }

      await queueApi.addTicketsToQueue(selectedQueue.queueId, {
        ticketNumbers: numbers,
      });

      setTicketNumbers("");
      setFilteredTickets([]);
      await refreshDashboard();

      showSuccess("Tickets successfully added to the queue.");
    } catch (err) {
      console.error(err);
      showError("Failed to add tickets. Please check the ticket numbers and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleMoveTicket(ticket: any) {
    setMoveTicket(ticket);
  }

  async function confirmMoveTicket() {
    if (!selectedQueue || !moveTicket || !moveToQueueId) return;

    const targetTicketId = moveTicket.ticketId || moveTicket.id;

    if (!targetTicketId) {
      showError("Unable to process move: Missing unique internal tracking reference.");
      return;
    }

    try {
      await queueApi.moveTicket(Number(targetTicketId), {
        fromQueueId: selectedQueue.queueId,
        toQueueId: Number(moveToQueueId),
        comment: "Relocated via support dashboard queue management workspace panel interface.",
      });

      setMoveTicket(null);
      setMoveToQueueId("");
      
      await refreshDashboard();
      showSuccess("Ticket successfully moved to the destination queue.");
    } catch (err) {
      console.error(err);
      showError("Failed to relocate ticket. Please try again.");
    }
  }

  async function handleAssignTicket(ticket: any) {
    try {
      const ticketNumber = ticket.ticketNumber;
      const assignedMemberId = assignments[ticket.ticketNumber];

      if (!ticketNumber) {
        showError("Ticket information is incomplete.");
        return;
      }

      if (!assignedMemberId) {
        showError("Please select a team member first.");
        return;
      }

      await queueApi.assignTicket(ticketNumber, {
        assignedMemberId,
        projectId: 1,
      });

      await refreshDashboard();
      showSuccess("Ticket successfully assigned.");
    } catch (err) {
      console.error(err);
      showError("Failed to complete ticket assignment.");
    }
  }

  async function submitTicketResolution(ticketNumber: string) {
    if (!resolutionText.trim()) {
      showError("Please enter a resolution note before closing the ticket.");
      return;
    }

    try {
      await ticketApi.resolve({
        ticketNumber: ticketNumber,
        resolution: resolutionText.trim(),
      });

      setActiveResolutionId(null);
      setResolutionText("");
      
      await refreshDashboard();
      showSuccess("Ticket has been marked as resolved.");
    } catch (err) {
      console.error(err);
      showError("Failed to update ticket resolution state.");
    }
  }

  const filteredQueueTickets = useMemo(() => {
    if (!selectedQueue?.tickets) return [];
    if (!globalSearch.trim()) return selectedQueue.tickets;

    const query = globalSearch.toLowerCase().trim();

    return selectedQueue.tickets.filter((ticket: any) => {
      return (
        ticket.ticketNumber?.toLowerCase().includes(query) ||
        ticket.ticketTitle?.toLowerCase().includes(query) ||
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.ticketStatus?.toLowerCase().includes(query) ||
        ticket.assignedTo?.toLowerCase().includes(query) ||
        ticket.createdBy?.toLowerCase().includes(query) ||
        ticket.customerMail?.toLowerCase().includes(query)
      );
    });
  }, [selectedQueue, globalSearch]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      {successMessage && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-700 shadow-sm font-semibold text-sm animate-fade-in">{successMessage}</div>}
      {errorMessage && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 shadow-sm font-semibold text-sm animate-fade-in">{errorMessage}</div>}

      <div className="flex gap-6">
        {/* SIDEBAR PANEL */}
        <div className="w-[300px] shrink-0 space-y-4">
          <button
            onClick={() => setShowCreateQueueModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm shadow-md shadow-blue-100 transition-all duration-150"
          >
            <FolderPlus size={16} />
            Create Support Queue
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sticky top-6">
            <h2 className="text-xl font-bold text-gray-800 px-2 mb-4 tracking-tight">Support Queues</h2>
            <div className="space-y-1">
              {queues?.map((queue) => (
                <button
                  key={queue.queueId}
                  onClick={() => {
                    loadQueueDashboard(queue.queueId);
                    setGlobalSearch(""); 
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-150 font-medium ${
                    selectedQueue?.queueId === queue.queueId
                      ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="text-left truncate mr-2">
                    <div className="text-[15px] font-semibold truncate">{queue.queueName}</div>
                    <div className={`text-xs mt-0.5 ${selectedQueue?.queueId === queue.queueId ? "text-blue-100" : "text-gray-400"}`}>
                      {queue.memberCount} active members
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    selectedQueue?.queueId === queue.queueId ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}>{queue.ticketCount}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CORE WORKSPACE VIEW */}
        <div className="flex-1 min-w-0">
          {!selectedQueue ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 font-medium shadow-sm">
              Please select a queue from the sidebar list.
            </div>
          ) : (
            <>
              {/* MEMBERSHIP PANEL */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                      <Users size={18} className="text-blue-600" />
                      Queue Members Directory
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Currently assigned operators inside this support partition branch profile.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-wrap gap-1.5 max-w-xl">
                    {selectedQueue.members?.length === 0 ? (
                      <span className="text-xs text-gray-400 font-medium italic p-1">No active members attached yet.</span>
                    ) : (
                      selectedQueue.members?.map((member: any) => (
                        <span key={member.userId} className="inline-flex items-center text-xs bg-slate-100 border text-gray-700 font-semibold px-2.5 py-1 rounded-lg">
                          {member.name}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="sm:ml-auto flex items-center gap-2">
                    <select
                      value={selectedMemberToJoinId}
                      onChange={(e) => setSelectedMemberToJoinId(e.target.value)}
                      className="border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select User Profile</option>
                      {allUsers
                        .filter(u => !selectedQueue.members?.some((m: any) => m.userId === u.id))
                        .map(user => (
                          <option key={user.id} value={user.id}>{user.username}</option>
                        ))
                      }
                    </select>
                    <button
                      onClick={() => handleAddMemberToQueue()}
                      disabled={loading || !selectedMemberToJoinId}
                      className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-900 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-sm"
                    >
                      <UserPlus size={14} /> Add Member
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTION ACTIONS HUB */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={ticketNumbers}
                      onChange={(e) => handleTicketInput(e.target.value)}
                      placeholder="Enter ticket numbers separated by commas (e.g. TKT-10, TKT-11)..."
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-[14px] outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                    />

                    {filteredTickets.length > 0 && (
                      <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-full mt-1.5 overflow-hidden max-h-64 overflow-y-auto">
                        {filteredTickets.map((ticket: any) => (
                          <button
                            key={ticket.ticketNumber}
                            type="button"
                            onClick={() => {
                              const existing = ticketNumbers.split(",").map((t) => t.trim()).filter(Boolean);
                              if (existing.length > 0) existing.pop();
                              if (!existing.includes(ticket.ticketNumber)) existing.push(ticket.ticketNumber);
                              setTicketNumbers(existing.join(", ") + (existing.length > 0 ? ", " : ""));
                              setFilteredTickets([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors text-sm font-medium"
                          >
                            <div className="font-bold text-gray-800 text-sm">{ticket.ticketNumber}</div>
                            <div className="text-xs text-gray-400 mt-0.5 truncate">{ticket.subject || ticket.ticketTitle}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleBulkAddTickets}
                    disabled={loading || !ticketNumbers.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm text-sm shrink-0"
                  >
                    Add to Queue
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search current queue by title, ID code, customer email, or status badge..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* INTERACTIVE DATA GRID TABLE */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{selectedQueue.queueName} Overview</h3>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Showing {filteredQueueTickets.length} active items</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="p-4 pl-6">Ticket Details</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Assigned Owner</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 text-sm font-medium">
                      {filteredQueueTickets.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400 font-semibold bg-white">No tickets found matching your filter criteria.</td>
                        </tr>
                      ) : (
                        filteredQueueTickets.map((ticket: any) => {
                          const isResolvingThis = activeResolutionId === ticket.ticketNumber;

                          return (
                            <tr key={ticket.ticketId || ticket.ticketNumber} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-4 pl-6 max-w-[340px]">
                                {/* ✅ FIXED: Wrapped heading content strings in interactive navigation elements */}
                                <button
                                  type="button"
                                  onClick={() => navigate({
                                    to: "/ticket/$ticketNumber",
                                    params: { ticketNumber: ticket.ticketNumber }
                                  })}
                                  className="group block text-left outline-none"
                                >
                                  <div className="font-bold text-gray-900 text-[14px] group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                    <span className="truncate">{ticket.ticketTitle || ticket.subject}</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                                  </div>
                                </button>
                                <div className="flex gap-2 items-center mt-1 text-[12px] font-bold text-gray-400">
                                  <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">ID</span>
                                  {ticket.ticketNumber || "Unassigned"}
                                </div>
                                {ticket.customerMail && <div className="text-[12px] text-gray-400 truncate mt-0.5">{ticket.customerMail}</div>}
                              </td>

                              <td className="p-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wide uppercase ${
                                  ticket.ticketStatus === "OPEN"
                                    ? "bg-amber-50 border border-amber-200 text-amber-700"
                                    : ticket.ticketStatus === "ASSIGNED"
                                      ? "bg-blue-50 border border-blue-200 text-blue-700"
                                      : ticket.ticketStatus === "RESOLVED"
                                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                        : "bg-gray-50 border border-gray-200 text-gray-600"
                                }`}>{ticket.ticketStatus}</span>
                              </td>

                              <td className="p-4">
                                {ticket.assignedTo || ticket.ticketStatus === "RESOLVED" ? (
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${ticket.ticketStatus === "RESOLVED" ? "bg-emerald-500" : "bg-blue-500"}`} />
                                    <div className="font-bold text-gray-700 text-[13px]">{ticket.assignedTo || "Resolved"}</div>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 items-center">
                                    <select
                                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold text-gray-700 focus:border-blue-500 focus:outline-none"
                                      value={assignments[ticket.ticketNumber] || ""}
                                      onChange={(e) => setAssignments((prev) => ({ ...prev, [ticket.ticketNumber]: Number(e.target.value) }))}
                                    >
                                      <option value="">Select Member</option>
                                      {selectedQueue?.members?.map((member: any) => (
                                        <option key={member.userId} value={member.userId}>{member.name}</option>
                                      ))}
                                    </select>

                                    {(ticket.ticketStatus === "OPEN" || ticket.ticketStatus === "REOPEN" || ticket.ticketStatus === "RE_OPENED") && (
                                      <button
                                        onClick={() => handleAssignTicket(ticket)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                                      >Assign</button>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="p-4 pr-6 align-middle text-right">
                                <div className="flex flex-col gap-2 items-end">
                                  <div className="inline-flex gap-1.5">
                                    <button
                                      onClick={() => handleMoveTicket(ticket)}
                                      className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                                    >Move</button>

                                    {ticket.ticketStatus === "ASSIGNED" && !isResolvingThis && (
                                      <button
                                        onClick={() => {
                                          setActiveResolutionId(ticket.ticketNumber);
                                          setResolutionText("");
                                        }}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                                      >Resolve</button>
                                    )}
                                  </div>

                                  {isResolvingThis && (
                                    <div className="mt-2 text-left bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-inner w-[280px]">
                                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Enter Closing Details</label>
                                      <textarea
                                        value={resolutionText}
                                        onChange={(e) => setResolutionText(e.target.value)}
                                        placeholder="Provide details on how the issue was solved..."
                                        rows={2}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-purple-500 bg-white font-medium resize-none"
                                      />
                                      <div className="flex justify-end gap-1.5 mt-2">
                                        <button
                                          onClick={() => setActiveResolutionId(null)}
                                          className="px-2.5 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded transition-colors"
                                        >Cancel</button>
                                        <button
                                          onClick={() => submitTicketResolution(ticket.ticketNumber)}
                                          className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded shadow-sm transition-all"
                                        >Submit</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* OVERLAY POPUP TRANSACTION MOVE MODAL */}
      {moveTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[420px] shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-lg font-extrabold text-gray-900 tracking-tight mb-2">Relocate Support Ticket</h4>
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <label className="text-[11px] font-bold uppercase text-gray-400 tracking-wider block">Ticket Subject</label>
              <div className="font-bold text-gray-800 text-sm truncate mt-0.5">{moveTicket.ticketTitle || moveTicket.subject}</div>
              <div className="text-xs text-gray-400 font-bold font-mono mt-0.5">{moveTicket.ticketNumber || "No ID Reference"}</div>
            </div>

            <select
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-5 bg-white focus:outline-none focus:border-blue-500 font-medium"
              value={moveToQueueId}
              onChange={(e) => setMoveToQueueId(Number(e.target.value))}
            >
              <option value="">Select Destination Queue</option>
              {queues.filter((q: any) => q.queueId !== selectedQueue?.queueId).map((q: any) => (
                <option key={q.queueId} value={q.queueId}>{q.queueName}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => { setMoveTicket(null); setMoveToQueueId(""); }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                onClick={confirmMoveTicket}
                disabled={!moveToQueueId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >Confirm Move</button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY CREATE QUEUE FORM MODAL */}
      {showCreateQueueModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleCreateQueue} className="bg-white rounded-2xl p-6 w-[440px] shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div>
              <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">Create Support Queue Partition</h4>
              <p className="text-xs text-gray-400 mt-0.5">Build a new dedicated support category channel bucket layout context.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Queue Target Name</label>
              <input
                type="text"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                placeholder="e.g., L2 Core Infrastructure Backend, QA Queue..."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description Summary</label>
              <textarea
                value={newQueueDescription}
                onChange={(e) => setNewQueueDescription(e.target.value)}
                placeholder="Provide short functional summaries for routing documentation details..."
                rows={3}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 font-medium resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreateQueueModal(false); setNewQueueName(""); setNewQueueDescription(""); }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                type="submit"
                disabled={loading || !newQueueName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {loading ? "Creating..." : "Build Queue Partition"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}