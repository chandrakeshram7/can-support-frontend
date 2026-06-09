import { apiFetch } from "./api";

// ✅ ALL CORE SCHEMAS AND MODEL CONTRACTS PRESERVED UNCHANGED
export interface QueueMovement {
  id: number;
  fromQueueName: string;
  toQueueName: string;
  movedByUsername: string;
  comment: string;
  movedAt: string;
}

export interface Attachment {
  id: number;
  fileName: string;
  fileType: string;
  storagePath: string;
  createdAt?: string;
}

export interface TicketConversation {
  id?: number; 
  sender: string;
  message: string;
  createdAt: string;
  direction?: "INBOUND" | "OUTBOUND"; 
  attachments?: Attachment[]; 
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
  attachments?: Attachment[]; 
  queueMovements?: QueueMovement[]; 
}

export const ticketApi = {
  getAll: async () => {
    const response = await apiFetch<{ data: Ticket[] }>("/tickets/all");
    return response.data;
  },

  getTicketsByStatus: async (status: string) => {
    const response = await apiFetch<any>(`/tickets/get_status/${status}`);
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

  archiveTicket: async (ticketNumber: string) => {
    return apiFetch(`/tickets/archive/${ticketNumber}`, { method: "PUT" });
  },

  assign: async (payload: { ticketNumber: string; assignedMemberId: number; projectId: number }) => {
    const response = await apiFetch<any>("/tickets/assign", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response?.data;
  },

  resolve: async (payload: { ticketNumber: string; resolution: string }) => {
    const response = await apiFetch<any>("/tickets/resolve", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return response?.data;
  },

  sendReply: async (payload: { ticketNumber: string; replyMessage: string; attachments: any[] }) => {
    return apiFetch("/tickets/reply", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ FIXED: Safely routes binary strings through apiFetch to support authorization checks inside both Ticket and Chat views
  uploadFileToCloudinary: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiFetch<any>("/attachments/upload", {
      method: "POST",
      body: formData,
    });
    return response?.data ? response.data : response;
  },

  reopen: async (ticketNumber: string) => {
    const response = await apiFetch<any>(`/tickets/reopen/${ticketNumber}`, {
      method: "PUT",
      headers: {}, // Explicit initialization allows apiFetch to inject Bearer tokens securely
    });
    return response?.data || response;
  },
 


  // ✅ FIXED: Route pointing cleanly to your actual master ticket controller endpoint map
  async createTicket(payload: { customerMail: string; subject: string; body: string }) {
    const response = await apiFetch<any>("/tickets/create", { 
      method: "POST",
      body: JSON.stringify(payload),
      headers: {}, // ✅ CRITICAL: Forces apiFetch to map and inject the Bearer Auth token cleanly!
    });
    return response.data || response;
  }
};