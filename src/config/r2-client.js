import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Tạo kết nối S3 Client cho Cloudflare R2
 * R2 tương thích với S3 API nên sử dụng AWS SDK
 */
export function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  // Kiểm tra các biến môi trường
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Thiếu thông tin cấu hình R2. Vui lòng kiểm tra file .env');
  }

  // Endpoint của R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const r2Client = new S3Client({
    region: 'auto', // R2 sử dụng 'auto' cho region
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  return r2Client;
}

export const bucketName = process.env.R2_BUCKET_NAME;
