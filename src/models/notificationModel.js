const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "order_received",
      "order_shipped",
      "order_delivered",
      "payment_processed",
      "order_updated",
,      "order_cancelled",
      "refund_processed",
      "new_user_signup",
      "low_stock",
      "welcome_new_user",
      "product_back_in_stock",
      "review_received",
      "coupon_applied",
      "site_announcement",
      "admin_custom",
      "password_changed",
      "profile_updated",
      "account_deleted",
      "out_of_stock",
      "low_stock" 
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  icon: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // إذا موجه لمستخدم محدد
  target: { type: String, enum: ["user", "admin", "all"], default: "user" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  link: { type: String }, 
});

module.exports = mongoose.model("Notification", notificationSchema);
