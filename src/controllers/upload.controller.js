import fs from 'fs';
import { uploadFile, uploadLargeFile, uploadFileAuto, uploadExeFileTad, uploadRarFileTad } from '../services/upload.service.js';

/**
 * Upload single file (< 100MB)
 */
export async function uploadSingleFile(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || req.file.originalname;
        const filePath = req.file.path;

        console.log(`📤 Uploading: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

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
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
}

/**
 * Upload large file (multipart upload > 100MB)
 */
export async function uploadLargeFileHandler(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || req.file.originalname;
        const filePath = req.file.path;
        const partSize = parseInt(req.body.partSize) || 100 * 1024 * 1024;

        console.log(`📤 Uploading large file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

        const result = await uploadLargeFile(filePath, customKey, partSize);

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
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
}

/**
 * Upload auto (auto-detect method)
 */
export async function uploadAutoHandler(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || req.file.originalname;
        const filePath = req.file.path;

        console.log(`📤 Auto uploading: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

        const result = await uploadFileAuto(filePath, customKey);

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
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
}

/**
 * Upload exe file with auto-cleanup
 */
export async function uploadExeHandler(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || `exe/${req.file.originalname}`;
        const filePath = req.file.path;

        console.log(`📤 Uploading exe file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`🔍 Origin: ${req.headers.origin || 'same-origin'}`);

        const result = await uploadExeFileTad(filePath, customKey);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        if (result.success) {
            console.log(`✅ Upload exe thành công: ${customKey}`);

            res.json({
                success: true,
                message: 'Upload exe thành công, đã xóa version cũ và cập nhật Strapi',
                data: {
                    key: result.key,
                    etag: result.etag,
                    size: result.size,
                    sizeMB: result.sizeMB,
                    originalName: req.file.originalname,
                    strapiUpdated: result.strapiUpdated,
                    oldFilesDeleted: result.oldFilesDeleted
                }
            });
        } else {
            console.error(`❌ Upload exe failed: ${result.error}`);
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error(`❌ Upload exe exception: ${error.message}`);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Upload rar file with auto-cleanup
 */
export async function uploadRarHandler(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const customKey = req.body.key || `rar/${req.file.originalname}`;
        const filePath = req.file.path;

        console.log(`📤 Uploading rar file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`🔍 Origin: ${req.headers.origin || 'same-origin'}`);

        const result = await uploadRarFileTad(filePath, customKey);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        if (result.success) {
            console.log(`✅ Upload rar thành công: ${customKey}`);

            res.json({
                success: true,
                message: 'Upload rar thành công, đã xóa version cũ và cập nhật Strapi',
                data: {
                    key: result.key,
                    etag: result.etag,
                    size: result.size,
                    sizeMB: result.sizeMB,
                    originalName: req.file.originalname,
                    strapiUpdated: result.strapiUpdated,
                    oldFilesDeleted: result.oldFilesDeleted
                }
            });
        } else {
            console.error(`❌ Upload rar failed: ${result.error}`);
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error(`❌ Upload rar exception: ${error.message}`);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
