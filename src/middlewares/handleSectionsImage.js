const cloudinary = require("../config/cloudinary");
exports.handleSectionImages = async (req, res, next) => {
  try {
    let sections = req.body.sections;

    if (typeof sections === "string") {
      sections = JSON.parse(sections);
    }

    if (req.files?.length) {
      for (const file of req.files) {
        const match = file.fieldname.match(/images\[(.+?)\]/);

        if (!match) continue;

        const sectionId = match[1];

        const result = await cloudinary.uploader.upload(file.path, {
          folder: "pages",
        });

        const section = sections.find((s) => s.id === sectionId);

        if (section) {
          section.props.image = {
            url: result.secure_url,
          };
        }
      }
    }

    req.body.sections = sections;
    next();
  } catch (err) {
    next(err);
  }
};
