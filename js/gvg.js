/* 攻城戰（T55，使用者 2026-11-13）：非同步攻城，一座城。
   每晚 20:00～22:00 開放（台灣時間，跟伺服器同一個鐘）。普隆德拉副本區的攻城戰管理員進城：
     沒有城主 → 城裡是弓箭手監護人＋劍士監護人守著華麗金屬
     有城主   → 先打城主的三人組快照（js/actor_battle.js，裝備技能照城主設定、走玩家戰鬥引擎），
                打贏後華麗金屬出現
   打破華麗金屬（HP 100，每下只扣 1）＝佔領：存下自己隊伍的快照，成為新城主。
   城主每天領 10 商城點數。
   傷害：雙方角色互打套 GVG_DMG_RATE（0.3）。
   倒下就出局、沒有復活（原版倒下就離開地圖）；我方三人全倒才算輸，玩家先倒下時隊友繼續打。

   城主資料存在雲端（world-chat `/castle/get`、`/castle/capture`，使用者 2026-11-13 確認）：
     沒登入雲端帳號不能攻城；進城前下載城主快照，打破華麗金屬時上傳自己的快照（帶進城時的 version，
     這中間有人先佔領就失敗）。勝負不做伺服器驗證（單機遊戲，先把外框建起來）。
   這個檔案在 actor_battle.js 之後載入。 */
const GVG_CASTLE_NAME = '克利姆希爾德城';
const GVG_MAP = 'gvg_castle_1';
const GVG_TOWN = 'prontera';
const GVG_OPEN_HOUR = 20;
const GVG_CLOSE_HOUR = 22;
const GVG_DMG_RATE = 0.3;   // 使用者 2026-11-13：0.6 時三人隊 5～6 秒分勝負，改 0.3
const GVG_DAILY_POINTS = 10;
const GVG_DEFENSE_LIMIT_MS = 5 * 60 * 1000;
const GVG_CASTLE_ID = 'castle_1';
const GVG_REFRESH_MS = 10 * 60 * 1000;   // 城主資料多久重抓一次（每日獎勵、NPC 面板用）
const GVG_EMPERIUM_SRC = 'empelium';                      // 華麗金屬（怪物編號 1288）
const GVG_GUARDIAN_SRC = ['bow_guardian', 'sword_guardian'];  // 弓箭手監護人、劍士監護人

if (typeof MAPS !== 'undefined' && !MAPS.some(m => m.id === GVG_MAP)) {
  MAPS.push({ id: GVG_MAP, imgId: 0, name: GVG_CASTLE_NAME, monsters: [], bg: 'map-city', lv: '', arena: true });
}

/* ---- 城的資料（雲端） ----
   _gvgCastle：最後一次 /castle/get 的結果 { castle, at }；castle＝null 是沒有城主。 */
let _gvgCastle = null;
let _gvgFetching = false;
function gvgToken() { const c = typeof cloudConf === 'function' ? cloudConf() : null; return c && c.token ? c.token : null; }
function gvgCastle() { return _gvgCastle ? _gvgCastle.castle : null; }
function gvgOwner() { const c = gvgCastle(); return c ? { name: c.name, slot: c.slot, since: c.since, snap: c.snap } : null; }
function gvgIsOwner() {
  const c = gvgCastle();
  return !!(c && c.mine && state && String(c.slot) === String(currentSlot) && c.name === state.name);
}
async function gvgRefresh() {
  const token = gvgToken();
  if (!token || _gvgFetching) return null;
  _gvgFetching = true;
  try {
    const r = await cloudPost('/castle/get', { token, castleId: GVG_CASTLE_ID });
    if (r.status !== 200) return null;
    const c = r.data.castle;
    if (c) { try { c.snap = JSON.parse(c.snapshot); } catch (e) { c.snap = null; } }
    _gvgCastle = { castle: c || null, at: gameNow() };
    return _gvgCastle;
  } catch (e) {
    return null;
  } finally { _gvgFetching = false; }
}

