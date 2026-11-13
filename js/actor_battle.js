/* 隊伍快照與敵對隊伍（T55 前置，方案 B，使用者 2026-11-13）
   攻城戰的守城方＝某位玩家的三人組快照。挑戰時把快照還原成完整角色，**用玩家的戰鬥引擎**打：
   裝備、精煉、卡片、技能、技能格、自動施放、站姿全部照快照，不是換算成怪物。

   做法是「雙世界」：
     我方世界＝平常的 state；敵方三人在這裡是三隻代理怪（actorProxy），只當目標、不出手
     敵方世界＝快照隊長的 state（隊友掛在 allies）；我方三人在那裡是代理怪，一樣只當目標
   每拍先跑我方（gameTick），再把 state 換成敵方世界跑一次戰鬥（playerCombatStep＋隊友），
   兩邊的血量用「這一拍差多少」互相同步：我方打掉的扣到敵方角色，敵方打掉的扣到我方。
   補血、增益各自在自己的世界生效，同步時一起帶過去。
   敵方世界執行時不存檔、不寫日誌、不放畫面特效。

   快照只在本機（攻城原型存 localStorage）；上傳雲端前要先跟使用者確認（見 docs/GUILD_WAR_PLAN.md）。
   這個檔案在 gmt.js 之後載入。 */

const PARTY_SNAPSHOT_VERSION = 1;
// 快照不需要的欄位（背包、倉庫、圖鑑、日誌、錢、進度類）
const PARTY_SNAPSHOT_DROP = ALLY_SNAPSHOT_DROP.concat(['gold', 'cashPoints', 'offlineLog', 'mainQuest', 'gmt', 'gmtLast',
  'vDuel', 'bossChallenge', 'bossHunt', 'bossUnlocked', 'bossKills', 'castle', 'relics', 'instances']);

function snapshotOfActor(st) {
  // 底線開頭的是執行期暫存（治療目標、戰鬥中的參照），會繞成迴圈，一律不存
  const skip = new Set(['allies', 'monsters', 'monster', 'inventory', 'warehouse', 'codex', 'log']);
  const o = JSON.parse(JSON.stringify(st, (k, v) => (k && (k[0] === '_' || skip.has(k)) ? undefined : v)));
  // 只留身上穿的裝備個體（精煉、卡片）
  const inst = {};
  Object.values(st.equip || {}).forEach(ref => { if (ref && st.instances && st.instances[ref]) inst[ref] = st.instances[ref]; });
  PARTY_SNAPSHOT_DROP.forEach(k => { delete o[k]; });
  Object.keys(o).forEach(k => { if (k[0] === '_') delete o[k]; });
  o.name = st.name || st._allyName || '冒險者';
  o.instances = JSON.parse(JSON.stringify(inst));
  return o;
}
/* 玩家＋同一張圖上的隊友。mats＝消耗品與箭矢（照當下數量；技能耗材、自動喝水用） */
function snapshotParty() {
  if (!state) return null;
  const members = [state].concat(allyList().filter(a => a && allyOnThisMap(a)));
  const mats = (state.inventory || [])
    .filter(r => r && !r.instanceId && r.qty > 0 && ITEMS[r.item] && (ITEMS[r.item].type === 'consumable' || ITEMS[r.item].type === 'ammo'))
    .map(r => ({ item: r.item, qty: r.qty }));
  return { v: PARTY_SNAPSHOT_VERSION, takenAt: gameNow(), leader: state.name || '冒險者', members: members.map(snapshotOfActor), mats };
}
/* 還原成一個「世界」：隊長的 state，隊友掛在 allies。mapId 對齊目前地圖 */
function restoreSnapshotParty(snap, mapId) {
  if (!snap || !Array.isArray(snap.members) || !snap.members.length) return null;
  const actors = snap.members.map((raw, i) => buildAllySnapshot(raw, 'snap' + i)).filter(Boolean);
  if (!actors.length) return null;
  const W = actors[0];
  W.allies = actors.slice(1);
  W.mapId = mapId;
  actors.forEach(a => { a._homeMapId = mapId; a._allyName = a.name || a._allyName; });
  W.inventory = (snap.mats || []).map(r => ({ item: r.item, qty: r.qty }));
  W.monsters = []; W.monster = null; W.buffs = W.buffs || []; W.cooldowns = W.cooldowns || {};
  W._lastSlowTick = 0; W._lastMoveTick = 0;
  return W;
}

