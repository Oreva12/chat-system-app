import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import useAuth from "./useAuth";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") 
  || "http://localhost:5000";

const useSocket = () => {
  const { token }                 = useAuth();
  const socketRef                 = useRef(null);
  const [connected,  setConnected]  = useState(false);
  const [error,      setError]      = useState(null);
  const [rooms,      setRooms]      = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth:            { token },
      withCredentials: true,
      transports:      ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connected", (data) => {
      setConnected(true);
      setError(null);
      // Load rooms on connect
      socket.emit("room:list", {}, ({ success, rooms }) => {
        if (success) setRooms(rooms);
      });
    });

    // New room created by anyone — add to list
    socket.on("room:new", (room) => {
      setRooms((prev) => [room, ...prev]);
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
        if (res.success) {
          setActiveRoom(res.room);
          resolve(res.room);
        } else {
          reject(res.message);
        }
      });
    });
  }, []);

  const joinRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:join", { roomId }, (res) => {
        if (res.success) {
          setActiveRoom(res.room);
          resolve(res.room);
        } else {
          reject(res.message);
        }
      });
    });
  }, []);

  const leaveRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject("Not connected");
      socketRef.current.emit("room:leave", { roomId }, (res) => {
        if (res.success) {
          setActiveRoom(null);
          resolve();
        } else {
          reject(res.message);
        }
      });
    });
  }, []);

  return {
    socket:     socketRef.current,
    connected,
    error,
    rooms,
    activeRoom,
    setActiveRoom,
    createRoom,
    joinRoom,
    leaveRoom,
  };
};

export default useSocket;