const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserService = require("./user.service");
const emailUtil = require("../utils/email.util");
const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require("../utils/errors");
const { validateEmail } = require("../utils/validate");
const config = require("../config/envVars");

/**
 * AuthService - Business logic for authentication and authorization
 * Handles user registration, login, token generation and validation
 */
class AuthService {
  /**
   * Initialize AuthService with UserService
   */
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {String} userData.email - User email
   * @param {String} userData.password - Password
   * @param {String} userData.fullName - Full name
   * @param {String} [userData.phoneNumber] - Phone number
   * @param {Date} [userData.dateOfBirth] - Date of birth
   * @param {String} [userData.gender] - Gender (male, female, other, prefer-not-to-say)
   * @returns {Promise<Object>} User, verification token
   */
  async register(userData) {
    // Validation
    if (!userData) {
      throw new BadRequestError("All fields are required");
    }

    const { email, password, fullName, phoneNumber, dateOfBirth, gender } =
      userData;

    // Validate required fields
    if (
      !email ||
      !password ||
      !fullName ||
      !phoneNumber ||
      !dateOfBirth ||
      !gender
    ) {
      throw new BadRequestError("All fields are required");
    }

    if (!validateEmail(email)) {
      throw new BadRequestError("Email không hợp lệ");
    }

    // Validate password length
    if (password.length < 6) {
      throw new BadRequestError("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Generate 6-digit OTP
    const otp = emailUtil.generateVerificationCode();

    // Hash OTP for JWT token (using SHA256)
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Create user through UserService (includes validation)
    let user;
    try {
      user = await this.userService.create({
        email,
        password,
        fullName,
        phoneNumber,
        dateOfBirth,
        gender,
        role: "user",
        isActive: true,
        isVerified: false, // Not verified yet
      });
    } catch (error) {
      // Wrap UserService errors with appropriate error classes
      if (error.message.includes("Email đã được sử dụng")) {
        throw new ConflictError("Email đã được sử dụng");
      }
      if (error.message.includes("Số điện thoại đã được sử dụng")) {
        throw new ConflictError("Số điện thoại đã được sử dụng");
      }
      if (error.message.includes("Slug đã được sử dụng")) {
        throw new ConflictError("Slug đã được sử dụng");
      }
      // Re-throw as BadRequestError for other validation errors
      throw new BadRequestError(error.message);
    }

    // Generate verification token (JWT) containing email and OTP hash
    const verificationToken = this.generateVerificationToken(
      user.email,
      otpHash,
    );

    // Send OTP email
    try {
      await emailUtil.sendVerificationEmail(email, fullName, otp);
    } catch (emailError) {
      console.log(
        `[AuthService] Failed to send verification email to ${email}:`,
        emailError,
      );
      // If email fails, delete the created user and throw error
      await this.userService.delete(user._id);
      throw new BadRequestError(
        "Không thể gửi email xác thực. Vui lòng thử lại sau.",
      );
    }

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản (OTP có hiệu lực 15 phút).",
      status: 201,
      data: {
        user: userResponse,
        token: verificationToken, // Return JWT verification token
      },
    };
  }

  /**
   * Login user
   * @param {String} identifier - Email or slug
   * @param {String} password - Password
   * @returns {Promise<Object>} User and token
   */
  async login(email, password) {
    // Input validation
    if (!email || !password) {
      throw new BadRequestError("Email và password là bắt buộc");
    }

    // Find user by email or slug (include password for comparison)
    const user = await this.userService.getByEmail(email, {
      select: "+password",
      populate: [
        { path: "friends", select: "_id avatar fullName slug" },
        { path: "friendRequests", select: "_id avatar fullName slug" },
      ],
    });

    if (!user) {
      throw new UnauthorizedError("Email hoặc mật khẩu không đúng");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError(
        "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ admin",
      );
    }

    // Check if email is verified
    // if (!user.isVerified) {
    //   throw new UnauthorizedError(
    //     "Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản",
    //   );
    // }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      throw new UnauthorizedError("Email/Slug hoặc mật khẩu không đúng");
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      message: "Đăng nhập thành công",
      status: 200,
      data: {
        user: userResponse,
        token,
      },
    };
  }

