# R2 Connector - Cloudflare R2 Storage

Dự án Node.js đơn giản để kết nối và làm việc với Cloudflare R2 Storage. Hỗ trợ upload và download file.

## 🚀 Tính năng

- ✅ Upload file lên R2 (file nhỏ < 100MB)
- ✅ **Upload file lớn > 500MB** (sử dụng multipart upload)
- ✅ Upload tự động (tự chọn method phù hợp)
- ✅ Upload nội dung text/JSON lên R2
- ✅ Download file từ R2
- ✅ Liệt kê file trong bucket
- ✅ **REST API với Express** (upload/download qua Postman)
- ✅ **PostgreSQL Backup** (tự động backup database)
- ✅ **Cronjob tự động** (backup định kỳ)
- ✅ **Docker support** (chạy với Docker & Docker Compose)
- ✅ Sử dụng AWS SDK v3 (R2 tương thích S3)

## 📋 Yêu cầu

- Node.js >= 18.x
- Tài khoản Cloudflare với R2 Storage
- R2 API Token
- (Optional) PostgreSQL nếu cần backup
- (Optional) Docker & Docker Compose

## 🔧 Cài đặt

### Cách 1: Chạy trực tiếp với Node.js

#### 1. Clone hoặc tải dự án về

```bash
cd r2_connector
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Tạo file `.env`

Copy từ `.env.example`:

```bash
cp .env.example .env
```

Điền thông tin R2:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
PORT=3000

# PostgreSQL (nếu cần backup)
POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/dbname
BACKUP_CRON_SCHEDULE=0 2 * * *  # Backup lúc 2h sáng mỗi ngày
```

### 4. Chạy server

```bash
npm run server
```

Server sẽ chạy tại `http://localhost:3000`

---

### Cách 2: Chạy với Docker

#### 1. Tạo file `.env` (giống Cách 1)

```bash
cp .env.example .env
# Điền thông tin R2 và PostgreSQL
```

#### 2. Sử dụng script tự động

```bash
chmod +x docker-run.sh
./docker-run.sh
```

Chọn option:
- **1**: Build và chạy tất cả (API + PostgreSQL demo)
- **2**: Chỉ chạy API (không cần PostgreSQL)
- **3-7**: Quản lý container (stop, rebuild, logs, status, exit)

#### 3. Hoặc chạy thủ công với Docker Compose

```bash
# Build và chạy tất cả services
docker-compose up -d

# Chỉ chạy API (không cần PostgreSQL)
docker-compose up -d r2-connector

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down
```

API sẽ chạy tại `http://localhost:3000`

📖 Chi tiết về Docker deployment xem [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)

---

## 📚 Tài liệu hướng dẫn

- [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) - Hướng dẫn sử dụng API với Postman
- [POSTGRES_BACKUP_GUIDE.md](./POSTGRES_BACKUP_GUIDE.md) - Hướng dẫn backup PostgreSQL
- [CRONJOB_GUIDE.md](./CRONJOB_GUIDE.md) - Hướng dẫn cấu hình cronjob tự động
- [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) - Hướng dẫn deploy với Docker
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Hướng dẫn deploy lên Railway

---

## 📖 Sử dụng

### Chạy API Server

```bash
# Cài đặt dependencies trước
npm install

# Chạy server
npm run server

# Hoặc chạy với auto-reload (development)
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

### Chạy demo (CLI)

```bash
npm start
```

## 🌐 API Endpoints (Postman)

### 1. Upload File (< 100MB)
```
POST http://localhost:3000/api/upload
```
- **Body**: form-data
  - `file`: File cần upload
  - `key`: Tên file trên R2 (optional)

### 2. Upload File Lớn (> 100MB, Multipart)
```
POST http://localhost:3000/api/upload/large
```
- **Body**: form-data
  - `file`: File cần upload
  - `key`: Tên file trên R2 (optional)
  - `partSize`: Kích thước mỗi part (optional, mặc định 100MB)

### 3. Upload Tự Động (Recommended)
```
POST http://localhost:3000/api/upload/auto
```
- **Body**: form-data
  - `file`: File cần upload (bất kỳ kích thước)
  - `key`: Tên file trên R2 (optional)

### 4. Download File
```
GET http://localhost:3000/api/download/{key}
```
- **Params**: `key` - Đường dẫn file trên R2
- **Example**: `http://localhost:3000/api/download/uploads/myfile.zip`

### 5. List Files
```
GET http://localhost:3000/api/files?prefix=uploads/
```
- **Query**: `prefix` - Lọc theo tiền tố (optional)

### 6. Delete File
```
DELETE http://localhost:3000/api/delete/{key}
```
- **Params**: `key` - Đường dẫn file cần xóa

## 📦 Postman Collection

Import file `R2-Connector-API.postman_collection.json` vào Postman để test nhanh tất cả endpoints.

### Sử dụng trong code (CLI)

#### Upload file

