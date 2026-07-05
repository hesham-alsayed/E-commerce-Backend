const express = require("express");
const controller = require("../controllers/paypalController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect, restrictTo("user"));

// PAYPAL CAPTURE
router.post("/capture", controller.capture);
router.patch("/cancel", controller.cancel);

module.exports = router;
