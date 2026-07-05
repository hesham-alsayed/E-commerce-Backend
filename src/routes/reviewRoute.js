const express = require("express");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const reviewController = require("../controllers/reviewController");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");

const router = express.Router();

/* =========================
   🔥 ANALYTICS (STATIC)
========================= */
router.get("/analytics", reviewController.getReviewsAnalytics);
router.get("/analytics-rated", reviewController.getRatingAnalytics);

/* =========================
   🔥 USER / SPECIAL ROUTES
========================= */
router.get("/latest", protect, reviewController.getLatestReviews);
router.get("/me", protect, restrictTo("user"), reviewController.getMyReviews);
router.get(
  "/user/:userId",
  protect,
  protect,
  restrictTo("admin", "user"),
  reviewController.getReviewsByUser,
);
router.get("/product/:productId", reviewController.getReviewsByProduct);

/* =========================
   🔥 CRUD ROUTES
========================= */
router.post(
  "/",
  protect,
  restrictTo("user"),
  checkGeneralSettings("apply_review"),
  reviewController.createReview,
);
router.get("/", protect, restrictTo("admin"), reviewController.getAllReviews);

/* =========================
   ⚠️ DYNAMIC ROUTE (LAST)
========================= */
router.get("/:id", protect, restrictTo("user"), reviewController.getReview);
router.patch(
  "/:id",
  protect,
  protect,
  restrictTo("user"),
  checkGeneralSettings("update_review"),

  reviewController.updateReview,
);
router.delete(
  "/:id",
  protect,
  protect,
  restrictTo("user"),
  checkGeneralSettings("delete_review"),

  reviewController.deleteReview,
);

module.exports = router;
