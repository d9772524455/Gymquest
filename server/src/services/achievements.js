// Achievement evaluation. Requires DB (reads existing + inserts new).

const { ACHIEVEMENTS } = require('../constants');
const { query } = require('../db/pool');

/**
 * Evaluate achievement unlocks for a member against current stats.
 * Idempotent via ON CONFLICT DO NOTHING.
 * @param {string} memberId
 * @param {Record<string, number>} stats — { total_w, streak, level, total_ton }
 * @returns {Promise<Array<{id:string,name:string,desc:string}>>} newly unlocked
 */
async function checkAchievements(memberId, stats) {
  const existing = await query('SELECT ach_id FROM achievements WHERE member_id=$1', [memberId]);
  const unlocked = new Set(existing.map((r) => r.ach_id));
  const newAchs = [];

  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    const val = stats[a.field] || 0;
    if (a.op === '>=' && val >= a.val) {
      await query(
        'INSERT INTO achievements(member_id, ach_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [memberId, a.id]
      );
      newAchs.push({ id: a.id, name: a.name, desc: a.desc });
    }
  }
  return newAchs;
}

module.exports = { checkAchievements };
