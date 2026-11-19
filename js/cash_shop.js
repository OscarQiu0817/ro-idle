/* 商城點數＋點數商城（T10／T19，使用者 2026-11-07）
   來源：主線每步、每日簽到。用途：上方「商城」按鈕買加倍道具、卡冊、轉蛋、鐵匠的祝福。
   點數跟角色走（存在 state.cashPoints），跟鋅幣一樣。
   只上架效果有實作的道具（經驗書／掉寶糖讀 EXP_DROP_CANDY、卡冊與箱子讀 boxOpen、祝福在精煉用）。 */

const CASH_POINT_NAME = '商城點數';

const CASH_SHOP = [
  { cat: '經驗加倍', items: [['battle_manual', 10], ['job_manual50', 10], ['battle_manual100', 30], ['battle_manual_x3', 50]] },
  { cat: '掉寶加倍', items: [['bubble_gum', 10], ['comp_battle_bubble', 18]] },
  // 封印王卡卡冊：必出一張封印 MVP 卡（41 張，engine SEALED_CARD_RATES）
  { cat: '卡冊', items: [['sealed_card_album', 100], ['old_card_album', 30], ['old_c_album_weapon', 40], ['old_c_album_armor', 40], ['old_c_album_shield', 40],
    ['old_c_album_helm', 40], ['old_c_album_garment', 40], ['old_c_album_shoes', 40], ['old_c_album_acc', 40], ['magic_card_album', 120]] },
  { cat: '轉蛋', items: [['gift_box', 3], ['old_blue_box', 5], ['old_violet_box', 8]] },
  // 鐵匠的祝福 2026-11-14 移到 MVP 點數商店（50 點）
];

/* 每日簽到（使用者 2026-11-07：取代原本匯入的官方簽到表，那份多是本作沒效果的道具）
   每天都給點數＋鋅幣＋一樣實用道具，20 天一輪；第 5、15 天點數加倍，第 10、20 天大獎。
   每天 items[0] 是簽到格子上顯示的圖。 */
const ATTENDANCE_REWARDS = [
  { points: 10, zeny: 3000, items: [['white_potion', 10]] },
  { points: 10, zeny: 3000, items: [['blue_potion', 5]] },
  { points: 10, zeny: 5000, items: [['battle_manual', 1]] },
  { points: 10, zeny: 3000, items: [['white_potion', 10]] },
  { points: 20, zeny: 5000, items: [['bubble_gum', 1]] },
  { points: 10, zeny: 3000, items: [['blue_potion', 5]] },
  { points: 10, zeny: 5000, items: [['oridecon', 1], ['elunium', 1]] },
  { points: 10, zeny: 3000, items: [['white_potion', 10]] },
  { points: 10, zeny: 3000, items: [['blue_potion', 5]] },
  { points: 50, zeny: 10000, items: [['comp_battle_bubble', 1]] },
  { points: 10, zeny: 3000, items: [['white_potion', 10]] },
  { points: 10, zeny: 3000, items: [['blue_potion', 5]] },
  { points: 10, zeny: 5000, items: [['job_manual50', 1]] },
  { points: 10, zeny: 3000, items: [['white_potion', 10]] },
  { points: 20, zeny: 5000, items: [['blacksmith_blessing', 1]] },
  { points: 10, zeny: 3000, items: [['blue_potion', 5]] },
  { points: 10, zeny: 5000, items: [['oridecon', 1], ['elunium', 1]] },
  { points: 10, zeny: 3000, items: [['white_potion', 10]] },
  { points: 10, zeny: 3000, items: [['blue_potion', 5]] },
  { points: 50, zeny: 20000, items: [['old_card_album', 1]] },
];

