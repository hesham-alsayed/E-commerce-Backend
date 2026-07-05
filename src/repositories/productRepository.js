const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const mongoose = require("mongoose");
exports.getProductWithRelations = async (productId) => {
  return await productModel
    .findById(productId)
    .populate({
      path: "category",
      select: "name discount",
    })
    .populate({
      path: "subcategory",
      select: "name discount",
    })
    .populate({
      path: "collection",
      select: "name discount",
    });
};

exports.createProduct = async (data) => {
  const product = await productModel.create(data);
  return product;
};

exports.getProducts = async () => {
  const products = await productModel.find();
  return products;
};

exports.getProduct = async (id) => {
  const product = await productModel
    .findById(id)
    .populate("collection", "name discount")
    .populate("category", "name discount")
    .populate("subcategory", "name discount");
  return product;
};

exports.updateProduct = async (id, updatedData) => {
  const updatedProduct = await productModel.findByIdAndUpdate(id, updatedData, {
    runValidators: true,
    new: true,
  });
  return updatedProduct;
};

exports.deleteProduct = async (id) => {
  const deletedProduct = await productModel.findByIdAndDelete(id);
  return deletedProduct;
};

exports.getStockAnalysis = async (limit = 10) => {
  const products = await productModel
    .find()
    .select("title stock")
    .populate("collection", "name")
    .populate("category", "name")
    .populate("subcategory", "name")
    .sort({ stock: 1 })
    .limit(limit)
    .lean();

  return products;
};

exports.getProductAnalysisByCollection = async () => {
  const products = await productModel.aggregate([
    // تأكد إن عندنا collection و category
    {
      $match: {
        collection: { $exists: true, $ne: null },
        category: { $exists: true, $ne: null },
      },
    },

    // Group حسب collection + category
    {
      $group: {
        _id: {
          collection: "$collection",
          category: "$category",
        },
        productsCount: { $sum: 1 },
        totalStock: { $sum: "$stock" },
      },
    },

    // Lookup لجلب بيانات collection
    {
      $lookup: {
        from: "collections",
        localField: "_id.collection",
        foreignField: "_id",
        as: "collection",
      },
    },
    { $unwind: "$collection" },

    // Lookup لجلب بيانات category
    {
      $lookup: {
        from: "categories",
        localField: "_id.category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },

    // Project الشكل النهائي
    {
      $project: {
        _id: 0,
        collectionId: "$collection._id",
        collectionName: "$collection.name",
        categoryId: "$category._id",
        categoryName: "$category.name",
        productsCount: 1,
        totalStock: 1,
      },
    },

    // ترتيب حسب collectionName
    { $sort: { collectionName: 1, categoryName: 1 } },
  ]);
  return products;
};

exports.getStockByCategory = async () => {
  const result = await productModel.aggregate([
    // 1) match products
    {
      $match: {
        category: { $exists: true, $ne: null },
      },
    },

    // 2) group by category + collection + subcategory (لو عايز تفصيل أعلى)
    {
      $group: {
        _id: {
          category: "$category",
          collection: "$collection",
        },
        productsCount: { $sum: 1 },
        totalStock: { $sum: "$stock" },
      },
    },

    // 3) lookup category
    {
      $lookup: {
        from: "categories",
        localField: "_id.category",
        foreignField: "_id",
        as: "category",
      },
    },

    // 4) lookup collection
    {
      $lookup: {
        from: "collections",
        localField: "_id.collection",
        foreignField: "_id",
        as: "collection",
      },
    },

    // 6) unwind
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$collection", preserveNullAndEmptyArrays: true } },

    // 7) final projection
    {
      $project: {
        _id: 0,

        categoryId: "$category._id",
        categoryName: "$category.name",
        collectionId: "$collection._id",
        collectionName: "$collection.name",
        productsCount: 1,
        totalStock: 1,
      },
    },

    // 8) sort
    { $sort: { totalStock: -1 } },
  ]);

  return result;
};

exports.getTopRatedProducts = async (limit = 10) => {
  const products = await productModel
    .find()
    .select("title averageRating numReviews price") // نجيب اللي محتاجينه بس
    .sort({ averageRating: -1, numReviews: -1 }) // الأعلى تقييم + الأكثر مراجعات
    .limit(limit)
    .lean();
  return products;
};



// ================= GET PRODUCT =================
exports.getProductById = async (productId) => {
  return productModel
    .findById(productId)
    .populate("collection")
    .populate("category")
    .populate("subcategory");
};

// ================= PRODUCT ANALYTICS =================
exports.getProductSalesAnalytics = async (productId) => {
  return orderModel.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        orderStatus: { $ne: "cancelled" },
      },
    },

    {
      $unwind: "$items",
    },

    // ✅ FIX OBJECT ID
    {
      $match: {
        "items.product": new mongoose.Types.ObjectId(productId),
      },
    },

    {
      $group: {
        _id: "$items.product",

        totalSold: {
          $sum: {
            $toInt: "$items.quantity",
          },
        },

        totalRevenue: {
          $sum: {
            $multiply: [
              { $toDouble: "$items.price" },
              { $toInt: "$items.quantity" },
            ],
          },
        },

        ordersSet: {
          $addToSet: "$_id",
        },

        avgPrice: {
          $avg: {
            $toDouble: "$items.price",
          },
        },

        lastSoldAt: {
          $max: "$createdAt",
        },
      },
    },

    {
      $project: {
        _id: 0,

        totalSold: 1,

        totalRevenue: {
          $round: ["$totalRevenue", 2],
        },

        totalOrders: {
          $size: "$ordersSet",
        },

        averageSellingPrice: {
          $round: ["$avgPrice", 2],
        },

        lastSoldAt: 1,
      },
    },
  ]);
};

