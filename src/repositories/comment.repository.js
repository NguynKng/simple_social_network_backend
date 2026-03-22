const BaseRepository = require("./base.repository");
const Comment = require("../models/Comment.model");

class CommentRepository extends BaseRepository {
  constructor() {
    super(Comment);
  }

  async createComment(data) {
    return this.create(data);
  }

  async getCommentById(commentId, options = {}) {
    const { populate = [] } = options;
    return this.model.findById(commentId).populate(populate);
  }

  async getCommentsByPost(postId) {
    return this.model
      .find({ post: postId })
      .sort({ createdAt: 1 })
      .populate("user", "fullName avatar slug")
      .lean();
  }
}

module.exports = CommentRepository;