// uploadMiddleware.js

const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb(new Error("Only images allowed"), false);
};

const upload = multer({ storage, fileFilter });

// 🔥 factory function
exports.upload = (type, fieldName) => {
  if (type === "single") return upload.single(fieldName);

  if (type === "array") return upload.array(fieldName);

  if (type === "fields") return upload.fields(fieldName);

  if (type === "any") return upload.any();
};
