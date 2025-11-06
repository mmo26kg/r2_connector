import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { uploadFile, uploadLargeFile, uploadFileAuto } from './upload.js';
import { downloadFile, listFiles } from './download.js';
import { backupPostgres, backupPostgresCustom } from './postgres-backup.js';
import {
    initBackupCron,
    stopBackupCron,
    startBackupCron,
    getCronStatus,
    triggerManualBackup,
    updateCronSchedule
} from './cron-backup.js';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cấu hình multer để lưu file tạm
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

// Khởi tạo cronjob backup tự động
console.log('\n🔧 Khởi tạo Backup Cronjob...');
initBackupCron();

// ===== ROUTES =====

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'R2 Connector API',
        version: '1.0.0',
        endpoints: {
            upload: 'POST /api/upload',
            uploadLarge: 'POST /api/upload/large',
            download: 'GET /api/download/:key',
            list: 'GET /api/files',
            delete: 'DELETE /api/delete/:key',
            backupPostgres: 'POST /api/backup/postgres',
            backupPostgresCustom: 'POST /api/backup/postgres/custom',
            cronStatus: 'GET /api/cron/status',
            cronStart: 'POST /api/cron/start',
            cronStop: 'POST /api/cron/stop',
            cronTrigger: 'POST /api/cron/trigger'
        }
    });
});

// Upload file (single upload - cho file < 100MB)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || req.file.originalname;
        const filePath = req.file.path;

        console.log(`📤 Uploading: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Upload lên R2
        const result = await uploadFile(filePath, customKey);

        // Xóa file tạm
        fs.unlinkSync(filePath);

        if (result.success) {
            res.json({
                success: true,
                message: 'Upload thành công',
                data: {
                    key: result.key,
                    etag: result.etag,
                    originalName: req.file.originalname,
                    size: req.file.size
                }
            });
        } else {
            res.status(500).json({ error: result.error });
        }

    } catch (error) {
        // Xóa file tạm nếu có lỗi
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Upload file lớn (multipart upload - cho file > 100MB)
app.post('/api/upload/large', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || req.file.originalname;
        const filePath = req.file.path;
        const partSize = parseInt(req.body.partSize) || 100 * 1024 * 1024; // Default 100MB

        console.log(`📤 Uploading large file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Upload lên R2 bằng multipart
        const result = await uploadLargeFile(filePath, customKey, partSize);

        // Xóa file tạm
        fs.unlinkSync(filePath);

        if (result.success) {
            res.json({
                success: true,
                message: 'Upload file lớn thành công',
                data: {
                    key: result.key,
                    etag: result.etag,
                    parts: result.parts,
                    originalName: req.file.originalname,
                    size: result.size
                }
            });
        } else {
            res.status(500).json({ error: result.error });
        }

    } catch (error) {
        // Xóa file tạm nếu có lỗi
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Upload tự động (auto-detect method)
app.post('/api/upload/auto', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || req.file.originalname;
        const filePath = req.file.path;

        console.log(`📤 Auto uploading: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Upload tự động
        const result = await uploadFileAuto(filePath, customKey);

        // Xóa file tạm
        fs.unlinkSync(filePath);

        if (result.success) {
            res.json({
                success: true,
                message: 'Upload thành công',
                data: result
            });
        } else {
            res.status(500).json({ error: result.error });
        }

    } catch (error) {
        // Xóa file tạm nếu có lỗi
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Download file
app.get('/api/download/:key(*)', async (req, res) => {
    try {
        const key = req.params.key;

        console.log(`📥 Downloading: ${key}`);

        const result = await downloadFile(key);

        if (result.success) {
            // Set headers để download
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
            res.send(result.buffer);
        } else {
            res.status(404).json({ error: result.error });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List files
app.get('/api/files', async (req, res) => {
    try {
        const prefix = req.query.prefix || '';

        console.log(`📁 Listing files with prefix: "${prefix}"`);

        const result = await listFiles(prefix);

        if (result.success) {
            res.json({
                success: true,
                count: result.count,
                files: result.files
            });
        } else {
            res.status(500).json({ error: result.error });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete file
app.delete('/api/delete/:key(*)', async (req, res) => {
    try {
        const key = req.params.key;

        console.log(`🗑️  Deleting: ${key}`);

        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const { createR2Client, bucketName } = await import('./r2-client.js');

        const r2Client = createR2Client();
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await r2Client.send(command);

        res.json({
            success: true,
            message: `Đã xóa file: ${key}`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== POSTGRES BACKUP ROUTES =====

// Backup PostgreSQL database (sử dụng pg_dump)
app.post('/api/backup/postgres', async (req, res) => {
    try {
        const { connectionString, fileName } = req.body;

        if (!connectionString) {
            connectionString = process.env.DATABASE_URL;
        }

        console.log(`💾 Bắt đầu backup PostgreSQL...`);

        const result = await backupPostgres(connectionString, fileName);

        if (result.success) {
            res.json({
                success: true,
                message: 'Backup PostgreSQL thành công',
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Backup PostgreSQL database (custom - không cần pg_dump)
app.post('/api/backup/postgres/custom', async (req, res) => {
    try {
        const { connectionString, fileName } = req.body;

        if (!connectionString) {
            return res.status(400).json({
                error: 'Thiếu connectionString. Format: postgresql://user:password@host:port/database'
            });
        }

        console.log(`💾 Bắt đầu custom backup PostgreSQL...`);

        const result = await backupPostgresCustom(connectionString, fileName);

        if (result.success) {
            res.json({
                success: true,
                message: 'Custom backup PostgreSQL thành công',
                data: result.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download backup file từ local
app.get('/api/backup/download/:fileName', async (req, res) => {
    try {
        const fileName = req.params.fileName;
        const backupPath = path.join('backups', fileName);

        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'File backup không tồn tại' });
        }

        res.download(backupPath, fileName);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CRON JOB MANAGEMENT ROUTES =====

// Lấy trạng thái cronjob
app.get('/api/cron/status', (req, res) => {
    try {
        const status = getCronStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bật cronjob
app.post('/api/cron/start', (req, res) => {
    try {
        const result = startBackupCron();
        if (result) {
            res.json({
                success: true,
                message: 'Cronjob đã được khởi động'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Cronjob chưa được khởi tạo'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tắt cronjob
app.post('/api/cron/stop', (req, res) => {
    try {
        const result = stopBackupCron();
        if (result) {
            res.json({
                success: true,
                message: 'Cronjob đã được dừng'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Cronjob chưa được khởi tạo'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger backup thủ công ngay lập tức
app.post('/api/cron/trigger', async (req, res) => {
    try {
        console.log('🔧 API trigger manual backup...');
        const result = await triggerManualBackup();

        if (result && result.status === 'success') {
            res.json({
                success: true,
                message: 'Backup thủ công thành công',
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                error: result?.error || 'Backup thất bại'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật cron schedule
app.post('/api/cron/schedule', (req, res) => {
    try {
        const { schedule, connectionString } = req.body;

        if (!schedule) {
            return res.status(400).json({
                error: 'Thiếu schedule. Ví dụ: "0 2 * * *" (mỗi ngày lúc 2:00 AM)'
            });
        }

        const result = updateCronSchedule(schedule, connectionString);

        if (result.success) {
            res.json({
                success: true,
                message: 'Đã cập nhật schedule',
                data: result
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        error: error.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 R2 Connector API đang chạy tại http://localhost:${PORT}`);
    console.log(`📖 Xem API docs tại http://localhost:${PORT}`);
});
