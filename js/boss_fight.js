/* 打王戰鬥模式（T51 第 1 期，使用者 2026-11-12；原型 proto/bossview/）
   首領（迷你王、MVP）在場時：
     - 王照輪替放「紅圈技能」：地上先畫範圍，倒數結束才結算，站在圈裡的人吃傷害（最大 HP 的 %）
     - 隊員看到自己在紅圈裡，過「反應時間」（隨 AGI／DEX 變快）後走到最近的安全點；
       閃避途中不普攻、詠唱中斷
     - 王蓄力（倒數）期間不走、不普攻；原本的 pre-RE 怪物技能在王身上停用

   座標：紅圈存成以玩家為原點的 x／y（格），玩家走路時跟場上其他東西一起平移（playerMoveBy）。
   玩家閃避＝真的走（playerMoveBy）；隊友閃避＝在站位位置上加一個偏移（ally._dodgeOff）。
   這個檔案在 engine.js 之後載入，共用它的全域。 */

/* ---- 通用紅圈技能 ----
   wind：倒數 ms；dmg：最大 HP 的比例；迷你王用前三招，MVP 五招全有 */
const BOSS_SKILLS = {
  charge: { name: '衝撞', wind: 1100, dmg: 0.30 },        // 王到目標的直線，王衝過去
  jump: { name: '彈跳', wind: 1500, dmg: 0.35 },          // 目標腳下的圓，王落在圓心
  bombard: { name: '連環轟炸', wind: 1800, dmg: 0.25 },   // 隊伍周圍數個小圓一起炸
  sweep: { name: '橫掃', wind: 1300, dmg: 0.40 },         // 王前方扇形
  quake: { name: '震地', wind: 1900, dmg: 0.45 },         // 王身邊大圓，或甜甜圈（貼近王才安全）
};
const BOSS_SKILL_SET = { mini: ['charge', 'jump', 'bombard'], mvp: ['charge', 'jump', 'bombard', 'sweep', 'quake'] };
const BOSS_CAST_GAP_MS = [4500, 6000];   // 放完一招到下一招的間隔（隨機）
const BOSS_FIRST_CAST_MS = 2500;         // 王出現後第一招
const DODGE_REACT_BASE_MS = 600, DODGE_REACT_MIN_MS = 250;
const DODGE_SAFE_MARGIN = 0.6;           // 安全點要離紅圈邊緣多遠
const DODGE_SEE_MARGIN = 0.4;            // 離紅圈邊緣多近就算「在裡面」，要躲
const DODGE_RETURN_MS = 400;             // 隊友閃避偏移每格回位所需時間

/* 反應時間：基本 600ms，(AGI＋DEX)／2 每 10 點 −20ms，最低 250ms */
function dodgeReactMs(who) {
  const st = (who && who.stats) || {};
  const avg = ((st.agi || 0) + (st.dex || 0)) / 2;
  return Math.max(DODGE_REACT_MIN_MS, DODGE_REACT_BASE_MS - Math.floor(avg / 10) * 20);
}

function bossFightActive() {
  return !!(state && state.monsters && state.monsters.some(m => { const d = MONSTERS[m.defId]; return d && d.isBoss && m.hp > 0; }));
}

/* ---- 幾何（x／y，以玩家為原點） ---- */
const polarXY = p => ({ x: (p.d || 0) * Math.cos(p.a || 0), y: (p.d || 0) * Math.sin(p.a || 0) });
const xyPolar = (x, y) => ({ d: Math.hypot(x, y), a: Math.atan2(y, x) });
function zoneHas(z, p, margin) {
  const m = margin || 0;
  const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy);
  if (z.type === 'circle') return d <= z.r + m;
  if (z.type === 'donut') return d >= z.r0 - m && d <= z.r1 + m;
  if (z.type === 'cone') {
    if (d > z.len + m) return false;
    let da = Math.atan2(dy, dx) - z.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    return Math.abs(da) <= z.half + (d > 0.01 ? Math.atan(m / d) : Math.PI);
  }
  if (z.type === 'line') {
    const ux = Math.cos(z.ang), uy = Math.sin(z.ang);
    const along = dx * ux + dy * uy, side = -dx * uy + dy * ux;
    return along >= -m && along <= z.len + m && Math.abs(side) <= z.w / 2 + m;
  }
  return false;
}
// 一招可能有好幾個形狀（連環轟炸）：任一個裡面就算
const castHas = (c, p, m) => c.zones.some(z => zoneHas(z, p, m));
function anyZoneHas(p, m) { return (state.bossCasts || []).some(c => castHas(c, p, m)); }

