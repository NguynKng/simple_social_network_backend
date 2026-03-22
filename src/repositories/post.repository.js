const BaseRepository = require("./base.repository");
const Post = require("../models/Post.model");

class PostRepository extends BaseRepository {
  constructor() {
    super(Post);
  }

  async getFeedPosts() {
    return this.model
      .find({})
      .sort({ createdAt: -1 })
      .populate("author", "fullName avatar slug")
      .populate("taggedUsers", "fullName avatar slug")
      .populate("reactions")
      .populate("comments");
  }

  async getPostsByOwner(ownerId) {
    return this.model
      .find({ author: ownerId })
      .sort({ createdAt: -1 })
      .populate("author", "fullName avatar slug")
      .populate("taggedUsers", "fullName avatar slug")
      .populate("reactions")
      .populate("comments");
  }

  async getPostDetail(postId) {
    return this.model
      .findById(postId)
      .populate("author", "fullName avatar slug")
      .populate("taggedUsers", "fullName avatar slug")
      .populate("reactions")
      .populate("comments");
  }

  async getPostForWrite(postId) {
    return this.model.findById(postId);
  }

  async addComment(postId, commentId) {
    return this.model.findByIdAndUpdate(postId, {
      $addToSet: { comments: commentId },
      $set: { updatedAt: new Date() },
    });
  }

  async addReaction(postId, reactionId) {
    return this.model.findByIdAndUpdate(postId, {
      $addToSet: { reactions: reactionId },
      $set: { updatedAt: new Date() },
    });
  }

  async removeReaction(postId, reactionId) {
    return this.model.findByIdAndUpdate(postId, {
      $pull: { reactions: reactionId },
      $set: { updatedAt: new Date() },
    });
  }

  async deletePostById(postId) {
    return this.model.findByIdAndDelete(postId);
  }
}

module.exports = PostRepository;