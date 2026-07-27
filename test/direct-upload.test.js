import assert from 'node:assert/strict';
import test from 'node:test';
import { requireUploadAuth } from '../src/middlewares/upload-auth.middleware.js';
import { createUploadSession } from '../src/services/direct-upload.service.js';

function responseRecorder() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
}

test('upload auth rejects requests when the server key is missing', () => {
    const previousKey = process.env.UPLOAD_API_KEY;
    delete process.env.UPLOAD_API_KEY;
    const response = responseRecorder();

    requireUploadAuth({ get: () => undefined }, response, () => assert.fail('next must not run'));

    assert.equal(response.statusCode, 503);
    if (previousKey === undefined) {
        delete process.env.UPLOAD_API_KEY;
    } else {
        process.env.UPLOAD_API_KEY = previousKey;
    }
});

test('upload auth accepts the configured key', () => {
    process.env.UPLOAD_API_KEY = 'test-secret';
    let nextCalled = false;

    requireUploadAuth(
        { get: header => header === 'x-upload-key' ? 'test-secret' : undefined },
        responseRecorder(),
        () => { nextCalled = true; }
    );

    assert.equal(nextCalled, true);
});

test('direct upload rejects an invalid EXE extension before contacting R2', async () => {
    await assert.rejects(
        createUploadSession({
            fileName: 'archive.rar',
            size: 100,
            contentType: 'application/octet-stream',
            category: 'exe'
        }),
        /chỉ chấp nhận file \.exe/
    );
});

test('direct upload rejects empty files before contacting R2', async () => {
    await assert.rejects(
        createUploadSession({
            fileName: 'TadSetup.exe',
            size: 0,
            contentType: 'application/octet-stream',
            category: 'exe'
        }),
        /Kích thước file/
    );
});
