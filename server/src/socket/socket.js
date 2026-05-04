const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");
const User       = require("../models/user.model");

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin:      process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // ── Auth middleware on every connection ──────────────────────
  io.use(async (socket, next) => {
    try {
      // Client sends token in handshake auth
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("No token provided"));
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("User not found"));
      }

      // Attach user to socket for use in event handlers
      socket.user = user;
      next();

    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new Error("Token expired"));
      }
      return next(new Error("Invalid token"));
    }
  });

  // ── Connection handler ───────────────────────────────────────
  io.on("connection", async (socket) => {
    console.log(`✅ Socket connected: ${socket.user.username} (${socket.id})`);

    // Mark user online in DB
    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Confirm connection to the client
    socket.emit("connected", {
      message: "Connected to chat server",
      user:    socket.user,
    });

    // ── Disconnect handler ─────────────────────────────────────
    socket.on("disconnect", async (reason) => {
      console.log(`❌ Socket disconnected: ${socket.user.username} — ${reason}`);

      // Mark user offline in DB
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });

  return io;
};

module.exports = initSocket;