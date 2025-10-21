import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Property from "../models/Property.js";
import Booking from "../models/Booking.js";
import Transaction from "../models/Transaction.js";

// GET /api/admin/dashboard
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalProperties, totalBookings, totalTransactions] = await Promise.all([
    User.countDocuments(),
    Property.countDocuments(),
    Booking.countDocuments(),
    Transaction.countDocuments(),
  ]);

  const recentProperties = await Property.find().sort({ createdAt: -1 }).limit(5);
  const recentTransactions = await Transaction.find().sort({ createdAt: -1 }).limit(5);

  res.status(200).json({
    stats: { totalUsers, totalProperties, totalBookings, totalTransactions },
    recent: { properties: recentProperties, transactions: recentTransactions },
  });
});
