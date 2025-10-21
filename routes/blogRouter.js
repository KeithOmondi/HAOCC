import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} from "../controller/blogController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// Public
router.get("/get", getAllBlogs);
router.get("/get/:id", getBlogById);

// Admin routes
router.post(
  "/create",
  isAuthenticated,
  isAuthorized("Admin"),
  upload.single("image"),
  createBlog
);
router.put(
  "/update/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  upload.single("image"),
  updateBlog
);
router.delete(
  "/delete/:id",
  isAuthenticated,
  isAuthorized("Admin"),
  deleteBlog
);

export default router;
