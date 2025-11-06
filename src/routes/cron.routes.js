import { Router } from 'express';
import {
    getCronStatusHandler,
    startCronHandler,
    stopCronHandler,
    triggerBackupHandler,
    updateScheduleHandler
} from '../controllers/cron.controller.js';

const router = Router();

// Cron routes
router.get('/cron/status', getCronStatusHandler);
router.post('/cron/start', startCronHandler);
router.post('/cron/stop', stopCronHandler);
router.post('/cron/trigger', triggerBackupHandler);
router.post('/cron/schedule', updateScheduleHandler);

export default router;
