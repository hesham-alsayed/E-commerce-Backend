const cartModel = require("../models/cartModel");

exports.getCartByUser = async (
  userId,
  options = { lean: false, populate: true },
) => {
  let query = cartModel.findOne({ user: userId });

  if (options.populate) {
    query = query.populate({
      path: "items.product",
      select: "title price variants subcategory category collection",
    });
  }

  if (options.lean) query = query.lean();

  const cart = await query;

  if (!cart) return null;

  return cart;
};

exports.createCart = async (userId) => {
  const cart = await cartModel.create({ user: userId, items: [] });
  return cart;
};
