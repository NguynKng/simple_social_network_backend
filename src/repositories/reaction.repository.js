const BaseRepository = require("./base.repository");
const Reaction = require("../models/Reaction.model");

class ReactionRepository extends BaseRepository {
  constructor() {
    super(Reaction);
  }

  async findByPostAndUser(postId, userId) {
    return this.model.findOne({ post: postId, user: userId });
  }

  async createReaction(data) {
    return this.create(data);
  }

  async updateReactionType(reactionId, type) {
    return this.model.findByIdAndUpdate(reactionId, { type }, { new: true });
  }

  async deleteReactionById(reactionId) {
    return this.model.findByIdAndDelete(reactionId);
  }
}

module.exports = ReactionRepository;