import express from "express";
import { getAdminProfile, updateAdminProfile } from "../controller/adminController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/authMiddleware.js";

const router = express.Router();


  router.get("/get", isAuthenticated, isAuthorized("Admin"), getAdminProfile)
  router.put("/update", isAuthenticated, isAuthorized("Admin"), updateAdminProfile);

export default router;
