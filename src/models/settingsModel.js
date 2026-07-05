const mongoose = require("mongoose");

// =========================
// Normalization helper
// =========================
const normalize = (str) => {
  if (!str || typeof str !== "string") return str;

  return str.trim().toLowerCase().replace(/\s+/g, "_");
};

// =========================
// Sub Schema (Value)
// =========================
const valueSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  enabled: {
    type: Boolean,
    default: false,
  },

  value: {
    type: mongoose.Schema.Types.Mixed,
  },

  channel: {
    type: [String],
    enum: ["admin", "email", "system"],
    default: ["email"],
  },
});

// =========================
// Main Schema
// =========================
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    value: [valueSchema],

    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// =========================
// PRE SAVE (normalize key + value.type)
// =========================
settingsSchema.pre("save", function () {
  // normalize key
  if (this.key) {
    this.key = normalize(this.key);
  }

  // normalize value.type
  if (Array.isArray(this.value)) {
    this.value = this.value.map((item) => ({
      ...(item.toObject?.() || item),
      type: normalize(item.type),
    }));
  }
});

// =========================
// PRE UPDATE (findOneAndUpdate / updateMany)
// =========================
settingsSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();

  if (!update) return;

  // normalize key
  if (update.key) {
    update.key = normalize(update.key);
  }

  // normalize value array
  if (Array.isArray(update.value)) {
    update.value = update.value.map((item) => ({
      ...item,
      type: normalize(item.type),
    }));
  }

  this.setUpdate(update);
});

// =========================
// EXPORT MODEL
// =========================
module.exports = mongoose.model("Settings", settingsSchema);
