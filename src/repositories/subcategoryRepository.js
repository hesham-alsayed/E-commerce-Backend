const subcategoryModel = require("../models/subcategoryModel");

exports.findSubcategoryByName = async (name, categoryId) => {
  return await subcategoryModel.findOne({
    name: name.toLowerCase(),
    category: categoryId,
  });
};

exports.createSubcategory = async (data) => {
  return await subcategoryModel.create(data);
};

exports.getSubcategoryById = async (id) => {
  return await subcategoryModel.findById(id);
};

exports.getAllSubcategories = async (filter = {}) => {
  return await subcategoryModel.find(filter).populate('category','name');
};

exports.updateSubcategory = async (id, data) => {
  return await subcategoryModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

exports.deleteSubcategory = async (id) => {
  return await subcategoryModel.findByIdAndDelete(id);
};

exports.deleteSubcategoriesForCategory = async (categoryId) => {
  return await subcategoryModel.deleteMany({ category: categoryId });
};
