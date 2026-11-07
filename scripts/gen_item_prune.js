/* 刪除台服沒有、名稱只有英文的道具（T3／T15，D6 的一部分）
   node scripts/gen_item_prune.js           → 只印報告
   node scripts/gen_item_prune.js --write   → 寫 js/item_prune.js

   條件一：名稱純英文、且台服 itemInfo 查不到（以 imgId 對）。這批全部不會掉落，
   少數被套裝或條件加成引用的，那些套裝／條件一併移除（成員拿不到，永遠湊不齊）。
   條件二（T15）：要求等級 >99 或只有範圍外職業能裝。有些會掉落，掉落表由 engine 清掉。
   js/item_prune.js 在 item_identity.js 之後、item_effects.js 之前載入。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemInfo } = require('./lib/rathena');

const OUT = path.join(ROOT, 'js', 'item_prune.js');
const { ITEMS } = loadGameData('js/item_identity.js');
const info = loadItemInfo();
const isEn = s => /^[\x20-\x7e]+$/.test(s || '') && /[a-z]{3}/.test(s || '');
const enDel = Object.values(ITEMS).filter(it => isEn(it.name) && !info.has(it.imgId)).map(it => it.id);
/* T15（D6 範圍外）：要求等級超過 99（v2 等級上限，三轉以後才用得到），
   或可裝備職業全在範圍外（槍手、忍者、三四轉專用：reqJobs 是空陣列） */
const scopeDel = Object.values(ITEMS).filter(it => !enDel.includes(it.id)
  && (it.reqLevel > 99 || (Array.isArray(it.reqJobs) && !it.reqJobs.length))).map(it => it.id);
console.log(`英文名 ${enDel.length} 件、範圍外 ${scopeDel.length} 件`);
const del = enDel.concat(scopeDel).sort();
const types = {};
del.forEach(id => { types[ITEMS[id].type] = (types[ITEMS[id].type] || 0) + 1; });
console.log(`刪除 ${del.length} 件：` + Object.entries(types).map(x => x.join(' ')).join('、'));
if (process.argv.includes('--write')) {
  fs.writeFileSync(OUT, `/* 由 scripts/gen_item_prune.js --write 產生，勿手改。
   台服沒有、名稱只有英文的道具（拿不到），以及範圍外裝備（要求等級 >99、只有範圍外職業能裝；T15）。
   連同引用它們的手寫套裝與條件加成一起移除；怪物掉落在 engine applyOfficialMobExp 之後清。 */
const ITEM_PRUNE = ${JSON.stringify(del)};
(function applyItemPrune() {
  const gone = new Set(ITEM_PRUNE);
  gone.forEach(id => { delete ITEMS[id]; if (typeof CARDS !== 'undefined') delete CARDS[id]; });
  const flat = m => Array.isArray(m) ? m : [m];
  for (const [k, s] of Object.entries(EQUIP_SETS)) {
    if (!s.items) continue;
    // 成員是「任一件都算」的陣列：拿掉被刪的，整格都空了才算湊不齊
    s.items = s.items.map(m => Array.isArray(m) ? m.filter(i => !gone.has(i)) : m);
    if (s.items.some(m => gone.has(m) || (Array.isArray(m) && !m.length))) delete EQUIP_SETS[k];
  }
  const refs = w => w && [].concat(w.withItems || [], w.withAnyItem || []).some(i => gone.has(i));
  [...Object.values(ITEMS), ...(typeof CARDS !== 'undefined' ? Object.values(CARDS) : [])].forEach(d => {
    if (d.condBonus) d.condBonus = d.condBonus.filter(cb => !(cb.when && cb.when.withItems && cb.when.withItems.some(i => gone.has(i))));
    ['autoSpell', 'ailment', 'onAttackBuff', 'killDrop'].forEach(f => { if (d[f]) d[f] = d[f].filter(e => !refs(e.when)); });
  });
})();
`);
  console.log('寫入 ' + path.relative(ROOT, OUT));
}
