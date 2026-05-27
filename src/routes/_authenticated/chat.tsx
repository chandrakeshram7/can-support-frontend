if (typeof global === "undefined") {
  (window as any).global = window;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { chatApi, ChatMessage } from "@/lib/chat-api";
import { ticketApi } from "@/lib/ticket-api";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const stompClientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<any>(null); // ✅ TRACKING ACTIVE WEBSOCKET SUBSCRIPTIONS
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Read Local Token Claims Context
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload.userId || payload.id || payload.sub;
      setCurrentUserId(Number(userId));
    } catch (err) {
      console.error("JWT payload parse mismatch:", err);
    }
  }, []);

  // Sync Sidebar Team Roster Listings
  useEffect(() => {
    if (currentUserId) {
      loadUsers();
    }
  }, [currentUserId]);

  async function loadUsers() {
    try {
      const data = await ticketApi.getAllUsers();
      const filtered = data?.filter((u: any) => Number(u.id) !== Number(currentUserId)) || [];
      setUsers(filtered);
    } catch (err) {
      console.error("User roster database sync failure:", err);
    }
  }

  /* Core STOMP over SockJS Connection Lifecycle */
  useEffect(() => {
    if (!currentUserId) return;

    const currentHost = window.location.hostname;
    const client = new Client({
      webSocketFactory: () => new SockJS(`http://${currentHost}:8080/ws`),
      reconnectDelay: 3000, // Faster reconnect intervals for a smoother startup experience
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log("SYSTEM CONNECTION ENGAGED");
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onWebSocketError: () => setIsConnected(false),
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      client.deactivate();
    };
  }, [currentUserId]);

  /* Live Subscription Synchronizer - Fires instantly when selecting a user */
  useEffect(() => {
    if (!stompClientRef.current || !isConnected || !currentUserId || !selectedUser) return;

    // ✅ OPTIMIZATION: Clean up previous active subscriptions before opening a new thread
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    console.log(`Subscribing to dynamic channel target: /topic/messages/${currentUserId}`);
    subscriptionRef.current = stompClientRef.current.subscribe(
      `/topic/messages/${currentUserId}`,
      (message) => {
        const received = JSON.parse(message.body);
        
        // Ensure the incoming live message belongs to the currently active chat tab view
        if (
          (received.senderId === selectedUser.id && received.receiverId === currentUserId) ||
          (received.senderId === currentUserId && received.receiverId === selectedUser.id)
        ) {
          setMessages((prev) => {
            const incomingText = typeof received.message === "string" ? received.message : received.message?.message || "";

            // ✅ OPTIMIZATION: High-speed deduplication checks by matching content and unique temporary text IDs
            const exactDuplicateIndex = prev.findIndex(
              (m: any) =>
                m.id === received.id ||
                (String(m.id).startsWith("temp-") &&
                  m.senderId === received.senderId &&
                  (m.message === incomingText || (typeof m.message === "object" && m.message?.message === incomingText)))
            );

            if (exactDuplicateIndex !== -1) {
              const updated = [...prev];
              updated[exactDuplicateIndex] = received; // Swap out the temporary placeholder for the permanent database record
              return updated;
            }

            return [...prev, received];
          });
        }
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [selectedUser, isConnected, currentUserId]);

  /* Pull History Conversations Matrix via Query Strings Params */
  useEffect(() => {
    if (selectedUser && currentUserId) {
      loadConversation(selectedUser.id);
    }
  }, [selectedUser, currentUserId]);

  async function loadConversation(receiverId: number) {
    try {
      const data = await chatApi.getConversation(currentUserId!, receiverId);
      const conversationList = Array.isArray(data) ? data : data?.data || [];
      setMessages(conversationList);
    } catch (err) {
      console.error("Conversation history loader failure:", err);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); // Switched to auto for instant, non-blocking viewport adjustments
  }, [messages]);

  /* Publish Transaction Outbound Handler with Temporary ID Tagging */
  function sendMessage() {
    if (!messageInput.trim() || !selectedUser || !currentUserId) return;

    if (!stompClientRef.current || !isConnected) {
      console.error("Transmission refused: Connection offline.");
      return;
    }

    const payload: ChatMessage = {
      senderId: currentUserId,
      receiverId: selectedUser.id,
      message: messageInput.trim(),
    };

    stompClientRef.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });

    // Assign a clear temporary local echo placeholder object
    const localEchoInstance: any = {
      id: `temp-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, localEchoInstance]);
    setMessageInput("");
  }

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden font-sans">
      {/* SIDEBAR PANEL */}
      <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Messages</h1>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {/* ✅ USER-FRIENDLY LABEL: Replaced jargon with standard "Connected" status indicators */}
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className={`font-semibold ${isConnected ? "text-emerald-600" : "text-amber-600"}`}>
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50/80 transition-all text-left ${
                selectedUser?.id === user.id ? "bg-blue-50/70" : ""
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm uppercase tracking-wider shrink-0">
                {user.username?.charAt(0) || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-800 text-sm truncate">{user.username}</div>
                <div className="text-xs text-gray-400 font-medium truncate mt-0.5">Open chat conversation</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT DISPLAY SCREEN VIEWPORT */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 font-medium text-base">
            Select a team member from the directory list to start communicating.
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                {selectedUser.username?.charAt(0) || "U"}
              </div>
              <div>
                <div className="font-bold text-gray-800 text-base">{selectedUser.username}</div>
                {/* ✅ USER-FRIENDLY LABEL: Standardized header status badge to plain text */}
                <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </div>
              </div>
            </div>

            {/* MESSAGES VIEWPORT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {messages.map((msg: any) => {
                const isMine = Number(msg.senderId) === Number(currentUserId);

                const textContent = typeof msg.message === "string" 
                  ? msg.message 
                  : msg.message?.message || msg.content || "";

                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[65%] px-4 py-2.5 rounded-2xl shadow-sm text-[14px] leading-relaxed ${
                      isMine ? "bg-blue-600 text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                    }`}>
                      <div className="break-words font-medium">{textContent}</div>
                      <div className={`text-[10px] font-medium text-right mt-1 font-sans ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* LOWER FORM BAR INPUT COMPONENT FOOTER */}
            <div className="bg-white border-t border-gray-200 p-4 flex gap-3 shadow-md">
              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Write a message..."
                disabled={!isConnected}
                className="flex-1 border border-gray-300 rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !messageInput.trim()}
                className="bg-blue-600 text-white font-semibold text-sm px-6 rounded-xl hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-sm shrink-0"
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