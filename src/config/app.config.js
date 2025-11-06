/**
 * Application configuration
 */
export const config = {
    port: process.env.PORT || 3000,
    multipartThreshold: 100 * 1024 * 1024, // 100MB
    defaultPartSize: 100 * 1024 * 1024, // 100MB
    backupDir: 'backups',
    tempUploadDir: 'temp_uploads',
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
    cronSchedule: process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *',
    timezone: process.env.BACKUP_TIMEZONE || 'Asia/Ho_Chi_Minh',
};
