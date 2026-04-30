const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login",    login);
router.post("/logout",   protect, logout);
router.get("/me",        protect, getMe);

module.exports = router;