const pageService = require("../services/pageService");
// ================= PAGE =================
exports.createPage = async (req, res, next) => {
  try {
    const page = await pageService.createPage(req.body);
    res.status(201).json({ success: true, page });
  } catch (err) {
    next(err);
  }
};

exports.getAllPages = async (req, res, next) => {
  try {
    const pages = await pageService.getAllPages();
    
    res.status(200).json({ success: true, pages });
  } catch (err) {
    next(err);
  }
};

exports.getPage = async (req, res, next) => {
  try {
    const page = await pageService.getPage(req.params.pageId);
    res.status(200).json({ success: true, page });
  } catch (err) {
    next(err);
  }
};

exports.updatePage = async (req, res, next) => {
  try {
    console.log(req.body);
    const page = await pageService.updatePage(req.params.pageId, req.body);
    res.status(200).json({
      status: "success",
      page,
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePageMeta = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    const page = await pageService.updatePageMeta(pageId, req.body);

    res.status(200).json({
      status: "success",
      page,
    });
  } catch (err) {
    next(err);
  }
};
exports.deletePage = async (req, res, next) => {
  try {
    await pageService.deletePage(req.params.pageId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ================= SECTIONS =================
exports.addSection = async (req, res, next) => {
  try {
    if (req.file) req.body.image = req.file.filename;

    const page = await pageService.addSection(req.params.pageId, req.body);

    res.status(201).json({ success: true, page });
  } catch (err) {
    next(err);
  }
};

exports.updateSection = async (req, res, next) => {
  try {
    if (req.file) req.body.image = req.file.filename;

    const section = await pageService.updateSection(
      req.params.pageId,
      req.params.sectionId,
      req.body,
    );

    res.status(200).json({ success: true, section });
  } catch (err) {
    next(err);
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    await pageService.deleteSection(req.params.pageId, req.params.sectionId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
