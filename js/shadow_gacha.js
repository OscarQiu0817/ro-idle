/* 影子裝備轉蛋（使用者 2026-11-24：影子裝從商城轉蛋拿）。
   兩種：一般影子轉蛋（三轉以下能穿的）、三轉影子轉蛋（三轉限定的）。點數跟服飾轉蛋一樣 30 點。
   池子用 BOX_POOLS（開箱邏輯共用），轉蛋放進商城「轉蛋」分類。costume.js 之後載入。 */
const SHADOW_GACHA = [
  ['gacha_shadow', '影子裝備轉蛋', 14815, 30, d => !d.reqThird],
  ['gacha_shadow_third', '三轉影子裝備轉蛋', 14818, 30, d => !!d.reqThird],
];
if (typeof BOX_POOLS !== 'undefined' && typeof ITEMS !== 'undefined') SHADOW_GACHA.forEach(([id, name, img, price, pick]) => {
  ITEMS[id] = {
    id, imgId: img, name, type: 'consumable', icon: '🎁', weight: 1, sell: 0, boxOpen: 'shadow_' + id,
    desc: `打開後隨機獲得一件${name.replace('轉蛋', '')}。影子裝備穿在「特殊裝備」分頁的影子欄位，可以精煉（照防具規則）。`,
  };
  BOX_POOLS['shadow_' + id] = { build: () => Object.keys(ITEMS).filter(k => ITEMS[k].type === 'shadow' && pick(ITEMS[k])) };
  const cat = typeof CASH_SHOP !== 'undefined' && CASH_SHOP.find(c => c.cat === '轉蛋');
  if (cat) cat.items.push([id, price]);
});
