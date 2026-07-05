const categoryModel = require("../models/categoryModel");


// ================= GET ALL WITH FILTER =================
exports.findAll = async (filter = {}, options = {}) => {
  const query = categoryModel.find(filter);

  if (options.select) query.select(options.select);
  if (options.sort) query.sort(options.sort);
  if (options.populate) query.populate(options.populate);

  return await query.lean().exec();
};

// ================= COUNT =================
exports.count = async (filter = {}) => {
  return await categoryModel.countDocuments(filter);
};

// ================= GET QUERY (FOR API FEATURES) =================
exports.getQuery = (filter = {}) => {
  return categoryModel.find(filter);
};


exports.findCategoryByName = async (name, collectionId) => {
  return await categoryModel.findOne({
    name: name.toLowerCase(),
    collection: collectionId,
  });
};

exports.createCategory = async (data) => {
  return await categoryModel.create(data);
};

exports.getAllCategories = async (filter = {}) => {
  return  categoryModel.find(filter); 
};


exports.getCategory = async (id) => {
  return await categoryModel.findById(id);
};

exports.updateCategory = async (id, data) => {
  return await categoryModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

exports.deleteCategory = async (id) => {
  return await categoryModel.findByIdAndDelete(id);
};

exports.deleteCategoriesForCollection = async (collectionId) => {
  return await categoryModel.deleteMany({ collection: collectionId });
};
