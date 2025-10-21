import asyncHandler from "express-async-handler";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private
export const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select("-password");
  if (!admin) {
    res.status(404);
    throw new Error("Admin not found");
  }
  res.json(admin);
});

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) {
    res.status(404);
    throw new Error("Admin not found");
  }

  const { name, email, currentPassword, newPassword } = req.body;

  // Update name & email
  if (name) admin.name = name;
  if (email) admin.email = email;

  // Update password if requested
  if (newPassword) {
    if (!currentPassword) {
      res.status(400);
      throw new Error("Current password is required to change password");
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Current password is incorrect");
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
  }

  const updatedAdmin = await admin.save();
  res.json({
    _id: updatedAdmin._id,
    name: updatedAdmin.name,
    email: updatedAdmin.email,
  });
});
