import { useState, useEffect, useRef } from "react";
import useAuth   from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";

const Chat = () => {
  const { user, logout } = useAuth();
  const {
    connected, rooms, activeRoom,
    messages, hasMore, loadingMsgs,
    createRoom, joinRoom, leaveRoom,
    sendMessage, loadMoreMessages, markRead,
  } = useSocket();

  const [newRoomName, setNewRoomName] = useState("");
  const [roomError,   setRoomError]   = useState("");
  const [creating,    setCreating]    = useState(false);
  const [msgBody,     setMsgBody]     = useState("");
  const [sending,     setSending]     = useState(false);
  const bottomRef                     = useRef(null);
  const messagesRef                   = useRef(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when room is active
  useEffect(() => {
    if (!activeRoom || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.readBy?.includes(user?._id)) {
      markRead(lastMsg._id);
    }
  }, [messages, activeRoom]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true); setRoomError("");
    try {
      await createRoom(newRoomName.trim());
      setNewRoomName("");
    } catch (err) { setRoomError(err); }
    finally { setCreating(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgBody.trim() || !activeRoom) return;
    setSending(true);
    try {
      await sendMessage(activeRoom._id, msgBody.trim());
      setMsgBody("");
    } catch (err) { console.error("Send error:", err); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Format timestamp
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0D0F14" }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div style={{
        width: "260px", background: "#141720",
        borderRight: "1px solid #1E2130",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* User info */}
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid #1E2130",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: connected ? "#00C896" : "#E05C8A",
              boxShadow:  connected ? "0 0 6px #00C896" : "none",
            }} />
            <span style={{ color: "#E8EAF0", fontSize: "13px", fontWeight: 700 }}>
              {user?.username}
            </span>
          </div>
          <button onClick={logout} style={{
            background: "none", border: "1px solid #1E2130",
            color: "#6B7280", fontSize: "11px", padding: "3px 8px",
            borderRadius: "4px", cursor: "pointer",
          }}>
            Logout
          </button>
        </div>

        {/* Create room */}
        <div style={{ padding: "12px", borderBottom: "1px solid #1E2130" }}>
          <form onSubmit={handleCreateRoom} style={{ display: "flex", gap: "6px" }}>
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="New room..."
              style={{
                flex: 1, background: "#0D0F14", border: "1px solid #1E2130",
                borderRadius: "6px", padding: "7px 10px",
                color: "#E8EAF0", fontSize: "12px", outline: "none",
              }}
            />
            <button type="submit" disabled={creating} style={{
              background: "#00C896", border: "none", color: "#0D0F14",
              padding: "7px 12px", borderRadius: "6px",
              fontSize: "14px", fontWeight: 700, cursor: "pointer",
            }}>+</button>
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
            letterSpacing: "0.1em", padding: "4px 8px 6px",
            textTransform: "uppercase",
          }}>
            Rooms ({rooms.length})
          </p>
          {rooms.map((room) => (
            <div key={room._id} onClick={() => joinRoom(room._id)} style={{
              padding: "9px 12px", borderRadius: "6px", cursor: "pointer",
              background: activeRoom?._id === room._id ? "#1E2130" : "transparent",
              marginBottom: "2px",
            }}>
              <p style={{
                color: activeRoom?._id === room._id ? "#E8EAF0" : "#C4C9D8",
                fontSize: "13px", fontWeight: 600, margin: 0,
              }}>
                # {room.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeRoom ? (
          <>
            {/* Room header */}
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #1E2130",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#141720",
            }}>
              <div>
                <h2 style={{ color: "#E8EAF0", margin: 0, fontSize: "15px" }}>
                  # {activeRoom.name}
                </h2>
                {activeRoom.description && (
                  <p style={{ color: "#6B7280", margin: "2px 0 0", fontSize: "12px" }}>
                    {activeRoom.description}
                  </p>
                )}
              </div>
              <button onClick={() => leaveRoom(activeRoom._id)} style={{
                background: "none", border: "1px solid #1E2130",
                color: "#6B7280", fontSize: "11px", padding: "4px 10px",
                borderRadius: "4px", cursor: "pointer",
              }}>
                Leave
              </button>
            </div>

            {/* Messages */}
            <div ref={messagesRef} style={{
              flex: 1, overflowY: "auto", padding: "20px",
              display: "flex", flexDirection: "column", gap: "4px",
            }}>
              {/* Load more button */}
              {hasMore && (
                <button onClick={() => loadMoreMessages(activeRoom._id)} disabled={loadingMsgs} style={{
                  alignSelf: "center", background: "#141720",
                  border: "1px solid #1E2130", color: "#6B7280",
                  padding: "6px 16px", borderRadius: "20px",
                  fontSize: "12px", cursor: "pointer", marginBottom: "12px",
                }}>
                  {loadingMsgs ? "Loading..." : "Load earlier messages"}
                </button>
              )}

              {messages.length === 0 && (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center",
                  justifyContent: "center",
                }}>
                  <p style={{ color: "#6B7280", fontSize: "13px" }}>
                    No messages yet. Say hello! 👋
                  </p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isOwn = msg.sender?._id === user?._id ||
                              msg.sender === user?._id;
                const showName = i === 0 ||
                  messages[i-1]?.sender?._id !== msg.sender?._id;

                return (
                  <div key={msg._id} style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isOwn ? "flex-end" : "flex-start",
                    marginTop: showName ? "12px" : "2px",
                  }}>
                    {showName && !isOwn && (
                      <span style={{
                        color: "#6B7280", fontSize: "11px",
                        marginBottom: "3px", paddingLeft: "4px",
                      }}>
                        {msg.sender?.username}
                      </span>
                    )}
                    <div style={{
                      maxWidth: "65%",
                      background: isOwn ? "#4F8EF7" : "#1E2130",
                      color: "#E8EAF0",
                      padding: "8px 12px",
                      borderRadius: isOwn
                        ? "12px 12px 2px 12px"
                        : "12px 12px 12px 2px",
                      fontSize: "13px", lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}>
                      {msg.body}
                    </div>
                    <span style={{
                      color: "#6B7280", fontSize: "10px",
                      marginTop: "3px", paddingLeft: "4px", paddingRight: "4px",
                    }}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Message input */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #1E2130" }}>
              <form onSubmit={handleSendMessage} style={{
                display: "flex", gap: "10px", alignItems: "flex-end",
              }}>
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message # ${activeRoom.name}`}
                  rows={1}
                  style={{
                    flex: 1, background: "#1E2130", border: "1px solid #252A3A",
                    borderRadius: "8px", padding: "10px 14px",
                    color: "#E8EAF0", fontSize: "13px", outline: "none",
                    resize: "none", lineHeight: 1.5, fontFamily: "inherit",
                  }}
                />
                <button type="submit" disabled={sending || !msgBody.trim()} style={{
                  background: "#4F8EF7", border: "none", color: "#fff",
                  padding: "10px 18px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  opacity: sending || !msgBody.trim() ? 0.5 : 1,
                }}>
                  Send
                </button>
              </form>
              <p style={{ color: "#6B7280", fontSize: "10px", marginTop: "6px" }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column", gap: "8px",
          }}>
            <p style={{ color: "#6B7280", fontSize: "14px" }}>
              Select a room to start chatting
            </p>
            <p style={{ color: "#4B5268", fontSize: "12px" }}>
              or create a new one from the sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;