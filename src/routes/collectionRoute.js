const express = require("express");
const {
  createCollection,
  getAllCollections,
  getCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collectionController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const router = express.Router();

router
  .route("/")
  .post(protect, restrictTo("admin"), createCollection)
  .get(protect, restrictTo("admin"), getAllCollections);
router
  .route("/:id")
  .get(protect, restrictTo("admin"), getCollection)
  .patch(protect, restrictTo("admin"), updateCollection)
  .delete(protect, restrictTo("admin"), deleteCollection);

module.exports = router;
