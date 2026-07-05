const mongoose = require("mongoose");
const reviewRepository = require("../repositories/reviewRepository");
const AppError = require("../../utils/AppError");
const productModel = require("../models/productModel");
const reviewModel = require("../models/reviewModel");
const ApiFeatures = require("../middlewares/apiFeature");
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const updateProductRating = async (productId) => {
  if (!isValidId(productId)) {
    throw new AppError("Invalid Product ID", 404);
  }

  const stats = await reviewModel.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  const avgRating = stats[0]?.averageRating || 0;
  const numReviews = stats[0]?.numReviews || 0;

  await productModel.findByIdAndUpdate(productId, {
    averageRating: avgRating,
    numReviews: numReviews,
  });
};

// Delete all reviews of a product
exports.deleteReviewsByProduct = async (productId) => {
  if (!isValidId(productId)) throw new AppError("Invalid product ID", 400);

  await reviewRepository.deleteReviewsByProduct(productId);

  // Reset product ratings
  await updateProductRating(productId);

  return { message: "All reviews for this product have been deleted" };
};
// Delete all reviews by a user
exports.deleteReviewsByUser = async (userId) => {
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);

  const userReviews = await reviewRepository.getReviewsByUser(userId);

  await reviewRepository.deleteReviewsByUser(userId);

  const productIds = [];
  userReviews.forEach((r) => {
    if (r.product && !productIds.includes(r.product.toString())) {
      productIds.push(r.product.toString());
    }
  });

  for (const pid of productIds) {
    await updateProductRating(pid);
  }

  return { message: "All reviews by this user have been deleted" };
};

exports.createReview = async (data) => {
  // ✅ validation
  if (!data.user || !isValidId(data.user)) {
    throw new AppError("User ID is required", 400);
  }

  if (!data.product || !isValidId(data.product)) {
    throw new AppError("Valid product ID is required", 400);
  }

  // ✅ منع duplicate review
  const existingReview = await reviewModel.findOne({
    user: data.user,
    product: data.product,
  });

  if (existingReview) {
    throw new AppError("You already reviewed this product", 400);
  }

  // ✅ create
  const review = await reviewModel.create(data);

  // ✅ update stats
  await updateProductRating(data.product);

  // ✅ populate AFTER everything
  await review.populate([
    { path: "user", select: "_id firstName email" },
    { path: "product", select: "title" },
  ]);

  return review;
};

exports.updateReview = async (reviewId, data) => {
  // 1️⃣ validate id
  if (!isValidId(reviewId)) {
    throw new AppError("Invalid review ID", 400);
  }

  // 2️⃣ update review
  const review = await reviewModel.findByIdAndUpdate(reviewId, data, {
    new: true,
    runValidators: true,
  });

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  await updateProductRating(review.product);

  const populatedReview = await reviewModel.findById(review._id).populate({
    path: "product",
    select: "title price brand material variants averageRating numReviews",
  });

  return populatedReview;
};

// Delete a single review
exports.deleteReview = async (reviewId) => {
  if (!isValidId(reviewId)) throw new AppError("Invalid review ID", 400);

  const review = await reviewRepository.getReviewById(reviewId);
  if (!review) throw new AppError("Review not found", 404);

  await reviewRepository.deleteReview(reviewId);

  await updateProductRating(review.product);

  return { message: "Review deleted successfully" };
};

exports.getReview = async (reviewId) => {
  if (!isValidId(reviewId)) throw new AppError("Invalid review ID", 400);

  const review = await reviewRepository.getReviewById(reviewId);
  if (!review) throw new AppError("Review not found", 404);
  return review;
};

// exports.getAllReviews = async () => {
//   const reviews = await reviewRepository.getAllReviews();
//   return reviews;
// };

