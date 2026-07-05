const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");

const {
  addToCart,
  getCart,
  clearCart,
  updateItemQuantity,
  removeItem,
  applyCoupon,
  removeCoupon,
} = require("../controllers/cartController");

/* =========================
   CART OPERATIONS
========================= */

// APPLY COUPON
router.post(
  "/apply-coupon",
  protect,
  checkGeneralSettings("allow_coupons"),
  applyCoupon,
);

// REMOVE COUPON
router.delete(
  "/remove-coupon",
  protect,
  checkGeneralSettings("allow_coupons"),
  removeCoupon,
);

// CART ROOT
router
  .route("/")
  .post(protect, checkGeneralSettings("add_toCart"), addToCart)
  .get(protect, getCart)
  .delete(protect, clearCart);

// CART ITEM OPERATIONS
router
  .route("/:itemId")
  .patch(protect, checkGeneralSettings("add_toCart"), updateItemQuantity)
  .delete(protect, checkGeneralSettings("add_toCart"), removeItem);

module.exports = router; 
