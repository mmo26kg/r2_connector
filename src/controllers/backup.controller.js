import fs from 'fs';
import path from 'path';
import { backupPostgres, backupPostgresCustom } from '../services/backup.service.js';

/**
 * Backup PostgreSQL using pg_dump
 */
export async function backupPostgresHandler(req, res) {
    try {
        let { connectionString, fileName } = req.body;

        if (!connectionString) {
            connectionString = process.env.DATABASE_URL;
        }

        if (!connectionString) {
            return res.status(400).json({
                success: false,
                error: 'Thiếu DATABASE_URL. Vui lòng cấu hình DATABASE_URL trong .env hoặc gửi connectionString trong request body.'
            });
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
}

/**
 * Backup PostgreSQL using custom method
 */
export async function backupPostgresCustomHandler(req, res) {
    try {
        let { connectionString, fileName } = req.body;

        if (!connectionString) {
            connectionString = process.env.DATABASE_URL;
        }

        if (!connectionString) {
            return res.status(400).json({
                success: false,
                error: 'Thiếu DATABASE_URL. Vui lòng cấu hình DATABASE_URL trong .env hoặc gửi connectionString trong request body.'
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
}

/**
 * Download backup file from local
 */
export async function downloadBackupHandler(req, res) {
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
}
