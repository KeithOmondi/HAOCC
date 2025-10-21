import express from "express";
import { getAdminDashboardStats } from "../controller/adminDashboardController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔹 GET /api/admin/dashboard
router.get("/dashboard", isAuthenticated, isAuthorized("Admin"), getAdminDashboardStats);

export default router;
