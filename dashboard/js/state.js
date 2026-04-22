const STATE = {
  dToken: localStorage.getItem('hq_dtoken'),
  dClubId: localStorage.getItem('hq_dclub'),
};

export function getState() {
  return STATE;
}

export function setAuth(token, clubId) {
  STATE.dToken = token;
  STATE.dClubId = clubId;
  localStorage.setItem('hq_dtoken', token);
  localStorage.setItem('hq_dclub', clubId);
}

export function clearAuth() {
  STATE.dToken = null;
  STATE.dClubId = null;
  localStorage.removeItem('hq_dtoken');
  localStorage.removeItem('hq_dclub');
}
