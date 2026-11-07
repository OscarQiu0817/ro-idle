/* 道具買賣價改成官方值
   node scripts/gen_item_prices.js   → 直接改寫 js/data.js 的 ITEMS 區段
   來源：rAthena item_db（grf_ex/item_db_equip／etc／usable.yml），以 imgId 對官方 Id。

   官方規則：沒寫 Sell ＝ Buy/2（無條件捨去）；沒寫 Buy ＝ Sell×2。
   - sell 一律照官方
   - buyPrice 只改原本就有的（towns.js 用 buyPrice>0 決定商店賣不賣，不新增）
   - 官方買賣都是 0（商城／活動道具）維持原值，不然一律變成賣 0 元 */
const fs = require('fs');
const path = require('path');
const { loadItemDb } = require('./lib/rathena');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'data.js');

const db = loadItemDb();
const lines = fs.readFileSync(FILE, 'utf8').split('\n');
const start = lines.findIndex(l => l.startsWith('const ITEMS = {'));
let end = start + 1;
while (!lines[end].startsWith('};')) end++;

let changed = 0, noDb = 0;
for (let i = start + 1; i < end; i++) {
  const l = lines[i];
  const m = l.match(/"imgId": ?(\d+)/);   // 有些行是 "key": value 帶空白的寫法
  if (!m || !/"sell": ?\d+/.test(l)) continue;
  const r = db.get(Number(m[1]));
  if (!r) { noDb++; continue; }
  const buy = r.Buy != null ? r.Buy : (r.Sell || 0) * 2;
  const sell = r.Sell != null ? r.Sell : Math.floor(buy / 2);
  if (!buy && !sell) continue;
  const n = l.replace(/("sell": ?)\d+/, `$1${sell}`).replace(/("buyPrice": ?)\d+/, `$1${buy}`);
  if (n !== l) { lines[i] = n; changed++; }
}
fs.writeFileSync(FILE, lines.join('\n'));
console.log(`改價 ${changed} 筆；官方表查無 ${noDb} 筆（維持原值）`);
