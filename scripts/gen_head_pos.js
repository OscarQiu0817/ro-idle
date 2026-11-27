/* 頭飾位置補表（使用者 2026-11-28）：說明沒寫「頭上／頭中／頭下」的頭飾（寫「上方」「中段」或沒寫），
   穿戴判斷一律當頭上、部位轉蛋也抓不到。改照 rAthena item_db_equip.yml 的 Locations（以 imgId 對官方 Id）。
   只輸出說明判斷不出來的那些。用法：node scripts/gen_head_pos.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const yml = fs.readFileSync(path.join(ROOT, 'grf_ex', 'item_db_equip.yml'), 'utf8');
const loc = {};
for (const block of yml.split(/\n  - Id: /).slice(1)) {
  const id = parseInt(block, 10);
  const m = block.match(/\n    Locations:\n((?:      .*\n)+)/);
  if (!m) continue;
  let s = '';
  if (/Head_Top: true/.test(m[1])) s += 't';
  if (/Head_Mid: true/.test(m[1])) s += 'm';
  if (/Head_Low: true/.test(m[1])) s += 'b';
  if (s) loc[id] = s;
}

const ctx = require(path.join(ROOT, 'tools', 'harness')).boot();   // 跟遊戲同一份 ITEMS（刪減、台服說明都套過）
const out = {};
const miss = [];
Object.values(ctx.ITEMS).forEach(d => {
  if (d.type !== 'armor' || d.armorType !== 'headgear') return;
  if (/頭上|頭中|頭下/.test(d.desc || '')) return;
  const s = loc[d.imgId];
  if (s) out[d.id] = s; else miss.push(`${d.id} ${d.name}`);
});
const body = Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: '${v}',`).join('\n');
fs.writeFileSync(path.join(ROOT, 'js', 'head_pos.js'),
  '/* 自動產生（scripts/gen_head_pos.js）：說明沒寫頭上／頭中／頭下的頭飾，照 rAthena Locations 補。t＝頭上 m＝頭中 b＝頭下 */\n'
  + 'const HEAD_POS = {\n' + body + '\n};\n');
console.log(`輸出 ${Object.keys(out).length} 件 → js/head_pos.js；官方查不到 ${miss.length} 件${miss.length ? '：' + miss.join('、') : ''}`);
