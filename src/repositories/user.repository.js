const BaseRepository = require('./base.repository');
const User = require('../models/User.model');
const { isValidObjectId } = require('../utils/database.util');

/**
 * UserRepository - Data access layer for User model
 * Extends BaseRepository with User-specific queries
 * 
 * @extends BaseRepository
 */
class UserRepository extends BaseRepository {
  /**
   * Initialize UserRepository with User model
   */
  constructor() {
    super(User);
  }

  /**
   * Find user by email
   * @param {String} email - User email
   * @param {Object} options - Query options
   * @param {Boolean} [options.includeDeleted=false] - Include soft deleted users
   * @param {String|Array} [options.select] - Fields to select/exclude
   * @returns {Promise<Object|null>} User document or null
   */
  async findByEmail(email, options = {}) {
    const query = this.model.findOne({ email: email.toLowerCase() });
    
    if (!options.includeDeleted) {
      query.where('deletedAt').equals(null);
    }
    
    if (options.select) {
      query.select(options.select);
    }
    
    return query.exec();
  }

  /**
   * Find user by slug
   * @param {String} slug - User slug
   * @param {Object} options - Query options
   * @param {Boolean} [options.includeDeleted=false] - Include soft deleted users
   * @param {String|Array} [options.select] - Fields to select/exclude
   * @returns {Promise<Object|null>} User document or null
   */
  async findBySlug(slug, options = {}) {
    const query = this.model.findOne({ slug: slug.toLowerCase() });
    
    if (!options.includeDeleted) {
      query.where('deletedAt').equals(null);
    }
    
    if (options.select) {
      query.select(options.select);
    }
    
    return query.exec();
  }

  /**
   * Check if email already exists
   * @param {String} email - Email to check
   * @param {String} [excludeUserId] - User ID to exclude (for updates)
   * @returns {Promise<Boolean>} True if email exists
   */
  async emailExists(email, excludeUserId = null) {
    const query = { email: email.toLowerCase(), deletedAt: null };
    
    if (excludeUserId && isValidObjectId(excludeUserId)) {
      query._id = { $ne: excludeUserId };
    }
    
    const count = await this.model.countDocuments(query);
    return count > 0;
  }

  /**
   * Check if slug already exists
   * @param {String} slug - Slug to check
   * @param {String} [excludeUserId] - User ID to exclude (for updates)
   * @returns {Promise<Boolean>} True if slug exists
   */
  async slugExists(slug, excludeUserId = null) {
    const query = { slug: slug.toLowerCase(), deletedAt: null };
    
    if (excludeUserId && isValidObjectId(excludeUserId)) {
      query._id = { $ne: excludeUserId };
    }
    
    const count = await this.model.countDocuments(query);
    return count > 0;
  }

  /**
   * Check if phone number already exists
   * @param {String} phoneNumber - Phone number to check
   * @param {String} [excludeUserId] - User ID to exclude (for updates)
   * @returns {Promise<Boolean>} True if phone number exists
   */
  async phoneExists(phoneNumber, excludeUserId = null) {
    if (!phoneNumber) return false;
    
    const query = { phoneNumber, deletedAt: null };
    
    if (excludeUserId && isValidObjectId(excludeUserId)) {
      query._id = { $ne: excludeUserId };
    }
    
    const count = await this.model.countDocuments(query);
    return count > 0;
  }

  /**
   * Update user password
   * @param {String} userId - User ID
   * @param {String} newPassword - New password (will be hashed by model)
   * @returns {Promise<Object>} Updated user
   */
  async updatePassword(userId, newPassword) {
    const user = await this.findByIdOrFail(userId);
    user.password = newPassword;
    await user.save();
    return user;
  }

  /**
   * Search users by name, slug, or email
   * @param {String} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async search(searchTerm, options = {}) {
    const searchRegex = new RegExp(searchTerm, 'i');
    
    const filter = {
      $or: [
        { fullName: searchRegex },
        { slug: searchRegex },
        { email: searchRegex }
      ],
      deletedAt: null
    };
    
    return this.paginate(filter, options);
  }
}

module.exports = UserRepository;
