const notificationTemplates = require("../src/core/notificationTemplates");
const settingsModel = require("../src/models/settingsModel");
const Email = require("./Email");
const notificationRepository = require("../src/repositories/notificationRepository");
const AppError = require("./AppError");

// =========================
// GET SETTINGS
// =========================
const getNotificationSetting = async (type) => {
  const settings = await settingsModel.findOne({
    key: "notifications_settings",
    enabled: true,
  });

  if (!settings) return null;

  return (
    settings.value.find((item) => item.type === type && item.enabled) || null
  );
};

// =========================
// CHANNEL CHECK
// =========================
const hasChannel = (setting, channel) => {
  return setting?.channel?.includes(channel);
};

// =========================
// VALIDATE EMAIL TEMPLATE ONLY
// =========================
const validateTemplateVariables = (config, variables = {}) => {
  const missing = config.requiredVariables.filter(
    (v) => variables[v] === undefined,
  );

  if (missing.length) {
    throw new AppError(`Missing variables: ${missing.join(", ")}`, 400);
  }
};

// =========================
// EMAIL (USER ONLY)
// =========================
const sendEmailNotification = async ({
  type,
  email,
  firstName,
  link,
  variables,
}) => {
  const config = notificationTemplates[type];

  if (!config) {
    throw new AppError(`Template not found: ${type}`, 500);
  }

  validateTemplateVariables(config, variables);

  const mail = new Email({ email, firstName }, link || "", variables || {});

  await mail.send(config.template, config.subject);
};

// =========================
// ADMIN NOTIFICATION (NO TEMPLATE)
// =========================
const createAdminNotification = async ({ type, userId, message, link }) => {
  return await notificationRepository.create({
    type,
    title: "New system notification",
    message,
    target: "admin",
    user: userId || null,
    link: link || "",
  });
};

const buildAdminMessage = (type, data = {}) => {
  const {
    order,
    orderId,
    orderNumber,

    firstName = "",
    lastName = "",

    user,
    coupon,
    product,
    oldStatus,
    newStatus,
  } = data;

  const fullName = `${firstName} ${lastName}`.trim() || "User";

  const finalOrderNumber =
    orderNumber || order?.orderNumber || orderId || order?._id;

  const productName = product?.name;

  switch (type) {
    case "order_updated": {
      const statusMessages = {
        pending_processing: `🛠️ ${fullName}'s order #${orderNumber} is now being processed`,
        processing_shipped: `🚚 ${fullName}'s order #${orderNumber} has been shipped`,
        shipped_delivered: `📦 ${fullName}'s order #${orderNumber} delivered successfully`,
      };

      const key = `${oldStatus}_${newStatus}`;

      return (
        statusMessages[key] ||
        `✏️ ${fullName}'s order #${orderNumber} status changed from ${oldStatus} to ${newStatus}`
      );
    }

    // =========================
    // ORDER CANCELLED (SEPARATE CASE)
    // =========================
    case "order_cancelled":
      return `❌ ${fullName}'s order #${orderNumber} has been cancelled`;

    // =========================
    // USERS
    // =========================
    case "new_user_signup":
      return `👤 New user signed up (User ID: ${userId})`;

    case "welcome_new_user":
      return `🎉 New user joined platform (User ID: ${userId})`;

    // =========================
    // REVIEWS / PRODUCTS
    // =========================
    case "review_received":
      return `⭐ New review received for ${productName || "product"}`;

    case "coupon_applied":
      return `🏷️ Coupon ${coupon || "N/A"} applied successfully`;

    // =========================
    // ACCOUNT EVENTS
    // =========================
    case "password_changed":
      return `🔐 User ${userId} changed password`;

    case "profile_updated":
      return `✏️ User ${userId} updated profile`;

    case "account_deleted":
      return `🗑️ User ${userId} deleted account`;

    // =========================
    // DEFAULT
    // =========================
    default:
      return `📢 ${type} event occurred`;
  }
};

module.exports = {
  getNotificationSetting,
  hasChannel,
  sendEmailNotification,
  createAdminNotification,
  buildAdminMessage,
};
