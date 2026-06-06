import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ticketApi, Ticket } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const navigate = useNavigate();

  const [openTickets, setOpenTickets] =
    useState<Ticket[]>([]);

  const [assignedTickets, setAssignedTickets] =
    useState<Ticket[]>([]);

  const [resolvedTickets, setResolvedTickets] =
    useState<Ticket[]>([]);

  const [reopenedTickets, setReopenedTickets] =
    useState<Ticket[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [assignedFilter, setAssignedFilter] =
    useState("ALL");

  // ✅ PRESERVED STABLE STATE: Project filter state kept active for logical array safety
  const [projectFilter, setProjectFilter] =
    useState("ALL");

  const [sortOrder, setSortOrder] =
    useState("LATEST");

  const [showArchived, setShowArchived] =
    useState(false);

  const [archivedTickets, setArchivedTickets] =
    useState<string[]>([]);

  useEffect(() => {
    loadTickets();

    const stored =
      localStorage.getItem(
        "archivedTickets"
      );

    if (stored) {
      setArchivedTickets(
        JSON.parse(stored)
      );
    }
  }, []);

  const loadTickets = async () => {
    try {
      const [
        open,
        assigned,
        resolved,
        reopened,
      ] = await Promise.all([
        ticketApi.getTicketsByStatus("OPEN"),

        ticketApi.getTicketsByStatus(
          "ASSIGNED"
        ),

        ticketApi.getTicketsByStatus(
          "RESOLVED"
        ),

        ticketApi.getTicketsByStatus(
          "RE_OPENED"
        ),
      ]);

      setOpenTickets(open || []);

      setAssignedTickets(
        assigned || []
      );

      setResolvedTickets(
        resolved || []
      );

      setReopenedTickets(
        reopened || []
      );
    } catch (err) {
      console.error(err);

      setError(
        "Failed to load tickets"
      );
    } finally {
      setLoading(false);
    }
  };

  const archiveTicket = (
    ticketNumber: string
  ) => {
    const updated = [
      ...archivedTickets,
      ticketNumber,
    ];

    setArchivedTickets(updated);

    localStorage.setItem(
      "archivedTickets",
      JSON.stringify(updated)
    );
  };

  const unarchiveTicket = (
    ticketNumber: string
  ) => {
    const updated =
      archivedTickets.filter(
        (t) => t !== ticketNumber
      );

    setArchivedTickets(updated);

    localStorage.setItem(
      "archivedTickets",
      JSON.stringify(updated)
    );
  };

  const allTickets = [
    ...openTickets,
    ...assignedTickets,
    ...resolvedTickets,
    ...reopenedTickets,
  ];

  const uniqueUsers = [
    ...new Set(
      allTickets
        .map(
          (t) =>
            t.assignedMember
              ?.username
        )
        .filter(Boolean)
    ),
  ];

  // ✅ PRESERVED STABLE TRACKING: Keeps computing values for backend mapping stability
  const uniqueProjects = [
    ...new Set(
      allTickets
        .map(
          (t) =>
            t.project
              ?.projectName
        )
        .filter(Boolean)
    ),
  ];

  // ✅ PRESERVED STABLE Memo Filters: Logic loop remains exactly identical to yours
  const filteredTickets = useMemo(() => {
    return allTickets
      .filter((ticket) => {
        const isArchived =
          archivedTickets.includes(
            ticket.ticketNumber
          );

        if (
          showArchived
            ? !isArchived
            : isArchived
        ) {
          return false;
        }

        const matchesSearch =
          ticket.subject
            ?.toLowerCase()
            .includes(
              searchTerm.toLowerCase()
            ) ||
          ticket.ticketNumber
            ?.toLowerCase()
            .includes(
              searchTerm.toLowerCase()
            ) ||
          ticket.customerMail
            ?.toLowerCase()
            .includes(
              searchTerm.toLowerCase()
            );

        const matchesStatus =
          statusFilter === "ALL" ||
          ticket.ticketStatus ===
            statusFilter;

        const matchesAssigned =
          assignedFilter ===
            "ALL" ||
          ticket.assignedMember
            ?.username ===
            assignedFilter;

        const matchesProject =
          projectFilter ===
            "ALL" ||
          ticket.project
            ?.projectName ===
            projectFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesAssigned &&
          matchesProject
        );
      })
      .sort((a, b) => {
        const aDate =
          new Date(
            a.createdAt
          ).getTime();

        const bDate =
          new Date(
            b.createdAt
          ).getTime();

        return sortOrder ===
          "LATEST"
          ? bDate - aDate
          : aDate - bDate;
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

  const getStatusColor = (
    status: string
  ) => {
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
    return (
      <div className="p-10 text-xl">
        Loading tickets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-8">

        <div>
          <h1 className="text-4xl font-bold text-gray-800">
            Ticket Dashboard
          </h1>

          <p className="text-gray-500 mt-1">
            Manage support tickets
            efficiently
          </p>
        </div>

        <button
          onClick={() =>
            setShowArchived(
              !showArchived
            )
          }
          className="bg-gray-800 hover:bg-black text-white px-5 py-3 rounded-xl shadow transition-all"
        >
          {showArchived
            ? "Show Active Tickets"
            : "Show Archived"}
        </button>
      </div>

      {/* FILTER SECTION */}

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">

        <h2 className="text-2xl font-semibold mb-5">
          Advanced Filters
        </h2>

        {/* ✅ LOOK: Changed from md:grid-cols-5 to md:grid-cols-4 for perfect layout styling balance */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* SEARCH */}

          <input
            type="text"
            placeholder="Search by subject, mail, ticket..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none"
          />

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
            className="border border-gray-300 rounded-xl px-4 py-3"
          >
            <option value="ALL">
              All Status
            </option>

            <option value="OPEN">
              OPEN
            </option>

            <option value="ASSIGNED">
              ASSIGNED
            </option>

            <option value="RESOLVED">
              RESOLVED
            </option>

            <option value="RE_OPENED">
              RE_OPENED
            </option>
          </select>

          {/* ASSIGNED */}

          <select
            value={assignedFilter}
            onChange={(e) =>
              setAssignedFilter(
                e.target.value
              )
            }
            className="border border-gray-300 rounded-xl px-4 py-3"
          >
            <option value="ALL">
              All Members
            </option>

            {uniqueUsers.map(
              (user) => (
                <option
                  key={user}
                  value={user}
                >
                  {user}
                </option>
              )
            )}
          </select>

          {/* PROJECT DROPDOWN ELEMENT REMOVED VISUALLY */}

          {/* SORT */}

          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(
                e.target.value
              )
            }
            className="border border-gray-300 rounded-xl px-4 py-3"
          >
            <option value="LATEST">
              Latest First
            </option>

            <option value="OLDEST">
              Oldest First
            </option>
          </select>
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">

        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">
            Open
          </h3>

          <p className="text-3xl font-bold text-red-500">
            {openTickets.length}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">
            Assigned
          </h3>

          <p className="text-3xl font-bold text-blue-500">
            {
              assignedTickets.length
            }
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">
            Resolved
          </h3>

          <p className="text-3xl font-bold text-green-500">
            {
              resolvedTickets.length
            }
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <h3 className="text-gray-500">
            Reopened
          </h3>

          <p className="text-3xl font-bold text-orange-500">
            {
              reopenedTickets.length
            }
          </p>
        </div>
      </div>

      {/* TICKETS */}

      <div className="space-y-5">

        {filteredTickets.length ===
        0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-gray-500">
            No tickets found
          </div>
        ) : (
          filteredTickets.map(
            (ticket) => (
              <div
                key={
                  ticket.ticketNumber
                }
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all"
              >

                <div className="flex justify-between items-start">

                  <div>

                    <h2 className="text-2xl font-bold text-gray-800">
                      {
                        ticket.subject
                      }
                    </h2>

                    <p className="text-gray-500 mt-1">
                      {
                        ticket.ticketNumber
                      }
                    </p>
                  </div>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                      ticket.ticketStatus
                    )}`}
                  >
                    {
                      ticket.ticketStatus
                    }
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 text-gray-700">

                  <p>
                    <strong>
                      Customer:
                    </strong>{" "}
                    {
                      ticket.customerMail
                    }
                  </p>

                  <p>
                    <strong>
                      Assigned:
                    </strong>{" "}
                    {ticket
                      .assignedMember
                      ?.username ||
                      "Unassigned"}
                  </p>

                  {/* PROJECT LINE REF SUMMARY REMOVED VISUALLY */}

                  <p>
                    <strong>
                      Created:
                    </strong>{" "}
                    {new Date(
                      ticket.createdAt
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">

                  <button
                    onClick={() =>
                      navigate({
                        to: "/ticket/$ticketNumber",
                        params: {
                          ticketNumber:
                            ticket.ticketNumber,
                        },
                      })
                    }
                    className="bg-gray-800 hover:bg-black text-white px-5 py-2 rounded-xl transition-all"
                  >
                    View Ticket
                  </button>

                  {!archivedTickets.includes(
                    ticket.ticketNumber
                  ) ? (
                    <button
                      onClick={() =>
                        archiveTicket(
                          ticket.ticketNumber
                        )
                      }
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded-xl transition-all"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        unarchiveTicket(
                          ticket.ticketNumber
                        )
                      }
                      className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl transition-all"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}