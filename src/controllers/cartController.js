const { sendNotification } = require("../core/notificationManager");
const { recalculateCart, attachFreeShipping } = require("../../utils/helper");
const cartService = require("../services/cartService");

// ================= ADD TO CART =================
exports.addToCart = async (req, res, next) => {
  try {
    console.log(req.body);

    let cart = await cartService.addToCart(req.user._id, req.body);

    cart = recalculateCart(cart);

    if (cart?.save) {
      await cart.save();
    }

    cart = await attachFreeShipping(cart);
    console.log(cart);

    res.status(200).json({
      status: "success",
      results: cart.items.length,
      cart,
    });
  } catch (err) {
    next(err);
  }
};

// ================= UPDATE ITEM QUANTITY =================
exports.updateItemQuantity = async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);

    let cart = await cartService.updateItemQuantity(
      req.user._id,
      req.params.itemId,
      quantity,
    );

    cart = recalculateCart(cart);

    if (cart?.save) {
      await cart.save();
    }

    cart = await attachFreeShipping(cart);

    res.status(200).json({
      status: "success",
      results: cart.items.length,
      cart,
    });
  } catch (err) {
    next(err);
  }
};

// ================= REMOVE ITEM =================
exports.removeItem = async (req, res, next) => {
  try {
    let cart = await cartService.removeItem(req.user._id, req.params.itemId);

    cart = recalculateCart(cart);

    if (cart?.save) {
      await cart.save();
    }

    cart = await attachFreeShipping(cart);

    res.status(200).json({
      status: "success",
      results: cart.items.length,
      cart,
    });
  } catch (err) {
    next(err);
  }
};

// ================= GET CART =================
exports.getCart = async (req, res, next) => {
  try {
    let cart = await cartService.getCart(req.user._id);

    cart = recalculateCart(cart);

    cart = await attachFreeShipping(cart);

    res.status(200).json({
      status: "success",
      results: cart?.items?.length || 0,
      cart,
    });
  } catch (err) {
    next(err);
  }
};

// ================= CLEAR CART =================
exports.clearCart = async (req, res, next) => {
  try {
    let cart = await cartService.clearCart(req.user._id);

    cart = recalculateCart(cart);

    if (cart?.save) {
      await cart.save();
    }

    cart = await attachFreeShipping(cart);

    res.status(200).json({
      status: "success",
      results: 0,
      cart,
    });
  } catch (err) {
    next(err);
  }
};

// ================= APPLY COUPON =================
exports.applyCoupon = async (req, res, next) => {
  try {
    let cart = await cartService.applyCoupon(req.user._id, req.body.code);

    cart = recalculateCart(cart);

    if (cart?.save) {
      await cart.save();
    }

    cart = await attachFreeShipping(cart);

    // ================= ADMIN ONLY NOTIFICATION =================
    await sendNotification("coupon_applied", {
      userId: req.user._id,
      firstName: req.user.firstName,
      code: req.body.code,
      discount: cart?.discount || 0,
      link: `${process.env.BASE_URL}/admin/commerce/orders`,
    }).catch((err) => {
      console.error("Notification failed:", err.message);
    });
    res.status(200).json({
      status: "success",
      cart,
    });
  } catch (err) {
    next(err);
  }
};

// ================= REMOVE COUPON =================
exports.removeCoupon = async (req, res, next) => {
  try {
    let cart = await cartService.removeCoupon(req.user._id);

    cart = recalculateCart(cart);

    if (cart?.save) {
      await cart.save();
    }

    cart = await attachFreeShipping(cart);

    res.status(200).json({
      status: "success",
      message: "Coupon removed successfully",
      cart,
    });
  } catch (err) {
    next(err);
  }
};
