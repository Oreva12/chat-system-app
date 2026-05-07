const Room = require("../../models/room.model");

const registerRoomHandlers = (io, socket) => {

  // room:create
  socket.on("room:create", async ({ name, description = "", isPrivate = false }, callback) => {
    try {
      if (!name || !name.trim()) {
        return callback({ success: false, message: "Room name is required" });
      }

      const existing = await Room.findOne({ name: name.trim() });
      if (existing) {
        return callback({ success: false, message: "Room name already taken" });
      }

      const room = await Room.create({
        name:        name.trim(),
        description: description.trim(),
        isPrivate,
        createdBy:   socket.user._id,
        members:     [socket.user._id],
      });

      socket.join(room._id.toString());
      io.emit("room:new", room);

      console.log(`Room created: ${room.name} by ${socket.user.username}`);
      callback({ success: true, room });

    } catch (err) {
      console.error("room:create error:", err);
      callback({ success: false, message: "Failed to create room" });
    }
  });

  // room:join
  socket.on("room:join", async ({ roomId }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Add to members if not already there
      const isMember = room.members
        .map((m) => m.toString())
        .includes(socket.user._id.toString());

      if (!isMember) {
        room.members.push(socket.user._id);
        await room.save();
      }

      socket.join(roomId);

      socket.to(roomId).emit("room:user_joined", {
        roomId,
        user: {
          _id:      socket.user._id,
          username: socket.user.username,
        },
      });

      console.log(`${socket.user.username} joined room: ${room.name}`);
      callback({ success: true, room });

    } catch (err) {
      console.error("room:join error:", err);
      callback({ success: false, message: "Failed to join room" });
    }
  });

  // room:leave
  socket.on("room:leave", async ({ roomId }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

      socket.leave(roomId);

      socket.to(roomId).emit("room:user_left", {
        roomId,
        user: {
          _id:      socket.user._id,
          username: socket.user.username,
        },
      });

      console.log(`${socket.user.username} left room: ${roomId}`);
      callback({ success: true });

    } catch (err) {
      console.error("room:leave error:", err);
      callback({ success: false, message: "Failed to leave room" });
    }
  });

  // room:list
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

  // room:get_members
  socket.on("room:get_members", async ({ roomId }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

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