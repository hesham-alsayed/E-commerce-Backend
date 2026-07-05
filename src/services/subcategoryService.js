const AppError = require("../../utils/AppError");
const subcategoryRepository = require("../repositories/subcategoryRepository");
const categoryRepository = require("../repositories/categoryRepository");
const collectionRepository = require("../repositories/collectionRepository");

const mongoose = require("mongoose");
const slugify = require("slugify");
const subcategoryModel = require("../models/subcategoryModel");
const ApiFeatures = require("../middlewares/apiFeature");

exports.createSubcategory = async (data) => {
  const { name, category, collection } = data;
  if (!name || !category || !collection) {
    throw new AppError("name and category , collection is required", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(category)) {
    throw new AppError("Invalid Category ID", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(collection)) {
    throw new AppError("Invalid collection ID", 400);
  }

  const categoryExists = await categoryRepository.getCategory(category);
  if (!categoryExists) {
    throw new AppError("Category not found", 404);
  }
  const collectionExists =
    await collectionRepository.findCollectionById(collection);
  if (!collectionExists) {
    throw new AppError("collection not found", 404);
  }

  const subcategoryIsExist = await subcategoryRepository.findSubcategoryByName(
    name,
    category,
    collection,
  );
  if (subcategoryIsExist)
    throw new AppError("subCategory already exists in this category", 400);
  data.slug = slugify(name, { lower: true });
  return await subcategoryRepository.createSubcategory(data);
};

exports.getSubcategory = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Subcategory ID", 400);
  }

  const subcategory = await subcategoryRepository.getSubcategoryById(id);
  if (!subcategory) {
    throw new AppError("Subcategory not found", 404);
  }

  return subcategory;
};
exports.getAllSubcategories = async (queryString) => {
  let filter = {};

  // ================= FILTER CATEGORY =================
  if (queryString.categoryId) {
    if (!mongoose.Types.ObjectId.isValid(queryString.categoryId)) {
      throw new AppError("Invalid Category ID", 400);
    }
    filter.category = queryString.categoryId;
  }

  // ================= FILTER COLLECTION =================
  if (queryString.collectionId) {
    if (!mongoose.Types.ObjectId.isValid(queryString.collectionId)) {
      throw new AppError("Invalid Collection ID", 400);
    }
    filter.collection = queryString.collectionId;
  }

  // ================= BASE QUERY =================
  let query = subcategoryModel
    .find(filter)
    .populate("category", "name")
    .populate("collection", "name");

  // ================= APIFeatures =================
  const apiFeatures = new ApiFeatures(query, queryString)
    .search()
    .sort()
    .limitFields();

  // ================= COUNT (IMPORTANT FIX) =================
  const countDocuments = await subcategoryModel.countDocuments(filter);

  apiFeatures.paginate(countDocuments);

  const subcategories = await apiFeatures.query;

  return {
    subcategories,
    paginationResult: apiFeatures.paginationResult,
  };
};

exports.updateSubcategory = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Subcategory ID", 400);
  }

  data.category = undefined;
  if (data.category) {
    throw new AppError("You cannot change category of subcategory", 400);
  }
  if (data.name) {
    data.slug = slugify(data.name, { lower: true });
  }

  const updated = await subcategoryRepository.updateSubcategory(id, data);
  if (!updated) {
    throw new AppError("Subcategory not found", 404);
  }

  return updated;
};

exports.deleteSubcategory = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Subcategory ID", 400);
  }

  const deleted = await subcategoryRepository.deleteSubcategory(id);
  if (!deleted) {
    throw new AppError("Subcategory not found", 404);
  }

  return deleted;
};
