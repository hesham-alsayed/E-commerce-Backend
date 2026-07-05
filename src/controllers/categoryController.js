const ApiFeatures = require("../middlewares/apiFeature");
const categoryModel = require("../models/categoryModel");
const categoryService = require("../services/categoryService");

exports.createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({
      status: "success",
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllCategories = async (req, res, next) => {
  try {
    const { categories, pagination, results } =
      await categoryService.getAllCategories(req.query);
    res.status(200).json({
      status: "success",
      results,
      pagination,
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await categoryService.getCategory(id);

    res.status(200).json({
      status: "success",
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await categoryService.updateCategory(id, req.body);

    res.status(200).json({
      status: "success",
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    await categoryService.deleteCategory(id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
