# Backend - Mạng Xã Hội Đơn Giản

Backend API cho ứng dụng mạng xã hội, được xây dựng với **JavaScript**, **Express.js** theo kiến trúc **OOP** và **MongoDB**.

## 🚀 Công nghệ sử dụng

- **Node.js** & **Express.js** - Web framework
- **JavaScript (ES6+)** - OOP Architecture
- **MongoDB** & **Mongoose** - Database & ODM
- **Helmet** - Security middleware
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - HTTP request logger
- **Compression** - Response compression

## 📁 Cấu trúc thư mục (OOP)

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection (Singleton)
│   ├── controllers/
│   │   └── HelloController.js   # Hello endpoint handlers
│   ├── routes/
│   │   ├── index.js             # Route manager (central routing)
│   │   └── hello.routes.js      # Hello routes
│   ├── middlewares/
│   │   └── errorHandler.js      # Global error handling
│   ├── utils/
│   │   └── logger.js            # Custom logger utility
│   ├── app.js                   # Express app configuration
│   └── server.js                # Server entry point
├── .env.example                 # Environment variables template
├── .gitignore
├── .eslintrc.json
├── package.json
└── README.md
```

## 🏗️ Kiến trúc OOP

### Class Structure

1. **Server Class** (`server.js`)
   - Khởi động server
   - Kết nối database
   - Graceful shutdown handling

2. **App Class** (`app.js`)
   - Cấu hình Express app
   - Setup middlewares
   - Initialize routes và error handling

3. **DatabaseConnection Class** (`config/database.js`)
   - Singleton pattern
   - Quản lý MongoDB connection
   - Handle connection events

4. **HelloController Class** (`controllers/HelloController.js`)
   - Xử lý business logic cho hello endpoints
   - Method binding để maintain context

5. **RouteManager Class** (`routes/index.js`)
   - Quản lý tất cả routes
   - Central routing configuration

6. **HelloRoutes Class** (`routes/hello.routes.js`)
   - Định nghĩa hello endpoints
   - Connect controller với HTTP methods

7. **ErrorHandler Class** (`middlewares/errorHandler.js`)
   - Global error handling
   - Custom error responses

8. **Logger Class** (`utils/logger.js`)
   - Singleton logging utility
   - Formatted console logging

## 🛠️ Cài đặt

### 1. Cài đặt dependencies:
```bash
cd backend
npm install
```

### 2. Tạo file `.env`:
```bash
cp .env.example .env
```

### 3. Cấu hình `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/social_network
DB_NAME=social_network
CORS_ORIGIN=http://localhost:5173
```

### 4. Chạy MongoDB:

**Option 1: MongoDB local**
```bash
mongod
```

**Option 2: MongoDB Atlas (Cloud)**
- Tạo cluster tại https://www.mongodb.com/cloud/atlas
- Lấy connection string
- Cập nhật `MONGODB_URI` trong `.env`

## 🏃 Chạy ứng dụng

### Development mode (với nodemon):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

### Linting:
```bash
npm run lint
npm run lint:fix
```

## 📡 API Endpoints

### Health Check
- **GET** `/health` - Kiểm tra trạng thái server

### Hello Endpoints (Testing)
- **GET** `/api/v1/hello` - Simple hello world
- **GET** `/api/v1/hello/info` - API information

### Response Format
```json
{
  "status": "success",
  "message": "Hello from Express.js Backend! 🚀",
  "data": {
    "timestamp": "2026-02-05T10:30:00.000Z",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

## 🧪 Test API

### Sử dụng curl:
```bash
# Health check
curl http://localhost:5000/health

# Hello endpoint
curl http://localhost:5000/api/v1/hello

# API info
curl http://localhost:5000/api/v1/hello/info
```

### Sử dụng Postman hoặc Thunder Client:
1. Tạo GET request đến `http://localhost:5000/api/v1/hello`
2. Send request
3. Xem response

## 🎯 OOP Design Patterns

### 1. **Singleton Pattern**
- `DatabaseConnection` - Chỉ có một instance connection
- `Logger` - Shared logger instance

### 2. **Class-based Controllers**
- Encapsulation logic trong classes
- Method binding để maintain context
- Easy to test và extend

### 3. **Route Manager Pattern**
- Central routing management
- Modular route organization
- Easy to scale

### 4. **Middleware Classes**
- Reusable middleware logic
- Context binding
- Clear separation of concerns

## 📝 Scripts

```json
{
  "start": "node src/server.js",           // Production
  "dev": "nodemon src/server.js",          // Development với auto-reload
  "lint": "eslint .",                      // Check code style
  "lint:fix": "eslint . --fix"             // Fix code style issues
}
```

## 🚧 Mở rộng Backend

### Thêm Feature Mới:

1. **Tạo Model** (nếu cần)
```javascript
// src/models/User.js
const mongoose = require('mongoose');
// Define schema...
```

2. **Tạo Controller**
```javascript
// src/controllers/UserController.js
class UserController {
  constructor() {}
  getUsers(req, res) {}
}
module.exports = UserController;
```

3. **Tạo Routes**
```javascript
// src/routes/user.routes.js
class UserRoutes {
  constructor() {
    this.router = express.Router();
    this.controller = new UserController();
  }
}
```

4. **Đăng ký Routes**
```javascript
// src/routes/index.js
const UserRoutes = require('./user.routes');
this.router.use('/users', new UserRoutes().getRouter());
```

## 📦 Dependencies

### Production:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `helmet` - Security middleware
- `cors` - CORS middleware
- `compression` - Response compression
- `morgan` - HTTP logger
- `dotenv` - Environment variables

### Development:
- `nodemon` - Auto-reload server
- `eslint` - Code linting

## 🔒 Security Features

- ✅ Helmet.js - Security headers
- ✅ CORS configuration
- ✅ Request size limits
- ✅ Error handling
- ✅ Environment variables

## 🐛 Debugging

Server logs hiển thị:
- ✅ Database connection status
- ✅ Server start information
- ✅ HTTP requests (dev mode)
- ✅ Errors với stack trace
- ✅ Graceful shutdown logs

## 📄 License

MIT

---

**Happy Coding! 🚀**
