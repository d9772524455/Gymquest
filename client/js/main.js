import { getState } from './state.js';
import { initAuth } from './screens/auth.js';
import { enterApp, switchTab, logout, quickCheckin } from './screens/home.js';
import {
  startWorkout,
  finishWorkout,
  cancelWorkout,
  addSet,
  removeSet,
  removeExercise,
  updateSetField,
} from './screens/workout.js';
import { openLibrary, closeLibrary, filterLibrary, addExercise, addCustomExercise } from './screens/library.js';

// --- Auth ---
initAuth(enterApp);

// --- Tab bar ---
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => switchTab(t.dataset.t))
);

// --- Home screen action cards ---
document.querySelector('[data-action="start-workout"]').addEventListener('click', startWorkout);
document.querySelector('[data-action="checkin"]').addEventListener('click', quickCheckin);
document.querySelector('[data-action="board"]').addEventListener('click', () => switchTab('board'));

// --- Workout screen ---
document.querySelector('[data-action="add-exercise"]').addEventListener('click', openLibrary);
document.querySelector('[data-action="finish-workout"]').addEventListener('click', finishWorkout);
document.querySelector('[data-action="cancel-workout"]').addEventListener('click', cancelWorkout);

// --- Profile logout ---
document.querySelector('[data-action="logout"]').addEventListener('click', logout);

// --- Library modal ---
document.getElementById('lib-m').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeLibrary();
});
document.querySelector('[data-action="close-lib"]').addEventListener('click', closeLibrary);
document.getElementById('lib-s').addEventListener('input', filterLibrary);
document.querySelector('[data-action="add-custom"]').addEventListener('click', addCustomExercise);

// --- Delegation for dynamically-rendered handlers inside #w-exs ---
document.getElementById('w-exs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const exCard = btn.closest('[data-ei]');
  const setRow = btn.closest('[data-si]');
  const ei = exCard ? Number(exCard.dataset.ei) : null;
  const si = setRow ? Number(setRow.dataset.si) : null;
  if (btn.dataset.action === 'add-set' && ei !== null) addSet(ei);
  else if (btn.dataset.action === 'remove-set' && ei !== null && si !== null) removeSet(ei, si);
  else if (btn.dataset.action === 'remove-exercise' && ei !== null) removeExercise(ei);
});

document.getElementById('w-exs').addEventListener('change', (e) => {
  if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'number') return;
  const exCard = e.target.closest('[data-ei]');
  const setRow = e.target.closest('[data-si]');
  if (!exCard || !setRow) return;
  const ei = Number(exCard.dataset.ei);
  const si = Number(setRow.dataset.si);
  const f = e.target.dataset.field;
  updateSetField(ei, si, f, e.target.value);
});

// --- Library list item clicks (delegation) ---
document.getElementById('lib-l').addEventListener('click', (e) => {
  const row = e.target.closest('[data-exercise]');
  if (row) addExercise(row.dataset.exercise);
});

// --- Auto-login if token present ---
const state = getState();
if (state.tk) enterApp();
