const express = require("express");
const {
  createOrder,
  updateOrder,
  getOrder,
  getAllOrders,
  getMyOrders,
  getOrdersByUser,
  cancelOrder,
  deleteOrder,
  getTotalSales,
  getDailySales,
  getMonthlySales,
  getYearlySales,
  getBestSellingProducts,
  getOrdersStatusSummary,
  getPaymentMethodsSummary,
  getCitySummary,
  getTodaySales,
  getOrders,
  getOrderByPaypal,
  getOrderByNumber,
  getUserStats,
  getOrdersStats,
  getAdvancedStats,
  getMonthlyAnalytics,
  getStatusTotalSales,
  getInvoiceStats,
} = require("../controllers/orderController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const { capture } = require("../controllers/paypalController");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");
const checkPaymentMethod = require("../middlewares/checkPaymentMethod");
const router = express.Router();

router.route("/stats").get(protect, restrictTo("admin"), getOrdersStats);
router
  .route("/users/:userId")
  .get(protect, restrictTo("admin"), getOrdersByUser);
router.route("/my-orders").get(protect, restrictTo("user"), getMyOrders);
router
  .route("/cancel-order/:orderId")
  .patch(protect, restrictTo("admin"), cancelOrder);

router
  .route("/analytics/total-sales")
  .get(protect, restrictTo("admin"), getStatusTotalSales);

router.get(
  "/analytics/total-sales-daily",
  protect,
  restrictTo("admin"),
  getDailySales,
);
router.get(
  "/analytics/total-sales-monthly",
  protect,
  restrictTo("admin"),
  getMonthlySales,
);
router.get(
  "/analytics/total-sales-yearly",
  protect,
  restrictTo("admin"),
  getYearlySales,
);

router.get(
  "/analytics/top-products",
  protect,
  restrictTo("admin"),
  getBestSellingProducts,
);

router.get(
  "/analytics/status-summary",
  protect,
  restrictTo("admin"),
  getOrdersStatusSummary,
);

router.get(
  "/analytics/payment-methods-summary",
  protect,
  restrictTo("admin"),
  getPaymentMethodsSummary,
);

router.get(
  "/analytics/sales-by-city",
  protect,
  restrictTo("admin"),
  getCitySummary,
);

router.get("/analytics/today", protect, restrictTo("admin"), getTodaySales);

router.get("/user-stats", protect, restrictTo("user"), getUserStats);

router.get("/invoice-stats", protect, restrictTo("admin"), getInvoiceStats);

router
  .route("/")
  .post(
    protect,
    restrictTo("user"),
    checkGeneralSettings("allowedOrder"),
    checkPaymentMethod,
    createOrder,
  )
  .get(protect, restrictTo("admin"), getOrders);

router
  .route("/track/:orderNumber")
  .get(
    protect,
    restrictTo("user", "admin"),
    checkGeneralSettings("allowed_tracking"),
    getOrderByNumber,
  );
router
  .route("/:id")
  .patch(protect, restrictTo("admin"), updateOrder)
  .get(protect, restrictTo("admin", "user"), getOrder)
  .delete(protect, restrictTo("admin"), deleteOrder);

module.exports = router;
