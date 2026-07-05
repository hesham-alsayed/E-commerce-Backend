const AppError = require("../../utils/AppError");
const { uploadToCloudinary } = require("./uploadToCloudinary");

exports.uploadProductVariants = async (req, res, next) => {
  try {
    // 🚀 FAST PARSING
    const product = JSON.parse(req.body.product || "{}");
    const files = req.files || [];

    // 🛡️ Early exit if no files
    if (files.length === 0) {
      req.body = product;
      return next();
    }

    const variantIndexes = JSON.parse(req.body.variantIndex || "[]");

    // =========================
    // 🚀 ULTRA-FAST PARALLEL UPLOAD
    // =========================
    const uploadPromises = files.map((file, i) => {
      const index = variantIndexes[i];

      // 🛑 Skip invalid indexes
      if (!index && index !== 0) return Promise.resolve(null);

      return Promise.race([
        uploadToCloudinary(file.buffer),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Upload timeout")), 30000),
        ),
      ])
        .then((result) => ({
          index,
          url: result.secure_url,
        }))
        .catch(() => null); // Skip failed uploads
    });

    // 🔥 PARALLEL EXECUTION - No blocking
    const results = await Promise.all(uploadPromises);

    // =========================
    // ⚡ SUPER FAST GROUPING (O(n))
    // =========================
    const grouped = {};
    for (const item of results) {
      if (!item) continue;

      if (!grouped[item.index]) {
        grouped[item.index] = [];
      }
      grouped[item.index].push(item.url);
    }

    // =========================
    // 🚀 ONE-PASS MERGE (No map overhead)
    // =========================
    const variants = product.variants || [];
    for (let i = 0; i < variants.length; i++) {
      const newImages = grouped[i] || [];
      if (newImages.length > 0) {
        variants[i] = {
          ...variants[i],
          images: [...(variants[i]?.images || []), ...newImages],
        };
      }
    }
    product.variants = variants;

    // ✅ CLEAN & PASS
    req.body = product;
    next();
  } catch (err) {
    console.error("🚨 Upload error:", err);
    throw new AppError("Image processing failed", 500);
  }
};
