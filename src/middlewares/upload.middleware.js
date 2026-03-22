// middleware/upload.js
const fs = require("fs");
const multer = require("multer");

const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|jfif)$/)) {
    return cb(new Error("Only image files allowed!"), false);
  }
  cb(null, true);
};

const postMediaFilter = (req, file, cb) => {
  if (file.fieldname === "images" && file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  if (file.fieldname === "videos" && file.mimetype.startsWith("video/")) {
    cb(null, true);
    return;
  }

  cb(new Error("Only image files for images and video files for videos are allowed!"), false);
};

const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error("Only video files allowed!"), false);
  }
};
// ---- UPLOAD RULES -----
const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single("avatar");

const uploadCoverPhoto = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single("coverPhoto");

const uploadPostImages = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: postMediaFilter,
}).fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 3 },
]);

const uploadChatImages = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).array("images", 10);

const uploadVideo = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: videoFilter,
}).single("video");

// ---- WRAPPER -----
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadAvatarMiddleware: handleUpload(uploadAvatar),
  uploadCoverPhotoMiddleware: handleUpload(uploadCoverPhoto),
  uploadOptionalPostImagesMiddleware: handleUpload(uploadPostImages),
  uploadChatImagesMiddleware: handleUpload(uploadChatImages),
  uploadVideoMiddleware: handleUpload(uploadVideo),
  ensureDirectoryExists,
};