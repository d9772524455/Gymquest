import { getState, clearAuth } from './state.js';
import { loadOverview } from './screens/overview.js';
import { dLoadAlerts } from './screens/alerts.js';
import { dLoadMembers } from './screens/members.js';
import { renderQR } from './screens/qr.js';
import { loadSeasons, createSeason } from './screens/seasons.js';
import { dLogin, dRegister, showDLogin, showDRegister } from './screens/auth.js';
import { showToast } from './ui/toast.js';
import { copyToClipboard } from './ui/clipboard.js';

async function enterDashboard() {
  document.getElementById('d-auth').style.display = 'none';
  document.getElementById('d-main').style.display = 'block';
  const { dClubId } = getState();
  document.getElementById('d-club-id-val').textContent = dClubId;
  document.getElementById('d-club-id-banner').style.display = 'flex';
  try {
    await loadOverview();
    dLoadAlerts();
    dLoadMembers();
  } catch (e) { /* 401 auto-handled */ }
}

function dLogout() {
  clearAuth();
  location.reload();
}

function dTab(id) {
  ['overview', 'alerts', 'members', 'qr', 'seasons'].forEach((t) => {
    document.getElementById('dt-' + t).style.display = t === id ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.t === id));
  if (id === 'qr') renderQR();
  if (id === 'seasons') loadSeasons();
}

// Wire auth handlers (Enter-to-submit via <form>)
document.getElementById('d-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (await dLogin()) enterDashboard();
});
document.getElementById('d-register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (await dRegister()) enterDashboard();
});
document.getElementById('d-to-register').addEventListener('click', showDRegister);
document.getElementById('d-to-register').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDRegister(); }
});
document.getElementById('d-to-login').addEventListener('click', showDLogin);
document.getElementById('d-to-login').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDLogin(); }
});

// Tab bar
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => dTab(t.dataset.t)));

// QR regen + seasons
document.querySelector('[data-action="regen-qr"]').addEventListener('click', renderQR);
document.querySelector('[data-action="create-season"]').addEventListener('click', createSeason);

// Start date → end date min sync (D8)
document.getElementById('s-start').addEventListener('change', (e) => {
  document.getElementById('s-end').min = e.target.value;
});

// Club ID copy (D9)
document.querySelector('[data-action="copy-club-id"]').addEventListener('click', async () => {
  const { dClubId } = getState();
  const ok = await copyToClipboard(dClubId);
  showToast(ok ? 'Club ID скопирован' : 'Не удалось скопировать', ok ? '#22c55e' : '#ef4444');
});

// Logout
document.querySelector('[data-action="dashboard-logout"]').addEventListener('click', dLogout);

// Boot
if (getState().dToken) enterDashboard();
