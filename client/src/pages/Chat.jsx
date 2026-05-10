import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import useAuth from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";

// ── Constants ─────────────────────────────────────────────────────
const MESSAGE_MAX_LENGTH = 2000;
const TYPING_TIMEOUT = 2000;
const SCROLL_THRESHOLD = 100;
const LONG_PRESS_DURATION = 500;

// ── Helper Functions ──────────────────────────────────────────────
const formatTime = (date) => 
  new Date(date).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });

const getSenderId = (sender) => 
  typeof sender === 'string' ? sender : sender?._id;

const isOwnMessage = (msg, currentUserId) => 
  getSenderId(msg.sender) === currentUserId;

// ── Hamburger Icon Component ──────────────────────────────────────
const HamburgerIcon = ({ open }) => (
  <div className="flex flex-col justify-center items-center w-5 h-5 gap-1">
    <span className={`block w-5 h-0.5 bg-light transition-all duration-300
                      ${open ? "rotate-45 translate-y-1.5" : ""}`} />
    <span className={`block w-5 h-0.5 bg-light transition-all duration-300
                      ${open ? "opacity-0" : ""}`} />
    <span className={`block w-5 h-0.5 bg-light transition-all duration-300
                      ${open ? "-rotate-45 -translate-y-1.5" : ""}`} />
  </div>
);

// ── Context Menu Component ────────────────────────────────────────
const MessageContextMenu = ({ message, isOwn, onEdit, onDelete, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (message.isDeleted) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-transparent" onClick={onClose} onTouchEnd={onClose} />
      
      <div
        ref={menuRef}
        className="fixed bottom-20 left-4 right-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 
                   sm:-translate-x-1/2 sm:-translate-y-1/2 bg-card border border-border 
                   rounded-lg shadow-xl overflow-hidden sm:min-w-[200px]"
      >
        <div className="py-2">
          {isOwn ? (
            <>
              <button
                onClick={() => {
                  onEdit();
                  onClose();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  onEdit();
                  onClose();
                }}
                className="w-full text-left px-4 py-3 sm:py-2 text-sm text-light 
                           hover:bg-border active:bg-border/70 transition-colors
                           flex items-center gap-3"
              >
                <span className="text-lg">✏️</span>
                <span>Edit message</span>
              </button>
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  onDelete();
                  onClose();
                }}
                className="w-full text-left px-4 py-3 sm:py-2 text-sm text-pink 
                           hover:bg-border active:bg-border/70 transition-colors
                           flex items-center gap-3 border-t border-border/50"
              >
                <span className="text-lg">🗑️</span>
                <span>Delete message</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.body);
                onClose();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText(message.body);
                onClose();
              }}
              className="w-full text-left px-4 py-3 sm:py-2 text-sm text-light 
                         hover:bg-border active:bg-border/70 transition-colors
                         flex items-center gap-3"
            >
              <span className="text-lg">📋</span>
              <span>Copy message</span>
            </button>
          )}
        </div>
        
        <button
          onClick={onClose}
          onTouchEnd={onClose}
          className="w-full text-center px-4 py-3 sm:hidden text-sm text-muted 
                     border-t border-border hover:bg-border active:bg-border/70"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Optimized Components ──────────────────────────────────────────
const MessageTicks = memo(({ msg, currentUserId }) => {
  const isOwn = isOwnMessage(msg, currentUserId);
  if (!isOwn || msg.isDeleted) return null;

  const seenByOther = (msg.readBy || []).some(id => id.toString() !== currentUserId);
  const deliveredToOther = (msg.deliveredTo || []).some(id => id.toString() !== currentUserId);
  const showDouble = deliveredToOther || seenByOther;
  const tickColor = seenByOther ? "text-blue" : "text-muted";

  return (
    <span className={`ml-1 text-xs tracking-tighter ${tickColor}`}>
      {showDouble ? "✓✓" : "✓"}
    </span>
  );
});

MessageTicks.displayName = 'MessageTicks';

