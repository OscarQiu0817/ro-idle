/* 怪物變身（官方 NPC_METAMORPHOSIS，使用者 2026-11-14：比照正服，貝雷傑血掉到一半變詛咒蠅王）
   node scripts/gen_mob_metamorph.js           → 印報告
   node scripts/gen_mob_metamorph.js --write   → 寫 js/mob_metamorph.js
   只取「血量低於 N%」條件（myhpltmaxrate）；always 類（蟲蛹孵化之類的機率變身）不做。
   官方編號 → AegisName 小寫 ＝ 本作怪物 id；兩邊都有才收。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { readYamlBody } = require('./lib/rathena');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'js', 'mob_metamorph.js');
const { MONSTERS } = loadGameData();
const aegis = {};
readYamlBody('grf_ex/mob_db.yml').forEach(m => { aegis[m.Id] = String(m.AegisName).toLowerCase(); });
const out = {}, skipped = [];
fs.readFileSync(path.join(ROOT, 'grf_ex', 'mob_skill_db.txt'), 'utf8').split(/\r?\n/).forEach(line => {
  if (line.startsWith('//')) return;
  const c = line.split(',');
  if (!c[1] || !/@NPC_METAMORPHOSIS$/.test(c[1]) || c[10] !== 'myhpltmaxrate') return;
  const src = aegis[c[0]], into = aegis[c[12]];
  if (!src || !into || !MONSTERS[src] || !MONSTERS[into]) { skipped.push(c[0] + '→' + c[12]); return; }
  out[src] = { hpPct: +c[11], into, rate: Math.min(1, (+c[5] || 10000) / 10000) };
});
console.log('收錄', Object.keys(out).length, JSON.stringify(out));
console.log('略過（本作沒有那隻）', skipped.join(' '));
if (WRITE) {
  fs.writeFileSync(OUT, '/* 由 scripts/gen_mob_metamorph.js 產生，勿手改。怪物血量跌破 hpPct% 時依 rate 擲一次，成功就變身成 into（官方 NPC_METAMORPHOSIS）。每隻只變一次。\n'
    + '   這個檔案在 mob_move.js 之後載入。 */\nconst MOB_METAMORPH = ' + JSON.stringify(out, null, 0) + ';\n');
  console.log('寫入', OUT);
}
