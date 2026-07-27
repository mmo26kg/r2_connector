import { Router } from 'express';
import {
    downloadFileHandler,
    getDownloadUrl,
    listFilesHandler,
    deleteFileHandler
} from '../controllers/download.controller.js';
import { requireUploadAuth } from '../middlewares/upload-auth.middleware.js';

const router = Router();

// Download routes
// Legacy proxy download remains for compatibility but no longer stays public.
router.get('/download/:key(*)', requireUploadAuth, downloadFileHandler);
router.get('/download-url/:key(*)', requireUploadAuth, getDownloadUrl);
router.get('/files', listFilesHandler);
router.delete('/delete/:key(*)', deleteFileHandler);

export default router;
