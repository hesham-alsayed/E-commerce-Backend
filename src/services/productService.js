const AppError = require("../../utils/AppError");
const { getCategory } = require("../repositories/categoryRepository");
const { findCollectionById } = require("../repositories/collectionRepository");
const productRepository = require("../repositories/productRepository");
const mongoose = require("mongoose");
const { getSubcategoryById } = require("../repositories/subcategoryRepository");
const reviewService = require("../services/reviewService");
const { getStockStatus } = require("../../utils/helper");
const productModel = require("../models/productModel");

exports.createProduct = async (data) => {
  let { collection, category, subcategory, variants } = data;
  console.log("variants", variants);
  console.log(data);

  // ================= VALIDATION =================
  if (!collection || !category) {
    throw new AppError("collection, category are required", 400);
  }

  if (
    !mongoose.Types.ObjectId.isValid(collection) ||
    !mongoose.Types.ObjectId.isValid(category)
  ) {
    throw new AppError("Invalid IDs provided", 400);
  }

  // ================= CHECK EXISTENCE =================
  const collectionDoc = await findCollectionById(collection);
  const categoryDoc = await getCategory(category);
  let subcategoryDoc;
  if (subcategory) {
    subcategoryDoc = await getSubcategoryById(subcategory);
    if (!subcategoryDoc) throw new AppError("subcategory not found", 404);
  }

  if (!collectionDoc || !categoryDoc) {
    throw new AppError("collection, category or subcategory not found", 404);
  }

  // ================= RELATION CHECK =================
  if (categoryDoc.collection.toString() !== collection) {
    throw new AppError("Category does not belong to collection", 400);
  }

  if (subcategory && subcategoryDoc.category.toString() !== category) {
    throw new AppError("subcategory does not belong to category", 400);
  }

  // ================= CREATE PRODUCT =================
  const product = await productRepository.createProduct(data);
  return product;
};

exports.getProducts = async () => {
  const products = await productRepository.getProducts();
  if (!products || products.length < 0) {
    throw new AppError("Products Data Not Found");
  }
  return products;
};

