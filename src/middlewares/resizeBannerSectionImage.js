const sharp = require("sharp");
const AppError = require("../../utils/AppError");

exports.resizeBannerImage = async (req, res, next) => {
  const section = req.section;

  // check section type
  const type = section?.type || req.body.type;
  // if type not banner call next()
  if (type !== "banner") return next();

  if (!req.file) return next();

  try {
    const metadata = await sharp(req.file.buffer).metadata();
    const { width, height, format } = metadata;

    // ✅ format
    const allowedFormats = ["jpeg", "jpg", "png", "webp"];
    if (!allowedFormats.includes(format)) {
      return next(new AppError("Invalid image format", 400));
    }

    // check width , height
    if (width < 1200 || height < 600) {
      return next(
        new AppError("Image dimensions too small (min 1200x600)", 400),
      );
    }

    const filename = `banner-${Date.now()}.jpeg`;

    const buffer = await sharp(req.file.buffer)
      .resize(1200, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();

    req.file.filename = filename;
    req.file.buffer = buffer;

    next();
  } catch (err) {
    next(new AppError("Error processing image", 500));
  }
};
