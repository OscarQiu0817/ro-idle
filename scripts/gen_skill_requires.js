/* 官方技能前置（D8）
   node scripts/gen_skill_requires.js   → 寫 js/skill_requires.js
   來源：rAthena db/re/skill_tree.yml（grf_ex/skill_tree.yml）。技能 id ＝ rAthena 名稱小寫。

   同一技能在不同職業的前置可能不同（合奏技：詩人要詩人的歌、舞孃要舞孃的舞；
   安全之地：法師系要聖靈召喚＋靈魂之擊、牧師系要光獄），SKILLS 物件卻是共用的，
   所以收集所有版本，任一版本滿足就能點——一個角色只會走其中一條線。 */
const fs = require('fs');
const path = require('path');
const { readYamlBody } = require('./lib/rathena');
const ROOT = path.join(__dirname, '..');

const body = readYamlBody('grf_ex/skill_tree.yml');
const out = {};
for (const job of body) {
  for (const t of job.Tree || []) {
    if (!t.MaxLevel) continue;   // MaxLevel 0 ＝ 從繼承的樹移除
    const id = t.Name.toLowerCase();
    const req = (t.Requires || []).filter(r => r.Level > 0).map(r => [r.Name.toLowerCase(), r.Level]);
    const vs = out[id] || (out[id] = []);
    if (!vs.some(v => JSON.stringify(v) === JSON.stringify(req))) vs.push(req);
  }
}
// 只有「沒前置」一個版本的不用寫
for (const id of Object.keys(out)) if (out[id].length === 1 && !out[id][0].length) delete out[id];

const lines = Object.entries(out).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n');
fs.writeFileSync(path.join(ROOT, 'js', 'skill_requires.js'),
`/* 由 scripts/gen_skill_requires.js 產生，資料段勿手改。來源：rAthena db/re/skill_tree.yml。
   技能 id → 版本陣列，每個版本是 [[前置技能 id, 等級], …]；任一版本滿足即可（見產生器註解） */
const SKILL_REQUIRES = {
${lines}
};

/* 套用：官方表為準，覆寫 SKILLS 上的 requires（D8）。
   - 官方表沒列的技能維持原樣
   - 前置技能本作沒有（已刪除）的那條略過；本作把等級上限砍低的（例：鍛造系列 maxLv 1）封頂，不然永遠點不了
   - 有一個版本沒有前置 → 整個技能不需前置
   - 一個版本 → requires；多個版本 → requiresAny（engine levelUpSkill／skillMissingReq 讀） */
(function applySkillRequires() {
  if (typeof SKILLS === 'undefined') return;
  // jobs.js 裡寫成物件的技能是 SKILLS 的複本，兩邊都要套
  const all = Object.values(SKILLS);
  if (typeof JOB_TREE !== 'undefined') Object.values(JOB_TREE).forEach(j => (j.skills || []).forEach(s => { if (!all.includes(s)) all.push(s); }));
  for (const sk of all) {
    const id = sk.id;
    const vers = SKILL_REQUIRES[id];
    if (!vers) continue;
    delete sk.requires; delete sk.requiresAny;
    const list = vers.map(v => v.filter(([rid]) => SKILLS[rid])
      .map(([skillId, level]) => ({ skillId, level: Math.min(level, SKILLS[skillId].maxLv || level) })));
    if (list.some(v => !v.length)) continue;
    if (list.length === 1) sk.requires = list[0].length === 1 ? list[0][0] : list[0];
    else sk.requiresAny = list;
  }
})();
`);
console.log('前置技能', Object.keys(out).length, '筆');
