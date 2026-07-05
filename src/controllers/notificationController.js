const notificationModel = require("../models/notificationModel");
const notificationService = require("../services/notificationService");

// Create notification
exports.createNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.createNotification(req.body);
    res.status(201).json({ status: "success", data: notification });
  } catch (err) {
    next(err);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const { notifications, pagination } =
      await notificationService.getNotifications(req.query);

    res.status(200).json({
      status: "success",
      result: notifications.length,
      pagination,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

// Get single notification
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.getNotification(
      req.params.id,
    );
    res.status(200).json({ status: "success", data: notification });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const notifications = await notificationService.markAllAsRead(ids);
    res.status(200).json({
      status: "success",
      notifications,
    });
  } catch (error) {
    next(error);
  }
};
// Update notification
exports.updateNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.updateNotification(
      req.params.id,
      req.body,
    );
    res.status(200).json({ status: "success", data: notification });
  } catch (err) {
    next(err);
  }
};

// Delete notification
exports.deleteNotification = async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Delete all read notifications
exports.deleteReadNotifications = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    await notificationService.deleteReadNotifications(userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Unread count
exports.unreadCount = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const count = await notificationService.unreadCount(userId);
    res.status(200).json({ status: "success", data: { count } });
  } catch (err) {
    next(err);
  }
};
