const Room = require("../../models/room.model");
const User = require("../../models/user.model");

const registerRoomHandlers = (io, socket) => {

  // ── room:create ─────────────────────────────────────────────
  socket.on("room:create", async ({ name, description = "", isPrivate = false }, callback) => {
    try {
      // Check if room already exists
      const existing = await Room.findOne({ name });
      if (existing) {
        return callback({ success: false, message: "Room name already taken" });
      }

      // Create the room
      const room = await Room.create({
        name,
        description,
        isPrivate,
        createdBy: socket.user._id,
        members:   [socket.user._id],
      });

      // Join the Socket.io room immediately
      socket.join(room._id.toString());

      // Broadcast new room to ALL connected clients
      io.emit("room:new", room);

      console.log(`Room created: ${room.name} by ${socket.user.username}`);
      callback({ success: true, room });

    } catch (err) {
      console.error("room:create error:", err);
      callback({ success: false, message: "Failed to create room" });
    }
  });

  // ── room:join ────────────────────────────────────────────────
  socket.on("room:join", async ({ roomId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Add user to members if not already in
      if (!room.members.includes(socket.user._id)) {
        room.members.push(socket.user._id);
        await room.save();
      }

      // Join the Socket.io room
      socket.join(roomId);

      // Notify others in the room
      socket.to(roomId).emit("room:user_joined", {
        roomId,
        user: { _id: socket.user._id, username: socket.user.username },
      });

      console.log(`${socket.user.username} joined room: ${room.name}`);
      callback({ success: true, room });

    } catch (err) {
      console.error("room:join error:", err);
      callback({ success: false, message: "Failed to join room" });
    }
  });

  // ── room:leave ───────────────────────────────────────────────
  socket.on("room:leave", async ({ roomId }, callback) => {
    try {
      // Leave the Socket.io room
      socket.leave(roomId);

      // Notify others in the room
      socket.to(roomId).emit("room:user_left", {
        roomId,
        user: { _id: socket.user._id, username: socket.user.username },
      });

      console.log(`${socket.user.username} left room: ${roomId}`);
      callback({ success: true });

    } catch (err) {
      console.error("room:leave error:", err);
      callback({ success: false, message: "Failed to leave room" });
    }
  });

  // ── room:list ────────────────────────────────────────────────
  socket.on("room:list", async (_, callback) => {
    try {
      const rooms = await Room.find({ isPrivate: false })
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .limit(50);

      callback({ success: true, rooms });

    } catch (err) {
      console.error("room:list error:", err);
      callback({ success: false, message: "Failed to fetch rooms" });
    }
  });

  // ── room:get_members ─────────────────────────────────────────
  socket.on("room:get_members", async ({ roomId }, callback) => {
    try {
      const room = await Room.findById(roomId)
        .populate("members", "username isOnline lastSeen");

      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      callback({ success: true, members: room.members });

    } catch (err) {
      console.error("room:get_members error:", err);
      callback({ success: false, message: "Failed to fetch members" });
    }
  });

};

module.exports = registerRoomHandlers;