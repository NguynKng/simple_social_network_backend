const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const RouteManager = require('./routes');
const ErrorHandler = require('./middlewares/errorHandler');

class App {
  constructor() {
    this.app = express();
    this.routeManager = new RouteManager();
    this.errorHandler = new ErrorHandler();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }
  }

  initializeRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    const apiVersion = process.env.API_VERSION || 'v1';
    this.app.use(`/api/${apiVersion}`, this.routeManager.getRouter());

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        path: req.path,
        method: req.method
      });
    });
  }

  initializeErrorHandling() {
    this.app.use(this.errorHandler.handle.bind(this.errorHandler));
  }

  listen(port, callback) {
    return this.app.listen(port, callback);
  }
}

module.exports = App;
