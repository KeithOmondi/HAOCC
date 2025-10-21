import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["Card", "Bank", "Mobile Money"], default: "Mobile Money" },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },
    reference: String,
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
