require("dotenv").config({ path: __dirname + "/src/.env" });

const http = require("http");

const app = require("./src/app");
const connectDB = require("./src/db");
const initSocket = require("./src/socket/socket");

const PORT = process.env.PORT || 5000;

// ===============================
// Global Error Handlers
// ===============================

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
});

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);

  // Allow ongoing requests to complete before exiting
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

// ===============================
// Start Server
// ===============================

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Create HTTP server from Express app
    const server = http.createServer(app);

    // Initialize Socket.io
    initSocket(server);

    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();