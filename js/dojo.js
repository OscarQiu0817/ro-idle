/* 道館（T53，使用者 2026-11-13）：普隆德拉副本區的道館館主報名，分難度、每難度 5 關、可帶隊友。
   每一關都是一隻 MVP（使用者 2026-11-13）：難度照怪物編號（版本）分段——初級是最早的經典王，
   越後面的難度越新、越強（高級有研究所人形王、蘭特克力斯；地獄是更後面版本的王）。
   一場從該難度的王裡抽 5 隻不重複，同一天同難度抽到的一樣。
   王的紅圈技能走 js/boss_fight.js；不限時，玩家打不過自己按放棄（使用者 2026-11-14）。
   獎勵一律用抽的（使用者 2026-11-13）：每過一關抽 1 次，全破再加抽（難度越高越多次）；
   獎品池裡只有一定機率抽到道館代幣，代幣換商城點數（之後開放高階裝備材料兌換）。
   入場費 100 萬z、不限次數（2026-11-14 起，原本每難度每天 1 次）；全破固定給代幣 3／5／10／20 枚。
   全隊倒下、離開地圖、放棄就結束。
   2026-11-14（使用者）：各難度的王改成指定名單（照名單順序當難度，抽到的 5 隻照名單順序排）；
   場內有館主 NPC：對話才開打，每關打完找館主領獎才能選下一關，最後一關領完傳回城。
   主角倒下但隊友還站著就繼續打；撐過 15 秒，隊友用復活術或天地樹葉子把主角扶起來。
   這個檔案在 gvg.js 之後載入。 */
const DOJO_MAP = 'dojo_arena';
const DOJO_TOWN = 'prontera';
const DOJO_FLOORS = 5;
const DOJO_REVIVE_WAIT_MS = 15000;   // 主角倒下後，隊友撐過這麼久才扶得起來
const DOJO_TOKEN = 'dojo_token';
const DOJO_ENTRY_FEE = 1000000;   // 入場費（使用者 2026-11-14：拿掉每日次數，改收費）
// mobs＝怪物編號（imgId，跟官方編號同一套），使用者 2026-11-14 指定；排越後面越難
const DOJO_TIERS = [
  { id: 'easy', name: '初級', minLv: 60, bonusDraws: 1, clearTokens: 3,
    mobs: [1086, 1115, 1159, 1150, 1059, 1389, 1583, 1087, 1046, 1147, 1038, 1511, 1157, 1112, 1252, 1251, 1630] },
  { id: 'normal', name: '中級', minLv: 80, bonusDraws: 2, clearTokens: 5,
    mobs: [1492, 1418, 1312, 1688, 1785, 1734, 1685, 1980, 1885, 1190, 1039, 1272] },
  { id: 'hard', name: '高級', minLv: 99, bonusDraws: 3, clearTokens: 10,
    mobs: [1708, 2068, 2156, 2087, 1871, 1623, 1719, 1751, 1779, 1768, 1658, 2131] },
  { id: 'hell', name: '地獄', minLv: 99, bonusDraws: 5, clearTokens: 20,
    mobs: [2022, 1956, 1874, 1917, 1832, 1651, 1650, 1647, 1646, 1649, 1648] },
];
// 獎品池（權重，T56 使用者 2026-11-14）：分難度，難度越高材料越高階；藥水減量；道館代幣各 5%
const DOJO_REWARD_POOLS = {
  easy: [
    { item: 'oridecon', qty: 1, w: 20 }, { item: 'elunium', qty: 1, w: 20 },
    { item: 'old_blue_box', qty: 1, w: 20 }, { item: 'yggdrasilberry', qty: 1, w: 15 },
    { item: 'seed_of_yggdrasil', qty: 1, w: 10 }, { item: 'white_potion', qty: 10, w: 10 }, { item: DOJO_TOKEN, qty: 1, w: 5 },
  ],
  normal: [
    { item: 'enriched_oridecon', qty: 1, w: 20 }, { item: 'enriched_elunium', qty: 1, w: 20 },
    { item: 'oridecon', qty: 2, w: 15 }, { item: 'elunium', qty: 2, w: 15 },
    { item: 'old_blue_box', qty: 1, w: 15 }, { item: 'yggdrasilberry', qty: 1, w: 10 }, { item: DOJO_TOKEN, qty: 1, w: 5 },
  ],
  hard: [
    { item: 'bradium', qty: 1, w: 20 }, { item: 'carnium', qty: 1, w: 20 },
    { item: 'enriched_oridecon', qty: 1, w: 15 }, { item: 'enriched_elunium', qty: 1, w: 15 },
    { item: 'old_violet_box', qty: 1, w: 15 }, { item: 'yggdrasilberry', qty: 2, w: 10 }, { item: DOJO_TOKEN, qty: 1, w: 5 },
  ],
  hell: [
    { item: 'hd_bradium', qty: 1, w: 15 }, { item: 'hd_carnium', qty: 1, w: 15 },
    { item: 'bradium', qty: 2, w: 15 }, { item: 'carnium', qty: 2, w: 15 },
    { item: 'blacksmith_blessing', qty: 1, w: 10 }, { item: 'old_violet_box', qty: 1, w: 15 },
    { item: 'yggdrasilberry', qty: 2, w: 10 }, { item: DOJO_TOKEN, qty: 1, w: 5 },
  ],
};
function dojoRewardPool(tierId) { return DOJO_REWARD_POOLS[tierId] || DOJO_REWARD_POOLS.easy; }
// 代幣兌換：points＝商城點數（之後加高階裝備材料）
const DOJO_SHOP = [
  { points: 10, price: 1 },
];

