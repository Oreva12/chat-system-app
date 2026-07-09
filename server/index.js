require("dotenv").config();
const http       = require("http");
const app        = require("./src/app");
const connectDB  = require("./src/db");
const initSocket = require("./src/socket/socket");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  setTimeout(() => process.exit(1), 5000);
});