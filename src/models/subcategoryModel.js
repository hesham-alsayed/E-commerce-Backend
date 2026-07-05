const mongoose = require("mongoose");
const slugify = require("slugify");

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g. "T-shirt", "Hoodie"
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    // ================= COLLECTION (NEW) =================
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "draft"],
      default: "draft",
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
  { timestamps: true },
);

// ================= AUTO SLUG =================
subcategorySchema.pre("save", function () {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
});

module.exports = mongoose.model("Subcategory", subcategorySchema);
