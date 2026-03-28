const mongoose = require("mongoose");
const PostRepository = require("../repositories/post.repository");
const CommentRepository = require("../repositories/comment.repository");
const ReactionRepository = require("../repositories/reaction.repository");
const NotificationService = require("./notification.service");
const { uploadToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors");

const REACTION_TYPES = ["Like", "Love", "Haha", "Sad", "Angry", "Wow", "Care"];

class PostService {
  constructor() {
    this.postRepository = new PostRepository();
    this.commentRepository = new CommentRepository();
    this.reactionRepository = new ReactionRepository();
    this.notificationService = new NotificationService();
  }

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

    const post = await this.postRepository.create({
      author: userId,
      content: content.trim(),
      media: mediaUrls,
      videos: videoUrls,
      taggedUsers,
      mediaOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const populatedPost = await this.postRepository.getPostDetail(post._id);

    try {
      await this.notificationService.sendNotificationToFriends(userId, 'new_post', {
        postId: String(post._id),
      });
    } catch (error) {
      logger.warn('Send notification after post creation failed', {
        userId,
        postId: String(post._id),
        error: error.message,
      });
    }

    return {
      success: true,
      status: 201,
      message: "Tạo bài viết thành công",
      data: populatedPost,
    };
  }

  async getPost() {
    const posts = await this.postRepository.getFeedPosts();

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

    const posts = await this.postRepository.getPostsByOwner(ownerId);

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

    const post = await this.postRepository.getPostDetail(postId);

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

    const post = await this.postRepository.getPostForWrite(postId);
    if (!post) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    if (post.author.toString() !== String(userId)) {
      throw new ForbiddenError("Bạn không có quyền xóa bài viết này");
    }

    await this.postRepository.deletePostById(postId);

    return {
      success: true,
      status: 200,
      message: "Xóa bài viết thành công",
      data: null,
    };
  }

  async addComment(postId, userId, content) {
    if (!userId) {
      throw new BadRequestError("Thiếu thông tin người dùng");
    }
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestError("postId không hợp lệ");
    }
    if (!content || !content.trim()) {
      throw new BadRequestError("Nội dung comment không được để trống");
    }

    const post = await this.postRepository.getPostForWrite(postId);
    if (!post) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    const comment = await this.commentRepository.createComment({
      post: postId,
      user: userId,
      content: content.trim(),
      parent: null,
      createdAt: new Date(),
    });

    await this.postRepository.addComment(postId, comment._id);

    const populatedComment = await this.commentRepository.getCommentById(
      comment._id,
      { populate: [{ path: "user", select: "fullName avatar slug" }] },
    );

    return {
      success: true,
      status: 201,
      message: "Thêm comment thành công",
      data: populatedComment,
    };
  }

  async addReply(postId, parentCommentId, userId, content) {
    if (!userId) {
      throw new BadRequestError("Thiếu thông tin người dùng");
    }
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestError("postId không hợp lệ");
    }
    if (!parentCommentId || !mongoose.Types.ObjectId.isValid(parentCommentId)) {
      throw new BadRequestError("parentCommentId không hợp lệ");
    }
    if (!content || !content.trim()) {
      throw new BadRequestError("Nội dung reply không được để trống");
    }

    const [post, parentComment] = await Promise.all([
      this.postRepository.getPostForWrite(postId),
      this.commentRepository.getCommentById(parentCommentId),
    ]);

    if (!post) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }
    if (!parentComment) {
      throw new NotFoundError("Không tìm thấy comment cha");
    }
    if (String(parentComment.post) !== String(postId)) {
      throw new BadRequestError("Comment cha không thuộc bài viết này");
    }

    const reply = await this.commentRepository.createComment({
      post: postId,
      user: userId,
      content: content.trim(),
      parent: parentCommentId,
      createdAt: new Date(),
    });

    await this.postRepository.addComment(postId, reply._id);

    const populatedReply = await this.commentRepository.getCommentById(reply._id, {
      populate: [
        { path: "user", select: "fullName avatar slug" },
        { path: "parent", select: "content user" },
      ],
    });

    return {
      success: true,
      status: 201,
      message: "Thêm reply thành công",
      data: populatedReply,
    };
  }

  async getCommentByPost(postId) {
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestError("postId không hợp lệ");
    }

    const post = await this.postRepository.getPostForWrite(postId);
    if (!post) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    const comments = await this.commentRepository.getCommentsByPost(postId);

    const roots = [];
    const commentMap = new Map();

    comments.forEach((item) => {
      commentMap.set(String(item._id), { ...item, replies: [] });
    });

    commentMap.forEach((item) => {
      if (!item.parent) {
        roots.push(item);
      } else {
        const parent = commentMap.get(String(item.parent));
        if (parent) {
          parent.replies.push(item);
        }
      }
    });

    return {
      success: true,
      status: 200,
      message: "Lấy danh sách comment thành công",
      data: roots,
    };
  }

  async ReactTopost(postId, userId, type) {
    if (!userId) {
      throw new BadRequestError("Thiếu thông tin người dùng");
    }
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestError("postId không hợp lệ");
    }
    if (!REACTION_TYPES.includes(type)) {
      throw new BadRequestError("Loại reaction không hợp lệ");
    }

    const post = await this.postRepository.getPostForWrite(postId);
    if (!post) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    const existedReaction = await this.reactionRepository.findByPostAndUser(postId, userId);

    if (existedReaction) {
      if (existedReaction.type === type) {
        await this.reactionRepository.deleteReactionById(existedReaction._id);
        await this.postRepository.removeReaction(postId, existedReaction._id);

        return {
          success: true,
          status: 200,
          message: "Đã bỏ reaction",
          data: { reacted: false, type: null },
        };
      }

      await this.reactionRepository.updateReactionType(existedReaction._id, type);

      return {
        success: true,
        status: 200,
        message: "Đã cập nhật reaction",
        data: { reacted: true, type },
      };
    }

    const reaction = await this.reactionRepository.createReaction({
      user: userId,
      post: postId,
      type,
      createdAt: new Date(),
    });

    await this.postRepository.addReaction(postId, reaction._id);

    return {
      success: true,
      status: 201,
      message: "Đã reaction bài viết",
      data: { reacted: true, type },
    };
  }
}

module.exports = PostService;