if (typeof MAPS !== 'undefined' && !MAPS.some(m => m.id === DOJO_MAP)) {
  MAPS.push({ id: DOJO_MAP, imgId: 0, name: '道館', monsters: [], bg: 'map-city', lv: '', arena: true });
}
if (typeof ITEMS !== 'undefined' && !ITEMS[DOJO_TOKEN]) {
  ITEMS[DOJO_TOKEN] = { id: DOJO_TOKEN, imgId: 6418, name: '道館代幣', type: 'material', icon: '🪙', weight: 0, sell: 0,
    desc: '道館抽獎偶爾抽到的代幣。在普隆德拉的道館館主那裡兌換商城點數。' };
}

function dojoToday() { return typeof gmtToday === 'function' ? gmtToday() : new Date(gameNow()).toDateString(); }
function dojoTier(id) { return DOJO_TIERS.find(t => t.id === id) || null; }
function dojoBlockReason(tierId) {
  const t = dojoTier(tierId);
  if (!t) return '沒有這個難度。';
  if ((state.baseLevel || 1) < t.minLv) return `${t.name}要基本等級 ${t.minLv} 以上。`;
  if ((state.gold || 0) < DOJO_ENTRY_FEE) return `入場費 ${DOJO_ENTRY_FEE.toLocaleString()}z，鋅幣不足。`;
  if (state.dojo || state.gmt || state.gvg || state.vDuel) return '正在進行其他挑戰。';
  if (state.bossChallenge || state.bossHunt) return '正在挑戰或討伐首領。';
  if (state.travel) return '趕路中，先停下來。';
  if (!(state.hp > 0)) return '倒下時不能報名。';
  return null;
}

/* 這個難度的 MVP 池（使用者指定名單） */
const _dojoPoolCache = {};   // 每幀的對話框都會查，掃整個 MONSTERS 只做一次
function dojoPool(t) {
  if (!_dojoPoolCache[t.id]) {
    const all = Object.values(MONSTERS);
    _dojoPoolCache[t.id] = t.mobs.map(img => all.find(m => m && m.imgId === img && m.isMvp && !m.isVirtual && m.hp > 0))
      .filter(Boolean);
  }
  return _dojoPoolCache[t.id].slice();
}
/* 這一場的 5 隻：每次進場才從池子不重複抽、順序隨機。種子存進 state.dojo，重新載入同一場不變 */
function dojoLineup(t, seed) {
  const rnd = vfoeRand(seed >>> 0);
  const left = dojoPool(t);
  const out = [];
  while (out.length < DOJO_FLOORS && left.length) out.push(left.splice(Math.floor(rnd() * left.length), 1)[0].id);
  return out;
}
function dojoFloorPlan(t, floor, seed) {
  const ids = dojoLineup(t, seed);
  return ids.length ? [ids[(floor - 1) % ids.length]] : [];
}

