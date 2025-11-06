import { Client } from 'pg';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { uploadFile } from './upload.service.js';

/**
 * Backup PostgreSQL database và upload lên R2
 * @param {string} connectionString - PostgreSQL connection URL
 * @param {string} outputFileName - Tên file backup (optional)
 * @returns {Promise<Object>} Kết quả backup
 */
export async function backupPostgres(connectionString = process.env.DATABASE_URL, outputFileName = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = outputFileName || `postgres-backup-${timestamp}.sql`;
    const backupDir = 'backups';
    const localFilePath = path.join(backupDir, fileName);

    try {
        // Tạo thư mục backup nếu chưa có
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`🔄 Bắt đầu backup PostgreSQL...`);

        // Parse connection string
        const dbUrl = new URL(connectionString);
        const dbConfig = {
            host: dbUrl.hostname,
            port: dbUrl.port || 5432,
            database: dbUrl.pathname.slice(1), // Remove leading slash
            user: dbUrl.username,
            password: dbUrl.password,
        };

        // Kiểm tra kết nối database
        console.log(`🔌 Kiểm tra kết nối database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
        const client = new Client(connectionString);
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        console.log(`✅ Kết nối database thành công`);

        // Thực hiện backup bằng pg_dump
        console.log(`💾 Đang dump database...`);
        await pgDump(connectionString, localFilePath);

        // Kiểm tra file backup
        const stats = fs.statSync(localFilePath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✅ Backup hoàn tất: ${fileName} (${fileSizeMB} MB)`);

        // Upload lên R2
        console.log(`☁️  Uploading backup lên R2...`);
        const r2Key = `backups/postgres/${fileName}`;
        const uploadResult = await uploadFile(localFilePath, r2Key);

        if (!uploadResult.success) {
            throw new Error(`Upload lên R2 thất bại: ${uploadResult.error}`);
        }

        console.log(`✅ Upload lên R2 thành công: ${r2Key}`);

        // Xóa file local sau khi upload (optional)
        // fs.unlinkSync(localFilePath);

        return {
            success: true,
            message: 'Backup PostgreSQL thành công',
            data: {
                fileName: fileName,
                r2Key: r2Key,
                localPath: localFilePath,
                size: stats.size,
                sizeMB: fileSizeMB,
                database: dbConfig.database,
                timestamp: timestamp,
                etag: uploadResult.etag
            }
        };

    } catch (error) {
        console.error('❌ Lỗi backup:', error.message);

        // Xóa file local nếu có lỗi
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Thực hiện pg_dump
 * @param {string} connectionString - PostgreSQL connection URL
 * @param {string} outputPath - Đường dẫn file output
 * @returns {Promise<void>}
 */
function pgDump(connectionString, outputPath) {
    return new Promise((resolve, reject) => {
        const outputStream = fs.createWriteStream(outputPath);

        // Sử dụng pg_dump với connection string
        // Thêm --no-sync để tăng tốc và bỏ qua một số version checks
        const pgDump = spawn('pg_dump', [
            connectionString,
            '--no-sync',
            '--no-owner',
            '--no-privileges'
        ]);

        let errorOutput = '';

        pgDump.stdout.pipe(outputStream);

        pgDump.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pgDump.on('error', (error) => {
            reject(new Error(`pg_dump command failed: ${error.message}. Đảm bảo PostgreSQL client tools đã được cài đặt.`));
        });

        pgDump.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`pg_dump exited with code ${code}: ${errorOutput}`));
            }
        });

        outputStream.on('error', (error) => {
            reject(new Error(`File write error: ${error.message}`));
        });
    });
}

/**
 * Backup với custom SQL query (cho backup partial data)
 * @param {string} connectionString - PostgreSQL connection URL
 * @param {string} outputFileName - Tên file backup
 * @returns {Promise<Object>} Kết quả backup
 */
export async function backupPostgresCustom(connectionString, outputFileName = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = outputFileName || `postgres-custom-backup-${timestamp}.sql`;
    const backupDir = 'backups';
    const localFilePath = path.join(backupDir, fileName);

    try {
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`🔄 Bắt đầu custom backup PostgreSQL...`);

        const client = new Client(connectionString);
        await client.connect();

        // Lấy danh sách tables
        const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);

        let backupContent = `-- PostgreSQL Custom Backup\n`;
        backupContent += `-- Generated at: ${new Date().toISOString()}\n\n`;

        // Backup từng table
        for (const row of tablesResult.rows) {
            const tableName = row.tablename;
            console.log(`  📋 Backing up table: ${tableName}`);

            // Get table schema
            const schemaResult = await client.query(`
                SELECT 
                    'CREATE TABLE ' || quote_ident(table_name) || ' (' ||
                    string_agg(
                        quote_ident(column_name) || ' ' || data_type ||
                        CASE 
                            WHEN character_maximum_length IS NOT NULL 
                            THEN '(' || character_maximum_length || ')'
                            ELSE ''
                        END,
                        ', '
                    ) || ');' as create_statement
                FROM information_schema.columns
                WHERE table_name = $1
                GROUP BY table_name
            `, [tableName]);

            if (schemaResult.rows.length > 0) {
                backupContent += `\n-- Table: ${tableName}\n`;
                backupContent += `DROP TABLE IF EXISTS ${tableName};\n`;
                backupContent += schemaResult.rows[0].create_statement + '\n\n';
            }

            // Get data
            const dataResult = await client.query(`SELECT * FROM ${tableName}`);
            if (dataResult.rows.length > 0) {
                backupContent += `-- Data for table: ${tableName}\n`;
                for (const dataRow of dataResult.rows) {
                    const values = Object.values(dataRow).map(v =>
                        v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
                    ).join(', ');
                    backupContent += `INSERT INTO ${tableName} VALUES (${values});\n`;
                }
                backupContent += '\n';
            }
        }

        await client.end();

        // Ghi ra file
        fs.writeFileSync(localFilePath, backupContent);

        const stats = fs.statSync(localFilePath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✅ Custom backup hoàn tất: ${fileName} (${fileSizeMB} MB)`);

        // Upload lên R2
        console.log(`☁️  Uploading backup lên R2...`);
        const r2Key = `backups/postgres/${fileName}`;
        const uploadResult = await uploadFile(localFilePath, r2Key);

        if (!uploadResult.success) {
            throw new Error(`Upload lên R2 thất bại: ${uploadResult.error}`);
        }

        return {
            success: true,
            message: 'Custom backup PostgreSQL thành công',
            data: {
                fileName: fileName,
                r2Key: r2Key,
                localPath: localFilePath,
                size: stats.size,
                sizeMB: fileSizeMB,
                tables: tablesResult.rows.length,
                timestamp: timestamp,
                etag: uploadResult.etag
            }
        };

    } catch (error) {
        console.error('❌ Lỗi custom backup:', error.message);

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return {
            success: false,
            error: error.message
        };
    }
}
