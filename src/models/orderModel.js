const mongoose = require("mongoose");
const addressSchema = require("./addressModel.js");
const shippingMethodSchema = require("./shippingMethodsModel.js");
const orderTrackingSchema = require("./orderTrackingModel.js");
const cartItemSchema = require("./cartItemsModel.js");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    invoiceNumber: { type: String, unique: true },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [cartItemSchema],

    contactEmail: { type: String, required: true },

    shippingAddress: addressSchema,
    billingAddress: addressSchema,
    billingSameAsShipping: { type: Boolean, default: true },

    shipping: {
      zoneName: String,
      city: String,
      price: Number,
      estimatedDays: Number,
    },

    paymentMethod: {
      type: String,
      enum: ["paypal", "cash"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },

    paymentInfo: {
      provider: {
        type: String,
        enum: ["paypal", "cash"],
        required: true,
      },
      transactionId: String,
      paypalOrderId: String,
    },

    // ================= ORDER STATUS (UPDATED) =================
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    tracking: [orderTrackingSchema],
    stockAdjusted: {
      type: Boolean,
      default: false,
    },
    itemsPrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },

    totalPrice: { type: Number, required: true },
    totalPriceAfterDiscount: { type: Number, required: true },

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    paidAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // ================= NEW OPTIONAL META =================
    failedDeliveryAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
    },
    partnerCommissionAdded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
