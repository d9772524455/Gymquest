export function confirmModal(message) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-bg';
    backdrop.style.cssText = 'display:flex';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'max-width:340px;padding:24px;text-align:center';
    const msg = document.createElement('div');
    msg.style.cssText = 'margin-bottom:20px;font-size:14px';
    msg.textContent = message;
    modal.appendChild(msg);
    const okBtn = document.createElement('button');
    okBtn.className = 'btn';
    okBtn.textContent = 'Да';
    okBtn.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      resolve(true);
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sec';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      resolve(false);
    });
    modal.appendChild(okBtn);
    modal.appendChild(cancelBtn);
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        document.body.removeChild(backdrop);
        resolve(false);
      }
    });
    document.body.appendChild(backdrop);
  });
}
