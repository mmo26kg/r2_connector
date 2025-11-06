import {
    getCronStatus,
    startBackupCron,
    stopBackupCron,
    triggerManualBackup,
    updateCronSchedule
} from '../services/cron.service.js';

/**
 * Get cron job status
 */
export async function getCronStatusHandler(req, res) {
    try {
        const status = getCronStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * Start cron job
 */
export async function startCronHandler(req, res) {
    try {
        const result = startBackupCron();
        if (result) {
            res.json({
                success: true,
                message: 'Cronjob đã được khởi động'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Cronjob chưa được khởi tạo'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * Stop cron job
 */
export async function stopCronHandler(req, res) {
    try {
        const result = stopBackupCron();
        if (result) {
            res.json({
                success: true,
                message: 'Cronjob đã được dừng'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Cronjob chưa được khởi tạo'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * Trigger manual backup immediately
 */
export async function triggerBackupHandler(req, res) {
    try {
        console.log('🔧 API trigger manual backup...');
        const result = await triggerManualBackup();

        if (result && result.status === 'success') {
            res.json({
                success: true,
                message: 'Backup thủ công thành công',
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                error: result?.error || 'Backup thất bại'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * Update cron schedule
 */
export async function updateScheduleHandler(req, res) {
    try {
        const { schedule, connectionString } = req.body;

        if (!schedule) {
            return res.status(400).json({
                error: 'Thiếu schedule. Ví dụ: "0 2 * * *" (mỗi ngày lúc 2:00 AM)'
            });
        }

        const result = updateCronSchedule(schedule, connectionString);

        if (result.success) {
            res.json({
                success: true,
                message: 'Đã cập nhật schedule',
                data: result
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
