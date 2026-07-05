// repositories/review.repository.js
const reviewModel = require("../models/reviewModel");

exports.createReview = async (data) => {
  const review = await reviewModel.create(data);

  // populate user with specific fields and product with title only
  await review.populate([
    { path: "user", select: "_id firstName email" },
    { path: "product", select: "title" },
  ]);

  return review;
};

exports.deleteReviewsByProduct = async (productId) => {
  return await reviewModel.deleteMany({ product: productId });
};

exports.deleteReviewsByUser = async (userId) => {
  return await reviewModel.deleteMany({ user: userId });
};
exports.updateReview = async (reviewId, data) => {
  const updatedReview = await reviewModel
    .findByIdAndUpdate(reviewId, data, {
      new: true,
      runValidators: true,
    })
    .populate({
      path: "product",
      select: "title price brand material variants",
    });

  return updatedReview;
};
exports.getReviewById = async (reviewId) => {
  const review = await reviewModel
    .findById(reviewId)
    .populate("user", "firstName lastName avatar")
    .populate("product", "title price");
  return review;
};

exports.getAllReviews = async () => {
  const reviews = await reviewModel
    .find()
    .populate("user", "firstName lastName avatar email")
    .populate("product", "title price");
  return reviews;
};

exports.getReviewsByUser = async (userId) => {
  const reviews = await reviewModel
    .find({ user: userId })
    .populate("product", "title price");
  return reviews;
};

exports.getReviewsByProduct = async (productId) => {
  const reviews = await reviewModel
    .find({ product: productId })
    .populate("user", "firstName lastName avatar");
  return reviews;
};

exports.deleteReview = async (reviewId) => {
  const review = await reviewModel.findByIdAndDelete(reviewId);
  return review;
};

exports.getReviewsByCurrentUser = async (userId) =>
  reviewModel
    .find({ user: userId })
    .populate("product", "title price variants brand material")
    .sort({ createdAt: -1 });

exports.getLatestReviews = async (limit) => {
  const reviews = await reviewModel
    .find()
    .populate("user", "firstName lastName avatar")
    .populate("product", "title price")
    .sort({ createdAt: -1 })
    .limit(limit);

  return reviews;
};

exports.getReviewsAnalytics = async () => {
  const now = new Date();

  const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const result = await reviewModel.aggregate([
    {
      $facet: {
        // REVIEWS
        reviewsCurrent: [
          { $match: { createdAt: { $gte: startCurrentMonth } } },
          { $count: "count" },
        ],
        reviewsPrev: [
          {
            $match: {
              createdAt: {
                $gte: startPrevMonth,
                $lt: startCurrentMonth,
              },
            },
          },
          { $count: "count" },
        ],
        reviewsTotal: [{ $count: "count" }],

        // COMMENTS
        commentsCurrent: [
          {
            $match: {
              createdAt: { $gte: startCurrentMonth },
              comment: { $exists: true, $ne: "" },
            },
          },
          { $count: "count" },
        ],
        commentsPrev: [
          {
            $match: {
              createdAt: {
                $gte: startPrevMonth,
                $lt: startCurrentMonth,
              },
              comment: { $exists: true, $ne: "" },
            },
          },
          { $count: "count" },
        ],

        // USERS
        usersCurrent: [
          { $match: { createdAt: { $gte: startCurrentMonth } } },
          { $group: { _id: "$user" } },
          { $count: "count" },
        ],
        usersPrev: [
          {
            $match: {
              createdAt: {
                $gte: startPrevMonth,
                $lt: startCurrentMonth,
              },
            },
          },
          { $group: { _id: "$user" } },
          { $count: "count" },
        ],

        // PRODUCTS
        productsCurrent: [
          { $match: { createdAt: { $gte: startCurrentMonth } } },
          { $group: { _id: "$product" } },
          { $count: "count" },
        ],
        productsPrev: [
          {
            $match: {
              createdAt: {
                $gte: startPrevMonth,
                $lt: startCurrentMonth,
              },
            },
          },
          { $group: { _id: "$product" } },
          { $count: "count" },
        ],
      },
    },

    {
      $project: {
        reviews: {
          total: { $ifNull: [{ $arrayElemAt: ["$reviewsTotal.count", 0] }, 0] },
          current: {
            $ifNull: [{ $arrayElemAt: ["$reviewsCurrent.count", 0] }, 0],
          },
          previous: {
            $ifNull: [{ $arrayElemAt: ["$reviewsPrev.count", 0] }, 0],
          },
        },

        comments: {
          current: {
            $ifNull: [{ $arrayElemAt: ["$commentsCurrent.count", 0] }, 0],
          },
          previous: {
            $ifNull: [{ $arrayElemAt: ["$commentsPrev.count", 0] }, 0],
          },
        },

        users: {
          current: {
            $ifNull: [{ $arrayElemAt: ["$usersCurrent.count", 0] }, 0],
          },
          previous: { $ifNull: [{ $arrayElemAt: ["$usersPrev.count", 0] }, 0] },
        },

        products: {
          current: {
            $ifNull: [{ $arrayElemAt: ["$productsCurrent.count", 0] }, 0],
          },
          previous: {
            $ifNull: [{ $arrayElemAt: ["$productsPrev.count", 0] }, 0],
          },
        },
      },
    },
  ]);

  return result[0];
};

exports.getRatingAnalytics = async () => {
  const result = await reviewModel.aggregate([
    {
      $facet: {
        distribution: [
          {
            $group: {
              _id: "$rating",
              count: { $sum: 1 },
            },
          },
        ],

        stats: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              average: { $avg: "$rating" },
            },
          },
        ],
      },
    },
  ]);

  return result[0];
};
