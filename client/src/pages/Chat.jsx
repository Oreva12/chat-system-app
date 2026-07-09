import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import useAuth from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";
import EmojiPickerComponent from "../components/EmojiPicker";
import ImageUpload from "../components/ImageUpload";

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

// ── Fullscreen Image Modal ────────────────────────────────────────
const ImageModal = ({ src, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-dark/95 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full size image viewer"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-border flex items-center justify-center text-light hover:bg-light/20 transition-colors cursor-pointer z-10"
        aria-label="Close image viewer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <img
        src={src}
        alt="Full size"
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-6 left-0 right-0 text-center text-muted text-xs">
        Tap anywhere to close
      </p>
    </div>
  );
};

// ── Hamburger Icon Component ──────────────────────────────────────
const HamburgerIcon = ({ open }) => (
  <div className="flex flex-col justify-center items-center w-5 h-5 gap-1" aria-hidden="true">
    <span className={`block w-5 h-0.5 bg-light transition-all duration-300 ${open ? "rotate-45 translate-y-1.5" : ""}`} />
    <span className={`block w-5 h-0.5 bg-light transition-all duration-300 ${open ? "opacity-0" : ""}`} />
    <span className={`block w-5 h-0.5 bg-light transition-all duration-300 ${open ? "-rotate-45 -translate-y-1.5" : ""}`} />
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
    <div className="fixed inset-0 z-[999]" role="dialog" aria-modal="true" aria-label="Message actions">
      <div className="absolute inset-0 bg-transparent" onClick={onClose} onTouchEnd={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        className="fixed bottom-20 left-4 right-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-card border border-border rounded-lg shadow-xl overflow-hidden sm:min-w-[200px]"
        role="menu"
        aria-label="Message context menu"
      >
        <div className="py-2">
          {isOwn ? (
            <>
              <button
                onClick={() => { onEdit(); onClose(); }}
                onTouchEnd={(e) => { e.preventDefault(); onEdit(); onClose(); }}
                className="w-full text-left px-4 py-3 sm:py-2 text-sm text-light hover:bg-border active:bg-border/70 transition-colors flex items-center gap-3"
                role="menuitem"
                aria-label="Edit message"
              >
                <span className="text-lg" aria-hidden="true">✏️</span>
                <span>Edit message</span>
              </button>
              <button
                onClick={() => { onDelete(); onClose(); }}
                onTouchEnd={(e) => { e.preventDefault(); onDelete(); onClose(); }}
                className="w-full text-left px-4 py-3 sm:py-2 text-sm text-pink hover:bg-border active:bg-border/70 transition-colors flex items-center gap-3 border-t border-border/50"
                role="menuitem"
                aria-label="Delete message"
              >
                <span className="text-lg" aria-hidden="true">🗑️</span>
                <span>Delete message</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => { navigator.clipboard.writeText(message.body); onClose(); }}
              onTouchEnd={(e) => { e.preventDefault(); navigator.clipboard.writeText(message.body); onClose(); }}
              className="w-full text-left px-4 py-3 sm:py-2 text-sm text-light hover:bg-border active:bg-border/70 transition-colors flex items-center gap-3"
              role="menuitem"
              aria-label="Copy message text"
            >
              <span className="text-lg" aria-hidden="true">📋</span>
              <span>Copy message</span>
            </button>
          )}
        </div>
        <button onClick={onClose} onTouchEnd={onClose} className="w-full text-center px-4 py-3 sm:hidden text-sm text-muted border-t border-border hover:bg-border active:bg-border/70" aria-label="Cancel">
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
    <span className={`ml-1 text-xs tracking-tighter ${tickColor}`} aria-label={seenByOther ? "Read" : "Delivered"}>
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
    <div className="flex items-center gap-2 py-1 min-h-6" role="status" aria-live="polite" aria-label={text}>
      <div className="flex gap-0.5 items-center" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
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
    <div className="relative flex-shrink-0" role="img" aria-label={`Avatar for ${username}`}>
      <div className={`${sizes[size]} rounded-full bg-border flex items-center justify-center text-white font-bold`}>
        {username?.[0]?.toUpperCase() || "?"}
      </div>
      {isOnline !== undefined && (
        <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-card transition-colors ${isOnline ? "bg-teal shadow-sm shadow-teal/50" : "bg-muted/50"}`}
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

// ── Message Component ─────────────────────────────────────────────
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
  onContextMenu,
  onImageClick
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
          aria-label="Edit message text"
          className="w-full bg-input border border-blue rounded-lg px-3 py-2 text-white text-sm outline-none resize-none"
        />
        <div className="flex gap-1.5 justify-end">
          <button onClick={onEditCancel} onTouchEnd={onEditCancel} className="text-muted text-xs border border-border px-2.5 py-1 rounded hover:text-light transition-colors cursor-pointer" aria-label="Cancel editing">
            Cancel
          </button>
          <button onClick={() => onEditSubmit(message._id)} onTouchEnd={() => onEditSubmit(message._id)} className="bg-blue text-white text-xs font-bold px-2.5 py-1 rounded hover:bg-blue/90 transition-colors cursor-pointer" aria-label="Save edited message">
            Save
          </button>
        </div>
        <p className="text-muted text-[10px] text-right">Enter to save · Esc to cancel</p>
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

      {message.type === "image" ? (
        <div className="overflow-hidden rounded-xl rounded-br-sm cursor-pointer group relative max-w-[80%] sm:max-w-[70%] md:max-w-[65%]" onClick={() => onImageClick(message.body)}>
          <img 
            src={message.body} 
            alt="Shared image" 
            loading="lazy"
            decoding="async"
            className="max-w-[280px] w-full object-cover group-hover:opacity-90 transition-opacity rounded-xl" 
            style={{ maxHeight: "320px", minWidth: "160px" }} 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-dark/40 rounded-xl">
            <span className="text-white text-xs font-medium bg-dark/60 px-3 py-1 rounded-full">Click to view</span>
          </div>
        </div>
      ) : (
        <div className={`
          max-w-[80%] sm:max-w-[70%] md:max-w-[65%]
          ${message.isDeleted
            ? "text-muted/60 italic text-sm px-3 py-2"
            : isOwn
              ? "bg-blue text-white rounded-xl rounded-br-sm px-3 py-2 text-sm leading-relaxed break-words"
              : "bg-border text-white rounded-xl rounded-bl-sm px-3 py-2 text-sm leading-relaxed break-words"
          }
        `}>
          {message.isDeleted ? "This message was deleted" : message.body}
        </div>
      )}

      <div className="flex items-center gap-1 mt-0.5 px-1">
        <span className="text-muted text-[10px]">{formatTime(message.createdAt)}</span>
        {message.isEdited && !message.isDeleted && (<span className="text-muted/50 text-[10px]">· edited</span>)}
        <MessageTicks msg={message} currentUserId={currentUserId} />
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ── User Search Modal with Focus Trap ─────────────────────────────
const UserSearchModal = ({ users, onSelect, onClose, loading, search, onSearch }) => {
  const modalRef = useRef(null);

  // Trap focus inside modal
  useEffect(() => {
    const focusable = modalRef.current?.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];

    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    first?.focus();
    return () => document.removeEventListener("keydown", handleTab);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/90 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dm-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <h3 id="dm-modal-title" className="text-white font-bold text-sm">
            New Direct Message
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-md hover:bg-border flex items-center justify-center text-muted hover:text-light transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search users..."
            autoFocus
            aria-label="Search users"
            className="w-full bg-dark border border-border rounded-lg px-3 py-2 text-white text-sm placeholder-muted focus:border-blue focus:outline-none transition-colors"
          />
        </div>

        <div
          className="max-h-72 overflow-y-auto py-2"
          role="listbox"
          aria-label="Users"
        >
          {users.length === 0 ? (
            <p className="text-muted text-sm text-center py-6">
              No other users found
            </p>
          ) : (
            users
              .filter((u) =>
                u.username.toLowerCase().includes(search.toLowerCase())
              )
              .map((u) => (
                <button
                  key={u._id}
                  onClick={() => onSelect(u._id)}
                  disabled={loading}
                  role="option"
                  aria-selected="false"
                  aria-label={`Start DM with ${u.username}, ${u.isOnline ? "online" : "offline"}`}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-border/50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center text-blue text-sm font-bold"
                      aria-hidden="true"
                    >
                      {u.username[0]?.toUpperCase()}
                    </div>
                    {u.isOnline && (
                      <div
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-teal border-2 border-card"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {u.username}
                    </p>
                    <p className={`text-xs ${u.isOnline ? "text-teal" : "text-muted"}`}>
                      {u.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Room Created Modal (for easy ID copying) ──────────────────────
const RoomCreatedModal = ({ roomName, roomId, roomType, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/90 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="room-created-title">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <h3 id="room-created-title" className="text-white font-bold text-sm">Room Created! 🎉</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-border flex items-center justify-center text-muted hover:text-light transition-colors cursor-pointer" aria-label="Close">×</button>
        </div>
        <div className="p-4">
          <p className="text-white text-sm mb-2">
            Room "<span className="text-teal font-semibold">{roomName}</span>" created as <span className="text-amber font-semibold">{roomType}</span>
          </p>
          
          {roomType !== "public" && (
            <>
              <p className="text-muted text-xs mb-2 mt-3">Share this ID with people you want to invite:</p>
              <div className="bg-dark border border-border rounded-lg p-3 mb-3">
                <code className="text-blue text-xs font-mono break-all select-all" aria-label="Room ID">{roomId}</code>
              </div>
              <button
                onClick={handleCopy}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2
                  ${copied 
                    ? "bg-green-500/20 text-green-500 border border-green-500/30" 
                    : "bg-blue/20 text-blue border border-blue/30 hover:bg-blue/30"
                  }`}
                aria-label={copied ? "Copied to clipboard" : "Copy room ID to clipboard"}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Room ID
                  </>
                )}
              </button>
              <p className="text-muted text-[10px] text-center mt-3">
                Others can use the "Join Private Room" button with this ID
              </p>
            </>
          )}
          
          {roomType === "public" && (
            <p className="text-muted text-xs text-center mt-2">
              Your public room is now visible to everyone in the rooms list!
            </p>
          )}
          
          <button
            onClick={onClose}
            className="w-full mt-4 bg-border text-light py-2 rounded-lg text-sm hover:bg-border/70 transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Join Private Room Modal ──────────────────────────────────────
