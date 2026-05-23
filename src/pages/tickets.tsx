import { useEffect, useState } from "react";

import {
  ticketApi,
  type Ticket,
} from "../lib/ticket-api";

export default function TicketsPage() {

  const [openTickets, setOpenTickets] =
    useState<Ticket[]>([]);

  const [assignedTickets, setAssignedTickets] =
    useState<Ticket[]>([]);

  const [resolvedTickets, setResolvedTickets] =
    useState<Ticket[]>([]);

  const [reopenedTickets, setReopenedTickets] =
    useState<Ticket[]>([]);

  const loadTickets = async () => {

    try {

      const [
        open,
        assigned,
        resolved,
        reopened
      ] = await Promise.all([

        ticketApi.getTicketsByStatus(
          "OPEN"
        ),

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

      console.log("OPEN:", open);

      console.log(
        "ASSIGNED:",
        assigned
      );

      console.log(
        "RESOLVED:",
        resolved
      );

      console.log(
        "REOPENED:",
        reopened
      );

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

    } catch (e) {

      console.error(
        "LOAD ERROR:",
        e
      );
    }
  };

  useEffect(() => {

    loadTickets();

  }, []);

  const renderTickets = (
    title: string,
    tickets: Ticket[]
  ) => (

    <div className="mb-10">

      <h2 className="text-3xl font-bold mb-4">
        {title}
      </h2>

      {tickets.length === 0 ? (

        <div className="border rounded-lg p-4 text-gray-500">
          No tickets found
        </div>

      ) : (

        <div className="space-y-4">

          {tickets.map((ticket) => (

            <div
              key={ticket.ticketNumber}
              className="border rounded-xl p-5 shadow-sm bg-white"
            >

              <div className="flex justify-between items-start">

                <div>

                  <h3 className="text-2xl font-bold">
                    {ticket.subject}
                  </h3>

                  <p className="text-gray-500">
                    {ticket.ticketNumber}
                  </p>

                  <p className="mt-3">
                    <span className="font-bold">
                      Customer:
                    </span>{" "}
                    {ticket.customerMail}
                  </p>

                  <p>
                    <span className="font-bold">
                      Status:
                    </span>{" "}
                    {ticket.ticketStatus}
                  </p>

                  <p>
                    <span className="font-bold">
                      Created:
                    </span>{" "}
                    {ticket.createdAt}
                  </p>

                </div>

                <div>

                  <span className="bg-yellow-300 px-4 py-2 rounded">
                    {ticket.ticketStatus}
                  </span>

                </div>

              </div>

              <div className="flex gap-3 mt-5">

                <button
                  onClick={async () => {

                    try {

                      await ticketApi.assign({

                        ticketNumber:
                          ticket.ticketNumber,

                        assignedMemberId: 2,

                        projectId: 1,
                      });

                      await loadTickets();

                    } catch (e) {

                      console.error(
                        "ASSIGN ERROR:",
                        e
                      );
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                >
                  Assign Ticket
                </button>

                <button
                  onClick={async () => {

                    try {

                      await ticketApi.resolve({

                        ticketNumber:
                          ticket.ticketNumber,

                        resolution:
                          "Resolved successfully",
                      });

                      await loadTickets();

                    } catch (e) {

                      console.error(
                        "RESOLVE ERROR:",
                        e
                      );
                    }
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg"
                >
                  Resolve Ticket
                </button>

              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (

    <div className="p-6 bg-gray-100 min-h-screen">

      <h1 className="text-4xl font-bold mb-8">

        Ticket Dashboard

      </h1>

      {renderTickets(
        "Open Tickets",
        openTickets
      )}

      {renderTickets(
        "Assigned Tickets",
        assignedTickets
      )}

      {renderTickets(
        "Re-Opened Tickets",
        reopenedTickets
      )}

      {renderTickets(
        "Resolved Tickets",
        resolvedTickets
      )}

    </div>
  );
}