/* 攻城戰（T55，使用者 2026-11-13）：非同步攻城，一座城。
   每晚 20:00～22:00 開放（本機時間）。普隆德拉副本區的攻城戰管理員進城：
     沒有城主 → 城裡是弓箭手監護人＋劍士監護人守著華麗金屬
     有城主   → 先打城主的三人組快照（js/actor_battle.js，裝備技能照城主設定、走玩家戰鬥引擎），
                打贏後華麗金屬出現
   打破華麗金屬（HP 100，每下只扣 1）＝佔領：存下自己隊伍的快照，成為新城主。
   城主每天領 10 商城點數。
   傷害：雙方角色互打套 GvG 倍率 GVG_DMG_RATE（rAthena gvg_weapon／magic_damage_rate 60%）。

   **目前城的資料只存在本機**（localStorage，同一台的角色共用，模擬伺服器）。
   換成雲端前要先跟使用者確認（docs/GUILD_WAR_PLAN.md）。
   這個檔案在 actor_battle.js 之後載入。 */
const GVG_CASTLE_NAME = '克利姆希爾德城';
const GVG_MAP = 'gvg_castle_1';
const GVG_TOWN = 'prontera';
const GVG_OPEN_HOUR = 20;
const GVG_CLOSE_HOUR = 22;
const GVG_DMG_RATE = 0.6;
const GVG_DAILY_POINTS = 10;
const GVG_DEFENSE_LIMIT_MS = 5 * 60 * 1000;
const GVG_STORE_KEY = 'ro_idle_castle_1';
const GVG_EMPERIUM_SRC = 'empelium';                      // 華麗金屬（怪物編號 1288）
const GVG_GUARDIAN_SRC = ['bow_guardian', 'sword_guardian'];  // 弓箭手監護人、劍士監護人

if (typeof MAPS !== 'undefined' && !MAPS.some(m => m.id === GVG_MAP)) {
  MAPS.push({ id: GVG_MAP, imgId: 0, name: GVG_CASTLE_NAME, monsters: [], bg: 'map-city', lv: '', arena: true });
}

/* ---- 城的資料（本機） ---- */
function gvgLoad() {
  try { return JSON.parse(localStorage.getItem(GVG_STORE_KEY) || 'null') || {}; } catch (e) { return {}; }
}
function gvgSave(c) { try { localStorage.setItem(GVG_STORE_KEY, JSON.stringify(c)); } catch (e) { /* 存不下就算了 */ } }
function gvgOwner() { return gvgLoad().owner || null; }
function gvgIsOwner(c) {
  const o = (c || gvgLoad()).owner;
  return !!(o && state && String(o.slot) === String(currentSlot) && o.name === state.name);
}

function gvgOpenNow() {
  const h = new Date(gameNow()).getHours();
  return h >= GVG_OPEN_HOUR && h < GVG_CLOSE_HOUR;
}
function gvgBlockReason() {
  if (!gvgOpenNow()) return `攻城時間是每晚 ${GVG_OPEN_HOUR}:00～${GVG_CLOSE_HOUR}:00。`;
  if (state.gmt) return '正在參加吉芬魔法大賽。';
  if (state.vDuel) return '已經在對戰中。';
  if (state.bossChallenge || state.bossHunt) return '正在挑戰或討伐首領。';
  if (!(state.hp > 0)) return '倒下時不能進城。';
  if (gvgIsOwner()) return '你已經是城主了。';
  return null;
}

/* ---- 城裡的怪 ---- */
function gvgSpawn(srcId, d, a, extra) {
  const src = MONSTERS[srcId];
  if (!src) return null;
  const id = 'gvg_' + srcId;
  MONSTERS[id] = Object.assign({}, src, { id, exp: 0, jobExp: 0, drops: [], isVirtual: true }, extra || {});
  if (typeof MOB_MOVE !== 'undefined') MOB_MOVE[id] = Object.assign({}, MOB_MOVE[srcId] || {}, extra && extra.passive ? { immobile: true, aggressive: false } : { aggressive: true });
  state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
  const def = MONSTERS[id];
  const mon = { defId: id, hp: def.hp, maxHp: def.hp, id: state.monsterIdCounter, spawnedAt: gameNow(), d, a };
  state.monsters.push(mon);
  if (!state.monster) state.monster = mon;
  return mon;
}
function gvgSpawnEmperium() {
  const mon = gvgSpawn(GVG_EMPERIUM_SRC, 4, 0, { hp: 100, atk: 0, passive: true, isBoss: false, isMvp: false });
  if (mon) setMonDamageRule(mon, { fixed: 1 });
  state.gvg.phase = 'emperium';
  state.gvg.empId = mon && mon.id;
  logMsg('💎 華麗金屬出現了！打破它就能佔領城堡（每下只扣 1）。');
}

