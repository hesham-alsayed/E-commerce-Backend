const express = require("express");
const {
  createSubcategory,
  getAllSubcategories,
  getSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getNavLinks,
} = require("../controllers/subcategoryController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const router = express.Router();

router.route("/nav-links").get(getNavLinks);

router.use(protect, restrictTo("admin"));

router.route("/").post(createSubcategory).get(getAllSubcategories);
router
  .route("/:id")
  .get(getSubcategory)
  .patch(updateSubcategory)
  .delete(deleteSubcategory);

module.exports = router;
