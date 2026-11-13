/* 道館（T53，使用者 2026-11-13）：普隆德拉副本區的道館館主報名，分難度、每難度 5 關、可帶隊友。
   每一關都是一隻 MVP（使用者 2026-11-13）：難度照怪物編號（版本）分段——初級是最早的經典王，
   越後面的難度越新、越強（高級有研究所人形王、蘭特克力斯；地獄是更後面版本的王）。
   一場從該難度的王裡抽 5 隻不重複、照等級由低到高排，第 5 關最強；同一天同難度抽到的一樣。
   王的紅圈技能走 js/boss_fight.js；整場限時。
   獎勵一律用抽的（使用者 2026-11-13）：每過一關抽 1 次，全破再加抽（難度越高越多次）；
   獎品池裡只有一定機率抽到道館代幣，代幣換商城點數（之後開放高階裝備材料兌換）。
   每個難度每天 1 次；倒下、離開地圖、時間到就結束，照打完的關數抽。
   這個檔案在 gvg.js 之後載入。 */
const DOJO_MAP = 'dojo_arena';
const DOJO_TOWN = 'prontera';
const DOJO_FLOORS = 5;
const DOJO_NEXT_DELAY_MS = 3000;
const DOJO_TOKEN = 'dojo_token';
// ids＝怪物編號範圍（imgId，跟官方編號同一套）
const DOJO_TIERS = [
  { id: 'easy', name: '初級', minLv: 60, ids: [1000, 1199], limitMs: 15 * 60000, bonusDraws: 1 },
  { id: 'normal', name: '中級', minLv: 80, ids: [1200, 1639], limitMs: 20 * 60000, bonusDraws: 2 },
  { id: 'hard', name: '高級', minLv: 99, ids: [1640, 1799], limitMs: 25 * 60000, bonusDraws: 3 },
  { id: 'hell', name: '地獄', minLv: 99, ids: [1800, 9999], limitMs: 30 * 60000, bonusDraws: 5 },
];
// 獎品池（權重）。道館代幣約 5%
const DOJO_REWARD_POOL = [
  { item: 'white_potion', qty: 10, w: 25 },
  { item: 'seed_of_yggdrasil', qty: 1, w: 20 },
  { item: 'old_blue_box', qty: 1, w: 20 },
  { item: 'blue_potion', qty: 5, w: 15 },
  { item: 'yggdrasilberry', qty: 1, w: 15 },
  { item: DOJO_TOKEN, qty: 1, w: 5 },
];
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
  if (((state.dojoDays || {})[t.id]) === dojoToday()) return `${t.name}今天已經挑戰過了。`;
  if (state.dojo || state.gmt || state.gvg || state.vDuel) return '正在進行其他挑戰。';
  if (state.bossChallenge || state.bossHunt) return '正在挑戰或討伐首領。';
  if (state.travel) return '趕路中，先停下來。';
  if (!(state.hp > 0)) return '倒下時不能報名。';
  return null;
}

/* 這個難度可能出現的 MVP（照編號範圍） */
function dojoPool(t) {
  return Object.values(MONSTERS).filter(m => m && m.isMvp && !m.isVirtual && m.hp > 0
    && (m.imgId || 0) >= t.ids[0] && (m.imgId || 0) <= t.ids[1])
    .sort((a, b) => (a.imgId || 0) - (b.imgId || 0));
}
/* 這一場的 5 隻：不重複抽、照等級排（第 5 關最強）。種子＝日期＋難度 */
function dojoLineup(t, seed) {
  const rnd = vfoeRand(seed >>> 0);
  const pool = dojoPool(t).slice();
  const out = [];
  while (out.length < DOJO_FLOORS && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out.sort((a, b) => (a.level - b.level) || (a.hp - b.hp)).map(m => m.id);
}
function dojoSeed(t) {
  let seed = 2166136261;
  for (const ch of dojoToday() + t.id) { seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0; }
  return seed;
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
  state.dojoDays = Object.assign({}, state.dojoDays, { [t.id]: dojoToday() });
  const seed = dojoSeed(t);
  state.dojo = { tier: t.id, floor: 0, cleared: 0, seed, startAt: now, endAt: now + t.limitMs, nextAt: now + 1500 };
  logMsg(`🥋 道館（${t.name}）開始！${DOJO_FLOORS} 關、限時 ${Math.round(t.limitMs / 60000)} 分鐘。`);
  saveGame();
  return true;
}
function dojoNextFloor() {
  const d = state.dojo;
  d.floor++;
  d.nextAt = 0;
  dojoSpawnFloor();
}
function dojoDraw() {
  const total = DOJO_REWARD_POOL.reduce((a, e) => a + e.w, 0);
  let r = rng() * total;
  for (const e of DOJO_REWARD_POOL) { r -= e.w; if (r < 0) return e; }
  return DOJO_REWARD_POOL[0];
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
  const n = (d.cleared || 0) + (clear ? t.bonusDraws : 0);
  for (let i = 0; i < n; i++) { const e = dojoDraw(); add(e.item, e.qty); }
  Object.entries(got).forEach(([id, n]) => { if (ITEMS[id]) addItem(id, n); });
  const list = Object.entries(got).map(([id, n]) => `${ITEMS[id] ? ITEMS[id].name : id} ×${n}`).join('、') || '沒有獎勵';
  state.dojoLast = { tier: t.id, cleared: d.cleared, clear: !!clear, at: gameNow() };
  if (clear) state.dojoBest = Object.assign({}, state.dojoBest, { [t.id]: true });
  logMsg(clear ? `🏆 道館（${t.name}）全破！獲得：${list}。` : `🥋 道館（${t.name}）結束（${why || '中斷'}）：過了 ${d.cleared} 關，獲得：${list}。`);
  if (state.mapId === DOJO_MAP) changeMap(DOJO_TOWN, { party: true });
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
  if (!(state.hp > 0)) return dojoFinish(false, '倒下了');
  if (now > d.endAt) return dojoFinish(false, '時間到');
  if (d.nextAt) { if (now >= d.nextAt) dojoNextFloor(); return; }
  const left = (state.monsters || []).filter(m => MONSTERS[m.defId] && MONSTERS[m.defId].dojo && m.hp > 0);
  if (left.length) return;
  d.cleared = d.floor;
  if (d.floor >= DOJO_FLOORS) return dojoFinish(true);
  logMsg(`✅ 第 ${d.floor} 關通過！${DOJO_NEXT_DELAY_MS / 1000} 秒後下一關。`);
  d.nextAt = now + DOJO_NEXT_DELAY_MS;
}
// 讀檔：道館中斷就照打完的關數抽
function dojoOnLoad() {
  if (state.dojo) {
    const d = state.dojo;
    const t = dojoTier(d.tier);
    state.dojo = null;
    for (let i = 0; t && i < (d.cleared || 0); i++) { const e = dojoDraw(); if (ITEMS[e.item]) addItem(e.item, e.qty); }
  }
  if (state.mapId === DOJO_MAP) state.mapId = DOJO_TOWN;
}
