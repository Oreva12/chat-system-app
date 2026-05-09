import { useState, useEffect, useRef } from "react";
import useAuth   from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";

// ── Message Ticks ─────────────────────────────────────────────────
const MessageTicks = ({ msg, currentUserId }) => {
  const isOwn = msg.sender?._id === currentUserId || msg.sender === currentUserId;
  if (!isOwn || msg.isDeleted) return null;

  const seenByOther      = (msg.readBy || [])
    .some((id) => id.toString() !== currentUserId);
  const deliveredToOther = (msg.deliveredTo || [])
    .some((id) => id.toString() !== currentUserId);

  const showDouble = deliveredToOther || seenByOther;
  const tickColor  = seenByOther ? "text-blue" : "text-muted";

  return (
    <span className={`ml-1 text-xs tracking-tighter ${tickColor}`}>
      {showDouble ? "✓✓" : "✓"}
    </span>
  );
};

// ── Typing Indicator ──────────────────────────────────────────────
const TypingIndicator = ({ typers }) => {
  if (!typers || typers.length === 0) return null;

  const text =
    typers.length === 1 ? `${typers[0].username} is typing` :
    typers.length === 2
      ? `${typers[0].username} and ${typers[1].username} are typing` :
    "Several people are typing";

  return (
    <div className="flex items-center gap-2 py-1 min-h-6">
      <div className="flex gap-0.5 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted animate-typing"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-muted text-xs italic">{text}...</span>
    </div>
  );
};

// ── Avatar ────────────────────────────────────────────────────────
const Avatar = ({ username, isOnline, size = "sm" }) => {
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-sm",
  };
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} rounded-full bg-border flex items-center
                       justify-center text-white font-bold`}>
        {username?.[0]?.toUpperCase()}
      </div>
      {isOnline !== undefined && (
        <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2
                         border-card ${isOnline ? "bg-teal shadow-teal/50 shadow-sm"
                                                 : "bg-muted/50"}`}
        />
      )}
    </div>
  );
};