  /**
   * Verify JWT token and get user
   * @param {String} token - JWT token
   * @returns {Promise<Object>} User data
   */
  async verifyToken(token) {
    // Validation
    if (!token) {
      throw new BadRequestError("Token là bắt buộc");
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.JWT_SECRET);

      // Check if user still exists
      const user = await this.userService.getById(decoded.userId, {
        select: "-password",
        populate: [
          { path: "friends", select: "_id avatar fullName slug" },
          { path: "friendRequests", select: "_id avatar fullName slug" },
        ],
      });
      if (!user) {
        throw new UnauthorizedError("Người dùng không tồn tại");
      }

      // Check if user is still active
      if (!user.isActive) {
        throw new UnauthorizedError("Tài khoản đã bị vô hiệu hóa");
      }

      return {
        success: true,
        message: "Token hợp lệ",
        status: 200,
        data: user,
      };
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        throw new UnauthorizedError("Token không hợp lệ");
      }
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedError("Token đã hết hạn. Vui lòng đăng nhập lại");
      }
      throw error;
    }
  }

  /**
   * Refresh JWT token
   * @param {String} oldToken - Current JWT token
   * @returns {Promise<Object>} New token and user
   */
  async refreshToken(oldToken) {
    // Verify old token (will throw if invalid)
    const result = await this.verifyToken(oldToken);
    const user = result.data;

    // Generate new token
    const newToken = this.generateToken(user);

    return {
      success: true,
      message: "Token đã được làm mới",
      status: 200,
      data: {
        user,
        token: newToken,
      },
    };
  }

  /**
   * Change user password
   * @param {String} userId - User ID
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Promise<Object>} Updated user
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Validation
    if (!userId) {
      throw new BadRequestError("User ID là bắt buộc");
    }
    if (!currentPassword || !newPassword) {
      throw new BadRequestError(
        "Mật khẩu hiện tại và mật khẩu mới là bắt buộc",
      );
    }
    if (newPassword.length < 6) {
      throw new BadRequestError("Mật khẩu mới phải có ít nhất 6 ký tự");
    }

    // Update password through UserService
    await this.userService.updatePassword(userId, currentPassword, newPassword);

    return {
      success: true,
      message: "Đổi mật khẩu thành công",
      status: 200,
      data: null,
    };
  }

  async resetPassword(userId, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestError("Mật khẩu mới phải có ít nhất 6 ký tự");
    }

    const repository = this.userService.repository;
    await repository.updatePassword(userId, newPassword);

    return {
      success: true,
      message: "Reset mật khẩu thành công",
      status: 200,
      data: null,
    };
  }

  async logout(userId) {
    console.log(`[AuthService] User logged out: ${userId}`);
    return {
      success: true,
      message: "Đăng xuất thành công",
      status: 200,
    };
  }

  async verifyEmail(verificationToken, otp) {
    // Input validation
    if (!verificationToken || !otp) {
      throw new BadRequestError("Verification token và OTP là bắt buộc");
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestError("OTP phải là 6 chữ số");
    }

    // Decode verification token
    let decoded;
    try {
      decoded = jwt.verify(verificationToken, config.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new BadRequestError(
          "Token xác thực đã hết hạn. Vui lòng yêu cầu gửi lại",
        );
      }
      throw new BadRequestError("Token xác thực không hợp lệ");
    }

    const { email, otpHash } = decoded;

    // Hash the provided OTP to compare
    const providedOtpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // Verify OTP hash matches token
    if (providedOtpHash !== otpHash) {
      throw new BadRequestError("OTP không đúng");
    }

    // Find user by email
    const user = await this.userService.getByEmail(email);

    if (!user) {
      throw new NotFoundError("Email không tồn tại");
    }

    // Check if already verified
    if (user.isVerified) {
      throw new ConflictError("Tài khoản đã được xác thực");
    }

    // Update user: set verified
    user.isVerified = true;
    await user.save();

    // Generate JWT token for auto-login
    const jwtToken = this.generateToken(user);

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      message: "Xác thực email thành công",
      status: 200,
      data: {
        user: userResponse,
        token: jwtToken,
      },
    };
  }

  /**
   * Resend verification email
   * @param {String} email - User email
   * @returns {Promise<Object>} New verification token and message
   */
  async resendVerificationEmail(email) {
    // Input validation
    if (!email) {
      throw new BadRequestError("Email là bắt buộc");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError("Email không hợp lệ");
    }

    // Find user by email
    const user = await this.userService.getByEmail(email);

    if (!user) {
      throw new NotFoundError("Email không tồn tại");
    }

    // Check if already verified
    if (user.isVerified) {
      throw new ConflictError("Tài khoản đã được xác thực");
    }

    // Generate new OTP
    const otp = emailUtil.generateVerificationCode();

    // Hash OTP for JWT token
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Generate new verification token (JWT)
    const verificationToken = this.generateVerificationToken(
      user.email,
      otpHash,
    );

    // Send OTP email
    await emailUtil.sendVerificationEmail(user.email, user.fullName, otp);

    return {
      success: true,
      message: "OTP mới đã được gửi vào email (có hiệu lực 15 phút)",
      status: 200,
      data: {
        verificationToken, // Return new JWT verification token
      },
    };
  }

  /**
   * Generate verification token (JWT) for email verification
   * @param {String} email - User email
   * @param {String} otpHash - Hashed OTP
   * @returns {String} JWT verification token
   * @private
   */
  generateVerificationToken(email, otpHash) {
    const payload = {
      email: email.toLowerCase(),
      otpHash,
      type: "email_verification",
    };

    const options = {
      expiresIn: "15m", // 15 minutes
    };

    return jwt.sign(payload, config.JWT_SECRET, options);
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User document
   * @returns {String} JWT token
   * @private
   */
  generateToken(user) {
    const payload = {
      userId: user._id.toString(),
      slug: user.slug,
      email: user.email,
      role: user.role,
    };

    const options = {
      expiresIn: config.JWT_EXPIRES_IN || "7d",
    };

    return jwt.sign(payload, config.JWT_SECRET, options);
  }

  /**
   * Decode JWT token without verification (for debugging)
   * @param {String} token - JWT token
   * @returns {Object} Decoded payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Check if user has required role
   * @param {Object} user - User document
   * @param {Array<String>} allowedRoles - Allowed roles
   * @returns {Boolean} True if user has role
   */
  hasRole(user, allowedRoles) {
    return allowedRoles.includes(user.role);
  }

  /**
   * Check if user is admin
   * @param {Object} user - User document
   * @returns {Boolean} True if user is admin
   */
  isAdmin(user) {
    return user.role === "admin";
  }

  /**
   * Check if user is moderator or admin
   * @param {Object} user - User document
   * @returns {Boolean} True if user is moderator or admin
   */
  isModerator(user) {
    return ["admin", "moderator"].includes(user.role);
  }

  /**
   * Validate token format
   * @param {String} token - Token to validate
   * @returns {Boolean} True if format is valid
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== "string") return false;

    // JWT format: header.payload.signature
    const parts = token.split(".");
    return parts.length === 3;
  }
}

module.exports = AuthService;
