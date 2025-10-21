import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "./errorMiddlewares.js";

/* ============================================================
   🧩 Verify Logged-in User (JWT Authentication)
============================================================ */
export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.header("Authorization")?.replace("Bearer ", "");

  // 1️⃣ Ensure token exists
  if (!token) {
    return next(
      new ErrorHandler(401, "Access denied. Please log in to continue.")
    );
  }

  try {
    // 2️⃣ Decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Find user and ensure they still exist
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new ErrorHandler(401, "User not found or no longer exists."));
    }

    // 4️⃣ Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ErrorHandler(401, "Session expired. Please log in again."));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new ErrorHandler(401, "Invalid token. Please log in again."));
    }
    return next(new ErrorHandler(401, "Authentication failed."));
  }
});

/* ============================================================
   🧠 Role-based Authorization Middleware
============================================================ */
export const isAuthorized = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler(401, "Authentication required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          403,
          `Access denied. '${req.user.role}' cannot perform this action.`
        )
      );
    }

    next();
  };
};
