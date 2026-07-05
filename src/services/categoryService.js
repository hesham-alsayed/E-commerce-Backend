const AppError = require("../../utils/AppError");
const categoryRepository = require("../repositories/categoryRepository");
const collectionRepository = require("../repositories/collectionRepository");
const mongoose = require("mongoose");
const slugify = require("slugify");
const {
  deleteSubcategoriesForCategory,
} = require("../repositories/subcategoryRepository");
const categoryModel = require("../models/categoryModel");
const ApiFeatures = require("../middlewares/apiFeature");

exports.createCategory = async (data) => {
  const { name, collection } = data;
  if (!name || !collection) {
    throw new AppError("name or collection is required", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(collection)) {
    throw new AppError("Invalid Collection ID", 400);
  }

  const categoryIsExist = await categoryRepository.findCategoryByName(
    name,
    collection,
  );

  if (categoryIsExist) {
    throw new AppError("Category already exists in this collection", 400);
  }

  const collectionIsExist =
    await collectionRepository.findCollectionById(collection);

  if (!collectionIsExist) {
    throw new AppError("Collection not found", 404);
  }

  data.slug = slugify(name, { lower: true });

  return await categoryRepository.createCategory(data);
};


exports.getAllCategories = async (queryString) => {
  const baseQuery = categoryModel.find();

  const features = new ApiFeatures(baseQuery, queryString)
    .filter()
    .search()
    .sort()
    .limitFields();

  const countQuery = new ApiFeatures(categoryModel.find(), queryString)
    .filter()
    .search();

  const count = await countQuery.query.countDocuments();

  features.paginate(count);

  const categories = await features.query.populate("collection");

  return {
    results: categories.length,
    pagination: features.paginationResult,
    categories,
  };
};

// exports.getCategoriesQuery = (collectionId) => {
//   let filter = {};

//   if (collectionId) {
//     if (!mongoose.Types.ObjectId.isValid(collectionId)) {
//       throw new AppError("Invalid Collection ID", 400);
//     }

//     filter.collection = new mongoose.Types.ObjectId(collectionId); // 🔥 FIX
//   }

//   return categoryModel.find(filter).populate("collection", 'name'); // 👈 RETURN QUERY NOT DATA
// };

exports.getCategory = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Category ID", 400);
  }
  const category = await categoryRepository.getCategory(id);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
};

exports.updateCategory = async (id, data) => {
  // validate id
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Category ID", 400);
  }

  data.collection = undefined;
  if (data.collection) {
    throw new AppError("You cannot change collection of category", 400);
  }

  if (data.name) {
    data.slug = slugify(data.name, { lower: true });
  }

  const updatedCategory = await categoryRepository.updateCategory(id, data);

  if (!updatedCategory) {
    throw new AppError("Category not found", 404);
  }

  return updatedCategory;
};

exports.deleteCategory = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid Category ID", 400);
  }

  const deletedCategory = await categoryRepository.deleteCategory(id);

  if (!deletedCategory) {
    throw new AppError("Category not found", 404);
  }
  await deleteSubcategoriesForCategory(id);
  return deletedCategory;
};
