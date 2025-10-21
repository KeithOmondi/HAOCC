// src/routes/PropertyRoutes.js
import express from "express";
import {
  createProperty,
  getAllProperties,
  getSingleProperty,
  updateProperty,
  deleteProperty,
  updatePropertyApproval,
  getAllPropertiesAdmin,
} from "../controller/PropertyController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

/* ============================================================
   🏡 PUBLIC ROUTES
============================================================ */

// 🔹 Get all properties (supports filters & category via query)
router.get("/get", getAllProperties);

// 🔹 Get properties by category slug
router.get(
  "/category/:slug",
  (req, res, next) => {
    req.query.category = req.params.slug;
    next();
  },
  getAllProperties
);

/* ============================================================
   🧾 ADMIN ROUTES
============================================================ */

router.get(
  "/get/admin",
  isAuthenticated,
  isAuthorized("Admin"),
  getAllPropertiesAdmin
);

/* ============================================================
   🔒 PROTECTED ROUTES
============================================================ */

// 🔹 Create property (upload images)
router.post(
  "/create",
  isAuthenticated,
  upload.fields([{ name: "images", maxCount: 10 }]),
  createProperty
);

// 🔹 Update property (owner or admin)
router.put(
  "/update/:id",
  isAuthenticated,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 2 },
  ]),
  updateProperty
);

// 🔹 Approve/unapprove property (Admin only)
router.put(
  "/update/:id/approve",
  isAuthenticated,
  isAuthorized("Admin"),
  updatePropertyApproval
);

// 🔹 Delete property (owner or admin)
router.delete("/delete/:id", isAuthenticated, deleteProperty);

// 🔹 Get a single property by ID or slug — keep this last
router.get("/get/:idOrSlug", getSingleProperty);

export default router;
