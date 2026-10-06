import crypto from 'crypto';
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    UploadPartCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createR2Client, bucketName } from '../config/r2-client.js';

const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function numberFromEnv(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

const singleThreshold = numberFromEnv('UPLOAD_SINGLE_THRESHOLD_MB', 100) * 1024 * 1024;
const partSize = Math.max(5, numberFromEnv('UPLOAD_PART_SIZE_MB', 100)) * 1024 * 1024;
const maxFileSize = numberFromEnv('UPLOAD_MAX_FILE_SIZE_MB', 5 * 1024) * 1024 * 1024;
const urlTtlSeconds = Math.min(3600, numberFromEnv('UPLOAD_URL_TTL_SECONDS', 900));

function sanitizeFileName(fileName) {
    const normalized = String(fileName || '').split(/[\\/]/).pop();
    const safeName = normalized
        .normalize('NFKC')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+/, '')
        .slice(0, 180);

    if (!safeName) {
        throw new Error('Tên file không hợp lệ');
    }

    return safeName;
}

function validateCategory(category, fileName) {
    const normalizedCategory = ['exe', 'rar', 'file'].includes(category) ? category : 'file';
    const lowerName = fileName.toLowerCase();

    if (normalizedCategory === 'exe' && !lowerName.endsWith('.exe')) {
        throw new Error('Luồng EXE chỉ chấp nhận file .exe');
    }
    if (normalizedCategory === 'rar' && !lowerName.endsWith('.rar')) {
        throw new Error('Luồng RAR chỉ chấp nhận file .rar');
    }

    return normalizedCategory;
}

function getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
        throw new Error('Upload session không tồn tại hoặc đã hết hạn');
    }
    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
        sessions.delete(sessionId);
        throw new Error('Upload session đã hết hạn');
    }
    return session;
}

function publicUrlForKey(key) {
    const baseUrl = process.env.R2_PUBLIC_BASE_URL || 'https://storage.taddesign.net';
    return `${baseUrl.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

async function updateStrapi(key, category) {
    if (!['exe', 'rar'].includes(category)) {
        return false;
    }

    const strapiUrl = process.env.STRAPI_URL;
    const strapiToken = process.env.STRAPI_API_TOKEN;
    if (!strapiUrl || !strapiToken) {
        return false;
    }

    const field = category === 'rar' ? 'rarDownloadLink' : 'exeDownloadLink';
    const response = await fetch(`${strapiUrl.replace(/\/$/, '')}/api/site-data`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${strapiToken}`
        },
        body: JSON.stringify({
            data: { [field]: publicUrlForKey(key) }
        })
    });

    if (!response.ok) {
        throw new Error(`Strapi API error: ${response.status} - ${await response.text()}`);
    }
    return true;
}

async function deleteOldCategoryFiles(r2Client, category, currentKey) {
    if (!['exe', 'rar'].includes(category)) {
        return 0;
    }

    const prefix = `${category}/`;
    let continuationToken;
    let deleted = 0;

    do {
        const result = await r2Client.send(new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken
        }));

        for (const object of result.Contents || []) {
            if (object.Key !== currentKey && object.Size > 0) {
                await r2Client.send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: object.Key
                }));
                deleted += 1;
            }
        }
        continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    return deleted;
}

export async function createUploadSession({ fileName, size, contentType, category }) {
    const normalizedSize = Number(size);
    if (!Number.isSafeInteger(normalizedSize) || normalizedSize <= 0 || normalizedSize > maxFileSize) {
        throw new Error(`Kích thước file phải từ 1 byte đến ${maxFileSize} bytes`);
    }

    const safeName = sanitizeFileName(fileName);
    const normalizedCategory = validateCategory(category, safeName);
    const sessionId = crypto.randomUUID();
    const key = normalizedCategory === 'rar'
        ? `rar/${sessionId}-${safeName}`
        : `${normalizedCategory === 'file' ? 'uploads' : normalizedCategory}/${sessionId}/${safeName}`;
    const normalizedContentType = contentType || 'application/octet-stream';
    const mode = normalizedSize > singleThreshold ? 'multipart' : 'single';
    const r2Client = createR2Client();

    const session = {
        id: sessionId,
        key,
        fileName: safeName,
        size: normalizedSize,
        contentType: normalizedContentType,
        category: normalizedCategory,
        mode,
        status: 'pending',
        createdAt: Date.now()
    };

    if (mode === 'single') {
        session.uploadUrl = await getSignedUrl(r2Client, new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: normalizedContentType
        }), { expiresIn: urlTtlSeconds });
    } else {
        const totalParts = Math.ceil(normalizedSize / partSize);
        if (totalParts > 10000) {
            throw new Error('File cần nhiều hơn giới hạn 10.000 multipart parts');
        }
        const result = await r2Client.send(new CreateMultipartUploadCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: normalizedContentType
        }));
        session.uploadId = result.UploadId;
        session.totalParts = totalParts;
        session.partSize = partSize;
    }

    sessions.set(sessionId, session);
    return {
        sessionId,
        key,
        mode,
        uploadUrl: session.uploadUrl,
        uploadId: session.uploadId,
        partSize: session.partSize,
        totalParts: session.totalParts,
        expiresIn: urlTtlSeconds
    };
}