function cashPoints() { return (state && state.cashPoints) || 0; }
function addCashPoints(n) {
  if (!state || !(n > 0)) return;
  state.cashPoints = cashPoints() + n;
}
function cashShopPrice(itemId) {
  for (const c of CASH_SHOP) for (const [id, p] of c.items) if (id === itemId) return p;
  return 0;
}
function buyCashItem(itemId, qty) {
  const p = cashShopPrice(itemId);
  const def = ITEMS[itemId];
  if (!p || !def) return false;
  const n = Math.min(qty || 1, Math.floor(cashPoints() / p));
  if (n <= 0) { logMsg(`⚠️ ${CASH_POINT_NAME}不足，${def.name} 要 ${p} 點。`); return false; }
  state.cashPoints -= p * n;
  addItem(itemId, n);
  logMsg(`💎 用 ${p * n} ${CASH_POINT_NAME}買了 ${def.name} ×${n}。`);
  saveGame();
  return true;
}
// 發第 idx 天（從 0 起算）的簽到獎勵，回傳文字列
function grantAttendance(idx) {
  const r = ATTENDANCE_REWARDS[idx];
  const got = [];
  if (!r) return got;
  if (r.points) { addCashPoints(r.points); got.push(`${r.points} ${CASH_POINT_NAME}`); }
  if (r.zeny) { state.gold += r.zeny; got.push(`${r.zeny.toLocaleString()} 鋅幣`); }
  (r.items || []).forEach(([id, n]) => { if (ITEMS[id]) { addItem(id, n); got.push(`${ITEMS[id].name} ×${n}`); } });
  return got;
}

/* 各部位裝備轉蛋（使用者 2026-11-13）：很多頭飾等裝備原本只有神秘箱子開得到。
   每顆轉蛋只開「該部位、沒有怪物掉落也沒有 NPC 販賣」的裝備，均勻抽。
   池子用 boxEligible 同一套過濾（中文名、非時裝）。 */
const GEAR_GACHA = [
  // [道具 id, 名稱, 圖, 商城點數, 篩選]
  ['gacha_head_top', '頭上裝備轉蛋', 14800, 20, d => d.armorType === 'headgear' && /頭上/.test(d.desc || '')],
  ['gacha_head_mid', '頭中裝備轉蛋', 12947, 20, d => d.armorType === 'headgear' && !/頭上/.test(d.desc || '') && /頭中/.test(d.desc || '')],
  ['gacha_head_low', '頭下裝備轉蛋', 16228, 20, d => d.armorType === 'headgear' && !/頭上|頭中/.test(d.desc || '') && /頭下/.test(d.desc || '')],
  ['gacha_armor', '鎧甲轉蛋', 23766, 20, d => d.armorType === 'leather'],
  ['gacha_shield', '盾牌轉蛋', 23538, 20, d => d.armorType === 'shield'],
  ['gacha_garment', '披肩轉蛋', 617, 20, d => d.armorType === 'garment'],
  ['gacha_shoes', '鞋子轉蛋', 17347, 20, d => d.armorType === 'footgear'],
  ['gacha_acc', '飾品轉蛋', 644, 20, d => d.armorType === 'accessory'],
  ['gacha_weapon', '武器轉蛋', 12623, 20, d => d.type === 'weapon'],
];
let _gearSourced = null;
/* 打得到、會掉寶的怪：地圖上的怪＋各圖 MVP／迷你王，再加它們叫出來的護衛（! 開頭的不掉寶）與變身後的樣子。
   2026-11-16：以前算全部怪物，只有地圖外的怪（惡精靈礦石、道館才有的伊夫利特）會掉的四大屬性魔劍、火焰國王戒指因此沒進轉蛋 */