// ── Chat Page ─────────────────────────────────────────────────────
const Chat = () => {
  const { user, logout } = useAuth();
  const {
    connected, error, rooms, activeRoom,
    messages, hasMore, loadingMsgs,
    typingUsers, members,
    createRoom, joinRoom, leaveRoom,
    sendMessage, loadMoreMessages,
    markRead, startTyping, stopTyping,
    editMessage, deleteMessage,
  } = useSocket();

  const [newRoomName, setNewRoomName] = useState("");
  const [roomError,   setRoomError]   = useState("");
  const [creating,    setCreating]    = useState(false);
  const [msgBody,     setMsgBody]     = useState("");
  const [sending,     setSending]     = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [editBody,    setEditBody]    = useState("");
  const [hoveredId,   setHoveredId]   = useState(null);
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
      e.preventDefault(); handleSendMessage(e);
    }
  };

  const handleMsgInput = (e) => {
    setMsgBody(e.target.value);
    if (activeRoom && e.target.value.trim()) startTyping(activeRoom._id);
    else if (activeRoom) stopTyping(activeRoom._id);
  };

  const handleEditStart  = (msg) => { setEditingId(msg._id); setEditBody(msg.body); };
  const handleEditCancel = ()    => { setEditingId(null); setEditBody(""); };

  const handleEditSubmit = async (messageId) => {
    if (!editBody.trim()) return;
    try {
      await editMessage(messageId, editBody.trim());
      setEditingId(null); setEditBody("");
    } catch (err) { console.error("Edit error:", err); }
  };

  const handleDelete = async (messageId) => {
    try { await deleteMessage(messageId); }
    catch (err) { console.error("Delete error:", err); }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const activeTypers = activeRoom
    ? (typingUsers[activeRoom._id] || []).filter((u) => u._id !== user?._id)
    : [];

  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <div className="flex h-screen bg-dark overflow-hidden">

      {/* ── Reconnecting Banner ──────────────────────────────── */}
      {!connected && (
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-3
                         px-5 py-2 border-b
                         ${error?.includes("lost")
                           ? "bg-pink/10 border-pink/30"
                           : "bg-amber/10 border-amber/30"}`}>
          <div className="w-2 h-2 rounded-full bg-amber animate-reconnect" />
          <span className="text-amber text-xs font-semibold">
            {error || "Reconnecting..."}
          </span>
        </div>
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div className="w-64 bg-card border-r border-border flex flex-col
                      flex-shrink-0">

        {/* User info */}
        <div className="flex items-center justify-between px-4 py-3.5
                        border-b border-border">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0
                             ${connected
                               ? "bg-teal shadow-sm shadow-teal/50"
                               : "bg-pink"}`}
            />
            <span className="text-white text-sm font-bold truncate">
              {user?.username}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-muted text-xs border border-border rounded px-2 py-1
                       hover:text-light hover:border-light/30 transition-colors
                       cursor-pointer"
          >
            Logout
          </button>
        </div>

        {/* Create room */}
        <div className="px-3 py-2.5 border-b border-border">
          <form onSubmit={handleCreateRoom} className="flex gap-1.5">
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="New room..."
              className="flex-1 bg-dark border border-border rounded-md px-3 py-1.5
                         text-white text-xs placeholder-muted
                         focus:border-teal focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-teal hover:bg-teal/90 disabled:opacity-50 text-dark
                         font-bold px-3 py-1.5 rounded-md text-sm
                         transition-colors cursor-pointer"
            >
              +
            </button>
          </form>
          {roomError && (
            <p className="text-pink text-xs mt-1">{roomError}</p>
          )}
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-muted text-[10px] font-bold uppercase tracking-widest
                        px-4 py-1">
            Rooms ({rooms.length})
          </p>
          {rooms.map((room) => {
            const roomTypers = (typingUsers[room._id] || [])
              .filter((u) => u._id !== user?._id);
            const isActive = activeRoom?._id === room._id;
            return (
              <div
                key={room._id}
                onClick={() => joinRoom(room._id)}
                className={`mx-2 px-3 py-2 rounded-md cursor-pointer mb-0.5
                            transition-colors
                            ${isActive
                              ? "bg-border"
                              : "hover:bg-border/50"}`}
              >
                <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-light"}`}>
                  # {room.name}
                </p>
                {roomTypers.length > 0 && (
                  <p className="text-teal text-[10px] italic mt-0.5">
                    {roomTypers[0].username} is typing...
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Chat Area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            {/* Room header */}
            <div className="flex items-center justify-between px-5 py-3.5
                            border-b border-border bg-card flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-sm">
                  # {activeRoom.name}
                </h2>
                {activeRoom.description && (
                  <p className="text-muted text-xs mt-0.5">
                    {activeRoom.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Members toggle */}
                <button
                  onClick={() => setShowMembers((p) => !p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md
                               border text-xs font-medium transition-colors
                               cursor-pointer
                               ${showMembers
                                 ? "bg-border border-border text-white"
                                 : "bg-transparent border-border text-muted hover:text-light"}`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>{members.length}</span>
                  {onlineCount > 0 && (
                    <span className="bg-teal text-dark text-[9px] font-bold
                                     px-1.5 py-0.5 rounded-full">
                      {onlineCount} online
                    </span>
                  )}
                </button>

                <button
                  onClick={() => leaveRoom(activeRoom._id)}
                  className="text-muted text-xs border border-border rounded px-2.5
                             py-1.5 hover:text-pink hover:border-pink/30
                             transition-colors cursor-pointer"
                >
                  Leave
                </button>
              </div>
            </div>

            {/* Messages + Members */}
            <div className="flex-1 flex overflow-hidden">

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex
                              flex-col gap-0.5">
                {hasMore && (
                  <button
                    onClick={() => loadMoreMessages(activeRoom._id)}
                    disabled={loadingMsgs}
                    className="self-center bg-card border border-border text-muted
                               text-xs px-4 py-1.5 rounded-full mb-3
                               hover:text-light transition-colors cursor-pointer"
                  >
                    {loadingMsgs ? "Loading..." : "Load earlier messages"}
                  </button>
                )}

                {messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted text-sm">
                      No messages yet. Say hello! 👋
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isOwn    = msg.sender?._id === user?._id
                                || msg.sender === user?._id;
                  const showName = i === 0
                                || messages[i-1]?.sender?._id !== msg.sender?._id;
                  const isHovered = hoveredId === msg._id;
                  const isEditing = editingId === msg._id;

                  return (
                    <div
                      key={msg._id}
                      onMouseEnter={() => setHoveredId(msg._id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`flex flex-col
                                  ${isOwn ? "items-end" : "items-start"}
                                  ${showName ? "mt-3" : "mt-0.5"}`}
                    >
                      {/* Sender name */}
                      {showName && !isOwn && (
                        <span className="text-muted text-[11px] mb-1 pl-1">
                          {msg.sender?.username}
                        </span>
                      )}

                      {/* Action buttons */}
                      {isOwn && !msg.isDeleted && isHovered && !isEditing && (
                        <div className="flex gap-1 mb-1">
                          <button
                            onClick={() => handleEditStart(msg)}
                            className="bg-card border border-border text-muted
                                       hover:text-light text-[11px] px-2 py-0.5
                                       rounded transition-colors cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(msg._id)}
                            className="bg-card border border-border text-pink
                                       hover:text-pink/80 text-[11px] px-2 py-0.5
                                       rounded transition-colors cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}

                      {/* Edit input or bubble */}
                      {isEditing ? (
                        <div className="w-2/3 flex flex-col gap-1.5">
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleEditSubmit(msg._id);
                              }
                              if (e.key === "Escape") handleEditCancel();
                            }}
                            autoFocus
                            rows={2}
                            className="w-full bg-input border border-blue rounded-lg
                                       px-3 py-2 text-white text-sm outline-none
                                       resize-none font-sans leading-relaxed"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={handleEditCancel}
                              className="text-muted text-xs border border-border
                                         px-2.5 py-1 rounded cursor-pointer
                                         hover:text-light transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditSubmit(msg._id)}
                              className="bg-blue text-white text-xs font-bold
                                         px-2.5 py-1 rounded cursor-pointer
                                         hover:bg-blue/90 transition-colors"
                            >
                              Save
                            </button>
                          </div>
                          <p className="text-muted text-[10px] text-right">
                            Enter to save · Esc to cancel
                          </p>
                        </div>
                      ) : (
                        <div className={`max-w-[65%] px-3 py-2 text-sm
                                         leading-relaxed break-words
                                         ${msg.isDeleted
                                           ? "text-muted/60 italic"
                                           : isOwn
                                             ? "bg-blue text-white rounded-xl rounded-br-sm"
                                             : "bg-border text-white rounded-xl rounded-bl-sm"}`}
                        >
                          {msg.body}
                        </div>
                      )}

                      {/* Timestamp + edited + ticks */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 mt-0.5 px-1">
                          <span className="text-muted text-[10px]">
                            {formatTime(msg.createdAt)}
                          </span>
                          {msg.isEdited && !msg.isDeleted && (
                            <span className="text-muted/50 text-[10px]">
                              · edited
                            </span>
                          )}
                          <MessageTicks msg={msg} currentUserId={user?._id} />
                        </div>
                      )}
                    </div>
                  );
                })}

                <TypingIndicator typers={activeTypers} />
                <div ref={bottomRef} />
              </div>

              {/* ── Members Panel ─────────────────────────────── */}
              <div
                className={`bg-card border-l border-border flex-shrink-0
                             flex flex-col transition-all duration-300 overflow-hidden
                             ${showMembers ? "w-52" : "w-0 border-l-0"}`}
              >
                <div className="w-52 h-full flex flex-col">
                  <div className="px-4 py-3.5 border-b border-border flex-shrink-0">
                    <p className="text-muted text-[10px] font-bold uppercase
                                  tracking-widest">
                      Members — {onlineCount} online
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto py-2">
                    {members
                      .slice()
                      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                      .map((member) => (
                        <div key={member._id}
                          className="flex items-center gap-2.5 px-3 py-2
                                     rounded-md mx-1 mb-0.5 hover:bg-border/30
                                     transition-colors">
                          <Avatar
                            username={member.username}
                            isOnline={member.isOnline}
                          />
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold truncate
                                           ${member.isOnline
                                             ? "text-white"
                                             : "text-muted"}`}>
                              {member.username}
                              {member._id === user?._id && (
                                <span className="text-muted/50 font-normal">
                                  {" "}(you)
                                </span>
                              )}
                            </p>
                            <p className={`text-[10px]
                                           ${member.isOnline
                                             ? "text-teal"
                                             : "text-muted/50"}`}>
                              {member.isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                      ))}
                    {members.length === 0 && (
                      <p className="text-muted/50 text-xs px-4 py-2">
                        No members yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Message Input ─────────────────────────────────── */}
            <div className="px-5 py-4 border-t border-border flex-shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="flex gap-2.5 items-end"
              >
                <textarea
                  value={msgBody}
                  onChange={handleMsgInput}
                  onKeyDown={handleKeyDown}
                  onBlur={() => activeRoom && stopTyping(activeRoom._id)}
                  placeholder={`Message # ${activeRoom.name}`}
                  rows={1}
                  className="flex-1 bg-input border border-border/80 rounded-xl
                             px-4 py-2.5 text-white text-sm placeholder-muted
                             focus:border-blue focus:outline-none
                             resize-none leading-relaxed font-sans"
                />
                <button
                  type="submit"
                  disabled={sending || !msgBody.trim() || msgBody.length > 2000}
                  className="bg-blue hover:bg-blue/90 disabled:opacity-50
                             text-white font-bold px-5 py-2.5 rounded-xl
                             text-sm transition-colors cursor-pointer
                             flex-shrink-0"
                >
                  Send
                </button>
              </form>

              <div className="flex justify-between items-center mt-1.5">
                <p className="text-muted text-[10px]">
                  Enter to send · Shift+Enter for new line
                </p>
                {msgBody.length > 1800 && (
                  <p className={`text-[10px] ${msgBody.length > 2000
                    ? "text-pink" : "text-amber"}`}>
                    {msgBody.length}/2000
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border
                            flex items-center justify-center mb-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#6B7280" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-light text-sm font-medium">
              Select a room to start chatting
            </p>
            <p className="text-muted text-xs">
              or create a new one from the sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;