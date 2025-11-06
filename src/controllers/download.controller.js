import path from 'path';
import { downloadFile, listFiles } from '../services/download.service.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, bucketName } from '../config/r2-client.js';

/**
 * Download file from R2
 */
export async function downloadFileHandler(req, res) {
    try {
        const key = req.params.key;

        console.log(`📥 Downloading: ${key}`);
        console.log(`🔍 Origin: ${req.headers.origin || 'same-origin'}`);
        console.log(`🔍 Referer: ${req.headers.referer}`);

        const result = await downloadFile(key);

        if (result.success) {
            const origin = req.headers.origin;
            if (origin) {
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }

            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
            res.setHeader('Content-Length', result.buffer.length);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            console.log(`✅ Sending file: ${result.buffer.length} bytes`);
            res.send(result.buffer);
        } else {
            console.error(`❌ Download failed: ${result.error}`);
            res.status(404).json({ error: result.error });
        }

    } catch (error) {
        console.error(`❌ Exception: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get pre-signed download URL
 */
export async function getDownloadUrl(req, res) {
    try {
        const key = req.params.key;
        const expiresIn = parseInt(req.query.expires) || 3600;

        console.log(`🔗 Generating download URL for: ${key}`);

        const r2Client = createR2Client();
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });

        res.json({
            success: true,
            url: signedUrl,
            key: key,
            expiresIn: expiresIn,
            message: 'Pre-signed URL generated successfully'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * List files in R2
 */
export async function listFilesHandler(req, res) {
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
}

/**
 * Delete file from R2
 */
export async function deleteFileHandler(req, res) {
    try {
        const key = req.params.key;

        console.log(`🗑️  Deleting: ${key}`);

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
}
