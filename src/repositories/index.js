/**
 * Central export file for all repositories
 * Import repositories from here for consistency
 */

const BaseRepository = require('./base.repository');
const UserRepository = require('./user.repository');
const PostRepository = require('./post.repository');
const CommentRepository = require('./comment.repository');
const ReactionRepository = require('./reaction.repository');
const NotificationRepository = require('./notification.repository');
const ChatRepository = require('./chat.repository');
const MessageRepository = require('./message.repository');

module.exports = {
  BaseRepository,
  UserRepository,
  PostRepository,
  CommentRepository,
  ReactionRepository,
  NotificationRepository,
  ChatRepository,
  MessageRepository
};
