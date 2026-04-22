import { apiCall } from '../api.js';
import { getState } from '../state.js';
import { HERO_EMOJI } from '../constants.js';
import { elt, clearChildren } from '../ui/dom.js';

export async function loadLeaderboard() {
  const { cid } = getState();
  if (!cid) return;
  try {
    const lb = await apiCall('/leaderboard/' + cid);
    const container = document.getElementById('lb');
    clearChildren(container);
    if (!lb.length) {
      container.appendChild(
        elt('div', { style: 'color:var(--mut);text-align:center;padding:40px', text: 'Пока нет данных' })
      );
      return;
    }
    lb.forEach((m, i) => {
      const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : '#' + (i + 1);
      const row = elt(
        'div',
        {
          style:
            'display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;margin-bottom:6px;' +
            (m.is_you
              ? 'background:rgba(0,229,255,.05);border:1px solid rgba(0,229,255,.2)'
              : 'border:1px solid transparent'),
        },
        elt('div', {
          class: 'mono',
          style: 'font-size:14px;font-weight:900;width:28px;text-align:center',
          text: medal,
        }),
        elt('div', { style: 'font-size:22px', text: HERO_EMOJI[m.hero] || '⚔️' }),
        elt(
          'div',
          { style: 'flex:1' },
          elt('div', {
            style: 'font-size:13px;font-weight:600;' + (m.is_you ? 'color:var(--hero)' : ''),
            text: m.name + (m.is_you ? ' (ты)' : ''),
          }),
          elt('div', {
            style: 'font-size:11px;color:var(--mut)',
            text: 'Ур.' + m.level + ' • 🔥' + m.streak,
          })
        ),
        elt('div', {
          class: 'mono',
          style: 'font-size:14px;font-weight:700;color:var(--hero)',
          text: String(m.xp),
        })
      );
      container.appendChild(row);
    });
  } catch (e) {
    // 401 already handled by api.js; network errors swallowed by design (C3 scope limited to 401)
  }
}
