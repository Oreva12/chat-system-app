import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import useAuth from "./useAuth";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const useSocket = () => {
  const { token }               = useAuth();
  const socketRef               = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    // Only connect if we have a token
    if (!token) return;

    // Create socket connection with JWT in handshake
    socketRef.current = io(SOCKET_URL, {
      auth:             { token },
      withCredentials:  true,
      transports:       ["websocket"], // skip long-polling
    });

    const socket = socketRef.current;

    socket.on("connected", (data) => {
      console.log("✅ Socket connected:", data.message);
      setConnected(true);
      setError(null);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setError(err.message);
      setConnected(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setConnected(false);
    });

    // Cleanup on unmount or token change
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]); // reconnects if token changes

  return { socket: socketRef.current, connected, error };
};

export default useSocket;