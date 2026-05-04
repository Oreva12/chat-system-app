import { useState } from "react";
import useAuth   from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";

const Chat = () => {
  const { user, logout }                                    = useAuth();
  const { connected, rooms, activeRoom, createRoom, joinRoom, leaveRoom } = useSocket();

  const [newRoomName, setNewRoomName] = useState("");
  const [roomError,   setRoomError]   = useState("");
  const [creating,    setCreating]    = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    setRoomError("");
    try {
      await createRoom(newRoomName.trim());
      setNewRoomName("");
    } catch (err) {
      setRoomError(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await joinRoom(roomId);
    } catch (err) {
      console.error("Join error:", err);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0D0F14" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: "280px", background: "#141720",
        borderRight: "1px solid #1E2130",
        display: "flex", flexDirection: "column",
      }}>
        {/* User info */}
        <div style={{
          padding: "16px", borderBottom: "1px solid #1E2130",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: connected ? "#00C896" : "#E05C8A",
              boxShadow: connected ? "0 0 6px #00C896" : "none",
            }} />
            <span style={{ color: "#E8EAF0", fontSize: "13px", fontWeight: 700 }}>
              {user?.username}
            </span>
          </div>
          <button onClick={logout} style={{
            background: "none", border: "1px solid #1E2130",
            color: "#6B7280", fontSize: "11px", padding: "4px 8px",
            borderRadius: "4px", cursor: "pointer",
          }}>
            Logout
          </button>
        </div>

        {/* Create room form */}
        <div style={{ padding: "12px", borderBottom: "1px solid #1E2130" }}>
          <form onSubmit={handleCreateRoom} style={{ display: "flex", gap: "6px" }}>
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="New room name..."
              style={{
                flex: 1, background: "#0D0F14", border: "1px solid #1E2130",
                borderRadius: "6px", padding: "7px 10px",
                color: "#E8EAF0", fontSize: "12px", outline: "none",
              }}
            />
            <button type="submit" disabled={creating} style={{
              background: "#00C896", border: "none", color: "#0D0F14",
              padding: "7px 12px", borderRadius: "6px",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
            }}>
              +
            </button>
          </form>
          {roomError && (
            <p style={{ color: "#E05C8A", fontSize: "11px", marginTop: "4px" }}>
              {roomError}
            </p>
          )}
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          <p style={{
            color: "#6B7280", fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.1em", padding: "4px 8px 8px",
            textTransform: "uppercase",
          }}>
            Rooms ({rooms.length})
          </p>
          {rooms.length === 0 && (
            <p style={{ color: "#6B7280", fontSize: "12px", padding: "8px" }}>
              No rooms yet. Create one!
            </p>
          )}
          {rooms.map((room) => (
            <div
              key={room._id}
              onClick={() => handleJoinRoom(room._id)}
              style={{
                padding: "10px 12px", borderRadius: "6px", cursor: "pointer",
                background: activeRoom?._id === room._id
                  ? "#1E2130" : "transparent",
                marginBottom: "2px",
              }}
            >
              <p style={{
                color: activeRoom?._id === room._id ? "#E8EAF0" : "#C4C9D8",
                fontSize: "13px", fontWeight: 600, margin: 0,
              }}>
                # {room.name}
              </p>
              {room.description && (
                <p style={{ color: "#6B7280", fontSize: "11px", margin: "2px 0 0" }}>
                  {room.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: "8px",
      }}>
        {activeRoom ? (
          <>
            <h2 style={{ color: "#E8EAF0" }}># {activeRoom.name}</h2>
            <p style={{ color: "#6B7280", fontSize: "13px" }}>
              Messaging coming Day 9...
            </p>
            <button
              onClick={() => leaveRoom(activeRoom._id)}
              style={{
                background: "none", border: "1px solid #1E2130",
                color: "#6B7280", padding: "6px 14px",
                borderRadius: "6px", cursor: "pointer", fontSize: "12px",
              }}
            >
              Leave room
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "#6B7280" }}>
              Select a room or create a new one
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;