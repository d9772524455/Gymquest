import { dApi } from '../api.js';
import { elt, clearChildren } from '../ui/dom.js';
import { dRiskColor, dRiskBg, dRiskLabel } from '../constants.js';

export async function dLoadAlerts() {
  try {
    const alerts = await dApi('/club/alerts');
    const container = document.getElementById('alerts-list');
    const empty = document.getElementById('alerts-empty');
    document.getElementById('alert-badge').textContent = alerts.filter((a) => a.risk === 'high').length || '';
    clearChildren(container);
    if (!alerts.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    for (const a of alerts) {
      const row = elt('div', { class: 'card alert-row ' + a.risk, style: 'border-left-color:' + dRiskColor(a.risk) },
        elt('div', { style: 'flex:1' },
          elt('div', { style: 'font-size:14px;font-weight:600', text: a.name }),
          elt('div', { style: 'font-size:11px;color:#64748b;margin-top:3px', text: (Number(a.days) || 0) + ' дней без визита • Ур. ' + (Number(a.level) || 0) })
        ),
        elt('div', { class: 'mono', style: 'font-size:10px;padding:2px 6px;border-radius:4px;background:' + dRiskBg(a.risk) + ';color:' + dRiskColor(a.risk), text: dRiskLabel(a.risk) })
      );
      container.appendChild(row);
    }
  } catch (e) {
    // 401 auto-handled by dApi; other errors silent per existing behavior
  }
}
