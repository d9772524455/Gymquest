export function ts(msg, color) {
  const t = document.getElementById('toast');
  while (t.firstChild) t.removeChild(t.firstChild);
  // msg может содержать <br> — поддержим разбиение безопасно
  const lines = String(msg).split('<br>');
  lines.forEach((line, i) => {
    if (i > 0) t.appendChild(document.createElement('br'));
    t.appendChild(document.createTextNode(line));
  });
  t.style.background = color || 'var(--cyan)';
  t.style.color = color === 'var(--red)' ? '#fff' : '#000';
  t.style.display = 'block';
  setTimeout(() => (t.style.display = 'none'), 4000);
}
