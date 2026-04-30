const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");

const healthRoute  = require("./routes/health.route");
const authRoute    = require("./routes/auth.route");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true, // required for cookies to be sent cross-origin
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRoute);
app.use("/api/auth",   authRoute);

module.exports = app;