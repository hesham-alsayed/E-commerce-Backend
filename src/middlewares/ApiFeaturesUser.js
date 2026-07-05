class ApiFeaturesUser {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // ================= FILTER (same as admin except price) =================
  filter() {
    const queryObj = { ...this.queryString };

    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "search",
      "keyword",
      "priceMin",
      "priceMax",
      "colors",
      "sizes",
      "stock",
    ];

    excludedFields.forEach((el) => delete queryObj[el]);

    let mongoQuery = {};

    // COLORS + SIZES (same as admin)
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

    // STOCK (same as admin)
    if (this.queryString.stock === "in") {
      mongoQuery.stock = { $gt: 0 };
    }

    if (this.queryString.stock === "out") {
      mongoQuery.stock = { $lte: 0 };
    }

    // normal filters
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (m) => `$${m}`);

    Object.assign(mongoQuery, JSON.parse(queryStr));

    this.query = this.query.find(mongoQuery);

    return this;
  }

  // ================= SEARCH (same as admin) =================
  search(fields = ["title", "description"]) {
    const keyword = this.queryString.search || this.queryString.keyword;

    if (!keyword || keyword.trim() === "") return this;

    this.query = this.query.find({
      $and: [
        {
          $or: fields.map((field) => ({
            [field]: { $regex: keyword, $options: "i" },
          })),
        },
      ],
    });

    return this;
  }

  // ================= SORT =================
  sort() {
    this.query = this.queryString.sort
      ? this.query.sort(this.queryString.sort.split(",").join(" "))
      : this.query.sort("-createdAt");

    return this;
  }

  // ================= LIMIT =================
  limitFields() {
    this.query = this.queryString.fields
      ? this.query.select(this.queryString.fields.split(",").join(" "))
      : this.query.select("-__v");

    return this;
  }

  // ================= PAGINATION =================
  paginate() {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = ApiFeaturesUser;
