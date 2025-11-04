import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createR2Client, bucketName } from './r2-client.js';
import fs from 'fs';
import path from 'path';

/**
 * Download file từ Cloudflare R2
 * @param {string} key - Tên file trên R2
 * @param {string} savePath - Đường dẫn lưu file (optional)
 * @returns {Promise<Object>} Kết quả download
 */
export async function downloadFile(key, savePath = null) {
    try {
        const r2Client = createR2Client();

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const response = await r2Client.send(command);

        // Chuyển stream thành buffer
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        // Nếu có savePath, lưu file
        if (savePath) {
            // Tạo thư mục nếu chưa tồn tại
            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(savePath, fileBuffer);
            console.log(`✅ Download và lưu thành công: ${savePath}`);

            return {
                success: true,
                key: key,
                savePath: savePath,
                size: fileBuffer.length,
                message: 'Download và lưu thành công'
            };
        }

        // Nếu không có savePath, trả về buffer
        console.log(`✅ Download thành công: ${key}`);
        return {
            success: true,
            key: key,
            buffer: fileBuffer,
            size: fileBuffer.length,
            message: 'Download thành công'
        };

    } catch (error) {
        console.error('❌ Lỗi download:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Liệt kê tất cả file trong bucket
 * @param {string} prefix - Prefix để lọc (optional, ví dụ: "images/")
 * @returns {Promise<Object>} Danh sách file
 */
export async function listFiles(prefix = '') {
    try {
        const r2Client = createR2Client();

        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
        });

        const response = await r2Client.send(command);

        const files = response.Contents?.map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
        })) || [];

        console.log(`📁 Tìm thấy ${files.length} file`);

        return {
            success: true,
            files: files,
            count: files.length
        };

    } catch (error) {
        console.error('❌ Lỗi list files:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
