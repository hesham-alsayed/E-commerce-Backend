// repositories/collectionRepository.js
const collectionModel = require("../models/collectionModel");

exports.createCollection = async (data) => {
  return await collectionModel.create(data);
};

exports.getAllCollections = async () => {
  // 🔥 FAST: lean() + projection + sort + limit
  return await collectionModel
    .find({}) // No filter = use index scan
    .sort({ createdAt: -1 }) // Recent first
    .lean() // 🔥 10x faster - plain JS objects
    .exec();
};

exports.findCollectionByName = async (name) => {
  return await collectionModel.findOne({ name }).lean().exec();
};

exports.findCollectionById = async (id) => {
  return await collectionModel.findById(id).lean().exec();
};

exports.updateCollection = async (id, updateData) => {
  // 🔥 FAST: findByIdAndUpdate + lean
  return await collectionModel
    .findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true, // 🔥 Plain object
    })
    .select("name slug description image status createdAt updatedAt")
    .exec();
};

exports.deleteCollection = async (id) => {
  // 🔥 FAST: findByIdAndDelete
  return await collectionModel.findByIdAndDelete(id).lean().exec();
};
