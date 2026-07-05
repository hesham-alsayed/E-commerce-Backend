const partnerModel = require("../models/partnerModel");
const couponModel = require("../models/couponModel"); // لازم يكون موجود

// 🔹 Create a new partner
exports.createPartner = async (data) => {
  const partner = await partnerModel.create(data);
  return partner;
};

// 🔹 Get all partners, optionally filter by active status
exports.getAllPartners = async (filter) => {
  const partners = await partnerModel.find(filter);
  return partners;
};

// 🔹 Get partner by ID
exports.getPartnerById = async (id) => {
  const partner = await partnerModel.findById(id);
  return partner;
};

// 🔹 Update partner by ID
exports.updatePartner = async (id, data) => {
  const partner = await partnerModel.findByIdAndUpdate(id, data, { new: true });
  return partner;
};

// Soft delete partner by ID (set active = false)
// Soft Delete
exports.softDeletePartner = async (id) => {
  return await partnerModel.findByIdAndUpdate(
    id,
    { active: false },
    { new: true }
  );
};

// Hard Delete
exports.hardDeletePartner = async (id) => {
  return await partnerModel.findByIdAndDelete(id);
};

// Find partner by email and name
exports.findPartnerByEmail = async (email, name) => {
  const filter = { email };
  if (name) filter.name = name;
  const partner = await partnerModel.findOne(filter);
  return partner;
};

//  Get all coupons of a specific partner
exports.getCouponsByPartner = async (partnerId, active) => {
  const filter = { partner: partnerId };
  if (active !== undefined) filter.active = active;
  const coupons = await couponModel.find(filter);
  return coupons;
};

// Get total usage / stats for a partner
exports.getPartnerCouponStats = async (partnerId) => {
  const coupons = await couponModel.find({ partner: partnerId });

  const totalCoupons = coupons.length;
  const totalUsed = coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0);

  return {
    totalCoupons,
    totalUsed,
    coupons: coupons.map((c) => ({
      id: c._id,
      code: c.code,
      usedCount: c.usedCount || 0,
      discountValue: c.discountValue,
      active: c.active,
    })),
  };
};

// 🔹 Soft delete all coupons of a partner
exports.softDeletePartnerCoupons = async (partnerId) => {
  const result = await couponModel.updateMany(
    { partner: partnerId },
    { active: false },
  );
  return result; // return update info
};

exports.addCommission = async (partnerId, amount) => {
  const partner = await partnerModel.findByIdAndUpdate(
    partnerId,
    {
      $inc: { commission: amount },
    },
    { new: true },
  );
  return partner;
};
