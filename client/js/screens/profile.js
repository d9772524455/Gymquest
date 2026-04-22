import { getState } from '../state.js';
import { HERO_EMOJI } from '../constants.js';
import { elt, clearChildren } from '../ui/dom.js';

export function rP() {
  const { P, AA } = getState();
  if (!P) return;
  document.getElementById('p-av').textContent = HERO_EMOJI[P.hero];
  document.getElementById('p-name').textContent = P.name;
  document.getElementById('p-sub').textContent = 'Ур.' + P.level + ' • ' + P.xp + ' XP';
  document.getElementById('p-tw').textContent = P.total_w;
  document.getElementById('p-min').textContent = P.total_min;
  document.getElementById('p-ton').textContent = Math.round(P.total_ton) + 'кг';
  document.getElementById('p-ms').textContent = P.max_streak + 'дн';

  const ul = (P.achievements || []).map((a) => a.ach_id);
  const grid = document.getElementById('p-ach');
  clearChildren(grid);
  AA.forEach((a) => {
    const done = ul.includes(a.id);
    const style =
      'text-align:center;padding:10px 4px;opacity:' +
      (done ? 1 : 0.3) +
      ';' +
      (done ? 'border-color:var(--hero);background:rgba(0,229,255,.05)' : '');
    const card = elt(
      'div',
      { class: 'card', style },
      elt('div', { style: 'font-size:20px', text: done ? '🏅' : '🔒' }),
      elt('div', {
        class: 'mono',
        style: 'font-size:8px;font-weight:700;margin-top:2px',
        text: a.name,
      }),
      elt('div', { style: 'font-size:7px;color:var(--mut)', text: a.desc })
    );
    grid.appendChild(card);
  });
}
