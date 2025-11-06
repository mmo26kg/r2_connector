import { Router } from 'express';
import {
    uploadSingleFile,
    uploadLargeFileHandler,
    uploadAutoHandler,
    uploadExeHandler
} from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';

const router = Router();

// Upload routes
router.post('/upload', uploadMiddleware.single('file'), uploadSingleFile);
router.post('/upload/large', uploadMiddleware.single('file'), uploadLargeFileHandler);
router.post('/upload/auto', uploadMiddleware.single('file'), uploadAutoHandler);
router.post('/upload/exe', uploadMiddleware.single('file'), uploadExeHandler);

export default router;
