const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      // Category name like "Apparel", "Shoes"
    },

    slug: {
      type: String,
      // URL-friendly
    },

    description: {
      type: String,
      required: true,
    },
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: [true, "Collection ID is required"],
      // Link to parent collection (Men, Kids, etc.)
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
  { timestamps: true, suppressReservedKeysWarning: true },
);

categorySchema.pre("save", function () {
  if (!this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
});

module.exports = mongoose.model("Category", categorySchema);