/* 隊員的位置（x／y）：玩家在原點；隊友＝站位位置＋閃避偏移（memberPos 已含偏移） */
function bossMemberXY(m) { return m === allyOwnerState() ? { x: 0, y: 0 } : polarXY(memberPos(m)); }
function bossMembers() {
  const owner = allyOwnerState();
  return [owner].concat((owner.allies || []).filter(a => a && !a._downed && allyOnThisMap(a)));
}

/* ---- 王放技能 ---- */
function bossSkillSet(def) { return def.isMvp ? BOSS_SKILL_SET.mvp : BOSS_SKILL_SET.mini; }
function bossPickTarget() {
  const ms = bossMembers();
  // 定點類打最前排（跟普攻同一個人），偶爾打別人，免得後排永遠安全
  return Math.random() < 0.7 ? frontMember() : ms[Math.floor(Math.random() * ms.length)];
}
/* 念咒拆除（官方 SA_SPELLBREAKER 打斷詠唱、吸 SP）：首領開始詠唱時 4%~20% 機率打斷，回 20~100 SP，每人內部冷卻 15 秒 */
function bossSpellBreak(def, sk, now) {
  for (const m of bossMembers()) {
    const lv = (m.learnedSkills || {}).sa_spellbreaker || 0;
    if (!lv || now < (m._spellBreakAt || 0) || Math.random() * 100 >= 4 * lv) continue;
    m._spellBreakAt = now + 15000;
    m.sp = Math.min(m.maxSp || 0, (m.sp || 0) + 20 * lv);
    logMsg(`🚫 念咒拆除！${m === allyOwnerState() ? '你' : (m.name || '隊友')}打斷了 ${def.name} 的「${sk.name}」，回復 ${20 * lv} SP。`);
    return true;
  }
  return false;
}
/* 地元素領域（官方 SA_LANDPROTECTOR 消除地面技能）：隊上最高等級者讓首領紅圈傷害 −10%~30% */
function landProtectorMult() {
  const lv = Math.max(0, ...bossMembers().map(m => (m.learnedSkills || {}).sa_landprotector || 0));
  return lv ? 1 - (5 + 5 * lv) / 100 : 1;
}
function bossCast(mon, id, now) {
  const def = MONSTERS[mon.defId];
  const sk = BOSS_SKILLS[id];
  if (bossSpellBreak(def, sk, now)) return null;
  const tgt = bossPickTarget();
  const T = bossMemberXY(tgt), B = polarXY(mon);
  const ang = Math.atan2(T.y - B.y, T.x - B.x);
  const zones = [];
  if (id === 'charge') zones.push({ type: 'line', x: B.x, y: B.y, ang, w: 2.4, len: Math.min(12, Math.hypot(T.x - B.x, T.y - B.y) + 2) });
  if (id === 'jump') zones.push({ type: 'circle', x: T.x, y: T.y, r: 2.5 });
  if (id === 'bombard') {
    const ms = bossMembers();
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      // 第一顆一定落在某個隊員身上，其餘散在隊伍附近
      const c = bossMemberXY(ms[i % ms.length]);
      const off = i < ms.length ? 0 : 1 + Math.random() * 3, oa = Math.random() * Math.PI * 2;
      zones.push({ type: 'circle', x: c.x + Math.cos(oa) * off, y: c.y + Math.sin(oa) * off, r: 1.6 });
    }
  }
  if (id === 'sweep') zones.push({ type: 'cone', x: B.x, y: B.y, ang, half: 50 * Math.PI / 180, len: 7 });
  if (id === 'quake') zones.push(Math.random() < 0.5 ? { type: 'circle', x: B.x, y: B.y, r: 5 } : { type: 'donut', x: B.x, y: B.y, r0: 3, r1: 9 });
  // 只存編號不存物件：存檔時 state 會整包 JSON，互相參照會變成循環
  state.bossCastSeq = (state.bossCastSeq || 0) + 1;
  const c = { uid: state.bossCastSeq, id, name: sk.name, monId: mon.id, zones, t0: now, end: now + sk.wind, dmg: sk.dmg, ang };
  (state.bossCasts = state.bossCasts || []).push(c);
  mon._bossCast = c.uid;
  logMsg(`⚠️ ${def.name} 準備施放「${sk.name}」！`);
  return c;
}
/* 倒數結束：圈裡的人吃傷害；衝撞、彈跳讓王移到落點 */
const castMon = c => (state.monsters || []).find(m => m.id === c.monId);
function bossResolve(c) {
  const mon = castMon(c);
  if (!mon) return;
  const def = MONSTERS[mon.defId];
  const hit = [];
  const lpMult = landProtectorMult();
  bossMembers().forEach(m => {
    if (!castHas(c, bossMemberXY(m), 0)) { if (m._sawCast === c.uid) bossNoteDodge(m, true); return; }
    const dmg = Math.max(1, Math.round(m.maxHp * c.dmg * lpMult * (0.9 + Math.random() * 0.2)));
    hit.push(m);
    bossNoteDodge(m, false);
    if (m === allyOwnerState()) bossHurtPlayer(dmg, def, c);
    else allyTakeDamage(m, dmg, def.name);
  });
  // 王移動到落點
  const z = c.zones[0];
  if (c.id === 'charge') Object.assign(mon, xyPolar(z.x + Math.cos(z.ang) * z.len * 0.85, z.y + Math.sin(z.ang) * z.len * 0.85));
  if (c.id === 'jump') Object.assign(mon, xyPolar(z.x, z.y));
  if (!hit.length) logMsg(`✨ 全員閃過了「${c.name}」！`);
  if (mon._bossCast === c.uid) mon._bossCast = null;
}
function bossHurtPlayer(dmg, def, c) {
  dmg = Math.max(1, Math.round(dmg * playerDmgTakenMult()));
  state.hp -= dmg;
  castBreakOnDamage(dmg);
  logMsg(`💥 「${c.name}」對你造成 ${dmg} 點傷害！`);
  if (typeof showPlayerFloat === 'function') showPlayerFloat('-' + dmg, 'element-bad');
  if (state.hp <= 0) {
    state.hp = 0;
    if (tryAutoRevive()) return;
    onPlayerDown();
  }
}
// 閃過／被打中統計（之後的畫面與紀錄用）
function bossNoteDodge(m, dodged) {
  const owner = allyOwnerState();
  const s = owner.bossStats = owner.bossStats || { dodged: 0, hit: 0 };
  if (dodged) s.dodged++; else s.hit++;
  m._sawCast = null;
}

