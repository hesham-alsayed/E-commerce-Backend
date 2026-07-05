const { sendNotification } = require("../core/notificationManager");
const ApiFeatures = require("../middlewares/apiFeature");
const reviewModel = require("../models/reviewModel");
const reviewService = require("../services/reviewService");

exports.createReview = async (req, res, next) => {
  try {
    req.body.user = req.user._id;

    const review = await reviewService.createReview(req.body);

    await sendNotification("review_received", {
      userId: review.user._id,
      title: "New Product Review",
      message: `User ${review.user.firstName} reviewed ${review.product.title}`,
    });

    res.status(201).json({
      status: "success",
      review,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(id, "review id");

    const review = await reviewService.updateReview(id, req.body);
    res.status(200).json({
      status: "success",
      review,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReview = async (req, res, next) => {
  try {
    const review = await reviewService.getReview(req.params.id);
    res.status(200).json({
      status: "success",
      data: review,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    console.log(req.params);

    await reviewService.deleteReview(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getAllReviews(req.query);

    res.status(200).json({
      status: "success",
      result: data.reviews.length,
      pagination: data.pagination,
      reviews: data.reviews,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReviewsByUser = async (req, res, next) => {
  try {
    const reviews = await reviewService.getReviewsByUser(req.params.userId);
    res.status(200).json({
      status: "success",
      data: reviews,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReviewsByProduct = async (req, res, next) => {
  try {
    const reviews = await reviewService.getReviewsByProduct(
      req.params.productId,
    );
    res.status(200).json({
      status: "success",
      data: reviews,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getMyReviews(req.user._id);
    res.status(200).json({
      status: "success",
      results: reviews.length,
      reviews,
    });
  } catch (err) {
    next(err);
  }
};
exports.getLatestReviews = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    console.log(limit);

    const reviews = await reviewService.getLatestReviews(limit);
    res.status(200).json({
      status: "success",
      results: reviews.length,
      data: reviews,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteReviewsByProduct = async (req, res, next) => {
  try {
    const result = await reviewService.deleteReviewsByProduct(
      req.params.productId,
    );
    res.status(200).json({ status: "success", ...result });
  } catch (err) {
    next(err);
  }
};

exports.deleteReviewsByUser = async (req, res, next) => {
  try {
    const result = await reviewService.deleteReviewsByUser(req.params.userId);
    res.status(200).json({ status: "success", ...result });
  } catch (err) {
    next(err);
  }
};

// first analytics
exports.getReviewsAnalytics = async (req, res, next) => {
  try {
    const data = await reviewService.getReviewsAnalytics();
    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// 2 analytics
exports.getRatingAnalytics = async (req, res, next) => {
  try {
    const data = await reviewService.getRatingAnalytics();

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    nest(error);
  }
};
