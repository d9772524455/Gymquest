import { getState } from '../state.js';
import { EXERCISE_LIBRARY } from '../constants.js';
import { elt, clearChildren } from '../ui/dom.js';
import { rW, ensureWorkoutStarted } from './workout.js';

export function openLib() {
  document.getElementById('lib-m').style.display = 'flex';
  document.getElementById('lib-s').value = '';
  fLib();
}

export function clLib() {
  document.getElementById('lib-m').style.display = 'none';
}

export function fLib() {
  const s = getState();
  const f = document.getElementById('lib-s').value.toLowerCase();
  const list = document.getElementById('lib-l');
  clearChildren(list);

  let any = false;
  EXERCISE_LIBRARY.forEach((cat) => {
    const items = cat.i.filter((x) => !f || x.toLowerCase().includes(f));
    if (!items.length) return;
    any = true;
    list.appendChild(
      elt('div', {
        class: 'mono',
        style: 'font-size:10px;color:var(--mut);letter-spacing:1px;margin:10px 0 4px',
        text: cat.c.toUpperCase(),
      })
    );
    items.forEach((name) => {
      const has = s.W.some((e) => e.n === name);
      // Only add data-exercise when the row is clickable (not already added).
      // Delegation in main.js uses closest('[data-exercise]') and will no-op
      // on the "has" rows — prevents double-add.
      const rowOpts = {
        style:
          'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:' +
          (has ? 'default' : 'pointer') +
          ';opacity:' +
          (has ? 0.35 : 1),
      };
      if (!has) {
        rowOpts.attrs = { 'data-exercise': name };
      }
      const row = elt(
        'div',
        rowOpts,
        elt('div', { style: 'flex:1;font-size:13px', text: name }),
        elt('div', {
          style: 'font-size:12px;color:' + (has ? 'var(--grn)' : 'var(--cyan)'),
          text: has ? '✓' : '+',
        })
      );
      list.appendChild(row);
    });
  });

  if (!any) {
    list.appendChild(
      elt('div', {
        style: 'color:var(--mut);text-align:center;padding:20px',
        text: 'Не найдено',
      })
    );
  }
}

export function aEx(n) {
  const s = getState();
  // Prevent duplicates via the function itself — defence-in-depth even if
  // the delegation target ever leaks through.
  if (s.W.some((e) => e.n === n)) {
    clLib();
    return;
  }
  s.W.push({ n, s: [{ r: 10, w: 0 }] });
  clLib();
  rW();
  ensureWorkoutStarted();
}

export function addC() {
  const input = document.getElementById('lib-c');
  const n = input.value.trim();
  if (!n) return;
  aEx(n);
  input.value = '';
}