/* 場上的怪是複製出來的（不給經驗、掉落、圖鑑），打完就清掉 */
function dojoSpawnFloor() {
  const d = state.dojo;
  const t = dojoTier(d.tier);
  const ids = dojoFloorPlan(t, d.floor, d.seed);
  const now = gameNow();
  state.monsters = []; state.bossCasts = [];
  ids.forEach((src, i) => {
    const id = 'dojo_' + src;
    if (!MONSTERS[id]) {
      MONSTERS[id] = Object.assign({}, MONSTERS[src], { id, exp: 0, jobExp: 0, drops: [], isVirtual: true, dojo: true });
      if (typeof MOB_MOVE !== 'undefined') MOB_MOVE[id] = Object.assign({}, MOB_MOVE[src] || {}, { aggressive: true });
      if (typeof BOSS_PATTERNS !== 'undefined' && BOSS_PATTERNS[src]) BOSS_PATTERNS[id] = BOSS_PATTERNS[src];
    }
    const def = MONSTERS[id];
    state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
    state.monsters.push({ defId: id, hp: def.hp, maxHp: def.hp, id: state.monsterIdCounter, spawnedAt: now, d: 6 + (i % 3), a: -0.6 + (i % 5) * 0.3 });
  });
  state.monster = state.monsters[0];
  logMsg(`🥋 道館第 ${d.floor}／${DOJO_FLOORS} 關：${ids.map(x => MONSTERS[x].name).join('、')}！`);
}

