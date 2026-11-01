/* 3a：技能 id 全面改成 rAthena 名稱小寫（一次性，留檔備查）。
   node scripts/rename_skill_ids.js          → 預覽：每個檔案改幾處、可疑的出現位置
   node scripts/rename_skill_ids.js --write  → 套用
   對照來源：scripts/out/skill_id_map.json（scripts/gen_skill_id_map.js）＋下方覆寫。
   刪除的技能（DELETE）不在這裡處理，見 3a 的刪除步驟。 */
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/game_data');

const FILES = ['js/skills.js', 'js/jobs.js', 'js/engine.js', 'js/ui.js', 'js/data.js', 'js/monster_skills.js',
  'js/relics.js', 'js/achievements.js'];

/* 對照覆寫：遊戲把傭兵的狂暴狀態對成劍士技能 */
const OVERRIDE = { berserk_sword: 'sm_autoberserk' };
/* 3a 要刪的技能：不改名 */
const DELETE = new Set(['novice_basicskill', 'novice_hpboost', 'novice_flee', 'swordcraft', 'cartrevo', 'frostjoke',
  'bc_slimpitcher', 'bc_fullprotection', 'zenrecovery', 'dispell_magic']);
/* 這些舊 id 同時是道具 id、技能類型、passiveStat 或 buff 類型：只在明確的技能語境下改 */
const AMBIGUOUS = new Set(['vending', 'discount', 'overcharge', 'detoxify', 'steal', 'doubleattack', 'teleport', 'cure',
  'heal', 'blessing', 'riding', 'oridecon', 'greed', 'grimtooth', 'kyrie', 'resurrection']);
/* 非技能語境：這些函式的第一個參數不是技能 id */
const NON_SKILL_CALL = /(buffMult|getCardBonus|equippedStatBonus|farmMult|candyMult|addItem|removeItem|getItemQty|getEquipBaseItemId|ITEMS\[)\(?\s*$/;

function buildMap() {
  const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'out', 'skill_id_map.json'), 'utf8'));
  const m = {};
  for (const r of rows) {
    if (DELETE.has(r.id)) continue;
    const to = OVERRIDE[r.id] || (r.pick && r.pick.toLowerCase());
    if (!to) throw new Error('沒有對照：' + r.id);
    if (to !== r.id) m[r.id] = to;
  }
  const seen = {};
  for (const [a, b] of Object.entries(m)) { if (seen[b]) throw new Error('新 id 重複：' + b + ' ← ' + seen[b] + '、' + a); seen[b] = a; }
  return m;
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function renameFile(file, map, report) {
  let s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let n = 0;
  const sus = [];
  const skillCtx = /(SKILLS\[|learnedSkills\[|cooldowns\[|autoSupportSkills\[|skillLv\(|castSkill\(|skillReady\(|findSkillForUse\(|findSkillById\(|levelUpSkill\(|skillId:\s*|skillId\s*===\s*|sk\.id\s*===\s*|\.id\s*===\s*|ready\()\s*$/;
  for (const [from, to] of Object.entries(map)) {
    const amb = AMBIGUOUS.has(from);
    const whole = file === 'js/jobs.js' || file === 'js/skills.js';
    // 1. 引號字串
    s = s.replace(new RegExp(`(['"])${esc(from)}\\1`, 'g'), (m0, q, off, str) => {
      const before = str.slice(Math.max(0, off - 40), off);
      // 道具賦予技能：grantSkill 陣列、或 `"道具": [{ id: '技能'` 對照表
      const lineStart = str.lastIndexOf('\n', off) + 1;
      const line = str.slice(lineStart, str.indexOf('\n', off) === -1 ? str.length : str.indexOf('\n', off));
      const grant = /\{\s*"?id"?\s*:\s*$/.test(before) && (/grantSkill/.test(line) || /\[\{\s*id:\s*$/.test(before));
      if (amb && grant) { n++; return q + to + q; }
      if (amb && !whole && !skillCtx.test(before)) { sus.push(`${from} … ${before.replace(/\s+/g, ' ').slice(-30)}${m0}`); return m0; }
      if (amb && file === 'js/skills.js' && /(type|passiveStat)"?\s*:\s*$/.test(before)) return m0;
      if (!amb && NON_SKILL_CALL.test(before)) { sus.push(`${from} … ${before.replace(/\s+/g, ' ').slice(-30)}${m0}`); return m0; }
      n++; return q + to + q;
    });
    // 2. skills.js 的物件鍵（行首 `  bash: {`）
    if (file === 'js/skills.js') s = s.replace(new RegExp(`^(\\s+)${esc(from)}(\\s*:\\s*\\{)`, 'gm'), (m0, a, b) => { n++; return a + to + b; });
    // 3. SKILLS.<id>
    s = s.replace(new RegExp(`\\bSKILLS\\.${esc(from)}\\b`, 'g'), () => { n++; return 'SKILLS.' + to; });
    // 4. 複合鍵：skillDmg_<id>、skillCdFlat_<id>、spCost_<id>、perSkill_<id>_…（含 perBaseLv1_skillDmg_<id>）
    s = s.replace(new RegExp(`\\b(skillDmg|skillCdFlat|spCost|perSkill)_${esc(from)}(?=[_"'\\s:,)}]|$)`, 'gm'), (m0, p) => { n++; return p + '_' + to; });
  }
  report.push({ file, n, sus });
  return s;
}

function main() {
  const write = process.argv.includes('--write');
  const map = buildMap();
  const report = [];
  const out = {};
  for (const f of FILES) out[f] = renameFile(f, map, report);
  console.log('改名', Object.keys(map).length, '個技能 id');
  for (const r of report) {
    console.log(r.file, '改', r.n, '處', r.sus.length ? '｜保留未改 ' + r.sus.length + ' 處' : '');
    r.sus.slice(0, 40).forEach(x => console.log('   ', x));
  }
  if (write) {
    for (const f of FILES) fs.writeFileSync(path.join(ROOT, f), out[f]);
    fs.writeFileSync(path.join(ROOT, 'scripts', 'out', 'skill_rename_map.json'), JSON.stringify(map, null, 1));
    console.log('已寫入');
  }
}

main();
