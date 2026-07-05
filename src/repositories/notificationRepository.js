const ApiFeatures = require("../middlewares/apiFeature");
const Notification = require("../models/notificationModel");

exports.create = async (data) => {
  const notification = await Notification.create(data);
  return notification;
};

exports.findAll = async (queryString) => {
  const fieldSearch = ["type", "title"];

  // 1️⃣ اعمل query للفيلتر بس
  const baseQuery = new ApiFeatures(Notification.find(), queryString)
    .filter()
    .search(fieldSearch);

  const count = await baseQuery.query.clone().countDocuments();

  // 3️⃣ كمل باقي العمليات على نفس الكويري
  const features = new ApiFeatures(
    baseQuery.query.populate("user", "firstName lastName email"),
    queryString,
  )
    .sort()
    .limitFields()
    .paginate(count);

  const notifications = await features.query;

  return {
    notifications,
    pagination: features.paginationResult,
  };
};

exports.findById = async (id) => {
  const notification = await Notification.findById(id);
  return notification;
};

exports.update = async (id, data) => {
  const notification = await Notification.findByIdAndUpdate(id, data, {
    new: true,
  });
  return notification;
};

exports.markAllAsRead = async (ids) => {
  return await Notification.updateMany(
    { _id: { $in: ids } },
    { $set: { read: true } },
  );
};
exports.delete = async (id) => {
  const notification = await Notification.findByIdAndDelete(id);
  return notification;
};

exports.deleteMany = async (filter) => {
  const notifications = await Notification.deleteMany(filter);
  return notifications;
};

exports.countUnread = async (userId) => {
  return Notification.countDocuments({ user: userId, read: false });
};