/* ---- 自動閃避 ---- */
function bossSafeSpot(p) {
  for (let r = 0.5; r <= 10; r += 0.5) {
    let best = null, bd = Infinity;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      const q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
      if (anyZoneHas(q, DODGE_SAFE_MARGIN)) continue;
      // 同樣遠的點裡，挑離王比較近的（躲完好回來打）
      const boss = state.monsters.find(m => MONSTERS[m.defId] && MONSTERS[m.defId].isBoss);
      const bd2 = boss ? Math.hypot(q.x - polarXY(boss).x, q.y - polarXY(boss).y) : 0;
      if (bd2 < bd) { bd = bd2; best = q; }
    }
    if (best) return best;
  }
  return null;
}
function bossDodgeTick(m, dt, now) {
  const isOwner = m === allyOwnerState();
  const p = bossMemberXY(m);
  const threat = (state.bossCasts || []).find(c => castHas(c, p, DODGE_SEE_MARGIN));
  if (threat && m._sawCast !== threat.uid) { m._sawCast = threat.uid; m._reactAt = now + dodgeReactMs(m); }
  if (threat && !m._dodgeTo && now >= (m._reactAt || 0)) {
    m._dodgeTo = bossSafeSpot(p);
    if (m._dodgeTo) {
      // 自由施法：閃避不中斷詠唱
      const freeCast = ((m.learnedSkills || {}).sa_freecast || 0) > 0;
      if (freeCast) { /* 邊閃邊唸 */ }
      else if (isOwner) { if (state.casting) interruptCast('閃避'); }
      else if (m.casting) withAlly(m, () => interruptCast('閃避'));
    }
  }
  if (m._dodgeTo) {
    const dx = m._dodgeTo.x - p.x, dy = m._dodgeTo.y - p.y, d = Math.hypot(dx, dy);
    if (d < 0.05 || !threat) { m._dodgeTo = null; return; }
    const step = Math.min(d, dt / PLAYER_WALK_MS);
    if (isOwner) {
      if (!playerImmobile()) {
        playerMoveBy(step, Math.atan2(dy, dx));
        m._dodgeTo = { x: m._dodgeTo.x - dx / d * step, y: m._dodgeTo.y - dy / d * step };   // 世界平移了，目標跟著換算
      }
    } else {
      const o = m._dodgeOff || { x: 0, y: 0 };
      m._dodgeOff = { x: o.x + dx / d * step, y: o.y + dy / d * step };
    }
    return;
  }
  // 沒有威脅：隊友慢慢回到站位位置
  if (!isOwner && m._dodgeOff && !threat) {
    const o = m._dodgeOff, d = Math.hypot(o.x, o.y), back = dt / DODGE_RETURN_MS;
    m._dodgeOff = d <= back ? null : { x: o.x - o.x / d * back, y: o.y - o.y / d * back };
  }
}
/* 閃避中：不普攻、不放技能（engine 的攻擊迴圈與 alliesTick 會問） */
function bossDodging(m) { return !!(m && m._dodgeTo); }

