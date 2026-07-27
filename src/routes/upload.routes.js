import { Router } from 'express';
import {
    uploadSingleFile,
    uploadLargeFileHandler,
    uploadAutoHandler,
    uploadExeHandler,
    uploadRarHandler,
} from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { requireUploadAuth } from '../middlewares/upload-auth.middleware.js';

const router = Router();

// Legacy proxy upload routes. Keep for API compatibility, but require auth.
router.use('/upload', requireUploadAuth);
router.post('/upload', uploadMiddleware.single('file'), uploadSingleFile);
router.post('/upload/large', uploadMiddleware.single('file'), uploadLargeFileHandler);
router.post('/upload/auto', uploadMiddleware.single('file'), uploadAutoHandler);
router.post('/upload/exe', uploadMiddleware.single('file'), uploadExeHandler);
router.post('/upload/rar', uploadMiddleware.single('file'), uploadRarHandler);

export default router;
