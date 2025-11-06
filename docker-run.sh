#!/bin/bash

# Script build và chạy Docker cho R2 Connector

echo "🐳 R2 Connector - Docker Build & Run Script"
echo "==========================================="

# Kiểm tra .env file
if [ ! -f .env ]; then
    echo "⚠️  File .env không tồn tại!"
    echo "📝 Tạo file .env từ .env.example..."
    cp .env.example .env
    echo "✅ File .env đã được tạo. Vui lòng cập nhật thông tin R2 credentials."
    echo ""
    read -p "Nhấn Enter để tiếp tục sau khi đã cấu hình .env..."
fi

# Menu
echo ""
echo "Chọn action:"
echo "1) Build và chạy tất cả (API + PostgreSQL)"
echo "2) Chỉ chạy API (không PostgreSQL)"
echo "3) Stop tất cả containers"
echo "4) Rebuild từ đầu"
echo "5) Xem logs"
echo "6) Xem status"
echo "7) Exit"
echo ""
read -p "Nhập lựa chọn (1-7): " choice

case $choice in
    1)
        echo "🚀 Building và starting tất cả services..."
        docker-compose up -d --build
        echo "✅ Done! API đang chạy tại http://localhost:3000"
        ;;
    2)
        echo "🚀 Building và starting chỉ R2 Connector API..."
        docker-compose up -d --build r2-connector
        echo "✅ Done! API đang chạy tại http://localhost:3000"
        ;;
    3)
        echo "🛑 Stopping tất cả containers..."
        docker-compose down
        echo "✅ Stopped!"
        ;;
    4)
        echo "🔄 Rebuilding từ đầu..."
        docker-compose down -v
        docker-compose build --no-cache
        docker-compose up -d
        echo "✅ Done! API đang chạy tại http://localhost:3000"
        ;;
    5)
        echo "📋 Viewing logs (Ctrl+C để thoát)..."
        docker-compose logs -f
        ;;
    6)
        echo "📊 Container status:"
        docker-compose ps
        ;;
    7)
        echo "👋 Bye!"
        exit 0
        ;;
    *)
        echo "❌ Lựa chọn không hợp lệ!"
        exit 1
        ;;
esac

echo ""
echo "📖 Useful commands:"
echo "  - Xem logs: docker-compose logs -f"
echo "  - Stop: docker-compose down"
echo "  - Restart: docker-compose restart"
echo "  - Exec: docker-compose exec r2-connector sh"
