const express = require('express');
const fs = require('fs');
const path = require('path');

const { apkDownload } = require('../middleware/rateLimit');

const router = express.Router();

const APK_PATH = path.join(__dirname, '..', '..', '..', 'public', 'gymquest.apk');

router.use('/app', express.static(path.join(__dirname, '..', '..', '..', 'client')));
router.use('/dashboard', express.static(path.join(__dirname, '..', '..', '..', 'dashboard')));
router.use('/shared', express.static(path.join(__dirname, '..', '..', '..', 'shared')));

router.get('/download', apkDownload, (_req, res) => {
  if (!fs.existsSync(APK_PATH)) {
    return res.status(503).json({
      error: { code: 'APK_UNAVAILABLE', message: 'APK временно недоступен' },
    });
  }
  res.download(APK_PATH, 'gymquest.apk');
});

router.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gym Quest</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0e14;font-family:sans-serif;color:#e2e8f0}
.c{text-align:center;max-width:420px;padding:0 20px;width:100%;box-sizing:border-box}
.h{font-size:48px;font-weight:900;color:#00e5ff;margin-bottom:12px;letter-spacing:2px}
.s{color:#64748b;font-size:14px;margin-bottom:40px}
a{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 24px;margin:10px 0;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;transition:all .2s;box-sizing:border-box}
.a1{background:#00e5ff;color:#000}.a2{background:#1e2231;color:#2E86C1;border:1px solid #2E86C1}
.a3{background:transparent;color:#e2e8f0;border:1px solid #334155;font-size:13px}
a:hover{transform:scale(1.03)}
a svg{width:20px;height:20px;flex-shrink:0}</style></head>
<body><div class="c"><div class="h">GYM QUEST</div><div class="s">RPG Retention Engine for Fitness</div>
<a href="/app" class="a1" aria-label="Открыть в браузере"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm88,104a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.84a157.44,157.44,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154,88H102a115.11,115.11,0,0,1,26-45A115.27,115.27,0,0,1,154,88Zm52.33,0H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM107.59,42.4A135.28,135.28,0,0,0,85.29,88H49.63A88.29,88.29,0,0,1,107.59,42.4ZM49.63,168H85.29a135.28,135.28,0,0,0,22.3,45.6A88.29,88.29,0,0,1,49.63,168Zm98.78,45.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z"/></svg>Открыть в браузере</a>
<a href="/dashboard" class="a2" aria-label="Вход для руководителей клуба"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M96 128a128 128 0 1 0 256 0A128 128 0 1 0 96 128zm94.5 200.2l18.6 31L175.8 483.1l-36-146.9c-2-8.1-9.8-13.4-17.9-11.3C51.9 342.4 0 405.8 0 481.3c0 17 13.8 30.7 30.7 30.7l131.7 0c0 0 0 0 .1 0l5.5 0 112 0 5.5 0c0 0 0 0 .1 0l131.7 0c17 0 30.7-13.8 30.7-30.7c0-75.5-51.9-138.9-121.9-156.4c-8.1-2-15.9 3.3-17.9 11.3l-36 146.9L238.9 359.2l18.6-31c6.4-10.7-1.3-24.2-13.7-24.2L224 304l-19.7 0c-12.4 0-20.1 13.6-13.7 24.2z"/></svg>Вход для руководителей клуба</a>
<a href="/download" class="a3" aria-label="Скачать приложение для Android"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M176,148a12,12,0,1,1-12-12A12,12,0,0,1,176,148ZM92,136a12,12,0,1,0,12,12A12,12,0,0,0,92,136Zm148,24v24a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V161.13A113.38,113.38,0,0,1,51.4,78.72L26.34,53.66A8,8,0,0,1,37.66,42.34L63.82,68.5a111.43,111.43,0,0,1,128.55-.19l26-26a8,8,0,0,1,11.32,11.32L204.82,78.5c.75.71,1.5,1.43,2.24,2.17A111.25,111.25,0,0,1,240,160Zm-16,0a96,96,0,0,0-96-96h-.34C74.91,64.18,32,107.75,32,161.13V184H224Z"/></svg>Скачать приложение для Android</a>
</div></body></html>`);
});

module.exports = router;
