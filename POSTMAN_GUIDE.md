# Hướng dẫn sử dụng Postman với R2 Connector API

## 🚀 Bước 1: Khởi động Server

```bash
# Cài đặt dependencies
npm install

# Chạy server
npm run server
```

Server sẽ chạy tại: `http://localhost:3000`

## 📥 Bước 2: Import Collection vào Postman

1. Mở **Postman**
2. Click **Import** (góc trên bên trái)
3. Chọn file `R2-Connector-API.postman_collection.json`
4. Click **Import**

## 📋 Các API Endpoints

### 1. Health Check
- **Method**: `GET`
- **URL**: `http://localhost:3000/`
- **Mục đích**: Kiểm tra API đang chạy

### 2. Upload File (Small < 100MB)
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/upload`
- **Body**: form-data
  - `file`: Chọn file từ máy tính
  - `key`: (Optional) Tên file trên R2, ví dụ: `uploads/myfile.txt`

**Cách test trong Postman:**
1. Chọn tab **Body**
2. Chọn **form-data**
3. Key `file`, type: **File**, chọn file từ máy
4. Key `key`, type: **Text**, nhập: `uploads/test.txt`
5. Click **Send**

### 3. Upload File Large (> 100MB - Multipart)
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/upload/large`
- **Body**: form-data
  - `file`: Chọn file lớn (> 100MB)
  - `key`: (Optional) Tên file trên R2
  - `partSize`: (Optional) Kích thước mỗi part (bytes), mặc định 100MB

**Ví dụ partSize:**
- 50MB = 52428800
- 100MB = 104857600
- 200MB = 209715200

### 4. Upload Auto (Recommended)
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/upload/auto`
- **Body**: form-data
  - `file`: Chọn file bất kỳ kích thước
  - `key`: (Optional) Tên file trên R2

**Lợi ích**: API tự động chọn method upload phù hợp

### 5. Download File
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/download/{key}`
- **Example**: `http://localhost:3000/api/download/uploads/test.txt`

**Cách test:**
1. Thay `{key}` bằng đường dẫn file thực tế
2. Click **Send**
3. File sẽ được download về máy

### 6. List Files
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/files`
- **Query params**: 
  - `prefix`: (Optional) Lọc theo thư mục, ví dụ: `uploads/`

**Examples:**
- List tất cả: `http://localhost:3000/api/files`
- List theo prefix: `http://localhost:3000/api/files?prefix=uploads/`

### 7. Delete File
- **Method**: `DELETE`
- **URL**: `http://localhost:3000/api/delete/{key}`
- **Example**: `http://localhost:3000/api/delete/uploads/test.txt`

## 🎯 Workflow Test Hoàn Chỉnh

### Test 1: Upload và Download file nhỏ
1. **Upload**: POST `/api/upload` với file < 100MB
2. **List**: GET `/api/files` để xem file vừa upload
3. **Download**: GET `/api/download/{key}` để tải file về
4. **Delete**: DELETE `/api/delete/{key}` để xóa file

### Test 2: Upload file lớn (> 500MB)
1. **Upload Large**: POST `/api/upload/large` với file > 500MB
2. **List**: GET `/api/files` để xác nhận
3. **Download**: GET `/api/download/{key}` để tải về

### Test 3: Upload Auto (Đơn giản nhất)
1. **Upload Auto**: POST `/api/upload/auto` với file bất kỳ
2. API tự động chọn method phù hợp
3. **Download**: GET `/api/download/{key}` để kiểm tra

### Test 4: Backup PostgreSQL
1. **Backup**: POST `/api/backup/postgres` với connectionString
2. **Check Status**: GET `/api/cron/status` để xem backup history
3. **Download từ R2**: GET `/api/download/backups/postgres/{filename}`

### Test 5: Cronjob Tự động Backup
1. **Xem status**: GET `/api/cron/status`
2. **Trigger manual**: POST `/api/cron/trigger`
3. **Stop cron**: POST `/api/cron/stop`
4. **Start cron**: POST `/api/cron/start`

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Upload thành công",
  "data": {
    "key": "uploads/myfile.txt",
    "etag": "\"abc123...\"",
    "originalName": "myfile.txt",
    "size": 1024
  }
}
```

### Error Response
```json
{
  "error": "Không có file được upload"
}
```

## ⚠️ Lưu ý

1. **File size limit**: Multer được cấu hình cho phép file tối đa 5GB
2. **Temp folder**: File tạm lưu trong `temp_uploads/` và tự động xóa sau khi upload
3. **CORS**: API đã enable CORS, có thể gọi từ bất kỳ domain
4. **Environment**: Đảm bảo file `.env` đã cấu hình đúng R2 credentials

## 🔧 Troubleshooting

### Lỗi: "Thiếu thông tin cấu hình R2"
- Kiểm tra file `.env` đã tồn tại
- Đảm bảo có đầy đủ: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### Lỗi: "ECONNREFUSED"
- Server chưa chạy, chạy lại: `npm run server`

### File quá lớn
- Sử dụng endpoint `/api/upload/large` hoặc `/api/upload/auto`
- Tăng `partSize` nếu cần

### Cronjob không chạy
- Kiểm tra `DATABASE_URL` trong `.env`
- Xem status: GET `/api/cron/status`
- Backup thủ công: POST `/api/cron/trigger`

## 🤖 Cronjob Backup Tự động

### Cấu hình trong .env

```env
# Database connection
DATABASE_URL=postgresql://username:password@host:port/database

# Cron schedule (mỗi ngày lúc 2:00 AM)
BACKUP_CRON_SCHEDULE=0 2 * * *

# Timezone
BACKUP_TIMEZONE=Asia/Ho_Chi_Minh
```

### Cron Schedule Examples

| Schedule | Mô tả |
|----------|-------|
| `0 2 * * *` | Mỗi ngày lúc 02:00 AM |
| `0 */6 * * *` | Mỗi 6 giờ |
| `*/30 * * * *` | Mỗi 30 phút |
| `0 0 * * 0` | Mỗi Chủ nhật lúc 00:00 |
| `0 0 1 * *` | Ngày đầu tiên mỗi tháng |

### API Endpoints Cronjob

#### 1. Xem Status Cronjob
```
GET http://localhost:3000/api/cron/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "schedule": "0 2 * * *",
    "timezone": "Asia/Ho_Chi_Minh",
    "description": "Mỗi ngày lúc 02:00",
    "databaseConfigured": true,
    "lastBackup": {
      "timestamp": "2025-11-03T02:00:00.000Z",
      "fileName": "auto-backup-2025-11-03T02-00-00.sql",
      "size": "12.50",
      "status": "success"
    },
    "backupHistory": [...]
  }
}
```

#### 2. Bật Cronjob
```
POST http://localhost:3000/api/cron/start
```

#### 3. Tắt Cronjob
```
POST http://localhost:3000/api/cron/stop
```

#### 4. Trigger Backup Ngay (Manual)
```
POST http://localhost:3000/api/cron/trigger
```

Không cần đợi schedule, backup ngay lập tức!

#### 5. Cập nhật Schedule
```
POST http://localhost:3000/api/cron/schedule
Content-Type: application/json

{
  "schedule": "0 3 * * *"
}
```

Thay đổi thời gian backup (ví dụ: từ 2:00 AM sang 3:00 AM)

## 🎉 Happy Testing!