function gvgOpenNow() {
  const h = new Date(gameNow() + 8 * 3600000).getUTCHours();   // 台灣時間（UTC+8）
  return h >= GVG_OPEN_HOUR && h < GVG_CLOSE_HOUR;
}
function gvgBlockReason() {
  if (!gvgToken()) return '攻城要先登入雲端帳號（標題畫面的雲端存檔）。';
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

/* ---- 進城、離開 ----
   進城前先跟雲端拿最新的城主資料（非同步），拿不到就不進城 */
async function gvgEnter() {
  let why = gvgBlockReason();
  if (why) { logMsg('⚠️ ' + why); return false; }
  logMsg('🏰 讀取城主資料…');
  if (!(await gvgRefresh())) { logMsg('⚠️ 連不上雲端，稍後再試。'); return false; }
  why = gvgBlockReason();
  if (why) { logMsg('⚠️ ' + why); return false; }
  if (!changeMap(GVG_MAP, { party: true })) return false;
  state.monsters = []; state.monster = null; state.bossCasts = [];
  const owner = gvgOwner();
  const castle = gvgCastle();
  state.gvg = { phase: 'start', enteredAt: gameNow(), empId: null, baseVersion: castle ? castle.version : 0 };
  if (owner && owner.snap) {
    state.gvg.phase = 'defenders';
    logMsg(`🏰 ${GVG_CASTLE_NAME}：城主 ${owner.name} 的隊伍守著城！`);
    startActorBattle(owner.snap, { label: '攻城戰', dmgRate: GVG_DMG_RATE, limitMs: GVG_DEFENSE_LIMIT_MS, team: true, noRevive: true, onEnd: gvgDefendersEnd });
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
  if (!(state.hp > 0)) { state.hp = state.maxHp; state.sp = state.maxSp; }   // 倒下的人被送出城、在城裡療傷
  if (why) logMsg('🏰 ' + why);
  if (state.mapId === GVG_MAP) changeMap(GVG_TOWN, { party: true });
  saveGame();
}
function gvgLeave() { gvgExit('離開了城堡。'); }

/* 打破華麗金屬：上傳自己的隊伍快照，成為城主（帶進城時的 version，這中間有人先佔領就失敗） */
const GVG_CAPTURE_ERRORS = {
  VERSION_CONFLICT: '有人比你先佔領了這座城。', CASTLE_CLOSED: '攻城時間已經結束。',
  INVALID_SNAPSHOT: '隊伍資料超出範圍，佔領失敗。', INVALID_TOKEN: '雲端登入已失效，請重新登入。',
};
function gvgCapture() {
  const g = state.gvg;
  if (!g || g.capturing) return;
  g.capturing = true;
  const token = gvgToken();
  const snap = snapshotParty();
  const name = state.name, slot = String(currentSlot);
  logMsg('💎 打破了華麗金屬！上傳隊伍資料中…');
  const done = msg => { if (state && state.gvg === g) gvgExit(msg); };
  if (!token) return done('沒有登入雲端帳號，佔領失敗。');
  cloudPost('/castle/capture', { token, castleId: GVG_CASTLE_ID, name, slot, snapshot: JSON.stringify(snap), baseVersion: g.baseVersion })
    .then(r => {
      if (r.status === 200) {
        _gvgCastle = { castle: { name, slot, mine: true, snap, since: r.data.since, version: r.data.version }, at: gameNow() };
        logMsg(`🎉 你成為 ${GVG_CASTLE_NAME} 的城主，你的隊伍會留下來守城。`);
        return done(null);
      }
      done(GVG_CAPTURE_ERRORS[r.data.error] || cloudErr(r.data.error));
    })
    .catch(() => done('連不上雲端，佔領失敗。'));
}

function gvgToday() {
  const d = new Date(gameNow() + 8 * 3600000);   // 台灣時間
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
/* 城主每日獎勵：城主資料每 10 分鐘重抓一次；是城主（同帳號、同欄位、同名字）且今天還沒領就發。
   領取紀錄存在角色自己的存檔（state.gvgRewardDay）。 */
function gvgDailyReward() {
  if (!gvgToken()) return;
  if ((!_gvgCastle || gameNow() - _gvgCastle.at > GVG_REFRESH_MS) && !_gvgFetching) {
    if (!_gvgCastle) _gvgCastle = { castle: null, at: gameNow() - GVG_REFRESH_MS + 30000 };   // 失敗時 30 秒後再試
    gvgRefresh();
    return;
  }
  const day = gvgToday();
  if (state.gvgRewardDay === day || !gvgIsOwner()) return;
  state.gvgRewardDay = day;
  addCashPoints(GVG_DAILY_POINTS);
  logMsg(`🏰 城主每日獎勵：${GVG_DAILY_POINTS} 商城點數。`);
  saveGame();
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
/* 玩家倒下：留在城裡，隊友還站著就繼續；全倒才算輸。回傳 true＝已處理 */
function gvgOnPlayerDown() {
  state.hp = 0;
  if (allyAliveList().length) { logMsg('💀 你倒下了！隊友繼續作戰（攻城中沒有復活）。'); return true; }
  gvgExit('攻城失敗（全隊倒下）。');
  return true;
}
/* 玩家倒下後的每拍：隊友、怪物、敵方隊伍照跑 */
function gvgDownedTick() {
  const now = gameNow();
  if (!allyAliveList().length) return gvgExit('攻城失敗（全隊倒下）。');
  if (now - (state._lastSlowTick || 0) >= 1000) { state._lastSlowTick = now; tickAllyRegen(); alliesTick(); }
  const dt = Math.min(1000, now - (state._lastMoveTick || now));
  state._lastMoveTick = now;
  tickMonsterMovement(dt, now);
  tickAllyFormation(dt);
  tickBossFight(dt, now);
  if (!state.gvg) return;
  alliesCastTick(now);
  (state.monsters || []).forEach(mon => {
    const d = MONSTERS[mon.defId];
    if (!d || d.actorProxy || d.passive) return;
    if (!mon.lastAttackTime) mon.lastAttackTime = now;
    if (!monInRange(mon) || mon._bossCast) { mon.lastAttackTime = now; return; }
    if (now - mon.lastAttackTime >= (d.atkInterval || 1) * 1000) { mon.lastAttackTime = now; monsterAttackSingle(mon); }
  });
  tickActorBattle(now);
  if (typeof onTickUI === 'function') onTickUI();
}
// 讀檔：攻城中斷就放回普隆德拉
function gvgOnLoad() {
  if (state.gvg) state.gvg = null;
  if (state.mapId === GVG_MAP) state.mapId = GVG_TOWN;
}
