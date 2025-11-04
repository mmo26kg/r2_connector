# Cronjob Tự động Backup PostgreSQL

Hệ thống tự động backup PostgreSQL database theo lịch trình cron.

## 🎯 Tính năng

- ✅ Tự động backup theo lịch trình cron
- ✅ Cấu hình thời gian từ .env
- ✅ API để quản lý cronjob (start/stop/status)
- ✅ Trigger backup thủ công bất cứ lúc nào
- ✅ Lưu lịch sử 10 backup gần nhất
- ✅ Tự động fallback nếu pg_dump failed
- ✅ Timezone support

## ⚙️ Cấu hình

### 1. Thêm vào file `.env`:

```env
# Database connection
DATABASE_URL=postgresql://username:password@host:port/database

# Cron schedule (format: minute hour day month weekday)
BACKUP_CRON_SCHEDULE=0 2 * * *

# Timezone (optional)
BACKUP_TIMEZONE=Asia/Ho_Chi_Minh
```

### 2. Cron Schedule Examples:

| Schedule | Mô tả |
|----------|-------|
| `0 2 * * *` | Mỗi ngày lúc 02:00 AM |
| `0 */6 * * *` | Mỗi 6 giờ |
| `*/30 * * * *` | Mỗi 30 phút |
| `0 0 * * 0` | Mỗi Chủ nhật lúc 00:00 |
| `0 0 1 * *` | Ngày đầu tiên mỗi tháng |
| `0 3 * * 1-5` | Mỗi ngày trong tuần lúc 03:00 |

### 3. Timezone Examples:

- `Asia/Ho_Chi_Minh` (Vietnam)
- `UTC` (Coordinated Universal Time)
- `America/New_York` (US Eastern)
- `Europe/London` (UK)
- `Asia/Tokyo` (Japan)

## 🚀 API Endpoints

### 1. Xem trạng thái Cronjob

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
            "r2Key": "backups/postgres/auto-backup-2025-11-03T02-00-00.sql",
            "duration": "3.45",
            "status": "success"
        },
        "backupHistory": [...]
    }
}
```

### 2. Bật Cronjob

```
POST http://localhost:3000/api/cron/start
```

### 3. Tắt Cronjob

```
POST http://localhost:3000/api/cron/stop
```

### 4. Trigger Backup Thủ công (Ngay lập tức)

```
POST http://localhost:3000/api/cron/trigger
```

**Response:**
```json
{
    "success": true,
    "message": "Backup thủ công thành công",
    "data": {
        "timestamp": "2025-11-03T10:30:00.000Z",
        "fileName": "auto-backup-2025-11-03T10-30-00.sql",
        "size": "12.50",
        "duration": "3.45",
        "status": "success"
    }
}
```

### 5. Cập nhật Schedule

```
POST http://localhost:3000/api/cron/schedule
Content-Type: application/json

{
    "schedule": "0 3 * * *"
}
```

## 📖 Sử dụng trong Code

```javascript
import { 
    initBackupCron, 
    getCronStatus, 
    triggerManualBackup 
} from './cron-backup.js';

// Khởi tạo cronjob
initBackupCron('0 2 * * *', 'postgresql://...');

// Xem trạng thái
const status = getCronStatus();
console.log(status);

// Trigger backup thủ công
await triggerManualBackup();
```

## 🔄 Workflow

1. **Khởi động server** → Cronjob tự động khởi tạo
2. **Đến giờ backup** → Cronjob tự động chạy
3. **Backup database** → Tạo file .sql
4. **Upload lên R2** → Lưu trữ cloud
5. **Lưu local** → File trong thư mục `backups/`
6. **Ghi log** → Lưu vào history

## 📊 Monitoring

### Xem log trong console:

```
⏰ Khởi tạo cronjob backup PostgreSQL với schedule: 0 2 * * *
📅 Mô tả: Mỗi ngày lúc 02:00
✅ Cronjob backup đã được khởi tạo và đang chạy

🔔 Cronjob backup được kích hoạt!
💾 Bắt đầu backup tự động...
✅ Backup tự động thành công! Thời gian: 3.45s
📦 File: auto-backup-2025-11-03T02-00-00.sql (12.50 MB)
```

### Xem qua API:

```bash
curl http://localhost:3000/api/cron/status
```

## 🎯 Use Cases

### 1. Backup hàng ngày

```env
BACKUP_CRON_SCHEDULE=0 2 * * *
```

### 2. Backup mỗi 6 giờ

```env
BACKUP_CRON_SCHEDULE=0 */6 * * *
```

### 3. Backup chỉ ngày trong tuần

```env
# Mỗi ngày Thứ 2-6 lúc 3:00 AM
BACKUP_CRON_SCHEDULE=0 3 * * 1-5
```

### 4. Backup cuối tuần

```env
# Mỗi Chủ nhật lúc 1:00 AM
BACKUP_CRON_SCHEDULE=0 1 * * 0
```

## ⚠️ Lưu ý

1. **Cronjob chỉ chạy khi server đang chạy**
2. **DATABASE_URL phải được cấu hình** trong .env
3. **File backup lưu ở**: 
   - Local: `backups/`
   - R2: `backups/postgres/`
4. **History giữ 10 backup gần nhất**
5. **Auto fallback**: Nếu pg_dump failed → Dùng custom backup

## 🔧 Troubleshooting

### Cronjob không chạy?

1. Kiểm tra `DATABASE_URL` trong .env
2. Kiểm tra server đang chạy
3. Xem status: `GET /api/cron/status`

### Muốn test ngay?

```bash
curl -X POST http://localhost:3000/api/cron/trigger
```

### Thay đổi schedule?

```bash
curl -X POST http://localhost:3000/api/cron/schedule \
  -H "Content-Type: application/json" \
  -d '{"schedule": "*/5 * * * *"}'
```

## 🎉 Ready!

Cronjob đã sẵn sàng tự động backup PostgreSQL! 🚀
