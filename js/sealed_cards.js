/* 封印王卡卡冊的封印卡（使用者 2026-11-07）：在 item_effects.js 之後載入。
   效果由 scripts/gen_item_effects.js 從 rAthena 轉出（含精煉 +15、素質門檻、指定武器）；
   這裡只放 rAthena 腳本表達不了的（官方寫在 item_combo 的搭配效果），以及做不到的部分寫進說明
   （desc 註記＋圖鑑的 unimplemented）。重新產生 item_effects.js 不會蓋掉這裡。 */

(function applySealedCards() {
  if (typeof CARDS === 'undefined') return;
  // 搭配效果（rAthena item_combos）
  const COMBO = {
    sealed_d_lord_card: [
      { when: { withCards: ['dark_illusion_card'] }, bonus: { hpPct: 10, spPct: 10 } },
      { when: { withCards: ['dark_illusion_card'], refineMin: 15 }, bonus: { hpPct: 5, spPct: 5 } }],
  };
  for (const [id, list] of Object.entries(COMBO)) {
    const c = CARDS[id];
    if (c) c.condBonus = [...(c.condBonus || []), ...list];
  }

  // 沒做到的部分：補在說明最後，圖鑑另列
  const GAP = {
    sealed_ifrit_card: ['被攻擊時自動施放地震（本作沒有這個技能）'],
    sealed_samurai_card: ['卸下時扣 HP'],
    sealed_eddga_card: ['移動無延遲'],
    sld_q_scaraba_card: ['額外掉落道具'],
    sld_clown_card: ['裝備樂器／鞭子時可使用布萊奇之詩'],
    sld_gypsy_card: ['裝備樂器／鞭子時可使用女神之吻'],
  };
  const PROCNOTE = /\s*（⚠ 本服實作：這張卡目前只有上面列出的固定加成有效[^）]*）/;
  for (const [id, lines] of Object.entries(GAP)) {
    const c = CARDS[id];
    if (!c) continue;
    const note = ` （⚠ 本服實作：${lines.join('、')}未實作，其餘有效。）`;
    c.desc = String(c.desc || '').replace(PROCNOTE, '') + note;
    c.unimplemented = lines;
    if (ITEMS[id]) ITEMS[id].desc = String(ITEMS[id].desc || '').replace(PROCNOTE, '') + note;
  }
  // 其他封印卡：拿掉 data.js CARDPROCNOTE 誤加的那句（它在自動念咒從 item_effects 補進來之前就跑了）
  Object.keys(CARDS).filter(id => /^(sealed_|sld_)/.test(id) && !GAP[id]).forEach(id => {
    CARDS[id].desc = String(CARDS[id].desc || '').replace(PROCNOTE, '');
    if (ITEMS[id]) ITEMS[id].desc = String(ITEMS[id].desc || '').replace(PROCNOTE, '');
  });
})();
