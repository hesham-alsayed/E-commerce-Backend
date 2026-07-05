const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const { handleSectionImages } = require("../middlewares/handleSectionsImage");
const { uploadBanner } = require("../middlewares/uploadBanner");
const { restrictTo, protect } = require("../middlewares/authMiddleware");

// ================= PAGE =================
router.post("/", protect, restrictTo("admin"), pageController.createPage);
router.get("/", pageController.getAllPages);
router.get("/:pageId", pageController.getPage);
router.put(
  "/:pageId",
  protect,
  restrictTo("admin"),
  uploadBanner.any(), // 1️⃣ استقبل الصور
  handleSectionImages, // 2️⃣ ارفعها Cloudinary
  pageController.updatePage, // 3️⃣ احفظ
);
router.patch(
  "/:pageId/meta",
  protect,
  restrictTo("admin"),
  pageController.updatePageMeta,
);

router.delete(
  "/:pageId",
  protect,
  restrictTo("admin"),
  pageController.deletePage,
);

// ================= SECTIONS =================
router.post(
  "/:pageId/sections",
  protect,
  restrictTo("admin"),
  uploadBanner.any(),
  pageController.addSection,
);

router.patch(
  "/:pageId/sections/:sectionId",
  uploadBanner.any(),
  pageController.updateSection,
);

router.delete(
  "/:pageId/sections/:sectionId",
  protect,
  restrictTo("admin"),
  pageController.deleteSection,
);

module.exports = router;
