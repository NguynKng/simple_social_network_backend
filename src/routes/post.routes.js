const express = require("express");
const PostController = require("../controllers/post.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { uploadOptionalPostImagesMiddleware } = require("../middlewares/upload.middleware");

const router = express.Router();

router.post("/", authenticate, uploadOptionalPostImagesMiddleware, PostController.create_post);
router.get("/", PostController.getPost);
router.get("/owner/:ownerId?", authenticate, PostController.getPostByOwner);
router.get("/:postId", PostController.getPostById);
router.delete("/:postId", authenticate, PostController.DeletePost);

module.exports = router;