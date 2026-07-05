const pageModel = require("../models/pagesModel");
const mongoose = require("mongoose");

exports.createPage = async (data) => {
  const page = await pageModel.create(data);
  return page;
};

exports.getPages = async () => {
  const pages = await pageModel.find();
  return pages;
};
exports.getPage = async (id) => {
  const page = await pageModel.findById(id);
  return page;
};

exports.updatePage = async (id, updateData) => {
  const page = await pageModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  return page;
};
exports.deletePage = async (id) => {
  const page = await pageModel.findByIdAndDelete(id);
  return page;
};

exports.deleteSection = async (pageId, sectionId) => {
  const updatedPage = await pageModel.findByIdAndUpdate(
    pageId,
    { $pull: { sections: { _id: sectionId } } },
    { new: true },
  );
  return updatedPage;
};
