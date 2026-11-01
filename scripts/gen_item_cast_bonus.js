/* 道具效果層 5a：詠唱／延遲／冷卻／不可中斷（docs/GAMEPLAY_DIRECTION.md D2、工作 5）
   node scripts/gen_item_cast_bonus.js           → 只印報告
   node scripts/gen_item_cast_bonus.js --write   → 寫 js/item_cast_bonus.js

   來源：rAthena item_db 的 Script。只認下列 bonus，其他照舊由 data.js 的 bonus 管：
     bonus  bVariableCastrate,N        castVarPct（%，正＝變慢）
     bonus2 bVariableCastrate,"S",N    castVarPct_<技能>
     bonus2 bSkillVariableCast,"S",ms  castVarMs_<技能>
     bonus  bFixedCastrate,N           castFixedPct（取最大單一減免，見 engine mergeBonus）
     bonus  bFixedCast,ms              castFixedMs
     bonus2 bSkillFixedCast,"S",ms     castFixedMs_<技能>
     bonus  bDelayrate,N               acdPct
     bonus2 bSkillCooldown,"S",ms      skillCdMs_<技能>
     bonus  bNoCastCancel              noCastCancel
   條件只認精煉（getrefine() / .@r >= N，含 else），值只認常數與「精煉 ×／÷ N」；
   其他條件（職業、等級、套裝…）整段略過，列在報告。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemDb } = require('./lib/rathena');

const { parseScript, convert } = require('./lib/item_script');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'js', 'item_cast_bonus.js');
const KEYS = ['castVarPct', 'castVarPct_', 'castVarMs_', 'castFixedPct', 'castFixedMs', 'castFixedMs_', 'acdPct', 'skillCdMs_', 'noCastCancel'];

function build() {
  const { ITEMS, CARDS, SKILLS } = loadGameData();
  const db = loadItemDb();
  const byAegis = new Map();
  db.forEach(it => byAegis.set(String(it.AegisName).toLowerCase(), it));
  const out = {};
  const skipped = [];
  let n = 0;
  for (const it of Object.values(ITEMS)) {
    const ra = byAegis.get(String(it.id).toLowerCase()) || (it.imgId && db.get(it.imgId));
    if (!ra || !ra.Script) continue;
    const r = convert(parseScript(ra.Script), { keys: KEYS, skills: SKILLS });
    r.skipped.forEach(x => skipped.push(it.id + ': ' + x));
    if (Object.keys(r.rec).length) { out[it.id] = r.rec; n++; }
  }
  return { out, skipped, n, cards: Object.keys(out).filter(id => CARDS[id]).length };
}

const { out, skipped, n, cards } = build();
console.log(`有詠唱／延遲／冷卻效果的道具 ${n} 件（其中卡片 ${cards} 張）`);
console.log(`略過 ${skipped.length} 條（條件或寫法不支援）`);
skipped.slice(0, process.argv.includes('--all') ? Infinity : 40).forEach(s => console.log('  ' + s));
if (WRITE) {
  const body = Object.keys(out).sort().map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(out[id])},`).join('\n');
  fs.writeFileSync(OUT, `/* 由 scripts/gen_item_cast_bonus.js --write 產生，勿手改。
   在 data.js 之後載入：先清掉舊的魔改鍵（skillCdFlat 冷卻 ±秒、afterCastPct、fixedCast），
   再把 rAthena 的詠唱／延遲／冷卻／不可中斷效果併進 ITEMS 與 CARDS（卡片以宿主精煉算）。 */
const ITEM_CAST_BONUS = {
${body}
};
(function applyItemCastBonus() {
  const OLD = /^(skillCdFlat|afterCastPct|fixedCast)/;
  const strip = o => { if (o) for (const k of Object.keys(o)) if (OLD.test(k)) delete o[k]; };
  const clean = d => {
    if (!d) return;
    strip(d.bonus); strip(d.perRefine); strip(d);
    (d.condBonus || []).forEach(c => strip(c.bonus));
  };
  Object.values(ITEMS).forEach(clean);
  Object.values(CARDS).forEach(clean);
  for (const [id, rec] of Object.entries(ITEM_CAST_BONUS)) {
    for (const d of [CARDS[id] || ITEMS[id]]) {
      if (!d) continue;
      for (const [k, v] of Object.entries(rec)) {
        if (k === 'condBonus') d.condBonus = (d.condBonus || []).concat(v);
        else d[k] = Object.assign(d[k] || {}, v);
      }
    }
  }
})();
`);
  console.log('寫入 ' + path.relative(ROOT, OUT));
}
