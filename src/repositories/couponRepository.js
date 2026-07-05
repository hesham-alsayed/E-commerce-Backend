const couponModel = require("../models/couponModel");

// Get coupon by code (for checkout)
exports.getCouponByCode = async (code) => {
  const coupon = await couponModel.findOne({ code }).populate("partner"); // optional, useful to know partner
  return coupon;
};

// Increment coupon usage (atomic)
exports.incrementUsage = async (couponId, increment = 1) => {
  const coupon = await couponModel.findByIdAndUpdate(
    couponId,
    { $inc: { usedCount: increment } },
    { new: true },
  );
  return coupon;
};

// Create new coupon
exports.createCoupon = async (data) => {
  const coupon = await couponModel.create(data);
  return coupon;
};

// Get all coupons (optionally filter by active)
exports.getAllCoupons = async (filter = {}) => {
  const coupons = await couponModel.find(filter).populate("partner");
  return coupons;
};

// Get coupon by ID
exports.getCouponById = async (id) => {
  const coupon = await couponModel.findById(id).populate("partner");
  return coupon;
};

// Update coupon
exports.updateCoupon = async (id, data) => {
  const coupon = await couponModel.findByIdAndUpdate(id, data, { new: true });
  return coupon;
};

// Delete coupon permanently
exports.deleteCoupon = async (id) => {
  const coupon = await couponModel.findByIdAndDelete(id);
  return coupon;
};

// Soft delete coupon (set active = false)
exports.softDeleteCoupon = async (id) => {
  const coupon = await couponModel.findByIdAndUpdate(
    id,
    { active: false },
    { new: true },
  );
  return coupon;
};

exports.countCouponsByPartner = async (partnerId) => {
  return await couponModel.countDocuments({ partner: partnerId });
};

exports.disableCouponsByPartner = async (partnerId) => {
  const count = await this.countCouponsByPartner(partnerId);

  if (count === 0) {
    return { disabled: 0, message: "No coupons found for this partner" };
  }

  const result = await couponModel.updateMany(
    { partner: partnerId },
    { active: false },
  );

  return { disabled: result.modifiedCount };
};

exports.deleteCouponsByPartner = async (partnerId) => {
  const count = await this.countCouponsByPartner(partnerId);

  if (count === 0) {
    return { deleted: 0, message: "No coupons found for this partner" };
  }

  const result = await couponModel.deleteMany({ partner: partnerId });
  return { deleted: result.deletedCount };
};

exports.getCouponsByPartner = async (partnerId, active = false) => {
  const query = { partner: partnerId };
  if (active) query.active = true;

  const coupons = await couponModel.find(query).sort({ createdAt: -1 });
  return coupons;
};


// ================= COUPON STATS =================
exports.getCouponsStats = async () => {
  const now = new Date();

  const stats = await couponModel.aggregate([
    {
      $group: {
        _id: null,

        totalCoupons: { $sum: 1 },

        // ================= ACTIVE (UNIFIED LOGIC) =================
        totalActiveCoupons: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$active", true] },
                  { $lte: ["$startDate", now] },
                  { $gte: ["$endDate", now] },
                  {
                    $or: [
                      { $eq: ["$usageLimit", 0] },
                      { $lt: ["$usedCount", "$usageLimit"] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },

        totalInactiveCoupons: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$active", false] },
                  { $gt: ["$startDate", now] },
                  { $lt: ["$endDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },

        totalGeneralCoupons: {
          $sum: {
            $cond: [{ $eq: ["$type", "general"] }, 1, 0],
          },
        },

        totalPartnerCoupons: {
          $sum: {
            $cond: [{ $eq: ["$type", "partner"] }, 1, 0],
          },
        },

        totalUsedCount: {
          $sum: { $ifNull: ["$usedCount", 0] },
        },

        totalUnusedCoupons: {
          $sum: {
            $cond: [{ $eq: ["$usedCount", 0] }, 1, 0],
          },
        },

        totalExhaustedCoupons: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$usageLimit", 0] },
                  { $gte: ["$usedCount", "$usageLimit"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalCoupons: 0,
      totalActiveCoupons: 0,
      totalInactiveCoupons: 0,
      totalGeneralCoupons: 0,
      totalPartnerCoupons: 0,
      totalUsedCount: 0,
      totalUnusedCoupons: 0,
      totalExhaustedCoupons: 0,
    }
  );
};