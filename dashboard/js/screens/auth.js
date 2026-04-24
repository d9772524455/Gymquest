import { dApi } from '../api.js';
import { setAuth } from '../state.js';

function showError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError(elId) {
  document.getElementById(elId).style.display = 'none';
}

export function showDLogin() {
  document.getElementById('d-login-form').style.display = 'block';
  document.getElementById('d-register-form').style.display = 'none';
  hideError('dl-err');
  hideError('dr-err');
}

export function showDRegister() {
  document.getElementById('d-login-form').style.display = 'none';
  document.getElementById('d-register-form').style.display = 'block';
  hideError('dl-err');
  hideError('dr-err');
}

export async function dLogin() {
  hideError('dl-err');
  const email = document.getElementById('dl-email').value.trim();
  const password = document.getElementById('dl-pass').value;

  if (!email || !password) {
    showError('dl-err', 'Заполните все поля');
    return false;
  }

  try {
    const res = await dApi('/clubs/login', {
      method: 'POST',
      body: { email, password },
    });
    setAuth(res.token, res.club_id);
    return true;
  } catch (e) {
    showError('dl-err', e.message);
    return false;
  }
}

export async function dRegister() {
  hideError('dr-err');
  const name = document.getElementById('dr-name').value.trim();
  const slug = document.getElementById('dr-slug').value.trim();
  const email = document.getElementById('dr-email').value.trim();
  const password = document.getElementById('dr-pass').value;
  const address = document.getElementById('dr-addr').value.trim();

  if (!name || !slug || !email || !password) {
    showError('dr-err', 'Заполните обязательные поля');
    return false;
  }
  if (password.length < 8) {
    showError('dr-err', 'Пароль минимум 8 символов');
    return false;
  }

  try {
    const res = await dApi('/clubs/register', {
      method: 'POST',
      body: { name, slug, email, password, address },
    });
    setAuth(res.token, res.club_id);
    return true;
  } catch (e) {
    showError('dr-err', e.message);
    return false;
  }
}
