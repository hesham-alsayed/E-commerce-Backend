// services/partnerService.js
const AppError = require("../../utils/AppError");
const { isValidId } = require("../../utils/helper");
const partnerRepository = require("../repositories/partnerRepository");
const couponRepository = require("../repositories/couponRepository");
const partnerModel = require("../models/partnerModel");
const settingsModel = require("../models/settingsModel");
const mongoose = require("mongoose");
const couponModel = require("../models/couponModel");

exports.createPartner = async (data) => {
  const { name, email } = data;

  if (!email) throw new AppError("Partner Email is required", 400);
  if (!name) throw new AppError("Partner name is required", 400);

  // ================= GET SETTINGS =================
  const settingsDoc = await settingsModel.findOne({
    key: "general_settings",
  });

  const settingsArray = settingsDoc?.value || [];

  const commissionSetting = settingsArray.find(
    (item) => item.type === "partnerCommissionRate",
  );

  // ================= DEFAULT FALLBACK =================
  const defaultCommission = commissionSetting?.value ?? 10;
  console.log(defaultCommission);

  // ================= APPLY COMMISSION =================
  const commissionRate =
    data.commissionRate !== undefined ? data.commissionRate : defaultCommission;

  // ================= FILTER DATA =================
  const filteredData = {
    name,
    email,
    commissionRate,
  };

  // ================= CHECK EXIST =================
  const existPartner = await partnerRepository.findPartnerByEmail(email);

  if (existPartner) {
    throw new AppError("Partner email already exists", 400);
  }

  // ================= CREATE =================
  const partner = await partnerRepository.createPartner(filteredData);

  return partner;
};

exports.getAllPartners = async (active) => {
  // active can be undefined , true , false
  let filter = {};

  if (active !== undefined) {
    // convert string → boolean
    filter.active = active === "true";
  }

  const partners = await partnerRepository.getAllPartners(filter);
  return partners;
};

exports.getAllPartnersWithCountCoupon = async () => {
  const result = await partnerModel.aggregate([
    {
      $lookup: {
        from: "coupons",
        localField: "_id",
        foreignField: "partner",
        as: "coupons",
      },
    },

    {
      $addFields: {
        couponCount: { $size: "$coupons" },
      },
    },

    {
      $project: {
        coupons: 0, // ❌ remove heavy data only
      },
    },
  ]);
  return result;
};
exports.getPartnerById = async (id) => {
  if (!id) throw new AppError("partner id is required", 400);
  if (!isValidId(id)) throw new AppError("Invalid ID Partner", 400);
  const partner = await partnerRepository.getPartnerById(id);
  if (!partner) throw new AppError("Partner not found", 400);
  return partner;
};

exports.updatePartner = async (id, data) => {
  console.log(id, data);

  const partner = await partnerRepository.getPartnerById(id);
  if (!partner) throw new AppError("Partner not found", 404);

  const settings = await settingsModel.findOne({
    key: "general_settings",
  });

  const commissionSetting = settings?.value?.find(
    (i) => i.type === "partnerCommissionRate",
  );

  const defaultRate = commissionSetting?.value ?? 10;

  // ================= UPDATE FIELDS =================
  if (data.name) partner.name = data.name;

  if (data.email) partner.email = data.email;

  if (typeof data.active === "boolean") {
    partner.active = data.active;
  }

  // ================= COMMISSION LOGIC =================
  if (data.commissionRate !== undefined) {
    // custom
    partner.commissionRate = data.commissionRate;
  } else {
    // general fallback
    partner.commissionRate = defaultRate;
  }

  await partner.save();

  return partner;
};

exports.deletePartner = async (id, force = false) => {
  if (!id) throw new AppError("partner id is required", 400);
  if (!isValidId(id)) throw new AppError("Invalid ID Partner", 400);

  const partner = await partnerRepository.getPartnerById(id);
  if (!partner) throw new AppError("Partner not found", 404);

  if (!force && partner.active === false) {
    throw new AppError("Partner already deleted", 400);
  }

  let partnerResult;
  let couponResult;

  if (force) {
    // 🔴 Hard Delete
    couponResult = await couponRepository.deleteCouponsByPartner(id);
    partnerResult = await partnerRepository.hardDeletePartner(id);
  } else {
    // 🟡 Soft Delete
    couponResult = await couponRepository.disableCouponsByPartner(id);
    partnerResult = await partnerRepository.softDeletePartner(id);
  }

  return {
    partner: partnerResult,
    coupons: couponResult,
  };
};

exports.getPartnerDetailsService = async (id) => {
  const result = await partnerModel.aggregate([
    // ================= MATCH PARTNER =================
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
      },
    },

    // ================= GET COUPONS =================
    {
      $lookup: {
        from: "coupons",
        localField: "_id",
        foreignField: "partner",
        as: "coupons",
      },
    },

    // ================= STATS =================
    {
      $addFields: {
        stats: {
          totalCoupons: { $size: "$coupons" },

          activeCoupons: {
            $size: {
              $filter: {
                input: "$coupons",
                as: "c",
                cond: { $eq: ["$$c.active", true] },
              },
            },
          },

          totalUsedCount: {
            $sum: "$coupons.usedCount",
          },

          totalSales: "$totalSales",
          totalEarnings: "$totalEarnings",
        },
      },
    },

    // ================= CLEAN OUTPUT =================
    {
      $project: {
        name: 1,
        email: 1,
        commissionRate: 1,
        active: 1,
        totalSales: 1,
        totalEarnings: 1,
        coupons: 1,
        stats: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!result.length) {
    throw new Error("Partner not found");
  }
  return result[0];
};

exports.addPartnerCommission = async (order, oldPaymentStatus) => {
  const becamePaid =
    oldPaymentStatus !== "paid" && order.paymentStatus === "paid";

  if (!order || !becamePaid || !order.coupon || order.partnerCommissionAdded) {
    return;
  }

  const coupon = await couponModel.findById(order.coupon).populate("partner");

  if (!coupon?.partner) return;

  const commissionBase = order.totalPriceAfterDiscount || order.totalPrice;

  const commission = (commissionBase * coupon.partner.commissionRate) / 100;

  await partnerModel.findByIdAndUpdate(coupon.partner._id, {
    $inc: {
      totalSales: commissionBase,
      totalEarnings: commission,
      totalOrders: 1,
    },
  });

  order.partnerCommissionAdded = true;

  await order.save();
};
