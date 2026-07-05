const mongoose = require("mongoose");

const orderTrackingSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ],
    required: true,
    default: "pending",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  note: String,
});

module.exports = orderTrackingSchema;
