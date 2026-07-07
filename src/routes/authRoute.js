const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");

const router = express.Router();

/* =========================
   PUBLIC AUTH
========================= */

// SIGNUP
router.post(
  "/auth-signup",
  checkGeneralSettings("allow_registration"),
  authController.signup,
);

// LOGIN
router.post(
  "/auth-login",
  checkGeneralSettings("allow_login"),
  authController.login,
);

// TEST EMAIL (returns actual error)
router.post("/test-email", authController.testEmail);

// FORGOT PASSWORD
router.post("/forgot-password", authController.forgotPassword);

// RESET PASSWORD
router.patch("/reset-password/:token", authController.resetPassword);

// EMAIL VERIFICATION
router.post(
  "/auth-send-email-code",
  checkGeneralSettings("allow_emailVerification"),
  authController.sendEmailCode,
);

router.post(
  "/auth-verify-email-code",
  checkGeneralSettings("allow_emailVerification"),
  authController.verifyEmailCode,
);

/* =========================
   PROTECTED AUTH
========================= */


router.post("/logout", protect, authController.logout);

// UPDATE PASSWORD
router.patch("/auth-update-password", protect, authController.updatePassword);

module.exports = router;
