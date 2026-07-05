const userModel = require("../models/userModel");
const mongoose = require("mongoose");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.getUserById = async (id) => {
  if (!isValidId(id)) return null;
  return await userModel.findById(id).select("+password");
};

exports.getUserByEmail = async (email) => {
  return await userModel.findOne({ email }).select("+password");
};
exports.updateUserPassword = async (userId, newPassword) => {
  const user = await userModel.findById(userId);
  if (!user) throw new Error("User not found");

  user.password = newPassword; // pre-save hook هيعمل hash
  user.passwordChangedAt = Date.now();
  user.passwordResetToken = null;
  user.passwordResetExpires = null;

  await user.save();
  return user;
};

exports.setPasswordResetToken = async (userId, resetToken, expires) => {
  const user = await userModel.findByIdAndUpdate(
    userId,
    {
      passwordResetToken: resetToken,
      passwordResetExpires: expires,
    },
    { new: true },
  );
  return user;
};

exports.clearPasswordResetToken = async (userId) => {
  return await userModel.findByIdAndUpdate(
    userId,
    {
      passwordResetToken: null,
      passwordResetExpires: null,
    },
    { new: true },
  );
};

exports.getUserByResetToken = async (hashedToken) => {
  return await userModel.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
};
exports.setEmailVerificationCode = async (email, code, expires) => {
  const user = await userModel.findOne({ email });
  console.log(user);
  if (!user) throw new Error("User not found");
  user.emailVerificationCode = code;
  user.emailVerificationExpires = expires;
  await user.save();
  return user;
};

exports.verifyEmailCode = async (email, code) => {
  const user = await userModel.findOne({
    email,
    emailVerificationCode: code,
    emailVerificationExpires: { $gt: Date.now() },
  });
  console.log("user", user); // null
  if (!user) return null;
  user.isVerified = true;
  user.emailVerificationCode = null;
  user.emailVerificationExpires = null;
  await user.save();
  return user;
};
