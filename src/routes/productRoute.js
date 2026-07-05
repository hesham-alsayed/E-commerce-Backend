const express = require("express");

const {
  getStockAnalysis,
  getStockByCategory,
  getTopRatedProducts,
  getProductAnalysisByCollection,
  createProduct,
  getProducts,
  getUserProducts, // 👈 NEW
  updateProduct,
  getProduct,
  deleteProduct,
  getProductAnalytics,
} = require("../controllers/productController");

const {
  uploadProductVariants,
} = require("../middlewares/uploadProductVariants");

const uploadProductImages = require("../middlewares/uploadProductImages");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");

const router = express.Router();

// ================= ANALYTICS =================
router.get("/stock-analysis", protect, restrictTo("admin"), getStockAnalysis);
router.get(
  "/stock-analysis-by-category",
  protect,
  restrictTo("admin"),
  getStockByCategory,
);
router.get(
  "/analysis-top-rated",
  protect,
  restrictTo("admin"),
  getTopRatedProducts,
);
router.get(
  "/stock-analysis/by-collection",
  protect,
  restrictTo("admin"),
  getProductAnalysisByCollection,
);

router.get("/:id/analytics", protect, restrictTo("admin"), getProductAnalytics);

// ================= CREATE =================
router.post(
  "/",
  protect,
  restrictTo("admin"),
  uploadProductImages.any(),
  uploadProductVariants,
  createProduct,
);

// ================= ADMIN GET ALL =================
router.get("/", protect, restrictTo("admin"), getProducts);

// ================= USER GET ALL (NEW ROUTE) =================
router.get("/user", checkGeneralSettings("browse_products"), getUserProducts);

// ================= SINGLE =================
router.get("/:id", getProduct);

// ================= UPDATE =================
router.patch(
  "/:id",
  protect,
  restrictTo("admin"),
  uploadProductImages.any(),
  uploadProductVariants,
  updateProduct,
);

// ================= DELETE =================
router.delete("/:id", protect, restrictTo("admin"), deleteProduct);

module.exports = router;