const TypingIndicator = memo(({ typers }) => {
  if (!typers || typers.length === 0) return null;

  const text = typers.length === 1
    ? `${typers[0].username} is typing`
    : typers.length === 2
    ? `${typers[0].username} and ${typers[1].username} are typing`
    : "Several people are typing";

  return (
    <div className="flex items-center gap-2 py-1 min-h-6" role="status">
      <div className="flex gap-0.5 items-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
      <span className="text-muted text-xs italic">{text}...</span>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

const Avatar = memo(({ username, isOnline, size = "sm" }) => {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-8 h-8 text-sm" };
  
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} rounded-full bg-border flex items-center
                       justify-center text-white font-bold`}>
        {username?.[0]?.toUpperCase() || "?"}
      </div>
      {isOnline !== undefined && (
        <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full
                         border-2 border-card transition-colors
                         ${isOnline ? "bg-teal shadow-sm shadow-teal/50" : "bg-muted/50"}`}
             aria-label={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

// ── Custom Hook for Long Press ────────────────────────────────────
const useLongPress = (onLongPress, onClick, duration = LONG_PRESS_DURATION) => {
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const targetRef = useRef(null);

  const start = useCallback((e) => {
    if (e.button === 2) return;
    
    isLongPressRef.current = false;
    targetRef.current = e.target;
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(e);
    }, duration);
  }, [onLongPress, duration]);

  const cancel = useCallback((e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (!isLongPressRef.current && onClick && targetRef.current === e.target) {
      onClick(e);
    }
    
    targetRef.current = null;
  }, [onClick]);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };
};

// ── Custom Hook for Auto Scroll ───────────────────────────────────
const useAutoScroll = (messages, hasMore) => {
  const bottomRef = useRef(null);
  const prevMessagesLength = useRef(messages?.length || 0);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    const container = bottomRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLength.current;
    const isLoadingMore = hasMore && messages.length > 0;
    
    if (isNewMessage && shouldAutoScroll.current && !isLoadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    
    prevMessagesLength.current = messages.length;
  }, [messages, hasMore]);

  return bottomRef;
};

