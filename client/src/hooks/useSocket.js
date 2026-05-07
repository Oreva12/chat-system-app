import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import useAuth from "./useAuth";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "")
  || "http://localhost:5000";

const useSocket = () => {
  const { token }                   = useAuth();
  const socketRef                   = useRef(null);
  const typingTimeoutRef            = useRef(null);
  const [connected,   setConnected]   = useState(false);
  const [error,       setError]       = useState(null);
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [members,     setMembers]     = useState([]);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth:            { token },
      withCredentials: true,
      transports:      ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connected", () => {
      setConnected(true);
      setError(null);
      socket.emit("room:list", {}, (res) => {
        if (res && res.success) setRooms(res.rooms || []);
      });
    });

    socket.on("room:new", (room) => {
      setRooms((prev) => [room, ...prev]);
    });

    socket.on("room:user_joined", ({ roomId, user }) => {
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

    socket.on("room:user_left", ({ roomId, user }) => {
      setMembers((prev) =>
        prev.map((m) =>
          m._id === user._id ? { ...m, isOnline: false } : m
        )
      );
    });

    socket.on("message:new", (message) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m._id === message._id);
        return exists ? prev : [...prev, message];
      });
    });

    socket.on("message:read_update", ({ messageId, readBy }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, readBy } : m)
      );
    });

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

    socket.on("connect_error", (err) => {
      setError(err.message);
      setConnected(false);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  // ── Room actions ─────────────────────────────────────────────
  const createRoom = useCallback((name, description = "") => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:create", { name, description }, (res) => {
        if (res && res.success) {
          setActiveRoom(res.room);
          setMessages([]);
          setMembers([]);
          resolve(res.room);
        } else {
          reject(res?.message || "Failed to create room");
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

        setActiveRoom(res.room);
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
  }, []);

  const leaveRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:leave", { roomId }, (res) => {
        if (res && res.success) {
          setActiveRoom(null);
          setMessages([]);
          setMembers([]);
          resolve();
        } else {
          reject(res?.message || "Failed to leave room");
        }
      });
    });
  }, []);

  // ── Message actions ──────────────────────────────────────────
  const sendMessage = useCallback((roomId, body) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("message:send", { roomId, body }, (res) => {
        if (res && res.success) resolve(res.message);
        else reject(res?.message || "Failed to send message");
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

  // ── Typing actions ───────────────────────────────────────────
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

  return {
    socket:         socketRef.current,
    connected,
    error,
    rooms,
    activeRoom,
    setActiveRoom,
    messages,
    hasMore,
    loadingMsgs,
    typingUsers,
    members,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    loadMoreMessages,
    markRead,
    startTyping,
    stopTyping,
  };
};

export default useSocket;