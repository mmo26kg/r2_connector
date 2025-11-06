import express from 'express';
import path from 'path';
import { config } from './src/config/app.config.js';
import { corsMiddleware, corsPreflightMiddleware } from './src/middlewares/cors.middleware.js';
import { errorHandler } from './src/middlewares/error.middleware.js';
import { initBackupCron } from './src/services/cron.service.js';
import routes from './src/routes/index.js';

const app = express();
const PORT = config.port;

// ===== MIDDLEWARES =====
app.use(corsMiddleware);
app.options('*', corsPreflightMiddleware);
app.use(express.json());

// ===== VIEW ENGINE =====
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.use(express.static(path.join(process.cwd(), 'public')));

// ===== ROUTES =====
app.use('/', routes);

// ===== ERROR HANDLER =====
app.use(errorHandler);

// ===== INITIALIZE CRON =====
console.log('\n🔧 Khởi tạo Backup Cronjob...');
initBackupCron();

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 R2 Connector API đang chạy tại http://localhost:${PORT}`);
    console.log(`📖 Xem API docs tại http://localhost:${PORT}`);
    console.log(`📊 Dashboard tại http://localhost:${PORT}/dashboard`);
});
