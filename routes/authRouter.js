import express from "express";
import {
  forgotPassword,
  getUser,
  login,
  logout,
  refreshToken,   // ✅ NEW
  register,
  resendOTP,
  resetPassword,
  updatePassword,
  updateProfile,
  verifyOTP,
  // future: getLoginHistory, forceChangePassword
} from "../controller/authController.js";

import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { registerValidation, validateRequest } from "../middlewares/authValidator.js";

const router = express.Router();

/* ================================
   Auth Routes
================================ */
router.post("/register", registerValidation, validateRequest, register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);

// 🔐 Logout should be POST (better for state changes)
router.post("/logout", isAuthenticated, logout);

// Profile
router.get("/me", isAuthenticated, getUser);

// ✅ Refresh Token endpoint
router.post("/refresh-token", refreshToken);

// Password management
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);
router.put("/password/update", isAuthenticated, updatePassword);

// OTP
router.post("/otp/resend", resendOTP);

router.put("/profile/update", isAuthenticated, updateProfile);

// 🔐 Future security routes (not wired yet)
// router.get("/logins", isAuthenticated, getLoginHistory);
// router.post("/force-change-password", forceChangePassword);a

export default router;
