import { apiCall } from '../api.js';
import { elt, clearChildren } from '../ui/dom.js';

export async function loadHistory() {
  try {
    const h = await apiCall('/workouts/history?limit=15');
    const container = document.getElementById('w-hist');
    clearChildren(container);
    if (!h.length) {
      container.appendChild(
        elt('div', { style: 'color:var(--mut);text-align:center;padding:20px', text: 'Начни первую тренировку!' })
      );
      return;
    }
    h.forEach((w) => {
      const icon = w.type === 'strength' ? '🏋️' : '📍';
      const label = w.type === 'strength' ? 'Силовая' : 'Чекин';
      const row = elt(
        'div',
        { style: 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--brd)' },
        elt('div', { style: 'font-size:16px', text: icon }),
        elt(
          'div',
          { style: 'flex:1' },
          elt('div', { style: 'font-size:13px', text: label }),
          elt('div', {
            class: 'mono',
            style: 'font-size:10px;color:var(--mut)',
            text: w.date + ' • ' + w.mins + 'мин',
          })
        ),
        elt('div', {
          class: 'mono',
          style: 'font-size:13px;font-weight:700;color:var(--hero)',
          text: '+' + w.xp_earned,
        })
      );
      container.appendChild(row);
    });
  } catch (e) {
    // network errors silent — consistent with C3 scope
  }
}