/* ---------------- 代理怪 ----------------
   一位角色在對面世界的樣子：防禦、迴避、屬性照他算好的數值，外觀走紙娃娃 */
let _actorProxySeq = 0;
function withActorState(st, fn) {
  const saved = state, sa = _allyActing, so = _allyOwnerState;
  state = st; _allyActing = null; _allyOwnerState = null;
  try { return fn(); } finally { state = saved; _allyActing = sa; _allyOwnerState = so; }
}
function actorProxyDef(actor, side, idx) {
  const id = 'actor_' + side + '_' + idx + '_' + (++_actorProxySeq);
  const info = (typeof vfoeJobInfo === 'function' && vfoeJobInfo(actor.jobId)) || null;
  const range = withActorState(actor, () => { try { return playerAttackRange(); } catch (e) { return 1; } });
  const neutral = { none: 100, water: 100, earth: 100, fire: 100, wind: 100, poison: 100, holy: 100, shadow: 100, ghost: 100, undead: 100 };
  const def = {
    id, name: actor.name || actor._allyName || '冒險者', icon: '🧑', imgId: 0,
    level: actor.baseLevel || 1, hp: actor.maxHp || 1, atk: 0,
    def: actor.def || 0, defSoft: actor.defSoft || 0, mdef: actor.mdef || 0, mdefSoft: actor.mdefSoft || 0,
    hit: actor.hit || 0, flee: actor.flee || 0, atkInterval: 999,
    race: 'humanoid', size: 'medium', element: actor.playerElement || 'none', elementResistance: neutral,
    isBoss: false, isMvp: false, isVirtual: true, actorProxy: true, exp: 0, jobExp: 0, drops: [],
    look: {
      job: (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[actor.jobId]) || actor.jobId,
      gender: actor.gender || 'male', hairStyle: actor.hairStyle || 1, hairColor: actor.hairColor || 0,
      hatViews: [0, 0, 0], weaponCat: info ? info.weapon : 'sword1',
    },
  };
  MONSTERS[id] = def;
  if (typeof MOB_MOVE !== 'undefined') {
    MOB_MOVE[id] = { range: Math.max(1, range || 1), walkMs: 150, aggressive: side === 'foe', immobile: side !== 'foe' };
  }
  return def;
}

/* ---------------- 對戰 ----------------
   _actorBattle = { world, foes:[{monId, defId, actor, syncHp, down}], mine:[{ref, def, mon, syncHp}], pend, onEnd } */
let _actorBattle = null;
/* 受到的傷害打折：代理怪的 hp 改成存取器，扣血時只扣 rate 倍（補血不打折）。
   在扣血當下就打折，擊倒判定才會跟著打折後的血量走。
   fixed：每次扣血固定扣這麼多（華麗金屬：每下 1 滴）。 */
function setMonDamageRule(mon, rule) {
  let hp = mon.hp;
  Object.defineProperty(mon, '_hp', { value: hp, writable: true, enumerable: false, configurable: true });
  Object.defineProperty(mon, 'hp', {
    enumerable: true, configurable: true,
    get() { return this._hp; },
    set(v) {
      if (v < this._hp) v = rule.fixed != null ? this._hp - rule.fixed : this._hp - (this._hp - v) * (rule.rate != null ? rule.rate : 1);
      this._hp = v;
    },
  });
}
// 同步用：直接改血量，不經過打折
function setRawHp(mon, v) { if (Object.prototype.hasOwnProperty.call(mon, '_hp')) mon._hp = v; else mon.hp = v; }
const ACTOR_BATTLE_LIMIT_MS = 5 * 60 * 1000;
/* 敵方世界執行時靜音的畫面／音效函式（引擎用 typeof 呼叫的那些） */
const ACTOR_FX_MUTE = ['logMsg', 'playAttackAnim', 'playAttackSound', 'playEventSfx', 'playHitSound', 'playMonsterDie', 'playSkillSound',
  'playStatusSound', 'showComboTotal', 'showDamageFloat', 'showDamageFloatAt', 'showElementFloat', 'showPlayerFloat',
  'showSkillCastEffect', 'showSkillHitNumbers', 'showSkillNameFloat', 'triggerMonsterDie', 'triggerMonsterHit',
  'updatePlayerSprite', 'renderLog', 'renderAll', 'renderMapTab', 'renderMapBackground', 'playMapMusic', 'onTickUI'];
