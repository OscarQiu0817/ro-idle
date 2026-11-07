/* T19 主線任務（使用者 2026-11-05／11-07）
   全職業同一條，照轉職分章、一次一步、每步教一個系統；不鎖功能，靠獎勵吸引；進度各角色獨立。
   第一章：初心者 → 一轉　第二章：一轉 → 二轉

   每步 check() 回 [目前, 目標]；達成後在「📜 任務」分頁領獎才進下一步。
   「做過一次」的步驟（買東西、存倉庫…）靠 questMark 記旗標：下面把幾支 engine 函式包一層，
   成功（回傳 true）時記一筆，不必在 engine 裡到處埋點。旗標從建角就開始記，提早做過的步驟一到就能領。

   獎勵：每步給商城點數（cash_shop.js；一轉、二轉那步較多）＋鋅幣／補品。職業武器商店買得到，不再發。

   state.mainQuest = { i: 目前第幾步, flags: { buy: 1, … } } */

const mqTier = () => (JOB_TREE[state.jobId] || {}).tier || 0;
const mqFlag = k => (state.mainQuest && state.mainQuest.flags && state.mainQuest.flags[k]) ? 1 : 0;

const MAIN_QUEST = [
  // ---- 第一章：踏上冒險 ----
  { ch: 1, title: '第一場戰鬥', desc: '在普隆德拉原野打倒 10 隻魔物。角色會自己找怪打，自動戰鬥分頁可以設定吃藥時機。',
    check: () => [Math.min(10, acvTotalKills()), 10], go: 'map',
    reward: { points: 10, zeny: 500, items: [['red_potion', 10]] } },
  { ch: 1, title: '變強的第一步', desc: '升級會拿到素質點。到角色分頁把點數加到想強化的素質上。',
    check: () => [mqFlag('stat'), 1], go: 'character',
    reward: { points: 10, zeny: 500, items: [['red_potion', 10]] } },
  { ch: 1, title: '整裝待發', desc: '打怪掉的裝備在背包裡，點一下就能穿上。',
    check: () => [mqFlag('equip'), 1], go: 'inventory',
    reward: { points: 10, zeny: 1000 } },
  { ch: 1, title: '城裡的商店', desc: '回到城鎮，走到商店街跟商人買一樣東西。',
    check: () => [mqFlag('buy'), 1], go: 'map',
    reward: { points: 10, items: [['wing_of_fly', 5]] } },
  { ch: 1, title: '卡普拉服務', desc: '城門口的卡普拉職員可以保管道具，存一樣東西到倉庫試試。',
    check: () => [mqFlag('deposit'), 1], go: 'map',
    reward: { points: 10, zeny: 1000, items: [['wing_of_butterfly', 2]] } },
  { ch: 1, title: '初心者畢業', desc: '把職業等級練到 10，就能選擇第一個職業。',
    check: () => [mqTier() >= 1 ? 10 : Math.min(10, state.jobLevel), 10], go: 'map',
    reward: { points: 10, zeny: 2000 } },
  { ch: 1, title: '選擇你的道路', desc: '到職業公會轉職：劍士在依斯魯得、法師在吉芬、弓箭手在斐揚、商人在艾爾貝塔、盜賊在夢羅克、服事在普隆德拉。轉職樹按「前往公會」會自動走過去。',
    check: () => [mqTier() >= 1 ? 1 : 0, 1], go: 'jobtree',
    reward: { points: 50, zeny: 3000, items: [['red_potion', 20]] } },
  // ---- 第二章：職業之路 ----
  { ch: 2, title: '職業技能', desc: '轉職後每升一級職業等級拿 1 點技能點，到技能分頁學一個技能。',
    check: () => [mqFlag('skill'), 1], go: 'skills',
    reward: { points: 20, zeny: 2000, items: [['blue_potion', 5]] } },
  { ch: 2, title: '討伐佈告欄', desc: '在任務分頁下方接一張討伐令，打完回來領獎。',
    check: () => [mqFlag('hunt'), 1], go: 'quests',
    reward: { points: 20, zeny: 3000 } },
  { ch: 2, title: '精煉', desc: '到城裡的精煉・附魔區找精煉師，把一件裝備精煉到 +1 以上。精煉材料（鋁、神之金屬）跟商人買得到。',
    check: () => [Math.min(1, acvMaxRefine()), 1], go: 'map',
    reward: { points: 20, items: [['oridecon', 2], ['elunium', 2]] } },
  { ch: 2, title: '卡片的力量', desc: '魔物偶爾會掉卡片。插進有洞的裝備就有額外效果。',
    check: () => [Math.min(1, acvCardsEquipped()), 1], go: 'inventory',
    reward: { points: 20, zeny: 5000 } },
  { ch: 2, title: '並肩作戰', desc: '按上方「隊伍」找一位隊友一起冒險。',
    check: () => [Math.min(1, allyList().length), 1], go: null,
    reward: { points: 20, zeny: 5000, items: [['red_potion', 30]] } },
  { ch: 2, title: '磨練', desc: '把基礎等級練到 40。',
    check: () => [Math.min(40, state.baseLevel), 40], go: 'map',
    reward: { points: 20, zeny: 10000 } },
  { ch: 2, title: '二轉', desc: '職業等級練滿、技能點用完，再到該職業的公會二轉。轉職樹按「前往公會」會自動走過去。',
    check: () => [mqTier() >= 2 ? 1 : 0, 1], go: 'jobtree',
    reward: { points: 100, zeny: 20000 } },
];

function mainQuestState() {
  if (!state.mainQuest) state.mainQuest = { i: 0, flags: {} };
  if (!state.mainQuest.flags) state.mainQuest.flags = {};
  return state.mainQuest;
}
function mainQuestStep() { return MAIN_QUEST[mainQuestState().i] || null; }
function mainQuestDone(step) {
  const [have, need] = step.check();
  return have >= need;
}
function claimMainQuest() {
  const step = mainQuestStep();
  if (!step || !mainQuestDone(step)) return false;
  const r = step.reward;
  const got = [];
  if (r.points) { addCashPoints(r.points); got.push(`${r.points} ${CASH_POINT_NAME}`); }
  if (r.zeny) { state.gold += r.zeny; got.push(`${r.zeny.toLocaleString()} 鋅幣`); }
  (r.items || []).forEach(([id, n]) => {
    if (!ITEMS[id]) return;
    addItem(id, n);
    got.push(`${ITEMS[id].name} ×${n}`);
  });
  mainQuestState().i++;
  logMsg(`📖 主線「${step.title}」完成！獲得 ${got.join('、') || '—'}。`);
  return true;
}
function questMark(flag) {
  mainQuestState().flags[flag] = 1;
}
// 成功時記旗標（見檔頭）
(function wrapQuestHooks() {
  const hooks = { buyItem: 'buy', depositToWarehouse: 'deposit', allocateStat: 'stat', equipItem: 'equip',
    levelUpSkill: 'skill', huntClaim: 'hunt', huntClaimRepeat: 'hunt' };
  const g = typeof globalThis !== 'undefined' ? globalThis : window;
  for (const [fn, flag] of Object.entries(hooks)) {
    const orig = g[fn];
    if (typeof orig !== 'function') continue;
    g[fn] = function () {
      const ok = orig.apply(this, arguments);
      if (ok && typeof state !== 'undefined' && state) questMark(flag);
      return ok;
    };
  }
})();
