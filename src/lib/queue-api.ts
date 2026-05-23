import { apiFetch } from "./api";

export const queueApi = {

  getQueueSummaries: async () => {
    return apiFetch("/queues/summary");
  },

  getQueueDashboard: async (queueId: number) => {
    return apiFetch(`/queues/${queueId}/dashboard`);
  },

  moveTicket: async (
    ticketId: number,
    payload: {
      fromQueueId: number;
      toQueueId: number;
      comment: string;
    }
  ) => {
    return apiFetch(`/tickets/${ticketId}/move`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  addTicketsToQueue: async (
    queueId: number,
    payload: { ticketNumbers: string[] }
  ) => {
    return apiFetch(`/queues/${queueId}/tickets/add`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ FIXED: Safely forwards the completely filled out structure containing projectId
  assignTicket: async (
    ticketNumber: string,
    payload: {
      assignedMemberId: number;
      projectId: number;
    }
  ) => {
    return apiFetch("/tickets/assign", {
      method: "PUT",
      body: JSON.stringify({
        ticketNumber: ticketNumber,
        assignedMemberId: payload.assignedMemberId,
        projectId: payload.projectId,
      }),
    });
  },
};