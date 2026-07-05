const express = require("express");
const router = express.Router();
const partnerController = require("../controllers/partnerController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");

// Optional: only admin can manage partners
router.use(protect, restrictTo("admin"));

router
  .route("/")
  .post(checkGeneralSettings("partner_management"), partnerController.createPartner)
  .get(partnerController.getAllPartners);

router
  .route("/:id")
  .get(partnerController.getPartnerDetails)
  .patch(partnerController.updatePartner)
  .delete(partnerController.deletePartner);

module.exports = router;
