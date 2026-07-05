// models/collectionModel.js
const mongoose = require("mongoose");
const slugify = require("slugify");

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
      index: true, // 🔥 INDEX for fast search
    },
    slug: {
      type: String,
      unique: true,
      index: true, // 🔥 INDEX for slug lookup
      lowercase: true,
    },
    description: String,
    image: {
      type: String,
      default: "default-image.jpg",
    },
    status: {
      type: String,
      enum: ["active", "draft"],
      default: "draft",
      index: true, // 🔥 INDEX for status filtering
    },
    discount: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
      value: {
        type: Number,
        default: 0,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      startDate: Date,
      endDate: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: false },
    toObject: { virtuals: true, transform: false },
  },
);

// 🔥 COMPOUND INDEX for common queries
collectionSchema.index({ status: 1, createdAt: -1 });
collectionSchema.index({ name: 1, status: 1 });

// 🔥 Generate slug ONCE
collectionSchema.pre("save", function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

module.exports = mongoose.model("Collection", collectionSchema);
