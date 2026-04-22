import { getState, clearAuth } from './state.js';

export async function apiCall(path, opts = {}) {
  const state = getState();
  const res = await fetch('/api' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(state.tk ? { Authorization: 'Bearer ' + state.tk } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    if (state.tk) {
      // We had a session; it's expired or revoked. Clear and bounce to auth.
      clearAuth();
      location.reload();
      throw new Error('Сессия истекла');
    }
    // No prior session — this is a login-attempt 401 (bad creds). Fall through to the normal error path.
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Err' }));
    throw new Error(e.error);
  }
  return res.json();
}
