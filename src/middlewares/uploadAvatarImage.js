const cloudinary = require("../config/cloudinary");

exports.uploadAvatarToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const file = req.file;

    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      {
        folder: "avatars",
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      },
    );

    // 👇 ندمج النتيجة في body
    req.body.avatar = result.secure_url;
    req.body.avatarPublicId = result.public_id;

    next();
  } catch (err) {
    return res.status(500).json({
      message: "Image upload failed",
      error: err.message,
    });
  }
};
