// middleware/upload.middleware.js
// multer memoryStorage — file disk pe nahi, buffer mein aata hai
// cloudinary.service.js usse upload karta hai

const multer = require("multer");

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only images allowed"));
};

// Memory storage — file buffer mein rehti hai, disk pe nahi jaati
const memoryStorage = multer.memoryStorage();

// Single image (profile)
const uploadSingle = multer({
  storage:    memoryStorage,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
}).single("image");

// Multiple images (listings)
const uploadMultiple = multer({
  storage:    memoryStorage,
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).array("images");

module.exports = { uploadSingle, uploadMultiple };