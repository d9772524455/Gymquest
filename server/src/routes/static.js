const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const APK_PATH = path.join(__dirname, '..', '..', '..', 'public', 'gymquest.apk');

router.use('/app', express.static(path.join(__dirname, '..', '..', '..', 'client')));
router.use('/dashboard', express.static(path.join(__dirname, '..', '..', '..', 'dashboard')));
router.use('/shared', express.static(path.join(__dirname, '..', '..', '..', 'shared')));

router.get('/download', (_req, res) => {
  if (!fs.existsSync(APK_PATH)) {
    return res.status(503).json({
      error: { code: 'APK_UNAVAILABLE', message: 'APK временно недоступен' },
    });
  }
  res.download(APK_PATH, 'gymquest.apk');
});

router.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gym Quest</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0e14;font-family:sans-serif;color:#e2e8f0}
.c{text-align:center}.h{font-size:48px;font-weight:900;color:#00e5ff;margin-bottom:12px;letter-spacing:2px}
.s{color:#64748b;font-size:14px;margin-bottom:40px}
a{display:block;padding:16px 40px;margin:10px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;transition:all .2s}
.a1{background:#00e5ff;color:#000}.a2{background:#1e2231;color:#2E86C1;border:1px solid #2E86C1}
.a3{background:transparent;color:#e2e8f0;border:1px solid #334155;font-size:13px}
a:hover{transform:scale(1.03)}</style></head>
<body><div class="c"><div class="h">GYM QUEST</div><div class="s">RPG Retention Engine for Fitness</div>
<a href="/app" class="a1">📱 Приложение атлета</a>
<a href="/dashboard" class="a2">📊 Дашборд клуба</a>
<a href="/download" class="a3">⬇️ Скачать Android приложение</a>
</div></body></html>`);
});

module.exports = router;
