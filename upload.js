import {
    PutObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { createR2Client, bucketName } from './r2-client.js';
import fs from 'fs';
import path from 'path';

/**
 * Upload file lên Cloudflare R2
 * @param {string} filePath - Đường dẫn file cần upload
 * @param {string} key - Tên file trên R2 (có thể bao gồm folder path)
 * @returns {Promise<Object>} Kết quả upload
 */
export async function uploadFile(filePath, key = null) {
    try {
        // Kiểm tra file tồn tại
        if (!fs.existsSync(filePath)) {
            throw new Error(`File không tồn tại: ${filePath}`);
        }

        // Nếu không có key, dùng tên file
        const fileKey = key || path.basename(filePath);

        // Đọc nội dung file
        const fileContent = fs.readFileSync(filePath);

        // Tạo R2 client
        const r2Client = createR2Client();

        // Chuẩn bị command upload
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: fileContent,
        });

        // Thực hiện upload
        const response = await r2Client.send(command);

        console.log(`✅ Upload thành công: ${fileKey}`);

        return {
            success: true,
            key: fileKey,
            etag: response.ETag,
            message: 'Upload thành công'
        };

    } catch (error) {
        console.error('❌ Lỗi upload:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload buffer hoặc string lên R2
 * @param {Buffer|string} content - Nội dung cần upload
 * @param {string} key - Tên file trên R2
 * @returns {Promise<Object>} Kết quả upload
 */
export async function uploadContent(content, key) {
    try {
        if (!key) {
            throw new Error('Key (tên file) là bắt buộc');
        }

        const r2Client = createR2Client();

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: content,
        });

        const response = await r2Client.send(command);

        console.log(`✅ Upload thành công: ${key}`);

        return {
            success: true,
            key: key,
            etag: response.ETag,
            message: 'Upload thành công'
        };

    } catch (error) {
        console.error('❌ Lỗi upload:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload file lớn bằng multipart upload (dành cho file > 100MB)
 * @param {string} filePath - Đường dẫn file cần upload
 * @param {string} key - Tên file trên R2
 * @param {number} partSize - Kích thước mỗi part (mặc định 100MB)
 * @returns {Promise<Object>} Kết quả upload
 */
export async function uploadLargeFile(filePath, key = null, partSize = 100 * 1024 * 1024) {
    let uploadId;

    try {
        // Kiểm tra file tồn tại
        if (!fs.existsSync(filePath)) {
            throw new Error(`File không tồn tại: ${filePath}`);
        }

        const fileKey = key || path.basename(filePath);
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;

        console.log(`📦 Bắt đầu upload file lớn: ${fileKey} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

        const r2Client = createR2Client();

        // Bước 1: Tạo multipart upload
        const createCommand = new CreateMultipartUploadCommand({
            Bucket: bucketName,
            Key: fileKey,
        });

        const { UploadId } = await r2Client.send(createCommand);
        uploadId = UploadId;
        console.log(`🔑 Upload ID: ${uploadId}`);

        // Bước 2: Upload từng part
        const fileHandle = fs.openSync(filePath, 'r');
        const parts = [];
        let partNumber = 1;
        let position = 0;

        while (position < fileSize) {
            const chunkSize = Math.min(partSize, fileSize - position);
            const buffer = Buffer.alloc(chunkSize);

            fs.readSync(fileHandle, buffer, 0, chunkSize, position);

            console.log(`⬆️  Uploading part ${partNumber}/${Math.ceil(fileSize / partSize)} (${(chunkSize / 1024 / 1024).toFixed(2)} MB)`);

            const uploadPartCommand = new UploadPartCommand({
                Bucket: bucketName,
                Key: fileKey,
                UploadId: uploadId,
                PartNumber: partNumber,
                Body: buffer,
            });

            const uploadPartResponse = await r2Client.send(uploadPartCommand);

            parts.push({
                ETag: uploadPartResponse.ETag,
                PartNumber: partNumber,
            });

            position += chunkSize;
            partNumber++;
        }

        fs.closeSync(fileHandle);

        // Bước 3: Hoàn thành multipart upload
        const completeCommand = new CompleteMultipartUploadCommand({
            Bucket: bucketName,
            Key: fileKey,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts,
            },
        });

        const completeResponse = await r2Client.send(completeCommand);

        console.log(`✅ Upload hoàn tất: ${fileKey}`);

        return {
            success: true,
            key: fileKey,
            uploadId: uploadId,
            etag: completeResponse.ETag,
            location: completeResponse.Location,
            parts: parts.length,
            size: fileSize,
            message: 'Upload file lớn thành công'
        };

    } catch (error) {
        console.error('❌ Lỗi upload file lớn:', error.message);

        // Hủy multipart upload nếu có lỗi
        if (uploadId) {
            try {
                const abortCommand = new AbortMultipartUploadCommand({
                    Bucket: bucketName,
                    Key: key || path.basename(filePath),
                    UploadId: uploadId,
                });
                await createR2Client().send(abortCommand);
                console.log('🔄 Đã hủy multipart upload');
            } catch (abortError) {
                console.error('Lỗi khi hủy upload:', abortError.message);
            }
        }

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload file thông minh - tự động chọn method phù hợp
 * Dùng multipart cho file > 100MB, single upload cho file nhỏ hơn
 * @param {string} filePath - Đường dẫn file cần upload
 * @param {string} key - Tên file trên R2
 * @returns {Promise<Object>} Kết quả upload
 */
export async function uploadFileAuto(filePath, key = null) {
    const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

    if (!fs.existsSync(filePath)) {
        throw new Error(`File không tồn tại: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    console.log(`📊 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    if (fileSize > MULTIPART_THRESHOLD) {
        console.log('🚀 Sử dụng multipart upload cho file lớn');
        return await uploadLargeFile(filePath, key);
    } else {
        console.log('⚡ Sử dụng single upload cho file nhỏ');
        return await uploadFile(filePath, key);
    }
}

