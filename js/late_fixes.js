/* 載入順序造成的資料修正（手寫，2026-11-14）。這個檔案在 enchants.js／box_pools.js 之後載入。

   卡片「尚未實作」註記過時：data.js 的 CARDPROCNOTE 在載入當下判斷「卡片身上有沒有觸發欄位」，
   但 v2 的觸發效果（autoSpell／ailment／autobonus…）是之後 item_effects.js 才補上的，
   於是有效的卡被標成「尚未實作」（使用者 2026-11-14 要求一併檢查）。
   這裡在全部資料就緒後重判：卡片有觸發欄位、異常抵抗、或已實作的機率鍵，就把註記拿掉。 */
(function () {
  if (typeof CARDS === 'undefined') return;
  const NOTE = /\s*（⚠ 本服實作：這張卡目前只有上面列出的固定加成有效，敘述中「一定機率觸發」的那一段\*\*尚未實作\*\*。）/;
  const WHOLE = /\s*[（(]效果未實裝[）)]/;
  const LIVE = /^(ailResist_|lifeSteal|spSteal|magicReflect|meltdown|reflectPct|boxDropPct)/;
  const live = c => (c.autoSpell && c.autoSpell.length) || (c.ailment && c.ailment.length) || (c.killDrop && c.killDrop.length)
    || (c.autobonus && c.autobonus.length) || (c.grantSkill && c.grantSkill.length)
    || Object.keys(c.bonus || {}).some(k => LIVE.test(k));
  let n = 0;
  for (const id in CARDS) {
    const c = CARDS[id];
    if (!live(c)) continue;
    [c, typeof ITEMS !== 'undefined' ? ITEMS[id] : null].forEach(o => {
      if (!o || !o.desc) return;
      const d = o.desc.replace(NOTE, '').replace(WHOLE, '');
      if (d !== o.desc) { o.desc = d; if (o === c) n++; }
    });
  }
  console.log('[data] LATE-CARDNOTE 拿掉過時的「尚未實作」註記 ' + n + ' 張');
})();