// ── Message Component (Simplified - No Hover Buttons) ─────────────
const MessageBubble = memo(({ 
  message, 
  isOwn, 
  showName,
  isEditing,
  onEditStart,
  onEditSubmit,
  onEditCancel,
  onDelete,
  currentUserId,
  editBody,
  setEditBody,
  onContextMenu
}) => {
  const longPressProps = useLongPress(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, message);
    },
    null,
    LONG_PRESS_DURATION
  );

  if (isEditing) {
    return (
      <div className="w-4/5 sm:w-2/3 flex flex-col gap-1.5">
        <textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEditSubmit(message._id);
            }
            if (e.key === "Escape") onEditCancel();
          }}
          autoFocus
          rows={2}
          className="w-full bg-input border border-blue rounded-lg
                     px-3 py-2 text-white text-sm outline-none resize-none"
        />
        <div className="flex gap-1.5 justify-end">
          <button 
            onClick={onEditCancel}
            onTouchEnd={onEditCancel}
            className="text-muted text-xs border border-border px-2.5 py-1 rounded hover:text-light transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={() => onEditSubmit(message._id)}
            onTouchEnd={() => onEditSubmit(message._id)}
            className="bg-blue text-white text-xs font-bold px-2.5 py-1 rounded hover:bg-blue/90 transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
        <p className="text-muted text-[10px] text-right">
          Enter to save · Esc to cancel
        </p>
      </div>
    );
  }

  return (
    <div
      {...longPressProps}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, message);
      }}
      className={`flex flex-col w-full ${isOwn ? "items-end" : "items-start"}`}
    >
      {showName && !isOwn && (
        <span className="text-muted text-[11px] mb-1 pl-1">
          {typeof message.sender === 'object' ? message.sender.username : 'Unknown'}
        </span>
      )}

      <div className={`
        max-w-[80%] sm:max-w-[70%] md:max-w-[65%]
        px-3 py-2 text-sm leading-relaxed break-words
        transition-all duration-200
        ${message.isDeleted
          ? "text-muted/60 italic"
          : isOwn
            ? "bg-blue text-white rounded-xl rounded-br-sm"
            : "bg-border text-white rounded-xl rounded-bl-sm"
        }
      `}>
        {message.body}
      </div>

      <div className="flex items-center gap-1 mt-0.5 px-1">
        <span className="text-muted text-[10px]">
          {formatTime(message.createdAt)}
        </span>
        {message.isEdited && !message.isDeleted && (
          <span className="text-muted/50 text-[10px]">· edited</span>
        )}
        <MessageTicks msg={message} currentUserId={currentUserId} />
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ── Main Chat Component ──────────────────────────────────────────
const Chat = () => {
  const { user, logout } = useAuth();
  const socketData = useSocket();
  
  const {
    connected = false, 
    error = null, 
    rooms = [], 
    activeRoom = null,
    messages = [], 
    hasMore = false, 
    loadingMsgs = false,
    typingUsers = {}, 
    members = [],
    createRoom = async () => {}, 
    joinRoom = async () => {}, 
    leaveRoom = async () => {},
    sendMessage = async () => {}, 
    loadMoreMessages = async () => {},
    markRead = () => {}, 
    startTyping = () => {}, 
    stopTyping = () => {},
    editMessage = async () => {}, 
    deleteMessage = async () => {},
  } = socketData || {};

  const [newRoomName, setNewRoomName] = useState("");
  const [roomError, setRoomError] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useAutoScroll(messages, hasMore);

  const activeTypers = useMemo(() => 
    activeRoom ? (typingUsers[activeRoom._id] || []).filter(u => u._id !== user?._id) : [],
    [typingUsers, activeRoom, user]
  );

  const onlineCount = useMemo(() => 
    members.filter(m => m.isOnline).length,
    [members]
  );

  const handleTyping = useCallback((roomId, isTyping) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (isTyping) {
      startTyping(roomId);
      typingTimeoutRef.current = setTimeout(() => stopTyping(roomId), TYPING_TIMEOUT);
    } else {
      stopTyping(roomId);
    }
  }, [startTyping, stopTyping]);

  const handleMessageInput = useCallback((e) => {
    const value = e.target.value;
    setMessageBody(value);
    
    if (activeRoom && value.trim()) {
      handleTyping(activeRoom._id, true);
    } else if (activeRoom) {
      handleTyping(activeRoom._id, false);
    }
  }, [activeRoom, handleTyping]);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!messageBody.trim() || !activeRoom || isSending) return;
    
    const trimmedBody = messageBody.trim();
    if (trimmedBody.length > MESSAGE_MAX_LENGTH) return;

    setIsSending(true);
    handleTyping(activeRoom._id, false);
    
    try {
      await sendMessage(activeRoom._id, trimmedBody);
      setMessageBody("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setIsSending(false);
    }
  }, [messageBody, activeRoom, isSending, sendMessage, handleTyping]);

  const handleCreateRoom = useCallback(async (e) => {
    e.preventDefault();
    const trimmedName = newRoomName.trim();
    if (!trimmedName) return;
    
    setIsCreatingRoom(true);
    setRoomError("");
    
    try {
      await createRoom(trimmedName);
      setNewRoomName("");
      setShowSidebar(false);
    } catch (err) {
      setRoomError(err.message || "Failed to create room");
    } finally {
      setIsCreatingRoom(false);
    }
  }, [newRoomName, createRoom]);

  const handleJoinRoom = useCallback(async (roomId) => {
    await joinRoom(roomId);
    setShowSidebar(false);
  }, [joinRoom]);

  const handleEditMessage = useCallback(async (messageId) => {
    if (!editingMessage?.body.trim()) return;
    
    try {
      await editMessage(messageId, editingMessage.body.trim());
      setEditingMessage(null);
      setContextMenu(null);
    } catch (err) {
      console.error("Edit error:", err);
    }
  }, [editingMessage, editMessage]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await deleteMessage(messageId);
        setContextMenu(null);
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  }, [deleteMessage]);

  const handleContextMenu = useCallback((e, message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ message });
  }, []);

  const handleEditStart = useCallback((message) => {
    setEditingMessage({ id: message._id, body: message.body });
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!activeRoom || messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.readBy?.includes(user?._id)) {
      markRead(lastMessage._id);
    }
  }, [messages, activeRoom, user, markRead]);

  useEffect(() => {
    if (!activeRoom) {
      setShowMembers(false);
      setContextMenu(null);
      setEditingMessage(null);
    }
  }, [activeRoom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [messageBody]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const SidebarContent = useCallback(() => (
    <>
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0
                           ${connected ? "bg-teal shadow-sm shadow-teal/50" : "bg-pink"}`} />
          <span className="text-white text-sm font-bold truncate">
            {user?.username || "User"}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-muted text-xs border border-border rounded px-2 py-1
                     hover:text-light hover:border-light/30 transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>

      <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
        <form onSubmit={handleCreateRoom} className="flex gap-1.5">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="New room..."
            maxLength={50}
            className="flex-1 bg-dark border border-border rounded-md px-3 py-2
                       text-white text-xs placeholder-muted
                       focus:border-teal focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isCreatingRoom}
            className="bg-teal hover:bg-teal/90 disabled:opacity-50
                       text-dark font-bold px-3 rounded-md text-sm transition-colors cursor-pointer"
          >
            +
          </button>
        </form>
        {roomError && <p className="text-pink text-xs mt-1">{roomError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <p className="text-muted text-[10px] font-bold uppercase tracking-widest px-4 py-1">
          Rooms ({rooms.length})
        </p>
        {rooms.length === 0 && (
          <p className="text-muted/50 text-xs px-4 py-2">No rooms yet. Create one!</p>
        )}
        {rooms.map(room => {
          const roomTypers = (typingUsers[room._id] || []).filter(u => u._id !== user?._id);
          const isActive = activeRoom?._id === room._id;
          
          return (
            <button
              key={room._id}
              onClick={() => handleJoinRoom(room._id)}
              className={`w-full text-left mx-2 px-3 py-2.5 rounded-md mb-0.5 transition-colors cursor-pointer
                         ${isActive ? "bg-border" : "hover:bg-border/50"}`}
            >
              <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-light"}`}>
                # {room.name}
              </p>
              {roomTypers.length > 0 && (
                <p className="text-teal text-[10px] italic mt-0.5">
                  {roomTypers[0].username} is typing...
                </p>
              )}
            </button>
          );
        })}
      </div>
    </>
  ), [connected, user, logout, newRoomName, isCreatingRoom, roomError, rooms, typingUsers, activeRoom, handleCreateRoom, handleJoinRoom]);

  if (!socketData) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      {!connected && (
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-5 py-2 border-b
                         ${error?.includes("lost") ? "bg-pink/10 border-pink/30" : "bg-amber/10 border-amber/30"}`}>
          <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          <span className="text-amber text-xs font-semibold">
            {error || "Reconnecting..."}
          </span>
        </div>
      )}

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          isOwn={isOwnMessage(contextMenu.message, user?._id)}
          onEdit={() => handleEditStart(contextMenu.message)}
          onDelete={() => handleDeleteMessage(contextMenu.message._id)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showSidebar && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowSidebar(false)}>
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="hidden md:flex w-64 bg-card border-r border-border flex-col flex-shrink-0">
        <SidebarContent />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-border transition-colors cursor-pointer flex-shrink-0"
                  aria-label="Open sidebar"
                >
                  <HamburgerIcon open={false} />
                </button>

                <div>
                  <h2 className="text-white font-bold text-sm"># {activeRoom.name}</h2>
                  {activeRoom.description && (
                    <p className="text-muted text-xs mt-0.5">{activeRoom.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMembers(prev => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium
                             transition-colors cursor-pointer ${showMembers 
                               ? "bg-border border-border text-white" 
                               : "bg-transparent border-border text-muted hover:text-light"}`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span className="hidden sm:inline">{members.length}</span>
                  {onlineCount > 0 && (
                    <span className="bg-teal text-dark text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {onlineCount} online
                    </span>
                  )}
                </button>

                <button
                  onClick={() => leaveRoom(activeRoom._id)}
                  className="text-muted text-xs border border-border rounded px-2 py-1.5
                             hover:text-pink hover:border-pink/30 transition-colors cursor-pointer"
                >
                  Leave
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4">
                {hasMore && (
                  <button
                    onClick={() => loadMoreMessages(activeRoom._id)}
                    disabled={loadingMsgs}
                    className="block mx-auto bg-card border border-border text-muted
                               text-xs px-4 py-1.5 rounded-full mb-3 hover:text-light
                               transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loadingMsgs ? "Loading..." : "Load earlier messages"}
                  </button>
                )}

                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted text-sm">No messages yet. Say hello! 👋</p>
                  </div>
                )}

                {messages.map((msg, index) => {
                  const isOwn = isOwnMessage(msg, user?._id);
                  const showName = index === 0 || getSenderId(messages[index-1]?.sender) !== getSenderId(msg.sender);
                  const isEditing = editingMessage?.id === msg._id;

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isOwn ? "items-end" : "items-start"} ${showName ? "mt-3" : "mt-0.5"}`}
                    >
                      <MessageBubble
                        message={msg}
                        isOwn={isOwn}
                        showName={showName}
                        isEditing={isEditing}
                        onEditStart={() => handleEditStart(msg)}
                        onEditSubmit={handleEditMessage}
                        onEditCancel={() => setEditingMessage(null)}
                        onDelete={() => handleDeleteMessage(msg._id)}
                        currentUserId={user?._id}
                        editBody={editingMessage?.body || ""}
                        setEditBody={(body) => setEditingMessage(prev => prev ? { ...prev, body } : null)}
                        onContextMenu={handleContextMenu}
                      />
                    </div>
                  );
                })}

                <TypingIndicator typers={activeTypers} />
                <div ref={bottomRef} />
              </div>

              <div className={`bg-card border-l border-border flex-shrink-0 transition-all duration-300
                              overflow-hidden ${showMembers ? "w-48 md:w-52" : "w-0 border-l-0"}`}>
                <div className="w-48 md:w-52 h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-muted text-[10px] font-bold uppercase tracking-widest">
                      Members — {onlineCount} online
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2">
                    {[...members]
                      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                      .map(member => (
                        <div key={member._id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-border/30 transition-colors">
                          <Avatar username={member.username} isOnline={member.isOnline} />
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold truncate ${member.isOnline ? "text-white" : "text-muted"}`}>
                              {member.username}
                              {member._id === user?._id && <span className="text-muted/50"> (you)</span>}
                            </p>
                            <p className={`text-[10px] ${member.isOnline ? "text-teal" : "text-muted/50"}`}>
                              {member.isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 md:px-5 py-3 border-t border-border flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={messageBody}
                  onChange={handleMessageInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  onBlur={() => activeRoom && handleTyping(activeRoom._id, false)}
                  placeholder={`Message # ${activeRoom.name}`}
                  maxLength={MESSAGE_MAX_LENGTH}
                  rows={1}
                  className="flex-1 bg-input border border-border/80 rounded-xl
                             px-4 py-2.5 text-white text-sm placeholder-muted
                             focus:border-blue focus:outline-none resize-none"
                  style={{ overflow: 'hidden' }}
                />
                <button
                  type="submit"
                  disabled={isSending || !messageBody.trim() || messageBody.length > MESSAGE_MAX_LENGTH}
                  className="bg-blue hover:bg-blue/90 disabled:opacity-50
                             text-white font-bold px-4 md:px-5 py-2.5 rounded-xl
                             text-sm transition-colors flex-shrink-0 cursor-pointer"
                >
                  <span className="hidden sm:inline">Send</span>
                  <svg className="sm:hidden w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
              
              <div className="flex justify-between items-center mt-1.5">
                <p className="text-muted text-[10px] hidden sm:block">
                  Enter to send · Shift+Enter for new line
                </p>
                {messageBody.length > MESSAGE_MAX_LENGTH - 200 && (
                  <p className={`text-[10px] ml-auto ${
                    messageBody.length > MESSAGE_MAX_LENGTH ? "text-pink" : "text-amber"
                  }`}>
                    {messageBody.length}/{MESSAGE_MAX_LENGTH}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden bg-card border border-border rounded-xl px-5 py-3
                         text-light text-sm font-medium hover:bg-border/50 transition-colors cursor-pointer"
            >
              Browse rooms
            </button>
            
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-light text-sm font-medium">Select a room to start chatting</p>
            <p className="text-muted text-xs text-center">or create a new one from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;