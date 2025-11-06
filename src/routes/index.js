import { Router } from 'express';
import uploadRoutes from './upload.routes.js';
import downloadRoutes from './download.routes.js';
import backupRoutes from './backup.routes.js';
import cronRoutes from './cron.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

// Register all routes
router.use('/api', uploadRoutes);
router.use('/api', downloadRoutes);
router.use('/api', backupRoutes);
router.use('/api', cronRoutes);
router.use('/', dashboardRoutes);

export default router;
