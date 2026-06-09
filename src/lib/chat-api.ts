import { apiFetch } from "./api";

export interface ChatMessage {
  id?: number;
  senderId: number;
  receiverId: number;
  senderName?: string;
  receiverName?: string;
  message: string;
  createdAt?: string;
  
  // Mapped attachment context signatures for complete chat-file type compliance
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export const chatApi = {
  async getConversation(user1Id: number, user2Id: number) {
    // Shifts from path parameters to clean query strings to satisfy Spring's @RequestParam contract
    const response = await apiFetch<any>(
      `/chat/conversation?senderId=${user1Id}&receiverId=${user2Id}`,
      {
        method: "GET",
      }
    );

    // Dynamic unwrap utility to support layered APIResponse DTO targets safely
    return response.data || response;
  },

  async sendMessage(payload: ChatMessage) {
    const response = await apiFetch<any>("/chat/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data || response;
  },

  // ✅ FIXED & MOVED: Handles binary multi-part uploads cleanly using apiFetch with complete JWT validation protection
  async uploadFileToCloudinary(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiFetch<any>("/attachments/upload", {
      method: "POST",
      body: formData,
      headers: {}, // Explicit initialization ensures apiFetch injects the Bearer token seamlessly
    });

    return response?.data ? response.data : response;
  },

  async getOnlineUsers() {
    const response = await apiFetch<any>("/tickets/online-users", {
      method: "GET"
    });
    return response.data || response;
  }
  
};