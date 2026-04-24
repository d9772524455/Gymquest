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
<a href="/app" class="a1" aria-label="Вход для атлетов"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M228.65,129.11l-60.73-20.24a24,24,0,0,1-14.32-13L130.39,41.6s0-.07,0-.1A16,16,0,0,0,110.25,33L34.53,60.49A16.05,16.05,0,0,0,24,75.53V192a16,16,0,0,0,16,16H240a16,16,0,0,0,16-16V167.06A40,40,0,0,0,228.65,129.11ZM115.72,48l7.11,16.63-21.56,7.85A8,8,0,0,0,104,88a7.91,7.91,0,0,0,2.73-.49l22.4-8.14,4.74,11.07-16.6,6A8,8,0,0,0,120,112a7.91,7.91,0,0,0,2.73-.49l17.6-6.4a40.24,40.24,0,0,0,7.68,10l-14.74,5.36A8,8,0,0,0,136,136a8.14,8.14,0,0,0,2.73-.48l28-10.18,56.87,18.95A24,24,0,0,1,238.93,160H40V75.53ZM40,192h0V176H240v16Z"/></svg>Вход для атлетов</a>
<a href="/dashboard" class="a2" aria-label="Вход для руководителей клуба"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M96 128a128 128 0 1 0 256 0A128 128 0 1 0 96 128zm94.5 200.2l18.6 31L175.8 483.1l-36-146.9c-2-8.1-9.8-13.4-17.9-11.3C51.9 342.4 0 405.8 0 481.3c0 17 13.8 30.7 30.7 30.7l131.7 0c0 0 0 0 .1 0l5.5 0 112 0 5.5 0c0 0 0 0 .1 0l131.7 0c17 0 30.7-13.8 30.7-30.7c0-75.5-51.9-138.9-121.9-156.4c-8.1-2-15.9 3.3-17.9 11.3l-36 146.9L238.9 359.2l18.6-31c6.4-10.7-1.3-24.2-13.7-24.2L224 304l-19.7 0c-12.4 0-20.1 13.6-13.7 24.2z"/></svg>Вход для руководителей клуба</a>
<a href="/download" class="a3" aria-label="Скачать приложение"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"/></svg>Скачать приложение</a>
</div></body></html>`);
});

module.exports = router;
