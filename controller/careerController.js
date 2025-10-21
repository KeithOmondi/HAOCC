import Career from "../models/Career.js";
import asyncHandler from "express-async-handler";

// @desc    Get all careers
// @route   GET /api/careers
// @access  Public
export const getCareers = asyncHandler(async (req, res) => {
  const careers = await Career.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: careers });
});

// @desc    Create a new career
// @route   POST /api/careers
// @access  Admin
export const createCareer = asyncHandler(async (req, res) => {
  const { title, location, type, description } = req.body;
  const career = await Career.create({ title, location, type, description });
  res.status(201).json({ success: true, data: career });
});

// @desc    Get single career
// @route   GET /api/careers/:id
// @access  Public
export const getCareerById = asyncHandler(async (req, res) => {
  const career = await Career.findById(req.params.id);
  if (!career) {
    res.status(404);
    throw new Error("Career not found");
  }
  res.status(200).json({ success: true, data: career });
});

// @desc    Update a career
// @route   PUT /api/careers/:id
// @access  Admin
export const updateCareer = asyncHandler(async (req, res) => {
  const career = await Career.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!career) {
    res.status(404);
    throw new Error("Career not found");
  }
  res.status(200).json({ success: true, data: career });
});

// @desc    Delete a career
// @route   DELETE /api/careers/:id
// @access  Admin
export const deleteCareer = asyncHandler(async (req, res) => {
  const career = await Career.findById(req.params.id);
  if (!career) {
    res.status(404);
    throw new Error("Career not found");
  }
  await career.remove();
  res.status(200).json({ success: true, message: "Career removed" });
});
