const { sendNotification } = require("../core/notificationManager");
const ApiFeatures = require("../middlewares/apiFeature");
const couponModel = require("../models/couponModel");
const couponService = require("../services/couponService");

// 🔹 Create new coupon
exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json({
      status: "success",
      coupon,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllCoupons = async (req, res, next) => {
  try {
    const searchFields = ["code"];

    // 1. base query
    const baseQuery = couponModel.find();

    // 2. build features WITHOUT pagination first
    let features = new ApiFeatures(baseQuery, req.query)
      .filter()
      .sort()
      .limitFields()
      .search(searchFields);

    // 3. count BEFORE pagination
    const count = await couponModel.countDocuments(features.query.getFilter());

    // 4. paginate AFTER count
    features = features.paginate(count);

    // ================= PARALLEL FETCH =================
    const [couponsData, stats] = await Promise.all([
      features.query,
      couponService.getCouponsStats(),
    ]);

    // ================= RESPONSE =================
    res.status(200).json({
      status: "success",
      result: couponsData?.length,
      pagination: features.paginationResult,

      coupons: {
        couponsData,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 🔹 Get coupon by ID
exports.getCouponById = async (req, res, next) => {
  try {
    const coupon = await couponService.getCouponById(req.params.id);

    res.status(200).json({
      status: "success",
      coupon,
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Get coupon by code
exports.getCouponByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const coupon = await couponService.getCouponByCode(code);

    res.status(200).json({
      status: "success",
      coupon,
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Update coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    const updated = await couponService.updateCoupon(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      coupon: updated,
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Delete coupon permanently
exports.deleteCoupon = async (req, res, next) => {
  try {
    await couponService.deleteCoupon(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Soft delete coupon
exports.softDeleteCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.softDeleteCoupon(req.params.id);

    res.status(200).json({
      status: "success",
      message: "Coupon soft deleted",
      coupon,
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Increment coupon usage
exports.incrementUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { increment = 1 } = req.body;

    const coupon = await couponService.incrementUsage(id, increment);

    res.status(200).json({
      status: "success",
      message: "Usage updated",
      coupon,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCouponsByPartner = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const { active } = req.query;

    const coupons = await couponService.getCouponsByPartner(
      partnerId,
      active === "true",
    );

    res.status(200).json({
      status: "success",
      results: coupons.length,
      coupons,
    });
  } catch (err) {
    next(err);
  }
};
