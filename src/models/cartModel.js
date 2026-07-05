const mongoose = require("mongoose");
const cartItemSchema = require("./cartItemsModel");


const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [cartItemSchema],

    totalPrice: {
      type: Number,
      default: 0,
    },

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
      // the coupon applied to this cart
    },

    discountAmount: {
      type: Number,
      default: 0,
      // how much money was discounted
    },

    totalPriceAfterDiscount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Cart", cartSchema);

