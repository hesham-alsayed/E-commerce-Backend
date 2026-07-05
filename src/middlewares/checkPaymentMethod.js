const settingsService = require("../services/settingsService");

const checkPaymentMethod = async (req, res, next) => {
  try {
    const settings =
      await settingsService.getSettingByKey("general_settings");

    const method = req.body.paymentMethod;

    if (method === "cash" && settings?.allowCashOrders === false) {
      return res.status(403).json({
        message: "Cash orders are disabled",
      });
    }

    if (method === "paypal" && settings?.allowPaypalOrders === false) {
      return res.status(403).json({
        message: "PayPal orders are disabled",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = checkPaymentMethod;
