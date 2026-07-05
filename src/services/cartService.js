const AppError = require("../../utils/AppError");
const {
  isValidId,
  resolveDiscount,
  getFinalPrice,
} = require("../../utils/helper");
const productRepository = require("../repositories/productRepository");
const cartRepository = require("../repositories/cartRepository");
const couponRepository = require("../repositories/couponRepository");
const cartModel = require("../models/cartModel");
const couponModel = require("../models/couponModel");

const getProductStock = (product, color, size) => {
  //  Case 1: Product has variants
  if (product.variants && product.variants.length > 0) {
    const variant = product.variants.find((v) => v.color === color);
    if (!variant) throw new AppError("Color not found", 400);

    const sizeObj = variant.sizes.find((s) => s.size === size);
    if (!sizeObj) throw new AppError("Size not found", 400);

    return sizeObj.stock;
  }

  //  Case 2: Product without variants
  if (product.colors && product.colors.length > 0) {
    if (!color || !product.colors.includes(color)) {
      throw new AppError("Invalid color", 400);
    }
  }

  if (product.size && product.size.length > 0) {
    if (!size || !product.size.includes(size)) {
      throw new AppError("Invalid size", 400);
    }
  }

  return product.stock;
};

const calculateCart = (cart) => {
  cart.totalPrice = cart.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  // 🚨 IMPORTANT: reset everything first
  if (!cart.items.length) {
    cart.coupon = null;
    cart.discountAmount = 0;
    cart.totalPriceAfterDiscount = 0;
    return cart;
  }

  // ✅ only apply discount if valid coupon exists
  if (cart.coupon && cart.discountAmount > 0) {
    cart.totalPriceAfterDiscount = Math.max(
      cart.totalPrice - cart.discountAmount,
      0,
    );
  } else {
    cart.discountAmount = 0;
    cart.totalPriceAfterDiscount = cart.totalPrice;
  }

  return cart;
};

const calculateDiscount = (cartTotal, coupon) => {
  if (!cartTotal || cartTotal <= 0) return 0;

  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (cartTotal * coupon.discountValue) / 100;
  }

  if (coupon.discountType === "fixed") {
    discount = coupon.discountValue;
  }

  // 🔥 safety rules
  discount = Math.max(discount, 0);
  discount = Math.min(discount, cartTotal);

  return Math.round(discount);
};

exports.addToCart = async (userId, data) => {
  const { productId, quantity, color, size } = data;

  if (!userId || !productId) {
    throw new AppError("UserId and ProductId are required", 400);
  }

  const qty = quantity && quantity > 0 ? quantity : 1;

  // ================= PRODUCT =================
  const product = await productRepository.getProductWithRelations(productId);
  if (!product) throw new AppError("Product not found", 404);

  // ================= DISCOUNT =================
  const discount = resolveDiscount(product);
  const finalPrice = getFinalPrice(product.price, discount);

  // ================= GET VARIANT =================
  const variant = product.variants?.find((v) => v.color === color);

  const sizeObj = variant?.sizes?.find((s) => s.size === size);

  const stock = sizeObj?.stock || 0;

  if (qty > stock) {
    throw new AppError("Not enough stock", 400);
  }

  // ================= CART =================
  let cart = await cartRepository.getCartByUser(userId, {
    lean: false,
    populate: false,
  });

  if (!cart) {
    cart = await cartRepository.createCart(userId);
  }

  // ================= EXISTING ITEM =================
  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === productId &&
      item.color === color &&
      item.size === size,
  );

  if (existingItem) {
    existingItem.quantity += qty;
  } else {
    cart.items.push({
      product: productId,

      // 🔥 FULL SNAPSHOT FIELDS (IMPORTANT)
      title: product.title,
      color,
      size,
      quantity: qty,
      price: finalPrice,

      image: variant?.images?.[0] || product.image,
      colorCode: variant?.colorCode || null,
    });
  }

  calculateCart(cart);

  await cart.save();

  await cart.populate({
    path: "items.product",
    select: "title price variants",
  });

  return cart;
};

