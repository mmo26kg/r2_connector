# 🚂 Hướng dẫn Deploy lên Railway

## 📋 Yêu cầu

- Tài khoản Railway (free tier hoặc paid)
- Repository GitHub (push code lên trước)
- Cloudflare R2 Account & API Token

## 🚀 Các bước deploy

### 1. Chuẩn bị Repository

```bash
# Commit tất cả thay đổi
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. Tạo Project trên Railway

1. Truy cập https://railway.app/
2. Click **New Project** → **Deploy from GitHub repo**
3. Chọn repository `r2_connector`
4. Railway sẽ tự động detect và deploy

### 3. Cấu hình Environment Variables

Vào **Variables** tab và thêm các biến sau:

#### ✅ Bắt buộc (R2 Configuration)

```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
PORT=3000
```

#### ✅ Quan trọng (PostgreSQL Backup)

```
DATABASE_URL=postgresql://user:password@host:port/database
USE_CUSTOM_BACKUP=true
```

**⚠️ LƯU Ý**: Bắt buộc set `USE_CUSTOM_BACKUP=true` trên Railway vì Railway không có `pg_dump` command sẵn.

#### 📅 Optional (Cronjob)

```
BACKUP_CRON_SCHEDULE=0 2 * * *
BACKUP_TIMEZONE=Asia/Ho_Chi_Minh
```

### 4. Cấu hình Build Settings (Quan trọng!)

Railway mặc định dùng **Nixpacks**, nhưng để có PostgreSQL client tools, cần dùng **Dockerfile**.

**Cách 1: Sử dụng Dockerfile (Recommended)**

1. Vào **Settings** → **Build**
2. Tìm section **Builder**
3. Chọn **Dockerfile** thay vì Nixpacks

**Cách 2: Dùng Nixpacks + Custom Backup**

Nếu muốn giữ Nixpacks:
- Set `USE_CUSTOM_BACKUP=true` trong Variables
- Custom backup method sẽ tự động được sử dụng (không cần pg_dump)

### 5. Deploy

Railway sẽ tự động:
1. Build Docker image (nếu dùng Dockerfile)
2. Install dependencies
3. Chạy `npm run server`
4. Expose port từ biến `PORT`

### 6. Lấy URL Public

1. Vào **Settings** → **Networking**
2. Click **Generate Domain**
3. Sẽ nhận được URL dạng: `https://your-app.up.railway.app`

## 🔍 Kiểm tra Deploy

### Test Health Check

```bash
curl https://your-app.up.railway.app/health
```

Response:
```json
{
  "status": "OK",
  "service": "R2 Connector API",
  "uptime": 123.45,
  "timestamp": "2025-11-06T..."
}
```

### Test Cronjob Status

```bash
curl https://your-app.up.railway.app/api/cron/status
```

## 📊 Xem Logs

1. Vào Railway Dashboard
2. Click vào service `r2_connector`
3. Xem tab **Deployments** → **View Logs**

Logs sẽ hiển thị:
```
🔔 Cronjob backup được kích hoạt!
💾 Bắt đầu backup tự động...
📝 Sử dụng custom backup method (USE_CUSTOM_BACKUP=true)
✅ Backup tự động thành công!
```

## ⚙️ Cấu hình PostgreSQL trên Railway

### Option 1: Dùng Railway PostgreSQL

1. Vào project → **New** → **Database** → **PostgreSQL**
2. Railway tự động tạo database và cung cấp `DATABASE_URL`
3. Copy `DATABASE_URL` vào Variables của `r2_connector` service

### Option 2: Dùng External PostgreSQL

Nếu database ở nơi khác (AWS RDS, Supabase, etc.):
```
DATABASE_URL=postgresql://user:password@external-host:5432/dbname
```

## 🔧 Troubleshooting

### ❌ Lỗi: pg_dump command not found

**Nguyên nhân**: Railway không có PostgreSQL client tools

**Giải pháp**:
```bash
# Set biến môi trường
USE_CUSTOM_BACKUP=true
```

Hoặc chuyển sang dùng Dockerfile (Settings → Build → Dockerfile)

### ❌ Lỗi: Database connection failed

Kiểm tra:
1. `DATABASE_URL` có đúng format không
2. Railway service có thể kết nối ra ngoài (kiểm tra firewall)
3. Database host có cho phép connection từ Railway IP không

### ❌ Cronjob không chạy

Kiểm tra logs:
```
⚠️ Không tìm thấy DATABASE_URL. Cronjob backup sẽ không được khởi tạo.
```

Đảm bảo đã set `DATABASE_URL` trong Variables.

## 🔄 Update & Redeploy

Railway tự động deploy khi có commit mới:

```bash
# Thay đổi code
git add .
git commit -m "Update features"
git push origin main

# Railway tự động detect và deploy
```

Hoặc manual redeploy:
1. Vào Deployments tab
2. Click **Redeploy**

## 💰 Chi phí

- **Free Tier**: 500 hours/month, $5 credit
- **Pro Plan**: $20/month unlimited hours

Lưu ý: R2 storage và transfer có tính phí riêng từ Cloudflare.

## 🎯 Checklist Deploy

- [ ] Code đã push lên GitHub
- [ ] Tạo project trên Railway từ GitHub repo
- [ ] Set tất cả environment variables cần thiết
- [ ] Set `USE_CUSTOM_BACKUP=true` (quan trọng!)
- [ ] Chọn Dockerfile builder (hoặc dùng Nixpacks + custom backup)
- [ ] Generate public domain
- [ ] Test health check endpoint
- [ ] Test cronjob status
- [ ] Kiểm tra logs không có lỗi

## 📚 Tài liệu tham khảo

- [Railway Docs](https://docs.railway.app/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Environment Variables](https://docs.railway.app/develop/variables)
