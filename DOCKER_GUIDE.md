# Docker Deployment Guide

Hướng dẫn chạy R2 Connector API bằng Docker và Docker Compose.

## 🐳 Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0

## 🚀 Quick Start

### 1. Cấu hình Environment Variables

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin thực tế:

```env
# Cloudflare R2 (Required)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name

# PostgreSQL Database (Optional - dùng demo DB từ docker-compose)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mydb

# Backup Cronjob (Optional)
BACKUP_CRON_SCHEDULE=0 2 * * *
BACKUP_TIMEZONE=Asia/Ho_Chi_Minh
```

### 2. Khởi chạy với Docker Compose

```bash
# Build và chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Chỉ chạy R2 Connector (không có PostgreSQL)
docker-compose up -d r2-connector
```

### 3. Kiểm tra

```bash
# Kiểm tra containers đang chạy
docker-compose ps

# Test API
curl http://localhost:3000

# Xem logs
docker-compose logs -f r2-connector
```

## 📦 Build và Run riêng lẻ

### Build Docker Image

```bash
# Build image
docker build -t r2-connector:latest .

# Với custom tag
docker build -t r2-connector:v1.0.0 .
```

### Run Docker Container

```bash
# Chạy container với env variables
docker run -d \
  --name r2-connector \
  -p 3000:3000 \
  -e R2_ACCOUNT_ID=your_account_id \
  -e R2_ACCESS_KEY_ID=your_access_key \
  -e R2_SECRET_ACCESS_KEY=your_secret_key \
  -e R2_BUCKET_NAME=your_bucket \
  -v $(pwd)/backups:/app/backups \
  r2-connector:latest

# Hoặc dùng file .env
docker run -d \
  --name r2-connector \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/backups:/app/backups \
  r2-connector:latest
```

## 🔧 Docker Compose Commands

```bash
# Khởi động services
docker-compose up -d

# Dừng services
docker-compose down

# Dừng và xóa volumes
docker-compose down -v

# Rebuild images
docker-compose build

# Rebuild và restart
docker-compose up -d --build

# Xem logs
docker-compose logs -f
docker-compose logs -f r2-connector
docker-compose logs -f postgres

# Restart service
docker-compose restart r2-connector

# Xem status
docker-compose ps

# Exec vào container
docker-compose exec r2-connector sh
docker-compose exec postgres psql -U postgres -d mydb
```

## 📁 Volumes

Docker Compose tự động mount các thư mục:

- `./backups` → `/app/backups` (Database backups)
- `./temp_uploads` → `/app/temp_uploads` (Temporary uploads)
- `postgres-data` → PostgreSQL data volume

## 🌐 Ports

- **3000**: R2 Connector API
- **5432**: PostgreSQL Database (optional)

## 🔍 Health Checks

### R2 Connector API

```bash
# Check health status
docker-compose exec r2-connector wget -q -O- http://localhost:3000

# Xem health status trong docker ps
docker ps
```

### PostgreSQL

```bash
# Check PostgreSQL connection
docker-compose exec postgres pg_isready -U postgres
```

## 🎯 Production Deployment

### 1. Sử dụng external PostgreSQL

Sửa `docker-compose.yml`, comment hoặc xóa phần `postgres` service:

```yaml
services:
  r2-connector:
    # ... config như cũ
    environment:
      - DATABASE_URL=postgresql://user:pass@external-host:5432/dbname
    # Xóa depends_on postgres
```

### 2. Sử dụng environment variables từ host

```bash
# Không cần file .env, pass trực tiếp
export R2_ACCOUNT_ID=xxx
export R2_ACCESS_KEY_ID=xxx
export R2_SECRET_ACCESS_KEY=xxx
export R2_BUCKET_NAME=xxx

docker-compose up -d
```

### 3. Custom Dockerfile cho production

Tạo `Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:18-alpine
RUN apk add --no-cache postgresql-client
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
RUN mkdir -p temp_uploads backups downloads
EXPOSE 3000
CMD ["node", "server.js"]
```

Build:
```bash
docker build -f Dockerfile.prod -t r2-connector:prod .
```

## 🔐 Security Best Practices

1. **Không commit file `.env`** lên Git
2. **Sử dụng secrets** trong production:
   ```bash
   docker secret create r2_secret_key my_secret_value
   ```
3. **Giới hạn resource**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
   ```
4. **Run as non-root user** (thêm vào Dockerfile):
   ```dockerfile
   USER node
   ```

## 📊 Monitoring

### View logs trong realtime

```bash
docker-compose logs -f --tail=100 r2-connector
```

### Monitor resource usage

```bash
docker stats r2-connector-api
```

### Access container shell

```bash
docker-compose exec r2-connector sh
```

## 🐛 Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
docker-compose logs r2-connector

# Kiểm tra config
docker-compose config
```

### Lỗi PostgreSQL connection

```bash
# Kiểm tra PostgreSQL đang chạy
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"
```

### Rebuild từ đầu

```bash
# Xóa everything và rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Port đã được sử dụng

```bash
# Đổi port trong docker-compose.yml
ports:
  - "3001:3000"  # Host:Container
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: docker build -t r2-connector:latest .
      
      - name: Push to registry
        run: |
          docker tag r2-connector:latest registry.example.com/r2-connector:latest
          docker push registry.example.com/r2-connector:latest
```

## 📝 Notes

- Image size: ~150MB (Alpine-based)
- Startup time: ~2-3 seconds
- Includes PostgreSQL client tools (pg_dump)
- Auto-restart enabled
- Health checks configured

## 🎉 Ready!

Dự án đã sẵn sàng chạy trên Docker! 🐳
