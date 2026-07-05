const AppError = require("../../utils/AppError");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");


exports.updateUserRole = async (userId, role) => {
  return await userModel.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  );
};

exports.createUser = async (data) => {
  const user = await userModel.create(data);
  return user;
};

exports.getUserById = async (id) => {
  const user = await userModel.findById(id);
  return user;
};

exports.updateUser = async (id, data) => {
  const user = await userModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  return user;
};

exports.deleteUser = async (id) => {
  const user = await userModel.findByIdAndUpdate(id, { isActive: false });
  return user;
};

exports.getAllUsers = async () => {
  const users = await userModel.find();
  return users;
};

exports.findUserByEmail = async (email) => {
  const user = await userModel.findOne({ email }).select("+password"); // 🔥 مهم جدا
  return user;
};

// Handle wishlist

exports.addToWishlist = async (userId, productId) => {
  const user = await userModel
    .findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: productId } },
      { new: true },
    )
    .populate("wishlist");
  return user; // return only wishlist
};

exports.removeFromWishlist = async (userId, productId) => {
  const user = await userModel
    .findByIdAndUpdate(
      userId,
      { $pull: { wishlist: productId } },
      { new: true },
    )
    .populate("wishlist");
  return user;
};

exports.getWishlist = async (userId) => {
  const user = await userModel.findById(userId).populate("wishlist");
  return user;
};

// handle addresses

exports.getAddresses = async (userId) => {
  const addresses = await userModel
    .findById(userId, "addresses")
    .populate("addresses");
  return addresses;
};

exports.addAddress = async (userId, addressData) => {
  const newAddress = await userModel.findByIdAndUpdate(
    userId,
    { $push: { addresses: addressData } },
    { new: true, runValidators: true },
  );
  return newAddress;
};

exports.updateAddress = async (userId, addressId, addressData) => {
  const user = await userModel.findById(userId);
  if (!user) return null;

  const address = user.addresses.id(addressId);
  if (!address) return null;

  // =========================
  // 1. Update address fields
  // =========================
  Object.assign(address, addressData);

  // =========================
  // 2. Handle default logic
  // =========================
  if (addressData.isDefault === true) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });

    address.isDefault = true;
  }

  await user.save();
  return user;
};

exports.deleteAddress = async (userId, addressId) => {
  const user = await userModel.findById(userId);
  if (!user) return null;

  const address = user.addresses.id(addressId);
  if (!address) return null;

  // ❌ إذا عنده عنوان واحد فقط → ممنوع الحذف
  if (user.addresses.length === 1) {
    throw new Error("You must have at least one address");
  }

  const wasDefault = address.isDefault;

  // remove address
  user.addresses.pull({ _id: addressId });

  // 🔁 if default was deleted → assign new default
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return user;
};

exports.getUserInfo = async (userId) => {
  return userModel.findById(userId).select("firstName email status");
};

