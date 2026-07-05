const { default: mongoose } = require("mongoose");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const {
  fillMissingMonths,
  formateAnalyticsOrders,
} = require("../../utils/helper");

exports.createOrder = async (orderData) => {
  const order = await orderModel.create(orderData);
  return order;
};

exports.getAllOrders = async () => {
  const orders = await orderModel
    .find()
    .populate(
      "user",
      "firstName lastName email role avatar isVerified lastLogin _id",
    );
  return orders;
};

exports.getOrderById = async (id) => {
  const order = await orderModel
    .findById(id)
    .populate(
      "user",
      "firstName lastName email role avatar isVerified lastLogin _id",
    )
    .populate({
      path: "coupon",
      select:
        "code discountType partner type discountValue minPurchase expiresAt isActive",
      populate: {
        path: "partner",
        select: "name email active",
      },
    });

  return order;
};

exports.getOrderByNumber = async (number, email) => {
  const order = await orderModel
    .findOne({
      orderNumber: number,
      contactEmail: email,
    })
    .populate(
      "user",
      "firstName lastName email role avatar isVerified lastLogin _id",
    )
    .populate("coupon", "code discountType discountValue expiresAt isActive");

  return order;
};

exports.getOrdersByUser = async (userId) => {
  const orders = await orderModel
    .find({ user: userId })
    .select(
      "createdAt discountAmount invoiceNumber itemsPrice orderNumber orderStatus paymentMethod paymentStatus totalPrice  totalPriceAfterDiscount",
    )
    .populate(
      "user",
      "firstName lastName email phone isActive isVerified createdAt updatedAt",
    );

  return orders;
};

exports.updateOrder = async (orderId, data) => {
  const order = await orderModel.findByIdAndUpdate(orderId, updates, {
    new: true,
    runValidators: true,
  });
  return order;
};

exports.deleteOrder = async (orderId) => {
  const order = await orderModel.findByIdAndDelete(orderId);
  return order;
};

exports.getAdvancedStats = async (matchStage = {}) => {
  const result = await orderModel.aggregate([
    { $match: matchStage },

    {
      $group: {
        _id: null,

        totalOrders: { $sum: 1 },

        paidOrders: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0],
          },
        },

        paidRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$paymentStatus", "paid"] },
                  { $eq: ["$orderStatus", "delivered"] },
                ],
              },
              "$totalPriceAfterDiscount",
              0,
            ],
          },
        },

        cancelledOrders: {
          $sum: {
            $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0],
          },
        },

        cancelledRevenueLoss: {
          $sum: {
            $cond: [
              { $eq: ["$orderStatus", "cancelled"] },
              "$totalPriceAfterDiscount",
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    result[0] || {
      totalOrders: 0,
      paidOrders: 0,
      paidRevenue: 0,
      cancelledOrders: 0,
      cancelledRevenueLoss: 0,
    }
  );
};
exports.getDailySales = async (matchStage) => {
  const result = await orderModel.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        totalRevenue: { $sum: "$totalPriceAfterDiscount" },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);
  return result;
};

exports.getMonthlySales = async (matchStage) => {
  const result = await orderModel.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalRevenue: { $sum: "$totalPriceAfterDiscount" },
        totalOrders: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  return result;
};
exports.getYearlySales = async (matchStage) => {
  return await orderModel.aggregate([
    {
      $match: matchStage,
    },

    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
        },
        totalRevenue: { $sum: "$totalPriceAfterDiscount" },
        totalOrders: { $sum: 1 },
      },
    },

    {
      $project: {
        _id: 0,
        year: "$_id.year",
        totalRevenue: 1,
        totalOrders: 1,
      },
    },

    {
      $sort: { year: 1 },
    },
  ]);
};

exports.getBestSellingProducts = async (matchStage, limit) => {
  const result = await orderModel.aggregate([
    {
      $match: matchStage,
    },
    {
      $unwind: "$items",
    },
    {
      $group: {
        _id: "$items.product",
        productTitle: { $first: "$items.title" },
        totalSold: { $sum: "$items.quantity" },
        totalRevenue: {
          $sum: {
            $multiply: ["$items.price", "$items.quantity"],
          },
        },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        productTitle: 1,
        totalSold: 1,
        totalRevenue: 1,
      },
    },
  ]);
  return result;
};

