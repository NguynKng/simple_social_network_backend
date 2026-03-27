const BaseService = require('./base.service');
const UserRepository = require('../repositories/user.repository');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * UserService - Business logic for User operations
 * Extends BaseService with User-specific business rules
 * 
 * @extends BaseService
 */
class UserService extends BaseService {
  /**
   * Initialize UserService with UserRepository
   */
  constructor() {
    const userRepository = new UserRepository();
    super(userRepository);
  }

  /**
   * Override create method to auto-generate slug
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user
   */
  async create(data) {
    // Validate data trước khi tạo (có thể override trong child class)
    await this.validateCreate(data);

    // Auto-generate unique slug if not provided
    if (!data.slug) {
      data.slug = await this.generateUniqueSlug(data.fullName);
    }

    const record = await this.repository.create(data);

    // Hook sau khi tạo (có thể override)
    await this.afterCreate(record);

    return record;
  }

  /**
   * Generate unique slug from full name
   * Format: firstname.lastname.XXXXXX (6 random digits)
   * Example: "Khang Nguyen" -> "khang.nguyen.652333"
   * @param {String} fullName - User's full name
   * @returns {Promise<String>} Unique slug
   */
  async generateUniqueSlug(fullName) {
    // Convert fullName to slug base
    // Remove Vietnamese diacritics and special characters
    const slugBase = fullName
      .toLowerCase()
      .normalize('NFD') // Decompose Vietnamese characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd') // Replace đ with d
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '.'); // Replace spaces with dots

    // Try to find unique slug (max 10 attempts)
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generate 6 random digits
      const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
      const slug = `${slugBase}.${randomSuffix}`;

      // Check if slug exists
      const exists = await this.repository.slugExists(slug);
      
      if (!exists) {
        return slug;
      }