exports.getAllReviews = async (queryString) => {
  const page = Number(queryString.page) || 1;
  const limit = Number(queryString.limit) || 10;
  const skip = (page - 1) * limit;

  const search = queryString.search?.trim();
  const rating = queryString.rating;

  const matchStage = {};

  // ================= SEARCH =================
  if (search) {
    matchStage.$or = [
      { comment: { $regex: search, $options: "i" } },
      { "user.firstName": { $regex: search, $options: "i" } },
      { "user.lastName": { $regex: search, $options: "i" } },
      { "product.title": { $regex: search, $options: "i" } },
    ];
  }

  // ================= RATING FILTER =================
  if (rating && rating !== "all") {
    matchStage.rating = Number(rating);
  }

  const pipeline = [
    // JOIN USER
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    // JOIN PRODUCT
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    // APPLY FILTERS
    {
      $match: matchStage,
    },

    // FACET (data + total)
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },

          {
            $project: {
              rating: 1,
              comment: 1,
              createdAt: 1,
              user: {
                firstName: 1,
                lastName: 1,
                avatar: 1,
                email: 1,
              },
              product: {
                title: 1,
                variants: 1,
              },
            },
          },
        ],

        total: [{ $count: "count" }],
      },
    },
  ];

  const result = await reviewModel.aggregate(pipeline);

  const reviews = result[0].data;
  const total = result[0].total[0]?.count || 0;

  return {
    reviews,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

exports.getReviewsByUser = async (userId) => {
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);
  const reviews = await reviewRepository.getReviewsByUser(userId);
  return reviews;
};

exports.getReviewsByProduct = async (productId) => {
  if (!isValidId(productId)) throw new AppError("Invalid product ID", 400);
  const reviews = await reviewRepository.getReviewsByProduct(productId);
  return reviews;
};

exports.getMyReviews = async (userId) => {
  if (!userId) throw new AppError("user id is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);
  const reviews = await reviewRepository.getReviewsByCurrentUser(userId);
  return reviews;
};

exports.getLatestReviews = async (limit) => {
  const reviews = await reviewRepository.getLatestReviews(limit);
  return reviews;
};

const calcGrowth = (current, previous) => {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
};

exports.getReviewsAnalytics = async () => {
  const data = await reviewRepository.getReviewsAnalytics();

  return {
    reviews: {
      ...data.reviews,
      growth: Number(
        calcGrowth(data.reviews.current, data.reviews.previous).toFixed(1),
      ),
    },

    comments: {
      ...data.comments,
      growth: Number(
        calcGrowth(data.comments.current, data.comments.previous).toFixed(1),
      ),
    },

    users: {
      ...data.users,
      growth: Number(
        calcGrowth(data.users.current, data.users.previous).toFixed(1),
      ),
    },

    products: {
      ...data.products,
      growth: Number(
        calcGrowth(data.products.current, data.products.previous).toFixed(1),
      ),
    },
  };
};

exports.getRatingAnalytics = async () => {
  const data = await reviewRepository.getRatingAnalytics();

  const total = data.stats[0]?.total || 0;
  const average = data.stats[0]?.average || 0;

  // نحول distribution إلى map
  const map = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  data.distribution.forEach((item) => {
    map[item._id] = item.count;
  });

  // نحولها array + percent
  const ratings = Object.keys(map)
    .map((star) => {
      const count = map[star];

      return {
        star: Number(star),
        count,
        percent: total === 0 ? 0 : Number(((count / total) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.star - a.star); // 5 → 1

  return {
    totalReviews: total,
    averageRating: Number(average.toFixed(1)),
    ratings,
  };
};

exports.getProductReviewsStats = async (productId) => {
  const stats = await reviewModel.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
      },
    },

    {
      $group: {
        _id: "$product",

        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },

        one: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        two: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        three: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        four: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        five: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },

    {
      $project: {
        _id: 0,
        product: "$_id",
        avgRating: { $round: ["$avgRating", 1] },
        totalReviews: 1,

        ratings: [
          { star: 5, count: "$five" },
          { star: 4, count: "$four" },
          { star: 3, count: "$three" },
          { star: 2, count: "$two" },
          { star: 1, count: "$one" },
        ],
      },
    },
  ]);

  return (
    stats[0] || {
      product: productId,
      avgRating: 0,
      totalReviews: 0,
      ratings: [
        { star: 5, count: 0 },
        { star: 4, count: 0 },
        { star: 3, count: 0 },
        { star: 2, count: 0 },
        { star: 1, count: 0 },
      ],
    }
  );
};
