/* 原型的三個職業設定（run.js 與 demo.html 共用）。
   look 是試玩頁的紙娃娃外觀：job＝圖層職業名、weaponCat＝aspdCategoryOf 的武器類別。 */
const BASE = { lv: 75, hpPotion: 700, spPotion: 60, potPerMin: 10, kiteSafeMs: 800 };
const CLASSES = {
  knight: {
    ...BASE, label: '騎士', look: { job: 'knight', weaponCat: 'sword2' },
    stats: { str: 80, agi: 55, vit: 50, int: 1, dex: 45, luk: 5 },
    maxHp: 7000, maxSp: 300, watk: 160, wmatk: 0, def: 120, aspdMs: 650,
    weaponRange: 1, engageRange: 1, autoAttack: true,
    slots: [
      { id: 'SM_MAGNUM', lv: 10, cond: { minMobs: 3 } },
      { id: 'KN_BOWLINGBASH', lv: 10, cond: { minMobs: 2 } },
      { id: 'SM_BASH', lv: 10 },
    ],
  },
  hunter: {
    ...BASE, label: '獵人', look: { job: 'hunter', weaponCat: 'bow' },
    stats: { str: 30, agi: 70, vit: 20, int: 15, dex: 95, luk: 10 },
    maxHp: 4000, maxSp: 450, watk: 165, wmatk: 0, def: 70, aspdMs: 600,
    weaponRange: 9, engageRange: 9, autoAttack: true, smartCast: true,
    slots: [
      { id: 'AC_SHOWER', lv: 10, cond: { minMobs: 3 } },
      { id: 'HT_BLITZBEAT', lv: 5 },
      { id: 'AC_DOUBLE', lv: 10 },
    ],
  },
  wizard: {
    ...BASE, label: '巫師', look: { job: 'wizard', weaponCat: 'rod1' },
    stats: { str: 1, agi: 20, vit: 35, int: 95, dex: 60, luk: 5 },
    maxHp: 3500, maxSp: 1000, watk: 30, wmatk: 120, def: 50, aspdMs: 900,
    weaponRange: 1, engageRange: 9, autoAttack: false, smartCast: true,
    slots: [
      { id: 'MG_FIREWALL', lv: 10 },
      { id: 'MG_THUNDERSTORM', lv: 10, cond: { minMobs: 3 } },
      { id: 'MG_FIREBOLT', lv: 10 },
    ],
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { CLASSES };
else window.COMBAT1D_CLASSES = CLASSES;
