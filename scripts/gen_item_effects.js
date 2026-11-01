/* 道具效果層 5d：裝備與卡片效果改以 rAthena 為準（docs/GAMEPLAY_DIRECTION.md 工作 5）
   node scripts/gen_item_effects.js           → 只印報告
   node scripts/gen_item_effects.js --write   → 寫 js/item_effects.js（取代 5a 的 item_cast_bonus.js）
   node scripts/gen_item_effects.js --diff ID → 印單一道具改前／改後

   每件對得到 rAthena 的裝備與卡片：
     · 轉換程式負責的鍵（scripts/lib/item_script.js ownKey）→ 手寫的整個移除，改填 rAthena 轉出的值
       （原作者自加的數值，例如劍魚卡的 MATK +5%，因此消失）
     · 但某一類 rAthena 有轉不了的條目（職業條件、素質條件…）→ 那一類保留手寫，不填 rAthena，避免重複或遺失
     · 本體數值照 item_db：武器 ATK／MATK、防具 DEF
     · 轉換程式不負責的（自動念咒、異常、擊殺掉落、perStat_ 等特殊鍵）原樣保留
   轉不了的條目寫進 docs/ITEM_EFFECT_GAPS.md。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemDb } = require('./lib/rathena');
const { parseScript, convert, ownKey, familyOf } = require('./lib/item_script');

const WRITE = process.argv.includes('--write');
const DIFF = process.argv.includes('--diff') ? process.argv[process.argv.indexOf('--diff') + 1] : null;
const OUT = path.join(ROOT, 'js', 'item_effects.js');
const GAPS = path.join(ROOT, 'docs', 'ITEM_EFFECT_GAPS.md');
// 裝在加成表裡、依精煉倍增的結構（engine effectiveGearBonuses）
const STRUCT = ['bonus', 'perRefine', 'per2Refine', 'per2RefineExtra', 'per3Refine', 'per4Refine', 'per5Refine',
  'perRefineSquare', 'perRefineSquareMatk', 'perRefineSquareMatkHalf'];
// 頂層的平鋪數值（equippedStatBonus 讀）：本體以外都是腳本效果
const TOP = ['str', 'agi', 'vit', 'int', 'dex', 'luk', 'hp', 'sp', 'mdef', 'hit', 'flee', 'critRate', 'crit',
  'perfectDodge', 'hpPct', 'spPct', 'aspdPct', 'aspd', 'atk', 'matk', 'def'];

// 已廢除的魔改鍵（D2）：一律丟掉
const RETIRED = /^(skillCdFlat|afterCastPct|fixedCast)|_(skillCdFlat|afterCastPct)$/;
function build() {
  const { ITEMS, CARDS, SKILLS } = loadGameData();
  const db = loadItemDb();
  const byAegis = new Map();
  db.forEach(it => byAegis.set(String(it.AegisName).toLowerCase(), it));
  const out = {};
  const gaps = [];
  const stat = { items: 0, cards: 0, changed: 0, keptFam: 0, removedHand: 0 };
  for (const it of Object.values(ITEMS)) {
    const card = CARDS[it.id];
    const gear = it.type === 'weapon' || it.type === 'armor';
    if (!card && !gear) continue;
    const ra = byAegis.get(String(it.id).toLowerCase()) || (it.imgId && db.get(it.imgId));
    if (!ra) continue;
    card ? stat.cards++ : stat.items++;
    const d = card || it;
    const { rec, skipped, skippedFam } = convert(parseScript(ra.Script), { skills: SKILLS, perStyle: card ? 'card' : 'item' });
    if (skipped.length) gaps.push({ id: it.id, name: it.name, lines: skipped });
    const keep = k => skippedFam.has(familyOf(k));
    const patch = {};
    // 結構內：負責的鍵移除（該類有轉不了的除外），其餘原樣
    for (const s of STRUCT) {
      if (!d[s]) continue;
      const kept = {};
      for (const [k, v] of Object.entries(d[s])) {
        if (RETIRED.test(k)) continue;
        if (!ownKey(k) || keep(k)) kept[k] = v; else stat.removedHand++;
      }
      patch[s] = Object.keys(kept).length ? kept : null;
    }
    const cond = (d.condBonus || []).map(cb => {
      const b = {};
      for (const [k, v] of Object.entries(cb.bonus || {})) if (!RETIRED.test(k) && (!ownKey(k) || keep(k))) b[k] = v;
      return Object.keys(b).length ? { ...cb, bonus: b } : null;
    }).filter(Boolean);
    // rAthena 轉出的，略過保留手寫的那幾類
    const add = {};
    for (const [k, v] of Object.entries(rec.bonus || {})) if (!keep(k)) add[k] = v;
    if (Object.keys(add).length) patch.bonus = Object.assign(patch.bonus || {}, add);
    for (const sk of STRUCT.filter(x => x !== 'bonus' && rec[x])) {
      const a2 = {};
      for (const [k, v] of Object.entries(rec[sk])) if (!keep(k)) a2[k] = v;
      if (Object.keys(a2).length) patch[sk] = Object.assign(patch[sk] || {}, a2);
    }
    (rec.condBonus || []).forEach(cb => {
      const b = {};
      for (const [k, v] of Object.entries(cb.bonus)) if (!keep(k)) b[k] = v;
      if (Object.keys(b).length) cond.push({ when: cb.when, bonus: b });
    });
    patch.condBonus = cond.length ? cond : null;
    // 頂層：本體照 item_db，其他腳本效果的平鋪值移除（已在 bonus）
    if (!card) {
      const weapon = it.type === 'weapon';
      for (const k of TOP) {
        if (weapon && k === 'atk') patch.atk = ra.Attack || null;
        else if (weapon && k === 'matk') patch.matk = ra.MagicAttack || null;
        else if (!weapon && k === 'def') patch.def = ra.Defense || null;
        else if (d[k] != null && !keep(k)) patch[k] = null;
      }
    }
    for (const k of Object.keys(d)) if (RETIRED.test(k)) patch[k] = null;
    // 沒變的欄位不寫
    for (const k of Object.keys(patch)) {
      if (JSON.stringify(patch[k] == null ? undefined : patch[k]) === JSON.stringify(d[k])) delete patch[k];
    }
    if (Object.keys(patch).length) { out[it.id] = patch; stat.changed++; }
    if (DIFF === it.id) {
      const before = {}; [...STRUCT, 'condBonus', ...TOP].forEach(k => { if (d[k] != null) before[k] = d[k]; });
      console.log('rAthena:\n' + ra.Script + '\n改前：' + JSON.stringify(before) + '\npatch：' + JSON.stringify(patch));
    }
    if (skippedFam.size) stat.keptFam++;
  }
  return { out, gaps, stat };
}

const { out, gaps, stat } = build();
console.log(`對得到 rAthena：裝備 ${stat.items}、卡片 ${stat.cards}；有變動 ${stat.changed} 件；移除手寫數值 ${stat.removedHand} 筆`);
console.log(`有轉不了的條目（那幾類保留手寫）${stat.keptFam} 件，共 ${gaps.reduce((n, g) => n + g.lines.length, 0)} 條`);
const kinds = {};
gaps.forEach(g => g.lines.forEach(l => { const m = l.match(/^(?:bonus\d?\s+)?(\w+)/); if (m) kinds[m[1]] = (kinds[m[1]] || 0) + 1; }));
console.log('轉不了的種類：' + Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 30).map(x => x.join(' ')).join('、'));
if (WRITE) {
  const body = Object.keys(out).sort().map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(out[id])},`).join('\n');
  fs.writeFileSync(OUT, `/* 由 scripts/gen_item_effects.js --write 產生，勿手改。
   在 data.js 之後載入：裝備與卡片的效果改以 rAthena 為準。值為 null＝刪除該欄位。
   卡片寫進 CARDS，裝備寫進 ITEMS。舊的魔改鍵（skillCdFlat 冷卻 ±秒、afterCastPct、fixedCast）一併清除。 */
