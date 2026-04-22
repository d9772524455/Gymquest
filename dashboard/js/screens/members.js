import { dApi } from '../api.js';
import { elt, clearChildren } from '../ui/dom.js';
import { dRiskColor, dRiskBg, dRiskLabel } from '../constants.js';

export async function dLoadMembers() {
  try {
    const members = await dApi('/club/members');
    const container = document.getElementById('members-list');
    clearChildren(container);
    if (!members.length) {
      const hint = elt('div', { style: 'color:#64748b;text-align:center;padding:40px', text: 'Нет участников' });
      container.appendChild(hint);
      return;
    }
    for (const m of members) {
      const row = elt('div', { class: 'card', style: 'display:flex;align-items:center;gap:12px;padding:12px 16px' },
        elt('div', { style: 'flex:1' },
          elt('div', { style: 'font-size:13px;font-weight:600', text: m.name }),
          elt('div', { style: 'font-size:11px;color:#64748b', text: 'Ур. ' + (Number(m.level) || 0) + ' • ' + (Number(m.xp) || 0) + ' XP • ' + (Number(m.total_w) || 0) + ' тренировок' })
        ),
        elt('div', { class: 'mono', style: 'font-size:10px;padding:2px 6px;border-radius:4px;background:' + dRiskBg(m.risk) + ';color:' + dRiskColor(m.risk), text: dRiskLabel(m.risk) })
      );
      container.appendChild(row);
    }
  } catch (e) {
    // 401 auto-handled by dApi; other errors silent per existing behavior
  }
}
