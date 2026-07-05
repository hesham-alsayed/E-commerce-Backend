const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const productModel = require("../models/productModel");

exports.resizeSingleVariantImages = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;

    if (!req.files || req.files.length === 0) return next();

    // get product & variant
    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    const variant = product.variants.id(variantId);
    if (!variant) return next(new AppError("Variant not found", 404));

    // prepare folder
    const uploadDir = path.join(__dirname, "../uploads/products");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const images = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const filename = `product-${productId}-${variantId}-${Date.now()}-${i}.jpeg`;

      await sharp(file.buffer)
        .resize(800, 1000)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(path.join(uploadDir, filename));

      images.push(filename);
    }

    req.body.images = images;

    next();
  } catch (error) {
    next(error);
  }
};