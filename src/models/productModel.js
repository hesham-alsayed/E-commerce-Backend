const mongoose = require("mongoose");
const variantSchema = require("./variantModel");
const reviewModel = require("./reviewModel");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, set: (v) => v.toLowerCase() },
    description: { type: String, set: (v) => v.toLowerCase() },
    brand: { type: String, set: (v) => v.toLowerCase() },
    material: { type: String, set: (v) => v.toLowerCase() },

    price: { type: Number, required: true },
    oldPrice: { type: Number },

    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },

    variants: { type: [variantSchema], default: [] },

    stock: { type: Number, default: 0 },

    averageRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    colors: { type: [String], default: [] },
    size: { type: [String], default: ["One Size"] },

    status: { type: String, enum: ["active", "draft"], default: "active" },

    gender: { type: String, enum: ["men", "kids"], required: true },

    type: {
      type: String,
      enum: [
        "clothes",
        "trousers",
        "shorts",
        "coat",
        "blazer",
        "shoes",
        "vest",
      ],
      required: true,
    },
  },
  { timestamps: true },
);

// ================= STOCK CALC =================
const calculateStock = (variants = []) =>
  variants.reduce((total, v) => {
    return total + (v.sizes || []).reduce((sum, s) => sum + (s.stock || 0), 0);
  }, 0);

// ================= AUTO UPDATE =================
productSchema.pre("save", function () {
  this.stock = calculateStock(this.variants);
});

module.exports = mongoose.model("Product", productSchema);
