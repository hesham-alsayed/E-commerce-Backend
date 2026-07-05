const ApiFeatures = require("../middlewares/apiFeature");
const couponModel = require("../models/couponModel");
const partnerModel = require("../models/partnerModel");
const partnerService = require("../services/partnerService");

// 🔹 Create Partner
exports.createPartner = async (req, res, next) => {
  try {
    const partner = await partnerService.createPartner(req.body);

    res.status(201).json({
      status: "success",
      message: "Partner created successfully",
      data: {
        partner,
      },
    });
  } catch (err) {
    next(err);
  }
};

// // 🔹 Get all Partners
// exports.getAllPartners = async (req, res, next) => {
//   try {
//     const baseQuery = partnerModel.find();

//     const features = new ApiFeatures(baseQuery, req.query)
//       .filter()
//       .search(["name", "email"])
//       .sort();

//     // clone BEFORE pagination
//     const countQuery = partnerModel.find(
//       new ApiFeatures(partnerModel.find(), req.query)
//         .filter()
//         .search(["name", "email"])
//         .query.getFilter(),
//     );

//     const count = await countQuery.countDocuments();

//     features.paginate(count);

//     const partners = await features.query;

//     res.status(200).json({
//       status: "success",
//       results: partners.length,
//       pagination: features.paginationResult,
//       partners,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

exports.getAllPartners = async (req, res, next) => {
  try {
    const searchFields = ["name", "email"];
    let features = new ApiFeatures(partnerModel.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .search(searchFields);

    // count documents after filter
    const count = await features.query.clone().countDocuments();
    const partnerCoupons = await couponModel.find({
      type: "partner",
    });
    console.log(partnerCoupons);
    
    // apply pagination
    features = features.paginate(count);
    const partners = await features.query;
    res.status(200).json({
      status: "success",
      result: partners?.length,
      pagination: features.paginationResult,
      totalCoupons: partnerCoupons.length,
      partners: partners,
    });
  } catch (error) {
    next(error);
  }
};
exports.getPartnersWithCouponCount = async (req, res, next) => {
  try {
    const partners = await partnerService.getAllPartnersWithCountCoupon();
    res.status(200).json({
      status: "success",
      results: partners.length,
      partners,
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Get Partner by ID
exports.getPartnerById = async (req, res, next) => {
  try {
    const partner = await partnerService.getPartnerById(req.params.id);

    res.status(200).json({
      status: "success",
      partner,
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Update Partner
exports.updatePartner = async (req, res, next) => {
  try {
    const partner = await partnerService.updatePartner(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      message: "Partner updated successfully",
      partner,
    });
    console.log("success");
  } catch (err) {
    console.log("fail");

    next(err);
  }
};

// 🔹 Delete Partner
exports.deletePartner = async (req, res, next) => {
  try {
    let { force } = req.query;

    force = force === "true";

    const result = await partnerService.deletePartner(req.params.id, force);

    res.status(200).json({
      status: "success",
      result,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPartnerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await partnerService.getPartnerDetailsService(id);

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};