exports.updateItemQuantity = async (userId, itemId, quantity) => {
  if (!userId || !itemId)
    throw new AppError("User and Item IDs are required", 400);

  if (!isValidId(userId) || !isValidId(itemId))
    throw new AppError("Invalid user or item ID", 400);

  quantity = Number(quantity); // 🔥 important

  if (!quantity || quantity <= 0)
    throw new AppError("Quantity must be at least 1", 400);

  const cart = await cartRepository.getCartByUser(userId, {
    lean: false,
    populate: true,
  });

  if (!cart) throw new AppError("Cart not found", 404);

  const item = cart.items.find((i) => i._id.toString() === itemId);

  if (!item) throw new AppError("Item not found", 404);

  const product = item.product;

  const stock = getProductStock(product, item.color, item.size);

  if (quantity > stock) throw new AppError("Not enough stock", 400);

  item.quantity = quantity;

  calculateCart(cart);

  await cart.save();

  // 🔥 IMPORTANT: return populated cart
  await cart.populate({
    path: "items.product",
    select: "title price variants",
  });

  return cart;
};

// settings.service.js
exports.getGeneralSettings = async () => {
  const settings = await settingsModel.findOne({
    key: "general_settings",
  });

  const value = settings?.value || [];
  const freeShipping = value.find((s) => s.type === "freeShippingThreshold");

  return {
    freeShippingThreshold: freeShipping?.value,
  };
};
exports.removeItem = async (userId, itemId) => {
  if ((!userId, !itemId))
    throw new AppError("user , item IDS are required", 400);
  if (!isValidId(userId) || !isValidId(itemId))
    throw new AppError("Invalid user or item ID", 400);

  const cart = await cartRepository.getCartByUser(userId, {
    lean: false,
    populate: false,
  });
  if (!cart) throw new Error("Cart not found");

  cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

  calculateCart(cart);

  await cart.save();
  return cart;
};

exports.getCart = async (userId) => {
  if (!userId) throw new AppError("user ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);

  const cart = await cartRepository.getCartByUser(userId, {
    lean: true,
    populate: true,
  });
  if (!cart) return null;

  return cart;
};

exports.clearCart = async (userId) => {
  if (!userId) throw new AppError("user ID is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);

  return await cartModel.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        items: [],
        totalPrice: 0,
        totalPriceAfterDiscount: 0,
        discountAmount: 0,
      },
      $unset: {
        coupon: "",
      },
    },
    {
      new: true,
    },
  );

  if (!updatedCart) return null;

  return updatedCart;
};

exports.applyCoupon = async (userId, couponCode) => {
  if (!userId) throw new AppError("user id is required", 400);
  if (!couponCode) throw new AppError("coupon code is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);

  const cart = await cartRepository.getCartByUser(userId, {
    lean: false,
    populate: false,
  });

  if (!cart) throw new AppError("Cart not found", 404);
  if (!cart.items.length) throw new AppError("Cart is empty", 400);

  // 🚨 FIX 1: prevent multiple coupons
  if (cart.coupon) {
    throw new AppError("A coupon is already applied. Remove it first", 400);
  }

  const code = couponCode.trim().toUpperCase();

  const coupon = await couponRepository.getCouponByCode(code);

  if (!coupon) {
    throw new AppError("Invalid coupon code", 400);
  }

  const isValid = couponModel.isValidCoupon(coupon);

  if (!isValid) {
    throw new AppError("Coupon expired or not valid", 400);
  }

  if (cart.totalPrice < coupon.minPurchase) {
    throw new AppError(`Minimum purchase is ${coupon.minPurchase}`, 400);
  }

  const discountAmount = calculateDiscount(cart.totalPrice, coupon);

  if (discountAmount <= 0) {
    throw new AppError("Invalid discount calculation", 400);
  }

  // ================= APPLY =================
  cart.coupon = coupon._id;
  cart.discountAmount = discountAmount;
  cart.totalPriceAfterDiscount = Math.max(cart.totalPrice - discountAmount, 0);

  await cart.save();

  // ⚠️ optional: count usage only once per real order (NOT here usually)
  coupon.usedCount += 1;
  await coupon.save();

  return cart;
};

exports.removeCoupon = async (userId) => {
  if (!userId) throw new AppError("user id is required", 400);
  if (!isValidId(userId)) throw new AppError("Invalid user ID", 400);

  const cart = await cartRepository.getCartByUser(userId, {
    lean: false,
    populate: false,
  });

  if (!cart) throw new AppError("Cart not found", 404);
  if (!cart.items.length) throw new AppError("Cart is empty", 400);

  // ================= REMOVE COUPON =================
  cart.coupon = null;
  cart.discountAmount = 0;
  cart.totalPriceAfterDiscount = cart.totalPrice;

  await cart.save();

  return cart;
};
