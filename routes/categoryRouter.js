import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from "../controller/categoryController.js";

const router = express.Router();

router.post("/create", createCategory);
router.get("/get", getAllCategories);
router.get("/get/:slug", getCategoryBySlug);
router.put("/update/:id", updateCategory);
router.delete("/delete/:id", deleteCategory);

export default router;
