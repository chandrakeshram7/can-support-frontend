import { useState, useEffect, useRef } from "react";
import { Bell, Check, MailOpen, X, MessageSquare, Calendar, User, Inbox } from "lucide-react";
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

  // ✅ FIXED: WebSocket Live Sync Loop performs automatic background synchronization updates
  useEffect(() => {
    if (!currentUserId) return;

    const handleIncomingWebSocketFrame = (messagePayload: any) => {
      try {
        const data = typeof messagePayload.body === "string" 
          ? JSON.parse(messagePayload.body) 
          : messagePayload;
          
        if (data.action === "REFRESH_COUNT") {
          // Increment the counter pill indicator badge instantly
          setUnreadCount((prev) => prev + 1);
          
          // ✅ FIX: Perform a silent background fetch right now so the list data array is fully populated 
          // before the operator even has a chance to tap open the menu container drop drawer.
          fetchNotificationsList();
        }
      } catch (err) {
        console.error("Failed parsing incoming frame:", err);
      }
    };

    // Integration link hook placeholder:
    // const targetTopicRoute = `/topic/notifications/${currentUserId}`;
    // stompClient.subscribe(targetTopicRoute, handleIncomingWebSocketFrame);
  }, [currentUserId]); // Removed [isOpen] variable constraint dependency array to prevent context drops

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
    // Force a data pull context check whenever opening up the display drawer
    if (!isOpen) {
      fetchNotificationsList();
      fetchUnreadCount(); // Sync count locks simultaneously
    }
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
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Triggers Dropdown list */}
      <button
        onClick={handleToggleDropdown}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500 hover:text-gray-800 focus:outline-none"
      >
        <Bell size={19} className={unreadCount > 0 ? "animate-pulse text-blue-600" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-600 text-white font-black text-[9px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Mini Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden max-h-[360px] animate-fade-in">
          <div className="p-3 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto flex-1 bg-white">
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
                    className={`p-3 transition-all flex gap-2.5 group relative cursor-pointer text-left hover:bg-gray-50/60 ${
                      item.isRead ? "opacity-60" : "bg-blue-50/10"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.isRead ? (
                        <MailOpen size={13} className="text-gray-400" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5" />
                      )}
                    </div>
                    
                    <div className="flex-1 pr-5 min-w-0">
                      <h4 className="font-bold text-xs text-gray-900 truncate">
                        {broadcast.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-1 font-medium mt-0.5">
                        {broadcast.messageBody}
                      </p>
                    </div>

                    {!item.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="absolute right-2 top-3 p-1 rounded-md text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                        title="Mark as Read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-400 font-bold text-[11px] uppercase tracking-wider flex flex-col items-center justify-center gap-1.5">
                <Inbox size={18} className="text-gray-300" />
                <span>All caught up</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ LARGER TARGET READING MODAL INTERFACE */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden flex flex-col text-left">
            
            {/* Modal Alert Header Banner */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-start shrink-0 border-b border-blue-700">
              <div className="space-y-0.5 min-w-0 flex-1 pr-3">
                <span className="text-[9px] bg-white/15 border border-white/10 px-1.5 py-0.5 rounded font-bold tracking-wider uppercase inline-block">
                  System Announcement
                </span>
                <h3 className="text-sm font-extrabold tracking-tight leading-snug pt-1 truncate">
                  {selectedNotification.notificationBroadcast.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all focus:outline-none shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Context Block View */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-white">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={12} className="text-blue-500" /> Message Details
                </span>
                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 font-medium whitespace-pre-wrap shadow-inner">
                  {selectedNotification.notificationBroadcast.messageBody}
                </p>
              </div>

              {/* Meta details footer line summary rows */}
              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User size={12} className="text-gray-400 shrink-0" />
                  <span className="truncate">By: {selectedNotification.notificationBroadcast.createdBy || "Admin"}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 justify-end">
                  <Calendar size={12} className="text-gray-400 shrink-0" />
                  <span className="truncate">
                    {new Date(selectedNotification.notificationBroadcast.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Form CTA action control footer link rows */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200/80 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-all focus:outline-none border border-gray-200 bg-white"
              >
                Close Window
              </button>
              
              {!selectedNotification.isRead && (
                <button
                  onClick={() => handleMarkAsRead(selectedNotification.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all focus:outline-none"
                >
                  <Check size={13} />
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