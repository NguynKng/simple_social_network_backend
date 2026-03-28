/**
 * Central export file for all services
 * Import services from here for consistency
 */

const BaseService = require('./base.service');
const UserService = require('./user.service');
const AuthService = require('./auth.service');
const NotificationService = require('./notification.service');
const ChatService = require('./chat.service');
const MessageService = require('./message.service');

module.exports = {
  BaseService,
  UserService,
  AuthService,
  NotificationService,
  ChatService,
  MessageService
};
