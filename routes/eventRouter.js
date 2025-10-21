import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controller/eventController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// Public Routes
router.get("/get", getAllEvents);
router.get("/get/:id", getEventById);

// Admin Routes (single image only)
router.post(
  "/create",
  isAuthenticated,
  isAuthorized("Admin"),
  upload.single("image"), // ✅ single image field
  createEvent
);

router.put(
  "/update/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  upload.single("image"), // ✅ single image field
  updateEvent
);

router.delete(
  "/delete/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  deleteEvent
);

export default router;
