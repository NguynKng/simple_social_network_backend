/**
 * Central export file for all services
 * Import services from here for consistency
 */

const BaseService = require('./base.service');
const UserService = require('./user.service');
const AuthService = require('./auth.service');

module.exports = {
  BaseService,
  UserService,
  AuthService
};
