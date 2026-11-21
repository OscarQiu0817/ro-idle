/* T66 上線隨機事件（使用者 2026-11-21）：只在玩家上線、畫面開著、人在野外時發生；離線結算不算。
   不跳提示、不讓玩家選，畫面上演出來就好。同一時間只有一個事件，平均 10～15 分鐘一次。
     rush     怪物爆走潮：騎大嘴鳥的騎士或十字軍拖一大串怪衝過去，頭上講幾句話，怪留給你
     support  路過的輔助：服事系假人（一轉／二轉／進階二轉）經過，全隊放加速術、天使之賜福、治癒術
     festival 節慶怪：黃金波利一類，限時出現、會逃，每下只扣 1；自動戰鬥把牠排成優先目標，打倒有獎勵
     rescue   求救任務：假人冒險者被怪圍住，限時清掉他身邊的怪，成功給鋅幣
   事件狀態放在記憶體（_live），不進存檔；讀檔後殘留的事件怪由 tickLiveEvents 清掉。
   畫面由 ui.js 的 syncLiveEvents() 讀 liveEventView() 畫。
   這個檔案在 announce.js 之後載入。 */
const LIVE_GAP_MS = [8 * 60000, 15 * 60000];      // 兩個事件之間
const LIVE_FIRST_MS = [3 * 60000, 6 * 60000];     // 上線後第一個
const LIVE_WEIGHTS = { rush: 30, support: 30, festival: 25, rescue: 15 };
const LIVE_WALK_CPS = { rush: 2.6, support: 1.6 };   // 路過的人每秒走幾格
const LIVE_FEST_MS = 30000;
const LIVE_RESCUE_MS = 45000;
const LIVE_FEST_HITS = 12;
const LIVE_FEST_POOL = ['goldporing', 'golden_savage', 'xmas_smokey_gift', 'xmas_smokey_sock', 'poring_'];
const LIVE_RUSH_LINES = ['快閃開！！', '幫我擋一下～', '抱歉抱歉！', '嗚哇怪太多了！', '交給你了！', '我只是想撿個東西…', '這些都送你！'];
const LIVE_PECO_LINES = ['大嘴鳥停不下來啊！', '駕！駕！'];   // 騎大嘴鳥才講
const LIVE_SUPPORT_LINES = ['加油～', '辛苦了！', '順手幫你加個速', '祝你掉卡！', '路過幫個忙', '要好好喝水喔'];
const LIVE_RESCUE_LINES = { help: ['救命啊！', '誰來幫幫我！', '怪好多…'], ok: ['謝謝你！得救了！', '太感謝了，這點心意收下！'], fail: ['嗚…我先回城了…'] };
// 服事系：一轉／二轉／進階二轉，等級越高技能等級越高
const LIVE_SUPPORT_JOBS = [
  { job: 'acolyte', tier: 1, lv: [3, 10], base: 40, int: 40 },
  { job: 'priest', tier: 2, lv: [8, 10], base: 80, int: 80 },
  { job: 'monk', tier: 2, lv: [6, 10], base: 80, int: 40 },
  { job: 'highpriest', tier: 3, lv: [10, 10], base: 99, int: 110 },
  { job: 'champion', tier: 3, lv: [8, 10], base: 99, int: 50 },
];

const _live = { next: 0, cur: null, seq: 0 };

// 什麼時候可以發生：畫面開著、人在野外、沒有在做別的特殊玩法
function liveEventsOn() {
  if (typeof document === 'undefined' || document.hidden) return false;
  return liveFieldOk();
}
function liveFieldOk() {
  if (!state || !(state.hp > 0)) return false;
  const map = typeof currentMap === 'function' ? currentMap() : null;
  if (!map || !(map.monsters || []).length || map.arena) return false;
  if (state.encounterMode === 'off' || state.travel) return false;
  return !(state.dojo || state.gmt || state.gvg || state.bossChallenge || state.bossHunt || state.vDuel);
}
const liveRand = (a, b) => a + rng() * (b - a);
const livePick = list => list[Math.floor(rng() * list.length)];

