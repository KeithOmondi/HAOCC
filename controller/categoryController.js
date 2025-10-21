import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";

/* ============================================================
   🆕 CREATE CATEGORY
============================================================ */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, type, description } = req.body;

  const existing = await Category.findOne({ name });
  if (existing) {
    return res.status(400).json({ success: false, message: "Category already exists" });
  }

  const category = await Category.create({ name, type, description });
  res.status(201).json({ success: true, category });
});

/* ============================================================
   📋 GET ALL CATEGORIES
============================================================ */
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ type: 1, name: 1 });
  res.status(200).json({ success: true, categories });
});

/* ============================================================
   🔍 GET SINGLE CATEGORY
============================================================ */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug });

  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  res.status(200).json({ success: true, category });
});

/* ============================================================
   ✏️ UPDATE CATEGORY
============================================================ */
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const category = await Category.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  res.status(200).json({ success: true, category });
});

/* ============================================================
   ❌ DELETE CATEGORY
============================================================ */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  res.status(200).json({ success: true, message: "Category deleted successfully" });
});