const ITEM_EFFECTS = {
${body}
};
(function applyItemEffects() {
  const OLD = /^(skillCdFlat|afterCastPct|fixedCast)/;
  const strip = o => { if (o) for (const k of Object.keys(o)) if (OLD.test(k)) delete o[k]; };
  const clean = d => {
    if (!d) return;
    Object.keys(d).forEach(k => { if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) strip(d[k]); });
    strip(d);
    (d.condBonus || []).forEach(c => strip(c.bonus));
  };
  Object.values(ITEMS).forEach(clean);
  Object.values(CARDS).forEach(clean);
  for (const [id, p] of Object.entries(ITEM_EFFECTS)) {
    const d = CARDS[id] || ITEMS[id];
    if (!d) continue;
    for (const [k, v] of Object.entries(p)) { if (v == null) delete d[k]; else d[k] = v; }
  }
})();
`);
  const md = ['# 道具效果轉換缺口', '', '> 由 `node scripts/gen_item_effects.js --write` 產生。這些 rAthena 條目轉不成本作的加成鍵；',
    '> 同一類的手寫數值因此保留（可能是對的、也可能是原作者的近似）。', '',
    `共 ${gaps.length} 件、${gaps.reduce((n, g) => n + g.lines.length, 0)} 條。`, '',
    '| 種類 | 條數 |', '|---|---|', ...Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `| ${k} | ${n} |`), '',
    '## 逐件', ''];
  gaps.sort((a, b) => a.id.localeCompare(b.id)).forEach(g => {
    md.push(`- **${g.name}** \`${g.id}\``);
    g.lines.forEach(l => md.push('  - `' + l.replace(/`/g, "'").replace(/\s+/g, ' ') + '`'));
  });
  fs.writeFileSync(GAPS, md.join('\n') + '\n');
  console.log('寫入 ' + path.relative(ROOT, OUT) + '、' + path.relative(ROOT, GAPS));
}
