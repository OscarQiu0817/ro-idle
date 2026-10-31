/* Renewal 詠唱計算（Phase 1：不接入施放流程）
   依 rAthena RENEWAL_CAST + ntome FCT/VCT 資料。 */
'use strict';

/** @typedef {object} CastModifiers
 *  Phase 2 才從裝備／卡片／狀態填入；Phase 1 預設全 0，不讀 skillCdFlat。
 *  vctPct：變動詠唱 −%（乘法疊加後套用，見 applyVctPctModifiers）
 *  fctPct：固定詠唱 −%（乘法）
 *  fctFlatSec：固定詠唱 −N 秒（在 FCT 百分比之後扣）
 *  perSkillVctPct / perSkillFctPct：單技能 ±%
 *  perSkillVctFlatSec / perSkillFctFlatSec：單技能 ±秒
 */

const CAST_STAT_SCALE = 530; // rAthena battle_config.vcast_stat_scale

function emptyCastModifiers() {
  return {
    vctPct: 0,
    fctPct: 0,
    fctFlatSec: 0,
    vctFlatSec: 0,
    perSkillVctPct: 0,
    perSkillFctPct: 0,
    perSkillVctFlatSec: 0,
    perSkillFctFlatSec: 0,
  };
}

/** 從 getCardBonus 讀詠唱修正（與 skillCdFlat 分軌）。 */
function readCastModifiersFromActor(actor, skillId) {
  if (actor && typeof actor.getCastModifiers === 'function') {
    return Object.assign(emptyCastModifiers(), actor.getCastModifiers(skillId) || {});
  }
  if (typeof getCardBonus !== 'function') return emptyCastModifiers();
  const sid = skillId || '';
  return {
    vctPct: getCardBonus('vctPct') + getCardBonus('vctPct_' + sid),
    fctPct: getCardBonus('fctPct') + getCardBonus('fctPct_' + sid),
    fctFlatSec: getCardBonus('fctFlatSec') + getCardBonus('fctFlatSec_' + sid),
    vctFlatSec: getCardBonus('vctFlatSec') + getCardBonus('vctFlatSec_' + sid),
    perSkillVctPct: 0,
    perSkillFctPct: 0,
    perSkillVctFlatSec: 0,
    perSkillFctFlatSec: 0,
  };
}

function actorDexInt(actor) {
  const dex = actor && (actor.dex != null ? actor.dex : actor.DEX);
  const int = actor && (actor.int != null ? actor.int : actor.INT);
  return { dex: Math.max(0, dex || 0), int: Math.max(0, int || 0) };
}

/** Renewal：VCT × (1 − sqrt((DEX×2+INT)/530))，stat≥530 → 0 */
function applyRenewalStatToVctMs(baseVctMs, dex, int) {
  if (baseVctMs <= 0) return 0;
  const stat = dex * 2 + int;
  if (stat <= 0) return baseVctMs;
  if (stat >= CAST_STAT_SCALE) return 0;
  const factor = 1 - Math.sqrt(stat / CAST_STAT_SCALE);
  return Math.max(0, baseVctMs * factor);
}

/** 變動詠唱 −%：各來源 (1 − p/100) 相乘（rAthena 同類減少採乘法，非加總）。 */
function applyVctPctModifiers(vctMs, mod) {
  let ms = vctMs;
  const pcts = [mod.vctPct, mod.perSkillVctPct].filter(x => x);
  pcts.forEach(p => { ms *= Math.max(0, 1 - p / 100); });
  ms -= (mod.vctFlatSec + mod.perSkillVctFlatSec) * 1000;
  return Math.max(0, ms);
}

/** 固定詠唱 −% 再 −秒（rAthena fixed 路徑）。 */
function applyFctModifiers(fctMs, mod) {
  let ms = fctMs;
  const pcts = [mod.fctPct, mod.perSkillFctPct].filter(x => x);
  pcts.forEach(p => { ms *= Math.max(0, 1 - p / 100); });
  ms -= (mod.fctFlatSec + mod.perSkillFctFlatSec) * 1000;
  return Math.max(0, ms);
}

function baseCastSecAtLv(skill, skillLv, skillId) {
  const id = skillId || (skill && skill.id);
  const lv = Math.max(1, skillLv | 0);
  const pack = (typeof SKILL_CAST !== 'undefined' && id && SKILL_CAST[id])
    || (skill && skill.cast);
  if (!pack) return { fixedSec: 0, variableSec: 0, interrupt: 'instant' };
  const i = Math.min(lv, (pack.fixed || pack.variable || []).length) - 1;
  const idx = i < 0 ? 0 : i;
  const fixedSec = (pack.fixed && pack.fixed[idx]) || 0;
  const variableSec = (pack.variable && pack.variable[idx]) || 0;
  return {
    fixedSec,
    variableSec,
    interrupt: pack.interrupt || 'unknown',
  };
}

/**
 * @param {object} actor — 至少 dex/int；可帶 getCastModifiers(skillId)
 * @param {object} skill — SKILLS 條目
 * @param {number} skillLv — 1-based
 */
function getSkillCastTime(actor, skill, skillLv) {
  const skillId = skill && skill.id;
  const base = baseCastSecAtLv(skill, skillLv, skillId);
  let fixedCastMs = Math.round(base.fixedSec * 1000);
  let variableCastMs = Math.round(base.variableSec * 1000);

  const { dex, int } = actorDexInt(actor);
  variableCastMs = applyRenewalStatToVctMs(variableCastMs, dex, int);

  const mod = readCastModifiersFromActor(actor, skillId);
  variableCastMs = applyVctPctModifiers(variableCastMs, mod);
  fixedCastMs = applyFctModifiers(fixedCastMs, mod);

  const totalCastMs = Math.max(0, fixedCastMs + variableCastMs);
  return {
    fixedCastMs,
    variableCastMs,
    totalCastMs,
    interrupt: base.interrupt,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CAST_STAT_SCALE,
    emptyCastModifiers,
    readCastModifiersFromActor,
    applyRenewalStatToVctMs,
    applyVctPctModifiers,
    applyFctModifiers,
    baseCastSecAtLv,
    getSkillCastTime,
  };
}
