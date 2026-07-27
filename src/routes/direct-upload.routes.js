import { Router } from 'express';
import {
    abortDirectUpload,
    completeDirectUpload,
    initDirectUpload,
    signDirectUploadParts
} from '../controllers/direct-upload.controller.js';
import { requireUploadAuth } from '../middlewares/upload-auth.middleware.js';

const router = Router();

router.use('/uploads', requireUploadAuth);
router.post('/uploads/init', initDirectUpload);
router.post('/uploads/:sessionId/parts/sign', signDirectUploadParts);
router.post('/uploads/:sessionId/complete', completeDirectUpload);
router.delete('/uploads/:sessionId', abortDirectUpload);

export default router;
