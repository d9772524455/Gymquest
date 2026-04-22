import { apiCall } from '../api.js';
import { getState, clearAuth } from '../state.js';
import { HERO_EMOJI, HERO_COLORS, XP_LEVELS, formatNumber } from '../constants.js';
import { showToast } from '../ui/toast.js';
import { renderProfile } from './profile.js';
import { loadLeaderboard } from './board.js';
import { loadHistory } from './history.js';

export function switchTab(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById('s-' + id).classList.add('active');
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.t === id));
}

export function logout() {
  clearAuth();
  location.reload();
}

export async function enterApp() {
  document.getElementById('auth').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  try {
    const s = getState();
    const [P, AA] = await Promise.all([apiCall('/me'), apiCall('/achievements')]);
    s.P = P;
    s.AA = AA;
    document.documentElement.style.setProperty('--hero', HERO_COLORS[P.hero] || '#00e5ff');
    renderHome();
    renderProfile();
    loadLeaderboard();
    loadHistory();
  } catch (e) {
    // If /me or /achievements fail with non-401 — kick to login as a safety net.
    // 401 is already handled by api.js (clearAuth + reload).
    logout();
  }
}

export function renderHome() {
  const { P } = getState();
  if (!P) return;
  const h = P;
  document.getElementById('h-name').textContent = h.name;
  document.getElementById('h-av').textContent = HERO_EMOJI[h.hero];
  document.getElementById('h-lv').textContent = h.level;
  document.getElementById('h-cls').textContent = h.hero_info?.name || h.hero;
  document.getElementById('h-xp').textContent = h.xp;
  document.getElementById('h-xpn').textContent = h.xp_next;
  document.getElementById('h-str').textContent = h.streak;
  document.getElementById('h-tw').textContent = h.total_w;
  document.getElementById('h-ton').textContent = formatNumber(h.total_ton);
  document.getElementById('h-min').textContent = h.total_min;
  const pv = XP_LEVELS[h.level - 1] || 0;
  document.getElementById('h-bar').style.width =
    Math.min(100, Math.max(2, ((h.xp - pv) / (h.xp_next - pv)) * 100)) + '%';
}

export async function quickCheckin() {
  try {
    const r = await apiCall('/workouts', {
      method: 'POST',
      body: { duration_minutes: 0, calories: 0, type: 'checkin', exercises: [] },
    });
    const lines = ['📍 +' + r.xp_earned + ' XP • 🔥' + r.streak];
    if (r.level_up) lines[0] = '🎉 LEVEL UP! ' + lines[0];
    if (r.new_achievements?.length) {
      lines.push('🏅 ' + r.new_achievements.map((a) => a.name).join(', '));
    }
    showToast(lines, r.level_up ? 'var(--org)' : undefined);
    const s = getState();
    s.P = await apiCall('/me');
    renderHome();
    renderProfile();
    loadLeaderboard();
    loadHistory();
  } catch (e) {
    showToast(e.message, 'var(--red)');
  }
}
