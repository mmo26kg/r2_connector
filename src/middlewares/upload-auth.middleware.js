import crypto from 'crypto';

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length
        && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireUploadAuth(req, res, next) {
    const configuredKey = process.env.UPLOAD_API_KEY;

    if (!configuredKey) {
        return res.status(503).json({
            error: 'Upload API chưa được cấu hình. Vui lòng thiết lập UPLOAD_API_KEY.'
        });
    }

    const providedKey = req.get('x-upload-key') || '';
    if (!providedKey || !safeEqual(providedKey, configuredKey)) {
        return res.status(401).json({ error: 'Upload API key không hợp lệ' });
    }

    next();
}
