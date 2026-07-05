const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },

  size: {
    type: String,
    required: true,
  },

  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  image: String,
  colorCode: String,
  price: {
    type: Number,
    required: true,
  },
});

module.exports = cartItemSchema;
