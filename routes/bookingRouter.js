import express from "express";
import {
  createBooking,
  getUserBookings,
  getAllBookings,
  updateBookingStatus,
} from "../controller/bookingController.js";
import {
  isAuthenticated,
  isAuthorized,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public / User Routes
router.post("/create", createBooking); // Create booking
router.get("/user", isAuthenticated, getUserBookings); // Get user's bookings

// Admin Routes
router.get("/admin", isAuthenticated, isAuthorized("Admin"), getAllBookings); // Get all bookings
router.put(
  "/admin/:id/status",
  isAuthenticated,
  isAuthorized("Admin"),
  updateBookingStatus
); // Update status

export default router;
