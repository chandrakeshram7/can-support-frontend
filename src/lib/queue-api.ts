import { apiFetch } from "./api";

export interface MoveTicketRequest {
  fromQueueId: number;
  toQueueId: number;
  comment: string;
}

export interface CreateQueueRequest {
  name: string;
  description: string;
}

export const queueApi = {
  getQueueSummaries: async () => {
    return apiFetch<any[]>("/queues/summary");
  },

  getQueueDashboard: async (queueId: number) => {
    return apiFetch<any>(`/queues/${queueId}/dashboard`);
  },

  moveTicket: async (ticketId: number, payload: MoveTicketRequest) => {
    return apiFetch(`/tickets/${ticketId}/move`, {
      method: "POST", 
      body: JSON.stringify(payload),
    });
  },

  addTicketsToQueue: async (queueId: number, payload: { ticketNumbers: string[] }) => {
    return apiFetch(`/queues/${queueId}/tickets/add`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

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

  // ✅ NEW: CREATE QUEUE ENDPOINT
  createQueue: async (payload: CreateQueueRequest) => {
    return apiFetch("/queues", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ NEW: ADD MEMBER TO QUEUE ENDPOINT
  addMemberToQueue: async (queueId: number, userId: number) => {
    return apiFetch(`/queues/${queueId}/members/${userId}`, {
      method: "POST",
    });
  },
};