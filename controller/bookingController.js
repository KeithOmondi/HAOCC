import Booking from "../models/bookingModel.js";
import Property from "../models/Property.js";

// ─── CREATE BOOKING ─────────────────────────────
export const createBooking = async (req, res) => {
  try {
    let { propertyId, date, startTime, endTime, totalPrice, notes, name, email, phone } = req.body;

    // ✅ Find property by propertyId (auto-generated ID) or fallback to MongoDB _id
    const property = await Property.findOne({
      $or: [{ propertyId }, { _id: propertyId }],
    });

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // Check for overlapping bookings
    const overlapping = await Booking.findOne({
      property: property._id,
      date,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "Time slot already booked. Please choose a different slot.",
      });
    }

    // Create booking
    const booking = await Booking.create({
      user: req.user?._id, // logged-in user optional
      name: name || req.user?.name || "Guest",
      email: email || req.user?.email || "",
      phone: phone || "",
      property: property._id,
      date,
      startTime,
      endTime,
      totalPrice,
      notes,
      status: "Pending",
      paymentStatus: "Unpaid",
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
};

// ─── GET USER BOOKINGS ─────────────────────────
export const getUserBookings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const bookings = await Booking.find({ user: req.user._id })
      .populate("property", "title price location")
      .populate("agent", "name email");

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching bookings" });
  }
};

// ─── GET ALL BOOKINGS (ADMIN) ──────────────────
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("property", "title propertyId")
      .populate("agent", "name email");

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

// ─── UPDATE BOOKING STATUS ────────────────────
export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update booking" });
  }
};
