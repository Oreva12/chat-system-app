import useAuth from "../hooks/useAuth";

const Chat = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: "100vh", background: "#0D0F14", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
      <h1 style={{ color: "#E8EAF0" }}>👋 Welcome, {user?.username}!</h1>
      <p style={{ color: "#6B7280" }}>Chat UI coming in Week 2...</p>
      <button
        onClick={logout}
        style={{ background: "#E05C8A", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", cursor: "pointer", fontWeight: 700 }}
      >
        Logout
      </button>
    </div>
  );
};

export default Chat;