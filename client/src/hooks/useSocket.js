import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import useAuth from "./useAuth";
import { announce } from "../components/LiveAnnouncer";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "")
  || "http://localhost:5000";

const useSocket = () => {
  const { token }                   = useAuth();
  const socketRef                   = useRef(null);
  const typingTimeoutRef            = useRef(null);
  const activeRoomRef               = useRef(null);
  const [connected,   setConnected]   = useState(false);
  const [error,       setError]       = useState(null);
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [members,     setMembers]     = useState([]);
  const [users,      setUsers]      = useState([]);
  const [showDMList, setShowDMList] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Keep ref in sync with state for reconnect access
  const setActiveRoomBoth = useCallback((room) => {
    activeRoomRef.current = room;
    setActiveRoom(room);
  }, []);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth:                { token },
      withCredentials:     true,
      transports:          ["websocket"],
      reconnection:        true,
      reconnectionAttempts: 5,
      reconnectionDelay:   1000,
      reconnectionDelayMax: 5000,
    });

    const socket = socketRef.current;

    // Connection 
    socket.on("connected", () => {
      setConnected(true);
      setError(null);
      socket.emit("room:list", {}, (res) => {
        if (res && res.success) setRooms(res.rooms || []);
      });
    });

    // Reconnection 
    socket.on("connect", () => {
      console.log("✅ Connected / Reconnected");
      setConnected(true);
      setError(null);

      // Reload room list
      socket.emit("room:list", {}, (res) => {
        if (res && res.success) setRooms(res.rooms || []);
      });

      // Rejoin active room if there was one
      const currentRoom = activeRoomRef.current;
      if (currentRoom) {
        socket.emit("room:join", { roomId: currentRoom._id }, (res) => {
          if (res && res.success) {
            socket.emit("message:history", { roomId: currentRoom._id },
              (histRes) => {
                if (histRes && histRes.success) {
                  setMessages(histRes.messages || []);
                  setHasMore(histRes.hasMore || false);
                }
              });

            socket.emit("room:get_members", { roomId: currentRoom._id },
              (membRes) => {
                if (membRes && membRes.success) {
                  setMembers(membRes.members || []);
                }
              });
          }
        });
      }
    });
    

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnecting... attempt ${attempt}`);
      setError(`Reconnecting... (${attempt}/5)`);
    });

    socket.on("reconnect_failed", () => {
      console.log("❌ Reconnection failed");
      setError("Connection lost. Please refresh the page.");
    });

    // Room events 
    socket.on("room:new", (room) => {
      setRooms((prev) => [room, ...prev]);
    });

    // Room deleted event
    socket.on("room:deleted", ({ roomId, roomName, message }) => {
      // Remove room from rooms list
      setRooms(prev => prev.filter(r => r._id !== roomId));
      
      // If current active room was deleted, clear it
      if (activeRoomRef.current?._id === roomId) {
        setActiveRoomBoth(null);
        setMessages([]);
        setMembers([]);
      }
      
      console.log(message);
    });

    // Room list refresh event
    socket.on("room:list_refresh", ({ deletedRoomId }) => {
      // Refresh room list from server
      if (socketRef.current) {
        socketRef.current.emit("room:list", {}, (res) => {
          if (res && res.success) setRooms(res.rooms || []);
        });
      }
    });

    // User joined room
    socket.on("room:user_joined", ({ roomId, user }) => {
      announce(`${user.username} joined the room`);
      setMembers((prev) => {
        const exists = prev.find((m) => m._id === user._id);
        if (exists) {
          return prev.map((m) =>
            m._id === user._id ? { ...m, isOnline: true } : m
          );
        }
        return [...prev, { ...user, isOnline: true }];
      });
    });

    // User left room
    socket.on("room:user_left", ({ roomId, user }) => {
      announce(`${user.username} left the room`);
      setMembers((prev) =>
        prev.map((m) =>
          m._id === user._id ? { ...m, isOnline: false } : m
        )
      );
    });

    // Message events 
    socket.on("message:new", (message) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m._id === message._id);
        if (exists) return prev;
        // Announce new message to screen readers
        const sender = message.sender?.username || "Someone";
        announce(`New message from ${sender}`);
        socket.emit("message:delivered", { messageId: message._id });
        return [...prev, message];
      });
    });

    socket.on("message:read_update", ({ messageId, readBy }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, readBy } : m)
      );
    });

    socket.on("message:updated", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id
            ? { ...msg, ...updatedMessage }
            : msg
        )
      );
    });

    // Typing events 
    socket.on("typing:update", ({ roomId, user, isTyping }) => {
      setTypingUsers((prev) => {
        const roomTypers = prev[roomId] || [];
        if (isTyping) {
          const exists = roomTypers.find((u) => u._id === user._id.toString());
          if (exists) return prev;
          return { ...prev, [roomId]: [...roomTypers, user] };
        } else {
          return {
            ...prev,
            [roomId]: roomTypers.filter((u) => u._id !== user._id.toString()),
          };
        }
      });
    });

    // New DM initiated by someone else
    socket.on("dm:new", ({ room, from }) => {
      setRooms((prev) => {
        const exists = prev.find((r) => r._id === room._id);
        return exists ? prev : [room, ...prev];
      });
    });

    // Admin: someone requested to join your room
    socket.on("room:join_requested", ({ roomId, roomName, user }) => {
      setNotifications((prev) => [...prev, {
        id:       Date.now(),
        type:     "join_request",
        roomId,
        roomName,
        user,
      }]);
    });

    // User: your request was approved
    socket.on("room:request_approved", ({ roomId, roomName, room }) => {
      announce(`Your request to join ${roomName} was approved`, "assertive");
      setNotifications((prev) => [...prev, {
        id:       Date.now(),
        type:     "request_approved",
        roomId,
        roomName,
      }]);
      // Auto join the room
      setRooms((prev) => {
        const exists = prev.find((r) => r._id === room._id);
        return exists ? prev : [...prev, room];
      });
    });

    // User: your request was rejected
    socket.on("room:request_rejected", ({ roomId, roomName }) => {
      setNotifications((prev) => [...prev, {
        id:       Date.now(),
        type:     "request_rejected",
        roomName,
      }]);
    });

    // User: you received an invite
    socket.on("room:invited", ({ roomId, roomName, room, invitedBy }) => {
      setNotifications((prev) => [...prev, {
        id:       Date.now(),
        type:     "invite",
        roomId,
        roomName,
        invitedBy,
        room,
      }]);
    });

    // Connection errors 
    socket.on("connect_error", (err) => {
      setError(err.message);
      setConnected(false);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  // Room actions 
  const createRoom = useCallback((name, description = "", type = "public") => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:create", { name, description, type }, (res) => {
        if (res && res.success) {
          setActiveRoomBoth(res.room);
          setMessages([]);
          setMembers([]);
          resolve(res.room);
        } else {
          reject(res?.message || "Failed to create room");
        }
      });
    });
  }, [setActiveRoomBoth]);

  // Delete room (admin only)
  const deleteRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:delete", { roomId }, (res) => {
        if (res && res.success) {
          resolve(res);
        } else {
          reject(res?.message || "Failed to delete room");
        }
      });
    });
  }, []);

  const joinRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:join", { roomId }, (res) => {
        if (!res || !res.success) {
          return reject(res?.message || "Failed to join room");
        }

        setActiveRoomBoth(res.room);
        setMessages([]);
        setMembers([]);

        // Load message history
        try {
          socketRef.current.emit("message:history", { roomId },
            (histRes) => {
              if (histRes && histRes.success) {
                setMessages(histRes.messages || []);
                setHasMore(histRes.hasMore || false);
              }
            });
        } catch (e) {
          console.error("History fetch error:", e);
        }

        // Load members
        try {
          socketRef.current.emit("room:get_members", { roomId },
            (membRes) => {
              if (membRes && membRes.success) {
                setMembers(membRes.members || []);
              }
            });
        } catch (e) {
          console.error("Members fetch error:", e);
        }

        resolve(res.room);
      });
    });
  }, [setActiveRoomBoth]);

  const leaveRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:leave", { roomId }, (res) => {
        if (res && res.success) {
          setActiveRoomBoth(null);
          setMessages([]);
          setMembers([]);
          resolve();
        } else {
          reject(res?.message || "Failed to leave room");
        }
      });
    });
  }, [setActiveRoomBoth]);

  // Permission actions
  const requestJoin = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:request_join", { roomId }, (res) => {
        if (res && res.success) resolve();
        else reject(res?.message || "Failed to request join");
      });
    });
  }, []);

  const approveMember = useCallback((roomId, userId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:approve_member", { roomId, userId }, (res) => {
        if (res && res.success) resolve();
        else reject(res?.message || "Failed to approve");
      });
    });
  }, []);

  const rejectMember = useCallback((roomId, userId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:reject_member", { roomId, userId }, (res) => {
        if (res && res.success) resolve();
        else reject(res?.message || "Failed to reject");
      });
    });
  }, []);

  const acceptInvite = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:accept_invite", { roomId }, (res) => {
        if (res && res.success) {
          setRooms((prev) => {
            const exists = prev.find((r) => r._id === res.room._id);
            return exists ? prev : [...prev, res.room];
          });
          resolve(res.room);
        } else {
          reject(res?.message || "Failed to accept invite");
        }
      });
    });
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Message actions with image support ──────────────────────────
  const sendMessage = useCallback((roomId, body, type = "text", imageData = null) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      
      const payload = { roomId, type };
      
      if (type === "image" && imageData) {
        payload.imageData = imageData;
        if (body?.trim()) {
          payload.body = body.trim(); // Optional caption for image
        }
      } else {
        if (!body?.trim()) return reject("Message body is required");
        payload.body = body.trim();
      }
      
      socketRef.current.emit("message:send", payload, (res) => {
        if (res && res.success) resolve(res.message);
        else reject(res?.message || "Failed to send message");
      });
    });
  }, []);

  // ── Dedicated image sharing method ──────────────────────────────
  const shareImage = useCallback((roomId, imageData, caption = "") => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      if (!imageData) return reject("Image data is required");
      
      socketRef.current.emit("message:share_image", { 
        roomId, 
        imageData, 
        caption: caption.trim() 
      }, (res) => {
        if (res && res.success) resolve(res.message);
        else reject(res?.message || "Failed to share image");
      });
    });
  }, []);

  const loadMoreMessages = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !hasMore) return resolve([]);
      setLoadingMsgs(true);
      const cursor = messages[0]?.createdAt;
      socketRef.current.emit("message:history", { roomId, cursor },
        (res) => {
          setLoadingMsgs(false);
          if (res && res.success) {
            setMessages((prev) => [...(res.messages || []), ...prev]);
            setHasMore(res.hasMore || false);
            resolve(res.messages || []);
          } else {
            reject("Failed to load more messages");
          }
        });
    });
  }, [messages, hasMore]);

  const markRead = useCallback((messageId) => {
    socketRef.current?.emit("message:read", { messageId }, () => {});
  }, []);

  const editMessage = useCallback((messageId, body) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");

      socketRef.current.emit(
        "message:edit",
        { messageId, body },
        (res) => {
          if (res && res.success) {
            resolve(res);
          } else {
            reject(res?.message || "Failed to edit message");
          }
        }
      );
    });
  }, []);

  const deleteMessage = useCallback((messageId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");

      socketRef.current.emit(
        "message:delete",
        { messageId },
        (res) => {
          if (res && res.success) {
            resolve(res);
          } else {
            reject(res?.message || "Failed to delete message");
          }
        }
      );
    });
  }, []);

  // Typing actions 
  const startTyping = useCallback((roomId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing:start", { roomId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", { roomId });
    }, 3000);
  }, []);

  const stopTyping = useCallback((roomId) => {
    if (!socketRef.current) return;
    clearTimeout(typingTimeoutRef.current);
    socketRef.current.emit("typing:stop", { roomId });
  }, []);

  // ── User actions ──────────────────────────────────────────────
  const fetchUsers = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("user:list", {}, (res) => {
        if (res && res.success) {
          setUsers(res.users || []);
          resolve(res.users);
        } else {
          reject(res?.message || "Failed to fetch users");
        }
      });
    });
  }, []);

  const startDM = useCallback((targetUserId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("dm:start", { targetUserId }, (res) => {
        if (res && res.success) {
          // Add DM to rooms list
          setRooms((prev) => {
            const exists = prev.find((r) => r._id === res.room._id);
            return exists ? prev : [res.room, ...prev];
          });
          setActiveRoomBoth(res.room);
          setMessages([]);
          setMembers([res.targetUser, {
            _id:      socketRef.current?.id,
            username: "You",
            isOnline: true,
          }]);

          // Load message history
          socketRef.current.emit("message:history",
            { roomId: res.room._id }, (histRes) => {
              if (histRes && histRes.success) {
                setMessages(histRes.messages || []);
                setHasMore(histRes.hasMore || false);
              }
            });

          resolve(res.room);
        } else {
          reject(res?.message || "Failed to start DM");
        }
      });
    });
  }, [setActiveRoomBoth]);

  return {
    socket:          socketRef.current,
    connected,
    error,
    rooms,
    activeRoom,
    setActiveRoom:   setActiveRoomBoth,
    messages,
    hasMore,
    loadingMsgs,
    typingUsers,
    members,
    createRoom,
    deleteRoom,      // ← Added deleteRoom
    joinRoom,
    leaveRoom,
    sendMessage,
    shareImage,   
    loadMoreMessages,
    markRead,
    editMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    users,
    fetchUsers,
    startDM,
    showDMList,
    setShowDMList,
    notifications,
    requestJoin,
    approveMember,
    rejectMember,
    acceptInvite,
    dismissNotification,
  }; 
};

export default useSocket;