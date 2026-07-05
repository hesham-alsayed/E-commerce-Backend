const express = require("express");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const { upload } = require("../middlewares/upload");

const {
  // User profile
  getMe,
  updateMe,
  deleteMe,
  // Admin users management
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  // Wishlist
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  // Addresses (user)
  getMyAddresses,
  addMyAddress,
  updateMyAddress,
  deleteMyAddress,
  // Addresses (admin)
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getAllCustomersSummary,
  getStatsUser,
  createUser,
  getStatsCustomers,
  getStatsUsers,
  changeUserRole,
} = require("../controllers/userController");
const { uploadAvatar } = require("../middlewares/uploadAvatar");
const {
  uploadAvatarToCloudinary,
} = require("../middlewares/uploadAvatarImage");
const checkGeneralSettings = require("../middlewares/checkGeneralSettings");

const router = express.Router();

// ---------------------------
// USER ROUTES (profile, wishlist, addresses)
// ---------------------------

// Profile routes


router.patch(
  "/:userId/role",
  protect,              // لازم يكون مسجل دخول
  restrictTo("admin"),  // فقط الأدمن يغير roles
  changeUserRole
);

router.get(
  "/customers-summary",
  protect,
  restrictTo("admin"),
  getAllCustomersSummary,
);
router.get("/customers-stats", protect, restrictTo("admin"), getStatsCustomers);
router.get("/stats", protect, restrictTo("admin"), getStatsUsers);

router
  .route("/update-me")
  .patch(protect, checkGeneralSettings("allow_update_profile"), updateMe);

router
  .route("/me")
  .get(protect, getMe)
  .patch(
    protect,
    checkGeneralSettings("allow_update_profile"),
    uploadAvatar.single("avatar"),
    uploadAvatarToCloudinary,
    updateMe,
  )
  .delete(protect, deleteMe);

// Wishlist routes
router
  .route("/wishlist")
  .get(protect, restrictTo("admin", "user"), getWishlist)
  .post(protect, checkGeneralSettings("add_wishlist"), addToWishlist);

router.delete(
  "/wishlist/:productId",
  protect,
  checkGeneralSettings("remove_wishlist"),
  removeFromWishlist,
);

// Addresses (user)
router
  .route("/me/addresses")
  .get(protect, getMyAddresses)
  .post(protect, checkGeneralSettings("add_address"), addMyAddress);

router
  .route("/me/addresses/:addressId")
  .patch(protect, updateMyAddress)
  .delete(protect, checkGeneralSettings("remove_address"), deleteMyAddress);

// ---------------------------
// ADMIN ROUTES
// ---------------------------

// Protect all admin routes
router.use(protect, restrictTo("admin"));

// Users management
router.get("/", getAllUsers);
router.post(
  "/",
  checkGeneralSettings("create_user"),
  (req, res, next) => {
    console.log("🔥 ROUTE REACHED (before controller)");
    next();
  },
  createUser,
);
router.route("/:id").get(getUser).patch(updateUser).delete(deleteUser);

// Addresses (admin)
router.route("/:userId/addresses").get(getUserAddresses).post(addUserAddress);

router
  .route("/:userId/addresses/:addressId")
  .patch(updateUserAddress)
  .delete(deleteUserAddress);

module.exports = router;
