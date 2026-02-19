const nodemailer = require('nodemailer');
const logger = require('./logger');
const config = require('../config/envVars');

/**
 * Email utility for sending emails
 * Configure with environment variables for production
 */
class EmailUtil {
  constructor() {
    // Create transporter with Gmail (for development)
    // For production, use proper SMTP service like SendGrid, AWS SES, etc.
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
      }
    });

    // Verify transporter configuration
    this.transporter.verify((error, _success) => {
      if (error) {
        logger.error('Email transporter verification failed:', error);
      } else {
        logger.info('Email server is ready to send messages');
      }
    });
  }

  /**
   * Send verification email with token
   * @param {String} toEmail - Recipient email
   * @param {String} fullName - Recipient name
   * @param {String} verificationToken - 6-digit verification code
   * @returns {Promise<Object>}
   */
  async sendVerificationEmail(toEmail, fullName, verificationToken) {
    try {
      const mailOptions = {
        from: `"Social Network" <${config.EMAIL_USER || 'noreply@socialnetwork.com'}>`,
        to: toEmail,
        subject: 'Xác thực tài khoản - Social Network',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .code-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
              .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Chào mừng đến với Social Network!</h1>
              </div>
              <div class="content">
                <p>Xin chào <strong>${fullName}</strong>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn bằng mã bên dưới:</p>
                
                <div class="code-box">
                  <div class="code">${verificationToken}</div>
                </div>
                
                <p>Mã xác thực này có hiệu lực trong <strong>15 phút</strong>.</p>
                
                <div class="warning">
                  <strong>⚠️ Lưu ý:</strong> Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.
                </div>
                
                <p>Trân trọng,<br><strong>Social Network Team</strong></p>
              </div>
              <div class="footer">
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                <p>&copy; ${new Date().getFullYear()} Social Network. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${toEmail}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Không thể gửi email xác thực. Vui lòng thử lại sau.');
    }
  }

  /**
   * Send password reset email
   * @param {String} toEmail - Recipient email
   * @param {String} fullName - Recipient name
   * @param {String} resetToken - Password reset token
   * @returns {Promise<Object>}
   */
  async sendPasswordResetEmail(toEmail, fullName, resetToken) {
    try {
      const resetLink = `${config.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"Social Network" <${config.EMAIL_USER || 'noreply@socialnetwork.com'}>`,
        to: toEmail,
        subject: 'Đặt lại mật khẩu - Social Network',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Đặt lại mật khẩu</h1>
              </div>
              <div class="content">
                <p>Xin chào <strong>${fullName}</strong>,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                
                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Đặt lại mật khẩu</a>
                </div>
                
                <p>Link này sẽ hết hạn sau <strong>1 giờ</strong>.</p>
                
                <div class="warning">
                  <strong>⚠️ Lưu ý:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                </div>
                
                <p>Trân trọng,<br><strong>Social Network Team</strong></p>
              </div>
              <div class="footer">
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                <p>&copy; ${new Date().getFullYear()} Social Network. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${toEmail}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
    }
  }

  /**
   * Generate 6-digit verification code
   * @returns {String}
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// Export singleton instance
module.exports = new EmailUtil();
