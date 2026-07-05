const mongoose = require("mongoose");
const AppError = require("../../utils/AppError");

class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // ================= FILTER =================
  filter() {
    const queryObj = { ...this.queryString };

    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "keyword",
      "search",
      "priceMin",
      "priceMax",
      "colors",
      "sizes",
      "stock",
    ];

    excludedFields.forEach((el) => delete queryObj[el]);

    let mongoQuery = {};

    // ===== COLORS & SIZES =====
    const colors = this.queryString.colors?.split(",").filter(Boolean) || [];
    const sizes = this.queryString.sizes?.split(",").filter(Boolean) || [];

    if (colors.length || sizes.length) {
      mongoQuery.$or = [];

      if (colors.length) {
        mongoQuery.$or.push(
          { "variants.color": { $in: colors } },
          { colors: { $in: colors } },
        );
      }

      if (sizes.length) {
        mongoQuery.$or.push(
          { "variants.sizes.size": { $in: sizes } },
          { size: { $in: sizes } },
        );
      }
    }

    // ===== PRICE FILTER =====
    if (this.queryString.priceMin || this.queryString.priceMax) {
      mongoQuery.price = {};

      if (this.queryString.priceMin)
        mongoQuery.price.$gte = Number(this.queryString.priceMin);

      if (this.queryString.priceMax)
        mongoQuery.price.$lte = Number(this.queryString.priceMax);
    }

    if (this.queryString.stock === "in") {
      mongoQuery.stock = { $gt: 0 };
    }

    if (this.queryString.stock === "out") {
      mongoQuery.stock = { $lte: 0 };
    }
    // ===== NORMAL FILTERS =====
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (m) => `$${m}`);

    Object.assign(mongoQuery, JSON.parse(queryStr));

    // 🔥 merge safely with existing mongoose filter
    const existingFilter = this.query.getFilter();

    this.query = this.query.find({
      ...existingFilter,
      ...mongoQuery,
    });

    return this;
  }

  // ================= SEARCH (FIXED + FLEXIBLE) =================
  search(fields = ["name", "title", "description"]) {
    const keyword = this.queryString.keyword || this.queryString.search;

    if (keyword) {
      const existingFilter = this.query.getFilter();

      const searchQuery = {
        $or: fields.map((field) => ({
          [field]: { $regex: keyword, $options: "i" },
        })),
      };

      this.query = this.query.find({
        ...existingFilter,
        ...searchQuery,
      });
    }

    return this;
  }

  // ================= SORT =================
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  // ================= LIMIT FIELDS =================
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  // ================= PAGINATION =================
  paginate(countDocuments, defaultLimit = 10) {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || defaultLimit;
    const skip = (page - 1) * limit;

    const numberOfPages = Math.ceil(countDocuments / limit);

    if (page > numberOfPages && numberOfPages > 0) {
      throw new AppError(
        `Page ${page} does not exist. Max is ${numberOfPages}`,
        400,
      );
    }

    this.paginationResult = {
      currentPage: page,
      limit,
      numberOfPages,
      total: countDocuments,
    };

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = ApiFeatures;
