const Message = require("../../models/message.model");
const Room    = require("../../models/room.model");

// ── Rate limiter ──────────────────────────────────────────────────
const lastMessageTime  = new Map();
const MESSAGE_COOLDOWN = 500;

// Clean up old entries every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [userId, time] of lastMessageTime.entries()) {
    if (time < cutoff) lastMessageTime.delete(userId);
  }
}, 10 * 60 * 1000);

const registerMessageHandlers = (io, socket) => {

  // ── message:send ─────────────────────────────────────────────
  socket.on("message:send", async ({ roomId, body, type = "text" }, callback) => {
    try {
      // Rate limit
      const userId   = socket.user._id.toString();
      const lastTime = lastMessageTime.get(userId) || 0;
      const now      = Date.now();

      if (now - lastTime < MESSAGE_COOLDOWN) {
        return callback({ success: false, message: "Slow down — sending too fast" });
      }
      lastMessageTime.set(userId, now);

      // Validate
      if (!roomId || !body?.trim()) {
        return callback({ success: false, message: "roomId and body are required" });
      }

      if (body.trim().length > 2000) {
        return callback({ success: false, message: "Message too long (max 2000 chars)" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      const sanitisedBody = body.trim().replace(/<[^>]*>/g, "");

      // Create message — sender counts as delivered + read
      const message = await Message.create({
        roomId,
        sender:      socket.user._id,
        body:        sanitisedBody,
        type,
        readBy:      [socket.user._id],
        deliveredTo: [socket.user._id],
      });

      const populated = await message.populate("sender", "username avatarUrl");

      // Broadcast to room
      io.to(roomId).emit("message:new", populated);

      // Mark as delivered for all currently connected room members
      const roomSockets = await io.in(roomId).fetchSockets();
      for (const s of roomSockets) {
        if (s.user && s.user._id.toString() !== socket.user._id.toString()) {
          // Mark delivered for this connected user
          await Message.findByIdAndUpdate(
            message._id,
            { $addToSet: { deliveredTo: s.user._id } },
            { returnDocument: "after" }
          );

          // Notify sender of delivery
          socket.emit("message:status_update", {
            messageId:   message._id,
            deliveredTo: message.deliveredTo,
            readBy:      message.readBy,
          });
        }
      }

      console.log(`Message in ${room.name} from ${socket.user.username}: ${sanitisedBody.substring(0, 30)}`);
      callback({ success: true, message: populated });

    } catch (err) {
      console.error("message:send error:", err);
      callback({ success: false, message: "Failed to send message" });
    }
  });

  // ── message:history ──────────────────────────────────────────
  socket.on("message:history", async ({ roomId, cursor, limit = 50 }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

      const query = { roomId };
      if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
      }

      const messages = await Message.find(query)
        .populate("sender", "username avatarUrl")
        .sort({ createdAt: -1 })
        .limit(limit);

      const ordered = messages.reverse();
      const hasMore = messages.length === limit;

      callback({ success: true, messages: ordered, hasMore });

    } catch (err) {
      console.error("message:history error:", err);
      callback({ success: false, message: "Failed to fetch messages" });
    }
  });

  // ── message:delivered ────────────────────────────────────────
  socket.on("message:delivered", async ({ messageId }, callback) => {
    try {
      if (!messageId) {
        return callback?.({ success: false, message: "messageId is required" });
      }

      const message = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { deliveredTo: socket.user._id } },
        { returnDocument: "after" }
      );

      if (!message) {
        return callback?.({ success: false, message: "Message not found" });
      }

      // Notify the sender of delivery update
      socket.to(message.roomId.toString()).emit("message:status_update", {
        messageId:   message._id,
        deliveredTo: message.deliveredTo,
        readBy:      message.readBy,
      });

      callback?.({ success: true });

    } catch (err) {
      console.error("message:delivered error:", err);
      callback?.({ success: false, message: "Failed to mark delivered" });
    }
  });

  // ── message:read ─────────────────────────────────────────────
  socket.on("message:read", async ({ messageId }, callback) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: {
            readBy:      socket.user._id,
            deliveredTo: socket.user._id, // reading implies delivered
          },
        },
        { returnDocument: "after" }
      );

      if (!message) {
        return callback?.({ success: false, message: "Message not found" });
      }

      // Notify room of read + delivery update
      socket.to(message.roomId.toString()).emit("message:status_update", {
        messageId:   message._id,
        deliveredTo: message.deliveredTo,
        readBy:      message.readBy,
      });

      callback?.({ success: true });

    } catch (err) {
      console.error("message:read error:", err);
      callback?.({ success: false, message: "Failed to mark as read" });
    }
  });

  // ── message:edit ─────────────────────────────────────────────
  socket.on("message:edit", async ({ messageId, body }, callback) => {
    try {
      if (!messageId || !body?.trim()) {
        return callback({ success: false, message: "messageId and body are required" });
      }

      if (body.trim().length > 2000) {
        return callback({ success: false, message: "Message too long (max 2000 chars)" });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return callback({ success: false, message: "Message not found" });
      }

      // Ownership check
      if (message.sender.toString() !== socket.user._id.toString()) {
        return callback({ success: false, message: "You can only edit your own messages" });
      }

      if (message.isDeleted) {
        return callback({ success: false, message: "Cannot edit a deleted message" });
      }

      const sanitisedBody  = body.trim().replace(/<[^>]*>/g, "");
      message.body         = sanitisedBody;
      message.isEdited     = true;
      message.editedAt     = new Date();
      await message.save();

      const populated = await message.populate("sender", "username avatarUrl");

      io.to(message.roomId.toString()).emit("message:updated", populated);

      console.log(`Message edited by ${socket.user.username}`);
      callback({ success: true, message: populated });

    } catch (err) {
      console.error("message:edit error:", err);
      callback({ success: false, message: "Failed to edit message" });
    }
  });

  // ── message:delete ───────────────────────────────────────────
  socket.on("message:delete", async ({ messageId }, callback) => {
    try {
      if (!messageId) {
        return callback({ success: false, message: "messageId is required" });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return callback({ success: false, message: "Message not found" });
      }

      // Ownership check
      if (message.sender.toString() !== socket.user._id.toString()) {
        return callback({ success: false, message: "You can only delete your own messages" });
      }

      // Soft delete
      message.isDeleted = true;
      message.body      = "This message was deleted";
      await message.save();

      io.to(message.roomId.toString()).emit("message:updated", {
        _id:       message._id,
        roomId:    message.roomId,
        isDeleted: true,
        body:      "This message was deleted",
      });

      console.log(`Message deleted by ${socket.user.username}`);
      callback({ success: true });

    } catch (err) {
      console.error("message:delete error:", err);
      callback({ success: false, message: "Failed to delete message" });
    }
  });

};

module.exports = registerMessageHandlers;