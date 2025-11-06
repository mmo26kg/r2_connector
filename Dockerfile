# Sử dụng Node.js 18 LTS
FROM node:18-alpine

# Cài đặt PostgreSQL client tools (pg_dump)
RUN apk add --no-cache postgresql-client

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Tạo các thư mục cần thiết
RUN mkdir -p temp_uploads backups downloads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Chạy server
CMD ["node", "server.js"]
