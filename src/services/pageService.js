const AppError = require("../../utils/AppError");
const {
  isValidId,
  validateBannerSection,
  sectionsValidators,
} = require("../../utils/helper");
const { getCategory } = require("../repositories/categoryRepository");
const { findCollectionById } = require("../repositories/collectionRepository");
const pageRepository = require("../repositories/pageRepostiory");
const { getSubcategoryById } = require("../repositories/subcategoryRepository");
const Page = require("../models/pagesModel");
const pagesModel = require("../models/pagesModel");
const productModel = require("../models/productModel");

// ================= PAGE =================
exports.createPage = async (data) => {
  return await Page.create(data);
};

exports.getAllPages = async () => {
  const pages = await Page.find().lean();
  for (const page of pages) {
    if (page.slug === "/home") {
      for (const section of page.sections) {
        // 🟡 PRODUCTS SECTION ONLY
        if (section.type === "products") {
          const products = await productModel
            .find({
              _id: {
                $in: section.props.products.map((p) => p._id),
              },
            })
            .populate("collection category subcategory");

          section.props.products = products;
        }

        // 🟢 BANNER / TEXT → nothing to do
      }
    }
  }
  return pages;
};

exports.getPage = async (id) => {
  const page = await pagesModel.findById(id).lean();

  if (!page) throw new AppError("Page not found", 404);

  for (const section of page.sections) {
    // 🟡 PRODUCTS SECTION ONLY
    if (section.type === "products") {
      const products = await productModel
        .find({
          _id: {
            $in: section.props.products.map((p) => p._id),
          },
        })
        .populate("collection category subcategory");

      section.props.products = products;
    }

    // 🟢 BANNER / TEXT → nothing to do
  }

  return page;
};

exports.updatePage = async (id, data) => {
  let { sections } = data;

  if (typeof sections === "string") {
    sections = JSON.parse(sections);
  }

  // ================= VALIDATION =================
  sections.forEach((sec) => {
    const validate = sectionsValidators[sec.type];
    if (validate) validate(sec);
  });

  // ================= SANITIZE PRODUCTS =================
  for (const sec of sections) {
    if (sec.type === "products") {
      const products = sec.props?.products || [];

      sec.props.productIds = products.map((p) =>
        typeof p === "object" ? p._id : p,
      );

      delete sec.props.products;
    }
  }

  const page = await pagesModel.findByIdAndUpdate(
    id,
    { ...data, sections },
    { new: true },
  );

  if (!page) throw new AppError("Page not found", 404);

  return page;
};

exports.updatePageMeta = async (id, data) => {
  const { title, slug, status } = data;

  const page = await pagesModel.findByIdAndUpdate(
    id,
    {
      title,
      slug,
      status,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!page) throw new AppError("Page not found", 404);

  return page;
};
exports.deletePage = async (id) => {
  const page = await Page.findByIdAndDelete(id);
  if (!page) throw new AppError("Page not found", 404);
  return true;
};

// ================= SECTIONS =================
exports.addSection = async (pageId, sectionData) => {
  const page = await Page.findById(pageId);
  if (!page) throw new AppError("Page not found", 404);

  const newSection = {
    _id: new Date().getTime().toString(),
    ...sectionData,
  };

  page.sections.push(newSection);
  await page.save();

  return page;
};

exports.updateSection = async (pageId, sectionId, data) => {
  const page = await Page.findById(pageId);
  if (!page) throw new AppError("Page not found", 404);

  const section = page.sections.id(sectionId);
  if (!section) throw new AppError("Section not found", 404);

  Object.assign(section, data);

  await page.save();
  return section;
};

exports.deleteSection = async (pageId, sectionId) => {
  const page = await Page.findById(pageId);
  if (!page) throw new AppError("Page not found", 404);

  page.sections = page.sections.filter((s) => s._id.toString() !== sectionId);

  await page.save();
  return true;
};
