const AppError = require("../../utils/AppError");
const settingsService = require("../services/settingsService");

const normalize = (str) =>
  typeof str === "string" ? str.trim().toLowerCase().replace(/\s+/g, "_") : str;

const checkGeneralSettings = (key = null) => {
  return async (req, res, next) => {
    try {
      let settings;
      try {
        settings =
          await settingsService.getSettingByKey("general_settings");
      } catch {
        settings = null;
      }

      const user = req.user;

      // =========================
      // 1. Admin bypass
      // =========================
      if (user?.role === "admin") {
        return next();
      }

      // =========================
      // 2. Global site control
      // =========================
      if (settings?.enabled === false) {
        return next(new AppError("Site is under maintenance", 503));
      }

      // =========================
      // 3. Feature flag
      // =========================
      if (key && settings) {
        const normalizedKey = normalize(key);

        const feature = settings?.value?.find(
          (item) => normalize(item?.type) === normalizedKey,
        );

        if (feature?.enabled === false) {
          return next(
            new AppError(
              `${key} is not available for use, try again later`,
              403,
            ),
          );
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = checkGeneralSettings;
