import { dApi } from '../api.js';
import { setAuth } from '../state.js';

export async function dLogin() {
  try {
    const res = await dApi('/clubs/login', {
      method: 'POST',
      body: {
        email: document.getElementById('d-email').value,
        password: document.getElementById('d-pass').value,
      },
    });
    setAuth(res.token, res.club_id);
    return true;
  } catch (e) {
    const err = document.getElementById('d-err');
    err.textContent = e.message;
    err.style.display = 'block';
    return false;
  }
}

export async function dRegister() {
  try {
    const res = await dApi('/clubs/register', {
      method: 'POST',
      body: {
        name: document.getElementById('d-name').value,
        slug: document.getElementById('d-slug').value,
        email: document.getElementById('d-email').value,
        password: document.getElementById('d-pass').value,
        address: document.getElementById('d-addr').value,
      },
    });
    setAuth(res.token, res.club_id);
    return true;
  } catch (e) {
    const err = document.getElementById('d-err');
    err.textContent = e.message;
    err.style.display = 'block';
    return false;
  }
}

export function dToggle() {
  const reg = document.getElementById('d-register-form');
  reg.style.display = reg.style.display === 'none' ? 'block' : 'none';
}
