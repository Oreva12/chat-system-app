import { useState, useEffect, useRef } from "react";
import useAuth   from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";

const TypingIndicator = ({ typers }) => {
  if (!typers || typers.length === 0) return null;
  const text = typers.length === 1
    ? `${typers[0].username} is typing`
    : typers.length === 2
    ? `${typers[0].username} and ${typers[1].username} are typing`
    : "Several people are typing";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"4px 0 8px", minHeight:"24px" }}>
      <div style={{ display:"flex", gap:"3px", alignItems:"center" }}>
        {[0,1,2].map((i) => (
          <div key={i} style={{
            width:"5px", height:"5px", borderRadius:"50%", background:"#6B7280",
            animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ color:"#6B7280", fontSize:"11px", fontStyle:"italic" }}>
        {text}...
      </span>
    </div>
  );
};

const Chat = () => {
  const { user, logout } = useAuth();
  const {
    connected, rooms, activeRoom,
    messages, hasMore, loadingMsgs,
    typingUsers, members,
    createRoom, joinRoom, leaveRoom,
    sendMessage, loadMoreMessages,
    markRead, startTyping, stopTyping,
  } = useSocket();

  const [newRoomName,   setNewRoomName]   = useState("");
  const [roomError,     setRoomError]     = useState("");
  const [creating,      setCreating]      = useState(false);
  const [msgBody,       setMsgBody]       = useState("");
  const [sending,       setSending]       = useState(false);
  const [showMembers,   setShowMembers]   = useState(false); // ← toggle state
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeRoom || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.readBy?.includes(user?._id)) {
      markRead(lastMsg._id);
    }
  }, [messages, activeRoom]);

  // Close members panel when leaving room
  useEffect(() => {
    if (!activeRoom) setShowMembers(false);
  }, [activeRoom]);

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
    stopTyping(activeRoom._id);
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

  const handleMsgInput = (e) => {
    setMsgBody(e.target.value);
    if (activeRoom && e.target.value.trim()) startTyping(activeRoom._id);
    else if (activeRoom) stopTyping(activeRoom._id);
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

  const activeTypers = activeRoom
    ? (typingUsers[activeRoom._id] || []).filter((u) => u._id !== user?._id)
    : [];

  const onlineCount  = members.filter((m) => m.isOnline).length;

  return (
    <div style={{ display:"flex", height:"100vh", background:"#0D0F14", overflow:"hidden" }}>

      {/* Sidebar */}
      <div style={{
        width:"260px", background:"#141720",
        borderRight:"1px solid #1E2130",
        display:"flex", flexDirection:"column", flexShrink:0,
      }}>
        {/* User info */}
        <div style={{
          padding:"14px 16px", borderBottom:"1px solid #1E2130",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{
              width:"8px", height:"8px", borderRadius:"50%",
              background: connected ? "#00C896" : "#E05C8A",
              boxShadow:  connected ? "0 0 6px #00C896" : "none",
            }} />
            <span style={{ color:"#E8EAF0", fontSize:"13px", fontWeight:700 }}>
              {user?.username}
            </span>
          </div>
          <button onClick={logout} style={{
            background:"none", border:"1px solid #1E2130",
            color:"#6B7280", fontSize:"11px", padding:"3px 8px",
            borderRadius:"4px", cursor:"pointer",
          }}>Logout</button>
        </div>

        {/* Create room */}
        <div style={{ padding:"12px", borderBottom:"1px solid #1E2130" }}>
          <form onSubmit={handleCreateRoom} style={{ display:"flex", gap:"6px" }}>
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="New room..."
              style={{
                flex:1, background:"#0D0F14", border:"1px solid #1E2130",
                borderRadius:"6px", padding:"7px 10px",
                color:"#E8EAF0", fontSize:"12px", outline:"none",
              }}
            />
            <button type="submit" disabled={creating} style={{
              background:"#00C896", border:"none", color:"#0D0F14",
              padding:"7px 12px", borderRadius:"6px",
              fontSize:"14px", fontWeight:700, cursor:"pointer",
            }}>+</button>
          </form>
          {roomError && (
            <p style={{ color:"#E05C8A", fontSize:"11px", marginTop:"4px" }}>
              {roomError}
            </p>
          )}
        </div>

        {/* Room list */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
          <p style={{
            color:"#6B7280", fontSize:"10px", fontWeight:700,
            letterSpacing:"0.1em", padding:"4px 8px 6px",
            textTransform:"uppercase",
          }}>
            Rooms ({rooms.length})
          </p>
          {rooms.map((room) => {
            const roomTypers = (typingUsers[room._id] || [])
              .filter((u) => u._id !== user?._id);
            return (
              <div key={room._id} onClick={() => joinRoom(room._id)} style={{
                padding:"9px 12px", borderRadius:"6px", cursor:"pointer",
                background: activeRoom?._id === room._id ? "#1E2130" : "transparent",
                marginBottom:"2px",
              }}>
                <p style={{
                  color: activeRoom?._id === room._id ? "#E8EAF0" : "#C4C9D8",
                  fontSize:"13px", fontWeight:600, margin:0,
                }}>
                  # {room.name}
                </p>
                {roomTypers.length > 0 && (
                  <p style={{ color:"#00C896", fontSize:"10px", margin:"2px 0 0", fontStyle:"italic" }}>
                    {roomTypers[0].username} is typing...
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {activeRoom ? (
          <>
            {/* Room header */}
            <div style={{
              padding:"14px 20px", borderBottom:"1px solid #1E2130",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background:"#141720", flexShrink:0,
            }}>
              <div>
                <h2 style={{ color:"#E8EAF0", margin:0, fontSize:"15px" }}>
                  # {activeRoom.name}
                </h2>
                {activeRoom.description && (
                  <p style={{ color:"#6B7280", margin:"2px 0 0", fontSize:"12px" }}>
                    {activeRoom.description}
                  </p>
                )}
              </div>

              {/* Header buttons */}
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>

                {/* Members toggle button */}
                <button
                  onClick={() => setShowMembers((prev) => !prev)}
                  style={{
                    background:   showMembers ? "#1E2130" : "none",
                    border:       "1px solid #1E2130",
                    color:        showMembers ? "#E8EAF0" : "#6B7280",
                    fontSize:     "12px",
                    padding:      "5px 12px",
                    borderRadius: "6px",
                    cursor:       "pointer",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "6px",
                    transition:   "all 0.2s",
                  }}
                >
                  {/* People icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {members.length}
                  {/* Online count badge */}
                  {onlineCount > 0 && (
                    <span style={{
                      background:   "#00C896",
                      color:        "#0D0F14",
                      fontSize:     "9px",
                      fontWeight:   700,
                      padding:      "1px 5px",
                      borderRadius: "10px",
                    }}>
                      {onlineCount} online
                    </span>
                  )}
                </button>

                <button onClick={() => leaveRoom(activeRoom._id)} style={{
                  background:"none", border:"1px solid #1E2130",
                  color:"#6B7280", fontSize:"11px", padding:"4px 10px",
                  borderRadius:"4px", cursor:"pointer",
                }}>
                  Leave
                </button>
              </div>
            </div>

            {/* Messages + Members row */}
            <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

              {/* Messages */}
              <div style={{
                flex:1, overflowY:"auto", padding:"20px",
                display:"flex", flexDirection:"column", gap:"4px",
              }}>
                {hasMore && (
                  <button
                    onClick={() => loadMoreMessages(activeRoom._id)}
                    disabled={loadingMsgs}
                    style={{
                      alignSelf:"center", background:"#141720",
                      border:"1px solid #1E2130", color:"#6B7280",
                      padding:"6px 16px", borderRadius:"20px",
                      fontSize:"12px", cursor:"pointer", marginBottom:"12px",
                    }}>
                    {loadingMsgs ? "Loading..." : "Load earlier messages"}
                  </button>
                )}

                {messages.length === 0 && (
                  <div style={{
                    flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <p style={{ color:"#6B7280", fontSize:"13px" }}>
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
                      display:"flex", flexDirection:"column",
                      alignItems: isOwn ? "flex-end" : "flex-start",
                      marginTop: showName ? "12px" : "2px",
                    }}>
                      {showName && !isOwn && (
                        <span style={{
                          color:"#6B7280", fontSize:"11px",
                          marginBottom:"3px", paddingLeft:"4px",
                        }}>
                          {msg.sender?.username}
                        </span>
                      )}
                      <div style={{
                        maxWidth:"65%",
                        background: isOwn ? "#4F8EF7" : "#1E2130",
                        color:"#E8EAF0",
                        padding:"8px 12px",
                        borderRadius: isOwn
                          ? "12px 12px 2px 12px"
                          : "12px 12px 12px 2px",
                        fontSize:"13px", lineHeight:1.5,
                        wordBreak:"break-word",
                      }}>
                        {msg.body}
                      </div>
                      <span style={{
                        color:"#6B7280", fontSize:"10px",
                        marginTop:"3px", paddingLeft:"4px", paddingRight:"4px",
                      }}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })}

                <TypingIndicator typers={activeTypers} />
                <div ref={bottomRef} />
              </div>

              {/* Members Panel (slide in/out) */}
              <div style={{
                width:          showMembers ? "220px" : "0px",
                overflow:       "hidden",
                transition:     "width 0.25s ease",
                background:     "#141720",
                borderLeft:     showMembers ? "1px solid #1E2130" : "none",
                flexShrink:     0,
                display:        "flex",
                flexDirection:  "column",
              }}>
                <div style={{ width:"220px", display:"flex", flexDirection:"column", height:"100%" }}>
                  {/* Panel header */}
                  <div style={{
                    padding:"14px 16px", borderBottom:"1px solid #1E2130", flexShrink:0,
                  }}>
                    <p style={{
                      color:"#6B7280", fontSize:"10px", fontWeight:700,
                      letterSpacing:"0.1em", textTransform:"uppercase", margin:0,
                    }}>
                      Members — {onlineCount} online
                    </p>
                  </div>

                  {/* Member list */}
                  <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
                    {members
                      .slice()
                      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                      .map((member) => (
                        <div key={member._id} style={{
                          display:"flex", alignItems:"center",
                          gap:"8px", padding:"7px 10px",
                          borderRadius:"6px", marginBottom:"2px",
                        }}>
                          {/* Avatar + presence dot */}
                          <div style={{ position:"relative", flexShrink:0 }}>
                            <div style={{
                              width:"30px", height:"30px", borderRadius:"50%",
                              background:"#1E2130",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              color:"#E8EAF0", fontSize:"12px", fontWeight:700,
                            }}>
                              {member.username?.[0]?.toUpperCase()}
                            </div>
                            <div style={{
                              position:"absolute", bottom:0, right:0,
                              width:"9px", height:"9px", borderRadius:"50%",
                              background: member.isOnline ? "#00C896" : "#4B5268",
                              border:"2px solid #141720",
                              boxShadow: member.isOnline ? "0 0 6px #00C896" : "none",
                            }} />
                          </div>

                          {/* Name + status */}
                          <div style={{ minWidth:0 }}>
                            <p style={{
                              color: member.isOnline ? "#E8EAF0" : "#6B7280",
                              fontSize:"12px", fontWeight:600,
                              margin:0, whiteSpace:"nowrap",
                              overflow:"hidden", textOverflow:"ellipsis",
                            }}>
                              {member.username}
                              {member._id === user?._id && (
                                <span style={{ color:"#4B5268", fontWeight:400 }}> (you)</span>
                              )}
                            </p>
                            <p style={{
                              color: member.isOnline ? "#00C896" : "#4B5268",
                              fontSize:"10px", margin:0,
                            }}>
                              {member.isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                      ))}

                    {members.length === 0 && (
                      <p style={{ color:"#4B5268", fontSize:"12px", padding:"8px" }}>
                        No members yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Message input */}
            <div style={{ padding:"16px 20px", borderTop:"1px solid #1E2130", flexShrink:0 }}>
              <form onSubmit={handleSendMessage} style={{
                display:"flex", gap:"10px", alignItems:"flex-end",
              }}>
                <textarea
                  value={msgBody}
                  onChange={handleMsgInput}
                  onKeyDown={handleKeyDown}
                  onBlur={() => activeRoom && stopTyping(activeRoom._id)}
                  placeholder={`Message # ${activeRoom.name}`}
                  rows={1}
                  style={{
                    flex:1, background:"#1E2130", border:"1px solid #252A3A",
                    borderRadius:"8px", padding:"10px 14px",
                    color:"#E8EAF0", fontSize:"13px", outline:"none",
                    resize:"none", lineHeight:1.5, fontFamily:"inherit",
                  }}
                />
                <button type="submit" disabled={sending || !msgBody.trim()} style={{
                  background:"#4F8EF7", border:"none", color:"#fff",
                  padding:"10px 18px", borderRadius:"8px",
                  fontSize:"13px", fontWeight:700, cursor:"pointer",
                  opacity: sending || !msgBody.trim() ? 0.5 : 1,
                }}>
                  Send
                </button>
              </form>
              <p style={{ color:"#6B7280", fontSize:"10px", marginTop:"6px" }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div style={{
            flex:1, display:"flex", alignItems:"center",
            justifyContent:"center", flexDirection:"column", gap:"8px",
          }}>
            <p style={{ color:"#6B7280", fontSize:"14px" }}>
              Select a room to start chatting
            </p>
            <p style={{ color:"#4B5268", fontSize:"12px" }}>
              or create a new one from the sidebar
            </p>
          </div>
        )}
      </div>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

export default Chat;