import ejs from 'ejs';
import path from 'path';

/**
 * Render dashboard
 */
export async function renderDashboard(req, res) {
    try {
        const indexHtml = await ejs.renderFile(path.join(process.cwd(), 'views', 'index.ejs'));
        res.render('layout', { body: indexHtml });
    } catch (err) {
        res.status(500).send('Error rendering dashboard: ' + err.message);
    }
}

/**
 * Health check
 */
export function healthCheck(req, res) {
    res.json({
        message: 'R2 Connector API',
        version: '1.0.0',
        endpoints: {
            upload: 'POST /api/upload',
            uploadLarge: 'POST /api/upload/large',
            uploadAuto: 'POST /api/upload/auto',
            uploadExe: 'POST /api/upload/exe',
            directUploadInit: 'POST /api/uploads/init',
            directUploadSignParts: 'POST /api/uploads/:sessionId/parts/sign',
            directUploadComplete: 'POST /api/uploads/:sessionId/complete',
            directUploadAbort: 'DELETE /api/uploads/:sessionId',
            download: 'GET /api/download/:key',
            directDownloadUrl: 'GET /api/download-url/:key',
            list: 'GET /api/files',
            delete: 'DELETE /api/delete/:key',
            backupPostgres: 'POST /api/backup/postgres',
            backupPostgresCustom: 'POST /api/backup/postgres/custom',
            cronStatus: 'GET /api/cron/status',
            cronStart: 'POST /api/cron/start',
            cronStop: 'POST /api/cron/stop',
            cronTrigger: 'POST /api/cron/trigger'
        }
    });
}