const _noop = () => {};

function actorBattleActive() { return !!_actorBattle; }
function startActorBattle(snap, opts) {
  const o = opts || {};
  const why = typeof virtualDuelBlockReason === 'function' ? virtualDuelBlockReason() : null;
  if (why) { logMsg('⚠️ ' + why); return false; }
  const W = restoreSnapshotParty(snap, state.mapId);
  if (!W) { logMsg('⚠️ 讀不到對手的隊伍資料。'); return false; }
  if (o.noRevive) W.noRevive = true;
  const now = gameNow();
  state.monsters = [];
  state.bossCasts = [];
  const foes = [W].concat(W.allies).map((a, i) => {
    const def = actorProxyDef(a, 'foe', i);
    state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
    const mon = { defId: def.id, hp: a.hp, maxHp: a.maxHp, id: state.monsterIdCounter, spawnedAt: now, d: 6 + i * 1.2, a: -0.4 + i * 0.4, vfoe: true };
    if (o.dmgRate != null) setMonDamageRule(mon, { rate: o.dmgRate });
    state.monsters.push(mon);
    return { monId: mon.id, defId: def.id, actor: a, syncHp: a.hp, down: false };
  });
  const mine = [state].concat(allyList().filter(a => a && allyOnThisMap(a) && !a._downed)).map((m, i) => {
    const def = actorProxyDef(m, 'mine', i);
    const mon = { defId: def.id, hp: m.hp, maxHp: m.maxHp, id: 900000 + i, spawnedAt: now, d: 5 + i * 1.2, a: 0.3 - i * 0.3, vfoe: true };
    if (o.dmgRate != null) setMonDamageRule(mon, { rate: o.dmgRate });
    W.monsters.push(mon);
    return { ref: m, def, mon, syncHp: m.hp };
  });
  W.monster = W.monsters[0];
  state.monster = state.monsters[0];
  state.vDuel = {
    foes: foes.map(f => f.monId), defs: foes.map(f => f.defId).concat(mine.map(p => p.def.id)),
    startAt: now, limitMs: o.limitMs || ACTOR_BATTLE_LIMIT_MS, mapId: state.mapId, label: o.label || '隊伍對戰', actor: true, team: !!o.team,
  };
  _actorBattle = { world: W, foes, mine, pend: null, onEnd: o.onEnd || null };
  logMsg(`⚔️ ${state.vDuel.label}開始：${foes.map(f => MONSTERS[f.defId].name).join('、')}！`);
  return true;
}
// endVirtualDuel 會清掉代理怪（v.defs），這裡收尾並通知呼叫端
if (typeof onVirtualDuelEnd === 'function') {
  onVirtualDuelEnd((win, info) => {
    const B = _actorBattle;
    if (!B) return;
    _actorBattle = null;
    if (B.onEnd) B.onEnd(win, info);
  });
}

function actorBattleHurtFoe(W, actor, dmg) {
  actor.hp = Math.max(0, (actor.hp || 0) - dmg);
  if (actor !== W && actor.hp <= 0) actor._downed = true;
}
function actorBattleHurtMine(member, dmg) {
  if (member === state) {
    state.hp -= dmg;
    if (typeof showPlayerFloat === 'function') showPlayerFloat('-' + dmg, 'element-bad');
    if (state.hp <= 0) {
      state.hp = 0;
      if (!tryAutoRevive()) onPlayerDown();
    }
    return;
  }
  if (!member._downed) allyTakeDamage(member, dmg, '敵方隊伍');
}