function dojoEnter(tierId) {
  const why = dojoBlockReason(tierId);
  if (why) { logMsg('⚠️ ' + why); return false; }
  const t = dojoTier(tierId);
  const now = gameNow();
  if (!changeMap(DOJO_MAP, { party: true })) return false;
  state.gold -= DOJO_ENTRY_FEE;
  const seed = (Math.floor(rng() * 4294967295) >>> 0) || 1;
  // phase：talk 等玩家找館主開打、fight 戰鬥中、reward 等玩家找館主領獎
  state.dojo = { tier: t.id, floor: 0, cleared: 0, claimed: 0, seed, startAt: now, phase: 'talk' };
  logMsg(`🥋 進入道館（${t.name}），跟館主對話開始第 1 關。`);
  saveGame();
  return true;
}
/* 館主對話：開始下一關 */
function dojoNextFloor() {
  const d = state.dojo;
  if (!d || d.phase !== 'talk' || !(state.hp > 0)) return false;
  d.floor++;
  d.phase = 'fight';
  dojoSpawnFloor();
  return true;
}
/* 館主對話：領這一關的獎勵；最後一關領完照全破結算、傳回城 */
function dojoClaimFloor() {
  const d = state.dojo;
  if (!d || d.phase !== 'reward') return false;
  const e = dojoDraw();
  if (ITEMS[e.item]) addItem(e.item, e.qty);
  d.claimed = d.floor;
  logMsg(`🎁 第 ${d.floor} 關獎勵：${ITEMS[e.item] ? ITEMS[e.item].name : e.item} ×${e.qty}`);
  if (d.floor >= DOJO_FLOORS) { dojoFinish(true); return true; }
  d.phase = 'talk';
  saveGame();
  return true;
}
function dojoDraw(tierId) {
  const pool = dojoRewardPool(tierId || (state.dojo && state.dojo.tier));
  const total = pool.reduce((a, e) => a + e.w, 0);
  let r = rng() * total;
  for (const e of pool) { r -= e.w; if (r < 0) return e; }
  return pool[0];
}
function dojoClearMonsters() {
  state.monsters = (state.monsters || []).filter(m => !(MONSTERS[m.defId] && MONSTERS[m.defId].dojo));
  state.monster = state.monsters[0] || null;
  state.bossCasts = [];
}
/* 結算：過幾關抽幾次，全破再加抽 */
function dojoFinish(clear, why) {
  const d = state.dojo;
  if (!d) return;
  state.dojo = null;
  const t = dojoTier(d.tier);
  dojoClearMonsters();
  const got = {};
  const add = (id, n) => { got[id] = (got[id] || 0) + n; };
  // 在館主那裡領過的關不重抽；中途結束時，打完沒領的照補
  const n = Math.max(0, (d.cleared || 0) - (d.claimed || 0)) + (clear ? t.bonusDraws : 0);
  for (let i = 0; i < n; i++) { const e = dojoDraw(t.id); add(e.item, e.qty); }
  if (clear && t.clearTokens) add(DOJO_TOKEN, t.clearTokens);   // 全破固定給代幣
  Object.entries(got).forEach(([id, n]) => { if (ITEMS[id]) addItem(id, n); });
  const list = Object.entries(got).map(([id, n]) => `${ITEMS[id] ? ITEMS[id].name : id} ×${n}`).join('、') || '沒有獎勵';
  state.dojoLast = { tier: t.id, cleared: d.cleared, clear: !!clear, at: gameNow() };
  if (clear) state.dojoBest = Object.assign({}, state.dojoBest, { [t.id]: true });
  logMsg(clear ? `🏆 道館（${t.name}）全破！獲得：${list}。` : `🥋 道館（${t.name}）結束（${why || '中斷'}）：過了 ${d.cleared} 關，獲得：${list}。`);
  if (state.mapId === DOJO_MAP) changeMap(DOJO_TOWN, { party: true });
  if (!(state.hp > 0)) {   // 全隊倒下：抬回城、全隊補滿（比照 onPlayerDown）
    state.deaths = (state.deaths || 0) + 1;
    if (typeof reviveAlliesInTown === 'function') reviveAlliesInTown();
    state.hp = state.maxHp; state.sp = state.maxSp;
    state.lastAttackTime = gameNow();
  }
  saveGame();
}
function dojoAbandon() { if (state.dojo) dojoFinish(false, '放棄'); }
function dojoBuy(idx) {
  const e = DOJO_SHOP[idx];
  if (!e) return false;
  if (getItemQty(DOJO_TOKEN) < e.price) { logMsg(`⚠️ 道館代幣不足，需要 ${e.price} 枚。`); return false; }
  removeItem(DOJO_TOKEN, e.price);
  if (e.points) addCashPoints(e.points);
  if (e.item) addItem(e.item, e.qty || 1);
  logMsg(`🪙 用 ${e.price} 枚道館代幣換到了 ${e.points ? e.points + ' 商城點數' : ITEMS[e.item].name}。`);
  saveGame();
  return true;
}

/* 每拍（tickBossFight 呼叫） */
function tickDojo(now) {
  const d = state && state.dojo;
  if (!d) return;
  if (state.mapId !== DOJO_MAP) return dojoFinish(false, '離開了道館');
  if (!(state.hp > 0) && !allyAliveList().length) return dojoFinish(false, '全隊倒下');
  if (d.phase !== 'fight') return;
  const left = (state.monsters || []).filter(m => MONSTERS[m.defId] && MONSTERS[m.defId].dojo && m.hp > 0);
  if (left.length) return;
  d.cleared = d.floor;
  d.phase = 'reward';
  logMsg(`✅ 第 ${d.floor} 關通過！找館主領獎${d.floor >= DOJO_FLOORS ? '' : '，再選下一關'}。`);
  saveGame();
}