/* ---- 每拍 ---- */
function tickBossFight(dt, now) {
  if (!state || _allyActing) return;
  tickBossChallenge(now);
  tickBossHunt(now);
  const active = bossFightActive() && !state.travel;
  if (!active) {
    if (state.bossCasts && state.bossCasts.length) state.bossCasts = [];
    bossMembers().forEach(m => { m._dodgeTo = null; m._sawCast = null; });
    allyList().forEach(a => { if (a) a._dodgeOff = null; });
    return;
  }
  // 結算到期的紅圈；王死了或離場的紅圈直接消失
  const casts = state.bossCasts = (state.bossCasts || []).filter(c => { const m = castMon(c); return m && m.hp > 0; });
  casts.filter(c => now >= c.end).forEach(bossResolve);
  state.bossCasts = state.bossCasts.filter(c => now < c.end);
  // 王放下一招
  state.monsters.forEach(mon => {
    const def = MONSTERS[mon.defId];
    if (!def || !def.isBoss || mon.hp <= 0 || mon._bossCast) return;
    if (mon.stunnedUntil && now < mon.stunnedUntil) return;
    if (!mon._bossNextAt) { mon._bossNextAt = now + BOSS_FIRST_CAST_MS; mon._bossIdx = 0; return; }
    if (now < mon._bossNextAt) return;
    const set = bossSkillSet(def);
    bossCast(mon, set[(mon._bossIdx++) % set.length], now);
    mon._bossNextAt = now + BOSS_SKILLS[set[(mon._bossIdx - 1) % set.length]].wind + BOSS_CAST_GAP_MS[0] + Math.random() * (BOSS_CAST_GAP_MS[1] - BOSS_CAST_GAP_MS[0]);
  });
  bossMembers().forEach(m => bossDodgeTick(m, dt, now));
}

/* ======================================================================
   第 2 期：在地圖上挑戰（使用者 2026-11-12）
   地圖分頁列出這張圖的迷你王與 MVP，每隻一個「挑戰」按鈕。按下去當場清掉小怪、只剩王與官方護衛，
   時限內打贏＝解鎖（之後這隻王才會出現在這張圖，第 3 期接上）並記錄擊殺時間（沿用 #137 的 bossKills）。
   首次打贏照常給經驗與掉落；之後再挑戰只刷新紀錄，不給獎勵（免得變成無限刷王）。
   ====================================================================== */
const BOSS_CHALLENGE_LIMIT_MS = { mini: 3 * 60 * 1000, mvp: 10 * 60 * 1000 };