/* ---- 進城、離開 ---- */
function gvgEnter() {
  const why = gvgBlockReason();
  if (why) { logMsg('⚠️ ' + why); return false; }
  if (!changeMap(GVG_MAP, { party: true })) return false;
  state.monsters = []; state.monster = null; state.bossCasts = [];
  const owner = gvgOwner();
  state.gvg = { phase: 'start', enteredAt: gameNow(), empId: null };
  if (owner && owner.snap) {
    state.gvg.phase = 'defenders';
    logMsg(`🏰 ${GVG_CASTLE_NAME}：城主 ${owner.name} 的隊伍守著城！`);
    startActorBattle(owner.snap, { label: '攻城戰', dmgRate: GVG_DMG_RATE, limitMs: GVG_DEFENSE_LIMIT_MS, onEnd: gvgDefendersEnd });
  } else {
    state.gvg.phase = 'guardians';
    logMsg(`🏰 ${GVG_CASTLE_NAME} 還沒有城主，監護人守著華麗金屬。`);
    GVG_GUARDIAN_SRC.forEach((id, i) => gvgSpawn(id, 7 + i, i ? 0.5 : -0.5));
    gvgSpawnEmperium();
  }
  saveGame();
  return true;
}
function gvgDefendersEnd(win, info) {
  if (!state.gvg) return;
  if (win) { gvgSpawnEmperium(); return; }
  gvgExit(`攻城失敗（${info && info.why ? info.why : '敗北'}）`);
}
function gvgExit(why) {
  const g = state.gvg;
  if (!g) return;
  state.gvg = null;
  if (state.vDuel) endVirtualDuel(false, '離開城堡');
  state.monsters = (state.monsters || []).filter(m => !String(m.defId).startsWith('gvg_'));
  state.monster = state.monsters[0] || null;
  if (why) logMsg('🏰 ' + why);
  if (state.mapId === GVG_MAP) changeMap(GVG_TOWN, { party: true });
  saveGame();
}
function gvgLeave() { gvgExit('離開了城堡。'); }

/* 打破華麗金屬：存自己的隊伍快照，成為城主 */
function gvgCapture() {
  const c = gvgLoad();
  const snap = snapshotParty();
  c.owner = { name: state.name, slot: String(currentSlot), snap, since: gameNow() };
  c.history = (c.history || []).concat([{ name: state.name, at: gameNow() }]).slice(-20);
  gvgSave(c);
  _gvgRewardCheckedDay = '';
  logMsg(`🎉 打破了華麗金屬！你成為 ${GVG_CASTLE_NAME} 的城主，你的隊伍會留下來守城。`);
  gvgExit(null);
}

function gvgToday() {
  const d = new Date(gameNow());
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/* 城主每日獎勵：每天第一次上線（或跨日）領一次 */
let _gvgRewardCheckedDay = '';
function gvgDailyReward() {
  const day = gvgToday();
  if (_gvgRewardCheckedDay === day + '|' + currentSlot) return;
  _gvgRewardCheckedDay = day + '|' + currentSlot;
  const c = gvgLoad();
  if (!gvgIsOwner(c)) return;
  if (c.owner.rewardDay === day) return;
  c.owner.rewardDay = day;
  gvgSave(c);
  addCashPoints(GVG_DAILY_POINTS);
  logMsg(`🏰 城主每日獎勵：${GVG_DAILY_POINTS} 商城點數。`);
}

/* 每拍（tickBossFight 呼叫） */
function tickGvg(now) {
  if (!state) return;
  gvgDailyReward();
  const g = state.gvg;
  if (!g) return;
  if (state.mapId !== GVG_MAP) { state.gvg = null; return; }
  if (!gvgOpenNow()) return gvgExit('攻城時間結束了。');
  if (g.phase === 'emperium' && !(state.monsters || []).some(m => m.id === g.empId && m.hp > 0)) gvgCapture();
}
// 讀檔：攻城中斷就放回普隆德拉
function gvgOnLoad() {
  if (state.gvg) state.gvg = null;
  if (state.mapId === GVG_MAP) state.mapId = GVG_TOWN;
}