function reachableLootMonsters() {
  const ids = new Set();
  MAPS.forEach(mp => (mp.monsters || []).forEach(x => ids.add(x.id || x)));
  if (typeof MVP_MAP_DATA !== 'undefined') Object.values(MVP_MAP_DATA).forEach(l => l.forEach(id => ids.add(id)));
  for (let grew = true; grew;) {
    grew = false;
    const add = id => { if (MONSTERS[id] && !ids.has(id)) { ids.add(id); grew = true; } };
    [...ids].forEach(id => {
      const sl = typeof BOSS_SLAVES !== 'undefined' && BOSS_SLAVES[id];
      if (sl) [sl.spawn, ...(sl.recall || [])].forEach(e => e && (e.mobs || []).forEach(s => { if (s[0] !== '!') add(s); }));
      const mm = typeof MOB_METAMORPH !== 'undefined' && MOB_METAMORPH[id];
      if (mm) add(mm.into);
    });
  }
  return ids;
}
// 有其他取得管道的裝備（打得到的怪會掉、NPC 商店）不進轉蛋
function gearHasOtherSource(id) {
  if (!_gearSourced) {
    _gearSourced = new Set();
    reachableLootMonsters().forEach(k => (MONSTERS[k].drops || []).forEach(d => _gearSourced.add(d.item)));
    Object.values(NPC_SHOPS).forEach(s => (s.items || []).forEach(i => _gearSourced.add(i)));
  }
  return _gearSourced.has(id);
}
GEAR_GACHA.forEach(([id, name, img, , pick]) => {
  ITEMS[id] = {
    id, imgId: img, name, type: 'consumable', icon: '🎁', weight: 1, sell: 0, boxOpen: 'gear_' + id,
    desc: `打開後隨機獲得一件${name.replace('轉蛋', '')}（只開沒有怪物掉落、商店也不賣的裝備）。`,
  };
  BOX_POOLS['gear_' + id] = {
    build: () => Object.keys(ITEMS).filter(k => boxEligible(k) && pick(ITEMS[k]) && !gearHasOtherSource(k)),
  };
});
CASH_SHOP.find(c => c.cat === '轉蛋').items.push(...GEAR_GACHA.map(([id, , , p]) => [id, p]));

/* 轉蛋碎片（使用者 2026-11-18）：讓放置本身也拿得到轉蛋專屬裝備。
   一般怪（含迷你王）每隻 GACHA_SHARD_RATE 機率掉 1 片，MVP GACHA_SHARD_MVP_RATE（1%）；線上、離線同一套（離線照期望值）。
   不吃打寶倍率、掉寶糖。商城「碎片兌換」GACHA_SHARD_COST 片換任一部位裝備轉蛋。道館複製體、虛擬對手不掉。 */
const GACHA_SHARD = 'gacha_shard';
const GACHA_SHARD_RATE = 0.0001;   // 每秒殺 1 隻掛一天約 8.6 片
const GACHA_SHARD_MVP_RATE = 0.01;   // 使用者 2026-11-18：原本 MVP 必掉，改 1%
const GACHA_SHARD_COST = 10;
ITEMS[GACHA_SHARD] = {
  id: GACHA_SHARD, imgId: 7445, name: '轉蛋碎片', type: 'material', icon: '🧩', weight: 0, sell: 0,
  desc: `打倒魔物偶爾掉落，MVP 掉率較高。集滿 ${GACHA_SHARD_COST} 片到商城「碎片兌換」換任一部位裝備轉蛋。`,
};
// 每隻怪期望掉幾片（離線結算用）
function gachaShardRate(def) {
  if (!def || def.isVirtual || def.dojo) return 0;
  return def.isMvp ? GACHA_SHARD_MVP_RATE : GACHA_SHARD_RATE;
}
// 線上擊殺（killMonster 尾端呼叫）
function rollGachaShard(def) {
  const r = gachaShardRate(def);
  if (r > 0 && (r >= 1 || rng() < r)) {
    addItem(GACHA_SHARD, 1);
    logMsg(`🧩 掉落了${ITEMS[GACHA_SHARD].name}！（持有 ${getItemQty(GACHA_SHARD)}）`);
  }
}
const SHARD_SHOP = [{ cat: '碎片兌換', items: GEAR_GACHA.map(([id]) => [id, GACHA_SHARD_COST]) }];
function buyShardItem(itemId, qty) {
  const def = ITEMS[itemId];
  if (!def || !GEAR_GACHA.some(([id]) => id === itemId)) return false;
  const n = Math.min(qty || 1, Math.floor(getItemQty(GACHA_SHARD) / GACHA_SHARD_COST));
  if (n <= 0) { logMsg(`⚠️ ${ITEMS[GACHA_SHARD].name}不足，要 ${GACHA_SHARD_COST} 片。`); return false; }
  removeItem(GACHA_SHARD, GACHA_SHARD_COST * n);
  addItem(itemId, n);
  logMsg(`🧩 用 ${GACHA_SHARD_COST * n} 片${ITEMS[GACHA_SHARD].name}換到 ${def.name} ×${n}。`);
  saveGame();
  return true;
}

