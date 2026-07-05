const express = require("express");
const {
  unreadCount,
  deleteReadNotifications,
  deleteNotification,
  updateNotification,
  getNotification,
  getNotifications,
  createNotification,
  markAllAsRead,
} = require("../controllers/notificationController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const router = express.Router();


router.use(protect, restrictTo("admin"));

// Get unread count
router.get("/unread-count", unreadCount);
router.patch("/mark-many-read", markAllAsRead);
// Create notification
router.post("/", createNotification);

// Get all notifications
router.get("/", getNotifications);

// Get single notification
router.get("/:id", getNotification);

// Update notification
router.patch("/:id", updateNotification);

// Delete notification
router.delete("/:id", deleteNotification);

// Delete all read notifications (bulk)
router.delete("/", deleteReadNotifications);

module.exports = router;