exports.getAllCustomersSummary = async (query = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = "lastOrderDate",
    order = "desc",
    search,
    status,
    revenueGte,
    revenueLte,
    ordersGte,
    ordersLte,
  } = query;

  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  const basePipeline = [
    // ✅ FIXED FILTER (correct fields)
    {
      $match: {
        paymentStatus: "paid",
      },
    },

    // 👇 group by user
    {
      $group: {
        _id: "$user",

        ordersCount: { $sum: 1 },

        totalRevenue: {
          $sum: {
            $ifNull: ["$totalPriceAfterDiscount", "$totalPrice"],
          },
        },

        lastOrderDate: { $max: "$createdAt" },
      },
    },

    // join user
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    // user status filter
    ...(status === "true" || status === "false"
      ? [
          {
            $match: {
              "user.isActive": status === "true",
            },
          },
        ]
      : []),

    // search
    ...(search
      ? [
          {
            $match: {
              $or: [
                { "user.firstName": { $regex: search, $options: "i" } },
                { "user.lastName": { $regex: search, $options: "i" } },
                { "user.email": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),

    // revenue filter
    ...(revenueGte || revenueLte
      ? [
          {
            $match: {
              totalRevenue: {
                ...(revenueGte && { $gte: Number(revenueGte) }),
                ...(revenueLte && { $lte: Number(revenueLte) }),
              },
            },
          },
        ]
      : []),

    // orders filter
    ...(ordersGte || ordersLte
      ? [
          {
            $match: {
              ordersCount: {
                ...(ordersGte && { $gte: Number(ordersGte) }),
                ...(ordersLte && { $lte: Number(ordersLte) }),
              },
            },
          },
        ]
      : []),
  ];

  // total
  const totalResult = await orderModel.aggregate([
    ...basePipeline,
    { $count: "total" },
  ]);

  const total = totalResult[0]?.total || 0;

  // data
  const data = await orderModel.aggregate([
    ...basePipeline,

    {
      $project: {
        _id: 0,
        userId: "$_id",
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        email: "$user.email",
        status: "$user.isActive",
        avatar: "$user.avatar",
        ordersCount: 1,
        totalRevenue: 1,
        lastOrderDate: 1,
      },
    },

    { $sort: { [sort]: sortOrder } },
    { $skip: skip },
    { $limit: Number(limit) },
  ]);

  return {
    data,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  };
};

exports.getStatsCustomers = async () => {
  const stats = await orderModel.aggregate([
    // 1) only paid orders (SAME AS TABLE)
    {
      $match: {
        paymentStatus: "paid",
      },
    },

    // 2) unique users only
    {
      $group: {
        _id: "$user",
      },
    },

    // 3) final count
    {
      $group: {
        _id: null,
        customersWithPaidOrders: { $sum: 1 },
      },
    },
  ]);

  const paidCount = stats[0]?.customersWithPaidOrders || 0;

  const totalUsers = await userModel.countDocuments({ role: "user" });

  const usersWithOrders = await orderModel.aggregate([
    {
      $group: { _id: "$user" },
    },
    {
      $count: "count",
    },
  ]);

  const customersWithOrders = usersWithOrders[0]?.count || 0;

  const inactiveCustomers = totalUsers - customersWithOrders;

  return {
    totalCustomers: totalUsers,
    customersWithPaidOrders: paidCount,
    customersWithUnpaidOrders: customersWithOrders - paidCount,
    inactiveCustomers,
  };
};

exports.getStatsUsers = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const stats = await userModel.aggregate([
    {
      $facet: {
        // 🟢 TOTAL (ALL TIME per category)
        total: [
          {
            $group: {
              _id: null,

              adminUsers: {
                $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
              },

              normalUsers: {
                $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] },
              },

              verifiedUsers: {
                $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
              },

              activeUsers: {
                $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
              },
            },
          },
        ],

        // 🟡 CURRENT MONTH
        current: [
          {
            $match: {
              createdAt: { $gte: startOfMonth },
            },
          },
          {
            $group: {
              _id: null,

              adminUsers: {
                $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
              },

              normalUsers: {
                $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] },
              },

              verifiedUsers: {
                $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
              },

              activeUsers: {
                $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
              },
            },
          },
        ],

        // 🔴 PREVIOUS MONTH
        previous: [
          {
            $match: {
              createdAt: {
                $gte: startOfPrevMonth,
                $lt: startOfMonth,
              },
            },
          },
          {
            $group: {
              _id: null,

              adminUsers: {
                $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
              },

              normalUsers: {
                $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] },
              },

              verifiedUsers: {
                $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
              },

              activeUsers: {
                $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
              },
            },
          },
        ],
      },
    },
  ]);

  const total = stats[0]?.total[0] || {};
  const current = stats[0]?.current[0] || {};
  const previous = stats[0]?.previous[0] || {};

  const calc = (curr = 0, prev = 0, totalVal = 0) => ({
    total: totalVal,
    current: curr,
    previous: prev,
    growth:
      prev === 0
        ? curr > 0
          ? 100
          : 0
        : Math.round(((curr - prev) / prev) * 100),
  });

  return {
    adminUsers: calc(current.adminUsers, previous.adminUsers, total.adminUsers),

    normalUsers: calc(
      current.normalUsers,
      previous.normalUsers,
      total.normalUsers,
    ),

    verifiedUsers: calc(
      current.verifiedUsers,
      previous.verifiedUsers,
      total.verifiedUsers,
    ),

    activeUsers: calc(
      current.activeUsers,
      previous.activeUsers,
      total.activeUsers,
    ),
  };
};