/* 附魔轉蛋（D7，使用者 2026-11-14）：開出一顆附魔石，照 ENCHANTS 稀有度權重抽；石頭找附魔師裝 */
ITEMS.gacha_enchant = {
  id: 'gacha_enchant', imgId: 4811, name: '附魔轉蛋', type: 'consumable', icon: '💠', weight: 1, sell: 0, boxOpen: 'enchant',
  desc: '打開後隨機獲得一顆附魔石（等級越高越難抽到）。附魔石到冒險者主城「精煉・附魔區」找附魔師裝在附魔孔上。',
};
BOX_POOLS.enchant = { build: () => Object.keys(ENCHANTS).filter(k => ITEMS[k]), weight: id => ENCHANTS[id].weight };
CASH_SHOP.find(c => c.cat === '轉蛋').items.push(['gacha_enchant', 10]);

/* ---------------- MVP 點數（T10，使用者 2026-11-14） ----------------
   跟商城點數分開：打倒 MVP 得 1 點（線上、離線、討伐結算都算），每天上限 50 點。
   用途偏日常消耗品：素質料理、精煉材料、鐵匠的祝福。商城點數主要拿去抽獎。 */
const MVP_POINT_NAME = 'MVP 點數';
const MVP_POINT_DAILY_CAP = 50;
const STAT_KEYS6 = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
const MVP_SHOP = [
  { cat: '素質料理 +5（20 分鐘）', items: STAT_KEYS6.map(k => [k + '_dish05', 5]) },
  { cat: '素質料理 +10（20 分鐘）', items: STAT_KEYS6.map(k => [k + '_dish10', 10]) },
  { cat: '精煉', items: [['enriched_oridecon', 5], ['enriched_elunium', 5], ['bradium', 3], ['carnium', 3],
    ['hd_bradium', 10], ['hd_carnium', 10], ['blacksmith_blessing', 50]] },
];
function mvpPoints() { return (state && state.mvpPoints) || 0; }
function mvpPointsToday() {
  const d = state && state.mvpPointsDay;
  return d && d.day === gmtToday() ? d.got : 0;
}
/* 加點受每日上限；owner 省略＝玩家（隊友打死的也算玩家的） */
function addMvpPoints(n, owner) {
  const st = owner || state;
  if (!st || !(n > 0)) return 0;
  const day = gmtToday();
  if (!st.mvpPointsDay || st.mvpPointsDay.day !== day) st.mvpPointsDay = { day, got: 0 };
  const add = Math.min(n, MVP_POINT_DAILY_CAP - st.mvpPointsDay.got);
  if (add <= 0) return 0;
  st.mvpPointsDay.got += add;
  st.mvpPoints = (st.mvpPoints || 0) + add;
  logMsg(`🏅 ${MVP_POINT_NAME} +${add}（今天 ${st.mvpPointsDay.got}／${MVP_POINT_DAILY_CAP}）`);
  return add;
}
function mvpShopPrice(itemId) {
  for (const c of MVP_SHOP) for (const [id, p] of c.items) if (id === itemId) return p;
  return 0;
}
function buyMvpItem(itemId, qty) {
  const p = mvpShopPrice(itemId);
  const def = ITEMS[itemId];
  if (!p || !def) return false;
  const n = Math.min(qty || 1, Math.floor(mvpPoints() / p));
  if (n <= 0) { logMsg(`⚠️ ${MVP_POINT_NAME}不足，${def.name} 要 ${p} 點。`); return false; }
  state.mvpPoints -= p * n;
  addItem(itemId, n);
  logMsg(`🏅 用 ${p * n} ${MVP_POINT_NAME}買了 ${def.name} ×${n}。`);
  saveGame();
  return true;
}
