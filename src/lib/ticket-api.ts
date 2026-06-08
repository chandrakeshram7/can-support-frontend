import { apiFetch } from "./api";

// ✅ PRESERVED MODEL DEFINITIONS COPIED VERBATIM
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
    return apiFetch(`/tickets/archive/${ticketNumber}`, {
      method: "PUT",
    });
  },

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

  sendReply: async (payload: {
    ticketNumber: string;
    replyMessage: string;
    attachments: any[];
  }): Promise<any> => {
    return apiFetch("/tickets/reply", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ FIXED IMPLEMENTATION: Direct window.fetch bypass to protect multipart stream form-data boundaries from api.ts interception
  // ✅ FIX: Bypasses apiFetch completely to prevent token stripping or header mismatches
  uploadFileToCloudinary: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("accessToken");
    
    // Resolve base url manually matching your api.ts setup
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const BASE_URL = isLocal ? "http://localhost:8080" : "https://can-support-backend.onrender.com";

    // Call window.fetch directly so apiFetch doesn't alter your headers
    const response = await window.fetch(`${BASE_URL}/attachments/upload`, {
      method: "POST",
      body: formData,
      headers: token ? {
        "Authorization": `Bearer ${token}`
        // CRITICAL: DO NOT add "Content-Type" here. 
        // Let the browser set the multi-part boundary string automatically.
      } : {}
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson?.apiError?.message || errorJson?.message || `Upload failed: ${response.status}`);
    }

    const dataPayload = await response.json();
    
    // Return data nested matching your components structural expectations pattern
    return dataPayload?.data ? dataPayload.data : dataPayload;
  }
};