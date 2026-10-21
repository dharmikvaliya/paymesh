const express = require("express");

const {
  register,
  login,
  getMe,
  refreshAccessToken,
  logout,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", protect, getMe);

// Refresh access token
router.post("/refresh", refreshAccessToken);

// Logout
router.post("/logout", logout);

module.exports = router;