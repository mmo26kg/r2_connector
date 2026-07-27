(function () {
    const logArea = document.getElementById('actionLogs');
    if (!logArea) return; // if loaded on other pages

    function log(...args) {
        const el = document.createElement('div');
        el.className = 'log-line';
        el.textContent = `[${new Date().toLocaleTimeString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')} `;
        logArea.prepend(el);
    }

    // Tabs
    document.querySelectorAll('.tab-buttons button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-buttons button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            document.getElementById(tab).classList.add('active');
        });
    });

    // Auto-update key based on upload method
    const uploadMethodSelect = document.getElementById('uploadMethod');
    const uploadKeyInput = document.getElementById('uploadKey');

    if (uploadMethodSelect && uploadKeyInput) {
        uploadMethodSelect.addEventListener('change', (e) => {
            const method = e.target.value;
            if (method === 'exe') {
                uploadKeyInput.value = 'exe/TadSetup.exe';
            } else if (method === 'rar') {
                uploadKeyInput.value = 'rar/TadSetup.rar';
            }
            // Không thay đổi key cho auto, single, large
        });
    }

    function uploadApiHeaders() {
        const uploadKey = document.getElementById('uploadApiKey').value
            || document.getElementById('downloadApiKey').value;
        if (!uploadKey) throw new Error('Upload API key is required');
        sessionStorage.setItem('uploadApiKey', uploadKey);
        return {
            'Content-Type': 'application/json',
            'X-Upload-Key': uploadKey
        };
    }

    async function apiRequest(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: { ...uploadApiHeaders(), ...(options.headers || {}) }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
        return payload;
    }

    function putToR2(url, body, contentType, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url);
            xhr.setRequestHeader('Content-Type', contentType);
            xhr.upload.addEventListener('progress', event => {
                if (event.lengthComputable) onProgress(event.loaded, event.total);
            });
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.getResponseHeader('ETag'));
                } else {
                    reject(new Error(`R2 upload failed (${xhr.status})`));
                }
            });
            xhr.addEventListener('error', () => reject(new Error('Network error while uploading to R2')));
            xhr.send(body);
        });
    }

    async function uploadMultipart(file, session, contentType, updateProgress) {
        const uploadedBytes = new Map();
        const completedParts = [];
        const partNumbers = Array.from({ length: session.totalParts }, (_, index) => index + 1);
        const concurrency = 4;

        async function worker() {
            while (partNumbers.length > 0) {
                const partNumber = partNumbers.shift();
                const signed = await apiRequest(`/api/uploads/${session.sessionId}/parts/sign`, {
                    method: 'POST',
                    body: JSON.stringify({ partNumbers: [partNumber] })
                });
                const start = (partNumber - 1) * session.partSize;
                const end = Math.min(start + session.partSize, file.size);
                const blob = file.slice(start, end);
                const etag = await putToR2(signed.parts[0].url, blob, contentType, loaded => {
                    uploadedBytes.set(partNumber, loaded);
                    const totalLoaded = [...uploadedBytes.values()].reduce((sum, value) => sum + value, 0);
                    updateProgress(totalLoaded, file.size);
                });
                completedParts.push({ partNumber, etag });
            }
        }

        await Promise.all(Array.from(
            { length: Math.min(concurrency, session.totalParts) },
            () => worker()
        ));
        return completedParts.sort((left, right) => left.partNumber - right.partNumber);
    }

    // Direct-to-R2 upload form
    const uploadForm = document.getElementById('uploadForm');
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(uploadForm);
        const method = formData.get('method') || 'auto';
        const file = formData.get('file');
        if (!(file instanceof File) || file.size === 0) return alert('Please select a non-empty file');
        const fileSize = file.size;
        const fileName = file.name;
        const contentType = file.type || 'application/octet-stream';
        const category = method === 'exe' || method === 'rar' ? method : 'file';

        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('uploadProgressBar');
        const statusText = document.getElementById('uploadStatus');
        progressDiv.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        statusText.textContent = `Starting upload: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`;

        log('Starting upload', method, fileName);

        const updateProgress = (loaded, total) => {
            const percentComplete = Math.min(100, (loaded / total) * 100);
            progressBar.style.width = `${percentComplete}%`;
            progressBar.textContent = `${percentComplete.toFixed(0)}%`;
            statusText.textContent = `Uploading directly to R2: ${(loaded / 1024 / 1024).toFixed(2)} MB / ${(total / 1024 / 1024).toFixed(2)} MB`;
        };

        let session;
        try {
            session = await apiRequest('/api/uploads/init', {
                method: 'POST',
                body: JSON.stringify({ fileName, size: fileSize, contentType, category })
            });

            let parts = [];
            if (session.mode === 'single') {
                await putToR2(session.uploadUrl, file, contentType, updateProgress);
            } else {
                parts = await uploadMultipart(file, session, contentType, updateProgress);
            }

            statusText.textContent = 'Verifying and publishing upload...';
            const result = await apiRequest(`/api/uploads/${session.sessionId}/complete`, {
                method: 'POST',
                body: JSON.stringify({ parts })
            });
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
            statusText.textContent = '✅ Upload complete!';
            log('Upload success', result);
            alert(`Upload success: ${result.key}`);
            setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
        } catch (err) {
            if (session?.sessionId) {
                apiRequest(`/api/uploads/${session.sessionId}`, { method: 'DELETE' }).catch(() => {});
            }
            statusText.textContent = '❌ Error: ' + err.message;
            log('Upload error', err.message);
            alert('Upload error: ' + err.message);
        }
    });

    const savedUploadApiKey = sessionStorage.getItem('uploadApiKey');
    if (savedUploadApiKey) {
        document.getElementById('uploadApiKey').value = savedUploadApiKey;
        document.getElementById('downloadApiKey').value = savedUploadApiKey;
    }

    async function getDirectDownloadUrl(key) {
        const result = await apiRequest(`/api/download-url/${encodeURIComponent(key)}?expires=900`);
        return result.url;
    }

    // Direct-from-R2 download form
    const downloadForm = document.getElementById('downloadForm');
    downloadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = downloadForm.querySelector('input[name="key"]').value;
        if (!key) return alert('Key required');

        // Show progress
        const progressDiv = document.getElementById('downloadProgress');
        const progressBar = document.getElementById('downloadProgressBar');
        const statusText = document.getElementById('downloadStatus');
        progressDiv.style.display = 'block';
        progressBar.style.width = '100%';
        progressBar.textContent = 'R2';
        statusText.textContent = `Creating direct R2 download: ${key}`;

        log('Starting download', key);

        try {
            const directUrl = await getDirectDownloadUrl(key);
            const link = document.createElement('a');
            link.href = directUrl;
            link.download = key.split('/').pop();
            document.body.appendChild(link);
            link.click();
            link.remove();
            statusText.textContent = '✅ Download started directly from R2';
            log('Direct R2 download started', key);
            setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
        } catch (err) {
            statusText.textContent = '❌ Error: ' + err.message;
            log('Download error', err.message);
            alert('Download error: ' + err.message);
        }
    });

    // Backup
    document.getElementById('backupBtn').addEventListener('click', async () => {
        const useCustom = document.querySelector('#backupForm input[name="useCustom"]').checked;
        const conn = document.querySelector('#backupForm input[name="connectionString"]').value;
        const body = {};
        if (conn) body.connectionString = conn;
        const url = useCustom ? '/api/backup/postgres/custom' : '/api/backup/postgres';
        log('Trigger backup', { useCustom, connectionString: !!conn });
        try {
            const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const json = await resp.json();
            if (resp.ok) {
                log('Backup success', json);
                document.getElementById('backupResult').textContent = JSON.stringify(json, null, 2);
            } else {
                log('Backup failed', json);
                document.getElementById('backupResult').textContent = JSON.stringify(json, null, 2);
            }
        } catch (err) {
            log('Backup error', err.message);
            document.getElementById('backupResult').textContent = err.message;
        }
    });

    // Cron buttons
    document.getElementById('cronStatusBtn').addEventListener('click', async () => {
        log('Fetch cron status');
        const resp = await fetch('/api/cron/status');
        const json = await resp.json();
        document.getElementById('cronStatus').textContent = JSON.stringify(json, null, 2);
        log('Cron status', json);
    });
    document.getElementById('cronStartBtn').addEventListener('click', async () => {
        log('Start cron');
        const resp = await fetch('/api/cron/start', { method: 'POST' });
        const json = await resp.json();
        log('Cron start', json);
        alert(JSON.stringify(json));
    });
    document.getElementById('cronStopBtn').addEventListener('click', async () => {
        log('Stop cron');
        const resp = await fetch('/api/cron/stop', { method: 'POST' });
        const json = await resp.json();
        log('Cron stop', json);
        alert(JSON.stringify(json));
    });
    document.getElementById('cronTriggerBtn').addEventListener('click', async () => {
        log('Trigger cron now');
        const resp = await fetch('/api/cron/trigger', { method: 'POST' });
        const json = await resp.json();
        log('Cron trigger', json);
        alert(JSON.stringify(json));
    });

    document.getElementById('cronScheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const schedule = e.target.schedule.value;
        log('Update schedule', schedule);
        const resp = await fetch('/api/cron/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schedule }) });
        const json = await resp.json();
        log('Schedule update', json);
        alert(JSON.stringify(json));
    });

    // List files
    document.getElementById('listForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const prefix = e.target.prefix.value;
        log('List files', prefix);
        const resp = await fetch('/api/files' + (prefix ? ('?prefix=' + encodeURIComponent(prefix)) : ''));
        const json = await resp.json();
        const ul = document.getElementById('fileList');
        ul.innerHTML = '';
        if (json.success && json.files) {
            json.files.forEach(f => {
                const li = document.createElement('li');
                const fileName = f.key || 'Unknown';
                const fileSize = f.size ? `(${(f.size / 1024).toFixed(2)} KB)` : '';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = `${fileName} ${fileSize}`;
                nameSpan.style.flex = '1';

                const btnContainer = document.createElement('div');
                btnContainer.style.display = 'flex';
                btnContainer.style.gap = '8px';

                const dl = document.createElement('button');
                dl.textContent = 'Download';
                dl.onclick = async (evt) => {
                    evt.preventDefault();
                    const downloadKey = f.key;
                    log('Download file from list', downloadKey);
                    try {
                        const directUrl = await getDirectDownloadUrl(downloadKey);
                        const a = document.createElement('a');
                        a.href = directUrl;
                        a.download = downloadKey.split('/').pop();
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } catch (error) {
                        log('Download failed', error.message);
                        alert(`Download failed: ${error.message}`);
                    }
                };

                const del = document.createElement('button');
                del.textContent = 'Delete';
                del.style.background = 'linear-gradient(135deg, #f56565 0%, #c53030 100%)';
                del.onclick = async (evt) => {
                    evt.preventDefault();
                    if (!confirm('Delete ' + f.key + '?')) return;
                    log('Delete file', f.key);
                    const r = await fetch('/api/delete/' + encodeURIComponent(f.key), { method: 'DELETE' });
                    const j = await r.json();
                    log('Delete result', j);
                    alert(JSON.stringify(j));
                    // Refresh list
                    e.target.dispatchEvent(new Event('submit'));
                };

                btnContainer.appendChild(dl);
                btnContainer.appendChild(del);
                li.appendChild(nameSpan);
                li.appendChild(btnContainer);
                ul.appendChild(li);
            });
            log('List files success', `${json.files.length} files found`);
        } else {
            log('List failed', json);
            ul.textContent = JSON.stringify(json);
        }
    });

    // Clear logs
    document.getElementById('clearLogs').addEventListener('click', () => { document.getElementById('actionLogs').innerHTML = ''; });

})();
