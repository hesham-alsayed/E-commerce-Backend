const AppError = require("../../utils/AppError");
const { getFinalPrice, isDiscountValid } = require("../../utils/helper");
const { sendNotification } = require("../core/notificationManager");
const ApiFeatures = require("../middlewares/apiFeature");
const ApiFeaturesUser = require("../middlewares/ApiFeaturesUser");
const productModel = require("../models/productModel");
const productService = require("../services/productService");
const reviewService = require("../services/reviewService");

exports.createProduct = async (req, res, next) => {
  try {
    const product = req.body;
    console.log(product);
    // ⚡ lean create (fast write)
    const newProduct = await productModel.create(product);

    res.status(201).json({
      success: true,
      product: newProduct,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await productModel.findByIdAndUpdate(
      id,
      req.body, // ✅
      { new: true },
    );

    res.status(200).json({
      success: true,
      product: updated,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getUserProducts = async (req, res, next) => {
  try {
    const searchFields = ["title", "description"];

    // ================= QUERY BUILDER =================
    let features = new ApiFeaturesUser(
      productModel
        .find()
        .populate("category", "name discount")
        .populate("subcategory", "name discount")
        .populate("collection", "name discount"),
      req.query,
    )
      .filter()
      .search(searchFields)
      .sort()
      .limitFields();

    let products = await features.query;

    // ================= RESOLVE DISCOUNT =================
    const resolveDiscount = (product) => {
      const sub = product?.subcategory?.discount;
      const cat = product?.category?.discount;
      const col = product?.collection?.discount;

      if (isDiscountValid(sub)) return sub;
      if (isDiscountValid(cat)) return cat;
      if (isDiscountValid(col)) return col;

      return null;
    };

    // ================= APPLY FINAL PRICE =================
    products = products.map((p) => {
      const obj = p.toObject();

      const discount = resolveDiscount(obj);

      const finalPrice = discount
        ? getFinalPrice(obj.price, discount)
        : obj.price;

      return {
        ...obj,
        finalPrice,
        hasDiscount: !!discount,
      };
    });

    // ================= PRICE FILTER (AFTER DISCOUNT) =================
    const priceMin = req.query.priceMin ? Number(req.query.priceMin) : null;
    const priceMax = req.query.priceMax ? Number(req.query.priceMax) : null;

    if (priceMin !== null || priceMax !== null) {
      products = products.filter((p) => {
        const price = p.finalPrice;

        if (priceMin !== null && price < priceMin) return false;
        if (priceMax !== null && price > priceMax) return false;

        return true;
      });
    }

    // ================= PAGINATION =================
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const total = products.length;
    const skip = (page - 1) * limit;

    const paginatedProducts = products.slice(skip, skip + limit);

    // ================= RESPONSE =================
    res.status(200).json({
      status: "success",
      result: paginatedProducts.length,
      pagination: {
        currentPage: page,
        limit,
        numberOfPages: Math.ceil(total / limit),
        total,
      },
      products: paginatedProducts,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    console.log(req.query);
    const searchFields = ["title", "description"];
    let features = new ApiFeatures(
      productModel
        .find()
        .populate("category", "name discount")
        .populate("subcategory", "name discount"),
      req.query,
      searchFields,
    )
      .filter()
      .sort()
      .limitFields()
      .search();

    // count documents after filter
    const count = await features.query.clone().countDocuments();

    // apply pagination
    features = features.paginate(count);
    const products = await features.query;
    console.log(products);

    res.status(200).json({
      status: "success",
      result: products?.length,
      pagination: features.paginationResult,
      products,
    });
  } catch (error) {
    next(error);
  }
};
exports.getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [product, reviewsStats, reviews] = await Promise.all([
      productService.getProduct(id),
      reviewService.getProductReviewsStats(id),
      reviewService.getReviewsByProduct(id),
    ]);

    res.status(200).json({
      status: "success",
      product: {
        ...product.toObject(),
        reviewsStats,
        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.updateVariantProduct = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    console.log(req.body);

    const sizes = req.body.sizes ? JSON.parse(req.body.sizes) : undefined;
    const images = req.body.images || [];
    const imagesStatus = req.body.imagesStatus.toLowerCase();

    const updatedVariant = await productService.updateVariant(
      productId,
      variantId,
      sizes,
      images,
      imagesStatus,
    );
    res.status(200).json({
      status: "success",
      data: {
        updatedVariant,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);
    res.status(204).json({
      status: "product deleted success",
    });
  } catch (error) {
    next(error);
  }
};

exports.getStockAnalysis = async (req, res, next) => {
  try {
    const data = await productService.getStockAnalysis(req.query);

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductAnalysisByCollection = async (req, res, next) => {
  try {
    const data = await productService.getProductAnalysisByCollection();

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getStockByCategory = async (req, res, next) => {
  try {
    const data = await productService.getStockByCategory();

    res.status(200).json({
      status: "success",
      results: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTopRatedProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // limit من query params
    const page = parseInt(req.query.page) || 1;
    const result = await productService.getTopRatedProducts(page, limit);

    res.status(200).json({
      status: "success",
      count: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

exports.checkStockAndNotify = async () => {
  try {
    const products = await productService.getStockAnalysis(100);
    const baseUrl = process.env.BASE_URL || "http://localhost:8000";
    for (const product of products) {
      if (product.stock > 0 && product.stock <= 5) {
        // low stock send notification fo admin
        await sendNotification("low_stock", {
          title: "Low Stock Alert ",
          message: `Product ${product.id} "${product.title}" is running low (${product.stock} left)`,
          target: "admin",
          link: `${baseUrl}/products/${product.id}`,
        });
      } else if (product.stock === 0) {
        await sendNotification("out_of_stock", {
          title: "Product Out of Stock ",
          message: `Product For this ID ${product.id}  "${product.title}" is now out of stock`,
          target: "admin",
          link: `${baseUrl}/products/${product.id}`,
        });
      }
    }
  } catch (error) {
    throw new AppError(error);
  }
};

exports.getProductAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await productService.getProductAnalytics(id);

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};
