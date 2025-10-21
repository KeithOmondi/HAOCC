// middlewares/rateLimiter.js
import rateLimit from "express-rate-limit";

// Apply to sensitive routes like auth and chat
export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: "Too many requests from this IP, please try again later",
});


// 🔒 General rate limiter for all requests
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔒 Stricter limiter for login route
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP
  message: {
    success: false,
    message:
      "Too many login attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
