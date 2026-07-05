const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true,
    set: (v) => (typeof v === "string" ? v.toLowerCase() : v),
  },
  colorCode: String,
  images: { type: [String], default: [] },
  sizes: [
    {
      size: {
        type: String,
        required: true,
        set: (v) => (typeof v === "string" ? v.toLowerCase() : v),
      },
      stock: { type: Number, default: 0 },
    },
  ],
});

module.exports = variantSchema;
