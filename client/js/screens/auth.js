import { ap } from '../api.js';
import { getState, setToken } from '../state.js';
import { HERO_COLORS } from '../constants.js';

export function tglAuth() {
  const s = getState();
  s.am = s.am === 'login' ? 'register' : 'login';
  document.getElementById('a-nr').style.display = s.am === 'register' ? 'block' : 'none';
  document.getElementById('a-heroes').style.display = s.am === 'register' ? 'grid' : 'none';
  document.getElementById('a-tgl').textContent =
    s.am === 'register' ? 'Уже есть? Войти' : 'Нет аккаунта? Регистрация';
}

export function pH(h) {
  const s = getState();
  s.hc = h;
  document.querySelectorAll('.hp').forEach((e) => {
    const on = e.dataset.h === h;
    e.classList.toggle('on', on);
    e.querySelector('.mono').style.color = on ? HERO_COLORS[h] : 'var(--mut)';
  });
  document.documentElement.style.setProperty('--hero', HERO_COLORS[h]);
}

export async function doAuth() {
  const s = getState();
  const cl = document.getElementById('a-club').value.trim();
  const em = document.getElementById('a-email').value.trim();
  const pw = document.getElementById('a-pass').value;
  const er = document.getElementById('a-err');
  er.style.display = 'none';
  try {
    let r;
    if (s.am === 'register') {
      const nm = document.getElementById('a-name').value.trim();
      if (!cl || !em || !pw || !nm) throw new Error('Заполните все поля');
      r = await ap('/members/register', {
        method: 'POST',
        body: { club_id: cl, email: em, password: pw, name: nm, hero_class: s.hc },
      });
    } else {
      if (!cl || !em || !pw) throw new Error('Заполните все поля');
      r = await ap('/members/login', {
        method: 'POST',
        body: { club_id: cl, email: em, password: pw },
      });
    }
    setToken(r.token, r.club_id || cl);
  } catch (e) {
    er.textContent = e.message;
    er.style.display = 'block';
    throw e;
  }
}

export function initAuth(onAuthSuccess) {
  document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    doAuth().then(onAuthSuccess).catch(() => {});
  });
  document.getElementById('a-tgl').addEventListener('click', tglAuth);
  document.querySelectorAll('.hp').forEach((el) => {
    el.addEventListener('click', () => pH(el.dataset.h));
  });
}
