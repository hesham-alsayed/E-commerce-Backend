const AppError = require("../../utils/AppError");
const {
  getNotificationSetting,
  createAdminNotification,
  hasChannel,
  sendEmailNotification,
  buildAdminMessage,
} = require("../../utils/notifications");


// =========================
// SEND NOTIFICATION ENGINE
// =========================
exports.sendNotification = async (type, data = {}) => {
  const setting = await getNotificationSetting(type);

  if (!setting) {
    throw new AppError(`Notification "${type}" not found`, 404);
  }

  let adminNotification = null; 

  // =========================
  // ADMIN (runtime message)
  // =========================
  if (hasChannel(setting, "admin")) {
    const adminMessage = buildAdminMessage(type, data);

    adminNotification = await createAdminNotification({
      type,
      userId: data.userId,
      message: adminMessage,
      link: data.link,
    });
  }

  // =========================
  // USER EMAIL ONLY
  // =========================
  if (hasChannel(setting, "email")) {
    if (!data.email) {
      throw new AppError("Email is required", 400);
    }

    try {
      await sendEmailNotification({
        type,
        email: data.email,
        firstName: data.firstName,
        link: data.link,
        variables: data.variables,
      });
    } catch (err) {
      console.error("Email error:", err.message);
    }
  }

  return adminNotification;
};

