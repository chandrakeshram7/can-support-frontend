import { apiFetch } from "./api"; // ✅ Hook into your core secure fetch utility

export interface NotificationBroadcastPayload {
  title: string;
  body: string;
  userIds: number[];
}

export interface BroadcastDetails {
  id: number;
  title: string;
  messageBody: string;
  createdAt: string;
  createdBy: string;
}

export interface NotificationStateDTO {
  id: number;
  userId: number;
  isRead: boolean;
  readAt: string | null;
  notificationBroadcast: BroadcastDetails;
}

export const notificationsApi = {
  /**
   * Dispatches a system message notice to selected user IDs.
   * POST /notifications/broadcast
   */
  broadcastAdminMessage: async (payload: NotificationBroadcastPayload) => {
    // Uses your clean apiFetch pattern matching your verified createTicket model contract exactly
    const response = await apiFetch<any>("/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {}, // ✅ CRITICAL: Forces apiFetch to map and inject your Bearer Auth token cleanly!
    });
    return response?.data || response;
  },

  /**
   * Fetches the unread message count for the active user.
   * GET /notifications/unread-count/{userId}
   */
  getUnreadCount: async (userId: number) => {
    const response = await apiFetch<any>(`/notifications/unread-count/${userId}`);
    return response?.data || response;
  },

  /**
   * Loads the historical log of notifications mapped to this user.
   * GET /notifications/user/{userId}
   */
  getUserNotifications: async (userId: number) => {
    const response = await apiFetch<NotificationStateDTO[]>(`/notifications/user/${userId}`);
    return response?.data || response;
  },

  /**
   * Commits a read-state status transition for a specific notification state ID.
   * PUT /notifications/{stateId}/read
   */
  markAsRead: async (stateId: number) => {
    const response = await apiFetch<any>(`/notifications/${stateId}/read`, {
      method: "PUT",
      headers: {}, // Forces apiFetch to manage security context interception loops cleanly
    });
    return response?.data || response;
  },
};