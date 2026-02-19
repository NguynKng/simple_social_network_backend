/**
 * Central export file for all repositories
 * Import repositories from here for consistency
 */

const BaseRepository = require('./base.repository');
const UserRepository = require('./user.repository');

module.exports = {
  BaseRepository,
  UserRepository
};
