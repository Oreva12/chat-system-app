const Room = require("../../models/room.model");
const User = require("../../models/user.model");

const registerPermissionHandlers = (io, socket) => {

  // ── room:request_join ─────────────────────────────────────────
  // User requests to join a private room
  socket.on("room:request_join", async ({ roomId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Check if already a member
      if (room.members.map(String).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Already a member" });
      }

      // Check if already pending
      if (room.pendingMembers.map(String).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Request already pending" });
      }

      // Add to pending
      room.pendingMembers.push(socket.user._id);
      await room.save();

      // Notify all admins of the request
      const roomSockets = await io.fetchSockets();
      for (const s of roomSockets) {
        if (s.user && room.admins.map(String).includes(s.user._id.toString())) {
          s.emit("room:join_requested", {
            roomId:  room._id,
            roomName: room.name,
            user: {
              _id:      socket.user._id,
              username: socket.user.username,
            },
          });
        }
      }

      console.log(`${socket.user.username} requested to join: ${room.name}`);
      callback({ success: true, message: "Request sent to room admin" });

    } catch (err) {
      console.error("room:request_join error:", err);
      callback({ success: false, message: "Failed to send request" });
    }
  });

  // ── room:approve_member ───────────────────────────────────────
  // Admin approves a pending join request
  socket.on("room:approve_member", async ({ roomId, userId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Check if requester is an admin
      if (!room.admins.map(String).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Only admins can approve members" });
      }

      // Check user is actually pending
      if (!room.pendingMembers.map(String).includes(userId)) {
        return callback({ success: false, message: "No pending request from this user" });
      }

      // Move from pending to members
      room.pendingMembers = room.pendingMembers.filter(
        (id) => id.toString() !== userId
      );
      room.members.push(userId);
      await room.save();

      // Notify the approved user if online
      const roomSockets = await io.fetchSockets();
      const userSocket  = roomSockets.find(
        (s) => s.user?._id.toString() === userId
      );

      if (userSocket) {
        userSocket.join(roomId);
        userSocket.emit("room:request_approved", {
          roomId,
          roomName: room.name,
          room,
        });
      }

      // Notify room of new member
      io.to(roomId).emit("room:user_joined", {
        roomId,
        user: { _id: userId, username: "New member" },
      });

      console.log(`Member approved for ${room.name} by ${socket.user.username}`);
      callback({ success: true });

    } catch (err) {
      console.error("room:approve_member error:", err);
      callback({ success: false, message: "Failed to approve member" });
    }
  });

  // ── room:reject_member ────────────────────────────────────────
  socket.on("room:reject_member", async ({ roomId, userId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      if (!room.admins.map(String).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Only admins can reject members" });
      }

      room.pendingMembers = room.pendingMembers.filter(
        (id) => id.toString() !== userId
      );
      await room.save();

      // Notify the rejected user if online
      const roomSockets = await io.fetchSockets();
      const userSocket  = roomSockets.find(
        (s) => s.user?._id.toString() === userId
      );

      if (userSocket) {
        userSocket.emit("room:request_rejected", {
          roomId,
          roomName: room.name,
        });
      }

      callback({ success: true });

    } catch (err) {
      console.error("room:reject_member error:", err);
      callback({ success: false, message: "Failed to reject member" });
    }
  });

  // ── room:invite ───────────────────────────────────────────────
  // Admin invites a user directly
  socket.on("room:invite", async ({ roomId, userId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      if (!room.admins.map(String).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Only admins can invite members" });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return callback({ success: false, message: "User not found" });
      }

      // Check not already a member
      if (room.members.map(String).includes(userId)) {
        return callback({ success: false, message: "User is already a member" });
      }

      // Add to invitedMembers
      if (!room.invitedMembers.map(String).includes(userId)) {
        room.invitedMembers.push(userId);
        await room.save();
      }

      // Notify target user if online
      const roomSockets = await io.fetchSockets();
      const userSocket  = roomSockets.find(
        (s) => s.user?._id.toString() === userId
      );

      if (userSocket) {
        userSocket.emit("room:invited", {
          roomId,
          roomName: room.name,
          room,
          invitedBy: {
            _id:      socket.user._id,
            username: socket.user.username,
          },
        });
      }

      callback({ success: true, message: `Invite sent to ${targetUser.username}` });

    } catch (err) {
      console.error("room:invite error:", err);
      callback({ success: false, message: "Failed to send invite" });
    }
  });

  // ── room:accept_invite ────────────────────────────────────────
  socket.on("room:accept_invite", async ({ roomId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Check invited
      if (!room.invitedMembers.map(String).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "No invite found" });
      }

      // Move from invited to members
      room.invitedMembers = room.invitedMembers.filter(
        (id) => id.toString() !== socket.user._id.toString()
      );
      room.members.push(socket.user._id);
      await room.save();

      socket.join(roomId);

      io.to(roomId).emit("room:user_joined", {
        roomId,
        user: {
          _id:      socket.user._id,
          username: socket.user.username,
        },
      });

      callback({ success: true, room });

    } catch (err) {
      console.error("room:accept_invite error:", err);
      callback({ success: false, message: "Failed to accept invite" });
    }
  });

  // ── room:get_pending ──────────────────────────────────────────
  // Admin fetches pending join requests for their room
  socket.on("room:get_pending", async ({ roomId }, callback) => {
    try {
      const room = await Room.findById(roomId)
        .populate("pendingMembers", "username isOnline");

      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      if (!room.admins.map(String).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Admins only" });
      }

      callback({ success: true, pending: room.pendingMembers });

    } catch (err) {
      console.error("room:get_pending error:", err);
      callback({ success: false, message: "Failed to fetch pending members" });
    }
  });

};

module.exports = registerPermissionHandlers;