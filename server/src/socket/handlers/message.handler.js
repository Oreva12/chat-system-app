const Message = require("../../models/message.model");
const Room    = require("../../models/room.model");

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
        { $addToSet: { readBy: socket.user._id } }, // addToSet prevents duplicates
        { new: true }
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

};

module.exports = registerMessageHandlers;