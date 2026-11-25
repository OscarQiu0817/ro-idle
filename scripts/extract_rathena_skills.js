/* rAthena 新版技能檔（src/map/skills/<class>/*.cpp，2026-11-24 抓到 grf_ex/rathena_skills）抽公式：
   倍率（skillratio 那幾行）、RE_LVL_DMOD 基本等級除數、附加狀態（sc_start）、命中段數等，併進 scripts/out/third_skills.json 的 ratio 欄。
   node scripts/extract_rathena_skills.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'grf_ex', 'rathena_skills');
const idToFile = {};
for (const cls of fs.readdirSync(DIR)) {
  const fac = path.join(DIR, cls, `skill_factory_${cls}.cpp`);
  if (!fs.existsSync(fac)) continue;
  const src = fs.readFileSync(fac, 'utf8');
  // case XX_FOO: return std::make_unique<SkillFoo>();   … 對到 foo.cpp
  const re = /case (\w+):\s*\n?\s*return std::make_unique<Skill(\w+)>/g;
  let m;
  while ((m = re.exec(src))) {
    const f = path.join(DIR, cls, m[2].toLowerCase() + '.cpp');
    if (fs.existsSync(f)) idToFile[m[1]] = f;
  }
}
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/out/third_skills.json'), 'utf8'));
let hit = 0, miss = [];
for (const list of Object.values(data)) for (const s of list) {
  const f = idToFile[s.id];
  if (!f) { miss.push(s.id); continue; }
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n').map(l => l.trim()).filter(l => /skillratio|RE_LVL_DMOD|sc_start|status_heal|heal|SC_|hit|damage|matk|atk/i.test(l) && !/^\/\/|#include|^void |^Skill/.test(l));
  s.ratio = { file: path.relative(ROOT, f), lvMod: (src.match(/RE_LVL_DMOD\((\d+)\)/) || [])[1] || null, lines: lines.slice(0, 18) };
  hit++;
}
fs.writeFileSync(path.join(ROOT, 'scripts/out/third_skills.json'), JSON.stringify(data, null, 1));
console.log('對到檔案', hit, '沒對到', miss.join(' '));
