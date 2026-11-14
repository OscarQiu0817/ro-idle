/* T30 箱子池比照官方（使用者 2026-11-14）
   node scripts/gen_box_pools.js           → 印報告
   node scripts/gen_box_pools.js --write   → 寫 js/box_pools.js

   神秘箱子、神秘紫箱、禮物箱照 rAthena item_group_db 的 BLUEBOX／VIOLETBOX／GIFTBOX，
   以官方編號（imgId）對到本作道具，權重照官方 Rate；本作沒有的道具略過。
   改官方池後失去來源的道具不另給來源（附魔類改由附魔轉蛋取得）。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemDb, readYamlBody } = require('./lib/rathena');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'js', 'box_pools.js');
const MAP = { BLUEBOX: 'any', VIOLETBOX: 'violet', GIFTBOX: 'valuable' };

const { ITEMS } = loadGameData();
const db = loadItemDb();
const aegis = new Map();
db.forEach(it => aegis.set(String(it.AegisName).toLowerCase(), it.Id));
const byImg = {};
Object.values(ITEMS).forEach(x => { if (x.imgId && !byImg[x.imgId]) byImg[x.imgId] = x.id; });
const groups = readYamlBody('grf_ex/item_group_db.yml');
const out = {};
for (const [grp, kind] of Object.entries(MAP)) {
  const g = groups.find(x => x.Group === grp);
  const w = {};
  let miss = 0, total = 0;
  for (const sg of g.SubGroups || []) for (const it of sg.List || []) {
    total++;
    const k = byImg[aegis.get(String(it.Item).toLowerCase())];
    if (!k) { miss++; continue; }
    w[k] = (w[k] || 0) + (it.Rate || 1);
  }
  out[kind] = w;
  console.log(`${grp} → ${kind}：官方 ${total} 筆，對到 ${Object.keys(w).length} 件，略過 ${miss}`);
}
if (WRITE) {
  fs.writeFileSync(OUT, `/* 由 scripts/gen_box_pools.js --write 產生，勿手改。
   T30（使用者 2026-11-14）：神秘箱子／神秘紫箱／禮物箱照 rAthena BLUEBOX／VIOLETBOX／GIFTBOX；值＝官方權重。
   engine BOX_POOLS 的 any／violet／valuable 讀這裡。 */
const OFFICIAL_BOX_POOLS = ${JSON.stringify(out)};
`);
  console.log('已寫入 ' + path.relative(ROOT, OUT));
}
