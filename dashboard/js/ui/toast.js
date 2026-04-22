export function showToast(msg, color) {
  const t = document.getElementById('d-toast');
  t.textContent = String(msg);
  t.style.background = color || '#2E86C1';
  t.style.color = '#fff';
  t.style.display = 'block';
  setTimeout(() => (t.style.display = 'none'), 4000);
}
