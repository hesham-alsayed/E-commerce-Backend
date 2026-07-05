const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const productRoutes = require("./routes/productRoute");
const collectionRoute = require("./routes/collectionRoute");
const categoryRoute = require("./routes/categoryRoute");
const subcategoryRoute = require("./routes/subcategoryRoute");
const authRoute = require("./routes/authRoute");
const reviewRoute = require("./routes/reviewRoute");
const userRoute = require("./routes/userRoute");
const cartRoute = require("./routes/cartRoute");
const partnerRoute = require("./routes/partnerRoute");
const couponRoute = require("./routes/couponRoute");
const orderRoute = require("./routes/orderRoute");
const notificationRoute = require("./routes/notificationRoute");
const settingRoute = require("./routes/settingsRoute");
const pageRoute = require("./routes/pageRoute");
const shippingRoute = require("./routes/shippingZoneRoute");
const paypalRoutes = require("./routes/paypalRoute");

// require("./scheduler/stockScheduler");

const crypto = require("crypto");

const { globalErrorHandler } = require("./middlewares/globalErrorHandler");
const { default: axios } = require("axios");
const { createPaypalOrder } = require("../utils/paypal");
const AppError = require("../utils/AppError");

const app = express();

/* =========================
   CORS CONFIG
========================= */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:4000",
  "https://mern-stack-ecommerce-tau.vercel.app",
  "https://e-commerce-store-olive-iota.vercel.app",
  "https://mern-stack-ecommerce-admin-mu.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server / Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Middleware
app.set("trust proxy", 1);
app.use(express.json());
// app.use(cors());
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/collections", collectionRoute);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/subcategories", subcategoryRoute);
app.use("/api/v1/authentication", authRoute);
app.use("/api/v1/reviews", reviewRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/cart", cartRoute);
app.use("/api/v1/partners", partnerRoute);
app.use("/api/v1/coupons", couponRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/notifications", notificationRoute);
app.use("/api/v1/settings", settingRoute);
app.use("/api/v1/pages", pageRoute);
app.use("/api/v1/shipping-zones", shippingRoute);
app.use("/api/v1/paypal", paypalRoutes);

// ================= 404 =================
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// ----- GLOBAL ERROR HANDLER -----
app.use(globalErrorHandler);

module.exports = app;