function bossUnlocked(defId) { return !!((allyOwnerState().bossUnlocked || {})[defId]); }
/* 這隻王最好的擊殺紀錄（ms），沒打過回 0。各模式（普通／打寶）取最快 */
function bossBestMs(defId) {
  const per = (allyOwnerState().bossKills || {})[defId] || {};
  const xs = Object.values(per).map(r => r && r.bestMs).filter(v => v > 0);
  return xs.length ? Math.min(...xs) : 0;
}
function bossChallengeBlockReason(defId) {
  const map = currentMap();
  const def = MONSTERS[defId];
  if (!def || !def.isBoss) return '沒有這隻首領。';
  if (!map || !(bossListOf(map.id, 'mvp').includes(defId) || bossListOf(map.id, 'mini').includes(defId))) return '這隻首領不在這張地圖。';
  if (isInTown()) return '城裡不能挑戰首領。';
  if (state.travel) return '趕路中不能挑戰，先停下來。';
  if (state.bossChallenge) return '正在挑戰其他首領。';
  if (state.bossHunt) return '正在討伐首領，等討伐結束。';
  if (!(state.hp > 0)) return '倒下時不能挑戰。';
  return null;
}
function startBossChallenge(defId) {
  const why = bossChallengeBlockReason(defId);
  if (why) { logMsg('⚠️ ' + why); return false; }
  const def = MONSTERS[defId];
  const now = Date.now();
  state.monsters = [];
  state.bossCasts = [];
  state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
  const hp = Math.round(def.hp * farmMult('hp'));
  const spot = rollMonsterSpot();
  const mon = { defId, hp, maxHp: hp, id: state.monsterIdCounter, spawnedAt: now, farmMode: farmMode(), d: Math.min(spot.d, 7), a: spot.a, challenge: true };
  state.monsters.push(mon);
  state.monster = mon;
  codexRecordSeen(defId);
  summonBossSlaves(def, mon);
  const kind = def.isMvp ? 'mvp' : 'mini';
  state.bossChallenge = { defId, monId: mon.id, startAt: now, limitMs: BOSS_CHALLENGE_LIMIT_MS[kind], first: !bossUnlocked(defId), mapId: state.mapId };
  logMsg(`⚔️ 挑戰 ${def.icon || ''}${def.name}（${def.isMvp ? 'MVP' : '迷你王'}）！限時 ${Math.round(state.bossChallenge.limitMs / 60000)} 分鐘。`);
  saveGame();
  return true;
}
/* 結束挑戰：清掉剩下的小弟、回到平常打怪 */
function endBossChallenge(win, why) {
  const c = state.bossChallenge;
  if (!c) return;
  state.bossChallenge = null;
  state.bossCasts = [];
  if (state.mapId === c.mapId) { state.monsters = []; state.monster = null; state.lastSpawnTime = Date.now(); }
  const def = MONSTERS[c.defId];
  if (!win) logMsg(`💢 挑戰 ${def.name} 失敗（${why}）。`);
  saveGame();
}
/* killMonster 開頭呼叫：是挑戰中的王就結算挑戰。回傳 true＝這次不給獎勵（重複挑戰），killMonster 直接結束 */
function bossChallengeKill(def, monObj) {
  const c = state.bossChallenge || (_allyActing && allyOwnerState().bossChallenge);
  if (!c || !monObj || monObj.id !== c.monId) return false;
  const owner = allyOwnerState();
  const ms = Date.now() - c.startAt;
  const before = bossBestMs(c.defId);
  if (!owner.bossUnlocked) owner.bossUnlocked = {};
  owner.bossUnlocked[c.defId] = owner.bossUnlocked[c.defId] || Date.now();
  const sec = (ms / 1000).toFixed(1);
  const best = before > 0 && ms < before ? '（新紀錄！）' : '';
  if (c.first) logMsg(`🏆 打倒 ${def.name}！用時 ${sec} 秒。已解鎖：之後在這張圖打怪時牠會出現。`);
  else logMsg(`🏆 打倒 ${def.name}！用時 ${sec} 秒${best}。重複挑戰只刷新紀錄，不給經驗與掉落。`);
  const wasFirst = c.first;
  // 重複挑戰：紀錄照記（killMonster 被提前結束，自己記），獎勵不給
  if (!wasFirst) withOwner(() => recordBossKillTime(owner, monObj.defId, def, monObj));
  withOwner(() => endBossChallenge(true));
  // 首勝照常走 killMonster（倒下動畫在那邊播）；重複挑戰提前結束，動畫在這裡播
  if (!wasFirst && typeof playMonsterDie === 'function') playMonsterDie(monObj.id);
  return !wasFirst;
}
/* 每拍：時限、換圖、倒下 → 失敗 */
function tickBossChallenge(now) {
  const c = state.bossChallenge;
  if (!c) return;
  if (state.mapId !== c.mapId) return endBossChallenge(false, '離開了地圖');
  if (!(state.monsters || []).some(m => m.id === c.monId)) return endBossChallenge(false, '首領不見了');
  if (now - c.startAt > c.limitMs) return endBossChallenge(false, '時間到');
  const boss = state.monsters.find(m => m.id === c.monId);
  if (boss) tickBossSlaveRecall(boss, now);
}
function abandonBossChallenge() { endBossChallenge(false, '放棄'); }

