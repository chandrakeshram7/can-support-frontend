import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

import { ticketApi, Ticket, UserDropdown, ProjectDropdown } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/ticket/$ticketNumber")({
  component: TicketDetailsPage,
});

function TicketDetailsPage() {
  const { ticketNumber } = Route.useParams();

  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [loading, setLoading] = useState(true);

  /*
    SUCCESS / ERROR UI MESSAGE
  */
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

  /*
    AUTO HIDE MESSAGE
  */
  useEffect(() => {
    if (uiMessage) {
      const timer = setTimeout(() => {
        setUiMessage(null);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [uiMessage]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!ticket) {
    return <div className="p-6 text-red-500">Ticket not found</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* ===================================================== */}
      {/* TOP UI ALERT */}
      {/* ===================================================== */}

      {uiMessage && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-lg p-4 shadow text-white ${
            uiMessage.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {uiMessage.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}

          <span>{uiMessage.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-6xl mx-auto">
        {/* ===================================================== */}
        {/* HEADER */}
        {/* ===================================================== */}

        <div className="flex justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold">{ticket.subject}</h1>

            <p className="text-gray-500 mt-1">{ticket.ticketNumber}</p>
          </div>

          <span
            className={`px-4 py-2 rounded text-sm font-bold uppercase ${
              ticket.ticketStatus === "OPEN"
                ? "bg-yellow-100 text-yellow-700"
                : ticket.ticketStatus === "ASSIGNED"
                  ? "bg-blue-100 text-blue-700"
                  : ticket.ticketStatus === "RESOLVED"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
            }`}
          >
            {ticket.ticketStatus}
          </span>
        </div>

        {/* ===================================================== */}
        {/* META */}
        {/* ===================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 bg-gray-50 p-5 rounded-lg">
          <div>
            <p className="text-xs uppercase text-gray-500 font-bold">Customer Email</p>

            <p className="mt-1">{ticket.customerMail}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500 font-bold">Assigned Owner</p>

            <p className="mt-1">{ticket.assignedMember?.username || "Unassigned"}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500 font-bold">Project</p>

            <p className="mt-1">{ticket.project?.projectName || "No Project"}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500 font-bold">Created At</p>

            <p className="mt-1">{new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* ===================================================== */}
        {/* ACTIONS */}
        {/* ===================================================== */}

        <TicketActionButtons
          ticket={ticket}
          onActionSuccess={(message, type) => {
            setUiMessage({
              text: message,
              type,
            });

            loadTicket(ticket.ticketNumber);
          }}
        />

        {/* ===================================================== */}
        {/* HISTORY TABLE */}
        {/* ===================================================== */}

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-5">Ticket History</h2>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-4 border-b">Sender</th>

                  <th className="text-left p-4 border-b">Date</th>

                  <th className="text-left p-4 border-b">Preview</th>

                  <th className="text-left p-4 border-b w-[100px]">Action</th>
                </tr>
              </thead>

              <tbody>
                {ticket.conversations?.length ? (
                  ticket.conversations.map((convo, index) => (
                    <HistoryRow key={index} convo={convo} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">
                      No conversation history found
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
/* HISTORY ROW */
/* ========================================================= */

function HistoryRow({ convo }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="p-4 font-medium text-blue-600">{convo.sender}</td>

        <td className="p-4 text-sm text-gray-500">{new Date(convo.createdAt).toLocaleString()}</td>

        <td className="p-4 text-sm text-gray-700">
          {convo.message?.slice(0, 80)}
          ...
        </td>

        <td className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            View
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={4} className="p-5">
            <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
              {convo.message}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ========================================================= */
/* ACTION BUTTONS */
/* ========================================================= */

function TicketActionButtons({
  ticket,
  onActionSuccess,
}: {
  ticket: Ticket;
  onActionSuccess: (message: string, type: "success" | "error") => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const [resolutionText, setResolutionText] = useState("");

  const [memberId, setMemberId] = useState("");

  const [projectId, setProjectId] = useState("");

  const [users, setUsers] = useState<UserDropdown[]>([]);

  const [projects, setProjects] = useState<ProjectDropdown[]>([]);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [usersResponse, projectsResponse] = await Promise.all([
        ticketApi.getAllUsers(),
        ticketApi.getAllProjects(),
      ]);

      setUsers(usersResponse || []);

      setProjects(projectsResponse || []);
    } catch (e) {
      console.error(e);
    }
  };

  /* ===================================================== */
  /* ASSIGN */
  /* ===================================================== */

  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberId || !projectId) {
      return;
    }

    try {
      setSubmitting(true);

      await ticketApi.assign({
        ticketNumber: ticket.ticketNumber,

        assignedMemberId: Number(memberId),

        projectId: Number(projectId),
      });

      onActionSuccess("Ticket assigned successfully", "success");
    } catch (e) {
      console.error(e);

      onActionSuccess("Failed to assign ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===================================================== */
  /* RESOLVE */
  /* ===================================================== */

  const handleResolveTicket = async () => {
    if (!resolutionText.trim()) {
      return;
    }

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

  return (
    <div className="mt-8 space-y-6">
      {/* ===================================================== */}
      {/* ASSIGN SECTION */}
      {/* ===================================================== */}

      {(ticket.ticketStatus === "OPEN" ||
        ticket.ticketStatus === "ASSIGNED" ||
        ticket.ticketStatus === "RE_OPENED") && (
        <div className="bg-gray-50 border rounded-lg p-5">
          <h2 className="text-lg font-bold mb-4">Assign Ticket</h2>

          <form
            onSubmit={handleAssignTicket}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Assign Team Member</label>

              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select Team Member</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select Project</label>

              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select Project</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
            >
              {submitting ? "Assigning..." : "Assign Ticket"}
            </button>
          </form>
        </div>
      )}

      {/* ===================================================== */}
      {/* RESOLUTION */}
      {/* ===================================================== */}

      {ticket.ticketStatus === "ASSIGNED" && (
        <div className="bg-gray-50 border rounded-lg p-5">
          <h2 className="text-lg font-bold mb-4">Resolve Ticket</h2>

          <textarea
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            placeholder="Enter resolution details..."
            rows={4}
            className="w-full border rounded p-3"
          />

          <button
            onClick={handleResolveTicket}
            disabled={submitting}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-medium"
          >
            {submitting ? "Resolving..." : "Submit Resolution"}
          </button>
        </div>
      )}
    </div>
  );
}
