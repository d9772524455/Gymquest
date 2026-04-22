import { ap } from '../api.js';
import { getState } from '../state.js';
import { fn } from '../constants.js';
import { elt, clearChildren } from '../ui/dom.js';
import { ts } from '../ui/toast.js';
import { confirmModal } from '../ui/modal.js';

// Forward-declared refs; set by main.js to break circular import potential and
// make cross-screen updates after finW explicit.
let _sT = null;
let _rH = null;
let _rP = null;
let _lB = null;
let _lHi = null;

export function wireWorkout({ sT, rH, rP, lB, lHi }) {
  _sT = sT;
  _rH = rH;
  _rP = rP;
  _lB = lB;
  _lHi = lHi;
}

function startTimer() {
  const s = getState();
  if (s.wTi) clearInterval(s.wTi);
  s.wTi = setInterval(() => {
    const e = Math.floor((Date.now() - s.wSt) / 1000);
    document.getElementById('w-tmr').textContent =
      String(Math.floor(e / 60)).padStart(2, '0') + ':' + String(e % 60).padStart(2, '0');
  }, 1000);
}

export function startW() {
  const s = getState();
  s.W = [];
  s.wSt = Date.now();
  rW();
  uWS();
  if (_sT) _sT('workout');
  startTimer();
}

export async function canW() {
  const s = getState();
  if (s.W.length && !(await confirmModal('Отменить тренировку?'))) return;
  s.W = [];
  if (s.wTi) clearInterval(s.wTi);
  document.getElementById('w-tmr').textContent = '00:00';
  if (_sT) _sT('home');
}

export function rW() {
  const s = getState();
  const container = document.getElementById('w-exs');
  clearChildren(container);

  s.W.forEach((ex, ei) => {
    const card = elt('div', {
      class: 'card',
      style: 'padding:12px;margin-bottom:8px',
      attrs: { 'data-ei': String(ei) },
    });

    // Header row: exercise name + remove button
    const header = elt(
      'div',
      { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' },
      elt('div', { style: 'font-size:14px;font-weight:600', text: ex.n }),
      elt('div', {
        style: 'color:var(--red);font-size:18px;cursor:pointer',
        text: '✕',
        attrs: { 'data-action': 'remove-exercise' },
      })
    );
    card.appendChild(header);

    // Column labels
    const labels = elt(
      'div',
      { style: 'display:flex;gap:4px;margin-bottom:6px' },
      elt('div', { style: 'flex:1;font-size:9px;color:var(--mut);text-align:center', text: '№' }),
      elt('div', { style: 'width:55px;font-size:9px;color:var(--mut);text-align:center', text: 'Повт.' }),
      elt('div', { style: 'width:65px;font-size:9px;color:var(--mut);text-align:center', text: 'Вес(кг)' }),
      elt('div', { style: 'width:20px' })
    );
    card.appendChild(labels);

    // Set rows
    ex.s.forEach((setData, si) => {
      const row = elt(
        'div',
        {
          style: 'display:flex;gap:4px;margin-bottom:4px;align-items:center',
          attrs: { 'data-si': String(si) },
        },
        elt('div', {
          class: 'mono',
          style: 'flex:1;text-align:center;font-size:11px;color:var(--mut)',
          text: String(si + 1),
        }),
        elt('input', {
          style: 'width:55px',
          attrs: {
            type: 'number',
            value: String(setData.r),
            min: '0',
            max: '999',
            step: '1',
            'data-field': 'r',
          },
        }),
        elt('input', {
          style: 'width:65px',
          attrs: {
            type: 'number',
            value: String(setData.w),
            min: '0',
            max: '9999',
            step: '0.5',
            'data-field': 'w',
          },
        }),
        elt('div', {
          style: 'width:20px;text-align:center;color:var(--red);cursor:pointer;font-size:13px',
          text: '−',
          attrs: { 'data-action': 'remove-set' },
        })
      );
      card.appendChild(row);
    });

    // Add-set button
    card.appendChild(
      elt('div', {
        style:
          'text-align:center;padding:6px;color:var(--acc);font-size:12px;cursor:pointer;border:1px dashed var(--brd);border-radius:8px;margin-top:6px',
        text: '+ подход',
        attrs: { 'data-action': 'add-set' },
      })
    );

    container.appendChild(card);
  });

  uWS();
}

export function aS(i) {
  const s = getState();
  const last = s.W[i].s[s.W[i].s.length - 1] || { r: 10, w: 0 };
  s.W[i].s.push({ r: last.r, w: last.w });
  rW();
}

export function rmS(i, j) {
  const s = getState();
  if (s.W[i].s.length <= 1) return;
  s.W[i].s.splice(j, 1);
  rW();
}

export function rmEx(i) {
  const s = getState();
  s.W.splice(i, 1);
  rW();
}

export function uS(i, j, f, v) {
  const s = getState();
  s.W[i].s[j][f] = parseFloat(v) || 0;
  uWS();
}

export function uWS() {
  const s = getState();
  let totalSets = 0;
  let totalTon = 0;
  s.W.forEach((e) => e.s.forEach((setData) => {
    totalSets++;
    totalTon += setData.r * setData.w;
  }));
  document.getElementById('w-ts').textContent = totalSets;
  document.getElementById('w-tt').textContent = fn(totalTon);
  document.getElementById('w-te').textContent = s.W.length;
}

export async function finW() {
  const s = getState();
  if (!s.W.length) {
    ts('Добавь упражнение', 'var(--red)');
    return;
  }
  const el = Math.max(Math.floor((Date.now() - s.wSt) / 60000), 1);
  if (s.wTi) clearInterval(s.wTi);
  const exs = s.W.map((e) => ({
    name: e.n,
    sets: e.s.length,
    reps: Math.round(e.s.reduce((a, x) => a + x.r, 0) / e.s.length),
    weight_kg: Math.round((e.s.reduce((a, x) => a + x.w, 0) / e.s.length) * 10) / 10,
  }));
  try {
    const r = await ap('/workouts', {
      method: 'POST',
      body: {
        duration_minutes: el,
        calories: Math.round(exs.length * 30),
        type: 'strength',
        exercises: exs,
      },
    });
    let m = '🏋️ +' + r.xp_earned + ' XP';
    if (r.tonnage > 0) m += ' • ' + fn(r.tonnage) + 'кг';
    m += ' • 🔥' + r.streak;
    if (r.level_up) m = '🎉 LEVEL UP!<br>' + m;
    if (r.new_achievements?.length) m += '<br>🏅 ' + r.new_achievements.map((a) => a.name).join(', ');
    ts(m, r.level_up ? 'var(--org)' : 'var(--grn)');
    s.W = [];
    document.getElementById('w-tmr').textContent = '00:00';
    s.P = await ap('/me');
    if (_rH) _rH();
    if (_rP) _rP();
    if (_lB) _lB();
    if (_lHi) _lHi();
    if (_sT) _sT('home');
  } catch (e) {
    ts(e.message, 'var(--red)');
  }
}

// Library calls this to start timer when first exercise is added
export function ensureWorkoutStarted() {
  const s = getState();
  if (!s.wSt) {
    s.wSt = Date.now();
    startTimer();
  }
}
