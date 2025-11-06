import { Router } from 'express';
import { renderDashboard, healthCheck } from '../controllers/dashboard.controller.js';

const router = Router();

// Dashboard routes
router.get('/', healthCheck);
router.get('/dashboard', renderDashboard);

export default router;
