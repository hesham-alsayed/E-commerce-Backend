const productModel = require("../src/models/productModel");
const AppError = require("./AppError");

/* =========================
   HELPERS
========================= */
const normalizeSize = (size) =>
  size.toString().trim().toUpperCase().replace(/['"]/g, "");

const normalizeColor = (color) => color.toLowerCase();

/* =========================
   1. VALIDATE ONLY (NO UPDATE)
   ALL OR NOTHING CHECK
========================= */
exports.validateOrderStock = async (items) => {
  for (const item of items) {
    const product = await productModel.findById(item.product);

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const variant = product.variants.find(
      (v) => normalizeColor(v.color) === normalizeColor(item.color),
    );

    if (!variant) {
      throw new AppError(
        `Variant not found: ${item.color} in ${product.title}`,
        404,
      );
    }

    const size = variant.sizes.find(
      (s) => normalizeSize(s.size) === normalizeSize(item.size),
    );

    if (!size) {
      throw new AppError(
        `Size not found: ${item.size} in ${product.title}`,
        404,
      );
    }

    const stock = Number(size.stock || 0);
    const qty = Number(item.quantity || 0);

    if (stock < qty) {
      throw new AppError(
        `Insufficient stock for ${product.title} (${item.color} / ${item.size}) - only ${stock} left`,
        400,
      );
    }
  }
};

/* =========================
   2. DECREASE STOCK (SAFE)
   ONLY AFTER VALIDATION PASSES
========================= */
exports.decreaseStock = async (items) => {
  const productMap = new Map();

  for (const item of items) {
    const product =
      productMap.get(item.product.toString()) ||
      (await productModel.findById(item.product));

    if (!product) continue;

    productMap.set(item.product.toString(), product);

    const variant = product.variants.find(
      (v) => normalizeColor(v.color) === normalizeColor(item.color),
    );

    if (!variant) continue;

    const size = variant.sizes.find(
      (s) => normalizeSize(s.size) === normalizeSize(item.size),
    );

    if (!size) continue;

    const stock = Number(size.stock || 0);
    const qty = Number(item.quantity || 0);

    size.stock = stock - qty;
  }

  // commit updates
  for (const product of productMap.values()) {
    await productModel.updateOne(
      { _id: product._id },
      { $set: { variants: product.variants } },
    );
  }
};

/* =========================
   3. RESTORE STOCK (CANCEL ORDER)
========================= */
exports.restoreStock = async (items) => {
  const productMap = new Map();

  for (const item of items) {
    const product =
      productMap.get(item.product.toString()) ||
      (await productModel.findById(item.product));

    if (!product) continue;

    productMap.set(item.product.toString(), product);

    const variant = product.variants.find(
      (v) => normalizeColor(v.color) === normalizeColor(item.color),
    );

    if (!variant) continue;

    const size = variant.sizes.find(
      (s) => normalizeSize(s.size) === normalizeSize(item.size),
    );

    if (!size) continue;

    const qty = Number(item.quantity || 0);

    size.stock = Number(size.stock || 0) + qty;
  }

  for (const product of productMap.values()) {
    await productModel.updateOne(
      { _id: product._id },
      { $set: { variants: product.variants } },
    );
  }
};

/* =========================
   4. SAFE ORDER FLOW (MAIN LOGIC)
   THIS IS WHAT YOU SHOULD USE
========================= */
exports.processOrderStock = async (items) => {
  // STEP 1: validate everything first
  await exports.validateOrderStock(items);

  // STEP 2: if all OK → decrease stock
  await exports.decreaseStock(items);
};
