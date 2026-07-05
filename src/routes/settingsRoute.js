const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// ==================================================
// 1️⃣ SPECIFIC ROUTES (MOST IMPORTANT - PUT FIRST)
// ==================================================

// Toggle all / general actions
router.patch(
  "/:settingId/toggle-all",
  protect,
  restrictTo("admin"),
  settingsController.updateAllGeneralSettings,
);

// Update settings VALUE by key (MAIN SAVE ROUTE)
router.put(
  "/key/:key/value",
  protect,
  restrictTo("admin"),
  settingsController.updateSettingValueArray,
);

// Get setting by key
router.get("/key/:key", settingsController.getSettingByKey);

// ==================================================
// 2️⃣ ID BASED ROUTES
// ==================================================

router
  .route("/:id")
  .get(settingsController.getSettingById)
  .patch(protect, restrictTo("admin"), settingsController.updateSetting)
  .delete(protect, restrictTo("admin"), settingsController.deleteSetting);

// ==================================================
// 3️⃣ VALUE OPERATIONS (NESTED RESOURCE)
// ==================================================

// Create value inside setting
router.post(
  "/:id/value",
  protect,
  restrictTo("admin"),
  settingsController.createValue,
);
// Update specific value
router.patch(
  "/:settingId/value/:valueId",
  protect,
  restrictTo("admin"),
  settingsController.updateValue,
);

// Delete specific value
router.delete(
  "/:settingId/value/:valueId",
  protect,
  restrictTo("admin"),
  settingsController.deleteValue,
);

// ==================================================
// 4️⃣ GENERAL CRUD (BROADEST)
// ==================================================

router
  .route("/")
  .get(protect, restrictTo("admin"), settingsController.getAllSettings)
  .post(protect, restrictTo("admin"), settingsController.createSetting);

// ==================================================
// EXPORT
// ==================================================

module.exports = router;
