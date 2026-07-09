const User = require("../../models/user.model");

const registerUserHandlers = (io, socket) => {

  // ── user:list ─────────────────────────────────────────────────
  // Returns all users except the current user
  socket.on("user:list", async (_, callback) => {
    try {
      const users = await User.find({ _id: { $ne: socket.user._id } })
        .select("username isOnline lastSeen avatarUrl")
        .sort({ isOnline: -1, username: 1 });

      callback({ success: true, users });
    } catch (err) {
      console.error("user:list error:", err);
      callback({ success: false, message: "Failed to fetch users" });
    }
  });

};

module.exports = registerUserHandlers;