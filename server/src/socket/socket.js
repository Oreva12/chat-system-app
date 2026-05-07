const { Server }              = require("socket.io");
const jwt                     = require("jsonwebtoken");
const User                    = require("../models/user.model");
const registerRoomHandlers    = require("./handlers/room.handler");
const registerMessageHandlers = require("./handlers/message.handler");
const registerTypingHandlers  = require("./handlers/typing.handler");

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin:      process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error(
        err.name === "TokenExpiredError" ? "Token expired" : "Invalid token"
      ));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`✅ Connected: ${socket.user.username} (${socket.id})`);

    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    socket.emit("connected", {
      message: "Connected to chat server",
      user:    socket.user,
    });

    registerRoomHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);

    socket.on("disconnect", async (reason) => {
      console.log(`❌ Disconnected: ${socket.user.username} — ${reason}`);
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });

  return io;
};

module.exports = initSocket;