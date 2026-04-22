import { dApi } from '../api.js';
import { clearChildren } from '../ui/dom.js';

export async function renderQR() {
  const container = document.getElementById('qr-code');
  try {
    const r = await dApi('/club/qr-token');
    // eslint-disable-next-line no-undef -- qrcode is a global from vendor/qrcode.min.js
    const qr = qrcode(0, 'M');
    qr.addData(r.qr_token);
    qr.make();
    const dataUrl = qr.createDataURL(5, 0); // 5px per cell, 0 margin
    clearChildren(container);
    const img = document.createElement('img');
    img.src = dataUrl;
    img.width = 200;
    img.height = 200;
    img.style.borderRadius = '8px';
    img.alt = 'QR-код для чекина';
    container.appendChild(img);
    document.getElementById('qr-info').textContent = 'Действителен до конца дня (' + r.date + ')';
  } catch (e) {
    clearChildren(container);
    container.textContent = 'Ошибка: ' + e.message;
  }
}
