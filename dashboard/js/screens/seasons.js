import { dApi } from '../api.js';
import { elt, clearChildren } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';

export async function createSeason() {
  const name = document.getElementById('s-name').value.trim();
  const desc = document.getElementById('s-desc').value.trim();
  const start = document.getElementById('s-start').value;
  const end = document.getElementById('s-end').value;
  if (!name || !start || !end) { showToast('Заполните название и даты', '#ef4444'); return; }
  if (end < start) { showToast('Дата окончания не может быть раньше начала', '#ef4444'); return; }
  try {
    await dApi('/club/seasons', { method: 'POST', body: { name, description: desc, start_date: start, end_date: end } });
    document.getElementById('s-name').value = '';
    document.getElementById('s-desc').value = '';
    loadSeasons();
    showToast('Сезон создан', '#22c55e');
  } catch (e) {
    showToast(e.message, '#ef4444');
  }
}

export async function loadSeasons() {
  try {
    const seasons = await dApi('/club/seasons');
    const container = document.getElementById('seasons-list');
    clearChildren(container);
    if (!seasons.length) {
      container.appendChild(elt('div', { style: 'color:#64748b;text-align:center;padding:30px', text: 'Нет сезонов. Создайте первый!' }));
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    for (const s of seasons) {
      const isActive = s.active && s.start_date <= today && s.end_date >= today;
      const statusText = isActive ? 'АКТИВЕН' : (s.active ? 'ОЖИДАНИЕ' : 'ЗАВЕРШЁН');
      const statusBg = isActive ? 'rgba(34,197,94,.1)' : 'rgba(100,116,139,.1)';
      const statusFg = isActive ? '#22c55e' : '#64748b';
      const dates = s.start_date + ' → ' + s.end_date + (s.description ? ' • ' + s.description : '');
      const row = elt('div', { class: 'card', style: 'display:flex;align-items:center;gap:12px;' + (isActive ? 'border-color:#22c55e' : '') },
        elt('div', { style: 'flex:1' },
          elt('div', { style: 'font-size:14px;font-weight:600', text: s.name }),
          elt('div', { style: 'font-size:11px;color:#64748b;margin-top:2px', text: dates })
        ),
        elt('div', { class: 'mono', style: 'font-size:10px;padding:4px 8px;border-radius:6px;background:' + statusBg + ';color:' + statusFg, text: statusText })
      );
      container.appendChild(row);
    }
  } catch (e) {
    // 401 handled in dApi; other errors silent per existing behavior
  }
}
