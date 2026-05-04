require("dotenv").config({ path: __dirname + "/src/.env" });
const http       = require("http");
const app        = require("./src/app");
const connectDB  = require("./src/db");
const initSocket = require("./src/socket/socket");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Create HTTP server from Express app
  const server = http.createServer(app);

  // Attach Socket.io to the HTTP server
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});