function tickLiveEvents(now) {
  if (!state) return;
  const ev = _live.cur;
  if (ev) {
    if (!liveFieldOk() || ev.mapId !== state.mapId) return liveEnd(false, true);
    return liveStep(ev, now);
  }
  liveCleanup();
  if (!liveEventsOn()) { _live.next = Math.max(_live.next, now + 30000); return; }
  if (!_live.next) _live.next = now + liveRand(LIVE_FIRST_MS[0], LIVE_FIRST_MS[1]);
  if (now < _live.next) return;
  let r = rng() * Object.values(LIVE_WEIGHTS).reduce((a, b) => a + b, 0), kind = 'rush';
  for (const [k, w] of Object.entries(LIVE_WEIGHTS)) { if ((r -= w) <= 0) { kind = k; break; } }
  startLiveEvent(kind, now);
}
// 讀檔後殘留的事件怪（沒有事件在跑卻帶著事件標記）清掉
function liveCleanup() {
  if (!state.monsters || !state.monsters.some(m => m.liveEv)) return;
  for (let i = state.monsters.length - 1; i >= 0; i--) if (state.monsters[i].liveEv && state.monsters[i].fest) state.monsters.splice(i, 1);
  state.monsters.forEach(m => { delete m.liveEv; delete m.eventPri; delete m.flee; });
  state.monster = state.monsters[0] || null;
}

function startLiveEvent(kind, now) {
  now = now || gameNow();
  const ang = rng() * Math.PI * 2;
  const ev = { kind, id: ++_live.seq, start: now, mapId: state.mapId, ang, wx: state.worldX || 0, wy: state.worldY || 0 };
  _live.cur = ev;
  if (kind === 'rush') liveStartRush(ev);
  else if (kind === 'support') liveStartSupport(ev);
  else if (kind === 'festival') liveStartFestival(ev);
  else liveStartRescue(ev);
  return ev;
}
function liveEnd(ok, quiet) {
  const ev = _live.cur;
  _live.cur = null;
  _live.next = gameNow() + liveRand(LIVE_GAP_MS[0], LIVE_GAP_MS[1]);
  if (!ev) return;
  // 節慶怪沒打到就跑掉；求救失敗的怪留著變一般怪
  if (state.monsters) {
    for (let i = state.monsters.length - 1; i >= 0; i--) {
      const m = state.monsters[i];
      if (m.liveEv !== ev.id) continue;
      if (m.fest) state.monsters.splice(i, 1);
      else { delete m.liveEv; delete m.eventPri; }
    }
    state.monster = state.monsters[0] || null;
  }
  if (!quiet && ev.kind === 'festival' && !ok) logMsg(`💨 ${ev.name}逃走了…`);
}

/* 路過的人：從事件方向的畫面外走進來，穿過玩家身邊，走到另一側離開（世界座標） */
function liveWalkerPos(ev, now) {
  const t = (now - ev.start) / 1000;
  const s = -ev.half + LIVE_WALK_CPS[ev.kind] * t;
  return { x: ev.wx + Math.cos(ev.ang) * s + ev.ox, y: ev.wy + Math.sin(ev.ang) * s + ev.oy, s };
}
function liveWalkerSetup(ev) {
  ev.half = 11;   // 從 11 格外走到 11 格外
  const side = rng() < 0.5 ? 1 : -1;   // 稍微偏一邊，不要直接踩在玩家身上
  ev.ox = -Math.sin(ev.ang) * 1.5 * side;
  ev.oy = Math.cos(ev.ang) * 1.5 * side;
}

