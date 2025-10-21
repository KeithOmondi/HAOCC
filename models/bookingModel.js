import mongoose from "mongoose";

const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional for guest bookings
    },
    name: {
      type: String, // Guest name
    },
    email: {
      type: String, // Guest email
    },
    phone: {
      type: String, // Guest phone
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: "User", // optional agent
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled", "Completed"],
      default: "Pending",
    },
    totalPrice: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Refunded"],
      default: "Unpaid",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
