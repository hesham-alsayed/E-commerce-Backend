const couponRepository = require("../repositories/couponRepository");
const couponModel = require("../models/couponModel");

const partnerModel = require("../models/partnerModel");
const partnerRepository = require("../repositories/partnerRepository");
const mongoose = require("mongoose");
const AppError = require("../../utils/AppError");

// Helper: validate ID
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// 🔹 Create new coupon with validation
exports.createCoupon = async (data) => {
  // Allowed fields only (whitelist)
  const allowedFields = [
    "code",
    "type",
    "partner",
    "discountType",
    "discountValue",
    "minPurchase",
    "startDate",
    "endDate",
    "usageLimit",
    "active",
  ];

  const filteredData = {};
  Object.keys(data).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredData[key] = data[key];
    }
  });

  //  Normalize code
  if (!filteredData.code) throw new AppError("Coupon code is required", 400);
  filteredData.code = filteredData.code.trim().toUpperCase();

  //  Default type
  if (!filteredData.type) filteredData.type = "general";

  //  Partner validation
  if (filteredData.type === "partner") {
    if (!filteredData.partner) {
      throw new AppError("Partner coupon must have a partner assigned", 400);
    }

    const partnerExists = await partnerModel.findById(filteredData.partner);
    if (!partnerExists) throw new AppError("Invalid partner ID", 400);
  } else {
    delete filteredData.partner;
  }

  //  discount validation
  if (!["percentage", "fixed"].includes(filteredData.discountType)) {
    throw new AppError(
      "Invalid discountType, must be 'percentage' or 'fixed'",
      400,
    );
  }

  if (!filteredData.discountValue || filteredData.discountValue <= 0) {
    throw new AppError("Discount value must be greater than 0", 400);
  }

  if (
    filteredData.discountType === "percentage" &&
    filteredData.discountValue > 100
  ) {
    throw new AppError("Percentage discount cannot exceed 100%", 400);
  }

  //  Dates validation
  if (!filteredData.startDate || !filteredData.endDate) {
    throw new AppError("Start and end dates are required", 400);
  }

  if (new Date(filteredData.startDate) >= new Date(filteredData.endDate)) {
    throw new AppError("End date must be after start date", 400);
  }

  if (!filteredData.minPurchase || filteredData.minPurchase < 0) {
    filteredData.minPurchase = 0;
  }

  if (!filteredData.usageLimit) {
    filteredData.usageLimit = 0; // unlimited
  }

  if (filteredData.active === undefined) {
    filteredData.active = true;
  }

  const coupon = await couponRepository.createCoupon(filteredData);
  return coupon;
};

// 🔹 Get all coupons
exports.getAllCoupons = async (active) => {
  let filter = {};
  if (active !== undefined) filter.active = active;
  const coupons = await couponRepository.getAllCoupons(filter);
  return coupons;
};

// 🔹 Get coupon by ID with validation
exports.getCouponById = async (id) => {
  if (!id) throw new AppError("Coupon ID is Required", 400);
  if (!isValidId(id)) throw new Error("Invalid coupon ID");
  const coupon = await couponRepository.getCouponById(id);
  if (!coupon) throw new Error("Coupon not found");
  return coupon;
};

// 🔹 Get coupon by code (for checkout)
exports.getCouponByCode = async (code) => {
  if (!code) throw new Error("Coupon code is required");
  const coupon = await couponRepository.getCouponByCode(code);
  if (!coupon) throw new Error("Coupon not found");

  // Check if coupon is active
  const now = new Date();
  if (!coupon.active) throw new Error("Coupon is not active");
  if (now < coupon.startDate) throw new Error("Coupon is not yet valid");
  if (now > coupon.endDate) throw new Error("Coupon expired");
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }

  return coupon;
};

// 🔹 Update coupon
exports.updateCoupon = async (id, data) => {
  if (!id) throw new AppError("Coupon ID is Required", 400);
  if (!isValidId(id)) throw new Error("Invalid coupon ID");

  // Filter data to only allow certain fields
  // Fields allowed to update
  const allowedFields = [
    "discountType",
    "discountValue",
    "minPurchase",
    "startDate",
    "endDate",
    "usageLimit",
    "active",
  ];
  const updateData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No valid fields to update");
  }

  const coupon = await couponRepository.updateCoupon(id, updateData);
  if (!coupon) throw new Error("Coupon not found or cannot update");

  return coupon;
};

// 🔹 Delete coupon permanently
exports.deleteCoupon = async (id) => {
  if (!id) throw new AppError("Coupon ID is Required", 400);

  if (!isValidId(id)) throw new Error("Invalid coupon ID");
  const coupon = await couponRepository.deleteCoupon(id);
  if (!coupon) throw new Error("Coupon not found or cannot delete");
  return coupon;
};

// 🔹 Soft delete coupon (set active = false)
exports.softDeleteCoupon = async (id) => {
  if (!id) throw new AppError("Coupon ID is Required", 400);

  if (!isValidId(id)) throw new Error("Invalid coupon ID");

  const coupon = await couponRepository.softDeleteCoupon(id);
  if (!coupon) throw new Error("Coupon not found or already inactive");
  return coupon;
};

// 🔹 Increment coupon usage safely
exports.incrementUsage = async (couponId, increment = 1) => {
  if (!couponId) throw new AppError("Coupon ID is Required", 400);

  if (!isValidId(couponId)) throw new Error("Invalid coupon ID");
  if (increment <= 0) throw new Error("Increment must be positive");

  const coupon = await couponModel.findByIdAndUpdate(
    couponId,
    { $inc: { usedCount: increment } },
    { new: true },
  );
  if (!coupon) throw new Error("Coupon not found");
  return coupon;
};

exports.getCouponsByPartner = async (partnerId, active = false) => {
  if (!partnerId) throw new AppError("Partner ID is required", 400);
  if (!isValidId(partnerId)) throw new AppError("Invalid Partner ID", 400);
  const existPartner = await partnerRepository.getPartnerById(partnerId);
  if (!existPartner) throw new AppError("partner not exist", 400);
  const coupons = await couponRepository.getCouponsByPartner(partnerId, active);
  return coupons;
};

exports.getCouponsStats = async () => {
  const stats = await couponRepository.getCouponsStats();

  return {
    totalCoupons: stats.totalCoupons,
    totalActiveCoupons: stats.totalActiveCoupons,
    totalInactiveCoupons: stats.totalInactiveCoupons,
    totalGeneralCoupons: stats.totalGeneralCoupons,
    totalPartnerCoupons: stats.totalPartnerCoupons,
    totalUsedCount: stats.totalUsedCount,
    totalUnusedCoupons: stats.totalUnusedCoupons,
    totalExhaustedCoupons: stats.totalExhaustedCoupons,
  };
};
