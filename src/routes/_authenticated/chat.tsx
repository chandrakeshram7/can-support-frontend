if (typeof global === "undefined") {
  (window as any).global = window;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react"; 
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Paperclip, FileText, ExternalLink, Search, UserPlus } from "lucide-react";

import { chatApi, ChatMessage } from "@/lib/chat-api";
import { ticketApi } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]); // Full repository from database
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  /* ✅ FILTER & LOOKUP STATES */
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [activeChatIds, setActiveChatIds] = useState<number[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  /* LIVE UNREAD COUNT OBJECT MATRIX STATE */
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  
  /* ATTACHMENT PIPELINE STATES */
  const [uploading, setUploading] = useState(false);
  const [activeAttachmentUrl, setActiveAttachmentUrl] = useState<string | null>(null);
  const [activeAttachmentName, setActiveAttachmentName] = useState<string | null>(null);

  const stompClientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<any>(null); 
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Read Local Token Claims Context & Active Chat Roster Cache
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload.userId || payload.id || payload.sub;
      const parsedId = Number(userId);
      setCurrentUserId(parsedId);

      // Load specific user's active chats from localStorage cache
      const cachedChats = localStorage.getItem(`activeChats_${parsedId}`);
      if (cachedChats) {
        setActiveChatIds(JSON.parse(cachedChats));
      }
    } catch (err) {
      console.error("JWT payload parse mismatch:", err);
    }

    // Close global user search drop menu when clicking away
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync Sidebar Team Roster Listings
  useEffect(() => {
    if (currentUserId) loadUsers();
  }, [currentUserId]);

  async function loadUsers() {
    try {
      const data = await ticketApi.getAllUsers();
      const filtered = data?.filter((u: any) => Number(u.id) !== Number(currentUserId)) || [];
      setAllUsers(filtered);
    } catch (err) {
      console.error("User roster database sync failure:", err);
    }
  }

  /* ✅ ACTION HANDLER: Appends a new colleague to the active sidebar roster mapping matrix */
  const handleAddUserToChats = (user: any) => {
    if (activeChatIds.includes(user.id)) {
      setSelectedUser(user);
      setUserSearchQuery("");
      setShowDropdown(false);
      return;
    }

    const updatedIds = [...activeChatIds, user.id];
    setActiveChatIds(updatedIds);
    if (currentUserId) {
      localStorage.setItem(`activeChats_${currentUserId}`, JSON.stringify(updatedIds));
    }
    setSelectedUser(user);
    setUserSearchQuery("");
    setShowDropdown(false);
  };

  /* ✅ FILTER MATRICES: Computed properties matching the new privacy scoping directives */
  const sidebarVisibleUsers = useMemo(() => {
    return allUsers.filter((u) => activeChatIds.includes(u.id));
  }, [allUsers, activeChatIds]);

  const globalSearchMatches = useMemo(() => {
    if (!userSearchQuery.trim()) return [];
    return allUsers.filter((u) =>
      u.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [allUsers, userSearchQuery]);

  /* Core STOMP over SockJS Connection Lifecycle */
  useEffect(() => {
    if (!currentUserId) return;

    const currentHost = window.location.hostname;
    const isLocal = currentHost === "localhost" || currentHost === "127.0.0.1";
    const socketUrl = isLocal ? `http://${currentHost}:8080/ws` : `https://can-support-backend.onrender.com/ws`;

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl, null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling']
      }),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onWebSocketError: () => setIsConnected(false),
    });

    if (!isLocal) client.debug = () => {};

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      client.deactivate();
    };
  }, [currentUserId]);

  /* Live Subscription Synchronizer - Handles live incoming message alerts */
  useEffect(() => {
    if (!stompClientRef.current || !isConnected || !currentUserId) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    subscriptionRef.current = stompClientRef.current.subscribe(
      `/topic/messages/${currentUserId}`,
      (message) => {
        const received = JSON.parse(message.body);
        const isFromSelected = selectedUser && received.senderId === selectedUser.id;

        // ✅ AUTO-POPULATE: If an unlisted user pings us, automatically reveal them in the sidebar
        if (!activeChatIds.includes(received.senderId)) {
          setActiveChatIds((prev) => {
            const next = [...prev, received.senderId];
            localStorage.setItem(`activeChats_${currentUserId}`, JSON.stringify(next));
            return next;
          });
        }

        if (isFromSelected) {
          setMessages((prev) => {
            const exactDuplicateIndex = prev.findIndex((m: any) => m.id === received.id);
            if (exactDuplicateIndex !== -1) {
              const updated = [...prev];
              updated[exactDuplicateIndex] = received;
              return updated;
            }
            return [...prev, received];
          });
        } else {
          // UPDATE UNREAD BADGE IF ORIGINATOR IS IN BACKGROUND
          setUnreadCounts((prev) => ({
            ...prev,
            [received.senderId]: (prev[received.senderId] || 0) + 1,
          }));
        }
      }
    );

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [selectedUser, isConnected, currentUserId, activeChatIds]);

  /* Pull History Conversations Matrix */
  useEffect(() => {
    if (selectedUser && currentUserId) {
      loadConversation(selectedUser.id);
      // WIPE BADGE AUTOMATICALLY UPON SELECTING ACTIVE CHANNEL TAB VIEW
      setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
    }
  }, [selectedUser, currentUserId]);

  async function loadConversation(receiverId: number) {
    try {
      const data = await chatApi.getConversation(currentUserId!, receiverId);
      const conversationList = Array.isArray(data) ? data : data?.data || [];
      setMessages(conversationList);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  /* SECURED UPLOADER THROUGH DYNAMIC AP_FETCH PIPELINE MAPPING */
  const handleChatAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      
      const response = await chatApi.uploadFileToCloudinary(file);
      const resolvedPath = response?.storagePath || response?.url || response?.data?.url;
      
      if (resolvedPath) {
        setActiveAttachmentUrl(resolvedPath);
        setActiveAttachmentName(file.name);
      }
    } catch (err) {
      console.error("Attachment delivery crash: ", err);
    } finally {
      setUploading(false);
    }
  };

  /* Publish Transaction Outbound Handler */
  function sendMessage() {
    if ((!messageInput.trim() && !activeAttachmentUrl) || !selectedUser || !currentUserId) return;

    const payload: any = {
      senderId: currentUserId,
      receiverId: selectedUser.id,
      message: messageInput.trim(),
      attachmentUrl: activeAttachmentUrl,
      attachmentName: activeAttachmentName
    };

    stompClientRef.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });

    setMessages((prev) => [...prev, { id: `temp-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }]);
    setMessageInput("");
    setActiveAttachmentUrl(null);
    setActiveAttachmentName(null);
  }

  /* FILTER 24-HOUR MAXIMUM RETENTION AT INTERFACE VIEWPORT */
  const activeValidMessages = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return messages.filter((msg) => {
      if (!msg.createdAt || String(msg.id).startsWith("temp-")) return true;
      return new Date(msg.createdAt).getTime() > oneDayAgo;
    });
  }, [messages]);

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden font-sans">
      {/* SIDEBAR PANEL */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col z-20">
        <div className="p-5 border-b border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Messages</h1>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="font-semibold text-gray-500">{isConnected ? "Live" : "Offline"}</span>
            </div>
          </div>

          {/* ✅ NEW FEATURE UI: Unified Search & Directory Injection Form */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:bg-white transition-all">
              <Search size={16} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                value={userSearchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Search directory to add users..."
                className="w-full bg-transparent text-sm font-medium outline-none text-gray-800"
              />
            </div>

            {/* DIRECTORY SEARCH OVERLAY RESULTS DROPDOWN */}
            {showDropdown && userSearchQuery.trim() !== "" && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 shadow-xl rounded-xl max-h-64 overflow-y-auto overflow-hidden z-50">
                {globalSearchMatches.length === 0 ? (
                  <div className="p-4 text-xs font-semibold text-center text-gray-400 italic">No teammates match your lookup</div>
                ) : (
                  globalSearchMatches.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUserToChats(user)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.username?.charAt(0)}
                        </div>
                        <div className="text-sm font-bold text-gray-800 truncate">{user.username}</div>
                      </div>
                      <UserPlus size={14} className="text-blue-500 shrink-0 ml-2" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE USERS LIST BOX CONTAINER */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {sidebarVisibleUsers.length === 0 ? (
            <div className="p-8 text-center text-xs font-medium text-gray-400 leading-relaxed italic">
              Your message roster is currently empty.<br />Use the lookup bar above to add team members.
            </div>
          ) : (
            sidebarVisibleUsers.map((user) => {
              const count = unreadCounts[user.id] || 0;
              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full px-5 py-4 flex items-center gap-3 transition-all text-left ${
                    selectedUser?.id === user.id ? "bg-blue-50/70" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm uppercase">
                      {user.username?.charAt(0)}
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-extrabold border-2 border-white animate-bounce">
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate ${count > 0 ? "font-extrabold text-black" : "font-semibold text-gray-800"}`}>
                      {user.username}
                    </div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {count > 0 ? "📩 New message received" : "Open conversation thread"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* VIEWPORT AREA */}
      <div className="flex-1 flex flex-col bg-gray-50 relative z-10">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 font-medium">
            Select a team member from the directory list to start communicating.
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold uppercase shrink-0">
                {selectedUser.username?.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-gray-800 text-base">{selectedUser.username}</div>
                <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1">Online</div>
              </div>
            </div>

            {/* MESSAGES BUBBLE SCREEN */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {activeValidMessages.map((msg: any) => {
                const isMine = Number(msg.senderId) === Number(currentUserId);
                const textContent = typeof msg.message === "string" ? msg.message : msg.message?.message || "";

                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[65%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                      isMine ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                    }`}>
                      <div className="break-words font-medium">{textContent}</div>
                      
                      {/* ATTACHMENT ACTION BAR LINK RENDERING */}
                      {msg.attachmentUrl && (
                        <div className="mt-2 pt-2 border-t border-slate-200/20 flex items-center gap-2">
                          <FileText size={16} />
                          <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="underline text-xs font-bold flex items-center gap-0.5">
                            {msg.attachmentName || "View Attachment"} <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                      <div className={`text-[10px] font-medium text-right mt-1 font-sans ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ATTACHMENT BUFFER FOOTER STATUS STRIP */}
            {activeAttachmentName && (
              <div className="bg-blue-50 border-t border-blue-200 px-6 py-2 flex items-center justify-between text-xs font-bold text-blue-700">
                <span>📎 Staged Document: {activeAttachmentName}</span>
                <button onClick={() => { setActiveAttachmentUrl(null); setActiveAttachmentName(null); }} className="text-red-500 hover:underline">Remove</button>
              </div>
            )}

            {/* INTERACTION ACTION PANEL PANEL FOOTER */}
            <div className="bg-white border-t border-gray-200 p-4 flex gap-3 shadow-md items-center">
              <label className={`p-2.5 rounded-xl border border-gray-300 bg-gray-50 text-gray-500 cursor-pointer hover:bg-gray-100 transition-all ${uploading ? "opacity-40 animate-pulse" : ""}`}>
                <Paperclip size={18} />
                <input type="file" disabled={!isConnected || uploading} onChange={handleChatAttachmentUpload} className="hidden" />
              </label>

              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder={uploading ? "Uploading attachment..." : "Write a message..."}
                disabled={!isConnected || uploading}
                className="flex-1 border border-gray-300 rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white"
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || uploading || (!messageInput.trim() && !activeAttachmentUrl)}
                className="bg-blue-600 text-white font-semibold text-sm h-[46px] px-6 rounded-xl hover:bg-blue-700 disabled:bg-gray-100"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}