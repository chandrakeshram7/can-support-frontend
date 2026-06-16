import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PlusCircle, UserPlus, FolderPlus, Users, Search, Move, CheckCircle, RefreshCw, ExternalLink, Ticket, Filter, Layers } from "lucide-react";
import { queueApi } from "../../lib/queue-api";   
import { ticketApi } from "../../lib/ticket-api"; 

export const Route = createFileRoute("/_authenticated/queues")({
  component: QueuesPage,
});

function QueuesPage() {
  const navigate = useNavigate();

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

  // Visual Messaging Feedback Utility Hooks
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
    <div className="min-h-screen bg-gray-50 p-4 font-sans antialiased text-gray-800">
      {successMessage && <div className="mb-3 rounded-xl bg-green-600 px-4 py-2.5 text-white shadow-md font-bold text-xs animate-fade-in">{successMessage}</div>}
      {errorMessage && <div className="mb-3 rounded-xl bg-red-600 px-4 py-2.5 text-white shadow-md font-bold text-xs animate-fade-in">{errorMessage}</div>}

      <div className="flex gap-4">
        
        {/* LEFT SELECTION COLUMN: CHANNEL SELECTOR PANELS */}
        <div className="w-64 shrink-0 space-y-3">
          <button
            onClick={() => setShowCreateQueueModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs shadow-md transition-all duration-150"
          >
            <FolderPlus size={14} />
            Create Support Queue
          </button>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 sticky top-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2 flex items-center gap-1.5">
              <Layers size={12} className="text-gray-400" /> Active Channels
            </h2>
            <div className="space-y-1.5 mt-1">
              {queues?.map((queue) => {
                const isSelected = selectedQueue?.queueId === queue.queueId;
                return (
                  <button
                    key={queue.queueId}
                    onClick={() => {
                      loadQueueDashboard(queue.queueId);
                      setGlobalSearch(""); 
                    }}
                    className={`w-full flex items-center justify-between rounded-lg p-3 transition-all duration-150 text-left border relative overflow-hidden ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-blue-700 pl-4"
                        : "bg-gray-50/70 text-gray-600 border-gray-200/80 hover:bg-white hover:border-blue-300 hover:text-gray-900 shadow-sm"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-md" />
                    )}
                    
                    <div className="truncate mr-2">
                      <div className={`text-xs font-black truncate ${isSelected ? "text-white" : "text-gray-800"}`}>
                        {queue.queueName}
                      </div>
                      <div className={`text-[10px] font-bold mt-0.5 ${isSelected ? "text-blue-100/90" : "text-gray-400"}`}>
                        {queue.memberCount} assigned operators
                      </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 shadow-sm border ${
                      isSelected 
                        ? "bg-white/10 border-white/20 text-white" 
                        : "bg-white border-gray-200 text-blue-600"
                    }`}>{queue.ticketCount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN APPLICATION REGION CANNES BODY DESK */}
        <div className="flex-1 min-w-0">
          {!selectedQueue ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 font-semibold shadow-sm text-xs">
              Please select a queue from the list to begin monitoring.
            </div>
          ) : (
            <>
              {/* ✅ COMPACT THREE-COLUMN GRID CONTAINER MIXTURE (Responsive Flex Design Pattern) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-3 flex flex-wrap gap-4 items-end justify-between">
                
                {/* Panel Section 1: Active Operators List Display */}
                <div className="flex-1 min-w-[180px] space-y-1.5 border-r border-gray-100 pr-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Users size={12} className="text-blue-500" /> Active Operators ({selectedQueue.members?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-0.5">
                    {selectedQueue.members?.length === 0 ? (
                      <span className="text-[11px] text-gray-400 font-medium italic">Empty workspace</span>
                    ) : (
                      selectedQueue.members?.map((member: any) => (
                        <span key={member.userId} className="text-[10px] bg-gray-100 border text-gray-600 font-bold px-2 py-0.5 rounded-md capitalize">
                          {member.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Panel Section 2: Append Members Controls Dropdown */}
                <div className="flex-1 min-w-[220px] space-y-1.5 lg:border-r lg:border-gray-100 lg:pr-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Provision Operator</label>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedMemberToJoinId}
                      onChange={(e) => setSelectedMemberToJoinId(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-700 bg-white outline-none focus:border-blue-500 h-8"
                    >
                      <option value="">Select User...</option>
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
                      className="inline-flex items-center gap-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-all h-8 shrink-0 shadow-sm"
                    >
                      <UserPlus size={12} /> Add
                    </button>
                  </div>
                </div>

                {/* Panel Section 3: Ingestion Form Controller (Fluid Layout Structure) */}
                <div className="flex-1 min-w-[240px] space-y-1.5 relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ingest Bulk Tickets</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={ticketNumbers}
                      onChange={(e) => handleTicketInput(e.target.value)}
                      placeholder="TKT-10, TKT-11..."
                      className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs outline-none transition-all focus:border-blue-500 focus:bg-white h-8 w-full font-medium"
                    />
                    <button
                      onClick={handleBulkAddTickets}
                      disabled={loading || !ticketNumbers.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1 rounded-lg font-bold text-xs transition-all h-8 shrink-0 shadow-sm"
                    >
                      Ingest
                    </button>
                  </div>

                  {/* ✅ PRECISE DROPDOWN OVERLAY: Aligns perfectly below the viewport grid line boundary */}
                  {filteredTickets.length > 0 && (
                    <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl w-full top-full mt-1 overflow-hidden max-h-48 overflow-y-auto left-0 border-t-2 border-blue-500">
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
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 text-xs font-semibold block transition-colors"
                        >
                          <div className="text-blue-600 font-bold font-mono">{ticket.ticketNumber}</div>
                          <div className="text-[10px] text-gray-400 truncate mt-0.5">{ticket.subject || ticket.ticketTitle}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* DYNAMIC METADATA GRID ENTRY SEARCH CAP */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2 mb-3 flex items-center gap-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Filter grid entries dynamically by metadata parameter rules..."
                  className="w-full text-xs font-medium outline-none bg-transparent placeholder-gray-400"
                />
              </div>

              {/* MAIN COMPACT TICKET INFORMATION DATA TABLE */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-4">Ticket Identifier</th>
                        <th className="py-2.5 px-4 w-28">Status Badge</th>
                        <th className="py-2.5 px-4 w-48">Assigned Target Owner</th>
                        <th className="py-2.5 px-4 pr-5 text-right w-44">Operations</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                      {filteredQueueTickets.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-400 font-semibold bg-white text-xs">No active queue tokens located match current query scope filters.</td>
                        </tr>
                      ) : (
                        filteredQueueTickets.map((ticket: any) => {
                          const isResolvingThis = activeResolutionId === ticket.ticketNumber;

                          return (
                            <tr key={ticket.ticketId || ticket.ticketNumber} className="hover:bg-gray-50/40 transition-colors">
                              
                              <td className="py-2 px-4 max-w-[280px]">
                                <button
                                  type="button"
                                  onClick={() => navigate({
                                    to: "/ticket/$ticketNumber",
                                    params: { ticketNumber: ticket.ticketNumber }
                                  })}
                                  className="group inline-flex items-center gap-1 font-bold text-gray-900 hover:text-blue-600 transition-colors text-xs text-left outline-none"
                                >
                                  <span className="truncate max-w-[220px]">{ticket.ticketTitle || ticket.subject}</span>
                                  <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 text-blue-500 shrink-0 transition-opacity" />
                                </button>
                                <div className="flex gap-2 items-center text-[10px] text-gray-400 font-medium mt-0.5">
                                  <span className="font-mono bg-gray-100 text-gray-500 font-bold px-1 rounded uppercase tracking-wide text-[9px]">REF</span>
                                  <span>{ticket.ticketNumber || "N/A"}</span>
                                  {ticket.customerMail && <span className="truncate max-w-[120px] text-gray-300">| {ticket.customerMail}</span>}
                                </div>
                              </td>

                              <td className="py-2 px-4">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-wide uppercase ${
                                  ticket.ticketStatus === "OPEN"
                                    ? "bg-amber-50 border border-amber-200 text-amber-700"
                                    : ticket.ticketStatus === "ASSIGNED"
                                      ? "bg-blue-50 border border-blue-200 text-blue-700"
                                      : ticket.ticketStatus === "RESOLVED"
                                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                        : "bg-gray-50 border border-gray-200 text-gray-600"
                                }`}>{ticket.ticketStatus}</span>
                              </td>

                              <td className="py-2 px-4">
                                {ticket.assignedTo || ticket.ticketStatus === "RESOLVED" ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${ticket.ticketStatus === "RESOLVED" ? "bg-emerald-500" : "bg-blue-500"}`} />
                                    <span className="font-bold text-gray-700 capitalize">{ticket.assignedTo || "Resolved"}</span>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 items-center">
                                    <select
                                      className="border border-gray-300 rounded-md px-1.5 py-0.5 bg-white text-[11px] font-bold text-gray-600 focus:border-blue-500 outline-none h-7"
                                      value={assignments[ticket.ticketNumber] || ""}
                                      onChange={(e) => setAssignments((prev) => ({ ...prev, [ticket.ticketNumber]: Number(e.target.value) }))}
                                    >
                                      <option value="">Select...</option>
                                      {selectedQueue?.members?.map((member: any) => (
                                        <option key={member.userId} value={member.userId}>{member.name}</option>
                                      ))}
                                    </select>
                                    {(ticket.ticketStatus === "OPEN" || ticket.ticketStatus === "REOPEN" || ticket.ticketStatus === "RE_OPENED") && (
                                      <button
                                        onClick={() => handleAssignTicket(ticket)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded-md text-[10px] shadow-sm transition-colors h-7"
                                      >Assign</button>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="py-2 px-4 pr-5 align-middle text-right">
                                <div className="flex flex-col gap-1 items-end">
                                  <div className="inline-flex gap-1">
                                    <button
                                      onClick={() => handleMoveTicket(ticket)}
                                      className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold px-2 py-1 rounded-md text-[10px] shadow-sm transition-all"
                                    >Move</button>

                                    {ticket.ticketStatus === "ASSIGNED" && !isResolvingThis && (
                                      <button
                                        onClick={() => {
                                          setActiveResolutionId(ticket.ticketNumber);
                                          setResolutionText("");
                                        }}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2 py-1 rounded-md text-[10px] shadow-sm transition-all"
                                      >Resolve</button>
                                    )}
                                  </div>

                                  {isResolvingThis && (
                                    <div className="mt-1.5 text-left bg-white border border-gray-200 rounded-lg p-2 shadow-xl w-60 z-10 relative">
                                      <textarea
                                        value={resolutionText}
                                        onChange={(e) => setResolutionText(e.target.value)}
                                        placeholder="Closing remarks or notes summary..."
                                        rows={2}
                                        className="w-full border border-gray-300 rounded-md p-1.5 text-[11px] focus:outline-none focus:border-purple-500 bg-gray-50 font-medium resize-none leading-tight"
                                      />
                                      <div className="flex justify-end gap-1 mt-1">
                                        <button
                                          onClick={() => setActiveResolutionId(null)}
                                          className="px-2 py-0.5 text-[10px] font-bold text-gray-500 hover:bg-gray-200 rounded transition-colors"
                                        >Cancel</button>
                                        <button
                                          onClick={() => submitTicketResolution(ticket.ticketNumber)}
                                          className="px-2 py-0.5 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded shadow-sm transition-all"
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
          <div className="bg-white rounded-2xl p-5 w-80 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-extrabold text-gray-900 tracking-tight mb-2">Relocate Support Ticket</h4>
            <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
              <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider block">Target Reference</span>
              <div className="font-bold text-gray-800 text-xs truncate mt-0.5">{moveTicket.ticketTitle || moveTicket.subject}</div>
              <div className="text-[10px] text-gray-400 font-bold font-mono mt-0.5">{moveTicket.ticketNumber}</div>
            </div>

            <select
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs mb-4 bg-white outline-none focus:border-blue-500 font-semibold"
              value={moveToQueueId}
              onChange={(e) => setMoveToQueueId(Number(e.target.value))}
            >
              <option value="">Select Destination Queue</option>
              {queues.filter((q: any) => q.queueId !== selectedQueue?.queueId).map((q: any) => (
                <option key={q.queueId} value={q.queueId}>{q.queueName}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setMoveTicket(null); setMoveToQueueId(""); }}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                onClick={confirmMoveTicket}
                disabled={!moveToQueueId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY CREATE QUEUE FORM MODAL */}
      {showCreateQueueModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleCreateQueue} className="bg-white rounded-2xl p-5 w-80 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div>
              <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">Create Support Queue Partition</h4>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Queue Name</label>
              <input
                type="text"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                placeholder="e.g., L2 Infrastructure Backend..."
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={newQueueDescription}
                onChange={(e) => setNewQueueDescription(e.target.value)}
                placeholder="Routing logic metrics descriptors..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 font-medium resize-none leading-tight"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreateQueueModal(false); setNewQueueName(""); setNewQueueDescription(""); }}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                type="submit"
                disabled={loading || !newQueueName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm"
              >
                {loading ? "Creating..." : "Build Queue"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}