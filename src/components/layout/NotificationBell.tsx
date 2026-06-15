import { useState, useEffect, useRef } from "react";
import { Bell, Check, MailOpen, X, MessageSquare, Calendar, User } from "lucide-react";
import { notificationsApi, NotificationStateDTO } from "@/lib/notifications-api";

export function NotificationBell({ currentUserId }: { currentUserId: number }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationStateDTO[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationStateDTO | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUserId) {
      fetchUnreadCount();
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentUserId]);

  // WebSocket Live Sync Loop
  useEffect(() => {
    if (!currentUserId) return;

    const handleIncomingWebSocketFrame = (messagePayload: any) => {
      try {
        const data = typeof messagePayload.body === "string" ? JSON.parse(messagePayload.body) : messagePayload;
        if (data.action === "REFRESH_COUNT") {
          setUnreadCount((prev) => prev + 1);
          if (isOpen) fetchNotificationsList();
        }
      } catch (err) {
        console.error("Failed parsing incoming frame:", err);
      }
    };

    // Integration link hook placeholder:
    // const targetTopicRoute = `/topic/notifications/${currentUserId}`;
    // stompClient.subscribe(targetTopicRoute, handleIncomingWebSocketFrame);
  }, [currentUserId, isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationsApi.getUnreadCount(currentUserId);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed fetching unread count:", err);
    }
  };

  const fetchNotificationsList = async () => {
    try {
      const data = await notificationsApi.getUserNotifications(currentUserId);
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed fetching notifications:", err);
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) fetchNotificationsList();
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (stateId: number, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Prevents re-opening modal if clicked from inline button
    try {
      await notificationsApi.markAsRead(stateId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === stateId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      // Update active modal reading state dynamically if open
      if (selectedNotification && selectedNotification.id === stateId) {
        setSelectedNotification((prev) => prev ? { ...prev, isRead: true } : null);
      }
    } catch (err) {
      console.error("Failed marking notification as read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Triggers Dropdown list */}
      <button
        onClick={handleToggleDropdown}
        className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-600 focus:outline-none"
      >
        <Bell size={21} className={unreadCount > 0 ? "animate-pulse text-blue-600" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-red-600 text-white font-black text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Mini Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 flex flex-col overflow-hidden max-h-[400px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-900">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-50 overflow-y-auto flex-1">
            {notifications.length > 0 ? (
              notifications.map((item) => {
                const broadcast = item.notificationBroadcast;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedNotification(item);
                      setIsOpen(false); // Close background drawer picker
                    }}
                    className={`p-4 transition-all flex gap-3 group relative cursor-pointer text-left hover:bg-gray-50 ${
                      item.isRead ? "bg-white opacity-60" : "bg-blue-50/20"
                    }`}
                  >
                    <div className="mt-0.5">
                      {item.isRead ? <MailOpen size={15} className="text-gray-400" /> : <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />}
                    </div>
                    <div className="flex-1 pr-6 space-y-0.5">
                      <h4 className="font-bold text-xs text-gray-900 truncate">{broadcast.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1 font-medium">{broadcast.messageBody}</p>
                    </div>
                    {!item.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="absolute right-3 top-4 p-1 rounded-md text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                        title="Mark read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400 font-medium text-xs">No notifications yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ✅ LARGER TARGET READING MODAL INTERFACE */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-scale-up text-left">
            
            {/* Modal Alert Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold tracking-wider uppercase">
                  System Announcement
                </span>
                <h3 className="text-base font-bold leading-snug pt-1">
                  {selectedNotification.notificationBroadcast.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Context Block View */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={13} /> Message Details
                </span>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4 font-medium whitespace-pre-wrap">
                  {selectedNotification.notificationBroadcast.messageBody}
                </p>
              </div>

              {/* Meta details footer line summary rows */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500 font-semibold">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span>Sender: {selectedNotification.notificationBroadcast.createdBy || "Admin Operations Desk"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span>Dispatched: {new Date(selectedNotification.notificationBroadcast.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Form CTA action control footer link rows */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-xl transition-all focus:outline-none"
              >
                Close Window
              </button>
              
              {!selectedNotification.isRead && (
                <button
                  onClick={() => handleMarkAsRead(selectedNotification.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all focus:outline-none"
                >
                  <Check size={14} />
                  <span>Mark as Read</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}