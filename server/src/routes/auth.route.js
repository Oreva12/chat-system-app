const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/auth.controller");

router.post("/login",    authLimiter, login);
router.post("/register", authLimiter, register);
router.post("/logout",   protect, logout);
router.get("/me",        protect, getMe);

module.exports = router;