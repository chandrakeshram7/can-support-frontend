import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queueApi } from "../../lib/queue-api";
import { ticketApi } from "../../lib/ticket-api";

export const Route = createFileRoute("/_authenticated/queues")({
  component: QueuesPage,
});

function QueuesPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<any>(null);

  const [ticketNumbers, setTicketNumbers] = useState("");
  // Track dropdown selections using the unique ticket title string as the dictionary key
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [moveTicket, setMoveTicket] = useState<number | null>(null);
  const [moveToQueueId, setMoveToQueueId] = useState<number | "">("");

  useEffect(() => {
    loadQueues();
    loadAllTickets();
  }, []);

  async function loadAllTickets() {
    try {
      const data = await ticketApi.getAll();
      setAllTickets(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadQueues() {
    try {
      const data = await queueApi.getQueueSummaries();
      setQueues(data || []);

      if (data?.length > 0) {
        loadQueueDashboard(data[0].queueId);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadQueueDashboard(queueId: number) {
    try {
      const data = await queueApi.getQueueDashboard(queueId);
      setSelectedQueue(data);
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

  function handleTicketInput(value: string) {
    setTicketNumbers(value);

    if (!value.trim()) {
      setFilteredTickets([]);
      return;
    }

    const latestValue = value.split(",").pop()?.trim() || "";

    const existingQueueTickets =
      selectedQueue?.tickets?.map((t: any) => t.ticketNumber || t.ticketTitle) || [];

    const matches = allTickets
      .filter(
        (ticket: any) =>
          (ticket.ticketNumber?.toLowerCase().includes(latestValue.toLowerCase()) ||
           ticket.ticketTitle?.toLowerCase().includes(latestValue.toLowerCase())) &&
          !existingQueueTickets.includes(ticket.ticketNumber),
      )
      .slice(0, 10);

    setFilteredTickets(matches);
  }

  async function handleBulkAddTickets() {
    if (!selectedQueue) return;

    try {
      setLoading(true);

      const numbers = ticketNumbers
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (numbers.length === 0) {
        showError("Please enter ticket numbers");
        return;
      }

      await queueApi.addTicketsToQueue(selectedQueue.queueId, {
        ticketNumbers: numbers,
      });

      setTicketNumbers("");
      setFilteredTickets([]);

      await loadQueueDashboard(selectedQueue.queueId);
      await loadQueues();

      showSuccess("Tickets added successfully");
    } catch (err) {
      console.error(err);
      showError("Failed to add tickets");
    } finally {
      setLoading(false);
    }
  }

  function handleMoveTicket(ticketId: number) {
    setMoveTicket(ticketId);
  }

  async function confirmMoveTicket() {
    if (!selectedQueue || !moveTicket || !moveToQueueId) return;

    try {
      await queueApi.moveTicket(moveTicket, {
        fromQueueId: selectedQueue.queueId,
        toQueueId: Number(moveToQueueId),
        comment: "Moved from dashboard",
      });

      await loadQueueDashboard(selectedQueue.queueId);
      await loadQueues();

      showSuccess("Ticket moved successfully");

      setMoveTicket(null);
      setMoveToQueueId("");
    } catch (err) {
      console.error(err);
      showError("Failed to move ticket");
    }
  }

  async function handleAssignTicket(ticket: any) {
    // 1. Direct retrieval if available
    let ticketNumber = ticket?.ticketNumber;

    // 2. ✅ FIXED LOOKUP LAYER: Cross-reference matching using human-readable ticketTitle
    if (!ticketNumber && ticket?.ticketTitle) {
      const matchedGlobalTicket = allTickets.find(
        (t: any) => String(t.ticketTitle || t.subject).trim() === String(ticket.ticketTitle).trim()
      );
      if (matchedGlobalTicket?.ticketNumber) {
        ticketNumber = matchedGlobalTicket.ticketNumber;
      }
    }

    const assignedMemberId = assignments[ticket.ticketTitle];
    const projectId = ticket?.projectId || selectedQueue?.projectId || 1;

    console.log("ASSIGN PAYLOAD CHECK:", {
      ticketTitle: ticket.ticketTitle,
      ticketNumber,
      assignedMemberId,
      projectId,
    });

    if (!ticketNumber) {
      showError("Error: Could not resolve the corresponding TKT tracking code for this title layout.");
      return;
    }

    if (!assignedMemberId) {
      showError("Please select a team member");
      return;
    }

    try {
      await queueApi.assignTicket(ticketNumber, {
        assignedMemberId,
        projectId,
      });

      await loadQueueDashboard(selectedQueue.queueId);
      showSuccess("Ticket assigned successfully");
    } catch (err) {
      console.error(err);
      showError("Failed to assign ticket");
    }
  }

  const unassignedTickets = useMemo(() => {
    return selectedQueue?.tickets?.filter((t: any) => !t.assignedTo) || [];
  }, [selectedQueue]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {successMessage && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 shadow-sm">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4 shadow-sm">{errorMessage}</div>
      )}

      <div className="flex gap-6">
        {/* SIDEBAR */}
        <div className="w-[320px] bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-fit sticky top-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">Support Queues</h2>
          <div className="space-y-3">
            {queues?.map((queue) => (
              <button
                key={queue.queueId}
                onClick={() => loadQueueDashboard(queue.queueId)}
                className={`w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md ${
                  selectedQueue?.queueId === queue.queueId
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-800 text-lg">{queue.queueName}</div>
                  <div className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
                    {queue.ticketCount}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-3">{queue.memberCount} Members</div>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN BODY INTERFACE */}
        <div className="flex-1">
          {!selectedQueue ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              Select a queue
            </div>
          ) : (
            <>
              {/* BULK QUEUE ACTIONS INPUT CARD */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Tickets To Queue</h3>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      value={ticketNumbers}
                      onChange={(e) => handleTicketInput(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3"
                      placeholder="Search Ticket Number"
                    />
                    {filteredTickets.length > 0 && (
                      <div className="absolute z-50 bg-white border rounded-xl w-full mt-2 max-h-60 overflow-y-auto">
                        {filteredTickets.map((t: any) => (
                          <div
                            key={t.ticketId || t.ticketTitle}
                            onClick={() => {
                              setTicketNumbers(t.ticketNumber || t.ticketTitle);
                              setFilteredTickets([]);
                            }}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {t.ticketNumber || "TKT"} - {t.ticketTitle || t.subject}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleBulkAddTickets}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 rounded-xl disabled:bg-gray-400"
                  >
                    {loading ? "Adding..." : "Add Tickets"}
                  </button>
                </div>
              </div>

              {/* DASHBOARD WORK DATA TABLE */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-4">Ticket</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Assign</th>
                      <th className="text-left p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedTickets.map((ticket: any) => {
                      // Lookup tracking id to render under subtitle title column description line
                      const cachedTicket = allTickets.find(
                        (at: any) => String(at.ticketTitle || at.subject).trim() === String(ticket.ticketTitle).trim()
                      );
                      const displayNum = ticket?.ticketNumber || cachedTicket?.ticketNumber;

                      return (
                        <tr key={ticket.ticketTitle} className="border-b">
                          <td className="p-4">
                            <div className="font-medium text-gray-800">{ticket.ticketTitle}</div>
                            {displayNum && (
                              <div className="text-xs text-gray-400 font-mono mt-0.5">
                                {displayNum}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-sm px-2.5 py-1 rounded-md font-semibold bg-gray-100 text-gray-700">
                              {ticket.ticketStatus || "OPEN"}
                            </span>
                          </td>

                          {/* ACTION SELECT CONTROL DROPDOWN */}
                          <td className="p-4">
                            <div className="flex gap-2">
                              <select
                                className="border rounded-lg px-2 py-1 bg-white"
                                value={assignments[ticket.ticketTitle] || ""}
                                onChange={(e) =>
                                  setAssignments((prev) => ({
                                    ...prev,
                                    [ticket.ticketTitle]: Number(e.target.value),
                                  }))
                                }
                              >
                                <option value="">Select Member</option>
                                {selectedQueue?.members?.map((m: any) => (
                                  <option key={m.userId} value={m.userId}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignTicket(ticket)}
                                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                              >
                                Assign
                              </button>
                            </div>
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => handleMoveTicket(ticket.ticketId || 1)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Move
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOVE MODAL */}
      {moveTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-xl w-[400px]">
            <h2 className="text-lg font-bold mb-3">Move Ticket</h2>
            <select
              className="w-full border p-2 mb-3 rounded"
              value={moveToQueueId}
              onChange={(e) => setMoveToQueueId(Number(e.target.value))}
            >
              <option value="">Select Queue</option>
              {queues.map((q: any) => (
                <option key={q.queueId} value={q.queueId}>
                  {q.queueName}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setMoveTicket(null);
                  setMoveToQueueId("");
                }}
                className="border px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button onClick={confirmMoveTicket} className="bg-blue-600 text-white px-3 py-1 rounded">
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}