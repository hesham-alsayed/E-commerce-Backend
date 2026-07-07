const AppError = require("../../utils/AppError");
const userRepository = require("../repositories/userRepository");
const authRepo = require("../repositories/authRepository");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Email = require("../../utils/Email");
const bcrypt = require("bcrypt");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

exports.signup = async (data) => {
  const { email, password, passwordConfirm } = data;

  if (password !== passwordConfirm)
    throw new AppError("Passwords do not match", 400);

  const existingUser = await authRepo.getUserByEmail(email);
  if (existingUser) throw new AppError("Email already in use", 400);

  const user = await userRepository.createUser(data);
  user.password = undefined;

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000;
  await authRepo.setEmailVerificationCode(email, code, expires);

  setImmediate(() => {
    new Email(user, code).sendEmailVerification()
      .then(() => console.log("Verification email sent to", user.email))
      .catch((err) => console.error("sendEmailVerification error:", err.message));
  });

  return { user, message: "Signup successful. Please verify your email" };
};

exports.login = async (email, password, req) => {
  if (!email || !password) throw new AppError("Email & password required", 400);

  const user = await authRepo.getUserByEmail(email);
  if (!user) throw new AppError("Incorrect email or password", 401);

  if (!user.isVerified)
    throw new AppError("Please verify your email first", 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError("Incorrect email or password", 401);

  user.lastLogin = new Date();
  user.lastLoginIP = req.body.clientIp;
  await user.save();

  const token = signToken(user._id);
  return { token, user };
};

exports.logout = (res) => {
  res.cookie("jwt", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  return { message: "Logged out successfully" };
};

exports.sendEmailVerificationCode = async (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000;

  const user = await authRepo.setEmailVerificationCode(email, code, expires);
  if (!user) throw new AppError("User not found", 404);

  setImmediate(() => {
    new Email(user, code).sendEmailVerification()
      .then(() => console.log("Verification code sent to", user.email))
      .catch((err) => console.error("sendEmailVerificationCode error:", err.message));
  });

  return { message: "Verification code sent to your email" };
};

exports.verifyEmailCode = async (email, code) => {
  const user = await authRepo.verifyEmailCode(email, code);
  if (!user) throw new AppError("Invalid or expired verification code", 400);
  return { user, message: "Email verified successfully" };
};

exports.updatePassword = async (userId, currentPassword, newPassword, passwordConfirm) => {
  if (!currentPassword || !newPassword || !passwordConfirm)
    throw new AppError("All password fields are required", 400);

  if (newPassword !== passwordConfirm)
    throw new AppError("New password and confirm password do not match", 400);

  if (currentPassword === newPassword)
    throw new AppError("Password already used, choose another", 400);

  const user = await authRepo.getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError("Current password is incorrect", 401);

  await authRepo.updateUserPassword(userId, newPassword);
  user.password = undefined;
  return { user, message: "Password updated successfully" };
};

exports.forgotPassword = async (email) => {
  if (!email) throw new AppError("Email is required", 400);

  const user = await authRepo.getUserByEmail(email);
  if (!user) throw new AppError("No user with this email", 404);

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expires = Date.now() + 10 * 60 * 1000;

  await authRepo.setPasswordResetToken(user._id, hashedToken, expires);

  const resetURL = `${process.env.USER_FRONTEND_URL}/reset-password/${resetToken}`;

  setImmediate(() => {
    new Email(user, resetURL).sendPasswordReset()
      .then(() => console.log("Password reset email sent to", user.email))
      .catch((err) => console.error("forgotPassword error:", err.message));
  });

  return { message: "Password reset token sent to your email" };
};

exports.resetPassword = async (token, newPassword, passwordConfirm) => {
  if (!token || !newPassword)
    throw new AppError("Token and password required", 400);
  if (newPassword !== passwordConfirm)
    throw new AppError("Passwords do not match", 400);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await authRepo.getUserByResetToken(hashedToken);
  if (!user) throw new AppError("Token is invalid or expired", 400);

  await authRepo.updateUserPassword(user._id, newPassword);
  await authRepo.clearPasswordResetToken(user._id);

  return { message: "Password has been reset successfully" };
};
