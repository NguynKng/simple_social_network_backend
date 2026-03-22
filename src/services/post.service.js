const mongoose = require("mongoose");
const { Post } = require("../models");
const { uploadToCloudinary } = require("../utils/cloudinary");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors");

class PostService {
  async create_post(payload = {}, userId, files = {}) {
    if (!userId) {
      throw new BadRequestError("Thiếu thông tin người dùng");
    }

    const {
      content = "",
      media = [],
      videos = [],
      taggedUsers = [],
      mediaOrder = [],
    } = payload;

    const imageFiles = Array.isArray(files.images)
      ? files.images
      : Array.isArray(files.media)
        ? files.media
        : [];
    const videoFiles = Array.isArray(files.videos) ? files.videos : [];

    const uploadedImageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        const result = await uploadToCloudinary(file.buffer, "post");
        return result.secure_url;
      }),
    );

    const uploadedVideoUrls = await Promise.all(
      videoFiles.map(async (file) => {
        const result = await uploadToCloudinary(file.buffer, "video");
        return result.secure_url;
      }),
    );

    const mediaUrls = [...media, ...uploadedImageUrls].filter(Boolean);
    const videoUrls = [...videos, ...uploadedVideoUrls].filter(Boolean);

    const hasContent = typeof content === "string" && content.trim().length > 0;
    const hasMedia = mediaUrls.length > 0;
    const hasVideos = videoUrls.length > 0;

    if (!hasContent && !hasMedia && !hasVideos) {
      throw new BadRequestError("Bài viết phải có nội dung hoặc media/video");
    }

    const post = await Post.create({
      author: userId,
      content: content.trim(),
      media: mediaUrls,
      videos: videoUrls,
      taggedUsers,
      mediaOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const populatedPost = await Post.findById(post._id)
      .populate("author", "fullName avatar slug")
      .populate("taggedUsers", "fullName avatar slug");

    return {
      success: true,
      status: 201,
      message: "Tạo bài viết thành công",
      data: populatedPost,
    };
  }

  async getPost() {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate("author", "fullName avatar slug")
      .populate("taggedUsers", "fullName avatar slug")
      .populate("reactions")
      .populate("comments");

    return {
      success: true,
      status: 200,
      message: "Lấy danh sách bài viết thành công",
      data: posts,
    };
  }

  async getPostByOwner(ownerId) {
    if (!ownerId) {
      throw new BadRequestError("Thiếu ownerId");
    }

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestError("ownerId không hợp lệ");
    }

    const posts = await Post.find({ author: ownerId })
      .sort({ createdAt: -1 })
      .populate("author", "fullName avatar slug")
      .populate("taggedUsers", "fullName avatar slug")
      .populate("reactions")
      .populate("comments");

    return {
      success: true,
      status: 200,
      message: "Lấy bài viết theo chủ sở hữu thành công",
      data: posts,
    };
  }

  async getPostById(postId) {
    if (!postId) {
      throw new BadRequestError("Thiếu postId");
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestError("postId không hợp lệ");
    }

    const post = await Post.findById(postId)
      .populate("author", "fullName avatar slug")
      .populate("taggedUsers", "fullName avatar slug")
      .populate("reactions")
      .populate("comments");

    if (!post) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    return {
      success: true,
      status: 200,
      message: "Lấy chi tiết bài viết thành công",
      data: post,
    };
  }

  async DeletePost(postId, userId) {
    if (!postId) {
      throw new BadRequestError("Thiếu postId");
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestError("postId không hợp lệ");
    }

    const post = await Post.findById(postId);
    if (!post) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    if (post.author.toString() !== String(userId)) {
      throw new ForbiddenError("Bạn không có quyền xóa bài viết này");
    }

    await Post.findByIdAndDelete(postId);

    return {
      success: true,
      status: 200,
      message: "Xóa bài viết thành công",
      data: null,
    };
  }
}

module.exports = PostService;