/* 敵方世界跑一拍戰鬥 */
function runActorWorldTick(B, now) {
  const W = B.world;
  const saved = state, sa = _allyActing, so = _allyOwnerState, sp = _pendingSwing, ss = _suppressSave;
  const muted = {};
  ACTOR_FX_MUTE.forEach(k => { if (typeof globalThis[k] === 'function') { muted[k] = globalThis[k]; globalThis[k] = _noop; } });
  state = W; _allyActing = null; _allyOwnerState = null; _pendingSwing = B.pend; _suppressSave = true;
  try {
    tickCooldowns(); tickBuffs(); tickAllyBuffs(); tickAllyCooldowns();
    if (now - (W._lastSlowTick || 0) >= 1000) {
      W._lastSlowTick = now;
      if (W.hp > 0) { passiveRegen(); autoUsePotion(); autoUseSpPotion(); tryAutoCastSupportSkills(); tickPlayerAilments(); tickSpirits(); }
      tickAllyRegen();
      alliesTick();
      tickFieldEffects();
    }
    const dt = Math.min(1000, now - (W._lastMoveTick || now));
    W._lastMoveTick = now;
    tickGroundUnits(now);
    tickAllyFormation(dt);
    if (W.hp > 0) tickCasting(now);
    alliesCastTick(now);
    if (W.hp > 0) playerCombatStep(dt);
  } catch (e) {
    if (muted.logMsg) console.error('敵方隊伍出錯', e);
  } finally {
    B.pend = _pendingSwing;
    state = saved; _allyActing = sa; _allyOwnerState = so; _pendingSwing = sp; _suppressSave = ss;
    Object.keys(muted).forEach(k => { globalThis[k] = muted[k]; });
  }
}

/* 每拍（gameTick 最後）：同步血量、跑敵方世界、再同步回來 */
function tickActorBattle(now) {
  const B = _actorBattle;
  if (!B || !state || _allyActing) return;
  if (!state.vDuel || !state.vDuel.actor) { _actorBattle = null; return; }
  const W = B.world;
  // 1. 我方這一拍打掉的 → 扣到敵方角色
  B.foes.forEach(f => {
    if (f.down) return;
    const mon = (state.monsters || []).find(m => m.id === f.monId);
    const cur = mon ? Math.max(0, mon.hp) : 0;
    if (f.syncHp - cur > 0) actorBattleHurtFoe(W, f.actor, f.syncHp - cur);
    if (!mon || (f.actor === W ? W.hp <= 0 : f.actor._downed)) {
      f.down = true;
      if (f.actor === W) W.hp = 0;
      if (mon && mon.hp > 0) { setRawHp(mon, 0); killMonster(MONSTERS[mon.defId], mon); }
    }
  });
  if (!_actorBattle) return;   // 全倒 → endVirtualDuel 已收尾
  // 2. 敵方世界的目標＝我方目前血量；倒下的拿掉、被扶起來的放回去
  B.mine.forEach(p => {
    const m = p.ref;
    const alive = m === state ? state.hp > 0 : !m._downed;
    const inList = W.monsters.includes(p.mon);
    if (!alive) { if (inList) W.monsters = W.monsters.filter(x => x !== p.mon); return; }
    MONSTERS[p.def.id] = p.def;
    setRawHp(p.mon, m.hp); p.mon.maxHp = m.maxHp;
    if (!inList) W.monsters.push(p.mon);
    p.syncHp = m.hp;
  });
  W.monster = W.monsters[0] || null;
  runActorWorldTick(B, now);
  // 3. 敵方這一拍打掉的 → 扣到我方
  B.mine.forEach(p => {
    const m = p.ref;
    const alive = m === state ? state.hp > 0 : !m._downed;
    if (!alive) return;
    const cur = W.monsters.includes(p.mon) ? Math.max(0, p.mon.hp) : 0;
    if (p.syncHp - cur > 0) actorBattleHurtMine(m, p.syncHp - cur);
  });
  if (!_actorBattle || !state.vDuel) return;
  // 4. 敵方的補血、增益 → 代理怪血量
  B.foes.forEach(f => {
    if (f.down) return;
    const mon = state.monsters.find(m => m.id === f.monId);
    if (!mon) return;
    mon.maxHp = f.actor.maxHp;
    setRawHp(mon, Math.min(mon.maxHp, Math.max(1, f.actor.hp)));
    f.syncHp = mon.hp;
  });
}
