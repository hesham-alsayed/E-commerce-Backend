const multer = require("multer");

const storage = multer.diskStorage({});

exports.uploadBanner = multer({ storage });