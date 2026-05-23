import { apiFetch } from "./api";

export interface TicketConversation {
  sender: string;

  message: string;

  createdAt: string;
}

export interface UserDropdown {
  id: number;
  username: string;
}

export interface ProjectDropdown {
  id: number;
  projectName: string;
}

export interface Ticket {
  id: number;

  subject: string;

  ticketNumber: string;

  customerMail: string;

  ticketStatus: string;

  createdAt: string;

  deadline?: string;

  originalMessageId?: string;

  lastMessageId?: string;

  project?: {
    projectName: string;

    manager: string;
  } | null;

  assignedMember?: {
    username: string;

    role: string;
  } | null;

  conversations?: TicketConversation[];
}
export const ticketApi = {
  getAll: async () => {
    const response = await apiFetch<{
      data: Ticket[];
    }>("/tickets/all");

    console.log("ALL RESPONSE:", response);

    return response.data;
  },

  getTicketsByStatus: async (status: string) => {
    console.log("CALLING STATUS API:", status);

    const response = await apiFetch<any>(`/tickets/get_status/${status}`);

    console.log(`${status} RESPONSE:`, response);

    // IMPORTANT
    return response.data;
  },

  getTicketInfo: async (ticketNumber: string) => {
    const response = await apiFetch<any>(`/tickets/get/ticket/${ticketNumber}`);

    return response.data;
  },

  getAllUsers: async (): Promise<UserDropdown[]> => {
    const response = await apiFetch<any>("/users/getAll");

    return response.data;
  },

  getAllProjects: async (): Promise<ProjectDropdown[]> => {
    const response = await apiFetch<any>("/projects/getAll");

    return response.data;
  },

  archiveTicket: async (
  ticketNumber: string
) => {

  return apiFetch(
    `/tickets/archive/${ticketNumber}`,
    {
      method: "PUT",
    }
  );

},

  // FIXED: Added type parameters and returns the unwrapped data payload directly
  assign: async (payload: {
    ticketNumber: string;
    assignedMemberId: number;
    projectId: number;
  }): Promise<Map<string, string>> => {
    const response = await apiFetch<any>("/tickets/assign", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response?.data;
  },

  // FIXED: Added type parameters and returns the unwrapped data payload directly
  resolve: async (payload: {
    ticketNumber: string;
    resolution: string;
  }): Promise<Map<string, string>> => {
    const response = await apiFetch<any>("/tickets/resolve", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response?.data;
  },
};
