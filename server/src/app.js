const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");

const healthRoute  = require("./routes/health.route");
const authRoute    = require("./routes/auth.route");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false, // Socket.io requires relaxed CSP
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRoute);
app.use("/api/auth",   authRoute);

module.exports = app;