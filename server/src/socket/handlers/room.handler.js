const Room = require("../../models/room.model");
const User = require("../../models/user.model");

const registerRoomHandlers = (io, socket) => {

  // room:create - Updated to support room type and set creator as admin
  socket.on("room:create", async ({ name, description = "", type = "public" }, callback) => {
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
        type,
        isPrivate:   type !== "public",
        createdBy:   socket.user._id,
        members:     [socket.user._id],
        admins:      [socket.user._id],
        pendingRequests: [],
        invitedUsers: [],
      });

      socket.join(room._id.toString());

      // Only broadcast public rooms to everyone
      if (type === "public") {
        io.emit("room:new", room);
      }

      console.log(`Room created: ${room.name} [${type}] by ${socket.user.username}`);
      callback({ success: true, room });

    } catch (err) {
      console.error("room:create error:", err);
      callback({ success: false, message: "Failed to create room" });
    }
  });

  // room:delete - Delete a room (admin only)
  socket.on("room:delete", async ({ roomId }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Check if user is admin of the room
      const isAdmin = room.admins.some(a => a.toString() === socket.user._id.toString());
      if (!isAdmin) {
        return callback({ success: false, message: "Only room admins can delete this room" });
      }

      // Get room details before deleting
      const roomName = room.name;
      const roomType = room.type;
      const roomIdStr = room._id.toString();

      // Delete the room
      await Room.findByIdAndDelete(roomId);

      // Notify all members in the room that it's deleted
      io.to(roomIdStr).emit("room:deleted", {
        roomId: roomIdStr,
        roomName,
        message: `Room "${roomName}" has been deleted by ${socket.user.username}`
      });

      // Make all sockets leave the room
      const roomSockets = await io.in(roomIdStr).fetchSockets();
      for (const sock of roomSockets) {
        sock.leave(roomIdStr);
      }

      // Also emit to all online users to refresh their room list
      io.emit("room:list_refresh", { deletedRoomId: roomIdStr });

      console.log(`Room deleted: ${roomName} [${roomType}] by ${socket.user.username}`);
      callback({ success: true, message: "Room deleted successfully" });

    } catch (err) {
      console.error("room:delete error:", err);
      callback({ success: false, message: "Failed to delete room" });
    }
  });

  // room:join - Updated to handle private rooms properly
  socket.on("room:join", async ({ roomId }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      const userId = socket.user._id;
      const userIdStr = userId.toString();
      
      // Check if user is already a member or admin
      const isMember = room.members.some(m => m.toString() === userIdStr);
      const isAdmin = room.admins.some(a => a.toString() === userIdStr);
      
      // If already a member or admin, allow join immediately
      if (isMember || isAdmin) {
        socket.join(roomId);
        
        socket.to(roomId).emit("room:user_joined", {
          roomId,
          user: {
            _id: socket.user._id,
            username: socket.user.username,
          },
        });
        
        console.log(`${socket.user.username} joined room: ${room.name}`);
        return callback({ success: true, room });
      }
      
      // Handle different room types
      if (room.type === "public") {
        // Public room - auto join
        room.members.push(userId);
        await room.save();
        
        socket.join(roomId);
        
        socket.to(roomId).emit("room:user_joined", {
          roomId,
          user: {
            _id: socket.user._id,
            username: socket.user.username,
          },
        });
        
        console.log(`${socket.user.username} joined public room: ${room.name}`);
        return callback({ success: true, room });
        
      } else if (room.type === "private") {
        // Check for existing pending request
        const hasPendingRequest = room.pendingRequests?.some(
          req => req.user.toString() === userIdStr
        );
        
        if (hasPendingRequest) {
          return callback({ 
            success: false, 
            message: "Your join request is pending approval" 
          });
        }
        
        // Check if user is invited
        const isInvited = room.invitedUsers?.some(id => id.toString() === userIdStr);
        
        if (isInvited) {
          // Auto-approve invited users
          room.members.push(userId);
          room.invitedUsers = room.invitedUsers.filter(id => id.toString() !== userIdStr);
          await room.save();
          
          socket.join(roomId);
          
          socket.to(roomId).emit("room:user_joined", {
            roomId,
            user: {
              _id: socket.user._id,
              username: socket.user.username,
            },
          });
          
          console.log(`${socket.user.username} joined invited private room: ${room.name}`);
          return callback({ success: true, room });
        }
        
        // Not a member, not invited - need to request access
        return callback({ 
          success: false, 
          message: "This room requires admin approval to join",
          needsApproval: true 
        });
        
      } else if (room.type === "invite") {
        // Invite-only room - must be invited
        const isInvited = room.invitedUsers?.some(id => id.toString() === userIdStr);
        
        if (isInvited) {
          room.members.push(userId);
          room.invitedUsers = room.invitedUsers.filter(id => id.toString() !== userIdStr);
          await room.save();
          
          socket.join(roomId);
          
          socket.to(roomId).emit("room:user_joined", {
            roomId,
            user: {
              _id: socket.user._id,
              username: socket.user.username,
            },
          });
          
          console.log(`${socket.user.username} joined invite-only room: ${room.name}`);
          return callback({ success: true, room });
        }
        
        return callback({ 
          success: false, 
          message: "This room is invite-only. You need an invitation to join." 
        });
      }
      
      // Default case
      return callback({ success: false, message: "Cannot join this room" });
      
    } catch (err) {
      console.error("room:join error:", err);
      callback({ success: false, message: "Failed to join room" });
    }
  });

  // room:request_join - Request to join a private room
  socket.on("room:request_join", async ({ roomId }, callback) => {
    try {
      if (!roomId) {
        return callback({ success: false, message: "roomId is required" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      const userId = socket.user._id;
      const userIdStr = userId.toString();
      
      // Check if already a member
      if (room.members.some(m => m.toString() === userIdStr)) {
        return callback({ success: false, message: "You are already a member" });
      }
      
      // Check if request already pending
      if (room.pendingRequests?.some(req => req.user.toString() === userIdStr)) {
        return callback({ success: false, message: "Join request already pending" });
      }
      
      // Add pending request
      if (!room.pendingRequests) room.pendingRequests = [];
      room.pendingRequests.push({
        user: userId,
        requestedAt: new Date()
      });
      await room.save();
      
      // Notify all admins
      const allSockets = await io.fetchSockets();
      for (const adminId of room.admins) {
        const adminSocket = allSockets.find(s => s.user?._id.toString() === adminId.toString());
        if (adminSocket) {
          adminSocket.emit("room:join_requested", {
            roomId: room._id,
            roomName: room.name,
            user: {
              _id: socket.user._id,
              username: socket.user.username
            }
          });
        }
      }
      
      console.log(`${socket.user.username} requested to join ${room.name}`);
      callback({ success: true, message: "Join request sent" });
      
    } catch (err) {
      console.error("room:request_join error:", err);
      callback({ success: false, message: "Failed to send request" });
    }
  });

  // room:approve_member - Admin approves a join request
  socket.on("room:approve_member", async ({ roomId, userId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }
      
      // Check if user is admin
      if (!room.admins.some(a => a.toString() === socket.user._id.toString())) {
        return callback({ success: false, message: "Only admins can approve members" });
      }
      
      // Remove from pending requests
      room.pendingRequests = room.pendingRequests.filter(
        req => req.user.toString() !== userId
      );
      
      // Add to members if not already
      if (!room.members.some(m => m.toString() === userId)) {
        room.members.push(userId);
        await room.save();
      }
      
      // Notify the approved user
      const allSockets = await io.fetchSockets();
      const userSocket = allSockets.find(s => s.user?._id.toString() === userId);
      if (userSocket) {
        userSocket.emit("room:request_approved", {
          roomId: room._id,
          roomName: room.name,
          room
        });
      }
      
      console.log(`User ${userId} was approved to join ${room.name} by ${socket.user.username}`);
      callback({ success: true });
      
    } catch (err) {
      console.error("room:approve_member error:", err);
      callback({ success: false, message: "Failed to approve member" });
    }
  });

  // room:reject_member - Admin rejects a join request
  socket.on("room:reject_member", async ({ roomId, userId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }
      
      // Check if user is admin
      if (!room.admins.some(a => a.toString() === socket.user._id.toString())) {
        return callback({ success: false, message: "Only admins can reject members" });
      }
      
      // Remove from pending requests
      room.pendingRequests = room.pendingRequests.filter(
        req => req.user.toString() !== userId
      );
      await room.save();
      
      // Notify the rejected user
      const allSockets = await io.fetchSockets();
      const userSocket = allSockets.find(s => s.user?._id.toString() === userId);
      if (userSocket) {
        userSocket.emit("room:request_rejected", {
          roomId: room._id,
          roomName: room.name
        });
      }
      
      console.log(`User ${userId} was rejected from ${room.name} by ${socket.user.username}`);
      callback({ success: true });
      
    } catch (err) {
      console.error("room:reject_member error:", err);
      callback({ success: false, message: "Failed to reject member" });
    }
  });

  // room:accept_invite - Accept a room invitation
  socket.on("room:accept_invite", async ({ roomId }, callback) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }
      
      const userId = socket.user._id;
      const userIdStr = userId.toString();
      
      // Check if user is invited
      if (!room.invitedUsers?.some(id => id.toString() === userIdStr)) {
        return callback({ success: false, message: "You are not invited to this room" });
      }
      
      // Add to members
      if (!room.members.some(m => m.toString() === userIdStr)) {
        room.members.push(userId);
      }
      
      // Remove from invited users
      room.invitedUsers = room.invitedUsers.filter(id => id.toString() !== userIdStr);
      await room.save();
      
      // Join the room
      socket.join(roomId);
      
      callback({ success: true, room });
      
    } catch (err) {
      console.error("room:accept_invite error:", err);
      callback({ success: false, message: "Failed to accept invite" });
    }
  });

  // ── dm:start ──────────────────────────────────────────────────
  socket.on("dm:start", async ({ targetUserId }, callback) => {
    try {
      if (!targetUserId) {
        return callback({ success: false, message: "targetUserId is required" });
      }

      // Cannot DM yourself
      if (targetUserId === socket.user._id.toString()) {
        return callback({ success: false, message: "Cannot DM yourself" });
      }

      // Check target user exists
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return callback({ success: false, message: "User not found" });
      }

      // Generate consistent DM room name
      const ids = [socket.user._id.toString(), targetUserId].sort();
      const dmName = `dm_${ids[0]}_${ids[1]}`;

      // Find existing DM or create new one
      let room = await Room.findOne({ name: dmName, isDirect: true });

      if (!room) {
        room = await Room.create({
          name:      dmName,
          isDirect:  true,
          isPrivate: true,
          type:      "direct",
          createdBy: socket.user._id,
          members:   [socket.user._id, targetUserId],
          admins:    [socket.user._id, targetUserId],
          pendingRequests: [],
          invitedUsers: [],
        });
      }

      // Join the socket room
      socket.join(room._id.toString());

      // Also notify target user if they are online
      const allSockets = await io.fetchSockets();
      const targetSocket = allSockets.find(
        (s) => s.user?._id.toString() === targetUserId
      );

      if (targetSocket) {
        targetSocket.join(room._id.toString());
        targetSocket.emit("dm:new", {
          room,
          from: {
            _id:      socket.user._id,
            username: socket.user.username,
          },
        });
      }

      console.log(`DM started: ${socket.user.username} → ${targetUser.username}`);
      callback({ success: true, room, targetUser });

    } catch (err) {
      console.error("dm:start error:", err);
      callback({ success: false, message: "Failed to start DM" });
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

  // room:list - Show public rooms AND private rooms user has access to
  socket.on("room:list", async (_, callback) => {
    try {
      const userId = socket.user._id;
      
      const rooms = await Room.find({
        $or: [
          { type: "public", isPrivate: false },
          { 
            $and: [
              { type: { $in: ["private", "invite"] } },
              { $or: [
                { members: userId },
                { admins: userId }
              ]}
            ]
          }
        ]
      })
        .populate("createdBy", "username")
        .populate("admins", "username")
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
        .populate("members", "username isOnline lastSeen")
        .populate("admins", "username isOnline lastSeen");

      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      callback({ success: true, members: room.members, admins: room.admins });

    } catch (err) {
      console.error("room:get_members error:", err);
      callback({ success: false, message: "Failed to fetch members" });
    }
  });

  // room:make_admin - Promote user to admin
  socket.on("room:make_admin", async ({ roomId, userId }, callback) => {
    try {
      if (!roomId || !userId) {
        return callback({ success: false, message: "roomId and userId are required" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Check if requesting user is an admin
      if (!room.admins.map(a => a.toString()).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Only admins can promote users" });
      }

      // Check if target user is a member
      if (!room.members.map(m => m.toString()).includes(userId)) {
        return callback({ success: false, message: "User is not a member of this room" });
      }

      // Add to admins if not already
      if (!room.admins.map(a => a.toString()).includes(userId)) {
        room.admins.push(userId);
        await room.save();
        
        // Notify the room
        io.to(roomId).emit("room:admin_added", {
          roomId,
          userId,
          promotedBy: socket.user._id,
        });
      }

      callback({ success: true, admins: room.admins });

    } catch (err) {
      console.error("room:make_admin error:", err);
      callback({ success: false, message: "Failed to promote user" });
    }
  });

  // room:remove_admin - Demote admin
  socket.on("room:remove_admin", async ({ roomId, userId }, callback) => {
    try {
      if (!roomId || !userId) {
        return callback({ success: false, message: "roomId and userId are required" });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found" });
      }

      // Check if requesting user is an admin
      if (!room.admins.map(a => a.toString()).includes(socket.user._id.toString())) {
        return callback({ success: false, message: "Only admins can demote users" });
      }

      // Cannot demote the creator
      if (room.createdBy.toString() === userId) {
        return callback({ success: false, message: "Cannot demote the room creator" });
      }

      // Remove from admins
      room.admins = room.admins.filter(a => a.toString() !== userId);
      await room.save();

      // Notify the room
      io.to(roomId).emit("room:admin_removed", {
        roomId,
        userId,
        demotedBy: socket.user._id,
      });

      callback({ success: true, admins: room.admins });

    } catch (err) {
      console.error("room:remove_admin error:", err);
      callback({ success: false, message: "Failed to demote user" });
    }
  });

};

module.exports = registerRoomHandlers;