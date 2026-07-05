const mongoose = require("mongoose");
const slugify = require("slugify");

/* =========================
   CITY SUB SCHEMA
========================= */
const citySchema = new mongoose.Schema({
  city: { type: String, required: true },
  slug: { type: String, index: true },

  price: Number,
  estimatedDays: Number,

  isActive: { type: Boolean, default: true },
});

/* =========================
   ZONE SCHEMA
========================= */
const shippingZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },

  slug: {
    type: String,
    unique: true,
    index: true,
  },

  cities: [citySchema],

  isActive: {
    type: Boolean,
    default: true,
  },
});

/* =========================
   HELPERS
========================= */
const normalize = (str) =>
  typeof str === "string" ? str.trim().toLowerCase().replace(/\s+/g, "_") : str;

const makeSlug = (str) => slugify(str || "", { lower: true, strict: true });

/* =========================
   PRE SAVE
========================= */
shippingZoneSchema.pre("save", function () {
  if (this.name) {
    this.slug = makeSlug(this.name);

    // optional normalize name
    this.name = normalize(this.name);
  }

  if (this.cities?.length) {
    this.cities.forEach((c) => {
      c.slug = makeSlug(c.city);
      c.city = normalize(c.city);
    });
  }
});

/* =========================
   PRE UPDATE
========================= */
shippingZoneSchema.pre(["findOneAndUpdate", "updateOne"], function () {
  const update = this.getUpdate();
  if (!update) return;

  if (update.name) {
    update.name = normalize(update.name);
    update.slug = makeSlug(update.name);
  }

  if (Array.isArray(update.cities)) {
    update.cities = update.cities.map((c) => ({
      ...c,
      city: normalize(c.city),
      slug: makeSlug(c.city),
    }));
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("ShippingZone", shippingZoneSchema);
