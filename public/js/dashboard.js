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

    // Upload form
    const uploadForm = document.getElementById('uploadForm');
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(uploadForm);
        const method = formData.get('method') || 'auto';
        let url = '/api/upload/auto';
        if (method === 'single') url = '/api/upload';
        if (method === 'large') url = '/api/upload/large';
        if (method === 'exe') url = '/api/upload/exe';
        if (method === 'rar') url = '/api/upload/rar';

        const file = formData.get('file');
        const fileSize = file.size;
        const fileName = file.name;

        // Show progress
        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('uploadProgressBar');
        const statusText = document.getElementById('uploadStatus');
        progressDiv.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        statusText.textContent = `Starting upload: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`;

        log('Starting upload', method, fileName);

        try {
            const xhr = new XMLHttpRequest();

            // Progress tracking
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = percentComplete + '%';
                    progressBar.textContent = percentComplete.toFixed(0) + '%';
                    statusText.textContent = `Uploading: ${(e.loaded / 1024 / 1024).toFixed(2)} MB / ${(e.total / 1024 / 1024).toFixed(2)} MB`;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const json = JSON.parse(xhr.responseText);
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    statusText.textContent = '✅ Upload complete!';
                    log('Upload success', json);
                    alert('Upload success: ' + (json.data?.key || 'ok'));
                    setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
                } else {
                    const json = JSON.parse(xhr.responseText);
                    statusText.textContent = '❌ Upload failed: ' + (json.error || 'Unknown error');
                    log('Upload failed', json);
                    alert('Upload failed: ' + (json.error || JSON.stringify(json)));
                }
            });

            xhr.addEventListener('error', () => {
                statusText.textContent = '❌ Network error';
                log('Upload error', 'Network error');
                alert('Upload error: Network error');
            });

            xhr.open('POST', url);
            xhr.send(formData);

        } catch (err) {
            statusText.textContent = '❌ Error: ' + err.message;
            log('Upload error', err.message);
            alert('Upload error: ' + err.message);
        }
    });

    // Download form
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
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        statusText.textContent = `Starting download: ${key}`;

        log('Starting download', key);

        try {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';

            // Progress tracking
            xhr.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = percentComplete + '%';
                    progressBar.textContent = percentComplete.toFixed(0) + '%';
                    statusText.textContent = `Downloading: ${(e.loaded / 1024 / 1024).toFixed(2)} MB / ${(e.total / 1024 / 1024).toFixed(2)} MB`;
                } else {
                    statusText.textContent = `Downloading: ${(e.loaded / 1024 / 1024).toFixed(2)} MB`;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const blob = xhr.response;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = key.split('/').pop();
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);

                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    statusText.textContent = '✅ Download complete!';
                    log('Download success', key);
                    setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
                } else {
                    statusText.textContent = '❌ Download failed';
                    log('Download failed', xhr.statusText);
                    alert('Download failed: ' + xhr.statusText);
                }
            });

            xhr.addEventListener('error', () => {
                statusText.textContent = '❌ Network error';
                log('Download error', 'Network error');
                alert('Download error: Network error');
            });

            xhr.open('GET', `/api/download/${encodeURIComponent(key)}`);
            xhr.send();

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
                dl.onclick = (evt) => {
                    evt.preventDefault();
                    // Trigger download
                    const downloadKey = f.key;
                    log('Download file from list', downloadKey);
                    const a = document.createElement('a');
                    a.href = '/api/download/' + encodeURIComponent(downloadKey);
                    a.download = downloadKey.split('/').pop();
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
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
