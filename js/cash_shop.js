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
