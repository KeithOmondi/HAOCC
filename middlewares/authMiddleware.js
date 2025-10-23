import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";

/* =========================================================
   🧩 Verify Logged-in User (JWT Authentication)
========================================================= */
export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    console.log("[Auth] No token provided");
    return next(new ErrorHandler("Access denied. Please log in to continue.", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[Auth] Token decoded:", decoded);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("[Auth] User not found for decoded ID:", decoded.id);

      // Clear cookies to prevent repeated 500s
      res.clearCookie("token");
      res.clearCookie("refreshToken");

      return next(new ErrorHandler("User not found or no longer exists.", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[Auth] JWT verification error:", error);

    // Clear cookies if token is invalid or expired
    res.clearCookie("token");
    res.clearCookie("refreshToken");

    if (error.name === "TokenExpiredError") {
      return next(new ErrorHandler("Session expired. Please log in again.", 401));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new ErrorHandler("Invalid token. Please log in again.", 401));
    }

    return next(new ErrorHandler("Authentication failed.", 401));
  }
});


/* =========================================================
   🧠 Role-based Authorization Middleware
========================================================= */
export const isAuthorized = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler("Authentication required.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Access denied. '${req.user.role}' cannot perform this action.`,
          403
        )
      );
    }

    next();
  };
};
