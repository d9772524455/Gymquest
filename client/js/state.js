const STATE = {
  tk: localStorage.getItem('hq_token'),
  cid: localStorage.getItem('hq_club'),
  am: 'login',
  hc: 'warrior',
  P: null,
  AA: [],
  W: [],
  wSt: null,
  wTi: null,
};

export function getState() {
  return STATE;
}

export function setToken(token, clubId) {
  STATE.tk = token;
  STATE.cid = clubId;
  localStorage.setItem('hq_token', token);
  localStorage.setItem('hq_club', clubId);
}

export function clearAuth() {
  STATE.tk = null;
  STATE.cid = null;
  localStorage.clear();
}
