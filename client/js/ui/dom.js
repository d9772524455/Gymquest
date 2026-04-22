export function elt(tag, opts, ...kids) {
  const n = document.createElement(tag);
  if (opts) {
    if (opts.class) n.className = opts.class;
    if (opts.style) n.setAttribute('style', opts.style);
    if (opts.text != null) n.textContent = String(opts.text);
    if (opts.id) n.id = opts.id;
    if (opts.onClick) n.addEventListener('click', opts.onClick);
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) n.setAttribute(k, v);
  }
  for (const k of kids) if (k) n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  return n;
}

export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
