const express = require("express");
const router = express.Router();

const couponController = require("../controllers/couponController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");

/* =========================
   USER - APPLY COUPON
========================= */
router.get(
  "/code/:code",
  protect,
  checkGeneralSettings("allow_coupons"),
  couponController.getCouponByCode,
);

/* =========================
   ADMIN - CRUD
========================= */

// GET + CREATE
router
  .route("/")
  .get(protect, restrictTo("admin"), couponController.getAllCoupons)
  .post(protect, restrictTo("admin"), couponController.createCoupon);

// BY PARTNER
router.get(
  "/partner/:partnerId",
  protect,
  restrictTo("admin"),
  couponController.getCouponsByPartner,
);

// SOFT DELETE
router.patch(
  "/:id/soft-delete",
  protect,
  restrictTo("admin"),
  couponController.softDeleteCoupon,
);

// USAGE INCREMENT
router.patch(
  "/:id/increment",
  protect,
  restrictTo("admin"),
  couponController.incrementUsage,
);

// CRUD BY ID
router
  .route("/:id")
  .get(protect, restrictTo("admin"), couponController.getCouponById)
  .patch(protect, restrictTo("admin"), couponController.updateCoupon)
  .delete(protect, restrictTo("admin"), couponController.deleteCoupon);

module.exports = router;
