/* 從 rAthena skill_db.yml 抽每招打幾下（HitCount 的絕對值），輸出 js/skill_hits_data.js。
   只拿來拆傷害飄字（音速投擲 8 段＋黃字總和），實際傷害照本作公式算。
   用法：node scripts/gen_skill_hits.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'grf_ex', 'skill_db.yml'), 'utf8');
const out = {};
for (const block of src.split(/\n  - Id: /).slice(1)) {
  const name = (block.match(/\n    Name: (\S+)/) || [])[1];
  if (!name) continue;
  let hits = null;
  const one = block.match(/\n    HitCount: (-?\d+)/);
  if (one) hits = Math.abs(+one[1]);
  else {
    const m = block.match(/\n    HitCount:\n((?:      .*\n)+)/);
    if (m) hits = [...m[1].matchAll(/Count: (-?\d+)/g)].map(x => Math.abs(+x[1]));
  }
  if (hits == null) continue;
  const list = Array.isArray(hits) ? hits : [hits];
  if (!list.some(x => x > 1)) continue;
  out[name.toLowerCase()] = Array.isArray(hits) && new Set(hits).size > 1 ? hits : list[0];
}
const body = Object.entries(out).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n');
fs.writeFileSync(path.join(ROOT, 'js', 'skill_hits_data.js'),
  '/* 自動產生（scripts/gen_skill_hits.js）：rAthena 每招打幾下，數字或每級陣列。只用來拆飄字。 */\n'
  + 'const SKILL_VIS_HITS = {\n' + body + '\n};\n');
console.log(`輸出 ${Object.keys(out).length} 招 → js/skill_hits_data.js`);
