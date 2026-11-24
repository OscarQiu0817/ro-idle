/* 影子裝備（使用者 2026-11-24：開放影子裝，取得走商城轉蛋）。
   data.js 裡的影子裝原本都被 gen_item_identity 當成收藏品（material）。這支照 rAthena item_db 改成可穿戴：
     type 'shadow'、shadowSlot（6 格）、需求等級、職業（reqJob 比整條職業鏈）、三轉限定（reqThird）、性別、效果（同 gen_item_effects 的轉換器）。
   只收四轉限定以外的（Fourth 本作沒有）。
   node scripts/gen_shadow_gear.js           → 摘要
   node scripts/gen_shadow_gear.js --write   → js/shadow_gear.js（item_effects 之後載入） */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemDb, readYamlBody } = require('./lib/rathena');
const { parseScript, convert, autoSpellsOf, specialsOf, setContext } = require('./lib/item_script');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'js', 'shadow_gear.js');
const SLOT = { Shadow_Weapon: 'shadow_weapon', Shadow_Armor: 'shadow_armor', Shadow_Shield: 'shadow_shield', Shadow_Shoes: 'shadow_shoes',
  Shadow_Right_Accessory: 'shadow_earring', Shadow_Left_Accessory: 'shadow_pendant' };
// rAthena 職業名 → 本作二轉職業（reqJob 比職業鏈，進階二轉、三轉自然涵蓋）
const RA_JOB = { Novice: ['novice'], SuperNovice: ['supernovice'], Swordman: ['swordsman'], Knight: ['knight'], Crusader: ['crusader'],
  Mage: ['mage'], Wizard: ['wizard'], Sage: ['sage'], Archer: ['archer'], Hunter: ['hunter'], BardDancer: ['bard', 'dancer'],
  Acolyte: ['acolyte'], Priest: ['priest'], Monk: ['monk'], Merchant: ['merchant'], Blacksmith: ['blacksmith'], Alchemist: ['alchemist'],
  Thief: ['thief'], Assassin: ['assassin'], Rogue: ['rogue'] };
const STRUCT = ['bonus', 'perRefine', 'per2Refine', 'per2RefineExtra', 'per3Refine', 'per4Refine', 'per5Refine', 'perRefineSquare'];

function main() {
  const { ITEMS, MONSTERS, SKILLS, JOB_TREE } = loadGameData();
  const db = loadItemDb();
  const mobKey = {}, itemKeys = {};
  Object.values(MONSTERS).forEach(m => { if (m.imgId && !mobKey[m.imgId]) mobKey[m.imgId] = m.id; });
  Object.values(ITEMS).forEach(x => { if (x.imgId) (itemKeys[x.imgId] = itemKeys[x.imgId] || []).push(x.id); });
  const ctx = { skills: SKILLS, jobs: JOB_TREE, mobKey, itemKeys, groups: {} };
  setContext(ctx);
  const out = {};
  const stat = { ok: 0, fourth: 0, noRa: 0, noEffect: 0, slot: {} };
  const skippedKinds = {};
  for (const it of Object.values(ITEMS)) {
    const ra = it.imgId && db.get(it.imgId);
    if (!ra) continue;
    const loc = Object.keys(ra.Locations || {}).find(k => SLOT[k]);
    if (!loc) continue;
    const classes = Object.keys(ra.Classes || {}).filter(k => ra.Classes[k]);
    if (classes.length && classes.every(c => c === 'Fourth')) { stat.fourth++; continue; }
    const p = { type: 'shadow', shadowSlot: SLOT[loc], icon: '🌑' };
    if (ra.EquipLevelMin > 1) p.reqLevel = ra.EquipLevelMin;
    const jobs = Object.keys(ra.Jobs || {}).filter(k => ra.Jobs[k] && k !== 'All');
    if (jobs.length && !(ra.Jobs || {}).All) p.reqJob = [...new Set(jobs.flatMap(j => RA_JOB[j] || []))];
    if (classes.some(c => /Third/.test(c))) p.reqThird = true;
    if (ra.Gender === 'Male' || ra.Gender === 'Female') p.reqGender = ra.Gender;
    if (ra.Defense) p.def = ra.Defense;
    p.refineable = !!ra.Refineable;
    const entries = parseScript(ra.Script || '');
    const { rec, skipped } = convert(entries, { ...ctx, perStyle: 'item' });
    for (const k of STRUCT) if (rec[k] && Object.keys(rec[k]).length) p[k] = rec[k];
    if (rec.condBonus && rec.condBonus.length) p.condBonus = rec.condBonus;
    const as = autoSpellsOf(entries, SKILLS, true);
    if (as.list && as.list.length) p.autoSpell = as.list;
    const sp = specialsOf(entries, ctx);
    for (const kind of sp.kinds || []) if (sp.lists[kind] && sp.lists[kind].length) p[kind] = sp.lists[kind];
    skipped.filter(l => !(sp.done && sp.done.has(l))).forEach(l => { const m = l.match(/^(?:bonus\d?\s+)?(\w+)/); if (m) skippedKinds[m[1]] = (skippedKinds[m[1]] || 0) + 1; });
    if (!STRUCT.some(k => p[k]) && !p.condBonus && !p.autoSpell) stat.noEffect++;
    out[it.id] = p;
    stat.ok++;
    stat.slot[p.shadowSlot] = (stat.slot[p.shadowSlot] || 0) + 1;
  }
  console.log(`可穿戴影子裝 ${stat.ok} 件（四轉限定略過 ${stat.fourth}；轉不出效果 ${stat.noEffect}）`, JSON.stringify(stat.slot));
  console.log('轉不了的條目：' + Object.entries(skippedKinds).sort((a, b) => b[1] - a[1]).slice(0, 15).map(x => x.join(' ')).join('、'));
  if (WRITE) {
    const body = Object.keys(out).sort().map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(out[id])},`).join('\n');
    fs.writeFileSync(OUT, `/* 由 scripts/gen_shadow_gear.js --write 產生，勿手改。影子裝備：部位、限制、效果照 rAthena（item_effects 之後載入） */
const SHADOW_GEAR = {
${body}
};
(function applyShadowGear() {
  if (typeof ITEMS === 'undefined') return;
  for (const [id, p] of Object.entries(SHADOW_GEAR)) { if (ITEMS[id]) Object.assign(ITEMS[id], p); }
})();
`);
    console.log('寫入 ' + OUT);
  }
}
main();