exports.getOrdersStatusSummary = async (matchStage) => {
  const data = await orderModel.aggregate([
    { $match: matchStage },

    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 },
      },
    },

    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },

    { $sort: { status: 1 } },
  ]);
  const statuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const result = statuses.map((s) => {
    const found = data.find((d) => d.status === s);
    return found || { status: s, count: 0 };
  });
  return result;
};

exports.getPaymentMethodsSummaryByMonth = async (matchStage) => {
  return orderModel.aggregate([
    {
      $match: matchStage,
    },

    {
      $addFields: {
        year: {
          $year: "$createdAt",
        },

        month: {
          $month: "$createdAt",
        },
      },
    },

    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },

        // ================= CASH =================
        cashUsers: {
          $addToSet: {
            $cond: [
              {
                $eq: ["$paymentMethod", "cash"],
              },
              "$user",
              "$$REMOVE",
            ],
          },
        },

        cashOrdersCount: {
          $sum: {
            $cond: [
              {
                $eq: ["$paymentMethod", "cash"],
              },
              1,
              0,
            ],
          },
        },

        cashRevenue: {
          $sum: {
            $cond: [
              {
                $eq: ["$paymentMethod", "cash"],
              },
              "$totalPriceAfterDiscount",
              0,
            ],
          },
        },

        // ================= PAYPAL =================
        paypalUsers: {
          $addToSet: {
            $cond: [
              {
                $eq: ["$paymentMethod", "paypal"],
              },
              "$user",
              "$$REMOVE",
            ],
          },
        },

        paypalOrdersCount: {
          $sum: {
            $cond: [
              {
                $eq: ["$paymentMethod", "paypal"],
              },
              1,
              0,
            ],
          },
        },

        paypalRevenue: {
          $sum: {
            $cond: [
              {
                $eq: ["$paymentMethod", "paypal"],
              },
              "$totalPriceAfterDiscount",
              0,
            ],
          },
        },
      },
    },

    {
      $project: {
        _id: 0,

        year: "$_id.year",
        month: "$_id.month",

        cash: {
          ordersCount: "$cashOrdersCount",

          uniqueUsers: {
            $size: "$cashUsers",
          },

          totalRevenue: {
            $round: ["$cashRevenue", 2],
          },
        },

        paypal: {
          ordersCount: "$paypalOrdersCount",

          uniqueUsers: {
            $size: "$paypalUsers",
          },

          totalRevenue: {
            $round: ["$paypalRevenue", 2],
          },
        },
      },
    },

    {
      $sort: {
        year: 1,
        month: 1,
      },
    },
  ]);
};

exports.getCitySummary = async (matchStage) => {
  const data = await orderModel.aggregate([
    {
      $match: {
        ...matchStage,
        paymentStatus: "paid",
        orderStatus: { $ne: "cancelled" },
      },
    },

    {
      $group: {
        _id: {
          $ifNull: ["$shipping.zoneName", "Unknown"],
        },

        ordersCount: { $sum: 1 },

        uniqueUsers: { $addToSet: "$user" },

        totalRevenue: {
          $sum: "$totalPriceAfterDiscount",
        },
      },
    },

    {
      $project: {
        _id: 0,
        zone: "$_id", // 🔥 مهم عشان الفرونت
        ordersCount: 1,
        uniqueUsers: { $size: "$uniqueUsers" },
        totalRevenue: 1,
      },
    },

    {
      $sort: { totalRevenue: -1 },
    },
  ]);

  return data;
};

exports.getToadySales = async (startDate, endDate) => {
  const data = await orderModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        ordersToday: { $sum: 1 },
        revenueToday: { $sum: "$totalPriceAfterDiscount" },
      },
    },
    {
      $project: {
        _id: 0,
        ordersToday: 1,
        revenueToday: 1,
      },
    },
  ]);
  return data;
};

