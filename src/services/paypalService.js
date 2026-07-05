const AppError = require("../../utils/AppError");
const {
  decreaseProductStock,
  restoreProductStock,
  decreaseStock,
} = require("../../utils/controlStock");
const { capturePayPalOrder } = require("../../utils/paypal");
const { sendNotification } = require("../core/notificationManager");

const orderModel = require("../models/orderModel");
const cartService = require("../services/cartService");
const { addPartnerCommission } = require("./partnerService");

// =====================================================
// 💳 CAPTURE PAYMENT (PAYPAL SUCCESS)
// =====================================================
exports.capturePayment = async (paypalOrderId) => {
  try {
    const order = await orderModel.findOne({
      "paymentInfo.paypalOrderId": paypalOrderId,
    });

    if (!order) throw new AppError("Order not found", 404);

    if (order.paymentStatus === "paid") return order;

    const captureData = await capturePayPalOrder(paypalOrderId);

    const capture = captureData?.purchase_units?.[0]?.payments?.captures?.[0];

    if (!capture) {
      throw new AppError("Invalid capture response from PayPal", 400);
    }

    const oldPayment = order.paymentStatus;

    // ================= PAYMENT UPDATE =================
    order.paymentStatus = "paid";
    order.orderStatus = "processing";
    order.paidAt = new Date();
    order.paymentInfo.transactionId = capture.id;
    // ================= TRACKING UPDATE =================
    order.tracking.push({
      status: "processing",
      date: new Date(),
      note: "Payment captured successfully via PayPal. Order moved to processing.",
    });
    // =====================================================
    // 🔥 STOCK CONTROL (IDEMPOTENT SAFETY)
    // =====================================================
    if (!order.stockAdjusted) {
      await decreaseStock(order.items);
      order.stockAdjusted = true;
    }

    await order.save();

    // ================= PARTNER COMMISSION =================
    await addPartnerCommission(order, oldPayment);

    // ================= CLEAR CART =================
    await cartService.clearCart(order.user._id || order.user);

    // ================= ADMIN NOTIFICATION =================
    await sendNotification("order_paid", {
      userId: order.user._id,
      firstName: order.user.firstName,
      email: order.user.email,
      orderId: order._id,
      amount: order.totalPrice,
      link: `${process.env.BASE_URL}/admin/commerce/orders/order-details/${order._id}`,
      variables: {
        userName: order.user.firstName,
        orderId: order._id,
        amount: order.totalPrice,
        appName: "Goalify",
        year: new Date().getFullYear(),
      },
    }).catch((err) => {
      console.error("Order paid notification failed:", err.message);
    });

    return order;
  } catch (err) {
    console.log("🔥 PAYPAL ERROR:", err?.response?.data);

    const order = await orderModel.findOne({
      "paymentInfo.paypalOrderId": paypalOrderId,
    });

    if (order) {
      if (!order.stockAdjusted) {
        order.paymentStatus = "failed";
        order.orderStatus = "cancelled";
      }

      await order.save();
    }

    throw new AppError(
      err?.response?.data?.message || err.message || "Payment failed",
      400,
    );
  }
};

// =====================================================
// ❌ CANCEL PAYMENT FLOW
// =====================================================
exports.cancelPayment = async (paypalOrderId) => {
  try {
    const order = await orderModel.findOne({
      "paymentInfo.paypalOrderId": paypalOrderId,
    });

    if (!order) throw new AppError("Order not found", 404);

    if (order.paymentStatus === "paid") {
      throw new AppError("Cannot cancel paid order", 400);
    }

    if (order.orderStatus === "cancelled") {
      return order;
    }

    // ================= STOCK RESTORE SAFETY =================
    if (order.stockAdjusted) {
      await restoreProductStock(order.items);
      order.stockAdjusted = false;
    }

    // ================= UPDATE ORDER =================
    order.paymentStatus = "cancelled";
    order.orderStatus = "cancelled";
    order.cancelledAt = new Date();

    order.tracking.push({
      status: "cancelled",
      note: "User cancelled PayPal payment",
      createdAt: new Date(),
    });

    await order.save();

    // ================= CLEAR CART =================
    await cartService.clearCart(order.user._id || order.user);

    // ================= ADMIN NOTIFICATION =================
    await sendNotification("order_cancelled", {
      userId: order.user._id,
      firstName: order.user.firstName,
      email: order.user.email,
      orderId: order._id,
      link: `${process.env.BASE_URL}/admin/commerce/orders/order-details/${order._id}`,
      variables: {
        userName: order.user.firstName,
        orderId: order._id,
        reason: "User cancelled PayPal payment",
        appName: "Goalify",
        year: new Date().getFullYear(),
      },
    }).catch((err) => {
      console.error("Order cancelled notification failed:", err.message);
    });

    return order;
  } catch (error) {
    throw new AppError(
      error.message || "Cancel payment failed",
      error.statusCode || 500,
    );
  }
};
