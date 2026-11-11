/* 道具效果層 5b：套裝（docs/GAMEPLAY_DIRECTION.md 工作 5）
   node scripts/gen_equip_sets.js           → 只印報告
   node scripts/gen_equip_sets.js --write   → 寫 js/equip_sets.js

   來源：rAthena item_combos.yml。每一組的成員全部在本作才收；同一組的多個寫法
   （Dragon_Slayer / Dragon_Slayer_）依位置合併成「任一件都算」。
   效果走 scripts/lib/item_script.js；套裝沒有單一宿主，含精煉的條件整條略過。
   成員可以是裝備或卡片（engine 的套裝判定兩邊都看）。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { readYamlBody, loadItemDb } = require('./lib/rathena');
const { parseScript, convert } = require('./lib/item_script');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'js', 'equip_sets.js');

const cardSetKey = (cid, withCards) => [cid, ...withCards.slice().sort()].join('+');
/* 把 v 的成員排成跟 ref 同一順序：同一道具優先，其次裝備部位相同（全排列找最高分，套裝成員最多 6 件左右） */
function alignTo(ref, v, ITEMS) {
  const slotOf = id => { const it = ITEMS[id] || {}; return (it.type || '') + '/' + (it.armorType || it.weaponType || ''); };
  const score = perm => perm.reduce((s, id, i) => s + (id === ref[i] ? 2 : slotOf(id) === slotOf(ref[i]) ? 1 : 0), 0);
  let best = v, bestS = score(v);
  const permute = (rest, acc) => {
    if (!rest.length) { const s = score(acc); if (s > bestS) { best = acc; bestS = s; } return; }
    rest.forEach((x, i) => permute(rest.slice(0, i).concat(rest.slice(i + 1)), acc.concat([x])));
  };
  if (v.length <= 6) permute(v, []);
  return best;
}

function build() {
  const { ITEMS, CARDS, SKILLS, EQUIP_SETS } = loadGameData('js/item_prune.js');   // 套裝名稱要用台服名稱、刪掉的道具不收
  const db = loadItemDb();
  const byAegis = new Map();
  db.forEach(it => byAegis.set(String(it.AegisName).toLowerCase(), it));
  const byImg = new Map();
  Object.values(ITEMS).forEach(it => { if (it.imgId && !byImg.has(it.imgId)) byImg.set(it.imgId, it.id); });
  const gid = a => {
    const k = String(a).toLowerCase();
    if (ITEMS[k]) return k;
    const ra = byAegis.get(k);
    return ra ? byImg.get(ra.Id) || null : null;
  };
  const sets = {};
  const skipped = [];
  const noBonus = [];
  const used = new Set();
  for (const e of readYamlBody(path.join('grf_ex', 'item_combos.yml'))) {
    const variants = (e.Combos || []).map(c => c.Combo.map(gid)).filter(v => v.every(Boolean));
    if (!variants.length) continue;
    // 依位置合併：成員數相同的寫法，同一位置的不同道具視為「任一件都算」
    // 先把每種寫法依「裝備部位」對齊第一種的順序：rAthena 有的寫法成員順序顛倒（腳鍊＋血跡鐵球那組第 4 種是鐵球在前），
    // 不對齊的話腳鍊會被當成鐵球那格的替代品，單穿腳鍊就成套（使用者 2026-11-10）
    const len = variants[0].length;
    const same = variants.filter(v => v.length === len).map(v => alignTo(variants[0], v, ITEMS));
    const items = [];
    for (let i = 0; i < len; i++) {
      const alts = [...new Set(same.map(v => v[i]))];
      items.push(alts.length === 1 ? alts[0] : alts);
    }
    const { rec, skipped: sk } = convert(parseScript(e.Script), { skills: SKILLS, refine: false });
    const first = items.map(m => Array.isArray(m) ? m[0] : m);
    const name = first.map(id => (ITEMS[id] && ITEMS[id].name || id).replace(/\s*\[\d+\]$/, '')).join('＋');
    sk.forEach(x => skipped.push(name + ': ' + x));
    if (!rec.bonus) { noBonus.push(name); continue; }
    let id = 'ra_' + first.join('__');
    while (used.has(id)) id += '_';
    used.add(id);
    const set = { name, items, bonus: rec.bonus };
    if (rec.condBonus) set.condBonus = rec.condBonus;
    if (first.every(i => CARDS[i])) set.cards = true;
    sets[id] = set;
  }
  // 手寫套裝：同樣成員已由 rAthena 產生的就換掉，沒有對應的（台服獨有、rAthena 寫法轉不了）保留
  const flat = m => Array.isArray(m) ? m : [m];
  const gen = Object.values(sets).map(st => st.items.map(flat));
  const covers = members => gen.some(r => r.length === members.length
    && members.every(h => r.some(x => x.some(i => h.includes(i)))));
  const dropSets = Object.keys(EQUIP_SETS).filter(id => covers(EQUIP_SETS[id].items.map(flat)));
  const dropCardSets = [];
  for (const [cid, c] of Object.entries(CARDS)) {
    (c.condBonus || []).forEach(cb => {
      const w = cb.when || {};
      // 只看「跟哪幾張卡一起插」的條件；另有精煉、職業等條件的不算同一組
      if (!w.withCards || Object.keys(w).length > 1) return;
      if (covers([cid, ...w.withCards].map(x => [x]))) dropCardSets.push(cardSetKey(cid, w.withCards));
    });
  }
  return { sets, skipped, noBonus, dropSets, dropCardSets, keepSets: Object.keys(EQUIP_SETS).length - dropSets.length };
}

