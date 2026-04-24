import { apiCall } from '../api.js';
import { setToken } from '../state.js';
import { HERO_COLORS } from '../constants.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let selectedHero = 'warrior';

function showError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError(elId) {
  document.getElementById(elId).style.display = 'none';
}

function showLogin() {
  document.getElementById('auth-login-form').style.display = 'block';
  document.getElementById('auth-register-form').style.display = 'none';
  hideError('al-err');
  hideError('ar-err');
}

function showRegister() {
  document.getElementById('auth-login-form').style.display = 'none';
  document.getElementById('auth-register-form').style.display = 'block';
  hideError('al-err');
  hideError('ar-err');
}

function pickHero(h) {
  selectedHero = h;
  document.querySelectorAll('#ar-heroes .hp').forEach((e) => {
    const on = e.dataset.h === h;
    e.classList.toggle('on', on);
    e.querySelector('.mono').style.color = on ? HERO_COLORS[h] : 'var(--mut)';
  });
  document.documentElement.style.setProperty('--hero', HERO_COLORS[h]);
}

async function submitLogin() {
  hideError('al-err');
  const cl = document.getElementById('al-club').value.trim();
  const em = document.getElementById('al-email').value.trim();
  const pw = document.getElementById('al-pass').value;

  if (!cl || !em || !pw) {
    showError('al-err', 'Заполните все поля');
    throw new Error('validation');
  }
  if (!UUID_RE.test(cl)) {
    showError('al-err', 'Club ID должен быть UUID — спросите у клуба');
    throw new Error('validation');
  }

  try {
    const r = await apiCall('/members/login', {
      method: 'POST',
      body: { club_id: cl, email: em, password: pw },
    });
    setToken(r.token, r.club_id || cl);
  } catch (e) {
    showError('al-err', e.message);
    throw e;
  }
}

async function submitRegister() {
  hideError('ar-err');
  const cl = document.getElementById('ar-club').value.trim();
  const nm = document.getElementById('ar-name').value.trim();
  const em = document.getElementById('ar-email').value.trim();
  const pw = document.getElementById('ar-pass').value;

  if (!cl || !nm || !em || !pw) {
    showError('ar-err', 'Заполните все поля');
    throw new Error('validation');
  }
  if (!UUID_RE.test(cl)) {
    showError('ar-err', 'Club ID должен быть UUID — спросите у клуба');
    throw new Error('validation');
  }
  if (pw.length < 8) {
    showError('ar-err', 'Пароль минимум 8 символов');
    throw new Error('validation');
  }

  try {
    const r = await apiCall('/members/register', {
      method: 'POST',
      body: { club_id: cl, email: em, password: pw, name: nm, hero_class: selectedHero },
    });
    setToken(r.token, r.club_id || cl);
  } catch (e) {
    showError('ar-err', e.message);
    throw e;
  }
}

export function initAuth(onAuthSuccess) {
  document.getElementById('auth-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitLogin().then(onAuthSuccess).catch(() => {});
  });
  document.getElementById('auth-register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitRegister().then(onAuthSuccess).catch(() => {});
  });
  document.getElementById('to-register').addEventListener('click', showRegister);
  document.getElementById('to-login').addEventListener('click', showLogin);
  document.querySelectorAll('#ar-heroes .hp').forEach((el) => {
    el.addEventListener('click', () => pickHero(el.dataset.h));
  });
}
