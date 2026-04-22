import { dApi } from '../api.js';
import { elt, clearChildren } from '../ui/dom.js';

export async function loadOverview() {
  const stats = await dApi('/club/stats');
  document.getElementById('d-club-name').textContent = stats.name || 'Клуб';
  document.getElementById('k-total').textContent = stats.total_members;
  document.getElementById('k-active').textContent = stats.active_week;
  document.getElementById('k-wm').textContent = stats.workouts_month;
  document.getElementById('k-axp').textContent = stats.avg_xp;
  const levels = document.getElementById('k-levels');
  clearChildren(levels);
  if (!(stats.level_dist || []).length) {
    levels.appendChild(elt('div', { style: 'color:#64748b', text: 'Нет данных' }));
    return;
  }
  for (const l of stats.level_dist) {
    const pct = Math.min(100, (l.count / Math.max(stats.total_members, 1)) * 100);
    const row = elt('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:6px' },
      elt('div', { class: 'mono', style: 'font-size:11px;color:#64748b;width:40px', text: 'Ур.' + l.level }),
      elt('div', { style: 'flex:1;height:8px;background:#1e2231;border-radius:4px;overflow:hidden' },
        elt('div', { style: 'height:100%;width:' + pct + '%;background:#2E86C1;border-radius:4px' })
      ),
      elt('div', { class: 'mono', style: 'font-size:11px;width:30px;text-align:right', text: String(l.count) })
    );
    levels.appendChild(row);
  }
}
