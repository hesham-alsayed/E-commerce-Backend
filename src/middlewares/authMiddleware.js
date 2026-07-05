const jwt = require("jsonwebtoken");
const AppError = require("../../utils/AppError");
const userModel = require("../models/userModel");

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // ❌ مهم جدًا: لازم response مش return ساكت
    if (!token) {
      return next(new AppError("Not authenticated", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await userModel.findById(decoded.id);

    if (!currentUser) {
      return next(
        new AppError("User no longer exists. Please login again.", 401),
      );
    }

    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(
        currentUser.passwordChangedAt.getTime() / 1000,
        10,
      );

      if (decoded.iat < changedTimestamp) {
        return next(new AppError("Password changed. Please login again.", 401));
      }
    }

    req.user = currentUser;
    next();
  } catch (err) {
    return next(new AppError("Authentication failed", 401));
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles = ['admin', 'user']

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }

    next();
  };
};