/* 主角倒下（onPlayerDown 先問這裡）：隊友還站著就留在場上繼續打 */
function dojoOnPlayerDown() {
  state.hp = 0;
  if (!allyAliveList().length) { dojoFinish(false, '全隊倒下'); return true; }
  if (state.dojo.downAt) return true;   // 已經倒著（紅圈又打到一次）不重算 15 秒
  state.dojo.downAt = gameNow();
  logMsg(`💀 你倒下了！隊友撐過 ${DOJO_REVIVE_WAIT_MS / 1000} 秒就能把你扶起來。`);
  return true;
}
/* 隊友扶主角：學了復活術、SP 夠的隊友先放；沒有就用背包裡的天地樹葉子（HP 50%，跟扶隊友同一條） */
function allyRevivePlayer() {
  if (typeof reviveBlocked === 'function' && reviveBlocked()) return false;
  const full = () => { state.hp = state.maxHp; state.sp = state.maxSp; };
  const res = typeof findSkillAnywhere === 'function' ? findSkillAnywhere('all_resurrection') : null;
  for (const a of allyAliveList()) {
    const lv = res ? withAlly(a, () => skillLv('all_resurrection')) : 0;
    const cost = lv ? skillSpCost(res, lv) : 0;
    if (!lv || a.sp < cost || !sageCanPay(res.costItems, 1)) continue;
    a.sp -= cost;
    sagePay(res.costItems, 1);
    const pct = lvArr(res.revivePct, lv);
    state.hp = Math.max(1, Math.round(state.maxHp * pct / 100));
    if (state.cardReviveFull) full();
    logMsg(`✨ ${a._allyName} 用復活術扶起了你（HP ${state.cardReviveFull ? 100 : pct}%）。`);
    return true;
  }
  const a = allyAliveList()[0];
  if (a && getItemQty(ALLY_REVIVE_ITEM) > 0) {
    removeItem(ALLY_REVIVE_ITEM, 1);
    state.hp = Math.max(1, Math.round(state.maxHp * 0.5));
    if (state.cardReviveFull) full();
    logMsg(`🍃 ${a._allyName} 用${ITEMS[ALLY_REVIVE_ITEM].name}扶起了你（HP 50%）。`);
    return true;
  }
  return false;
}
/* 主角倒下時的每拍（gameTick 的倒地分支）：隊友、怪物、王的紅圈照跑，撐過 15 秒試著扶主角 */
function dojoDownedTick() {
  const now = gameNow();
  const d = state.dojo;
  if (!allyAliveList().length) return dojoFinish(false, '全隊倒下');
  if (now - (state._lastSlowTick || 0) >= 1000) { state._lastSlowTick = now; tickAllyRegen(); alliesTick(); }
  const dt = Math.min(1000, now - (state._lastMoveTick || now));
  state._lastMoveTick = now;
  tickMonsterMovement(dt, now);
  tickAllyFormation(dt);
  tickBossFight(dt, now);
  if (!state.dojo) return;
  alliesCastTick(now);
  (state.monsters || []).forEach(mon => {
    const md = MONSTERS[mon.defId];
    if (!md || md.passive) return;
    if (!mon.lastAttackTime) mon.lastAttackTime = now;
    if (!monInRange(mon) || mon._bossCast) { mon.lastAttackTime = now; return; }
    if (now - mon.lastAttackTime >= (md.atkInterval || 1) * 1000) { mon.lastAttackTime = now; monsterAttackSingle(mon); }
  });
  if (!state.dojo || !allyAliveList().length) return;
  if (now - (d.downAt || now) >= DOJO_REVIVE_WAIT_MS && now >= (d.reviveTryAt || 0)) {
    d.reviveTryAt = now + 3000;   // 沒葉子、沒 SP 時每 3 秒再試
    if (allyRevivePlayer()) {
      d.downAt = 0;
      state.lastAttackTime = now; state.attackAccumulator = 0;
      recomputeDerived(false);
    }
  }
}
// 讀檔：道館中斷就照打完的關數抽
function dojoOnLoad() {
  if (state.dojo) {
    const d = state.dojo;
    const t = dojoTier(d.tier);
    state.dojo = null;
    for (let i = 0; t && i < (d.cleared || 0) - (d.claimed || 0); i++) { const e = dojoDraw(t.id); if (ITEMS[e.item]) addItem(e.item, e.qty); }
  }
  if (state.mapId === DOJO_MAP) state.mapId = DOJO_TOWN;
}
