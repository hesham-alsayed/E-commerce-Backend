const notificationTemplates = {
  account_deleted: {
    template: "accountDeleted", // اسم ملف Pug لو حتعمل إيميل (ممكن تحذفه لو هتبعت إشعار فقط)
    subject: "Your account has been deleted ",
    requiredVariables: ["userName", "appName", "year"],
  },
  password_changed: {
    template: "updateMyPassword",
    subject: "Your password has been updated 🔒",
    requiredVariables: ["userName", "appName", "year"],
  },
  order_received: {
    template: "orderReceived",
    subject: "Your order has been received successfully",
    requiredVariables: ["firstName", "orderId", "items", "totalPrice", "link"],
  },

  order_delivered: {
    template: "orderDelivered",
    subject: "Your order has been delivered",
    requiredVariables: [
      "orderId",
      "oldStatus",
      "newStatus",
      "items",
      "totalPrice",
      "link",
    ],
  },

  payment_processed: {
    template: "paymentNotification",
    subject: "Payment processed successfully",
    requiredVariables: ["amount", "paymentMethod"],
  },

  order_cancelled: {
    template: "orderCancelled",
    subject: "Your order has been cancelled",
    requiredVariables: [
      "orderId",
      "oldStatus",
      "newStatus",
      "items",
      "totalPrice",
      "link",
    ],
  },

  // ✅ USER → Welcome Email
  welcome_new_user: {
    template: "welcomeUser",
    subject: "Welcome to our platform 🎉",
    requiredVariables: ["userName", "dashboardUrl", "appName", "year"],
  },

  low_stock: {
    template: "stockNotification",
    subject: "Product is low in stock",
    requiredVariables: ["productName", "stock"],
  },

  product_back_in_stock: {
    template: "stockNotification",
    subject: "Product is back in stock",
    requiredVariables: ["productName"],
  },

  review_received: {
    template: "reviewNotification",
    subject: "New review received",
    requiredVariables: ["productName", "rating", "reviewText"],
  },

  coupon_applied: {
    template: "couponNotification",
    subject: "Your coupon has been applied",
    requiredVariables: ["couponCode", "discount"],
  },

  admin_custom: {
    template: "adminNotification",
    subject: "Admin message",
    requiredVariables: ["message"],
  },
};

module.exports = notificationTemplates;
