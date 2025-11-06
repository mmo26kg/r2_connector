import {
    PutObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { createR2Client, bucketName } from './r2-client.js';
import { listFiles } from './download.js';
import fs from 'fs';
import path from 'path';

/**
 * Upload file lên Cloudflare R2 (single upload cho file < 100MB)
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
        const fileStats = fs.statSync(filePath);

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

        console.log(`✅ Upload thành công: ${fileKey} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);

        return {
            success: true,
            key: fileKey,
            etag: response.ETag,
            size: fileStats.size,
            sizeMB: (fileStats.size / 1024 / 1024).toFixed(2),
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

        console.log(`✅ Upload content thành công: ${key}`);

        return {
            success: true,
            key: key,
            etag: response.ETag,
            message: 'Upload thành công'
        };

    } catch (error) {
        console.error('❌ Lỗi upload content:', error.message);
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
    let fileHandle;

    try {
        // Kiểm tra file tồn tại
        if (!fs.existsSync(filePath)) {
            throw new Error(`File không tồn tại: ${filePath}`);
        }

        const fileKey = key || path.basename(filePath);
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;

        console.log(`📦 Bắt đầu multipart upload: ${fileKey} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

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
        fileHandle = fs.openSync(filePath, 'r');
        const parts = [];
        let partNumber = 1;
        let position = 0;
        const totalParts = Math.ceil(fileSize / partSize);

        while (position < fileSize) {
            const chunkSize = Math.min(partSize, fileSize - position);
            const buffer = Buffer.alloc(chunkSize);

            fs.readSync(fileHandle, buffer, 0, chunkSize, position);

            console.log(`⬆️  Part ${partNumber}/${totalParts} (${(chunkSize / 1024 / 1024).toFixed(2)} MB)`);

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
        fileHandle = null;

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

        console.log(`✅ Multipart upload hoàn tất: ${fileKey}`);

        return {
            success: true,
            key: fileKey,
            uploadId: uploadId,
            etag: completeResponse.ETag,
            location: completeResponse.Location,
            parts: parts.length,
            size: fileSize,
            sizeMB: (fileSize / 1024 / 1024).toFixed(2),
            message: 'Upload file lớn thành công'
        };

    } catch (error) {
        console.error('❌ Lỗi upload file lớn:', error.message);

        // Đóng file handle nếu đang mở
        if (fileHandle) {
            try {
                fs.closeSync(fileHandle);
            } catch (closeError) {
                console.error('Lỗi đóng file:', closeError.message);
            }
        }

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

/**
 * Upload file exe và tự động xóa các version cũ, cập nhật Strapi
 * @param {string} filePath - Đường dẫn file exe cần upload
 * @param {string} key - Tên file trên R2
 * @returns {Promise<Object>} Kết quả upload
 */
export async function uploadExeFileTad(filePath, key) {
    try {
        // Upload file exe (tự động chọn multipart hoặc single)
        console.log('📦 Upload file exe...');
        const uploadResult = await uploadFileAuto(filePath, key);

        if (!uploadResult.success) {
            console.error('❌ Lỗi upload file exe:', uploadResult.error);
            return uploadResult;
        }

        console.log('✅ Upload file exe thành công');

        // Cập nhật endpoint Strapi
        console.log('🔄 Cập nhật Strapi...');
        await updateEndpointStrapi(key);

        // Liệt kê các file có prefix /exe trên R2
        console.log('📋 Liệt kê file exe cũ...');
        const listResult = await listFiles('exe');

        if (!listResult.success) {
            console.error('❌ Lỗi liệt kê file exe:', listResult.error);
            return uploadResult; // Vẫn trả về kết quả upload
        }

        const files = listResult.files;
        const r2Client = createR2Client();

        // Xóa các file cũ (trừ file vừa upload và folder chứa file)
        for (const file of files) {
            if (file.key !== key && file.size > 0) {
                console.log(`🗑️  Xóa file cũ: ${file.key}`);

                const deleteCommand = new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: file.key,
                });

                await r2Client.send(deleteCommand);
                console.log(`✅ Đã xóa: ${file.key}`);
            }
        }

        console.log('✅ Hoàn tất upload và dọn dẹp file exe');

        return {
            ...uploadResult,
            strapiUpdated: true,
            oldFilesDeleted: files.filter(f => f.Key !== key).length
        };

    } catch (error) {
        console.error('❌ Lỗi uploadExeFileTad:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Cập nhật endpoint download trên Strapi
 * @param {string} key - Key file trên R2
 * @returns {Promise<void>}
 */
async function updateEndpointStrapi(key) {
    try {
        const strapiUrl = process.env.STRAPI_URL;
        const strapiToken = process.env.STRAPI_API_TOKEN;

        if (!strapiUrl || !strapiToken) {
            console.warn('⚠️  Thiếu STRAPI_URL hoặc STRAPI_API_TOKEN, bỏ qua cập nhật Strapi');
            return;
        }

        const downloadUrl = `https://storage.taddesign.net/${key}`;

        const response = await fetch(`${strapiUrl}/api/site-data`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${strapiToken}`
            },
            body: JSON.stringify({
                data: {
                    exeDownloadLink: downloadUrl
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Strapi API error: ${response.status} - ${errorText}`);
        }

        console.log('✅ Cập nhật endpoint Strapi thành công');

    } catch (error) {
        console.error('❌ Lỗi cập nhật Strapi:', error.message);
        throw error; // Re-throw để caller xử lý
    }
}