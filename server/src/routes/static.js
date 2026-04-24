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
<a href="/app" class="a1" aria-label="Вход для iPhone"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M223.3,169.59a8.07,8.07,0,0,0-2.8-3.4C203.53,154.53,200,134.64,200,120c0-17.67,13.47-33.06,21.5-40.67a8,8,0,0,0,0-11.62C208.82,55.74,187.82,48,168,48a72.2,72.2,0,0,0-40,12.13,71.56,71.56,0,0,0-90.71,9.09A74.63,74.63,0,0,0,16,123.4a127.06,127.06,0,0,0,40.14,89.73A39.8,39.8,0,0,0,83.59,224h87.68a39.84,39.84,0,0,0,29.12-12.57,125,125,0,0,0,17.82-24.6C225.23,174,224.33,172,223.3,169.59Zm-34.63,30.94a23.76,23.76,0,0,1-17.4,7.47H83.59a23.82,23.82,0,0,1-16.44-6.51A111.14,111.14,0,0,1,32,123,58.5,58.5,0,0,1,48.65,80.47,54.81,54.81,0,0,1,88,64h.78A55.45,55.45,0,0,1,123,76.28a8,8,0,0,0,10,0A55.44,55.44,0,0,1,168,64a70.64,70.64,0,0,1,36,10.35c-13,14.52-20,30.47-20,45.65,0,23.77,7.64,42.73,22.18,55.3A105.82,105.82,0,0,1,188.67,200.53ZM128.23,30A40,40,0,0,1,167,0h1a8,8,0,0,1,0,16h-1a24,24,0,0,0-23.24,18,8,8,0,1,1-15.5-4Z"/></svg>Вход для iPhone</a>
<a href="/dashboard" class="a2" aria-label="Вход для руководителей клуба"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M96 128a128 128 0 1 0 256 0A128 128 0 1 0 96 128zm94.5 200.2l18.6 31L175.8 483.1l-36-146.9c-2-8.1-9.8-13.4-17.9-11.3C51.9 342.4 0 405.8 0 481.3c0 17 13.8 30.7 30.7 30.7l131.7 0c0 0 0 0 .1 0l5.5 0 112 0 5.5 0c0 0 0 0 .1 0l131.7 0c17 0 30.7-13.8 30.7-30.7c0-75.5-51.9-138.9-121.9-156.4c-8.1-2-15.9 3.3-17.9 11.3l-36 146.9L238.9 359.2l18.6-31c6.4-10.7-1.3-24.2-13.7-24.2L224 304l-19.7 0c-12.4 0-20.1 13.6-13.7 24.2z"/></svg>Вход для руководителей клуба</a>
<a href="/download" class="a3" aria-label="Скачать приложение для Android"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M176,148a12,12,0,1,1-12-12A12,12,0,0,1,176,148ZM92,136a12,12,0,1,0,12,12A12,12,0,0,0,92,136Zm148,24v24a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V161.13A113.38,113.38,0,0,1,51.4,78.72L26.34,53.66A8,8,0,0,1,37.66,42.34L63.82,68.5a111.43,111.43,0,0,1,128.55-.19l26-26a8,8,0,0,1,11.32,11.32L204.82,78.5c.75.71,1.5,1.43,2.24,2.17A111.25,111.25,0,0,1,240,160Zm-16,0a96,96,0,0,0-96-96h-.34C74.91,64.18,32,107.75,32,161.13V184H224Z"/></svg>Скачать приложение для Android</a>
</div></body></html>`);
});

module.exports = router;