const { sets, skipped, noBonus, dropSets, dropCardSets, keepSets } = build();
const n = Object.keys(sets).length;
console.log(`套裝 ${n} 組（其中全卡片 ${Object.values(sets).filter(s => s.cards).length} 組）`);
console.log(`效果全部轉不了、不收 ${noBonus.length} 組；個別略過 ${skipped.length} 條`);
console.log(`手寫套裝換掉 ${dropSets.length} 組、保留 ${keepSets} 組；手寫套卡換掉 ${dropCardSets.length} 組`);
const kinds = {};
skipped.forEach(s => { const m = s.match(/: (?:bonus\d?\s+)?(\w+)/); if (m) kinds[m[1]] = (kinds[m[1]] || 0) + 1; });
console.log('略過種類：' + Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 25).map(x => x.join(' ')).join('、'));
if (process.argv.includes('--all')) skipped.forEach(s => console.log('  ' + s));
if (WRITE) {
  const body = Object.keys(sets).sort().map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(sets[id])},`).join('\n');
  fs.writeFileSync(OUT, `/* 由 scripts/gen_equip_sets.js --write 產生，勿手改。
   在 data.js 之後載入：rAthena item_combos 併進 EQUIP_SETS；同樣成員的手寫套裝與卡片 condBonus 套卡（setName）移除，
   rAthena 沒有對應的手寫套裝保留。 */
const RA_EQUIP_SETS = {
${body}
};
(function applyRaEquipSets() {
  const DROP = ${JSON.stringify(dropSets)};
  const DROP_CARD = new Set(${JSON.stringify([...new Set(dropCardSets)])});
  DROP.forEach(k => { delete EQUIP_SETS[k]; });
  Object.assign(EQUIP_SETS, RA_EQUIP_SETS);
  const key = (cid, w) => [cid, ...w.slice().sort()].join('+');
  for (const [cid, c] of Object.entries(CARDS)) {
    if (c.condBonus) c.condBonus = c.condBonus.filter(cb => {
      const w = cb.when || {};
      return !(w.withCards && Object.keys(w).length === 1 && DROP_CARD.has(key(cid, w.withCards)));
    });
  }
})();
`);
  console.log('寫入 ' + path.relative(ROOT, OUT));
}
