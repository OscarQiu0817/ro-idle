/* 手動轉換的道具效果（2026-11-07）：rAthena 腳本 scripts/gen_item_effects.js 轉不了、但本作機制做得到的。
   在 item_effects.js、sealed_cards.js 之後載入；整欄覆蓋（bonus／condBonus／autoSpell 寫了就取代該欄）。
   每筆註明官方腳本與近似之處；重新產生 item_effects.js 不會蓋掉這裡。 */
const ITEM_EFFECTS_MANUAL = {
  /* 深淵之耳／怨靈之耳：(AGI+INT)/30 → MATK%，(AGI+INT) 達 250 再 +15%。SPL／POW 是四轉素質，本作沒有。
     兩項素質相加後才取整，拆不成「每 N 點」，用 statSumMin 門檻（看加點素質）。 */
  ear_of_abyss: { condBonus: [
    ...[30, 60, 90, 120, 150, 180, 210, 240].map(n => ({ when: { statSumMin: n, statSumOf: ['agi', 'int'] }, bonus: { matkPct: 1 } })),
    { when: { statSumMin: 250, statSumOf: ['agi', 'int'] }, bonus: { matkPct: 15 } }] },
  ear_of_spirit: { condBonus: [
    ...[30, 60, 90, 120, 150, 180, 210, 240].map(n => ({ when: { statSumMin: n, statSumOf: ['str', 'vit'] }, bonus: { meleeDmgPct: 1 } })),
    { when: { statSumMin: 250, statSumOf: ['str', 'vit'] }, bonus: { meleeDmgPct: 15 } }] },
  /* 馴鷹師魔笛：普攻時自動施放獵鷹（學到的等級），機率千分比 = 獵鷹等級/3×10 + LUK×10（LUK 上限 120）+ …
     LUK 每 10 點 +10%（看加點 LUK），獵鷹等級那一小段（最多約 2%）略過。 */
  falconer_flute: { autoSpell: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n =>
    ({ on: 'attack', skill: 'ht_blitzbeat', lv: 1, useLearnedLv: true, chance: 10, ...(n > 10 ? { when: { statMin: { luk: n } } } : { when: { statMin: { luk: 10 } } }) })) },
  /* 金鋼猿頭飾：STR+2；現實 1、2 月時 STR+2、VIT+2；精煉 +11 以上 STR+3 */
  gorilla_model_hat: { bonus: { str: 2 }, condBonus: [
    { when: { monthIn: [1, 2] }, bonus: { str: 2, vit: 2 } },
    { when: { refineMin: 11 }, bonus: { str: 3 } }] },
  /* 瓦爾基里的長靴：法師／弓箭手／服事系 MaxHP + 基礎等級×5；劍士／商人／盜賊系 MaxSP + 職業等級×2 */
  valkyrie_shoes: { condBonus: [
    ...['mage', 'archer', 'acolyte'].map(j => ({ when: { jobLine: j }, bonus: { perLv_1_hp: 5 } })),
    ...['swordsman', 'merchant', 'thief'].map(j => ({ when: { jobLine: j }, bonus: { perJobLv_1_sp: 2 } }))] },
  /* 封印闇●劍士賽尼亞卡片：照台服說明「每 15 秒 HP+50、SP+10，精煉 +15 以上改每 10 秒」
     （rAthena 腳本寫成 <15 每 5 秒、≥15 每 10 秒，跟台服相反）。本作定時回復固定 10 秒一次，換算每 10 秒的量 */
  sealed_b_ygnizem_card: { bonus: { hpPct: 5, spPct: 5, regenTickHp: 33, regenTickSp: 7 },
    condBonus: [{ when: { refineMin: 15 }, bonus: { hpPct: 2, spPct: 2, regenTickHp: 17, regenTickSp: 3 } }] },
  /* 虎王卡片：官方是「無限霸體」（bNoWalkDelay，移動無延遲），本作沒有移動延遲。
     改成學會霸體 Lv10（使用者 2026-11-07），MHP −25% 照官方 */
  eddga_card: { bonus: { hpPct: -25 }, grantSkill: [{ id: 'sm_endure', lv: 10 }] },
  /* 黃金蟲卡片：官方是魔法傷害無效＋SP 消耗 +100%。原作者手寫的「怪物技能免疫」（monSkillImmune）連物理技能也擋，拿掉 */
  golden_bug_card: { bonus: { magicImmunePct: 100, spCostPct: 100 } },
};
(function applyItemEffectsManual() {
  for (const [id, p] of Object.entries(ITEM_EFFECTS_MANUAL)) {
    const d = (typeof CARDS !== 'undefined' && CARDS[id]) || ITEMS[id];
    if (!d) continue;
    Object.assign(d, p);
  }
})();
