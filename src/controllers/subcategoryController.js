const subcategoryModel = require("../models/subcategoryModel");
const subcategoryService = require("../services/subcategoryService");

exports.getNavLinks = async (req, res, next) => {
  try {
    const subcategories = await subcategoryModel
      .find({ status: "active" })
      .select("_id name slug category collection")
      .populate({
        path: "category",
        select: "_id slug",
      })
      .populate({
        path: "collection",
        select: "_id slug",
      });
    res.status(200).json({
      status: "success",
      navLinks: subcategories,
    });
  } catch (error) {
    next(error);
  }
};

exports.createSubcategory = async (req, res, next) => {
  try {
    const subcategory = await subcategoryService.createSubcategory(req.body);
    res.status(201).json({ status: "success", data: { subcategory } });
  } catch (err) {
    next(err);
  }
};

exports.getSubcategory = async (req, res, next) => {
  try {
    const subcategory = await subcategoryService.getSubcategory(req.params.id);
    res.status(200).json({ status: "success", data: { subcategory } });
  } catch (err) {
    next(err);
  }
};

exports.getAllSubcategories = async (req, res, next) => {
  try {
    const result = await subcategoryService.getAllSubcategories(req.query);

    res.status(200).json({
      status: "success",
      results: result.subcategories.length,
      pagination: result.paginationResult,
      subcategories: result.subcategories,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSubcategory = async (req, res, next) => {
  try {
    const updated = await subcategoryService.updateSubcategory(
      req.params.id,
      req.body,
    );
    res.status(200).json({ status: "success", data: { subcategory: updated } });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubcategory = async (req, res, next) => {
  try {
    await subcategoryService.deleteSubcategory(req.params.id);
    res
      .status(200)
      .json({ status: "success", message: "Subcategory deleted successfully" });
  } catch (err) {
    next(err);
  }
};
