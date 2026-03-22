const PostService = require("../services/post.service");

const postService = new PostService();

const parseMaybeJsonArray = (value, fallback = []) => {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
};

class PostController {
  static async create_post(req, res, next) {
    try {
      const userId = req.user?.id;
      const payload = {
        ...req.body,
        media: parseMaybeJsonArray(req.body.media, parseMaybeJsonArray(req.body.images, [])),
        videos: parseMaybeJsonArray(req.body.videos, []),
        taggedUsers: parseMaybeJsonArray(req.body.taggedUsers, []),
        mediaOrder: parseMaybeJsonArray(req.body.mediaOrder, []),
      };
      const result = await postService.create_post(payload, userId, req.files);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPost(req, res, next) {
    try {
      const result = await postService.getPost();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPostByOwner(req, res, next) {
    try {
      const ownerId = req.params.ownerId || req.user?.id;
      const result = await postService.getPostByOwner(ownerId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPostById(req, res, next) {
    try {
      const { postId } = req.params;
      const result = await postService.getPostById(postId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async DeletePost(req, res, next) {
    try {
      const { postId } = req.params;
      const userId = req.user?.id;
      const result = await postService.DeletePost(postId, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PostController;