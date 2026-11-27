/* 神器材料來源（使用者 2026-11-28）：貓腳步聲音、女人的鬍鬚…這 20 種官方只有攻城寶箱怪會掉，
   本作沒放那些怪，原本拿不到。改成：
     攻城寶箱：每天 22:00 結算時，自己的城各開 1／2／3 箱（照城的順序），每箱 GODLY_CHEST_RATE 出 1 個
     打王：MVP GODLY_MVP_RATE、迷你王 GODLY_MINI_RATE 掉 1 個；離線照期望值
   出哪一種照官方寶箱怪的掉率加權（0.1%／0.15%／0.2% → 權重 2／3／4）。不吃掉寶倍率。
   這個檔案在 cash_shop.js 之後載入。 */
const GODLY_CHEST_RATE = 0.3;
const GODLY_MVP_RATE = 0.01;
const GODLY_MINI_RATE = 0.002;
const GODLY_CHESTS = { castle_1: 1, castle_2: 2, castle_3: 3 };
const GODLY_MATS = [
  ['foot_step_of_cat', 2], ['beard_of_women', 2], ['root_of_stone', 2], ['soul_of_fish', 4],
  ['saliva_of_bird', 3], ['tendon_of_bear', 3], ['symbol_of_sun', 3], ['breath_of_soul', 4],
  ['jewel_of_prayer', 2], ['iron_glove', 4], ['iron_maiden', 3], ['mystery_wheel', 4],
  ['silver_fancy', 3], ['anger_of_valkurye', 2], ['feather_of_angel', 2], ['crystal_of_snow', 3],
  ['indication_of_tempest', 2], ['slilince_wave', 4], ['rough_billows', 2], ['air_stream', 4],
].filter(([id]) => ITEMS[id]);
const GODLY_TOTAL_W = GODLY_MATS.reduce((t, [, w]) => t + w, 0);

function isGodlyMat(id) { return GODLY_MATS.some(([k]) => k === id); }
function pickGodlyMat() {
  let r = rng() * GODLY_TOTAL_W;
  for (const [id, w] of GODLY_MATS) { if ((r -= w) < 0) return id; }
  return GODLY_MATS[GODLY_MATS.length - 1][0];
}
function giveGodlyMat(n, why) {
  const got = {};
  for (let i = 0; i < n; i++) { const id = pickGodlyMat(); got[id] = (got[id] || 0) + 1; }
  Object.entries(got).forEach(([id, q]) => addItem(id, q));
  const names = Object.entries(got).map(([id, q]) => `${ITEMS[id].name}${q > 1 ? ' ×' + q : ''}`);
  if (names.length) logMsg(`✨ ${why}：獲得神器材料 ${names.join('、')}！`, 'loot');
  return got;
}
// 每隻怪掉神器材料的機率
function godlyMatRate(def) {
  if (!def || def.isVirtual || def.dojo || !def.isBoss) return 0;
  return def.isMvp ? GODLY_MVP_RATE : GODLY_MINI_RATE;
}
// 線上擊殺（killMonster 尾端）
function rollGodlyMat(def) {
  const r = godlyMatRate(def);
  if (r > 0 && rng() < r) giveGodlyMat(1, `${def.name} 掉落`);
}
// 離線：lootBossList = [{ id, kills }]（kills 可以是小數）→ 每種材料的期望數量，交給離線掉落彙總（addExp2）
function offlineGodlyMatShare(bossList) {
  const e = (bossList || []).reduce((t, b) => t + godlyMatRate(MONSTERS[b.id]) * (b.kills || 0), 0);
  return e > 0 ? GODLY_MATS.map(([id, w]) => [id, e * w / GODLY_TOTAL_W]) : [];
}
// 攻城結算：自己的城開寶箱
function openCastleChests(castleDef) {
  const chests = GODLY_CHESTS[castleDef.id] || 0;
  let n = 0;
  for (let i = 0; i < chests; i++) if (rng() < GODLY_CHEST_RATE) n++;
  if (n > 0) giveGodlyMat(n, `${castleDef.name}寶箱`);
  else if (chests) logMsg(`🏰 ${castleDef.name}寶箱開了 ${chests} 箱，這次沒有神器材料。`);
  return n;
}
// 道具說明補上取得方式（原本只寫「收集品」，看不出去哪拿）
GODLY_MATS.forEach(([id]) => {
  const d = ITEMS[id];
  if (!/取得：攻城寶箱/.test(d.desc || '')) d.desc = (d.desc || '') + ' 取得：攻城寶箱（城主每天結算）、MVP／迷你王小機率掉落。';
});