// ================= VARIANT ANALYTICS =================
exports.getVariantAnalytics = async (productId) => {
  const product = await productModel.findById(productId);

  if (!product) return [];

  const normalize = (value = "") =>
    value.toString().trim().toLowerCase();

  // ================= SALES =================
  const sales = await orderModel.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        orderStatus: { $ne: "cancelled" },
      },
    },

    {
      $unwind: "$items",
    },

    {
      $match: {
        "items.product": new mongoose.Types.ObjectId(productId),
      },
    },

    // ✅ SUPPORT OLD + NEW STRUCTURE
    {
      $project: {
        quantity: "$items.quantity",
        price: "$items.price",

        color: {
          $ifNull: ["$items.variant.color", "$items.color"],
        },

        size: {
          $ifNull: ["$items.variant.size", "$items.size"],
        },
      },
    },

    {
      $group: {
        _id: {
          color: "$color",
          size: "$size",
        },

        totalSold: {
          $sum: {
            $toInt: "$quantity",
          },
        },

        totalRevenue: {
          $sum: {
            $multiply: [
              { $toDouble: "$price" },
              { $toInt: "$quantity" },
            ],
          },
        },
      },
    },
  ]);

  // ================= MAP =================
  const salesMap = new Map();

  sales.forEach((s) => {
    const key = `${normalize(s._id.color)}-${normalize(s._id.size)}`;

    salesMap.set(key, {
      totalSold: s.totalSold || 0,
      totalRevenue: s.totalRevenue || 0,
    });
  });

  // ================= BUILD RESPONSE =================
  const result = product.variants.map((v) => {
    const sizes = v.sizes.map((s) => {
      const key = `${normalize(v.color)}-${normalize(s.size)}`;

      const sale = salesMap.get(key);

      return {
        size: s.size,
        stock: s.stock || 0,

        totalSold: sale?.totalSold || 0,

        totalRevenue: Number(
          (sale?.totalRevenue || 0).toFixed(2),
        ),
      };
    });

    const totalSold = sizes.reduce(
      (acc, item) => acc + item.totalSold,
      0,
    );

    const totalRevenue = sizes.reduce(
      (acc, item) => acc + item.totalRevenue,
      0,
    );

    return {
      color: v.color,
      colorCode: v.colorCode,
      images: v.images || [],

      totalSold,

      totalRevenue: Number(totalRevenue.toFixed(2)),

      sizes,
    };
  });

  return result;
};

// ================= LATEST ORDERS =================
exports.getLatestOrders = async (productId) => {
  return orderModel
    .find({
      paymentStatus: "paid",
      orderStatus: { $ne: "cancelled" },

      // ✅ FIX OBJECT ID
      "items.product": new mongoose.Types.ObjectId(productId),
    })
    .sort("-createdAt")
    .limit(10)
    .select(
      "orderNumber totalPrice totalPriceAfterDiscount orderStatus paymentStatus createdAt",
    );
};