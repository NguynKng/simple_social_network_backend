const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT) || 5000,
  API_VERSION: process.env.API_VERSION || "v1",

  // Database Configuration
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/social_network",
  DB_NAME: process.env.DB_NAME || "social_network",
  DB_MAX_RETRIES: parseInt(process.env.DB_MAX_RETRIES) || 5,
  DB_RETRY_DELAY: parseInt(process.env.DB_RETRY_DELAY) || 5000,

  // Email Configuration
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,

  // API Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  NEWS_API_KEY: process.env.NEWS_API_KEY,
};