exports.getUserStats = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // ✅ 1. STATS (aggregation)
  const [stats] = await orderModel.aggregate([
    {
      $match: {
        user: userObjectId,
      },
    },
    {
      $group: {
        _id: "$user",

        totalOrders: { $sum: 1 },

        completedOrders: {
          $sum: {
            $cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0],
          },
        },

        currentOrders: {
          $sum: {
            $cond: [
              {
                $in: ["$orderStatus", ["pending", "processing", "shipped"]],
              },
              1,
              0,
            ],
          },
        },

        totalSpent: {
          $sum: {
            $cond: [
              { $eq: ["$orderStatus", "delivered"] },
              "$totalPriceAfterDiscount",
              0,
            ],
          },
        },
      },
    },
  ]);

  // ✅ 2. GET ORDERS (latest first)
  const orders = await orderModel
    .find({ user: userId })
    .sort({ createdAt: -1 })
    .select(
      "orderNumber orderStatus totalPriceAfterDiscount paymentStatus createdAt",
    );

  // ✅ 3. USER
  const user = await userModel
    .findById(userId)
    .select("firstName lastName email avatar");

  return {
    user,
    stats: {
      totalOrders: stats?.totalOrders || 0,
      completedOrders: stats?.completedOrders || 0,
      currentOrders: stats?.currentOrders || 0,
      totalSpent: stats?.totalSpent || 0,
    },
    orders,
  };
};

exports.getOrdersStats = async () => {
  const stats = await orderModel.aggregate([
    {
      $group: {
        _id: null,

        totalOrders: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [{ $eq: ["$orderStatus", "pending"] }, 1, 0],
          },
        },
        processing: {
          $sum: {
            $cond: [{ $eq: ["$orderStatus", "processing"] }, 1, 0],
          },
        },

        shipped: {
          $sum: {
            $cond: [{ $eq: ["$orderStatus", "shipped"] }, 1, 0],
          },
        },

        delivered: {
          $sum: {
            $cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0],
          },
        },

        cancelled: {
          $sum: {
            $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);
  return (
    stats[0] || {
      totalOrders: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
  );
};

const generateMonths = (startDate, endDate) => {
  const months = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

exports.getMonthlyAnalytics = async (matchStage) => {
  return await orderModel.aggregate([
    { $match: matchStage },

    // 🧩 المرحلة 1: group بالشهر + status
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          status: "$orderStatus",
        },

        count: { $sum: 1 },

        revenue: {
          $sum: {
            $cond: [
              { $eq: ["$paymentStatus", "paid"] },
              "$totalPriceAfterDiscount",
              0,
            ],
          },
        },
      },
    },

    {
      $group: {
        _id: {
          year: "$_id.year",
          month: "$_id.month",
        },

        totalOrders: { $sum: "$count" },
        totalRevenue: { $sum: "$revenue" },

        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
            revenue: "$revenue",
          },
        },
      },
    },

    // 🧩 ترتيب
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);
};

exports.getInvoiceStats = async () => {
  return orderModel.aggregate([
    {
      $facet: {
        /* ================= 💰 TOTAL REVENUE (PAID ONLY) ================= */
        totalRevenue: [
          { $match: { paymentStatus: "paid" } },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPriceAfterDiscount" },
            },
          },
        ],

        /* ================= 📦 REVENUE BY ORDER STATUS ================= */

        pendingRevenue: [
          { $match: { orderStatus: "pending" } },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPriceAfterDiscount" },
            },
          },
        ],

        processingRevenue: [
          { $match: { orderStatus: "processing" } },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPriceAfterDiscount" },
            },
          },
        ],

        shippedRevenue: [
          { $match: { orderStatus: "shipped" } },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPriceAfterDiscount" },
            },
          },
        ],

        deliveredRevenue: [
          { $match: { orderStatus: "delivered" } },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPriceAfterDiscount" },
            },
          },
        ],

        cancelledRevenue: [
          { $match: { orderStatus: "cancelled" } },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPriceAfterDiscount" },
            },
          },
        ],

        /* ================= 📄 TOTAL INVOICES ================= */
        totalInvoices: [{ $count: "count" }],
      },
    },
  ]);
};
