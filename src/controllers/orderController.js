const { sendNotification } = require("../core/notificationManager");
const ApiFeatures = require("../middlewares/apiFeature");
const orderModel = require("../models/orderModel");
const orderService = require("../services/orderService");

exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const orderData = req.body;

    // =========================
    // CREATE ORDER
    // =========================
    const { order, approvalUrl } = await orderService.createOrder(
      userId,
      orderData,
    );

    // =========================
    // FRONTEND LINK
    // =========================
    const STORE_URL = process.env.USER_FRONTEND_URL || "http://localhost:3000";

    const link = `${STORE_URL}/order-details/${order._id}`;

    // =========================
    // COMMON VARIABLES
    // =========================
    const variables = {
      firstName: req.user.firstName,
      orderId: order._id,
      items: order.items,
      totalPrice: order.totalPriceAfterDiscount || order.totalPrice,
      link,
    };

    // ==================================================
    // 1️⃣ ORDER RECEIVED EVENT
    // USER → EMAIL ONLY
    // ADMIN → DB NOTIFICATION ONLY
    // ==================================================
    await sendNotification("order_received", {
      userId: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      orderId: order._id,
      link,
      variables,
    });

    // ==================================================
    // 2️⃣ COUPON EVENT (ADMIN ONLY)
    // ==================================================
    if (order.coupon) {
      await sendNotification("coupon_applied", {
        userId: req.user._id,
        orderId: order._id,
        link,
        variables,
      });
    }

    // =========================
    // RESPONSE
    // =========================
    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      order,
      approvalUrl: approvalUrl || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const data = req.body;

    const { updatedOrder, oldStatus, oldPaymentStatus } =
      await orderService.updateOrder(orderId, data);

    const newStatus = updatedOrder.orderStatus;
    const newPaymentStatus = updatedOrder.paymentStatus;

    const STORE_URL = process.env.STORE_URL;
    const link = `${STORE_URL}/order-details/${updatedOrder._id}`;

    // ==========================================
    // ORDER STATUS CHANGED
    // ==========================================
    if (oldStatus !== newStatus) {
      const variables = {
        firstName: updatedOrder.user?.firstName,
        orderId: updatedOrder._id,
        oldStatus,
        newStatus,
        items: updatedOrder.items,
        totalPrice:
          updatedOrder.totalPriceAfterDiscount || updatedOrder.totalPrice,
        link,
      };

      const basePayload = {
        userId: updatedOrder.user._id,
        email: updatedOrder.user.email,

        firstName: updatedOrder.user.firstName || "",
        lastName: updatedOrder.user.lastName || "",

        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,

        order: updatedOrder,

        oldStatus,
        newStatus,
        link,
        variables,
      };

      // ================================
      // CANCELLED HAS PRIORITY
      // ================================
      if (newStatus === "cancelled") {
        await sendNotification("order_cancelled", basePayload).catch((err) => {
          console.error("Order cancelled notification failed:", err.message);
        });
      } else {
        await sendNotification("order_updated", basePayload).catch((err) => {
          console.error("Order updated notification failed:", err.message);
        });
      }
    }
    // ==========================================
    // PAYMENT STATUS CHANGED TO PAID
    // ==========================================
    if (oldPaymentStatus !== "paid" && newPaymentStatus === "paid") {
      await sendNotification("order_paid", {
        userId: updatedOrder.user._id,
        email: updatedOrder.user.email,
        firstName: updatedOrder.user.firstName,
        lastName: updatedOrder.user.lastName,
        order: updatedOrder,
        link,
      }).catch((err) =>
        console.error("Payment notification failed:", err.message),
      );
    }

    res.status(200).json({
      status: "success",
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    res.status(200).json({
      status: "success",
      order,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderByNumber = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;
    console.log(orderNumber, email);

    const order = await orderService.getOrderByNumber(orderNumber, email);

    res.status(200).json({
      status: "success",
      order,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const searchFields = ["orderNumber", "invoiceNumber", "contactEmail"];

    const { coupon } = req.query;

    let features = new ApiFeatures(
      orderModel
        .find()
        .populate("coupon")
        .populate("user", "firstName lastName email"),
      req.query,
      searchFields,
    )
      .filter()
      .sort()
      .limitFields()
      .search(searchFields);

    /* ================= COUPON FILTER ================= */

    if (coupon === "true") {
      features.query = features.query.find({
        coupon: { $ne: null },
      });
    }

    if (coupon === "false") {
      features.query = features.query.find({
        coupon: null,
      });
    }

    const count = await features.query.clone().countDocuments();

    features = features.paginate(count);

    const orders = await features.query;

    res.status(200).json({
      status: "success",
      result: orders?.length,
      pagination: features.paginationResult,
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const orders = await orderService.getOrdersByUser(userId);
    res.status(200).json({
      status: "success",
      result: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const orders = await orderService.getOrdersByUser(userId);
    res.status(200).json({
      status: "success",
      result: orders.length,
      data: {
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const { order, oldStatus, newStatus } =
      await orderService.cancelOrder(orderId);

    const link = `${process.env.BASE_URL}/admin/commerce/orders/order-details/${order._id}`;

    await sendNotification("order_cancelled", {
      userId: order.user._id,
      email: order.user.email,

      firstName: order.user.firstName || "",
      lastName: order.user.lastName || "",

      orderId: order._id,
      orderNumber: order.orderNumber,

      order,

      oldStatus,
      newStatus,

      link,

      variables: {
        userName: order.user.firstName,
        orderId: order._id,
        reason: "Order cancelled by admin",
        appName: "Goalify",
        year: new Date().getFullYear(),
      },
    }).catch((err) => {
      console.error("Order cancelled notification failed:", err.message);
    });

    res.status(200).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};
// Hard Delete
exports.deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    await orderService.deleteOrder(id);

    res.status(204).json({
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// analyst

exports.getAdvancedStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await orderService.getAdvancedStats(startDate, endDate);

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDailySales = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await orderService.getDailySales(startDate, endDate);
    res.status(200).json({ status: "success", result: data.length, data });
  } catch (err) {
    next(err);
  }
};

exports.getMonthlySales = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await orderService.getMonthlySales(startDate, endDate);
    res.status(200).json({ status: "success", result: data.length, data });
  } catch (err) {
    next(err);
  }
};

exports.getYearlySales = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await orderService.getYearlySales(startDate, endDate);
    res.status(200).json({ status: "success", result: data.length, data });
  } catch (err) {
    next(err);
  }
};

exports.getBestSellingProducts = async (req, res, next) => {
  try {
    const { startDate, endDate, limit } = req.query;

    const data = await orderService.getBestSellingProducts(
      startDate,
      endDate,
      limit,
    );

    res.status(200).json({ status: "success", result: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.getOrdersStatusSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await orderService.getOrdersStatusSummary(startDate, endDate);

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentMethodsSummary = async (req, res, next) => {
  try {
    const { year, start, end } = req.query;

    const data = await orderService.getPaymentMethodsSummary({
      year,
      start,
      end,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCitySummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await orderService.getCitySummary(startDate, endDate);

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTodaySales = async (req, res, next) => {
  try {
    const data = await orderService.getTodaySales();
    res.status(200).json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await orderService.getUserStats(userId);
    res.status(200).json({
      status: "success",
      result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrdersStats = async (req, res, next) => {
  try {
    const stats = await orderService.getOrdersStats();

    res.status(200).json({
      status: "success",
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

exports.getStatusTotalSales = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await orderService.getStatusTotalSales({
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceStats = async (req, res, next) => {
  try {
    const stats = await orderService.getInvoiceStats();
    res.status(200).json({
      success: true,
      stats,
    });
  } catch (err) {
    next(err);
  }
};
