import Property from "../models/Property.js";
import User from "../models/userModel.js";
import Booking from "../models/bookingModel.js";

export const getAdminDashboardStats = async (req, res) => {
  try {
    // ─── Counters ─────────────────────────────
    const totalProperties = await Property.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalAgents = await User.countDocuments({ role: "Agent" });
    const totalBookings = await Booking.countDocuments();

    const pendingBookings = await Booking.countDocuments({ status: "Pending" });
    const confirmedBookings = await Booking.countDocuments({ status: "Confirmed" });
    const cancelledBookings = await Booking.countDocuments({ status: "Cancelled" });

    // ─── Trends (Last 6 Months) ─────────────────────────────
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();

    const last6Months = months.slice(
      Math.max(currentMonth - 5, 0),
      currentMonth + 1
    );

    // Bookings grouped by month
    const bookingsByMonth = await Booking.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    const bookingTrends = months.map((m, idx) => {
      const found = bookingsByMonth.find((b) => b._id === idx + 1);
      return { month: m, total: found ? found.total : 0 };
    });

    // Property distribution by category
    const propertyCategoryStats = await Property.aggregate([
      { $group: { _id: "$category", total: { $sum: 1 } } },
    ]);

    // ─── Summary Object ─────────────────────────────
    const stats = {
      summary: {
        totalProperties,
        totalUsers,
        totalAgents,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
      },
      charts: {
        bookingTrends,
        propertyCategoryStats,
      },
    };

    res.status(200).json({
      success: true,
      message: "Admin dashboard stats fetched successfully",
      stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard statistics",
    });
  }
};
