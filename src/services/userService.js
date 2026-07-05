const userRepository = require("../repositories/userRepository");
const productRepository = require("../repositories/productRepository");

const AppError = require("../../utils/AppError");
const mongoose = require("mongoose");
const { filterAllowedFields } = require("../../utils/helper");
const userModel = require("../models/userModel");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);


exports.changeUserRole = async (userId, role) => {
  // 1) validate role
  const allowedRoles = ["user", "admin"];

  if (!allowedRoles.includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  // 2) check user exists
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // 3) update role
  const updatedUser = await userRepository.updateUserRole(userId, role);

  return updatedUser;
};

exports.getMe = async (userId) => {
  if (!userId) throw new AppError("user id is required", 400);
  const user = await userRepository.getUserById(userId);

  if (!user) throw new AppError("User not found", 404);

  return user;
};

exports.updateMe = async (userId, data) => {
  if (!data) throw new AppError("updated data is required", 400);
  if (!userId) throw new AppError("user id is required", 400);

  const allowedFields = ["firstName", "lastName", "phone", "avatar"];

  const filteredData = {};

  Object.keys(data || {}).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredData[key] = data[key];
    }
  });

  const user = await userRepository.updateUser(userId, filteredData);

  if (!user) throw new AppError("User not found", 404);

  return user;
};
exports.deleteMe = async (userId) => {
  if (!userId) throw new AppError("user id is required", 400);
  const user = await userRepository.deleteUser(userId);

  if (!user) throw new AppError("User not found", 404);
  return user;
};

exports.getUser = async (id) => {
  if (!id) throw new AppError("user id is required", 400);
  if (!isValidId(id)) {
    throw new AppError("Invalid user ID", 400);
  }

  const user = await userRepository.getUserById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

exports.createUser = async (data) => {
  const { email } = data;

  // 1. check if exists
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const user = await userRepository.createUser(data);

  return user;
};
exports.updateUser = async (id, data) => {
  if (!id) throw new AppError("user id is required", 400);

  if (!isValidId(id)) {
    throw new AppError("Invalid user ID", 400);
  }

  if (data.password) {
    throw new AppError("Use change password endpoint", 400);
  }

  // ✅ allowed fields
  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "isActive",
    "isVerified",
  ];

  if (data.role) {
    throw new AppError("Use role update endpoint", 400);
  }

  const filteredData = filterAllowedFields(data, allowedFields);

  const user = await userRepository.updateUser(id, filteredData);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};
exports.deleteUser = async (id) => {
  if (!id) throw new AppError("user id is required", 400);
  if (!isValidId(id)) {
    throw new AppError("Invalid user ID", 400);
  }

  const user = await userRepository.deleteUser(id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};
exports.getAllUsers = async () => {
  const users = await userRepository.getAllUsers();
  return users;
};

exports.addToWishlist = async (userId, productId) => {
  if (!userId || !productId)
    throw new AppError("userId or productId are required", 400);
  if (!isValidId(productId)) {
    throw new AppError("Invalid product ID", 400);
  }
  const product = await productRepository.getProduct(productId);
  if (!product) throw new AppError("product id not found", 400);
  const user = await userRepository.addToWishlist(userId, productId);

  if (!user) throw new AppError("User not found", 404);

  return user.wishlist;
};

// ✅ remove
exports.removeFromWishlist = async (userId, productId) => {
  if (!userId || !productId)
    throw new AppError("userId or productId are required", 400);

  if (!isValidId(productId)) {
    throw new AppError("Invalid product ID", 400);
  }

  const user = await userRepository.removeFromWishlist(userId, productId);

  if (!user) throw new AppError("User not found", 404);

  return user.wishlist;
};

// ✅ get
exports.getWishlist = async (userId) => {
  if (!userId) throw new AppError("userId is required", 400);
  if (!isValidId(userId)) {
    throw new AppError("Invalid user ID", 400);
  }
  const user = await userRepository.getWishlist(userId);

  if (!user) throw new AppError("User not found", 404);

  return user.wishlist; // populated
};

// handle addresses

exports.getMyAddresses = async (userId) => {
  if (!userId) throw new AppError("User ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);

  const user = await userRepository.getAddresses(userId);
  if (!user) throw new AppError("User not found", 404);

  return user.addresses;
};

exports.addMyAddress = async (userId, addressData) => {
  if (!userId) throw new AppError("User ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);

  // check for empty object {}
  if (!addressData || Object.keys(addressData).length === 0)
    throw new AppError("Address data is required", 400);

  const userExist = await userRepository.getUserById(userId);
  if (!userExist) throw new AppError("User not found", 404);

  const user = await userRepository.addAddress(userId, addressData);
  if (!user) throw new AppError("Failed to add address", 500);

  return user.addresses;
};

exports.updateMyAddress = async (userId, addressId, addressData) => {
  if (!userId || !addressId)
    throw new AppError("User ID and Address ID are required", 400);

  if (!isValidId(userId) || !isValidId(addressId))
    throw new AppError("Invalid User or Address ID", 400);

  if (!addressData || Object.keys(addressData).length === 0)
    throw new AppError("Address data is required to update", 400);

  const user = await userRepository.updateAddress(
    userId,
    addressId,
    addressData,
  );
  if (!user) throw new AppError("Address or User not found", 404);

  return user.addresses;
};

exports.deleteMyAddress = async (userId, addressId) => {
  if (!userId || !addressId)
    throw new AppError("User ID and Address ID are required", 400);

  if (!isValidId(userId) || !isValidId(addressId))
    throw new AppError("Invalid User or Address ID", 400);

  const user = await userRepository.deleteAddress(userId, addressId);
  if (!user) throw new AppError("Address or User not found", 404);

  return user.addresses;
};

// 🔹 Admin endpoints
exports.getUserAddresses = exports.getMyAddresses;

exports.addUserAddress = async (userId, addressData) => {
  if (!userId) throw new AppError("User ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid User ID", 400);
  if (!addressData || Object.keys(addressData).length === 0)
    throw new AppError("Address data is required", 400);

  const user = await userRepository.addAddress(userId, addressData);
  if (!user) throw new AppError("User not found", 404);

  return user.addresses;
};

exports.updateUserAddress = async (userId, addressId, addressData) => {
  if (!userId || !addressId)
    throw new AppError("User ID and Address ID are required", 400);
  if (!isValidId(userId) || !isValidId(addressId))
    throw new AppError("Invalid User or Address ID", 400);
  if (!addressData || Object.keys(addressData).length === 0)
    throw new AppError("Address data is required to update", 400);

  const user = await userRepository.updateAddress(
    userId,
    addressId,
    addressData,
  );
  if (!user) throw new AppError("Address or User not found", 404);

  return user.addresses;
};

exports.deleteUserAddress = exports.deleteMyAddress;

exports.getAllCustomersSummary = async (query) => {
  const result = await userRepository.getAllCustomersSummary(query);
  return result;
};

exports.getStatsCustomers = async () => {
  const result = await userRepository.getStatsCustomers();
  return result;
};

exports.getStatsUsers = async () => {
  const result = await userRepository.getStatsUsers();
  return result;
};



exports.getUsersRoleStats = async () => {
  const stats = await userModel.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  let totalUsers = 0;
  let totalAdmins = 0;
  let totalNormalUsers = 0;

  stats.forEach((item) => {
    totalUsers += item.count;

    if (item._id === "admin") {
      totalAdmins = item.count;
    }

    if (item._id === "user") {
      totalNormalUsers = item.count;
    }
  });

  return {
    totalUsers,
    totalAdmins,
    totalNormalUsers,
  };
};