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
  { cat: '精煉', items: [['blacksmith_blessing', 15]] },
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
   池子用 boxEligible 同一套過濾（中文名、非時裝），跟神秘箱子的池是子集合。 */
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
// 有其他取得管道的裝備（怪物掉落、NPC 商店）不進轉蛋
function gearHasOtherSource(id) {
  if (!_gearSourced) {
    _gearSourced = new Set();
    Object.values(MONSTERS).forEach(m => (m.drops || []).forEach(d => _gearSourced.add(d.item)));
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
