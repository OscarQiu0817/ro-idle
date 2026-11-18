/* ======================================================================
   手操模式（使用者 2026-11-17）：放置＋手操兩種都支援
   - 開啟後玩家自己走位（WASD／搖桿／點地面）、按攻擊、按技能（自動戰鬥 4 格）
   - 不自動追怪、不漫遊、不自動放攻擊技；輔助技、自動喝水照舊；隊友照舊 AI
   - 只在戰鬥地圖、沒趕路、不在攻城戰時生效；城鎮與趕路照放置跑
   - 離線結算走公式，跟手操無關
   - 自動普攻開關（state.manualAutoAtk）：沒在走位就自己追打最近的怪
   ====================================================================== */
function manualActive() {
  return !!(state && state.manualPlay && !_allyActing && !state.travel && !state.gvg && !isInTown());
}
function setManualPlay(on) {
  state.manualPlay = !!on;
  state._manualTargetId = null;
  state._manualChase = false;
  state._manualQueued = null;
  state._manualDir = null;
  state._manualTo = null;
  saveGame();
}
// 走位輸入（boss_fight.js 的打王手動操控也吃同一組欄位）
function manualMoveActive() {
  return manualActive() || (typeof bossManualActive === 'function' && bossManualActive());
}
function manualTarget() {
  const id = state._manualTargetId;
  return id != null ? (state.monsters || []).find(m => m.id === id && m.hp > 0) || null : null;
}
// 目標拉到 monsters[0]：普攻、技能都打第一隻
function manualFocus(m) {
  const ms = state.monsters;
  const i = ms.indexOf(m);
  if (i > 0) { ms.splice(i, 1); ms.unshift(m); }
  state.monster = m;
  state._targetId = m.id;
}
// 沒鎖定就鎖最近的
function manualPickTarget() {
  const cur = manualTarget();
  if (cur) return cur;
  const m = pickGroundTarget();
  state._manualTargetId = m ? m.id : null;
  return m;
}
/* 攻擊鈕：鎖定（或沿用）目標，走過去一直打到牠倒下；搖桿一動就停手 */
function manualAttack(monId) {
  if (!manualActive()) return false;
  if (monId != null && (state.monsters || []).some(x => x.id === monId && x.hp > 0)) state._manualTargetId = monId;   // 點怪：改打這隻
  const m = manualPickTarget();
  if (!m) return false;
  state._manualChase = true;
  state._manualTo = null;
  manualFocus(m);
  return true;
}
/* 範圍技指定落點：場地魔法（暴風雪、隕石…）與場地技（火牆、陷阱、泥沼、冰牆） */
const MANUAL_AIM_TYPES = ['ground_wall', 'ground_trap', 'ground_zone', 'ground_icewall'];
function skillAimable(sk) { return !!sk && (sk.fieldRadius > 0 || MANUAL_AIM_TYPES.includes(sk.type)); }
// 預覽圈半徑（格）
function skillAimRadius(sk, lv) {
  if (sk.fieldRadius) return sk.fieldRadius;
  if (sk.zoneRadius) return sk.zoneRadius;
  const row = skillCastRow(sk.id);
  return (row && castLv(row.splash, lv)) || (sk.wallCells ? sk.wallCells / 2 : 1);
}
// 落點最遠幾格：技能射程，沒有射程資料就 9 格
function skillAimRange(sk, lv) { return skillRangeCells(sk, lv) || 9; }
// 第 i 格能不能瞄準；能的話回 { sk, lv, radius, range }
function manualSlotAim(i) {
  const sl = autoSkillSlots(state.autoSkillConfig)[i];
  const sk = sl && sl.skillId && findSkillForUse(sl.skillId);
  const lv = sk && autoSlotLv(sl, sk);
  if (!lv || !skillAimable(sk)) return null;
  return { sk, lv, radius: skillAimRadius(sk, lv), range: skillAimRange(sk, lv) };
}
/* 技能鈕：第 i 格。打怪的技能沒目標就鎖最近的；射程不夠先走過去，到了再放。回傳失敗原因（空字串＝成功或已排入） */
function manualCastSlot(i, ground) {
  if (!manualActive()) return '不在手操模式';
  if (ground) return manualCastAt(i, ground);
  const sl = autoSkillSlots(state.autoSkillConfig)[i];
  const sk = sl && sl.skillId && findSkillForUse(sl.skillId);
  const lv = sk && autoSlotLv(sl, sk);
  if (!lv) return '這格沒有技能';
  if (!skillReady(sk.id)) return '冷卻中';
  if (!weaponReqMet(sk.requiresWeapon) || !equipReqMet(sk.requiresEquip)) return '裝備不符';
  if (state.sp < skillSpCost(sk, lv)) return 'SP 不足';
  if (skillNeedsMonster(sk)) {
    const m = manualPickTarget();
    if (!m) return '沒有目標';
    manualFocus(m);
    if (!autoSkillInRange(sk, lv)) { state._manualQueued = i; state._manualChase = true; return ''; }
  }
  if (state.casting || gameNow() < (state.acdUntil || 0)) { state._manualQueued = i; return ''; }
  state._manualQueued = null;
  return castSkill(sk.id, lv < skillLv(sk.id) ? { forceLv: lv } : undefined) ? '' : '無法施放';
}
// 排著的技能：到射程、詠唱／後延遲結束就放
function manualTryQueued() {
  const i = state._manualQueued;
  if (i == null || state.casting || gameNow() < (state.acdUntil || 0)) return;
  const sl = autoSkillSlots(state.autoSkillConfig)[i];
  const sk = sl && sl.skillId && findSkillForUse(sl.skillId);
  const lv = sk && autoSlotLv(sl, sk);
  if (!lv || !skillReady(sk.id) || state.sp < skillSpCost(sk, lv)) { state._manualQueued = null; return; }
  if (skillNeedsMonster(sk) && (!manualTarget() || !autoSkillInRange(sk, lv))) return;
  state._manualQueued = null;
  castSkill(sk.id, lv < skillLv(sk.id) ? { forceLv: lv } : undefined);
}
/* 走位：方向（按住）優先，其次點地面的目標點。回傳這拍有沒有在走 */
function tickManualMove(dt) {
  if (playerImmobile() || (state.casting && !(skillLv('sa_freecast') > 0))) return false;
  const step = dt / PLAYER_WALK_MS;
  const dir = state._manualDir;
  if (dir) { state._manualTo = null; playerMoveBy(step, Math.atan2(dir.y, dir.x)); return true; }
  const to = state._manualTo;
  if (!to) return false;
  const d = Math.hypot(to.x, to.y);
  if (d < 0.05) { state._manualTo = null; return false; }
  const s2 = Math.min(d, step), ang = Math.atan2(to.y, to.x);
  playerMoveBy(s2, ang);
  state._manualTo = { x: to.x - Math.cos(ang) * s2, y: to.y - Math.sin(ang) * s2 };
  return true;
}
/* gameTick 每拍（在 playerCombatStep 之前）：走位；一走就停止追打、取消排著的技能 */
function tickManualPlay(dt) {
  if (!manualActive() || (typeof bossManualActive === 'function' && bossManualActive())) return;
  const moving = tickManualMove(dt);
  if (moving) { state._manualChase = false; state._manualQueued = null; }
  state._manualMoving = moving;
  // 自動普攻（使用者 2026-11-18）：停下來就自己鎖最近的怪追打，玩家只管走位、放技能
  if (state.manualAutoAtk && !moving && !state._manualChase) manualAttack();
}
function setManualAutoAtk(on) {
  state.manualAutoAtk = !!on;
  saveGame();
}
/* 取代 playerCombatStep：只打鎖定的目標，按了攻擊才追、才普攻 */
function manualCombatStep(moveDt) {
  const tgt = manualTarget();
  const now = gameNow();
  if (!tgt) {
    state._manualTargetId = null;
    state._manualChase = false;
    state.attackAccumulator = 0;
    state.lastAttackTime = now;
    tickPendingSwing(now);
    return false;
  }
  manualFocus(tgt);
  manualTryQueued();
  if (!state._prevHadMonsters) { state.attackAccumulator = 0; state.lastAttackTime = now; }
  state._prevHadMonsters = true;
  state.attackAccumulator += now - state.lastAttackTime;
  state.lastAttackTime = now;
  const atkInterval = state.attackInterval / Math.max(0.2, 1 + pDebuff('aspdPct') / 100);
  if (!state.casting && !playerImmobile()) tickPassiveProcs(now);
  // 排著技能：走到技能射程；否則走到普攻距離
  let reach = playerAttackRange();
  if (state._manualQueued != null) {
    const sl = autoSkillSlots(state.autoSkillConfig)[state._manualQueued];
    const sk = sl && findSkillForUse(sl.skillId);
    const r = sk ? skillRangeCells(sk, autoSlotLv(sl, sk)) : 0;
    if (r > 0) reach = r;
  }
  const far = Number.isFinite(tgt.d) && tgt.d > reach + DIST_EPS;
  if (!state._manualChase || state.casting || state._manualMoving) state.attackAccumulator = 0;
  else if (far) {
    if (!playerImmobile()) playerMoveBy(Math.min(tgt.d - reach, moveDt / PLAYER_WALK_MS), tgt.a || 0);
    state.attackAccumulator = 0;
  } else if (Number.isFinite(tgt.d) && tgt.d > playerAttackRange() + DIST_EPS) state.attackAccumulator = 0;
  tickPendingSwing(now);
  while (state.attackAccumulator >= atkInterval) {
    state.attackAccumulator -= atkInterval;
    if (playerImmobile()) continue;
    startPlayerSwing(now, atkInterval);
    if (state.monsters.length === 0) break;
  }
  return false;
}
/* 指定落點施放：ground＝{x,y}（格，玩家為原點），超出射程就拉回射程邊緣。不追怪、不排隊 */
function manualCastAt(i, ground) {
  const aim = manualSlotAim(i);
  if (!aim) return manualCastSlot(i);
  const { sk, lv } = aim;
  if (!skillReady(sk.id)) return '冷卻中';
  if (!weaponReqMet(sk.requiresWeapon) || !equipReqMet(sk.requiresEquip)) return '裝備不符';
  if (state.sp < skillSpCost(sk, lv)) return 'SP 不足';
  if (state.casting || gameNow() < (state.acdUntil || 0)) return '詠唱中';
  const d = Math.min(aim.range, Math.hypot(ground.x, ground.y));
  const a = Math.atan2(ground.y, ground.x);
  state._manualQueued = null;
  const opts = { ground: { d, a } };
  if (lv < skillLv(sk.id)) opts.forceLv = lv;
  return castSkill(sk.id, opts) ? '' : '無法施放';
}