/* ---- 怪物爆走潮 ---- */
function liveStartRush(ev) {
  liveWalkerSetup(ev);
  ev.mount = rng() < 0.6;   // 騎大嘴鳥的騎士；不然是十字軍
  const job = ev.mount ? 'lordknight' : 'crusader', gender = rng() < 0.5 ? 'male' : 'female';
  ev.look = { job, gender, hairStyle: 1 + Math.floor(rng() * 20), hairColor: Math.floor(rng() * 9), weaponCat: fakeWeaponCat(job, gender, rng) };
  ev.name = livePick(FAKE_NAMES);
  ev.lines = ev.mount ? LIVE_RUSH_LINES.concat(LIVE_PECO_LINES) : LIVE_RUSH_LINES;
  ev.line = livePick(ev.lines); ev.lineAt = ev.start;
  ev.spawned = false;
}
function liveSpawnRush(ev) {
  const map = currentMap();
  const n = 8 + Math.floor(rng() * 5);
  // 怪從騎士跑來的那一側湧進來，散成一片
  const back = ev.ang + Math.PI;
  for (let i = 0; i < n; i++) {
    const defId = pickWeightedMonster(map.monsters);
    const def = MONSTERS[defId];
    if (!def || def.isBoss) continue;
    const spot = rollMonsterSpot();
    state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
    state.monsters.push({ defId, hp: def.hp, maxHp: def.hp, id: state.monsterIdCounter, spawnedAt: gameNow(),
      bx: spot.bx, by: spot.by, sx: spot.sx, sy: spot.sy, d: liveRand(6, 9), a: back + liveRand(-0.7, 0.7), liveEv: ev.id });
  }
  if (!state.monster) state.monster = state.monsters[0];
  ev.spawned = true;
  logMsg(`🐦 ${ev.name}拖著一大群怪衝了過來！`);
}

/* ---- 路過的輔助 ---- */
function liveStartSupport(ev) {
  liveWalkerSetup(ev);
  const j = livePick(LIVE_SUPPORT_JOBS);
  ev.job = j;
  ev.skLv = Math.round(liveRand(j.lv[0], j.lv[1]));
  const gender = rng() < 0.5 ? 'male' : 'female';
  ev.look = { job: j.job, gender, hairStyle: 1 + Math.floor(rng() * 20), hairColor: Math.floor(rng() * 9), weaponCat: fakeWeaponCat(j.job, gender, rng) };
  ev.name = livePick(FAKE_NAMES);
  ev.line = livePick(LIVE_SUPPORT_LINES); ev.lineAt = ev.start;
  ev.casted = false;
}
// 全隊吃：加速術、天使之賜福、治癒術（官方公式 floor((BaseLv+INT)/8)×(4+8×Lv)）
function liveSupportCast(ev) {
  const lv = ev.skLv;
  const inc = SKILLS.al_incagi, bless = SKILLS.al_blessing;
  const heal = Math.floor((ev.job.base + ev.job.int) / 8) * (4 + 8 * lv);
  const give = () => {
    if (!Array.isArray(state.buffs)) state.buffs = [];
    state.buffs = state.buffs.filter(b => b.skillId !== 'al_incagi' && b.skillId !== 'al_blessing');
    if (inc) {
      const ms = lvArr(inc.duration, lv) * 1000;
      state.buffs.push({ type: 'aspd', mult: lvArr(inc.mult, lv), msRemaining: ms, skillId: 'al_incagi', skillLv: lv });
      state.buffs.push({ type: 'agiflat', mult: 1, flatBonus: lvArr(inc.agiFlatBonus, lv), msRemaining: ms, skillId: 'al_incagi', skillLv: lv });
    }
    if (bless) {
      const ms = lvArr(bless.duration, lv) * 1000, sb = lvArr(bless.statBonus, lv);
      state.buffs.push({ type: 'blessing', strBonus: sb, intBonus: sb, dexBonus: sb, msRemaining: ms, skillId: 'al_blessing', skillLv: lv });
      state.buffs.push({ type: 'hit', mult: 1, flatBonus: lvArr(bless.hitBonus, lv), msRemaining: ms, skillId: 'al_blessing', skillLv: lv });
    }
    recomputeDerived(false);
    state.hp = Math.min(state.maxHp, (state.hp || 0) + heal);
  };
  give();
  if (typeof forEachPartyMate === 'function') forEachPartyMate(() => give());
  ev.casted = true;
  ev.heal = heal;
  logMsg(`✨ 路過的${(JOB_TREE[ev.job.job] || {}).name || '服事'}「${ev.name}」幫全隊放了加速術、天使之賜福 Lv${lv}，治癒 ${heal}！`);
}

