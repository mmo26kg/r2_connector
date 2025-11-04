# PostgreSQL Backup Service

Service backup PostgreSQL database tự động và upload lên Cloudflare R2.

## 🎯 Tính năng

- ✅ Backup PostgreSQL bằng pg_dump (chuẩn)
- ✅ Backup custom không cần pg_dump
- ✅ Tự động upload file backup lên R2
- ✅ Kết nối qua connection string
- ✅ API endpoint để trigger backup
- ✅ Download file backup từ server

## 📋 Yêu cầu

### Cho backup bằng pg_dump:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download từ https://www.postgresql.org/download/windows/
```

### Cho backup custom:
Không cần cài thêm gì, chỉ cần `pg` package (đã có trong dependencies)

## 🚀 Sử dụng

### 1. Cấu hình Database URL

Thêm vào file `.env`:
```env
DATABASE_URL=postgresql://username:password@host:port/database
```

### 2. Backup qua API (Postman)

#### Method 1: Backup bằng pg_dump (Recommended)
```
POST http://localhost:3000/api/backup/postgres
Content-Type: application/json

{
    "connectionString": "postgresql://postgres:password@localhost:5432/mydb",
    "fileName": "my-backup.sql"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Backup PostgreSQL thành công",
    "data": {
        "fileName": "my-backup.sql",
        "r2Key": "backups/postgres/my-backup.sql",
        "localPath": "backups/my-backup.sql",
        "size": 1048576,
        "sizeMB": "1.00",
        "database": "mydb",
        "timestamp": "2025-11-02T10-30-45",
        "etag": "\"abc123...\""
    }
}
```

#### Method 2: Backup Custom (Không cần pg_dump)
```
POST http://localhost:3000/api/backup/postgres/custom
Content-Type: application/json

{
    "connectionString": "postgresql://postgres:password@localhost:5432/mydb",
    "fileName": "custom-backup.sql"
}
```

### 3. Download file backup

```
GET http://localhost:3000/api/backup/download/my-backup.sql
```

## 📖 Sử dụng trong Code

```javascript
import { backupPostgres, backupPostgresCustom } from './postgres-backup.js';

// Backup bằng pg_dump
const result = await backupPostgres(
    'postgresql://postgres:password@localhost:5432/mydb',
    'my-backup.sql'
);

console.log(result);

// Backup custom
const customResult = await backupPostgresCustom(
    'postgresql://postgres:password@localhost:5432/mydb',
    'custom-backup.sql'
);

console.log(customResult);
```

## 🔄 Tự động hóa Backup

### Cron job (Linux/macOS)

```bash
# Backup hàng ngày lúc 2:00 AM
0 2 * * * curl -X POST http://localhost:3000/api/backup/postgres \
  -H "Content-Type: application/json" \
  -d '{"connectionString":"postgresql://user:pass@host:5432/db"}'
```

### Node-cron (trong code)

```javascript
import cron from 'node-cron';

// Backup mỗi ngày lúc 2:00 AM
cron.schedule('0 2 * * *', async () => {
    console.log('Bắt đầu backup tự động...');
    const result = await backupPostgres(process.env.DATABASE_URL);
    console.log(result);
});
```

## 📁 File Structure

```
backups/                           # Backup files (local)
├── postgres-backup-2025-11-02T10-30-45.sql
└── custom-backup.sql

R2 Storage:
backups/postgres/                  # Backup files (R2)
├── postgres-backup-2025-11-02T10-30-45.sql
└── custom-backup.sql
```

## ⚙️ Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Ví dụ:**
```
postgresql://postgres:mypassword@localhost:5432/mydb
postgresql://user:pass@db.example.com:5432/production_db
postgresql://admin:secret@192.168.1.100:5432/testdb
```

## 🔐 Bảo mật

- ⚠️ **KHÔNG** commit file `.env` lên Git
- ⚠️ **KHÔNG** expose connection string trong code
- ✅ Sử dụng environment variables
- ✅ Restrict API access nếu deploy production
- ✅ Encrypt backup files nếu cần

## 📊 So sánh 2 phương pháp

| Feature | pg_dump | Custom |
|---------|---------|--------|
| Yêu cầu pg_dump | ✅ Có | ❌ Không |
| Tốc độ | ⚡ Nhanh hơn | 🐢 Chậm hơn |
| Độ chính xác | 🎯 100% | ⚠️ ~95% |
| Schema phức tạp | ✅ Hỗ trợ đầy đủ | ⚠️ Hạn chế |
| Large database | ✅ Tốt | ❌ Không tốt |
| **Khuyến nghị** | **Recommended** | Fallback option |

## ❓ Troubleshooting

### Lỗi: "pg_dump command not found"
```bash
# Cài PostgreSQL client
brew install postgresql  # macOS
sudo apt install postgresql-client  # Linux
```

### Lỗi: "Connection refused"
- Kiểm tra database đang chạy
- Kiểm tra host, port trong connection string
- Kiểm tra firewall

### Lỗi: "Authentication failed"
- Kiểm tra username, password
- Kiểm tra quyền truy cập database

## 🎉 Ready to use!

Import Postman collection và test ngay! 🚀
