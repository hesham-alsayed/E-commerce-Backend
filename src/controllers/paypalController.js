const AppError = require("../../utils/AppError");
const paypalService = require("../services/paypalService");
const cartService = require("../services/cartService");

exports.capture = async (req, res, next) => {
  try {
    const { paypalOrderId } = req.body;

    if (!paypalOrderId) {
      return res.status(400).json({
        message: "paypalOrderId required",
      });
    }

    const order = await paypalService.capturePayment(paypalOrderId);

    res.status(200).json({
      status: "success",
      order,
    });
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { token } = req.query;
    console.log(token);

    const order = await paypalService.cancelPayment(token);

    res.status(200).json({
      status: "cancelled",
      message: "Payment cancelled",

      data: order,
    });
  } catch (err) {
    next(err);
  }
};