/* ---- 節慶怪 ---- */
function liveFestDef(srcId) {
  const src = MONSTERS[srcId];
  if (!src) return null;
  const id = 'fest_' + srcId;
  if (!MONSTERS[id]) {
    MONSTERS[id] = Object.assign({}, src, { id, exp: 0, jobExp: 0, drops: [], isBoss: false, isMvp: false, passive: true, hp: LIVE_FEST_HITS });
    if (typeof MOB_MOVE !== 'undefined' && MOB_MOVE[srcId]) MOB_MOVE[id] = MOB_MOVE[srcId];
  }
  return MONSTERS[id];
}
function liveStartFestival(ev) {
  const pool = LIVE_FEST_POOL.filter(id => MONSTERS[id]);
  const def = pool.length && liveFestDef(livePick(pool));
  if (!def) { _live.cur = null; return; }
  const spot = rollMonsterSpot();
  state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
  const mon = { defId: def.id, hp: LIVE_FEST_HITS, maxHp: LIVE_FEST_HITS, id: state.monsterIdCounter, spawnedAt: gameNow(),
    bx: spot.bx, by: spot.by, sx: spot.sx, sy: spot.sy, d: liveRand(4, 6), a: ev.ang, liveEv: ev.id, fest: true, eventPri: true, flee: true };
  if (typeof setMonDamageRule === 'function') setMonDamageRule(mon, { fixed: 1 });
  state.monsters.push(mon);
  if (!state.monster) state.monster = mon;
  ev.monId = mon.id;
  ev.name = def.name;
  logMsg(`🎉 ${def.name}出現了！快打倒牠！`);
}
function liveFestReward(ev) {
  const lvl = state.baseLevel || 1;
  const z = Math.round(lvl * 120 * liveRand(0.8, 1.2));
  state.gold = (state.gold || 0) + z;
  const got = [`${z.toLocaleString()} 鋅幣`];
  const box = livePick(['old_blue_box', 'old_violet_box', 'old_card_album'].filter(id => ITEMS[id]));
  if (box && rng() < 0.5) { addItem(box, 1); got.push(ITEMS[box].name); }
  if (ITEMS.gacha_shard && rng() < 0.3) { addItem('gacha_shard', 1); got.push(ITEMS.gacha_shard.name); }
  logMsg(`🎁 打倒了${ev.name}！獲得 ${got.join('、')}。`);
}

/* ---- 求救任務 ---- */
function liveStartRescue(ev) {
  const map = currentMap();
  const d = liveRand(4.5, 6);
  ev.nx = (state.worldX || 0) + Math.cos(ev.ang) * d;   // 被圍的假人站的位置（世界座標）
  ev.ny = (state.worldY || 0) + Math.sin(ev.ang) * d;
  ev.look = Object.assign(fakeLook(rng), {});
  ev.name = livePick(FAKE_NAMES);
  ev.line = livePick(LIVE_RESCUE_LINES.help); ev.lineAt = ev.start;
  ev.ids = [];
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const defId = pickWeightedMonster(map.monsters);
    const def = MONSTERS[defId];
    if (!def || def.isBoss) continue;
    // 圍在假人身邊一圈
    const k = (i / n) * Math.PI * 2;
    const x = ev.nx + Math.cos(k) * 1.3 - (state.worldX || 0), y = ev.ny + Math.sin(k) * 1.3 - (state.worldY || 0);
    const spot = rollMonsterSpot();
    state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
    state.monsters.push({ defId, hp: def.hp, maxHp: def.hp, id: state.monsterIdCounter, spawnedAt: gameNow(),
      bx: spot.bx, by: spot.by, sx: spot.sx, sy: spot.sy, d: Math.hypot(x, y), a: Math.atan2(y, x), liveEv: ev.id, eventPri: true, rescue: true });
    ev.ids.push(state.monsterIdCounter);
  }
  if (!state.monster) state.monster = state.monsters[0];
  logMsg(`🆘 ${ev.name}被怪圍住了，正在求救！`);
}
function liveRescueReward() {
  const z = Math.round((state.baseLevel || 1) * 200 + 1000);
  state.gold = (state.gold || 0) + z;
  return z;
}

