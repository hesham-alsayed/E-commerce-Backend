const collectionService = require("../services/collectionService");

// ================= CREATE =================
exports.createCollection = async (req, res, next) => {
  try {
    const collection = await collectionService.createCollection(req.body);

    res.status(201).json({
      status: "success",
      data: {
        collection,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================= GET ALL =================
exports.getAllCollections = async (req, res, next) => {
  try {
    const collections = await collectionService.getAllCollections();

    res.status(200).json({
      status: "success",
      collections, // ✅ Send as top-level array
      results: collections.length,
    });
  } catch (error) {
    next(error);
  }
};

// ================= GET ONE =================
exports.getCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const collection = await collectionService.getCollection(id);

    res.status(200).json({
      status: "success",
      data: {
        collection,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================= UPDATE =================
exports.updateCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const collection = await collectionService.updateCollection(id, data);

    res.status(200).json({
      status: "success",
      data: {
        collection,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================= DELETE =================
exports.deleteCollection = async (req, res, next) => {
  try {
    const { id } = req.params;

    await collectionService.deleteCollection(id);

    res.status(200).json({
      status: "success",
      message: "Collection deleted successfully",
      data: {
        id,
      },
    });
  } catch (error) {
    next(error);
  }
};