      attempts++;
    }

    // If all attempts failed, add timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `${slugBase}.${timestamp}`;
  }

  /**
   * Validation hook for user creation
   * @param {Object} data - User data to validate
   * @throws {Error} If validation fails
   */
  async validateCreate(data) {
    const { email, password, fullName } = data;

    // Email validation
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Email không hợp lệ');
    }

    // Full name validation
    if (!fullName || fullName.trim().length < 2) {
      throw new Error('Họ tên phải có ít nhất 2 ký tự');
    }

    // Password validation
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Check for existing email
    const emailExists = await this.repository.emailExists(email);
    if (emailExists) {
      throw new Error('Email đã được sử dụng');
    }

    // Check for existing phone number
    if (data.phoneNumber) {
      const phoneExists = await this.repository.phoneExists(data.phoneNumber);
      if (phoneExists) {
        throw new Error('Số điện thoại đã được sử dụng');
      }
    }

    // Note: Slug will be auto-generated from fullName, no need to validate
    // User can optionally provide slug, which will be validated and used if not exists

    // Validate age if dateOfBirth provided
    if (data.dateOfBirth) {
      const age = Math.floor((new Date() - new Date(data.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 13) {
        throw new Error('Người dùng phải từ 13 tuổi trở lên');
      }
    }
  }

  /**
   * Validation hook for user update
   * @param {String} id - User ID
   * @param {Object} data - Update data
   * @throws {Error} If validation fails
   */
  async validateUpdate(id, data) {
    const { email, slug, role } = data;

    // Don't allow password update through regular update
    if (data.password) {
      throw new Error('Không thể cập nhật mật khẩu qua endpoint này. Sử dụng endpoint thay đổi mật khẩu');
    }

    // Email validation if provided
    if (email) {
      if (!this.isValidEmail(email)) {
        throw new Error('Email không hợp lệ');
      }

      const emailExists = await this.repository.emailExists(email, id);
      if (emailExists) {
        throw new Error('Email đã được sử dụng');
      }
    }

    // Slug validation if provided
    if (slug) {
      if (!this.isValidSlug(slug)) {
        throw new Error('Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang');
      }

      const slugExists = await this.repository.slugExists(slug, id);
      if (slugExists) {
        throw new Error('Slug đã được sử dụng');
      }
    }

    // Role validation if provided
    if (role && !['user', 'admin', 'moderator'].includes(role)) {
      throw new Error('Role không hợp lệ');
    }

    // Validate age if dateOfBirth updated
    if (data.dateOfBirth) {
      const age = Math.floor((new Date() - new Date(data.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 13) {
        throw new Error('Người dùng phải từ 13 tuổi trở lên');
      }
    }
  }

  /**
   * Lifecycle hook after user creation
   * @param {Object} user - Created user document
   */
  async afterCreate(user) {
    // Log user registration
    console.log(`[UserService] New user registered: ${user.slug} (${user.email})`);
    
    // TODO: Send welcome email
    // TODO: Create default user settings
    // TODO: Trigger analytics event
  }

  /**
   * Lifecycle hook after user update
   * @param {Object} user - Updated user document
   */
  async afterUpdate(user) {
    // Log user update
    console.log(`[UserService] User updated: ${user.slug}`);
    
    // TODO: Send notification if important fields changed
    // TODO: Invalidate cache
  }

  /**
   * Get user by email
   * @param {String} email - User email
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} User document or null
   */
  async getByEmail(email, options = {}) {
    return this.repository.findByEmail(email, options);
  }

  /**
   * Get user by slug
   * @param {String} slug - User slug
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} User document or null
   */
  async getBySlug(slug, options = {}) {
    return this.repository.findBySlug(slug, options);
  }

  /**
   * Lấy thông tin người dùng theo slug (public)
   * @param {String} slug - User slug
   * @param {Object} [options] - Query options (populate/select nếu cần)
   * @returns {Promise<Object>} { success, message, status, data }
   */
  async getUserProfileBySlug(slug, options = {}) {
    if (!slug || typeof slug !== 'string' || !this.isValidSlug(slug)) {
      throw new BadRequestError('Slug người dùng không hợp lệ');
    }

    const user = await this.repository.findProfileBySlug(slug, options);

    if (!user || user.isActive === false) {
      throw new NotFoundError('Người dùng không tồn tại');
    }

    return {
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      status: 200,
      data: user,
    };
  }

  /**
   * Update user password
   * @param {String} userId - User ID
   * @param {String} currentPassword - Current password for verification
   * @param {String} newPassword - New password
   * @returns {Promise<Object>} Updated user
   */
  async updatePassword(userId, currentPassword, newPassword) {
    // Get user with password field
    const user = await this.repository.findById(userId, { select: '+password' });
    
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      throw new Error('Mật khẩu hiện tại không đúng');
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    if (currentPassword === newPassword) {
      throw new Error('Mật khẩu mới phải khác mật khẩu cũ');
    }

    // Update password
    return this.repository.updatePassword(userId, newPassword);
  }

  /**
   * Update user profile
   * @param {String} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, profileData) {
    // Remove sensitive fields that shouldn't be updated via profile
    // eslint-disable-next-line no-unused-vars
    const { password, role, isActive, ...safeData } = profileData;

    return this.update(userId, safeData);
  }

  /**
   * Search users
   * @param {String} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async searchUsers(searchTerm, options = {}) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new BadRequestError('Từ khóa tìm kiếm phải có ít nhất 2 ký tự');
    }

    const result = await this.repository.search(searchTerm.trim(), options);

    return {
      success: true,
      message: 'Tìm kiếm người dùng thành công',
      status: 200,
      data: result,
    };
  }

  /**
   * Validate email format
   * @param {String} email - Email to validate
   * @returns {Boolean} True if valid
   * @private
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate slug format
   * @param {String} slug - Slug to validate
   * @returns {Boolean} True if valid
   * @private
   */
  isValidSlug(slug) {
    const slugRegex = /^[a-z0-9.-]+$/;
    return slugRegex.test(slug);
  }
}

module.exports = UserService;