/* ---- 每秒推進 ---- */
function liveStep(ev, now) {
  const t = now - ev.start;
  if (ev.line && now - ev.lineAt > 2500) {   // 頭上的話每 2.5 秒換一句
    const pool = ev.kind === 'rush' ? ev.lines : ev.kind === 'support' ? LIVE_SUPPORT_LINES : null;
    if (pool) { ev.line = livePick(pool); ev.lineAt = now; }
  }
  if (ev.kind === 'rush' || ev.kind === 'support') {
    const p = liveWalkerPos(ev, now);
    if (ev.kind === 'rush' && !ev.spawned && p.s > -4) liveSpawnRush(ev);
    if (ev.kind === 'support' && !ev.casted && p.s > -1.5) liveSupportCast(ev);
    if (p.s > ev.half) liveEnd(true);
    return;
  }
  if (ev.kind === 'festival') {
    const alive = (state.monsters || []).some(m => m.id === ev.monId && m.hp > 0);
    if (!alive) { liveFestReward(ev); return liveEnd(true); }
    if (t > LIVE_FEST_MS) return liveEnd(false);
    return;
  }
  if (ev.kind === 'rescue') {
    if (ev.result) { if (now - ev.resultAt > 4000) liveEnd(ev.result === 'ok', true); return; }
    const left = (state.monsters || []).filter(m => ev.ids.includes(m.id) && m.hp > 0).length;
    if (!left) {
      const z = liveRescueReward();
      ev.result = 'ok'; ev.resultAt = now; ev.line = livePick(LIVE_RESCUE_LINES.ok);
      logMsg(`🤝 救出了${ev.name}！他塞給你 ${z.toLocaleString()} 鋅幣當謝禮。`);
    } else if (t > LIVE_RESCUE_MS) {
      ev.result = 'fail'; ev.resultAt = now; ev.line = livePick(LIVE_RESCUE_LINES.fail);
      (state.monsters || []).forEach(m => { if (m.liveEv === ev.id) delete m.eventPri; });
    }
  }
}

/* 畫面用：目前要畫的人（世界座標）與頭上的話；沒有就回 null */
function liveEventView() {
  const ev = _live.cur;
  if (!ev || ev.kind === 'festival') return null;
  const now = gameNow();
  if (ev.kind === 'rescue') return { id: ev.id, kind: ev.kind, look: ev.look, name: ev.name, line: ev.line, x: ev.nx, y: ev.ny, walking: !!ev.result, dir: 1, fade: ev.result ? Math.min(1, (now - ev.resultAt) / 4000) : 0 };
  const p = liveWalkerPos(ev, now);
  return { id: ev.id, kind: ev.kind, look: ev.look, mount: !!ev.mount, name: ev.name, line: ev.line, x: p.x, y: p.y, walking: true, dir: Math.cos(ev.ang) >= 0 ? 1 : -1, cast: ev.kind === 'support' && ev.casted && now - ev.start < (ev.half + 2) / LIVE_WALK_CPS.support * 1000 };
}
function liveEventCurrent() { return _live.cur; }
