const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      // Unique coupon code entered by the user during checkout
      // Example: "SALE10", "WELCOME20"
      // - uppercase: automatically converts the code to uppercase
      // - trim: removes extra spaces before/after the text
    },

    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
    },

    type: {
      type: String,
      enum: ["general", "partner"],
      default: "general",
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      // Defines how the discount will be calculated
      // percentage → discount is a percentage (example: 10%)
      // fixed → discount is a fixed amount (example: $50)
    },

    discountValue: {
      type: Number,
      required: true,
      // The value of the discount
      // If discountType = "percentage" → value represents %
      // Example: 10 = 10% discount
      // If discountType = "fixed" → value represents a fixed amount
      // Example: 100 = $100 discount
    },

    minPurchase: {
      type: Number,
      default: 0,
      // Minimum order amount required to use this coupon
      // Example: if minPurchase = 500, the order must be at least 500 to apply the coupon
      // default 0 means no minimum purchase requirement
    },

    startDate: {
      type: Date,
      required: true,
      // The date when the coupon becomes valid
      // Users cannot apply the coupon before this date
    },

    endDate: {
      type: Date,
      required: true,
      // The expiration date of the coupon
      // After this date the coupon becomes invalid
    },

    usageLimit: {
      type: Number,
      default: 0,
      // Maximum number of times this coupon can be used
      // Example: usageLimit = 100 → coupon can be used 100 times only
      // 0 means unlimited usage
    },

    usedCount: {
      type: Number,
      default: 0,
      // Tracks how many times the coupon has already been used
      // This value increases every time an order successfully uses the coupon
    },

    active: {
      type: Boolean,
      default: true,
      // true → coupon can be used
      // false → coupon is disabled by the admin
    },
  },
  { timestamps: true },
  // Automatically adds:
);

// Method to check if the coupon is currently valid
couponSchema.statics.isValidCoupon = function (coupon) {
  const now = new Date();

  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);

  return (
    coupon.active === true &&
    now >= start &&
    now <= end &&
    (coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit)
  );
};

couponSchema.pre("save", function () {
  if (this.type === "partner" && !this.partner) {
    throw new Error("Partner coupon must have a partnerId");
  }
});
module.exports = mongoose.model("Coupon", couponSchema);
