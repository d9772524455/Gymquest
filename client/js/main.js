import { getState } from './state.js';
import { initAuth } from './screens/auth.js';
import { go, sT, out, rH, doCI } from './screens/home.js';
import { rP } from './screens/profile.js';
import {
  startW,
  finW,
  canW,
  aS,
  rmS,
  rmEx,
  uS,
} from './screens/workout.js';
import { openLib, clLib, fLib, aEx, addC } from './screens/library.js';
import { lB } from './screens/board.js';
import { lHi } from './screens/history.js';

// --- Auth ---
initAuth(go);

// --- Tab bar ---
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => sT(t.dataset.t))
);

// --- Home screen action cards ---
document.querySelector('[data-action="start-workout"]').addEventListener('click', startW);
document.querySelector('[data-action="checkin"]').addEventListener('click', doCI);
document.querySelector('[data-action="board"]').addEventListener('click', () => sT('board'));

// --- Workout screen ---
document.querySelector('[data-action="add-exercise"]').addEventListener('click', openLib);
document.querySelector('[data-action="finish-workout"]').addEventListener('click', finW);
document.querySelector('[data-action="cancel-workout"]').addEventListener('click', canW);

// --- Profile logout ---
document.querySelector('[data-action="logout"]').addEventListener('click', out);

// --- Library modal ---
document.getElementById('lib-m').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) clLib();
});
document.querySelector('[data-action="close-lib"]').addEventListener('click', clLib);
document.getElementById('lib-s').addEventListener('input', fLib);
document.querySelector('[data-action="add-custom"]').addEventListener('click', addC);

// --- Delegation for dynamically-rendered handlers inside #w-exs ---
document.getElementById('w-exs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const exCard = btn.closest('[data-ei]');
  const setRow = btn.closest('[data-si]');
  const ei = exCard ? Number(exCard.dataset.ei) : null;
  const si = setRow ? Number(setRow.dataset.si) : null;
  if (btn.dataset.action === 'add-set' && ei !== null) aS(ei);
  else if (btn.dataset.action === 'remove-set' && ei !== null && si !== null) rmS(ei, si);
  else if (btn.dataset.action === 'remove-exercise' && ei !== null) rmEx(ei);
});

document.getElementById('w-exs').addEventListener('change', (e) => {
  if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'number') return;
  const exCard = e.target.closest('[data-ei]');
  const setRow = e.target.closest('[data-si]');
  if (!exCard || !setRow) return;
  const ei = Number(exCard.dataset.ei);
  const si = Number(setRow.dataset.si);
  const f = e.target.dataset.field;
  uS(ei, si, f, e.target.value);
});

// --- Library list item clicks (delegation) ---
document.getElementById('lib-l').addEventListener('click', (e) => {
  const row = e.target.closest('[data-exercise]');
  if (row) aEx(row.dataset.exercise);
});

// --- Auto-login if token present ---
const state = getState();
if (state.tk) go();
