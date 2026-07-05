const {
  normalizeQuery,
  normalizeCustomerQuery,
} = require("../../utils/helper");
const { sendNotification } = require("../core/notificationManager");
const ApiFeatures = require("../middlewares/apiFeature");
const userModel = require("../models/userModel");
const userService = require("../services/userService");

exports.changeUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    console.log(userId, role, "change role data");
    const updatedUser = await userService.changeUserRole(userId, role);

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await userService.getMe(req.user._id);

    res.status(200).json({
      status: "success",
      user,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateMe(req.user._id, req.body);
    await sendNotification("profile_updated", {
      userId: user._id,
      title: "Profile Updated", // العنوان اللي يظهر في الإشعار
      message: "Your profile has been successfully updated", // الرسالة في الإشعار
      target: "user", // user → يبعت إشعار للمستخدم
    });
    res.status(200).json({
      status: "success",
      user,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteMe = async (req, res, next) => {
  try {
    const user = await userService.deleteMe(req.user._id);
    console.log(user);
    await sendNotification("account_deleted", {
      userId: user._id,
      firstName: user.firstName,
      email: user.email,
      title: "User Account Deleted ",
      message: `User ${user._id} account has been successfully deleted`,
      target: "admin",
      variables: {
        userName: user.firstName,
        appName: "Goalify",
        year: new Date().getFullYear(),
      },
    });
    res.status(200).json({
      status: "success",
      user,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    console.log("QUERY:", req.query);
    console.log(req.query, "query");

    const searchFields = ["firstName", "lastName", "email"];

    let features = new ApiFeatures(userModel.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .search(searchFields);

    const count = await userModel.countDocuments();

    console.log("COUNT OK");

    features = features.paginate(count);

    const usersData = await features.query;
    const usersRoleStats = await userService.getUsersRoleStats();
    res.status(200).json({
      status: "success",
      result: usersData.length,
      pagination: features.paginationResult,
      data: {
        users: usersData,
        stats: usersRoleStats,
      },
    });
  } catch (error) {
    console.error("ERROR:", error); // 🔥 مهم
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id);

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    console.log(req.body, "create user data");
    const user = await userService.createUser(req.body);
    console.log(user, "created user");
    res.status(201).json({
      status: "success",
      message: "User created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};
exports.updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      user,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.addToWishlist = async (req, res, next) => {
  try {
    const wishlist = await userService.addToWishlist(
      req.user._id,
      req.body.productId,
    );

    res.status(200).json({
      status: "success",
      results: wishlist.length,
      data: wishlist,
    });
  } catch (err) {
    next(err);
  }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const wishlist = await userService.removeFromWishlist(
      req.user._id,
      req.params.productId,
    );

    res.status(200).json({
      status: "success",
      results: wishlist.length,
      data: wishlist,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ get
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await userService.getWishlist(req.user._id);

    res.status(200).json({
      status: "success",
      results: wishlist.length,
      data: wishlist,
    });
  } catch (err) {
    next(err);
  }
};

//  handle Addresses

// 🔹 User
exports.getMyAddresses = async (req, res, next) => {
  try {
    console.log(req.user._id, "useID");
    const addresses = await userService.getMyAddresses(req.user._id);
    res
      .status(200)
      .json({ status: "success", results: addresses.length, data: addresses });
  } catch (err) {
    next(err);
  }
};

exports.addMyAddress = async (req, res, next) => {
  try {
    console.log(req.user._id, "create");

    const addresses = await userService.addMyAddress(req.user._id, req.body);
    console.log(addresses, "addresses create");
    res
      .status(201)
      .json({ status: "success", result: addresses.length, data: addresses });
  } catch (err) {
    next(err);
  }
};

exports.updateMyAddress = async (req, res, next) => {
  try {
    const addresses = await userService.updateMyAddress(
      req.user._id,
      req.params.addressId,
      req.body,
    );
    res.status(200).json({ status: "success", data: addresses });
  } catch (err) {
    next(err);
  }
};

exports.deleteMyAddress = async (req, res, next) => {
  try {
    const addresses = await userService.deleteMyAddress(
      req.user._id,
      req.params.addressId,
    );
    res.status(200).json({ status: "success", data: addresses });
  } catch (err) {
    next(err);
  }
};

// 🔹 Admin
exports.getUserAddresses = async (req, res, next) => {
  try {
    const addresses = await userService.getUserAddresses(req.params.userId);
    res.status(200).json({ status: "success", data: addresses });
  } catch (err) {
    next(err);
  }
};

exports.addUserAddress = async (req, res, next) => {
  try {
    const addresses = await userService.addUserAddress(
      req.params.userId,
      req.body,
    );
    res.status(201).json({ status: "success", data: addresses });
  } catch (err) {
    next(err);
  }
};

exports.updateUserAddress = async (req, res, next) => {
  try {
    const addresses = await userService.updateUserAddress(
      req.params.userId,
      req.params.addressId,
      req.body,
    );
    res.status(200).json({ status: "success", data: addresses });
  } catch (err) {
    next(err);
  }
};

exports.deleteUserAddress = async (req, res, next) => {
  try {
    const addresses = await userService.deleteUserAddress(
      req.params.userId,
      req.params.addressId,
    );
    res.status(200).json({ status: "success", data: addresses });
  } catch (err) {
    next(err);
  }
};

exports.getAllCustomersSummary = async (req, res, next) => {
  try {
    console.log(req.query, "query");

    const baseQuery = normalizeQuery(req.query);
    const customerFilters = normalizeCustomerQuery(req.query);

    const finalQuery = {
      ...baseQuery,
      ...customerFilters,
    };
    const result = await userService.getAllCustomersSummary(finalQuery);
    res.status(200).json({
      status: "success",
      data: result,
    });
    console.log(result, "result");
  } catch (err) {
    next(err);
  }
};

exports.getStatsCustomers = async (req, res, next) => {
  try {
    const result = await userService.getStatsCustomers();

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.getStatsUsers = async (req, res, next) => {
  try {
    const result = await userService.getStatsUsers();

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
