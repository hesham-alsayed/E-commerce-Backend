// services/collectionService.js
const collectionRepository = require("../repositories/collectionRepository");
const categoryRepository = require("../repositories/categoryRepository");
const slugify = require("slugify");
const AppError = require("../../utils/AppError");

// ================= GET ALL - Pure DB Optimized =================
exports.getAllCollections = async () => {
  console.log("📊 Fetching collections from DB (no cache)");
  const collections = await collectionRepository.getAllCollections();
  console.log(`✅ Fetched ${collections.length} collections`);
  return collections;
};

// ================= CREATE - Direct DB =================
exports.createCollection = async (data) => {
  const { name } = data;

  console.log("📤 Creating collection:", name);

  // 1. Fast duplicate check (indexed)
  const isExist = await collectionRepository.findCollectionByName(name);
  if (isExist) {
    throw new AppError("Collection name already exists", 400);
  }

  // 2. Create directly
  const collection = await collectionRepository.createCollection(data);
  console.log("✅ Created collection:", collection._id);

  return collection;
};

// ================= UPDATE - Direct DB =================
exports.updateCollection = async (id, data) => {
  console.log("📤 Updating collection:", id);

  if (!id) {
    throw new AppError("Collection ID is required", 400);
  }

  // Generate slug if name changed
  if (data.name) {
    data.slug = slugify(data.name, { lower: true, strict: true });
  }

  // Fast update
  const updatedCollection = await collectionRepository.updateCollection(
    id,
    data,
  );

  if (!updatedCollection) {
    throw new AppError(`Collection ${id} not found`, 404);
  }

  console.log("✅ Updated collection:", updatedCollection._id);
  return updatedCollection;
};

// ================= DELETE - Direct DB =================
exports.deleteCollection = async (id) => {
  console.log("📤 Deleting collection:", id);

  if (!id) {
    throw new AppError("Collection ID is required", 400);
  }

  // Fast delete
  const deletedCollection = await collectionRepository.deleteCollection(id);

  if (!deletedCollection) {
    throw new AppError(`Collection ${id} not found`, 404);
  }

  // Delete related categories
  await categoryRepository.deleteCategoriesForCollection(id);

  console.log("✅ Deleted collection:", id);
  return deletedCollection;
};

// ================= GET ONE =================
exports.getCollection = async (id) => {
  if (!id) throw new AppError("Collection ID is required", 400);

  const collection = await collectionRepository.findCollectionById(id);
  if (!collection) throw new AppError(`Collection ${id} not found`, 404);

  return collection;
};


