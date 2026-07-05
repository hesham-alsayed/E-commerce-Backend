const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // User who wrote the review
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      // Product being reviewed
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      // Rating given by user (1-5)
    },
    comment: {
      type: String,
      // Review comment
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
