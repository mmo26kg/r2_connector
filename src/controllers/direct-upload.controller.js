import {
    abortUploadSession,
    completeUploadSession,
    createUploadSession,
    signUploadParts
} from '../services/direct-upload.service.js';

function sendError(res, error) {
    const isClientError = /không hợp lệ|chỉ chấp nhận|phải|không tồn tại|hết hạn|đã được/.test(error.message);
    res.status(isClientError ? 400 : 500).json({ error: error.message });
}

export async function initDirectUpload(req, res) {
    try {
        res.json(await createUploadSession(req.body));
    } catch (error) {
        sendError(res, error);
    }
}

export async function signDirectUploadParts(req, res) {
    try {
        res.json(await signUploadParts(req.params.sessionId, req.body.partNumbers));
    } catch (error) {
        sendError(res, error);
    }
}

export async function completeDirectUpload(req, res) {
    try {
        res.json(await completeUploadSession(req.params.sessionId, req.body.parts));
    } catch (error) {
        sendError(res, error);
    }
}

export async function abortDirectUpload(req, res) {
    try {
        res.json(await abortUploadSession(req.params.sessionId));
    } catch (error) {
        sendError(res, error);
    }
}
