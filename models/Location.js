import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    city: { type: String, required: true },
    state: String,
    country: { type: String, default: "Kenya" },
    popularAreas: [String],
  },
  { timestamps: true }
);

export default mongoose.model("Location", locationSchema);
