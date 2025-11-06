import { Router } from 'express';
import {
    downloadFileHandler,
    getDownloadUrl,
    listFilesHandler,
    deleteFileHandler
} from '../controllers/download.controller.js';

const router = Router();

// Download routes
router.get('/download/:key(*)', downloadFileHandler);
router.get('/download-url/:key(*)', getDownloadUrl);
router.get('/files', listFilesHandler);
router.delete('/delete/:key(*)', deleteFileHandler);

export default router;
