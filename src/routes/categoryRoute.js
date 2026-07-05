const express = require("express");
const {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

// 👇 Apply to ALL routes in this file
router.use(protect);
router.use(restrictTo("admin"));

router.route("/").post(createCategory).get(getAllCategories);

router
  .route("/:id")
  .get(getCategory)
  .patch(updateCategory)
  .delete(deleteCategory);

module.exports = router;
