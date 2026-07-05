const mongoose = require("mongoose");

// ===============================
// 🧩 SECTION SCHEMA
// ===============================
const sectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["banner", "products", "text"],
      required: true,
    },

    props: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      required: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true, timestamps: true },
);

// ===============================
// 📄 PAGE SCHEMA
// ===============================
const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    sections: {
      type: [sectionSchema],
      default: [],
    },

    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Page", pageSchema);
