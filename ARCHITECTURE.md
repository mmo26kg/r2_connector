# R2 Connector - Cấu trúc Project

## 📁 Cấu trúc Thư mục

```
r2_connector/
├── src/
│   ├── config/           # Cấu hình
│   │   ├── r2-client.js      # R2 client configuration
│   │   └── app.config.js     # Application constants
│   │
│   ├── controllers/      # Controllers (Business logic)
│   │   ├── upload.controller.js
│   │   ├── download.controller.js
│   │   ├── backup.controller.js
│   │   ├── cron.controller.js
│   │   └── dashboard.controller.js
│   │
│   ├── services/         # Services (Data layer)
│   │   ├── upload.service.js
│   │   ├── download.service.js
│   │   ├── backup.service.js
│   │   └── cron.service.js
│   │
│   ├── middlewares/      # Middlewares
│   │   ├── cors.middleware.js
│   │   ├── upload.middleware.js
│   │   └── error.middleware.js
│   │
│   ├── routes/           # Routes
│   │   ├── upload.routes.js
│   │   ├── download.routes.js
│   │   ├── backup.routes.js
│   │   ├── cron.routes.js
│   │   ├── dashboard.routes.js
│   │   └── index.js          # Route aggregator
│   │
│   └── utils/            # Utility functions (reserved)
│
├── views/                # EJS templates
│   ├── layout.ejs
│   └── index.ejs
│
├── public/               # Static assets
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── dashboard.js
│
├── backups/              # Backup storage
├── temp_uploads/         # Temporary upload files
│
├── server.js             # Application entry point
├── package.json
└── .env
```

## 🏗️ Kiến trúc MVC

### **Model - Service Layer**
- `src/services/` - Xử lý business logic, tương tác với external services (R2, Database)
- Các service độc lập, có thể tái sử dụng

### **View**
- `views/` - EJS templates cho dashboard
- `public/` - Static assets (CSS, JS, images)

### **Controller**
- `src/controllers/` - Xử lý HTTP requests, gọi services, trả về responses
- Tách biệt logic với routes

### **Routes**
- `src/routes/` - Định nghĩa API endpoints
- Mỗi module có routes riêng, tập hợp tại `index.js`

### **Middlewares**
- `src/middlewares/` - CORS, error handler, upload configuration
- Middleware tái sử dụng cho toàn bộ app

### **Config**
- `src/config/` - Cấu hình R2 client, constants
- Centralized configuration management

## 🚀 Cách chạy

```bash
# Development
npm run dev

# Production
npm start
```

## 📝 Các module chính

### 1. Upload Module
- **Service**: `upload.service.js` - Upload logic (single, multipart, auto, exe)
- **Controller**: `upload.controller.js` - Handle upload requests
- **Routes**: `upload.routes.js` - Upload endpoints

### 2. Download Module
- **Service**: `download.service.js` - Download & list files
- **Controller**: `download.controller.js` - Handle download requests
- **Routes**: `download.routes.js` - Download endpoints

### 3. Backup Module
- **Service**: `backup.service.js` - PostgreSQL backup (pg_dump, custom)
- **Controller**: `backup.controller.js` - Handle backup requests
- **Routes**: `backup.routes.js` - Backup endpoints

### 4. Cron Module
- **Service**: `cron.service.js` - Cron job management
- **Controller**: `cron.controller.js` - Handle cron requests
- **Routes**: `cron.routes.js` - Cron endpoints

### 5. Dashboard Module
- **Controller**: `dashboard.controller.js` - Render dashboard & health check
- **Routes**: `dashboard.routes.js` - Dashboard routes
- **Views**: `layout.ejs`, `index.ejs`

## 🔧 Thêm feature mới

### Bước 1: Tạo Service
```javascript
// src/services/myfeature.service.js
export async function doSomething() {
    // Business logic here
}
```

### Bước 2: Tạo Controller
```javascript
// src/controllers/myfeature.controller.js
import { doSomething } from '../services/myfeature.service.js';

export async function myHandler(req, res) {
    const result = await doSomething();
    res.json(result);
}
```

### Bước 3: Tạo Routes
```javascript
// src/routes/myfeature.routes.js
import { Router } from 'express';
import { myHandler } from '../controllers/myfeature.controller.js';

const router = Router();
router.get('/myfeature', myHandler);

export default router;
```

### Bước 4: Register Routes
```javascript
// src/routes/index.js
import myFeatureRoutes from './myfeature.routes.js';

router.use('/api', myFeatureRoutes);
```

## 🎯 Best Practices

1. **Separation of Concerns**: Mỗi layer có trách nhiệm riêng
2. **Reusability**: Services có thể tái sử dụng ở nhiều controllers
3. **Testability**: Dễ dàng test từng layer độc lập
4. **Maintainability**: Code được tổ chức rõ ràng, dễ bảo trì
5. **Scalability**: Dễ dàng mở rộng thêm features mới

## 📚 Dependencies

- `express` - Web framework
- `ejs` - Template engine
- `multer` - File upload
- `cors` - CORS middleware
- `@aws-sdk/client-s3` - S3 client for R2
- `@aws-sdk/s3-request-presigner` - Pre-signed URLs
- `pg` - PostgreSQL client
- `node-cron` - Cron job scheduler

## 🔐 Environment Variables

```env
# R2 Configuration
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Database
DATABASE_URL=

# Cron
BACKUP_CRON_SCHEDULE=0 2 * * *
BACKUP_TIMEZONE=Asia/Ho_Chi_Minh

# Strapi (optional)
STRAPI_URL=
STRAPI_API_TOKEN=

# Custom domain (optional)
CUSTOM_DOMAIN=
RAILWAY_PUBLIC_DOMAIN=
```

## 🐛 Debugging

1. Check logs trong terminal
2. Kiểm tra error handler trong `src/middlewares/error.middleware.js`
3. Thêm console.log trong controllers/services
4. Sử dụng VSCode debugger với breakpoints

## 📦 Migration từ cấu trúc cũ

Files đã được di chuyển:
- `upload.js` → `src/services/upload.service.js`
- `download.js` → `src/services/download.service.js`
- `postgres-backup.js` → `src/services/backup.service.js`
- `cron-backup.js` → `src/services/cron.service.js`
- `r2-client.js` → `src/config/r2-client.js`

File backup: `server.js.backup` (cấu trúc cũ để tham khảo)