/* ======================================================================
   第 3 期：解鎖＋討伐時間結算（使用者 2026-11-12：打王耗時，就直接拿來當結算）
   野外只出「已解鎖、而且勾了出現」的王（取代 MVP／迷你王模式開關）。
   線上抽中王時不實際打：隊伍進入「討伐中」，清場、完全停下，
   經過這隻王的最佳擊殺時間後照常結算經驗與掉落（跟離線結算同一條規則：#137 的 bestMs）。
   換圖、趕路、回城、倒下＝討伐取消，不給獎勵。
   ====================================================================== */
/* 這隻王在野外會不會出現：解鎖過、而且玩家沒有關掉 */
function bossEnabled(defId) {
  const o = allyOwnerState();
  return bossUnlocked(defId) && (o.bossEnabled || {})[defId] !== false;
}
function setBossEnabled(defId, on) {
  const o = allyOwnerState();
  if (!o.bossEnabled) o.bossEnabled = {};
  o.bossEnabled[defId] = !!on;
  saveGame();
}
/* 討伐要花多久：這隻王在目前打寶模式的最佳紀錄；沒有就用任一模式最佳 × 血量倍率 */
function bossHuntMs(defId) {
  const rec = bossKillRecord(defId, farmMode());
  const ms = rec && (rec.bestMs || rec.lastMs);
  if (ms >= BOSS_KILL_MIN_MS) return ms;
  const any = bossBestMs(defId);
  return any > 0 ? Math.max(BOSS_KILL_MIN_MS, Math.round(any * farmMult('hp'))) : 0;
}
/* spawnMonster 抽中王時呼叫（取代生出一隻真的王）。回傳 true＝已進入討伐 */
function startBossHunt(defId) {
  const ms = bossHuntMs(defId);
  if (!ms) return false;
  const def = MONSTERS[defId];
  const now = Date.now();
  state.monsters = [];
  state.monster = null;
  state.bossCasts = [];
  state.bossHunt = { defId, startAt: now, endAt: now + ms, mapId: state.mapId, farmMode: farmMode() };
  codexRecordSeen(defId);
  logMsg(`⚔️ ${def.icon || ''}${def.name}（${def.isMvp ? 'MVP' : '迷你王'}）出現了！開始討伐，約 ${Math.ceil(ms / 1000)} 秒。`);
  return true;
}
function cancelBossHunt(why) {
  const h = state.bossHunt;
  if (!h) return;
  state.bossHunt = null;
  state.lastSpawnTime = Date.now();
  logMsg(`💢 討伐 ${MONSTERS[h.defId].name} 中斷（${why}），沒有獎勵。`);
}
/* 時間到：照常走 killMonster 結算（經驗、鋅幣、掉落、卡片、圖鑑）。不帶 spawnedAt，所以不會把這次結算記成擊殺紀錄 */
function finishBossHunt() {
  const h = state.bossHunt;
  state.bossHunt = null;
  const def = MONSTERS[h.defId];
  state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
  const hp = Math.round(def.hp * farmMult('hp'));
  const mon = { defId: h.defId, hp: 0, maxHp: hp, id: state.monsterIdCounter, farmMode: h.farmMode, huntSettled: true };
  logMsg(`🏆 討伐完成：${def.name}！`);
  killMonster(def, mon);
  state.lastSpawnTime = Date.now();
}
function tickBossHunt(now) {
  const h = state.bossHunt;
  if (!h) return;
  if (state.mapId !== h.mapId) return cancelBossHunt('離開了地圖');
  if (state.travel) return cancelBossHunt('開始趕路');
  if (isInTown()) return cancelBossHunt('回到城裡');
  if (!(state.hp > 0)) return cancelBossHunt('倒下了');
  if (now >= h.endAt) finishBossHunt();
}
