# R2 Direct Upload

File data is uploaded directly from the browser to Cloudflare R2. Railway only
authenticates the caller, signs short-lived operations, verifies the completed
object, updates Strapi, and removes the previous EXE/RAR version.

## Required environment variables

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=https://storage.example.com
UPLOAD_API_KEY=replace_with_a_long_random_secret
```

Optional tuning:

```env
UPLOAD_SINGLE_THRESHOLD_MB=100
UPLOAD_PART_SIZE_MB=100
UPLOAD_MAX_FILE_SIZE_MB=5120
UPLOAD_URL_TTL_SECONDS=900
```

`UPLOAD_PART_SIZE_MB` is always clamped to at least 5 MiB. Presigned URLs are
clamped to a maximum lifetime of one hour.

## R2 bucket CORS

Replace the origins with the dashboard domains that are allowed to upload:

```json
[
  {
    "AllowedOrigins": [
      "https://file.example.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The browser must be able to read `ETag` to complete multipart uploads.

## API

Every endpoint requires `X-Upload-Key: <UPLOAD_API_KEY>`.

### Initialize

`POST /api/uploads/init`

```json
{
  "fileName": "TadSetup.exe",
  "size": 104857600,
  "contentType": "application/octet-stream",
  "category": "exe"
}
```

The result has `mode: "single"` and an `uploadUrl`, or `mode: "multipart"` with
an `uploadId`, `partSize`, and `totalParts`.

### Sign multipart parts

`POST /api/uploads/:sessionId/parts/sign`

```json
{ "partNumbers": [1, 2, 3] }
```

At most 20 part URLs can be signed per request.

### Complete

`POST /api/uploads/:sessionId/complete`

Single upload:

```json
{ "parts": [] }
```

Multipart upload:

```json
{
  "parts": [
    { "partNumber": 1, "etag": "\"etag-from-r2\"" }
  ]
}
```

### Abort

`DELETE /api/uploads/:sessionId`

## Deployment notes

Upload sessions are currently kept in process memory. Run one Railway replica
and avoid redeploying while uploads are in progress. A shared database or
durable state should be added before scaling to multiple replicas.

Legacy proxy upload endpoints remain available for compatibility, but now
require the same `X-Upload-Key` header.

## Direct download

`GET /api/download-url/:key?expires=900` returns a short-lived presigned GET
URL. The dashboard navigates to that URL, so object bytes travel directly from
R2 to the browser. The expiry is clamped between 60 seconds and one hour and the
endpoint requires `X-Upload-Key`.

The legacy `GET /api/download/:key` proxy remains available for compatibility,
requires `X-Upload-Key`, and should not be used by the dashboard.