export async function signUploadParts(sessionId, partNumbers) {
    const session = getSession(sessionId);
    if (session.mode !== 'multipart' || session.status !== 'pending') {
        throw new Error('Session không ở trạng thái multipart upload');
    }
    if (!Array.isArray(partNumbers) || partNumbers.length === 0 || partNumbers.length > 20) {
        throw new Error('Mỗi request phải chứa từ 1 đến 20 part');
    }

    const uniqueParts = [...new Set(partNumbers.map(Number))];
    if (uniqueParts.some(number => !Number.isInteger(number) || number < 1 || number > session.totalParts)) {
        throw new Error('Part number không hợp lệ');
    }

    const r2Client = createR2Client();
    const parts = await Promise.all(uniqueParts.map(async partNumber => ({
        partNumber,
        url: await getSignedUrl(r2Client, new UploadPartCommand({
            Bucket: bucketName,
            Key: session.key,
            UploadId: session.uploadId,
            PartNumber: partNumber
        }), { expiresIn: urlTtlSeconds })
    })));

    return { sessionId, parts, expiresIn: urlTtlSeconds };
}

export async function completeUploadSession(sessionId, uploadedParts = []) {
    const session = getSession(sessionId);
    if (session.status !== 'pending') {
        throw new Error('Upload session đã được xử lý');
    }

    const r2Client = createR2Client();
    if (session.mode === 'multipart') {
        const parts = uploadedParts
            .map(part => ({ PartNumber: Number(part.partNumber), ETag: part.etag }))
            .sort((left, right) => left.PartNumber - right.PartNumber);

        if (
            parts.length !== session.totalParts
            || parts.some((part, index) => part.PartNumber !== index + 1 || !part.ETag)
        ) {
            throw new Error('Danh sách multipart ETag không đầy đủ hoặc không hợp lệ');
        }

        await r2Client.send(new CompleteMultipartUploadCommand({
            Bucket: bucketName,
            Key: session.key,
            UploadId: session.uploadId,
            MultipartUpload: { Parts: parts }
        }));
    }

    const head = await r2Client.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: session.key
    }));
    if (head.ContentLength !== session.size) {
        throw new Error(`Kích thước object không khớp: expected ${session.size}, received ${head.ContentLength}`);
    }

    session.status = 'uploaded';
    const strapiUpdated = await updateStrapi(session.key, session.category);
    let oldFilesDeleted = 0;
    let cleanupError = null;
    if (strapiUpdated) {
        try {
            oldFilesDeleted = await deleteOldCategoryFiles(r2Client, session.category, session.key);
        } catch (error) {
            cleanupError = error.message;
            console.error('Không thể xóa version cũ:', error.message);
        }
    }
    session.status = 'completed';

    return {
        success: true,
        sessionId,
        key: session.key,
        size: head.ContentLength,
        etag: head.ETag,
        url: publicUrlForKey(session.key),
        strapiUpdated,
        oldFilesDeleted,
        cleanupError
    };
}

export async function abortUploadSession(sessionId) {
    const session = getSession(sessionId);
    const r2Client = createR2Client();
    if (session.mode === 'multipart' && session.uploadId && session.status === 'pending') {
        await r2Client.send(new AbortMultipartUploadCommand({
            Bucket: bucketName,
            Key: session.key,
            UploadId: session.uploadId
        }));
    } else if (session.status !== 'completed') {
        await r2Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: session.key
        }));
    }
    sessions.delete(sessionId);
    return { success: true, sessionId };
}
