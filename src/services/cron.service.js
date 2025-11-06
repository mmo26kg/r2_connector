import cron from 'node-cron';
import dotenv from 'dotenv';
import { backupPostgres, backupPostgresCustom } from './backup.service.js';

dotenv.config();

let cronJob = null;
let isRunning = false;
let lastBackup = null;
let backupHistory = [];

/**
 * Khởi tạo cronjob backup PostgreSQL
 * @param {string} schedule - Cron schedule (optional, mặc định lấy từ .env)
 * @param {string} connectionString - Database connection string (optional, mặc định lấy từ .env)
 */
export function initBackupCron(schedule = null, connectionString = null) {
    const cronSchedule = schedule || process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *'; // Mặc định 2:00 AM mỗi ngày
    const dbUrl = connectionString || process.env.DATABASE_URL;

    if (!dbUrl) {
        console.warn('⚠️  Không tìm thấy DATABASE_URL. Cronjob backup sẽ không được khởi tạo.');
        return null;
    }

    // Validate cron expression
    if (!cron.validate(cronSchedule)) {
        console.error(`❌ Cron schedule không hợp lệ: ${cronSchedule}`);
        return null;
    }

    console.log(`⏰ Khởi tạo cronjob backup PostgreSQL với schedule: ${cronSchedule}`);
    console.log(`📅 Mô tả: ${getCronDescription(cronSchedule)}`);

    cronJob = cron.schedule(cronSchedule, async () => {
        console.log('\n🔔 Cronjob backup được kích hoạt!');
        await performBackup(dbUrl);
    }, {
        scheduled: true,
        timezone: process.env.BACKUP_TIMEZONE || 'Asia/Ho_Chi_Minh'
    });

    isRunning = true;
    console.log('✅ Cronjob backup đã được khởi tạo và đang chạy');

    return cronJob;
}

/**
 * Thực hiện backup
 * @param {string} connectionString - Database connection string
 */
async function performBackup(connectionString) {
    const startTime = Date.now();

    try {
        console.log('💾 Bắt đầu backup tự động...');

        // Tạo tên file với timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `auto-backup-${timestamp}.sql`;

        // Kiểm tra có force dùng custom backup không
        const useCustomBackup = process.env.USE_CUSTOM_BACKUP === 'true';

        // Thử backup bằng pg_dump trước (nếu không force custom)
        let result;
        if (useCustomBackup) {
            console.log('📝 Sử dụng custom backup method (USE_CUSTOM_BACKUP=true)');
            result = await backupPostgresCustom(connectionString, fileName);
        } else {
            try {
                result = await backupPostgres(connectionString, fileName);
            } catch (error) {
                console.warn('⚠️  pg_dump failed, fallback to custom backup...');
                result = await backupPostgresCustom(connectionString, fileName);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (result.success) {
            lastBackup = {
                timestamp: new Date(),
                fileName: result.data.fileName,
                size: result.data.sizeMB,
                r2Key: result.data.r2Key,
                duration: duration,
                status: 'success'
            };

            // Lưu vào history (giữ 10 backup gần nhất)
            backupHistory.unshift(lastBackup);
            if (backupHistory.length > 10) {
                backupHistory = backupHistory.slice(0, 10);
            }

            console.log(`✅ Backup tự động thành công! Thời gian: ${duration}s`);
            console.log(`📦 File: ${result.data.fileName} (${result.data.sizeMB} MB)`);
        } else {
            lastBackup = {
                timestamp: new Date(),
                error: result.error,
                duration: duration,
                status: 'failed'
            };

            backupHistory.unshift(lastBackup);
            if (backupHistory.length > 10) {
                backupHistory = backupHistory.slice(0, 10);
            }

            console.error(`❌ Backup tự động thất bại: ${result.error}`);
        }

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        lastBackup = {
            timestamp: new Date(),
            error: error.message,
            duration: duration,
            status: 'failed'
        };

        backupHistory.unshift(lastBackup);
        if (backupHistory.length > 10) {
            backupHistory = backupHistory.slice(0, 10);
        }

        console.error(`❌ Lỗi cronjob backup: ${error.message}`);
    }
}

/**
 * Dừng cronjob
 */
export function stopBackupCron() {
    if (cronJob) {
        cronJob.stop();
        isRunning = false;
        console.log('🛑 Cronjob backup đã được dừng');
        return true;
    }
    return false;
}

/**
 * Khởi động lại cronjob
 */
export function startBackupCron() {
    if (cronJob) {
        cronJob.start();
        isRunning = true;
        console.log('▶️  Cronjob backup đã được khởi động lại');
        return true;
    }
    return false;
}

/**
 * Lấy trạng thái cronjob
 */
export function getCronStatus() {
    return {
        isRunning: isRunning,
        schedule: process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *',
        timezone: process.env.BACKUP_TIMEZONE || 'Asia/Ho_Chi_Minh',
        description: getCronDescription(process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *'),
        lastBackup: lastBackup,
        backupHistory: backupHistory,
        databaseConfigured: !!process.env.DATABASE_URL
    };
}

/**
 * Trigger backup thủ công (ngay lập tức)
 */
export async function triggerManualBackup() {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        return {
            success: false,
            error: 'DATABASE_URL không được cấu hình'
        };
    }

    console.log('🔧 Trigger backup thủ công...');
    await performBackup(dbUrl);

    return lastBackup;
}

/**
 * Mô tả cron schedule dễ hiểu
 */
function getCronDescription(schedule) {
    const descriptions = {
        '* * * * *': 'Mỗi phút',
        '0 * * * *': 'Mỗi giờ',
        '0 0 * * *': 'Mỗi ngày lúc 00:00',
        '0 2 * * *': 'Mỗi ngày lúc 02:00',
        '0 0 * * 0': 'Mỗi Chủ nhật lúc 00:00',
        '0 0 1 * *': 'Ngày đầu tiên mỗi tháng lúc 00:00',
        '*/15 * * * *': 'Mỗi 15 phút',
        '*/30 * * * *': 'Mỗi 30 phút',
        '0 */6 * * *': 'Mỗi 6 giờ',
        '0 */12 * * *': 'Mỗi 12 giờ'
    };

    return descriptions[schedule] || `Custom schedule: ${schedule}`;
}

/**
 * Cập nhật schedule mới
 */
export function updateCronSchedule(newSchedule, connectionString = null) {
    if (!cron.validate(newSchedule)) {
        return {
            success: false,
            error: 'Cron schedule không hợp lệ'
        };
    }

    // Dừng cronjob cũ
    if (cronJob) {
        cronJob.stop();
    }

    // Khởi tạo lại với schedule mới
    initBackupCron(newSchedule, connectionString);

    return {
        success: true,
        schedule: newSchedule,
        description: getCronDescription(newSchedule)
    };
}
