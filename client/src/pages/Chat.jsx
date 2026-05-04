import useAuth   from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";

const Chat = () => {
  const { user, logout }     = useAuth();
  const { connected, error } = useSocket();

  return (
    <div style={{
      minHeight:      "100vh",
      background:     "#0D0F14",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      flexDirection:  "column",
      gap:            "16px",
    }}>
      <h1 style={{ color: "#E8EAF0" }}>
        👋 Welcome, {user?.username}!
      </h1>

      {/* Connection status indicator */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "8px",
        background:   "#141720",
        padding:      "8px 16px",
        borderRadius: "20px",
        border:       "1px solid #1E2130",
      }}>
        <div style={{
          width:        "8px",
          height:       "8px",
          borderRadius: "50%",
          background:   connected ? "#00C896" : "#E05C8A",
          boxShadow:    connected ? "0 0 8px #00C896" : "none",
        }} />
        <span style={{ color: "#C4C9D8", fontSize: "13px" }}>
          {connected ? "Connected to chat server" : "Connecting..."}
        </span>
      </div>

      {error && (
        <p style={{ color: "#E05C8A", fontSize: "13px" }}>{error}</p>
      )}

      <p style={{ color: "#6B7280", fontSize: "13px" }}>
        Real-time chat UI coming Day 10...
      </p>

      <button
        onClick={logout}
        style={{
          background:   "#E05C8A",
          color:        "#fff",
          border:       "none",
          borderRadius: "6px",
          padding:      "10px 20px",
          cursor:       "pointer",
          fontWeight:   700,
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Chat;