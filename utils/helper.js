const mongoose = require("mongoose");
const AppError = require("./AppError");
const settingsService = require("../src/services/settingsService");

exports.isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.parseUTCDate = (dateStr, endOfDay = false) => {
  if (!dateStr) return null;
  if (endOfDay) return new Date(`${dateStr}T23:59:59.999Z`);
  return new Date(`${dateStr}T00:00:00.000Z`);
};

exports.getStockStatus = (stock) => {
  if (stock === 0) return "out-of-stock";
  if (stock <= 5) return "low-stock";
  return "high-stock";
};

exports.normalizeKey = (key) => key.toLowerCase().trim().replace(/\s+/g, "_");

exports.normalizeQuery = (query) => ({
  page: Number(query.page) || 1,
  limit: Number(query.limit) || 10,
  sort: query.sort || "totalRevenue",
  order: query.order || "desc",
  search: query.search?.trim() || null,
});

exports.normalizeCustomerQuery = (query) => ({
  status: query.status || null,
  revenueGte: query.revenueGte ? Number(query.revenueGte) : null,
  revenueLte: query.revenueLte ? Number(query.revenueLte) : null,
  ordersGte: query.ordersGte ? Number(query.ordersGte) : null,
  ordersLte: query.ordersLte ? Number(query.ordersLte) : null,
});

exports.sectionsValidators = {
  banner: (section) => {
    const image = section.props?.image;

    const hasImage = image?.url && image.url.trim() !== "";

    if (!hasImage) {
      throw new AppError("Banner must include image", 400);
    }
  },

  text: (section) => {
    if (!section.props?.description) {
      throw new AppError("Text section must include content", 400);
    }
  },

  products: (section) => {
    if (!section.props?.products?.length) {
      throw new AppError("Products required", 400);
    }
  },
};

// ================= VALIDATE DISCOUNT =================
exports.isDiscountValid = (discount) => {
  if (!discount || !discount.isActive) return false;

  const now = Date.now();

  if (discount.startDate && new Date(discount.startDate).getTime() > now) {
    return false;
  }

  if (discount.endDate && new Date(discount.endDate).getTime() < now) {
    return false;
  }

  return true;
};

// ================= FINAL PRICE =================
exports.getFinalPrice = (product) => {
  const price = Number(product.price) || 0;

  const discount = exports.isDiscountValid(product.subcategory?.discount)
    ? product.subcategory.discount
    : exports.isDiscountValid(product.category?.discount)
      ? product.category.discount
      : exports.isDiscountValid(product.collection?.discount)
        ? product.collection.discount
        : null;

  if (!discount) return price;

  const value = Number(discount.value) || 0;

  let finalPrice;

  if (discount.type === "percentage") {
    finalPrice = price - (price * value) / 100;
  } else {
    finalPrice = price - value;
  }

  return finalPrice > 0 ? finalPrice : 0;
};

exports.attachFreeShipping = async (cart) => {
  const freeShipping = await settingsService.checkFreeShipping();

  const base = cart.toObject?.() || cart;

  if (!freeShipping?.enabled) {
    return {
      ...base,
      freeShipping: null,
    };
  }

  const threshold = Number(freeShipping.value);

  // ================= IMPORTANT =================
  // لازم تكون القيم دي جاية من recalcCart قبلها
  const subtotalBeforeDiscount = base.totalPrice || 0;
  const subtotalAfterDiscount =
    base.totalPriceAfterDiscount ?? base.totalPrice ?? 0;

  const wasFreeShippingBefore = subtotalBeforeDiscount >= threshold;
  const isFreeShipping = subtotalAfterDiscount >= threshold;

  const remaining = Math.max(threshold - subtotalAfterDiscount, 0);

  let status = "none";

  if (isFreeShipping) {
    status = "earned";
  } else if (wasFreeShippingBefore && !isFreeShipping) {
    status = "lost";
  }

  return {
    ...base,
    freeShipping: {
      enabled: true,
      threshold,
      isFreeShipping,
      remaining,
      status,
    },
  };
};

