import multer from 'multer';
import fs from 'fs';

/**
 * Multer configuration for file uploads
 */
const upload = multer({
    dest: 'temp_uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 * 1024 // 5GB max
    }
});

// Tạo thư mục temp nếu chưa có
if (!fs.existsSync('temp_uploads')) {
    fs.mkdirSync('temp_uploads', { recursive: true });
}

export const uploadMiddleware = upload;
