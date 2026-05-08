const Message = require("../../models/message.model");
const Room    = require("../../models/room.model");

// Simple in-memory rate limiter
// Tracks last message time per user
const lastMessageTime = new Map();
const MESSAGE_COOLDOWN_MS = 500; // min 500ms between messages
    

const registerMessageHandlers = (io, socket) => {

  // message:send
  socket.on("message:send", async ({ roomId, body, type = "text" }, callback) => {
    try {
      // Validate inputs
      if (!roomId || !body?.trim()) {
        return callback({ success: false, message: "roomId and body are required" });
      }

      // Verify room exists
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Sanitise body — strip HTML tags to prevent stored XSS
      const sanitisedBody = body.trim().replace(/<[^>]*>/g, "");

      // Save message to MongoDB
      const message = await Message.create({
        roomId,
        sender: socket.user._id,
        body:   sanitisedBody,
        type,
        readBy: [socket.user._id], // sender has read their own message
      });

      // Populate sender details for the response
      const populated = await message.populate("sender", "username avatarUrl");

      // Broadcast to EVERYONE in the room (including sender)
      io.to(roomId).emit("message:new", populated);

      console.log(`Message in ${room.name} from ${socket.user.username}: ${sanitisedBody.substring(0, 30)}`);
      callback({ success: true, message: populated });

    } catch (err) {
      console.error("message:send error:", err);
      callback({ success: false, message: "Failed to send message" });
    }
  });

  // message:history
  socket.on("message:history", async ({ roomId, cursor, limit = 50 }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

      // Build query — cursor-based pagination
      const query = { roomId };
      if (cursor) {
        // cursor is the createdAt of the oldest message already loaded
        query.createdAt = { $lt: new Date(cursor) };
      }

      const messages = await Message.find(query)
        .populate("sender", "username avatarUrl")
        .sort({ createdAt: -1 })   // newest first from DB
        .limit(limit);

      // Reverse so oldest is first (correct chat order)
      const ordered = messages.reverse();

      // Has more pages?
      const hasMore = messages.length === limit;

      callback({ success: true, messages: ordered, hasMore });

    } catch (err) {
      console.error("message:history error:", err);
      callback({ success: false, message: "Failed to fetch messages" });
    }
  });

  // message:read 
  socket.on("message:read", async ({ messageId }, callback) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: socket.user._id } },
        { returnDocument: "after" } // ← replaces { new: true }
      );

      if (!message) {
        return callback({ success: false, message: "Message not found" });
      }

      // Notify room that message was read
      socket.to(message.roomId.toString()).emit("message:read_update", {
        messageId: message._id,
        readBy:    message.readBy,
      });

      callback({ success: true });

    } catch (err) {
      console.error("message:read error:", err);
      callback({ success: false, message: "Failed to mark as read" });
    }
  });

  socket.on("message:send", async ({ roomId, body, type = "text" }, callback) => {
      try {
        // Rate limit check 
        const userId   = socket.user._id.toString();
        const lastTime = lastMessageTime.get(userId) || 0;
        const now      = Date.now();

        if (now - lastTime < MESSAGE_COOLDOWN_MS) {
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

        const message = await Message.create({
          roomId,
          sender: socket.user._id,
          body:   sanitisedBody,
          type,
          readBy: [socket.user._id],
        });

        const populated = await message.populate("sender", "username avatarUrl");
        io.to(roomId).emit("message:new", populated);

        console.log(`Message in ${room.name} from ${socket.user.username}: ${sanitisedBody.substring(0, 30)}`);
        callback({ success: true, message: populated });

      } catch (err) {
        console.error("message:send error:", err);
        callback({ success: false, message: "Failed to send message" });
      }
    });
  };

module.exports = registerMessageHandlers;