exports.getProduct = async (id) => {
  if (!id) {
    throw new AppError("product ID is Required", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid ID Product", 400);
  }
  const product = await productRepository.getProduct(id);
  if (!product) {
    throw new AppError("product not found", 400);
  }
  return product;
};

exports.updateProductFields = async (productId, updatedData) => {
  if (!productId) throw new AppError("product id is required", 400);
  const allowedFields = [
    "title",
    "description",
    "price",
    "oldPrice",
    "brand",
    "material",
  ];
  const productISExist = await productRepository.getProduct(productId);
  if (!productISExist) throw new AppError("Product not found", 400);

  let filteredData = {};
  allowedFields.forEach((field) => {
    if (updatedData[field] !== undefined) {
      filteredData[field] = updatedData[field];
    }
  });

  const product = await productRepository.updateProduct(
    productId,
    filteredData,
  );
  return product;
};

exports.updateVariant = async (
  productId,
  variantId,
  sizes,
  images,
  imagesStatus,
) => {
  if (!productId || !variantId) {
    throw new AppError("Product and variant IDs are required", 400);
  }
  if (
    !mongoose.Types.ObjectId.isValid(productId) ||
    !mongoose.Types.ObjectId.isValid(variantId)
  ) {
    throw new AppError("Invalid IDs for Product or Variant", 400);
  }

  // 1️⃣ get product
  const product = await productRepository.getProduct(productId);
  if (!product) throw new AppError("Product not found", 400);

  // 2️⃣ get variant
  const variant = product.variants.id(variantId);
  if (!variant) throw new AppError("Variant not found", 400);

  // =========================
  // 🟡 IMAGE HANDLING
  // =========================
  if (imagesStatus) {
    const status = imagesStatus.toString().trim().toLowerCase();
    switch (status) {
      case "replace":
        variant.images = images || [];
        break;

      case "merge":
        variant.images = [...variant.images, ...(images || [])];
        break;

      case "delete":
        variant.images.forEach((filename) => {
          const filePath = path.join(
            __dirname,
            "../uploads/products",
            filename,
          );
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

        variant.images = [];
        break;

      default:
        throw new AppError(`Invalid imagesStatus: ${imagesStatus}`, 400);
    }
  }

  // =========================
  // 🟢 SIZE HANDLING
  // =========================
  if (sizes) {
    if (!Array.isArray(sizes)) {
      throw new AppError("sizes must be an array", 400);
    }

    sizes.forEach((sizeUpdate) => {
      // delete size
      if (sizeUpdate._id && sizeUpdate.delete) {
        variant.sizes = variant.sizes.filter(
          (s) => s._id.toString() !== sizeUpdate._id,
        );
        return;
      }

      // update size
      if (sizeUpdate._id) {
        const existingSize = variant.sizes.id(sizeUpdate._id);
        if (existingSize) {
          if (sizeUpdate.size) existingSize.size = sizeUpdate.size;
          if (sizeUpdate.stock !== undefined)
            existingSize.stock = sizeUpdate.stock;
        }
      } else {
        // create new size
        if (!sizeUpdate.size) {
          throw new AppError("Size name is required", 400);
        }

        const duplicate = variant.sizes.find(
          (s) => s.size.toLowerCase() === sizeUpdate.size.toLowerCase(),
        );
        if (duplicate) {
          throw new AppError(`Size '${sizeUpdate.size}' already exists`, 400);
        }

        variant.sizes.push({
          size: sizeUpdate.size,
          stock: sizeUpdate.stock || 0,
        });
      }
    });
  }

  // 3️⃣ save
  await product.save();

  return variant;
};

exports.updateProduct = async (productId, updatedData) => {
  // const allowedFields = [
  //   "title",
  //   "description",
  //   "brand",
  //   "material",
  //   "price",
  //   "collection",
  //   "category",
  //   "subcategory",
  // ];

  if (!productId) throw new AppError("product id is required", 400);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product id", 400);
  }

  // let filteredData = {};

  // Object.keys(updatedData).forEach((key) => {
  //   if (allowedFields.includes(key)) {
  //     filteredData[key] = updatedData[key];
  //   }
  // });

  // // ❌ variants are handled separately (IMPORTANT)
  // let variants = null;
  // if (updatedData.variants) {
  //   try {
  //     variants =
  //       typeof updatedData.variants === "string"
  //         ? JSON.parse(updatedData.variants)
  //         : updatedData.variants;
  //   } catch (err) {
  //     throw new AppError("Invalid variants format", 400);
  //   }
  // }

  const product = await productRepository.getProduct(productId);

  if (!product) {
    throw new AppError("product not found", 404);
  }

  // 🔥 UPDATE SIMPLE FIELDS
  Object.assign(product, updatedData);

  // // 🔥 UPDATE VARIANTS (MERGE LOGIC)
  // if (variants) {
  //   product.variants = variants;
  // }

  const updatedProduct = await product.save();

  return updatedProduct;
};

exports.deleteProduct = async (id) => {
  if (!id) throw new AppError("product id is required", 400);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid product id", 400);
  }

  // we create pre middleware to delete reviews for this product
  const deletedProduct = await productRepository.deleteProduct(id);
  if (!deletedProduct) {
    throw new AppError("product not found", 404);
  }
  return deletedProduct;
};

exports.getStockAnalysis = async (query) => {
  // =========================
  // Pagination
  // =========================
  const page = Math.max(Number(query.page) || 1, 1);

  const limit = Math.max(Number(query.limit) || 10, 1);

  const skip = (page - 1) * limit;

  // =========================
  // Filters
  // =========================
  const { collection, category, subcategory, search } = query;

  const match = {};

  if (collection) {
    match.collection = new mongoose.Types.ObjectId(collection);
  }

  if (category) {
    match.category = new mongoose.Types.ObjectId(category);
  }

  if (subcategory) {
    match.subcategory = new mongoose.Types.ObjectId(subcategory);
  }

  // =========================
  // Search
  // =========================
  if (search) {
    match.title = {
      $regex: search,
      $options: "i",
    };
  }

  // =========================
  // Total Count
  // =========================
  const totalProducts = await productModel.countDocuments(match);

  // =========================
  // Products
  // =========================
  const products = await productModel
    .find(match)
    .select("title stock price")
    .populate("collection", "title")
    .populate("category", "title")
    .populate("subcategory", "title")
    .sort({ stock: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // =========================
  // Format Data
  // =========================
  const formattedProducts = products.map((product) => ({
    _id: product._id,

    title: product.title,

    stock: product.stock,
    price: product.price,
    collection: product.collection?.title || null,

    category: product.category?.title || null,

    subcategory: product.subcategory?.title || null,
  }));

  return {
    pagination: {
      currentPage: page,

      limit,

      totalProducts,

      totalPages: Math.ceil(totalProducts / limit),

      hasNextPage: page < Math.ceil(totalProducts / limit),

      hasPrevPage: page > 1,
    },

    results: formattedProducts.length,

    data: formattedProducts,
  };
};

exports.getProductAnalysisByCollection = async () => {
  const data = await productRepository.getProductAnalysisByCollection();

  // Group by collectionName
  const result = {};
  data.forEach((item) => {
    if (!result[item.collectionName]) result[item.collectionName] = [];
    result[item.collectionName].push({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      productsCount: item.productsCount,
      totalStock: item.totalStock,
    });
  });

  return result;
};

exports.getStockByCategory = async () => {
  const data = await productRepository.getStockByCategory();
  const result = data.map((c) => ({
    ...c,
    status:
      c.totalStock === 0
        ? "out-of-stock"
        : c.totalStock <= 5
          ? "low-stock"
          : "high-stock",
  }));

  return result;
};

exports.getTopRatedProducts = async (page, limit) => {
  const skip = (page - 1) * limit;

  const filter = {
    status: "active",
    numReviews: { $gt: 0 },
  };

  const total = await productModel.countDocuments(filter);

  const data = await productModel
    .find(filter)
    .sort({
      averageRating: -1,
      numReviews: -1,
    })
    .skip(skip)
    .limit(Number(limit))
    .select("title averageRating numReviews");

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

exports.getProductAnalytics = async (productId) => {
  // ================= PRODUCT =================
  const product = await productRepository.getProductById(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  // ================= ANALYTICS =================
  const analytics = await productRepository.getProductSalesAnalytics(productId);

  // ================= VARIANTS =================
  const variantAnalytics = await productRepository.getVariantAnalytics(productId);

  // ================= LATEST ORDERS =================
  const latestOrders = await productRepository.getLatestOrders(productId);

  return {
    product,

    analytics: analytics[0] || {
      totalSold: 0,
      totalRevenue: 0,
      totalOrders: 0,
      averageSellingPrice: 0,
      lastSoldAt: null,
    },

    variantAnalytics,

    // 🔥 NEW ADDITION
    latestOrders,
  };
};
