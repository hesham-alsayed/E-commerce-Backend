const express = require("express");
const router = express.Router();

const controller = require("../controllers/shippingZoneController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// ZONES

router.patch(
  "/toggle-all",
  protect,
  restrictTo("admin"),
  controller.toggleAllZones,
);

router.put("/", protect, restrictTo("admin"), controller.saveZones);

router.post("/", protect, restrictTo("admin"), controller.createZone);
router.get("/", controller.getAllZones);
router.get("/:id", protect, restrictTo("admin"), controller.getZone);
router.patch("/:id", protect, restrictTo("admin"), controller.updateZone);
router.delete("/:id", protect, restrictTo("admin"), controller.deleteZone);

// CITIES
router.post(
  "/:zoneId/cities",
  protect,
  restrictTo("admin"),
  controller.addCity,
);
router.patch(
  "/:zoneId/cities/:cityId",
  protect,
  restrictTo("admin"),
  controller.updateCity,
);
router.delete(
  "/:zoneId/cities/:cityId",
  protect,
  restrictTo("admin"),
  controller.deleteCity,
);

module.exports = router;
