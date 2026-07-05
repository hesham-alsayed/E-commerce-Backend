const AppError = require("../../utils/AppError");
const settingsService = require("../services/settingsService");

const normalize = (str) =>
  typeof str === "string" ? str.trim().toLowerCase().replace(/\s+/g, "_") : str;

const checkGeneralSettings = (key = null) => {
  return async (req, res, next) => {
    try {
      const settings =
        await settingsService.getSettingByKey("general_settings");

      const user = req.user;

      console.log(settings, "general settings in middleware");

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
      // 3. Feature flag (ARRAY FIX)
      // =========================
      if (key) {
        const normalizedKey = normalize(key);

        const feature = settings?.value?.find(
          (item) => normalize(item?.type) === normalizedKey,
        );

        console.log("feature found:", feature);

        if (!feature) {
          return next(new AppError(`${key} feature is not configured`, 404));
        }

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
