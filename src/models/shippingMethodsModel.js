const mongoose = require("mongoose");

const shippingMethodSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ["Standard Shipping", "Express Shipping", "Next-Day Delivery"],
    default: "Standard Shipping",
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
});

module.exports = shippingMethodSchema;
