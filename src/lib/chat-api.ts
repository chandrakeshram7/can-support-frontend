import { apiFetch } from "./api";

export interface ChatMessage {
  id?: number;
  senderId: number;
  receiverId: number;
  senderName?: string;
  receiverName?: string;
  message: string;
  createdAt?: string;
}

export const chatApi = {
  async getConversation(user1Id: number, user2Id: number) {
    // ✅ FIXED: Shifted from path parameters to clean query strings to satisfy Spring's @RequestParam contract
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
};