const BaseService = require("./base.service");
const UserRepository = require("../repositories/user.repository");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinary");
const { isValidObjectId } = require("../utils/database.util");
const NotificationService = require("./notification.service");
const logger = require("../utils/logger");

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
    this.notificationService = new NotificationService();
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
      .normalize("NFD") // Decompose Vietnamese characters
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/đ/g, "d") // Replace đ with d
      .replace(/[^a-z0-9\s]/g, "") // Remove special characters
      .trim()
      .replace(/\s+/g, "."); // Replace spaces with dots

    // Try to find unique slug (max 10 attempts)
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generate 6 random digits
      const randomSuffix = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
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
      throw new Error("Email không hợp lệ");
    }

    // Full name validation
    if (!fullName || fullName.trim().length < 2) {
      throw new Error("Họ tên phải có ít nhất 2 ký tự");
    }

    // Password validation
    if (!password || password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Check for existing email
    const emailExists = await this.repository.emailExists(email);
    if (emailExists) {
      throw new Error("Email đã được sử dụng");
    }

    // Check for existing phone number
    if (data.phoneNumber) {
      const phoneExists = await this.repository.phoneExists(data.phoneNumber);
      if (phoneExists) {
        throw new Error("Số điện thoại đã được sử dụng");
      }
    }

    // Note: Slug will be auto-generated from fullName, no need to validate
    // User can optionally provide slug, which will be validated and used if not exists

    // Validate age if dateOfBirth provided
    if (data.dateOfBirth) {
      const age = Math.floor(
        (new Date() - new Date(data.dateOfBirth)) /
          (365.25 * 24 * 60 * 60 * 1000),
      );
      if (age < 13) {
        throw new Error("Người dùng phải từ 13 tuổi trở lên");
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
      throw new Error(
        "Không thể cập nhật mật khẩu qua endpoint này. Sử dụng endpoint thay đổi mật khẩu",
      );
    }

    // Email validation if provided
    if (email) {
      if (!this.isValidEmail(email)) {
        throw new Error("Email không hợp lệ");
      }

      const emailExists = await this.repository.emailExists(email, id);
      if (emailExists) {
        throw new Error("Email đã được sử dụng");
      }
    }

    // Slug validation if provided
    if (slug) {
      if (!this.isValidSlug(slug)) {
        throw new Error(
          "Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang",
        );
      }

      const slugExists = await this.repository.slugExists(slug, id);
      if (slugExists) {
        throw new Error("Slug đã được sử dụng");
      }
    }

    // Role validation if provided
    if (role && !["user", "admin", "moderator"].includes(role)) {
      throw new Error("Role không hợp lệ");
    }

    // Validate age if dateOfBirth updated
    if (data.dateOfBirth) {
      const age = Math.floor(
        (new Date() - new Date(data.dateOfBirth)) /
          (365.25 * 24 * 60 * 60 * 1000),
      );
      if (age < 13) {
        throw new Error("Người dùng phải từ 13 tuổi trở lên");
      }
    }
  }

  /**
   * Lifecycle hook after user creation
   * @param {Object} user - Created user document
   */
  async afterCreate(user) {
    // Log user registration
    console.log(
      `[UserService] New user registered: ${user.slug} (${user.email})`,
    );

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
    if (!slug || typeof slug !== "string" || !this.isValidSlug(slug)) {
      throw new BadRequestError("Slug người dùng không hợp lệ");
    }

    const user = await this.repository.findProfileBySlug(slug, options);

    if (!user || user.isActive === false) {
      throw new NotFoundError("Người dùng không tồn tại");
    }

    return {
      success: true,
      message: "Lấy thông tin người dùng thành công",
      status: 200,
      data: user,
    };
  }

  async setAvatar(userId, file) {
    if (!userId) {
      throw new BadRequestError("Thiếu userId");
    }

    if (!file || !file.buffer) {
      throw new BadRequestError("Vui lòng tải lên ảnh avatar");
    }

    const user = await this.repository.findById(userId, {
      select: "avatar",
    });

    if (!user) {
      throw new NotFoundError("Người dùng không tồn tại");
    }

    const uploadResult = await uploadToCloudinary(file.buffer, "avatar");
    const previousAvatar = user.avatar;

    await this.repository.update(userId, { avatar: uploadResult.public_id });

    if (previousAvatar && previousAvatar !== "default-avatar") {
      try {
        await deleteFromCloudinary(previousAvatar);
      } catch (_error) {
        // Ignore cleanup failure to keep update flow successful.
      }
    }

    return {
      success: true,
      message: "Cập nhật avatar thành công",
      status: 200,
      data: {
        avatar: uploadResult.public_id,
      },
    };
  }

  async setCoverPhoto(userId, file) {
    if (!userId) {
      throw new BadRequestError("Thiếu userId");
    }

    if (!file || !file.buffer) {
      throw new BadRequestError("Vui lòng tải lên ảnh cover");
    }

    const user = await this.repository.findById(userId, {
      select: "coverPhoto",
    });

    if (!user) {
      throw new NotFoundError("Người dùng không tồn tại");
    }

    const uploadResult = await uploadToCloudinary(file.buffer, "cover");
    const previousCoverPhoto = user.coverPhoto;

    await this.repository.update(userId, {
      coverPhoto: uploadResult.public_id,
    });

    if (
      previousCoverPhoto &&
      previousCoverPhoto !== "background-gray-default"
    ) {
      try {
        await deleteFromCloudinary(previousCoverPhoto);
      } catch (_error) {
        // Ignore cleanup failure to keep update flow successful.
      }
    }

    return {
      success: true,
      message: "Cập nhật ảnh bìa thành công",
      status: 200,
      data: {
        coverPhoto: uploadResult.public_id,
      },
    };
  }

  async sendFriendRequest(senderId, targetUserId) {
    this.validateFriendActionIds(senderId, targetUserId);

    if (String(senderId) === String(targetUserId)) {
      throw new BadRequestError("Không thể gửi lời mời kết bạn cho chính mình");
    }

    const [sender, targetUser] = await Promise.all([
      this.repository.findById(senderId, { select: "_id isActive" }),
      this.repository.findById(targetUserId, {
        select: "_id friends friendRequests isActive",
      }),
    ]);

    if (!sender || sender.isActive === false) {
      throw new NotFoundError("Người gửi không tồn tại");
    }

    if (!targetUser || targetUser.isActive === false) {
      throw new NotFoundError("Người nhận không tồn tại");
    }

    const isAlreadyFriend = targetUser.friends?.some(
      (friendId) => String(friendId) === String(senderId),
    );
    if (isAlreadyFriend) {
      throw new BadRequestError("Hai người đã là bạn bè");
    }

    const requestAlreadySent = targetUser.friendRequests?.some(
      (requestId) => String(requestId) === String(senderId),
    );
    if (requestAlreadySent) {
      throw new BadRequestError("Đã gửi lời mời kết bạn trước đó");
    }

    await this.repository.addFriendRequest(targetUserId, senderId);
    const updatedSender = await this.getFriendActionProfile(senderId);

    try {
      await this.notificationService.sendNotification(
        targetUserId,
        senderId,
        "friend_request",
      );
    } catch (error) {
      logger.warn("Send notification after friend request failed", {
        senderId,
        targetUserId,
        error: error.message,
      });
    }

    return {
      success: true,
      message: "Gửi lời mời kết bạn thành công",
      status: 200,
      data: updatedSender,
    };
  }

  async cancelFriendRequest(senderId, targetUserId) {
    this.validateFriendActionIds(senderId, targetUserId);

    const targetUser = await this.repository.findById(targetUserId, {
      select: "_id friendRequests isActive",
    });

    if (!targetUser || targetUser.isActive === false) {
      throw new NotFoundError("Người nhận không tồn tại");
    }

    await this.repository.removeFriendRequest(targetUserId, senderId);
    const updatedSender = await this.getFriendActionProfile(senderId);

    return {
      success: true,
      message: "Hủy lời mời kết bạn thành công",
      status: 200,
      data: updatedSender,
    };
  }

  async acceptFriendRequest(userId, requesterId) {
    this.validateFriendActionIds(userId, requesterId);

    if (String(userId) === String(requesterId)) {
      throw new BadRequestError("Không thể chấp nhận lời mời của chính mình");
    }

    const [user, requester] = await Promise.all([
      this.repository.findById(userId, {
        select: "_id friends friendRequests isActive",
      }),
      this.repository.findById(requesterId, { select: "_id friends isActive" }),
    ]);

    if (!user || user.isActive === false) {
      throw new NotFoundError("Người dùng không tồn tại");
    }

    if (!requester || requester.isActive === false) {
      throw new NotFoundError("Người gửi lời mời không tồn tại");
    }

    const requestExists = user.friendRequests?.some(
      (requestId) => String(requestId) === String(requesterId),
    );
    if (!requestExists) {
      throw new BadRequestError("Không tìm thấy lời mời kết bạn");
    }

    await Promise.all([
      this.repository.removeFriendRequest(userId, requesterId),
      this.repository.addFriend(userId, requesterId),
      this.repository.addFriend(requesterId, userId),
    ]);

    try {
      await this.notificationService.sendNotification(
        requesterId,
        userId,
        "accepted_request",
      );
    } catch (error) {
      logger.warn("Send notification after accepting friend request failed", {
        userId,
        requesterId,
        error: error.message,
      });
    }

    const updatedUser = await this.getFriendActionProfile(userId);

    return {
      success: true,
      message: "Chấp nhận lời mời kết bạn thành công",
      status: 200,
      data: updatedUser,
    };
  }

  async rejectFriendRequest(userId, requesterId) {
    this.validateFriendActionIds(userId, requesterId);

    const [user, requester] = await Promise.all([
      this.repository.findById(userId, {
        select: "_id friendRequests isActive",
      }),
      this.repository.findById(requesterId, {
        select: "_id isActive",
      }),
    ]);

    if (!user || user.isActive === false) {
      throw new NotFoundError("Người dùng không tồn tại");
    }

    if (!requester || requester.isActive === false) {
      throw new NotFoundError("Người gửi lời mời không tồn tại");
    }

    const requestExists = user.friendRequests?.some(
      (requestId) => String(requestId) === String(requesterId),
    );
    if (!requestExists) {
      throw new BadRequestError("Không tìm thấy lời mời kết bạn");
    }

    await this.repository.removeFriendRequest(userId, requesterId);
    const updatedUser = await this.getFriendActionProfile(userId);

    return {
      success: true,
      message: "Từ chối lời mời kết bạn thành công",
      status: 200,
      data: updatedUser,
    };
  }

  async unfriend(userId, friendId) {
    this.validateFriendActionIds(userId, friendId);

    if (String(userId) === String(friendId)) {
      throw new BadRequestError("Không thể hủy kết bạn với chính mình");
    }

    const [user, friend] = await Promise.all([
      this.repository.findById(userId, { select: "_id friends isActive" }),
      this.repository.findById(friendId, { select: "_id isActive" }),
    ]);

    if (!user || user.isActive === false) {
      throw new NotFoundError("Người dùng không tồn tại");
    }

    if (!friend || friend.isActive === false) {
      throw new NotFoundError("Bạn bè không tồn tại");
    }

    const isFriend = user.friends?.some(
      (currentFriendId) => String(currentFriendId) === String(friendId),
    );
    if (!isFriend) {
      throw new BadRequestError("Hai người chưa là bạn bè");
    }

    await Promise.all([
      this.repository.removeFriend(userId, friendId),
      this.repository.removeFriend(friendId, userId),
      this.repository.removeFriendRequest(userId, friendId),
      this.repository.removeFriendRequest(friendId, userId),
    ]);
    const updatedUser = await this.getFriendActionProfile(userId);

    return {
      success: true,
      message: "Hủy kết bạn thành công",
      status: 200,
      data: updatedUser,
    };
  }

  async getFriendActionProfile(userId) {
    return this.repository.findById(userId, {
      select: "-password -email -phoneNumber",
      populate: [
        { path: "friends", select: "fullName avatar slug" },
        { path: "friendRequests", select: "fullName avatar slug" },
      ],
    });
  }

  validateFriendActionIds(userId, targetUserId) {
    if (!userId || !targetUserId) {
      throw new BadRequestError("Thiếu userId hoặc targetUserId");
    }

    if (!isValidObjectId(userId) || !isValidObjectId(targetUserId)) {
      throw new BadRequestError("ID người dùng không hợp lệ");
    }
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
    const user = await this.repository.findById(userId, {
      select: "+password",
    });

    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
    }

    if (currentPassword === newPassword) {
      throw new Error("Mật khẩu mới phải khác mật khẩu cũ");
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
    const result = await this.repository.search(searchTerm.trim(), options);

    return {
      success: true,
      message: "Tìm kiếm người dùng thành công",
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
