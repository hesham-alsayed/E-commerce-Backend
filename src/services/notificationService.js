const AppError = require("../../utils/AppError");
const { isValidId } = require("../../utils/helper");
const userModel = require("../models/userModel");
const notificationRepository = require("../repositories/notificationRepository");
const mongoose = require("mongoose");

const allowedCreateFields = [
  "type",
  "title",
  "message",
  "user",
  "target",
  "link",
  "icon",
];
const allowedUpdateFields = ["read", "title", "message", "link", "icon"];

const filterAllowedFields = (data, allowedFields) => {
  const filtered = {};
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) filtered[field] = data[field];
  });
  return filtered;
};

// Create Notification
exports.createNotification = async (data) => {
  const filtered = filterAllowedFields(data, allowedCreateFields);

  // const userExists = await userModel.findById({ _id: filtered.user });
  // if (!userExists) {
  //   throw new AppError("User not found", 404);
  // }
  const notification = await notificationRepository.create(filtered);
  if (!notification) throw new AppError("Error in create notification", 400);
  return notification;
};

exports.markAllAsRead = async (ids) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError("ids are required or not valid", 404);
  }

  return await notificationRepository.markAllAsRead(ids);
};
exports.getNotifications = async (queryString) => {
  return notificationRepository.findAll(queryString);
};
// Get single Notification
exports.getNotification = async (id) => {
  if (!id) throw new AppError("Notification ID is required", 400);
  if (!isValidId(id)) throw new AppError("Invalid Notification ID", 400);

  const notification = await notificationRepository.findById(id);
  if (!notification) throw new AppError("Notification not found", 404);
  return notification;
};

// Update Notification
exports.updateNotification = async (id, data) => {
  if (!id) throw new AppError("Notification ID is required", 400);
  if (!isValidId(id)) throw new AppError("Invalid Notification ID", 400);

  const filtered = filterAllowedFields(data, allowedUpdateFields);
  const notification = await notificationRepository.update(id, filtered);
  if (!notification) throw new AppError("Notification not found", 404);
  return notification;
};

// Delete Notification
exports.deleteNotification = async (id) => {
  if (!id) throw new AppError("Notification ID is required", 400);
  if (!isValidId(id)) throw new AppError("Invalid Notification ID", 400);

  const notification = await notificationRepository.delete(id);
  if (!notification) throw new AppError("Notification not found", 404);
  return notification;
};

// Delete all read Notifications
exports.deleteReadNotifications = async (userId) => {
  if (!userId) throw new AppError("User ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid User ID", 400);

  return notificationRepository.deleteMany({ user: userId, read: true });
};

// Get unread count
exports.unreadCount = async (userId) => {
  if (!userId) throw new AppError("User ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid User ID", 400);

  return notificationRepository.countUnread(userId);
};
