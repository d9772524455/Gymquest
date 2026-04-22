import { getState, clearAuth } from './state.js';

export async function dApi(path, opts = {}) {
  const { dToken } = getState();
  const res = await fetch('/api' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(dToken ? { Authorization: 'Bearer ' + dToken } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    if (dToken) {
      clearAuth();
      location.reload();
      throw new Error('Сессия истекла — перелогиньтесь');
    }
    // No session — login-attempt 401. Fall through.
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(e.error);
  }
  return res.json();
}
