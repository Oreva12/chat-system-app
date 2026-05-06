import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import useAuth from "./useAuth";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "")
  || "http://localhost:5000";

const useSocket = () => {
  const { token }                   = useAuth();
  const socketRef                   = useRef(null);
  const [connected,   setConnected]   = useState(false);
  const [error,       setError]       = useState(null);
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

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
      socket.emit("room:list", {}, ({ success, rooms }) => {
        if (success) setRooms(rooms);
      });
    });

    // New room broadcast
    socket.on("room:new", (room) => {
      setRooms((prev) => [room, ...prev]);
    });

    // Incoming message — add to bottom
    socket.on("message:new", (message) => {
      setMessages((prev) => {
        // Deduplicate by _id
        const exists = prev.find((m) => m._id === message._id);
        return exists ? prev : [...prev, message];
      });
    });

    // Read receipt update
    socket.on("message:read_update", ({ messageId, readBy }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, readBy } : m)
      );
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

  // Room actions
  const createRoom = useCallback((name, description = "") => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:create", { name, description }, (res) => {
        if (res.success) { setActiveRoom(res.room); setMessages([]); resolve(res.room); }
        else reject(res.message);
      });
    });
  }, []);

  const joinRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:join", { roomId }, (res) => {
        if (res.success) {
          setActiveRoom(res.room);
          setMessages([]);
          // Load message history
          socketRef.current.emit("message:history", { roomId }, ({ success, messages, hasMore }) => {
            if (success) { setMessages(messages); setHasMore(hasMore); }
          });
          resolve(res.room);
        } else reject(res.message);
      });
    });
  }, []);

  const leaveRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:leave", { roomId }, (res) => {
        if (res.success) { setActiveRoom(null); setMessages([]); resolve(); }
        else reject(res.message);
      });
    });
  }, []);

  // ── Message actions ──────────────────────────────────────────
  const sendMessage = useCallback((roomId, body) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("message:send", { roomId, body }, (res) => {
        if (res.success) resolve(res.message);
        else reject(res.message);
      });
    });
  }, []);

  const loadMoreMessages = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !hasMore) return resolve([]);
      setLoadingMsgs(true);
      // Use oldest message's createdAt as cursor
      const cursor = messages[0]?.createdAt;
      socketRef.current.emit("message:history", { roomId, cursor }, ({ success, messages: older, hasMore: more }) => {
        setLoadingMsgs(false);
        if (success) {
          setMessages((prev) => [...older, ...prev]); // prepend older messages
          setHasMore(more);
          resolve(older);
        } else reject("Failed to load more");
      });
    });
  }, [messages, hasMore]);

  const markRead = useCallback((messageId) => {
    socketRef.current?.emit("message:read", { messageId }, () => {});
  }, []);

  return {
    socket: socketRef.current,
    connected,
    error,
    rooms,
    activeRoom,
    setActiveRoom,
    messages,
    hasMore,
    loadingMsgs,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    loadMoreMessages,
    markRead,
  };
};

export default useSocket;