const JoinRoomModal = ({ onClose, onJoin, loading }) => {
  const [roomId, setRoomId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    await onJoin(roomId.trim());
    setRoomId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/90 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="join-room-title">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <h3 id="join-room-title" className="text-white font-bold text-sm">Join Private Room</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-border flex items-center justify-center text-muted hover:text-light transition-colors cursor-pointer" aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="text-muted text-xs font-medium mb-1 block" htmlFor="room-id-input">Room ID</label>
            <input
              id="room-id-input"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter the room ID..."
              className="w-full bg-dark border border-border rounded-lg px-3 py-2 text-white text-sm placeholder-muted focus:border-blue focus:outline-none transition-colors"
              autoFocus
              aria-label="Room ID"
            />
            <p className="text-muted text-[10px] mt-1">Ask the room creator to share the room ID</p>
          </div>
          <button
            type="submit"
            disabled={loading || !roomId.trim()}
            className="w-full bg-blue hover:bg-blue/90 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer"
            aria-label={loading ? "Joining..." : "Join room"}
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Sidebar Content Component ─────────────────────────────────
const SidebarContent = memo(({ 
  connected, 
  user, 
  logout, 
  onCreateRoom,
  onDeleteRoom,
  rooms, 
  typingUsers, 
  activeRoom, 
  onJoinRoom,
  users, 
  onOpenDMList,
  onOpenJoinModal
}) => {
  const [localRoomName, setLocalRoomName] = useState("");
  const [localRoomType, setLocalRoomType] = useState("public");
  const [localRoomError, setLocalRoomError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = localRoomName.trim();
    if (!trimmedName) return;
    
    setIsCreating(true);
    setLocalRoomError("");
    
    try {
      await onCreateRoom(trimmedName, "", localRoomType);
      setLocalRoomName("");
      setLocalRoomType("public");
    } catch (err) {
      setLocalRoomError(err.message || "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomName, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete room "${roomName}"? This action cannot be undone.`)) {
      try {
        await onDeleteRoom(roomId);
      } catch (err) {
        alert(err);
      }
    }
  };

  // Filter rooms: show public rooms + private/invite rooms user is member of
  const visibleRooms = useMemo(() => {
    return rooms.filter(room => {
      if (room.isDirect) return false;
      if (room.type === "public") return true;
      const isMember = room.members?.includes(user?._id);
      const isAdmin = room.admins?.includes(user?._id);
      return isMember || isAdmin;
    });
  }, [rooms, user]);

  const privateRooms = useMemo(() => {
    return visibleRooms.filter(room => room.type !== "public");
  }, [visibleRooms]);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? "bg-teal shadow-sm shadow-teal/50" : "bg-pink"}`} aria-label={connected ? "Connected" : "Disconnected"} />
          <span className="text-white text-sm font-bold truncate">{user?.username || "User"}</span>
        </div>
        <button onClick={logout} className="text-muted text-xs border border-border rounded px-2 py-1 hover:text-light hover:border-light/30 transition-colors cursor-pointer" aria-label="Log out of ChatApp">
          Logout
        </button>
      </div>

      {/* Create room */}
      <div className="px-3 py-2.5 border-b border-border flex-shrink-0" aria-label="Create new room">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            <input
              value={localRoomName}
              onChange={(e) => setLocalRoomName(e.target.value)}
              placeholder="New room..."
              maxLength={50}
              aria-label="Room name"
              className="flex-1 bg-dark border border-border rounded-md px-3 py-2 text-white text-xs placeholder-muted focus:border-teal focus:outline-none transition-colors"
            />
            <button type="submit" disabled={isCreating} className="bg-teal hover:bg-teal/90 disabled:opacity-50 text-dark font-bold px-3 rounded-md text-sm transition-colors cursor-pointer" aria-label="Create room">
              +
            </button>
          </div>
          <div className="flex gap-1" role="radiogroup" aria-label="Room type">
            {["public", "private", "invite"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLocalRoomType(t)}
                className={`flex-1 text-[10px] font-medium py-1 rounded transition-colors cursor-pointer capitalize
                  ${localRoomType === t
                    ? t === "public"
                      ? "bg-teal/20 text-teal border border-teal/30"
                      : t === "private"
                      ? "bg-amber/20 text-amber border border-amber/30"
                      : "bg-pink/20 text-pink border border-pink/30"
                    : "bg-dark text-muted border border-border"
                  }`}
                aria-pressed={localRoomType === t}
              >
                {t === "public" ? "🌐" : t === "private" ? "🔒" : "✉️"} {t}
              </button>
            ))}
          </div>
        </form>
        {localRoomError && <p className="text-pink text-xs mt-1">{localRoomError}</p>}
      </div>

      {/* Join Private Room Button */}
      <div className="px-3 py-2 border-b border-border">
        <button
          onClick={onOpenJoinModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue/10 text-blue border border-blue/30 hover:bg-blue/20 transition-colors cursor-pointer text-xs font-medium"
          aria-label="Join private room with ID"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Join Private Room
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Public Rooms Section */}
        <p className="text-muted text-[10px] font-bold uppercase tracking-widest px-4 py-1">
          Public Rooms ({visibleRooms.filter(r => r.type === "public").length})
        </p>
        {visibleRooms.filter(r => r.type === "public").length === 0 && (
          <p className="text-muted/50 text-xs px-4 py-2">No public rooms yet. Create one!</p>
        )}
        <ul role="list" aria-label="Available rooms" className="flex-1 overflow-y-auto py-2">
          {visibleRooms.filter(room => room.type === "public").map(room => {
            const roomTypers = (typingUsers[room._id] || []).filter(u => u._id !== user?._id);
            const isActive = activeRoom?._id === room._id;
            const isAdmin = room.admins?.includes(user?._id);
            
            return (
              <li key={room._id} role="listitem">
                <div className={`group mx-2 px-3 py-2.5 rounded-md mb-0.5 transition-colors ${isActive ? "bg-border" : "hover:bg-border/50"}`}>
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={() => onJoinRoom(room._id)} 
                      className="flex items-center gap-1.5 flex-1 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      aria-label={`Join ${room.name} room${room.type !== "public" ? ` (${room.type})` : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onJoinRoom(room._id);
                        }
                      }}
                    >
                      <span className="text-muted text-xs" aria-hidden="true">#</span>
                      <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-light"}`}>{room.name}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteRoom(room._id, room.name, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-pink cursor-pointer ml-2 flex-shrink-0"
                        title="Delete room"
                        aria-label={`Delete room ${room.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {roomTypers.length > 0 && (<p className="text-teal text-[10px] italic mt-0.5 ml-5">{roomTypers[0].username} is typing...</p>)}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Private/Invite Rooms Section - Only if user has access */}
        {privateRooms.length > 0 && (
          <>
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest px-4 py-1 mt-3">
              Your Private Rooms ({privateRooms.length})
            </p>
            <ul role="list" aria-label="Private rooms">
              {privateRooms.map(room => {
                const roomTypers = (typingUsers[room._id] || []).filter(u => u._id !== user?._id);
                const isActive = activeRoom?._id === room._id;
                const isAdmin = room.admins?.includes(user?._id);
                
                return (
                  <li key={room._id} role="listitem">
                    <div className={`group mx-2 px-3 py-2.5 rounded-md mb-0.5 transition-colors ${isActive ? "bg-border" : "hover:bg-border/50"}`}>
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => onJoinRoom(room._id)} 
                          className="flex items-center gap-1.5 flex-1 cursor-pointer"
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActive}
                          aria-label={`Join ${room.name} room${room.type !== "public" ? ` (${room.type})` : ""}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onJoinRoom(room._id);
                            }
                          }}
                        >
                          <span className="text-muted text-xs" aria-hidden="true">{room.type === "private" ? "🔒" : "✉️"}</span>
                          <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-light"}`}>{room.name}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDeleteRoom(room._id, room.name, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-pink cursor-pointer ml-2 flex-shrink-0"
                            title="Delete room"
                            aria-label={`Delete room ${room.name}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      {roomTypers.length > 0 && (<p className="text-teal text-[10px] italic mt-0.5 ml-5">{roomTypers[0].username} is typing...</p>)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Direct Messages section */}
        <div className="border-t border-border mt-2 pt-2 px-2">
          <button onClick={onOpenDMList} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-muted hover:text-light hover:bg-border/50 transition-colors cursor-pointer text-sm" aria-label="Start new direct message">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="font-medium">New Direct Message</span>
            <span className="ml-auto text-xs bg-blue/20 text-blue px-1.5 py-0.5 rounded-full">DM</span>
          </button>
        </div>

        {/* DM rooms list */}
        {rooms.filter((r) => r.isDirect).length > 0 && (
          <div className="px-2 pb-2">
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest px-3 py-1 mt-1">Direct Messages</p>
            {rooms.filter((r) => r.isDirect).map((room) => {
              const ids = room.name.replace("dm_", "").split("_");
              const otherId = ids.find((id) => id !== user?._id);
              const otherUser = users.find((u) => u._id?.toString() === otherId);
              const displayName = otherUser?.username || "Direct Message";
              const isActive = activeRoom?._id === room._id;

              return (
                <div key={room._id} onClick={() => onJoinRoom(room._id)} className={`flex items-center gap-2.5 mx-1 px-3 py-2 rounded-md cursor-pointer mb-0.5 transition-colors ${isActive ? "bg-border" : "hover:bg-border/50"}`}>
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-blue/20 flex items-center justify-center text-blue text-xs font-bold" aria-hidden="true">{displayName[0]?.toUpperCase()}</div>
                    {otherUser?.isOnline && (<div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-teal border-2 border-card" aria-label="Online" />)}
                  </div>
                  <p className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-light"}`}>{displayName}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
});

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
    users = [],
    fetchUsers = async () => {},
    startDM = async () => {},
    createRoom = async () => {}, 
    deleteRoom = async () => {},
    joinRoom = async () => {}, 
    leaveRoom = async () => {},
    sendMessage = async () => {}, 
    loadMoreMessages = async () => {},
    markRead = () => {}, 
    startTyping = () => {}, 
    stopTyping = () => {},
    editMessage = async () => {}, 
    deleteMessage = async () => {},
    notifications = [],
    requestJoin = async () => {},
    approveMember = async () => {},
    rejectMember = async () => {},
    acceptInvite = async () => {},
    dismissNotification = () => {},
  } = socketData || {};

  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningPrivateRoom, setJoiningPrivateRoom] = useState(false);
  const [showRoomCreatedModal, setShowRoomCreatedModal] = useState(false);
  const [createdRoomInfo, setCreatedRoomInfo] = useState(null);
  
  // DM State
  const [showDMList, setShowDMList] = useState(false);
  const [dmLoading, setDmLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useAutoScroll(messages, hasMore);
  const emojiButtonRef = useRef(null);

  const activeTypers = useMemo(() => 
    activeRoom ? (typingUsers[activeRoom._id] || []).filter(u => u._id !== user?._id) : [],
    [typingUsers, activeRoom, user]
  );

  const onlineCount = useMemo(() => 
    members.filter(m => m.isOnline).length,
    [members]
  );

  // DM Handlers
  const handleOpenDMList = async () => {
    setShowDMList(true);
    try { 
      await fetchUsers(); 
    } catch (err) { 
      console.error("Failed to fetch users:", err); 
    }
  };

  const handleStartDM = async (targetUserId) => {
    setDmLoading(true);
    try {
      await startDM(targetUserId);
      setShowDMList(false);
      setShowSidebar(false);
      setUserSearch("");
    } catch (err) { 
      console.error("DM error:", err); 
    } finally { 
      setDmLoading(false); 
    }
  };

  const handleTyping = useCallback((roomId, isTyping) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (isTyping) {
      startTyping(roomId);
      typingTimeoutRef.current = setTimeout(() => stopTyping(roomId), TYPING_TIMEOUT);
    } else {
      stopTyping(roomId);
    }
  }, [startTyping, stopTyping]);

  const handleMsgInput = useCallback((e) => {
    const value = e.target.value;
    setMsgBody(value);
    
    if (activeRoom && value.trim()) {
      handleTyping(activeRoom._id, true);
    } else if (activeRoom) {
      handleTyping(activeRoom._id, false);
    }
  }, [activeRoom, handleTyping]);

  const handleImageUpload = useCallback(({ base64, name }) => {
    setImagePreview({ base64, name });
  }, []);

  const handleCancelImage = useCallback(() => {
    setImagePreview(null);
  }, []);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();

    if (imagePreview) {
      setSending(true);
      try {
        await sendMessage(activeRoom._id, "", "image", imagePreview.base64);
        setImagePreview(null);
        inputRef.current?.focus();
      } catch (err) {
        console.error("Image send error:", err);
      } finally {
        setSending(false);
      }
      return;
    }

    if (!msgBody.trim() || !activeRoom || sending) return;
    
    const trimmedBody = msgBody.trim();
    if (trimmedBody.length > MESSAGE_MAX_LENGTH) return;

    setSending(true);
    handleTyping(activeRoom._id, false);
    
    try {
      await sendMessage(activeRoom._id, trimmedBody);
      setMsgBody("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  }, [msgBody, activeRoom, sending, sendMessage, handleTyping, imagePreview]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }, [handleSendMessage]);

  const handleCreateRoomWrapper = useCallback(async (name, description, type) => {
    try {
      const newRoom = await createRoom(name, description, type);
      setShowSidebar(false);
      
      setCreatedRoomInfo({
        name: newRoom.name,
        id: newRoom._id,
        type: type
      });
      setShowRoomCreatedModal(true);
      
      return newRoom;
    } catch (err) {
      throw err;
    }
  }, [createRoom]);

  const handleDeleteRoomWrapper = useCallback(async (roomId) => {
    try {
      await deleteRoom(roomId);
      if (activeRoom?._id === roomId) {
        setActiveRoom(null);
        setMessages([]);
        setMembers([]);
      }
    } catch (err) {
      throw err;
    }
  }, [deleteRoom, activeRoom]);

  const handleJoinRoom = useCallback(async (roomId) => {
    try {
      await joinRoom(roomId);
      setShowSidebar(false);
    } catch (err) {
      if (err === "This room requires admin approval to join") {
        try {
          await requestJoin(roomId);
          alert("Join request sent! Wait for admin approval.");
        } catch (reqErr) {
          console.error("Request join error:", reqErr);
          alert("Failed to send join request");
        }
      } else {
        console.error("Join room error:", err);
        alert(err || "Failed to join room");
      }
    }
  }, [joinRoom, requestJoin]);

  const handleJoinPrivateRoom = useCallback(async (roomId) => {
    setJoiningPrivateRoom(true);
    try {
      await joinRoom(roomId);
      setShowJoinModal(false);
      alert("Successfully joined the private room!");
    } catch (err) {
      console.error("Join private room error:", err);
      alert(err || "Failed to join room. Make sure the Room ID is correct and you have permission.");
    } finally {
      setJoiningPrivateRoom(false);
    }
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

  const calculateEmojiPickerPosition = useCallback(() => {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPosition({
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
      });
    }
  }, []);

  const handleEmojiButtonClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showEmoji) {
      calculateEmojiPickerPosition();
    }
    setShowEmoji(prev => !prev);
  }, [showEmoji, calculateEmojiPickerPosition]);

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
      setImagePreview(null);
      setShowEmoji(false);
    }
  }, [activeRoom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [msgBody]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

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
    <div
      className="flex h-screen bg-dark overflow-hidden"
      role="application"
      aria-label="ChatApp"
    >
      {!connected && (
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-5 py-2 border-b ${error?.includes("lost") ? "bg-pink/10 border-pink/30" : "bg-amber/10 border-amber/30"}`} role="status" aria-live="polite">
          <div className="w-2 h-2 rounded-full bg-amber animate-pulse" aria-hidden="true" />
          <span className="text-amber text-xs font-semibold">{error || "Reconnecting..."}</span>
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

      {showRoomCreatedModal && createdRoomInfo && (
        <RoomCreatedModal
          roomName={createdRoomInfo.name}
          roomId={createdRoomInfo.id}
          roomType={createdRoomInfo.type}
          onClose={() => {
            setShowRoomCreatedModal(false);
            setCreatedRoomInfo(null);
          }}
        />
      )}

      {showJoinModal && (
        <JoinRoomModal
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinPrivateRoom}
          loading={joiningPrivateRoom}
        />
      )}

      {showSidebar && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowSidebar(false)} aria-hidden="true">
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col">
            <SidebarContent
              connected={connected}
              user={user}
              logout={logout}
              onCreateRoom={handleCreateRoomWrapper}
              onDeleteRoom={handleDeleteRoomWrapper}
              rooms={rooms}
              typingUsers={typingUsers}
              activeRoom={activeRoom}
              onJoinRoom={handleJoinRoom}
              users={users}
              onOpenDMList={handleOpenDMList}
              onOpenJoinModal={() => setShowJoinModal(true)}
            />
          </div>
        </div>
      )}

      <nav
        aria-label="Rooms and navigation"
        className="hidden md:flex w-64 bg-card border-r border-border flex-col flex-shrink-0"
      >
        <SidebarContent
          connected={connected}
          user={user}
          logout={logout}
          onCreateRoom={handleCreateRoomWrapper}
          onDeleteRoom={handleDeleteRoomWrapper}
          rooms={rooms}
          typingUsers={typingUsers}
          activeRoom={activeRoom}
          onJoinRoom={handleJoinRoom}
          users={users}
          onOpenDMList={handleOpenDMList}
          onOpenJoinModal={() => setShowJoinModal(true)}
        />
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-border transition-colors cursor-pointer flex-shrink-0"
                  aria-label="Open navigation sidebar"
                  aria-expanded={showSidebar}
                  aria-controls="mobile-sidebar"
                >
                  <HamburgerIcon open={false} />
                </button>

                <div>
                  <h2 className="text-white font-bold text-sm truncate flex items-center gap-1.5">
                    {activeRoom.isDirect ? (
                      (() => {
                        const ids = activeRoom.name.replace("dm_", "").split("_");
                        const otherId = ids.find((id) => id !== user?._id);
                        const other = users.find((u) => u._id?.toString() === otherId);
                        return other?.username || "Direct Message";
                      })()
                    ) : (
                      <>
                        {activeRoom.type === "private" ? "🔒" : activeRoom.type === "invite" ? "✉️" : "#"} {activeRoom.name}
                      </>
                    )}
                  </h2>
                  {activeRoom.description && !activeRoom.isDirect && (<p className="text-muted text-xs mt-0.5">{activeRoom.description}</p>)}
                  {activeRoom.type !== "public" && activeRoom.type !== "direct" && (
                    <p className="text-[10px] text-muted mt-0.5">Private Room • ID: {activeRoom._id?.slice(-8)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications((p) => !p)}
                    className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors cursor-pointer ${showNotifications ? "bg-border border-border text-white" : "border-border text-muted hover:text-light"}`}
                    aria-label={`Notifications${notifications.length > 0 ? `, ${notifications.length} new` : ""}`}
                    aria-expanded={showNotifications}
                    aria-haspopup="true"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {notifications.length > 0 && (<span className="absolute -top-1 -right-1 w-4 h-4 bg-pink rounded-full text-[9px] text-white font-bold flex items-center justify-center">{notifications.length}</span>)}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-40 animate-fade-in" role="dialog" aria-label="Notifications panel">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <p className="text-white text-sm font-bold">Notifications</p>
                        {notifications.length > 0 && (<button onClick={() => notifications.forEach((n) => dismissNotification(n.id))} className="text-muted text-xs hover:text-light transition-colors cursor-pointer">Clear all</button>)}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (<p className="text-muted text-sm text-center py-6">No notifications</p>) : (
                          notifications.map((n) => (
                            <div key={n.id} className="px-4 py-3 border-b border-border/50 hover:bg-border/20 transition-colors">
                              {n.type === "join_request" && (
                                <div>
                                  <p className="text-white text-xs font-medium mb-1"><span className="text-blue">{n.user.username}</span> wants to join <span className="text-teal">#{n.roomName}</span></p>
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={async () => { await approveMember(n.roomId, n.user._id.toString()); dismissNotification(n.id); }} className="flex-1 bg-teal/20 text-teal border border-teal/30 text-xs py-1 rounded cursor-pointer hover:bg-teal/30 transition-colors" aria-label={`Approve ${n.user.username}`}>✓ Approve</button>
                                    <button onClick={async () => { await rejectMember(n.roomId, n.user._id.toString()); dismissNotification(n.id); }} className="flex-1 bg-pink/20 text-pink border border-pink/30 text-xs py-1 rounded cursor-pointer hover:bg-pink/30 transition-colors" aria-label={`Reject ${n.user.username}`}>✕ Reject</button>
                                  </div>
                                </div>
                              )}
                              {n.type === "request_approved" && (<div className="flex items-start justify-between gap-2"><p className="text-white text-xs">✅ Your request to join <span className="text-teal">#{n.roomName}</span> was approved!</p><button onClick={() => dismissNotification(n.id)} className="text-muted text-xs cursor-pointer flex-shrink-0" aria-label="Dismiss">×</button></div>)}
                              {n.type === "request_rejected" && (<div className="flex items-start justify-between gap-2"><p className="text-white text-xs">❌ Your request to join <span className="text-pink">#{n.roomName}</span> was rejected.</p><button onClick={() => dismissNotification(n.id)} className="text-muted text-xs cursor-pointer flex-shrink-0" aria-label="Dismiss">×</button></div>)}
                              {n.type === "invite" && (
                                <div>
                                  <p className="text-white text-xs font-medium mb-1"><span className="text-blue">{n.invitedBy.username}</span> invited you to <span className="text-teal">#{n.roomName}</span></p>
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={async () => { await acceptInvite(n.roomId); dismissNotification(n.id); }} className="flex-1 bg-teal/20 text-teal border border-teal/30 text-xs py-1 rounded cursor-pointer hover:bg-teal/30 transition-colors" aria-label="Accept invite">✓ Accept</button>
                                    <button onClick={() => dismissNotification(n.id)} className="flex-1 bg-border text-muted border border-border text-xs py-1 rounded cursor-pointer hover:text-light transition-colors" aria-label="Dismiss">Dismiss</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!activeRoom.isDirect && (
                  <button
                    onClick={() => setShowMembers((p) => !p)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${showMembers ? "bg-border border-border text-white" : "bg-transparent border-border text-muted hover:text-light"}`}
                    aria-label={`${showMembers ? "Hide" : "Show"} members panel`}
                    aria-expanded={showMembers}
                    aria-controls="members-panel"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span className="hidden sm:inline">{members.length}</span>
                    {onlineCount > 0 && (<span className="bg-teal text-dark text-[9px] font-bold px-1.5 py-0.5 rounded-full">{onlineCount} online</span>)}
                  </button>
                )}

                <button onClick={() => leaveRoom(activeRoom._id)} className="text-muted text-xs border border-border rounded px-2 py-1.5 hover:text-pink hover:border-pink/30 transition-colors cursor-pointer" aria-label={`Leave ${activeRoom.name}`}>
                  Leave
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <main
                id="main-content"
                role="main"
                aria-label={`Messages in ${activeRoom?.name || "room"}`}
                className="flex-1 overflow-y-auto px-4 md:px-5 py-4 flex flex-col gap-0.5"
              >
                {hasMore && (
                  <button
                    onClick={() => loadMoreMessages(activeRoom._id)}
                    disabled={loadingMsgs}
                    className="block mx-auto bg-card border border-border text-muted text-xs px-4 py-1.5 rounded-full mb-3 hover:text-light transition-colors cursor-pointer disabled:opacity-50"
                    aria-label="Load earlier messages"
                  >
                    {loadingMsgs ? "Loading..." : "Load earlier messages"}
                  </button>
                )}
                {messages.length === 0 && (<div className="h-full flex items-center justify-center"><p className="text-muted text-sm">No messages yet. Say hello! 👋</p></div>)}
                {messages.map((msg, index) => {
                  const isOwn = isOwnMessage(msg, user?._id);
                  const showName = index === 0 || getSenderId(messages[index-1]?.sender) !== getSenderId(msg.sender);
                  const isEditing = editingMessage?.id === msg._id;

                  return (
                    <div key={msg._id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"} ${showName ? "mt-3" : "mt-0.5"}`}>
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
                        onImageClick={setFullscreenImage}
                      />
                    </div>
                  );
                })}
                <TypingIndicator typers={activeTypers} />
                <div ref={bottomRef} />
              </main>

              <div
                id="members-panel"
                role="complementary"
                aria-label="Room members"
                className={`bg-card border-l border-border flex-shrink-0 transition-all duration-300 overflow-hidden ${showMembers && !activeRoom?.isDirect ? "w-48 md:w-52" : "w-0 border-l-0"}`}
              >
                <div className="w-48 md:w-52 h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-border"><p className="text-muted text-[10px] font-bold uppercase tracking-widest">Members — {onlineCount} online</p></div>
                  <div className="flex-1 overflow-y-auto py-2">
                    {[...members].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map(member => (
                      <div key={member._id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-border/30 transition-colors">
                        <Avatar username={member.username} isOnline={member.isOnline} />
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${member.isOnline ? "text-white" : "text-muted"}`}>{member.username}{member._id === user?._id && <span className="text-muted/50"> (you)</span>}</p>
                          <p className={`text-[10px] ${member.isOnline ? "text-teal" : "text-muted/50"}`}>{member.isOnline ? "Online" : "Offline"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 md:px-5 py-3 md:py-4 border-t border-border flex-shrink-0 pb-safe">
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img src={imagePreview.base64} alt="Preview" className="h-24 w-auto rounded-lg object-cover border border-border" />
                  <button onClick={handleCancelImage} className="absolute -top-2 -right-2 w-5 h-5 bg-pink rounded-full text-white text-xs flex items-center justify-center cursor-pointer hover:bg-pink/80 transition-colors" aria-label="Cancel image">×</button>
                  <p className="text-muted text-[10px] mt-1 truncate max-w-[200px]">{imagePreview.name}</p>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                <div className="relative flex-shrink-0">
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    onClick={handleEmojiButtonClick}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${showEmoji ? "border-blue bg-blue/10 text-blue" : "border-border hover:bg-border/50 text-muted"}`}
                    aria-label="Open emoji picker"
                  >
                    😊
                  </button>
                  {showEmoji && (
                    <div className="fixed z-[9999]" style={{ position: 'fixed', bottom: `calc(100vh - ${emojiPickerPosition.top}px + 10px)`, left: `${emojiPickerPosition.left - 20}px` }}>
                      <EmojiPickerComponent onSelect={(emoji) => { setMsgBody(prev => prev + emoji); setShowEmoji(false); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />
                    </div>
                  )}
                </div>

                <ImageUpload onUpload={handleImageUpload} disabled={sending} />

                <textarea
                  ref={inputRef}
                  value={msgBody}
                  onChange={handleMsgInput}
                  onKeyDown={handleKeyDown}
                  onBlur={() => activeRoom && stopTyping(activeRoom._id)}
                  placeholder={imagePreview ? "Add a caption... (optional)" : activeRoom?.isDirect ? "Message..." : `Message # ${activeRoom.name}`}
                  aria-label={`Type a message in ${activeRoom?.name || "room"}`}
                  aria-multiline="true"
                  rows={1}
                  disabled={!!imagePreview}
                  className="flex-1 bg-input border border-border/80 rounded-xl px-4 py-2.5 text-white text-sm placeholder-muted focus:border-blue focus:outline-none resize-none leading-relaxed font-sans disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={sending || (!msgBody.trim() && !imagePreview) || msgBody.length > MESSAGE_MAX_LENGTH}
                  aria-label="Send message"
                  aria-disabled={sending || (!msgBody.trim() && !imagePreview)}
                  className="bg-blue hover:bg-blue/90 disabled:opacity-50 text-white font-bold px-4 md:px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex-shrink-0"
                >
                  <span className="hidden sm:inline">Send</span>
                  <span className="sm:hidden" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></span>
                </button>
              </form>

              <div className="flex justify-between items-center mt-1.5">
                <p className="text-muted text-[10px] hidden sm:block">Enter to send · Shift+Enter for new line</p>
                {msgBody.length > 1800 && (<p className={`text-[10px] ml-auto ${msgBody.length > MESSAGE_MAX_LENGTH ? "text-pink" : "text-amber"}`}>{msgBody.length}/{MESSAGE_MAX_LENGTH}</p>)}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <button onClick={() => setShowSidebar(true)} className="md:hidden bg-card border border-border rounded-xl px-5 py-3 text-light text-sm font-medium hover:bg-border/50 transition-colors cursor-pointer" aria-label="Open sidebar to browse rooms">
              Browse rooms
            </button>
            <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <p className="text-light text-sm font-medium">Select a room to start chatting</p>
            <p className="text-muted text-xs text-center">or create a new one from the sidebar</p>
          </div>
        )}
      </div>

      {showDMList && (
        <UserSearchModal
          users={users}
          onSelect={handleStartDM}
          onClose={() => { setShowDMList(false); setUserSearch(""); }}
          loading={dmLoading}
          search={userSearch}
          onSearch={setUserSearch}
        />
      )}
      {fullscreenImage && (<ImageModal src={fullscreenImage} onClose={() => setFullscreenImage(null)} />)}
    </div>
  );
};

export default Chat;