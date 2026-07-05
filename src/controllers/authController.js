const { sendNotification } = require("../core/notificationManager");
const notificationTemplates = require("../core/notificationTemplates");
const authService = require("../services/authService");

exports.signup = async (req, res, next) => {
  try {
    const { user, message } = await authService.signup(req.body);
    await sendNotification("new_user_signup", {
      userId: user._id,
      firstName: user.firstName,
      email: user.email,
      title: "New User Registered",
      message: "A new user has just signed up.",
      target: "admin",
    });
    res.status(201).json({ status: "success", message, data: { user } });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const getClientIp = () => {
      return (
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress ||
        req.ip
      );
    };
    req.body.clientIp = getClientIp();
    console.log(req.body.clientIp, "IP");

    const { token, user } = await authService.login(email, password, req);

    // save token in cookie
    const isDev = process.env.NODE_ENV === "development";

    res.cookie("token", token, {
      httpOnly: true,
      secure: !isDev, // 🔥 مهم في production
      sameSite: isDev ? "lax" : "none", // 🔥 مهم cross-site (Vercel ↔ Render)
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // ❗ مهم: امسح الباسورد
    user.password = undefined;

    res.status(200).json({
      status: "success",
      message: "user login successfully",
      user, // 🔥 أهم سطر
    });
  } catch (err) {
    next(err);
  }
};
exports.logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

exports.updatePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(req.user);
    console.log(req.body);

    const { currentPassword, newPassword, passwordConfirm } = req.body;
    const result = await authService.updatePassword(
      userId,
      currentPassword,
      newPassword,
      passwordConfirm,
    );
    const { user, message } = result;

    const baseURL = process.env.BASE_URL;
    await sendNotification("password_changed", {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      link: `${baseURL}/profile/security`,
    });

    res.status(200).json({
      status: "success",
      message: "password updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;
    const result = await authService.resetPassword(
      token,
      password,
      passwordConfirm,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.sendEmailCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.sendEmailVerificationCode(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.verifyEmailCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyEmailCode(email, code);
    const { user, message } = result;
    // "userName", "dashboardUrl", "appName"
    const baseURL = process.env.BASE_URL;
    const variables = {
      userName: `${user.firstName} ${user.lastName} `,
      dashboardUrl: `${baseURL}/authentication/auth-login`,
      appName: "Goalify",
      year: new Date().getFullYear(),
    };
    // channel [user , email]
    await sendNotification("email_verified", {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      link: `${baseURL}/profile`,
      variables,
    });

    res.status(200).json(message);
  } catch (err) {
    next(err);
  }
};
 