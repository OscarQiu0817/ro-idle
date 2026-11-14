/* 每日／每週任務（T19，使用者 2026-11-14）：鼓勵消費與玩法輪轉，獎勵發商城點數。
   計數由各系統呼叫 questCount(kind, n)；每日照台灣日期換，每週從週一換。
   kind：kill 擊殺、mvp 打倒 MVP、refine 精煉（成敗都算）、cashbuy 商城購買、dungeon 挑戰副本（道館／吉芬大賽／打王）、
         enchant 附魔（隨機或裝石）。
   state.periodQuests = { day, week, d: { kind: n }, w: { kind: n }, claimed: { 'd:id' | 'w:id': 1 } }
   這個檔案在 cash_shop.js 之後載入。 */
const DAILY_QUESTS = [
  { id: 'kill', kind: 'kill', goal: 300, name: '擊敗 300 隻魔物', pts: 2 },
  { id: 'mvp', kind: 'mvp', goal: 1, name: '打倒 1 隻 MVP', pts: 2 },
  { id: 'refine', kind: 'refine', goal: 1, name: '精煉 1 次', pts: 2 },
  { id: 'cashbuy', kind: 'cashbuy', goal: 1, name: '在商城購買 1 次', pts: 2 },
  { id: 'dungeon', kind: 'dungeon', goal: 1, name: '挑戰 1 次副本（道館／吉芬大賽／打王）', pts: 2 },
];
const WEEKLY_QUESTS = [
  { id: 'kill', kind: 'kill', goal: 5000, name: '擊敗 5,000 隻魔物', pts: 8 },
  { id: 'mvp', kind: 'mvp', goal: 20, name: '打倒 20 隻 MVP', pts: 8 },
  { id: 'refine', kind: 'refine', goal: 10, name: '精煉 10 次', pts: 8 },
  { id: 'cashbuy', kind: 'cashbuy', goal: 5, name: '在商城購買 5 次', pts: 8 },
  { id: 'dungeon', kind: 'dungeon', goal: 5, name: '挑戰 5 次副本', pts: 8 },
  { id: 'enchant', kind: 'enchant', goal: 3, name: '附魔 3 次', pts: 8 },
];

function questWeekKey() {
  const d = new Date();
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return mon.getFullYear() + '-' + String(mon.getMonth() + 1).padStart(2, '0') + '-' + String(mon.getDate()).padStart(2, '0');
}
function ensurePeriodQuests(st) {
  st = st || state;
  if (!st) return null;
  const day = gmtToday(), week = questWeekKey();
  let q = st.periodQuests;
  if (!q) q = st.periodQuests = { day, week, d: {}, w: {}, claimed: {} };
  if (q.day !== day) { q.day = day; q.d = {}; Object.keys(q.claimed).forEach(k => { if (k[0] === 'd') delete q.claimed[k]; }); }
  if (q.week !== week) { q.week = week; q.w = {}; Object.keys(q.claimed).forEach(k => { if (k[0] === 'w') delete q.claimed[k]; }); }
  return q;
}
/* owner：隊友行動時傳玩家的 state（計數算玩家的） */
function questCount(kind, n, owner) {
  const q = ensurePeriodQuests(owner);
  if (!q || !(n > 0)) return;
  q.d[kind] = (q.d[kind] || 0) + n;
  q.w[kind] = (q.w[kind] || 0) + n;
}
function periodQuestList(type) {
  const q = ensurePeriodQuests();
  const defs = type === 'd' ? DAILY_QUESTS : WEEKLY_QUESTS;
  const cnt = q ? q[type] : {};
  return defs.map(x => ({ ...x, have: Math.min(x.goal, cnt[x.kind] || 0), claimed: !!(q && q.claimed[type + ':' + x.id]) }));
}
function claimPeriodQuest(type, id) {
  const q = ensurePeriodQuests();
  const x = periodQuestList(type).find(e => e.id === id);
  if (!x || x.claimed || x.have < x.goal) return false;
  q.claimed[type + ':' + id] = 1;
  addCashPoints(x.pts);
  logMsg(`📅 ${type === 'd' ? '每日' : '每週'}任務「${x.name}」完成！${CASH_POINT_NAME} +${x.pts}`);
  saveGame();
  return true;
}
/* 可以領的數量（任務分頁按鈕提示用） */
function periodQuestClaimable() {
  return ['d', 'w'].reduce((t, ty) => t + periodQuestList(ty).filter(x => !x.claimed && x.have >= x.goal).length, 0);
}

/* 計數掛點：包一層既有函式，成功才算（跟主線 questMark 同一種做法，不在 engine 裡到處埋） */
(function () {
  const wrap = (name, kind, ok) => {
    const g = typeof globalThis !== 'undefined' ? globalThis : window;
    const f = g[name];
    if (typeof f !== 'function') return;
    g[name] = function () {
      const r = f.apply(this, arguments);
      if (ok(r)) questCount(kind, 1);
      return r;
    };
  };
  wrap('buyCashItem', 'cashbuy', r => r === true);
  wrap('enchantRandom', 'enchant', r => !!r);
  wrap('enchantInstall', 'enchant', r => r === true);
  wrap('dojoEnter', 'dungeon', r => r !== false && !!(state && state.dojo));
  wrap('gmtEnter', 'dungeon', r => r !== false && !!(state && state.gmt));
  wrap('startBossChallenge', 'dungeon', r => r !== false && !!(state && state.bossChallenge));
})();