```javascript
import { uploadFile, uploadContent, uploadLargeFile, uploadFileAuto } from './upload.js';

// Upload file nhỏ (< 100MB)
await uploadFile('./myfile.txt', 'uploads/myfile.txt');

// Upload file lớn (> 100MB, > 500MB) - Multipart Upload
await uploadLargeFile('./large-file.zip', 'uploads/large-file.zip', 50 * 1024 * 1024); // Part size: 50MB

// Upload tự động (Recommended) - Tự động chọn method phù hợp
await uploadFileAuto('./any-file.dat', 'uploads/file.dat');

// Upload nội dung text
await uploadContent('Hello R2!', 'test/hello.txt');

// Upload JSON
const data = { name: 'test' };
await uploadContent(JSON.stringify(data), 'data/test.json');
```

#### Download file

```javascript
import { downloadFile, listFiles } from './download.js';

// Download và lưu file
await downloadFile('uploads/myfile.txt', './downloads/myfile.txt');

// Download và lấy buffer
const result = await downloadFile('test/hello.txt');
if (result.success) {
  const content = result.buffer.toString('utf-8');
  console.log(content);
}

// Liệt kê file
const files = await listFiles('uploads/');
console.log(files);
```

## 📁 Cấu trúc dự án

```
r2_connector/
├── server.js                   # API Server (Express)
├── index.js                    # File demo chính (CLI)
├── example-large-upload.js     # Demo upload file lớn
├── r2-client.js                # Kết nối R2 client
├── upload.js                   # Các hàm upload (bao gồm multipart)
├── download.js                 # Các hàm download
├── package.json                # Dependencies
├── .env.example                # Template cấu hình
├── .env                        # Cấu hình thực tế (không commit)
├── temp_uploads/               # Thư mục lưu file tạm (auto tạo)
├── R2-Connector-API.postman_collection.json  # Postman collection
└── README.md                   # Tài liệu này
```

## 🔐 Bảo mật

- **KHÔNG** commit file `.env` lên Git
- File `.gitignore` đã được cấu hình để bỏ qua `.env`
- Giữ **Secret Access Key** an toàn
- Chỉ cấp quyền cần thiết cho API Token

## 🛠️ API Reference

### Upload Functions

#### `uploadFile(filePath, key)`
- Upload file nhỏ từ đường dẫn local (< 100MB)
- `filePath`: Đường dẫn file cần upload
- `key`: Tên file trên R2 (optional, mặc định dùng tên file)

#### `uploadLargeFile(filePath, key, partSize)`
- **Upload file lớn (> 100MB, > 500MB)** sử dụng multipart upload
- `filePath`: Đường dẫn file cần upload
- `key`: Tên file trên R2 (optional, mặc định dùng tên file)
- `partSize`: Kích thước mỗi part (optional, mặc định 100MB)

#### `uploadFileAuto(filePath, key)`
- **Upload thông minh (Recommended)** - Tự động chọn method phù hợp
- File > 100MB: Dùng multipart upload
- File < 100MB: Dùng single upload
- `filePath`: Đường dẫn file cần upload
- `key`: Tên file trên R2 (optional)

#### `uploadContent(content, key)`
- Upload nội dung (string hoặc Buffer)
- `content`: Nội dung cần upload
- `key`: Tên file trên R2 (bắt buộc)

### Download Functions

#### `downloadFile(key, savePath)`
- Download file từ R2
- `key`: Tên file trên R2
- `savePath`: Đường dẫn lưu file (optional)

#### `listFiles(prefix)`
- Liệt kê file trong bucket
- `prefix`: Tiền tố để lọc (optional, ví dụ: "images/")

## ⚡ Upload File Lớn (> 500MB)

R2 hỗ trợ upload file lên đến **5TB** bằng multipart upload. Dự án này cung cấp 2 cách:

### Cách 1: Sử dụng `uploadFileAuto()` (Recommended)

```javascript
import { uploadFileAuto } from './upload.js';

// Tự động chọn method phù hợp
const result = await uploadFileAuto('./large-video.mp4', 'videos/large-video.mp4');
console.log(result);
```

### Cách 2: Sử dụng `uploadLargeFile()` trực tiếp

```javascript
import { uploadLargeFile } from './upload.js';

// Kiểm soát chi tiết hơn (part size, v.v.)
const result = await uploadLargeFile(
    './large-file.zip',
    'uploads/large-file.zip',
    50 * 1024 * 1024  // Part size: 50MB
);
console.log(result);
```

### Chạy ví dụ

```bash
node example-large-upload.js
```

### Lưu ý khi upload file lớn

- **Part size**: Mặc định 100MB, có thể điều chỉnh từ 5MB đến 5GB
- **Giới hạn**: R2 hỗ trợ tối đa 10,000 parts/file
- **File tối đa**: 5TB
- **Tự động retry**: Nếu upload bị lỗi, multipart upload sẽ tự động hủy và dọn dẹp

## 📝 License

ISC

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Tạo issue hoặc pull request nếu bạn muốn cải thiện dự án.

---

Tạo bởi R2 Connector Project
