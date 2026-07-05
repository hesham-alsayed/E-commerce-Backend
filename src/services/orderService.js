const AppError = require("../../utils/AppError");
const orderRepository = require("../repositories/orderRepository");
const productRepository = require("../repositories/productRepository");
const couponRepository = require("../repositories/couponRepository");
const couponModel = require("../models/couponModel");
const orderModel = require("../models/orderModel");
const cartRepository = require("../repositories/cartRepository");
const cartService = require("../services/cartService");
const userRepository = require("../repositories/userRepository");
const shippingZoneModel = require("../models/shippingZoneModel");
const settingsService = require("../services/settingsService");

const {
  isValidId,
  ORDER_STATUS,
  PAYMENT_STATUS,
  getMonthsRange,
} = require("../../utils/helper");
const Email = require("../../utils/Email");
const { createPaypalOrder } = require("../../utils/paypal");
const counterModel = require("../models/counterModel");
const {
  decreaseProductStock,
  restoreProductStock,
  validateOrderStock,
  decreaseStock,
  restoreStock,
} = require("../../utils/controlStock");
const {
  isValidNextStep,
  canDecreaseStock,
  canRestoreStock,
} = require("../../utils/controlOrder");
const { addPartnerCommission } = require("./partnerService");

async function checkProductStock(productId, color, size, quantity) {
  if (!productId) {
    throw new AppError("productId is required", 400);
  }

  const product = await productRepository.getProduct(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  // -----------------------------------
  // Case 1: Product has variants
  // -----------------------------------
  if (product.variants && product.variants.length > 0) {
    if (!color || !size) {
      throw new AppError("Color and size are required", 400);
    }

    const variant = product.variants.find(
      (v) => v.color.toLowerCase() === color.toLowerCase(),
    );
    if (!variant) {
      throw new AppError(`Color ${color} not found`, 400);
    }

    const sizeObj = variant.sizes.find(
      (s) => s.size.toLowerCase() === size.toLowerCase(),
    );
    if (!sizeObj) {
      throw new AppError(`Size ${size} not found`, 400);
    }

    if (sizeObj.stock < quantity) {
      throw new AppError(
        `Not enough stock for ${product.title} - ${color} - ${size}`,
        400,
      );
    }

    return true;
  }

  // -----------------------------------
  //  Case 2: Product without variants
  // -----------------------------------

  // validate color
  if (product.colors && product.colors.length > 0) {
    if (!color || !product.colors.includes(color)) {
      throw new AppError(`Color ${color} not found`, 400);
    }
  }

  // validate size
  if (product.size && product.size.length > 0) {
    if (!size || !product.size.includes(size)) {
      throw new AppError(`Size ${size} not found`, 400);
    }
  }

  // check general stock
  if (product.stock < quantity) {
    throw new AppError(`Not enough stock for ${product.title}`, 400);
  }

  return true;
}

function generateOrderNumber() {
  const timestamp = Date.now(); // الوقت بالميلي ثانية
  const random = Math.floor(Math.random() * 1000); // رقم عشوائي 0-999
  return `ORD-${timestamp}-${random}`; // مثال: ORD-1679654321234-527
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();

  const counter = await counterModel.findOneAndUpdate(
    { name: `invoice-${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );

  const sequence = counter.value.toString().padStart(6, "0");

  return `INV-${year}-${sequence}`;
}
const filterAllowedFields = (data, allowedFields) => {
  const filtered = {};

  Object.keys(data).forEach((key) => {
    if (allowedFields.includes(key)) {
      filtered[key] = data[key];
    }
  });

  return filtered;
};

exports.createOrder = async (userId, orderData) => {
  const {
    shippingAddress,
    billingAddress,
    billingSameAsShipping,
    paymentMethod,
    shipping,
    couponCode,
    contactEmail,
  } = orderData;

  if (!contactEmail) throw new Error("Contact email is required");

  // ================= CART =================
  const cart = await cartRepository.getCartByUser(userId, { lean: false });

  if (!cart?.items?.length) throw new Error("Cart is empty");

  // ================= CALCULATE ITEMS PRICE =================
  let itemsPrice = 0;

  for (const item of cart.items) {
    await checkProductStock(item.product, item.color, item.size, item.quantity);

    itemsPrice += item.price * item.quantity;
  }

  // ================= COUPON =================
  let discountAmount = 0;
  let couponId = null;

  if (couponCode || cart.coupon) {
    const coupon = couponCode
      ? await couponRepository.getCouponByCode(couponCode.toUpperCase())
      : await couponRepository.getCouponById(cart.coupon);

    if (coupon && couponModel.isValidCoupon(coupon)) {
      couponId = coupon._id;

      discountAmount =
        coupon.discountType === "percentage"
          ? (itemsPrice * coupon.discountValue) / 100
          : coupon.discountValue;

      discountAmount = Math.min(discountAmount, itemsPrice);
    }
  }

  // ================= SHIPPING =================
  const zone = await shippingZoneModel.findOne({
    name: shipping.zoneName,
    isActive: true,
  });

  if (!zone) throw new Error("Invalid shipping zone");

  const city = zone.cities.find((c) => c.city === shipping.city && c.isActive);

  if (!city) throw new Error("Invalid city");

  let shippingPrice = city.price;

  const freeShipping = await settingsService.checkFreeShipping();

  const subtotalAfterDiscount = itemsPrice - discountAmount;

  if (freeShipping?.enabled && subtotalAfterDiscount >= freeShipping.value) {
    shippingPrice = 0;
  }

  const totalPrice = itemsPrice + shippingPrice;
  const totalAfterDiscount = subtotalAfterDiscount + shippingPrice;

  const billing = billingSameAsShipping ? shippingAddress : billingAddress;

  const isCash = paymentMethod === "cash";

  // ================= CREATE ORDER =================
  const createdOrder = await orderModel.create({
    user: userId,
    items: cart.items,
    contactEmail,

    shippingAddress,
    billingAddress: billing,
    billingSameAsShipping,

    shipping: {
      zoneName: zone.name,
      city: city.city,
      price: shippingPrice,
      estimatedDays: city.estimatedDays,
    },

    paymentMethod,

    paymentStatus: isCash ? "pending" : "pending",
    orderStatus: "pending",

    paymentInfo: {
      provider: paymentMethod,
      transactionId: null,
      paypalOrderId: null,
    },

    itemsPrice,
    shippingPrice,
    discountAmount,
    totalPrice,
    totalPriceAfterDiscount: totalAfterDiscount,

    coupon: couponId,

    orderNumber: generateOrderNumber(),
    invoiceNumber: await generateInvoiceNumber(),

    tracking: [
      {
        status: "pending",
        note: "Order created",
      },
    ],

    stockAdjusted: false,
  });

  // ================= POPULATE ORDER (🔥 IMPORTANT FIX) =================
  const order = await orderModel
    .findById(createdOrder._id)
    .populate("user", "firstName email phone")
    .populate("items.product", "title price variants");

  // ================= PAYPAL =================
  if (paymentMethod === "paypal") {
    console.log({
      totalAfterDiscount,
      paymentMethod,
    });
    const paypal = await createPaypalOrder(totalAfterDiscount, order);

    order.paymentInfo.paypalOrderId = paypal.paypalOrderId;
    await order.save();

    return {
      order,
      approvalUrl: paypal.approvalUrl,
    };
  }

  // ================= CLEAR CART =================
  await cartService.clearCart(userId);

  return {
    order,
  };
};

exports.updateOrder = async (orderId, data) => {
  if (!orderId) throw new AppError("Order ID is required", 400);
  if (!isValidId(orderId)) throw new AppError("Invalid Order ID", 400);

  // ================= GET ORDER =================
  const order = await orderRepository.getOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  // ================= ALLOWED FIELDS =================
  const allowedFields = ["paymentStatus", "orderStatus", "tracking"];

  const updates = {};

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  // ================= CURRENT STATE =================
  const oldStatus = order.orderStatus;
  const oldPayment = order.paymentStatus;

  const newOrderStatus = updates.orderStatus || oldStatus;
  let newPaymentStatus = updates.paymentStatus || oldPayment;

  const paymentMethod = order.paymentMethod;

  // ================= FINAL STATES BLOCK =================
  if (oldStatus === "delivered") {
    throw new AppError("Delivered orders cannot be modified", 400);
  }

  if (oldStatus === "cancelled") {
    throw new AppError("Cancelled orders cannot be modified", 400);
  }

  // ================= VALID STATUS FLOW =================
  if (updates.orderStatus) {
    const isValid = isValidNextStep(oldStatus, newOrderStatus);

    if (!isValid) {
      throw new AppError(
        `Invalid status transition from ${oldStatus} to ${newOrderStatus}`,
        400,
      );
    }
  }

  // =====================================================
  // 🔥 STOCK LOGIC (USING YOUR HELPERS)
  // =====================================================

  const isPaypal = paymentMethod === "paypal";

  const shouldDecreaseStock = canDecreaseStock(oldStatus, newOrderStatus);

  const shouldRestoreStock = canRestoreStock(oldStatus, newOrderStatus);

  // ================= BEFORE ANY STOCK CHANGE =================
  // 🔥 IMPORTANT: validate ONLY when going to processing
  if (shouldDecreaseStock && !order.stockAdjusted && !isPaypal) {
    await validateOrderStock(order.items);
  }

  // ================= APPLY STOCK CHANGES =================
  if (!isPaypal) {
    if (shouldDecreaseStock && !order.stockAdjusted) {
      await decreaseStock(order.items);
      order.stockAdjusted = true;
    }

    if (shouldRestoreStock && order.stockAdjusted) {
      await restoreStock(order.items);
      order.stockAdjusted = false;
    }
  }

  // =====================================================
  // 💳 PAYMENT RULES
  // =====================================================

  const isCash = paymentMethod === "cash";

  if (isCash) {
    if (newOrderStatus === "delivered") {
      newPaymentStatus = "paid";
      updates.paymentStatus = "paid";
    }
  }

  if (isPaypal) {
    if (
      ["processing", "shipped", "delivered"].includes(newOrderStatus) &&
      newPaymentStatus !== "paid"
    ) {
      throw new AppError(
        "Paypal orders must be paid before processing or delivery",
        400,
      );
    }

    if (
      oldPayment === "failed" &&
      ["processing", "shipped", "delivered"].includes(newOrderStatus)
    ) {
      throw new AppError("Failed payment cannot continue order", 400);
    }
  }

  if (newOrderStatus === "shipped" && newPaymentStatus === "failed") {
    throw new AppError("Cannot ship failed payment order", 400);
  }

  if (newOrderStatus === "cancelled" && newPaymentStatus === "paid") {
    throw new AppError("Cannot cancel paid order", 400);
  }

  // =====================================================
  // 🕒 TIMESTAMPS
  // =====================================================

  if (newPaymentStatus === "paid" && !order.paidAt) {
    order.paidAt = new Date();
  }

  if (newOrderStatus === "delivered" && !order.deliveredAt) {
    order.deliveredAt = new Date();
  }

  if (newOrderStatus === "cancelled" && !order.cancelledAt) {
    order.cancelledAt = new Date();
  }

  // =====================================================
  // 🧾 APPLY CHANGES
  // =====================================================

  if (updates.orderStatus) {
    order.orderStatus = newOrderStatus;
  }

  if (updates.paymentStatus !== undefined) {
    order.paymentStatus = newPaymentStatus;
    order.isPaid = newPaymentStatus === "paid";
  }

  // ================= TRACKING =================
  if (updates.tracking) {
    order.tracking.push({
      status: newOrderStatus,
      note: updates.tracking.note || "",
      createdAt: new Date(),
    });
  }

  // =====================================================
  // 💾 SAVE
  // =====================================================

  const updatedOrder = await order.save();

  await addPartnerCommission(updatedOrder, oldPayment);

  return {
    updatedOrder,
    oldStatus,
    oldPayment,
  };
};

exports.getOrderById = async (orderId) => {
  if (!orderId) throw new AppError("Order ID is required", 400);
  if (!isValidId(orderId)) throw new AppError("Invalid Order ID", 400);
  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new AppError("order not found", 400);
  return order;
};

exports.getOrderByNumber = async (number, email) => {
  if (!number) throw new AppError("Order Number is required", 404);
  if (!email) throw new AppError("Order Email is required", 404);

  console.log(number, email, "service");

  const order = await orderRepository.getOrderByNumber(number, email);
  console.log(order);

  if (!order) throw new AppError("order not found", 404);
  return order;
};

exports.getAllOrders = async () => {
  const orders = await orderRepository.getAllOrders();
  return orders;
};

exports.getOrdersByUser = async (userId) => {
  if (!userId) throw new AppError("User ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid User ID", 400);
  const orders = await orderRepository.getOrdersByUser(userId);
  return orders;
};

exports.cancelOrder = async (orderId) => {
  if (!orderId) throw new AppError("Order Id is required", 400);
  if (!isValidId(orderId)) throw new AppError("Invalid Order ID", 400);

  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  const oldStatus = order.orderStatus;
  const oldPayment = order.paymentStatus;
  const paymentMethod = order.paymentMethod;

  // =========================
  // BASIC BLOCKS
  // =========================
  if (oldStatus === "cancelled") {
    throw new AppError("Order has already been cancelled", 400);
  }

  if (oldStatus === "delivered") {
    throw new AppError("Delivered orders cannot be cancelled", 400);
  }

  // =========================
  // 🔥 PAYMENT SAFETY RULES (IMPORTANT)
  // =========================

  const isPaid = oldPayment === "paid";
  const isPaypal = paymentMethod === "paypal";
  const isCash = paymentMethod === "cash";

  // ❌ BLOCK ALL PAID ORDERS (STRICT RULE - your requirement)
  if (isPaid && oldStatus !== "pending") {
    throw new AppError("Paid orders cannot be cancelled", 400);
  }

  // ❌ SHIPPED RULES
  if (oldStatus === "shipped") {
    if (isPaypal && isPaid) {
      throw new AppError("Cannot cancel shipped paid PayPal order", 400);
    }

    if (isCash) {
      throw new AppError("Cannot cancel shipped cash order", 400);
    }
  }

  // =========================
  // STOCK RESTORE (SAFE)
  // =========================
  if (order.stockAdjusted) {
    await restoreStock(order.items);
  }

  // =========================
  // UPDATE ORDER
  // =========================
  order.orderStatus = "cancelled";
  order.cancelledAt = new Date();
  order.stockAdjusted = false;
  order.paymentStatus = isPaid ? "paid" : oldPayment;

  // =========================
  // TRACKING
  // =========================
  order.tracking.push({
    status: "cancelled",
    date: new Date(),
    note: "Order has been cancelled by admin",
  });

  const updatedOrder = await order.save();

  return {
    order: updatedOrder,
    oldStatus,
    newStatus: "cancelled",
    oldPayment,
  };
};

exports.deleteOrder = async (orderId) => {
  if (!orderId) throw new AppError("order Id is Required", 400);
  if (!isValidId(orderId)) throw new AppError("Invalid Order ID", 400);

  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  // check before delete
  if (order.paymentStatus !== "pending" || order.orderStatus !== "pending") {
    throw new AppError("Cannot delete order after payment or processing", 400);
  }

  await orderRepository.deleteOrder(orderId);

  return { message: "Order deleted successfully" };
};

exports.getAdvancedStats = async (startDate, endDate) => {
  const matchStage = {};

  // 📅 optional filter
  if (startDate || endDate) {
    matchStage.createdAt = {};

    if (startDate) {
      matchStage.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      matchStage.createdAt.$lte = new Date(endDate);
    }
  }

  const data = await orderRepository.getAdvancedStats(matchStage);

  return data;
};

exports.getDailySales = async () => {
  const matchStage = {
    paymentStatus: "paid",
    orderStatus: { $ne: "cancelled" },
  };

  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  // 📅 first & last day of current month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // last day

  matchStage.createdAt = {
    $gte: start,
    $lte: end,
  };

  const result = await orderRepository.getDailySales(matchStage);

  // 🧠 map result
  const map = new Map(
    result.map((r) => [`${r._id.year}-${r._id.month}-${r._id.day}`, r]),
  );

  const filled = [];

  for (let d = 1; d <= end.getDate(); d++) {
    const key = `${year}-${month + 1}-${d}`;

    if (map.has(key)) {
      filled.push(map.get(key));
    } else {
      filled.push({
        _id: {
          year,
          month: month + 1,
          day: d,
        },
        totalRevenue: 0,
        totalOrders: 0,
      });
    }
  }

  return filled;
};

exports.getMonthlySales = async (startDate, endDate) => {
  const matchStage = {
    paymentStatus: "paid",
    orderStatus: { $ne: "cancelled" },
  };

  const now = new Date();

  // 📅 default: current year
  let start = new Date(now.getFullYear(), 0, 1);
  let end = new Date(now.getFullYear(), 11, 31);

  if (startDate || endDate) {
    if (startDate) start = new Date(startDate);
    if (endDate) end = new Date(endDate);

    matchStage.createdAt = {
      ...(startDate && { $gte: start }),
      ...(endDate && { $lte: end }),
    };
  } else {
    matchStage.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const result = await orderRepository.getMonthlySales(matchStage);

  // 🧠 fill missing months
  const filled = [];

  const map = new Map(result.map((r) => [`${r._id.year}-${r._id.month}`, r]));

  for (let m = 1; m <= 12; m++) {
    const key = `${start.getFullYear()}-${m}`;

    if (map.has(key)) {
      filled.push(map.get(key));
    } else {
      filled.push({
        _id: {
          year: start.getFullYear(),
          month: m,
        },
        totalRevenue: 0,
        totalOrders: 0,
      });
    }
  }

  return filled;
};

exports.getYearlySales = async (startDate, endDate) => {
  const matchStage = {
    paymentStatus: "paid",
    orderStatus: { $ne: "cancelled" },
  };

  let startYear, endYear;

  // 📌 default: last 5 years
  if (!startDate && !endDate) {
    const currentYear = new Date().getFullYear();
    startYear = currentYear - 4;
    endYear = currentYear;

    matchStage.createdAt = {
      $gte: new Date(`${startYear}-01-01`),
      $lte: new Date(`${endYear}-12-31`),
    };
  } else {
    const start = startDate ? new Date(startDate) : new Date("2000-01-01");
    const end = endDate ? new Date(endDate) : new Date();

    startYear = start.getFullYear();
    endYear = end.getFullYear();

    matchStage.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const result = await orderRepository.getYearlySales(matchStage);

  // 🧠 map for fast lookup
  const map = new Map(result.map((r) => [r.year, r]));

  // 🔥 fill missing years
  const filledData = [];

  for (let year = startYear; year <= endYear; year++) {
    filledData.push(
      map.get(year) || {
        year,
        totalRevenue: 0,
        totalOrders: 0,
      },
    );
  }

  return filledData;
};

exports.getBestSellingProducts = async (startDate, endDate, limit) => {
  const matchStage = {
    paymentStatus: "paid",
    orderStatus: { $ne: "cancelled" },
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  // get min number
  if (limit && Number(limit) <= 0) {
    throw new AppError("limit must be greater than 0", 400);
  }
  const parsedLimit = Math.min(Number(limit) || 10, 30);
  const result = await orderRepository.getBestSellingProducts(
    matchStage,
    parsedLimit,
  );
  return result;
};

exports.getOrdersStatusSummary = async (startDate, endDate) => {
  const matchStage = {};

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  const result = await orderRepository.getOrdersStatusSummary(matchStage);
  return result;
};

const fillMissingMonths = (data, start, end) => {
  const map = new Map();

  data.forEach((item) => {
    const key = `${item.year}-${item.month}`;
    map.set(key, item);
  });

  const result = [];

  let current = new Date(start);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;

    const key = `${year}-${month}`;

    result.push(
      map.get(key) || {
        year,
        month,
        cash: { ordersCount: 0, uniqueUsers: 0, totalRevenue: 0 },
        paypal: { ordersCount: 0, uniqueUsers: 0, totalRevenue: 0 },
      },
    );

    current.setMonth(current.getMonth() + 1);
  }

  return result;
};

exports.getPaymentMethodsSummary = async (filters) => {
  const now = new Date();

  let startDate;
  let endDate;

  // ================= CUSTOM DATE RANGE =================
  if (filters.start && filters.end) {
    startDate = new Date(filters.start);

    endDate = new Date(filters.end);

    // ✅ include full end day
    endDate.setHours(23, 59, 59, 999);
  }

  // ================= FULL YEAR =================
  else {
    const year = filters.year ? Number(filters.year) : now.getFullYear();

    startDate = new Date(year, 0, 1);

    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  }

  // ================= MATCH =================
  const matchStage = {
    paymentStatus: "paid",

    orderStatus: {
      $ne: "cancelled",
    },

    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  console.log(matchStage, "MATCH");

  const rawData =
    await orderRepository.getPaymentMethodsSummaryByMonth(matchStage);

  return fillMissingMonths(rawData, startDate, endDate);
};

exports.getCitySummary = async (startDate, endDate) => {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  const data = await orderRepository.getCitySummary(matchStage);
  return data;
};

exports.getTodaySales = async () => {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const data = await orderRepository.getToadySales(startDate, endDate);
  return data;
};

exports.getUserStats = async (userId) => {
  if (!userId) throw new AppError("User ID Is Required", 404);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 404);
  const result = await orderRepository.getUserStats(userId);
  if (!result) {
    throw new AppError("User not found", 404);
  }
  return result;
};

exports.getOrdersStats = async () => {
  return await orderRepository.getOrdersStats();
};

const STATUS_LIST = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const ALL_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// 🧠 build months range
const buildMonths = (start, end) => {
  const months = [];
  const date = new Date(start);

  while (date <= end) {
    months.push(new Date(date));
    date.setMonth(date.getMonth() + 1);
  }

  return months;
};

// 🧠 default range = current year
const getDefaultRange = () => {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31),
  };
};

const addMonthPadding = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // ➖ شهر قبل البداية
  const paddedStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);

  // ➕ شهر بعد النهاية
  const paddedEnd = new Date(end.getFullYear(), end.getMonth() + 1, 1);

  return { paddedStart, paddedEnd };
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

const getFullYearMonths = (year = new Date().getFullYear()) => {
  return Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
  }));
};

exports.getStatusTotalSales = async ({ startDate, endDate }) => {
  const matchStage = {};

  if (startDate || endDate) {
    matchStage.createdAt = {};

    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const rawData = await orderModel.aggregate([
    { $match: matchStage },

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
              {
                $and: [
                  { $eq: ["$paymentStatus", "paid"] },
                  {
                    $in: [
                      "$orderStatus",
                      ["processing", "delivered", "shipped"],
                    ],
                  },
                ],
              },
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

    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // 📦 map
  const map = new Map();

  rawData.forEach((item) => {
    const key = `${item._id.year}-${item._id.month}`;

    map.set(key, {
      month: key,
      totalOrders: item.totalOrders,
      totalRevenue: item.totalRevenue,
      statuses: item.statuses,
    });
  });

  // 🔥 padded range
  let start = startDate
    ? new Date(startDate)
    : new Date(rawData[0]?._id?.year || 2026, 0, 1);

  let end = endDate ? new Date(endDate) : new Date();

  // ➕ padding months
  const paddedStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const paddedEnd = new Date(end.getFullYear(), end.getMonth() + 1, 1);

  const months = generateMonths(paddedStart, paddedEnd);

  const statuses = ["processing", "shipped", "delivered"];

  const filled = months.map(({ year, month }) => {
    const key = `${year}-${month}`;

    if (map.has(key)) return map.get(key);

    return {
      month: key,
      totalOrders: 0,
      totalRevenue: 0,
      statuses: statuses.map((s) => ({
        status: s,
        count: 0,
        revenue: 0,
      })),
    };
  });

  return {
    totalOrders: rawData.reduce((a, b) => a + b.totalOrders, 0),
    totalRevenue: rawData.reduce((a, b) => a + b.totalRevenue, 0),
    monthly: filled,
  };
};

exports.getInvoiceStats = async () => {
  const result = await orderRepository.getInvoiceStats();
  const data = result[0];

  return [
    /* ================= FINANCE ================= */

    {
      label: "Total Profit",
      value: data.totalRevenue?.[0]?.total || 0,
      type: "money",
    },

    /* ================= ORDER STATUS REVENUE ================= */

    {
      label: "Pending Revenue",
      value: data.pendingRevenue?.[0]?.total || 0,
      type: "money",
    },

    {
      label: "Processing Revenue",
      value: data.processingRevenue?.[0]?.total || 0,
      type: "money",
    },

    {
      label: "Shipped Revenue",
      value: data.shippedRevenue?.[0]?.total || 0,
      type: "money",
    },

    {
      label: "Delivered Revenue",
      value: data.deliveredRevenue?.[0]?.total || 0,
      type: "money",
    },

    {
      label: "Cancelled Revenue",
      value: data.cancelledRevenue?.[0]?.total || 0,
      type: "money",
    },

    /* ================= SYSTEM ================= */

    {
      label: "Total Invoices",
      value: data.totalInvoices?.[0]?.count || 0,
      type: "number",
    },
  ];
};
