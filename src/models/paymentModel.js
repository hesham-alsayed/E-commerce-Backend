import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    method: {
      type: String,
      enum: ["paypal", "cash", "credit_card"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    transactionId: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    paidAt: Date,
    refundedAt: Date,
    refundReason: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
