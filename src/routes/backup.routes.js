import { Router } from 'express';
import {
    backupPostgresHandler,
    backupPostgresCustomHandler,
    downloadBackupHandler
} from '../controllers/backup.controller.js';

const router = Router();

// Backup routes
router.post('/backup/postgres', backupPostgresHandler);
router.post('/backup/postgres/custom', backupPostgresCustomHandler);
router.get('/backup/download/:fileName', downloadBackupHandler);

export default router;
