if (typeof global === "undefined") {
  (window as any).global = window;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react"; 
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Paperclip, FileText, ExternalLink, Search, UserPlus, Send, Inbox, Loader2, Wifi, WifiOff } from "lucide-react";

import { chatApi, ChatMessage } from "@/lib/chat-api";
import { ticketApi } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

const getBackendBaseUrl = (): string => {
  const currentHost = window.location.hostname;
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    return "http://localhost:8080";
  }
  return "https://can-support-backend.onrender.com";
};

function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]); 
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  /* STABLE PRESENCE STATE MAP ARRAY */
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

  /* FILTER & LOOKUP STATES */
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
  const statusSubscriptionRef = useRef<any>(null); 
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Read Local Token Claims Context & Active Chat Roster Cache
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const payload = JSON.parse(window.atob(token.split(".")[1]));
      const userId = payload.userId || payload.id || payload.sub;
      const parsedId = Number(userId);
      setCurrentUserId(parsedId);

      const cachedChats = localStorage.getItem(`activeChats_${parsedId}`);
      if (cachedChats) {
        setActiveChatIds(JSON.parse(cachedChats));
      }
    } catch (err) {
      console.error("JWT payload parse mismatch:", err);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync Sidebar Team Roster Listings & Fetch Active States
  useEffect(() => {
    if (currentUserId) {
      loadUsers();
      loadInitialPresenceState(); 
    }
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

  async function loadInitialPresenceState() {
    try {
      const activeIds = await chatApi.getOnlineUsers();
      if (Array.isArray(activeIds)) {
        setOnlineUserIds(activeIds.map(Number));
      } else if (activeIds && Array.isArray(activeIds.data)) {
        setOnlineUserIds(activeIds.data.map(Number));
      }
    } catch (err) {
      console.error("Failed to query initial presence state matrix maps: ", err);
    }
  }

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
      
      connectHeaders: {
        userId: String(currentUserId),
      },

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
      if (statusSubscriptionRef.current) statusSubscriptionRef.current.unsubscribe();
      client.deactivate();
    };
  }, [currentUserId]);

  /* Live Subscription Synchronizer - Message alerts & Presence Tracking */
  useEffect(() => {
    if (!stompClientRef.current || !isConnected || !currentUserId) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    if (statusSubscriptionRef.current) {
      statusSubscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = stompClientRef.current.subscribe(
      `/topic/messages/${currentUserId}`,
      (message) => {
        const received = JSON.parse(message.body);
        const isFromSelected = selectedUser && received.senderId === selectedUser.id;

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
          setUnreadCounts((prev) => ({
            ...prev,
            [received.senderId]: (prev[received.senderId] || 0) + 1,
          }));
        }
      }
    );

    statusSubscriptionRef.current = stompClientRef.current.subscribe(
      `/topic/users/status`,
      (statusMessage) => {
        const presenceEvent = JSON.parse(statusMessage.body); 
        const eventUserId = Number(presenceEvent.userId);

        if (presenceEvent.status === "ONLINE") {
          setOnlineUserIds((prev) => (prev.includes(eventUserId) ? prev : [...prev, eventUserId]));
        } else {
          setOnlineUserIds((prev) => prev.filter((id) => id !== eventUserId));
        }
      }
    );

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      if (statusSubscriptionRef.current) statusSubscriptionRef.current.unsubscribe();
    };
  }, [selectedUser, isConnected, currentUserId, activeChatIds]);

  /* Pull History Conversations Matrix */
  useEffect(() => {
    if (selectedUser && currentUserId) {
      loadConversation(selectedUser.id);
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

  const activeValidMessages = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return messages.filter((msg) => {
      if (!msg.createdAt || String(msg.id).startsWith("temp-")) return true;
      return new Date(msg.createdAt).getTime() > oneDayAgo;
    });
  }, [messages]);

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 flex overflow-hidden font-sans antialiased text-gray-800 rounded-xl border border-gray-200/80 shadow-sm">
      
      {/* LEFT PINNED PANEL: CHAT LIST DIRECTORY */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col z-20 shrink-0">
        
        {/* SIDEBAR HEADER UNIT */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Active Threads</h1>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-md border">
              {isConnected ? (
                <Wifi size={11} className="text-emerald-500 animate-pulse" />
              ) : (
                <WifiOff size={11} className="text-amber-500" />
              )}
              <span className={isConnected ? "text-emerald-600" : "text-amber-600"}>
                {isConnected ? "Live Connection" : "Reconnecting"}
              </span>
            </div>
          </div>

          {/* DENSE AUTOCOMPLETE SYSTEM LOOKUP */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 focus-within:bg-white transition-all h-8">
              <Search size={13} className="text-gray-400 mr-1.5 shrink-0" />
              <input
                type="text"
                value={userSearchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Search team workspace directory..."
                className="w-full bg-transparent text-xs font-semibold outline-none text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* FLOATING DROPDOWN SEARCH INTERCEPTOR */}
            {showDropdown && userSearchQuery.trim() !== "" && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg max-h-48 overflow-y-auto z-50 divide-y divide-gray-50 border-t-2 border-blue-500">
                {globalSearchMatches.length === 0 ? (
                  <div className="p-3 text-[10px] font-bold text-center text-gray-400 uppercase tracking-wide italic">No matches found</div>
                ) : (
                  globalSearchMatches.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUserToChats(user)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-gray-900 text-white flex items-center justify-center font-black text-[10px] uppercase shrink-0">
                          {user.username?.charAt(0)}
                        </div>
                        <div className="text-xs font-bold text-gray-800 truncate capitalize">{user.username}</div>
                      </div>
                      <UserPlus size={12} className="text-blue-500 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* HIGH-DENSITY SIDEBAR ROSTER STREAMS */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 bg-white">
          {sidebarVisibleUsers.length === 0 ? (
            <div className="p-6 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed bg-gray-50/20">
              <Inbox size={16} className="text-gray-300 mx-auto mb-1.5" />
              <span>Roster index is empty</span>
            </div>
          ) : (
            sidebarVisibleUsers.map((user) => {
              const count = unreadCounts[user.id] || 0;
              const isUserOnline = onlineUserIds.includes(Number(user.id));
              const isSelected = selectedUser?.id === user.id;

              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full px-4 py-3 flex items-center gap-2.5 transition-all text-left relative overflow-hidden border-l-2 ${
                    isSelected 
                      ? "bg-blue-50/40 border-blue-600 shadow-inner" 
                      : "border-transparent hover:bg-gray-50/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-xs uppercase shadow-sm">
                      {user.username?.charAt(0)}
                    </div>
                    
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                      isUserOnline ? "bg-emerald-500" : "bg-gray-300"
                    }`} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className={`text-xs truncate ${count > 0 ? "font-black text-black" : "font-bold text-gray-800 capitalize"}`}>
                        {user.username}
                      </div>
                      {count > 0 && (
                        <span className="bg-red-600 text-white text-[9px] font-black h-4 px-1.5 rounded-full flex items-center justify-center shadow-sm">
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                      {count > 0 ? "📩 Unread message" : isUserOnline ? "Active now" : "Offline"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN CANVAS AREA: ACTIVE CONVERSATION SHEET */}
      <div className="flex-1 flex flex-col bg-gray-50 relative z-10">
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 font-bold uppercase tracking-wider text-[10px] gap-1 select-none">
            <Inbox size={22} className="text-gray-300" />
            <span>Select a conversation room thread</span>
          </div>
        ) : (
          <>
            {/* ROOM HEADER CARD CONSOLE */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs uppercase shadow-sm">
                  {selectedUser.username?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-gray-900 text-sm truncate capitalize leading-tight">{selectedUser.username}</div>
                  
                  {onlineUserIds.includes(Number(selectedUser.id)) ? (
                    <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      Active Operations
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      Offline
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MESSAGES DISPLAY GRID CANVAS CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeValidMessages.map((msg: any) => {
                const isMine = Number(msg.senderId) === Number(currentUserId);
                const textContent = typeof msg.message === "string" ? msg.message : msg.message?.message || "";

                return (
                  <div key={msg.id} className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-xl shadow-sm text-xs border relative flex flex-col gap-1 ${
                      isMine 
                        ? "bg-blue-600 border-blue-700 text-white rounded-tr-none text-right items-end" 
                        : "bg-white border-gray-200/60 text-gray-800 rounded-tl-none text-left items-start"
                    }`}>
                      <div className="break-words font-semibold max-w-full leading-relaxed">{textContent}</div>
                      
                      {/* IN-LINE STYLED ATTACHMENT ACTION BAR */}
                      {msg.attachmentUrl && (
                        <div className={`pt-1.5 border-t w-full flex items-center gap-1.5 text-[11px] font-bold ${
                          isMine ? "border-white/10" : "border-gray-100"
                        }`}>
                          <FileText size={13} className={isMine ? "text-blue-200" : "text-gray-400"} />
                          <a 
                            href={msg.attachmentUrl} 
                            download={msg.attachmentName || "download"}
                            className={`underline truncate max-w-[180px] inline-flex items-center gap-0.5 ${
                              isMine ? "text-blue-100 hover:text-white" : "text-blue-600 hover:text-blue-800"
                            }`}
                            onClick={(e) => {
                              if (msg.attachmentUrl.includes('/raw/')) {
                                e.preventDefault();
                                const resolvedName = msg.attachmentName || "document";
                                let targetExtension = "";
                                if (!resolvedName.includes(".")) {
                                  const urlParts = msg.attachmentUrl.split(".");
                                  targetExtension = urlParts.length > 1 ? `.${urlParts.pop()}` : "";
                                }
                                const finalDownloadName = resolvedName.endsWith(targetExtension) 
                                  ? resolvedName 
                                  : `${resolvedName}${targetExtension}`;

                                fetch(msg.attachmentUrl)
                                  .then(res => res.blob())
                                  .then(blob => {
                                    const blobUrl = window.URL.createObjectURL(blob);
                                    const virtualLink = document.createElement('a');
                                    virtualLink.href = blobUrl;
                                    virtualLink.download = finalDownloadName; 
                                    document.body.appendChild(virtualLink);
                                    virtualLink.click();
                                    window.URL.revokeObjectURL(blobUrl);
                                    virtualLink.remove();
                                  })
                                  .catch(err => console.error("Blob download pipeline exception caught:", err));
                              }
                            }}
                          >
                            <span>{msg.attachmentName || "View Document"}</span>
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
                        </div>
                      )}
                      
                      <div className={`text-[9px] font-bold font-sans ${isMine ? "text-blue-200" : "text-gray-400"}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* STAGED ATTACHMENT PIPELINE STRIP */}
            {activeAttachmentName && (
              <div className="bg-blue-50/70 border-t border-blue-200 px-5 py-1.5 flex items-center justify-between text-[11px] font-bold text-blue-700">
                <span className="flex items-center gap-1">📎 Staged File Buffer: <span className="underline font-mono">{activeAttachmentName}</span></span>
                <button onClick={() => { setActiveAttachmentUrl(null); setActiveAttachmentName(null); }} className="text-red-500 hover:text-red-700 uppercase text-[10px] font-black focus:outline-none">Remove</button>
              </div>
            )}

            {/* INTERACTION PANEL FOOTER CONTROLS */}
            <div className="bg-white border-t border-gray-200 p-3 flex gap-2 shadow-inner items-center shrink-0">
              <label className={`p-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-500 cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-all shrink-0 h-9 w-9 flex items-center justify-center shadow-sm ${uploading ? "opacity-40 animate-pulse pointer-events-none" : ""}`}>
                {uploading ? <Loader2 size={15} className="animate-spin text-blue-500" /> : <Paperclip size={15} />}
                <input type="file" disabled={!isConnected || uploading} onChange={handleChatAttachmentUpload} className="hidden" />
              </label>

              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder={uploading ? "Uploading staged binary file stream..." : "Type conversation message thread entries..."}
                disabled={!isConnected || uploading}
                className="flex-1 border border-gray-300 rounded-xl bg-gray-50 px-3.5 py-1.5 text-xs font-semibold outline-none transition-all focus:border-blue-500 focus:bg-white h-9 text-gray-800 placeholder-gray-400 shadow-inner"
              />
              
              <button
                onClick={sendMessage}
                disabled={!isConnected || uploading || (!messageInput.trim() && !activeAttachmentUrl)}
                className="bg-blue-600 text-white font-black text-xs px-4 h-9 rounded-xl hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all flex items-center gap-1 shadow-sm focus:outline-none uppercase tracking-wider shrink-0"
              >
                <span>Send</span>
                <Send size={11} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}