exports.recalculateCart = (cart) => {
  const items = cart.items || [];

  // ================= SUBTOTAL =================
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  cart.totalPrice = subtotal;

  // ================= DISCOUNT =================
  if (cart.coupon && cart.discountAmount) {
    cart.totalPriceAfterDiscount = Math.max(subtotal - cart.discountAmount, 0);
  } else {
    cart.totalPriceAfterDiscount = subtotal;
    cart.discountAmount = 0;
    cart.coupon = null;
  }

  return cart;
};

exports.saveCart = async (cart) => {
  if (cart?.save) return await cart.save();
  return cart; // fallback لو object
};

exports.ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

exports.PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
};

exports.isDiscountValid = (discount) => {
  if (!discount) return false;

  const { isActive, value, startDate, endDate } = discount;

  if (!isActive || !value) return false;

  const now = Date.now();

  if (startDate && new Date(startDate).getTime() > now) return false;
  if (endDate && new Date(endDate).getTime() < now) return false;

  return true;
};

exports.resolveDiscount = (product) => {
  const sub = product?.subcategory?.discount;
  if (sub && exports.isDiscountValid(sub)) {
    return sub;
  }

  const cat = product?.category?.discount;
  if (cat && exports.isDiscountValid(cat)) {
    return cat;
  }

  const col = product?.collection?.discount;
  if (col && exports.isDiscountValid(col)) {
    return col;
  }

  return null;
};

exports.getFinalPrice = (price, discount) => {
  if (!exports.isDiscountValid(discount)) return price;

  if (discount.type === "percentage") {
    return price - (price * discount.value) / 100;
  }

  if (discount.type === "fixed") {
    return price - discount.value;
  }

  return price;
};
exports.filterAllowedFields = (data, allowedFields) => {
  const filtered = {};

  Object.keys(data).forEach((key) => {
    if (allowedFields.includes(key)) {
      filtered[key] = data[key];
    }
  });

  return filtered;
};

exports.fillMissingMonths = (data, startDate, endDate) => {
  const result = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.getMonth() + 1;
  const startYear = start.getFullYear();

  const endMonth = end.getMonth() + 1;
  const endYear = end.getFullYear();

  // helper to loop months across years
  const current = new Date(startYear, startMonth - 1, 1);
  const last = new Date(endYear, endMonth - 1, 1);

  while (current <= last) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();

    const found = data.find((d) => d.month === month && d.year === year);

    result.push(
      found || {
        month,
        year,
        cash: {
          ordersCount: 0,
          uniqueUsers: 0,
          totalRevenue: 0,
        },
        paypal: {
          ordersCount: 0,
          uniqueUsers: 0,
          totalRevenue: 0,
        },
      },
    );

    // next month
    current.setMonth(current.getMonth() + 1);
  }

  return result;
};

exports.formateAnalyticsOrders = (data) => {
  const map = new Map();

  data.forEach((item) => {
    const key = `${item._id.year}-${item._id.month}`;

    if (!map.has(key)) {
      map.set(key, {
        month: key,
        totalOrders: 0,
        totalRevenue: 0,
        statusMap: {},
      });
    }

    const m = map.get(key);

    // 📦 total orders
    m.totalOrders += item.count;

    // 💰 revenue ONLY delivered + paid
    if (item._id.status === "delivered") {
      m.totalRevenue += item.revenue;
    }

    // 📊 status array
    if (!m.statusMap[item._id.status]) {
      m.statusMap[item._id.status] = {
        status: item._id.status,
        count: 0,
        revenue: 0,
      };
    }

    m.statusMap[item._id.status].count += item.count;
    m.statusMap[item._id.status].revenue += item.revenue;
  });

  return Array.from(map.values()).map((m) => ({
    month: m.month,
    totalOrders: m.totalOrders,
    totalRevenue: m.totalRevenue,
    status: Object.values(m.statusMap),
  }));
};

exports.getMonthsRange = (start, end) => {
  const months = [];
  const date = new Date(start);

  while (date <= end) {
    months.push(new Date(date));
    date.setMonth(date.getMonth() + 1);
  }

  return months;
};
