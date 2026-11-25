/* 三轉技能的引擎掛鉤（使用者 2026-11-24：三轉技能第一批，修羅／皇家禁衛隊／大主教／十字斬首者）。
   engine.js 之後載入；engine.js 只在固定位置呼叫這裡的函式，招式內容全在 js/skills_third.js。

   技能資料的新欄位（倍率照 rAthena src/map/skills/<職業>/*.cpp）：
     spiritCost           氣球體消耗（陣列照等級）；被動技不檢查
     needExplosion        爆氣狀態才能放
     lvDiv                倍率 × BaseLv ÷ lvDiv（rAthena RE_LVL_DMOD）
     ratioOffset          倍率% 起始修正（rAthena 的 skillratio += -100 + …）
     statPre / statPost   倍率% 加「素質 × 係數」，在 BaseLv 縮放之前／之後（baseLevel 也可以）
     tgtLvPre             倍率% 加「目標等級 × 係數」
     markMult / markLvDiv 目標被地雷震標記時改用的倍率
     comboMult            大纏崩墜之後 3 秒內施放時改用的倍率（放完就用掉）
     knuckleAdd           裝備拳套時倍率另加
     boostBy              { skillId, pct }：該 buff 在身上時傷害 +pct%
     markSec              命中的怪標記秒數
     formula              'tigercannon'／'gateofhell'：rAthena 另外寫在 battle.cpp 的特殊算法
     skillPre             { 技能id: k }：倍率% 加 已學等級×k
     statLvPre            { str: 1 }：倍率% 加 素質×技能等級×k
     shieldWeightPre      倍率% 加 盾牌重量×k
     altMult              { skillId, mult, consume }：該 buff 在身上時改用的倍率（consume＝放完拿掉）
     selfMark             放完在身上掛一個標記 buff（秒數照等級），給 altMult 讀
     needRage             需要憤怒還擊（先鋒部隊）
     blindRaces           打到這些種族 50% 黑暗
     needBuff             { skillId, consume }：身上要有這個 buff 才能放（consume＝放完拿掉）
     needCounter          武器抵禦擋下攻擊後 10 秒內才能放
     needRolling          要有迴旋刀刃的旋轉次數（放完歸零，每次 +200%）
     addRolling           放完旋轉次數 +1（上限 10、10 秒）
     chainCast            { id, perLv }：放完有 perLv×Lv% 機率接著免費放 id（黑色幻影 → 十字斬）
     woundPct / woundSec  命中的怪受到傷害 +pct%（首領減半），持續秒數（致命爪痕）
     buffList             （type 'buff_list'）[{ type, val, mult, statLv }]：val 照等級；mult＝val 是百分比倍率；
                          statLv { agi: 60 }＝再加 素質×等級÷60 */
const THIRD_COMBO_MS = 3000;

function thirdStat(k) {
  if (k === 'baseLevel') return state.baseLevel || 1;
  if (k === 'jobLevel') return state.jobLevel || 1;
  const t = state['_total' + k[0].toUpperCase() + k.slice(1)];
  return t != null ? t : ((state.stats && state.stats[k]) || 0);
}
function thirdComboActive() { return gameNow() < (state.suraComboUntil || 0); }
function thirdMarked(mon) { return !!mon && gameNow() < (mon.earthshakerUntil || 0); }
function thirdHasBuff(id) { return state.buffs.some(b => b.skillId === id); }

/* 倍率修正：回傳要乘在 mult 上的係數（mult 已含卡片的技能加成，所以這裡用比例換算） */
function thirdSkillFactor(sk, lv, mon, def) {
  if (!sk.lvDiv && !sk.statPre && !sk.statPost && !sk.formula && !sk.boostBy && !sk.knuckleAdd && !sk.markMult && !sk.comboMult && !sk.altMult) return 1;
  const base = lvArr(sk.mult, lv) || 1;
  let m = base;
  let div = sk.lvDiv;
  if (sk.markMult && thirdMarked(mon)) { m = lvArr(sk.markMult, lv); div = sk.markLvDiv || div; }
  const combo = sk.comboMult && thirdComboActive();
  if (combo) m = lvArr(sk.comboMult, lv);
  if (sk.altMult && thirdHasBuff(sk.altMult.skillId)) m = lvArr(sk.altMult.mult, lv);
  if (sk.knuckleAdd && weaponReqMet('knuckle')) m += lvArr(sk.knuckleAdd, lv);
  let pct = m * 100 + (sk.ratioOffset || 0);
  for (const k in (sk.statPre || {})) pct += thirdStat(k) * sk.statPre[k];
  for (const k in (sk.statLvPre || {})) pct += thirdStat(k) * lv * sk.statLvPre[k];
  for (const k in (sk.skillPre || {})) pct += skillLv(k) * sk.skillPre[k];
  if (sk.shieldWeightPre) { const sh = ITEMS[getEquipBaseItemId('shield')]; pct += ((sh && sh.weight) || 0) * sk.shieldWeightPre; }
  if (sk.formula === 'rageburst') pct = 200 * (state._rageSpent || 0) + Math.max(0, state.maxHp - state.hp) / 100;
  if (sk.tgtLvPre && def) pct += (def.level || 1) * sk.tgtLvPre;
  if (sk.formula === 'tigercannon') {
    // 消耗量 = MaxHP (10+2×Lv)% ＋ MaxSP (5+Lv)%，倍率% = 合計 ÷ 4（大纏崩墜之後 ÷ 2）
    const hp = state.maxHp * (10 + 2 * lv) / 100, sp = state.maxSp * (5 + lv) / 100;
    pct = (hp + sp) / (thirdComboActive() ? 2 : 4);
  }
  if (div) pct *= thirdStat('baseLevel') / div;
  for (const k in (sk.statPost || {})) pct += thirdStat(k) * sk.statPost[k];
  if (sk.needRolling) pct += thirdRolling() * 200;
  let f = Math.max(0, pct / 100) / base;
  if (sk.boostBy && thirdHasBuff(sk.boostBy.skillId)) f *= 1 + sk.boostBy.pct / 100;
  return f;
}
/* 固定傷害（防禦之後加；rAthena 是 ATK_ADD） */
function thirdSkillFlat(sk, lv, mon, def) {
  if (sk.formula === 'tigercannon') {
    const tlv = (def && def.level) || 1;
    return thirdComboActive() ? lv * 500 + tlv * 40 : lv * 240 + tlv * 40;
  }
  if (sk.formula === 'gateofhell') {
    const bonus = 1 + Math.floor(lv * 2 / 10);   // C 的整數除法
    const lost = Math.max(0, state.maxHp - state.hp);
    return Math.round(lost + (thirdComboActive()
      ? state.maxSp * bonus + 40 * thirdStat('baseLevel')
      : state.sp * bonus + 10 * thirdStat('baseLevel')));
  }
  return 0;
}
function thirdSkillOnHit(sk, lv, mon, def) {
  if (sk.markSec && mon && mon.hp > 0) mon.earthshakerUntil = gameNow() + lvArr(sk.markSec, lv) * 1000;
  if (sk.blindRaces && mon && mon.hp > 0 && def && sk.blindRaces.includes(def.race) && rng() < 0.5) applyAilment(mon, def, 'blind');
  if (sk.woundPct && mon && mon.hp > 0) {
    const pct = lvArr(sk.woundPct, lv) * (def && def.isBoss ? 0.5 : 1);
    mon.dmgTakenBoost = 1 + pct / 100; mon.dmgTakenBoostEnd = gameNow() + (sk.woundSec || 20) * 1000;
  }
}
function thirdSkillAfter(sk, lv) {
  if (sk.comboMult) state.suraComboUntil = 0;   // 連段加成用掉
  if (sk.altMult && sk.altMult.consume) state.buffs = state.buffs.filter(b => b.skillId !== sk.altMult.skillId);
  if (sk.selfMark) state.buffs.push({ type: 'mark', mult: 1, flatBonus: 0, msRemaining: lvArr(sk.selfMark, lv) * 1000, skillId: sk.id });
  if (sk.formula === 'rageburst') state._rageSpent = 0;
  if (sk.needBuff && sk.needBuff.consume) state.buffs = state.buffs.filter(b => b.skillId !== sk.needBuff.skillId);
  if (sk.needRolling) state.rolling = 0;
  if (sk.addRolling) { state.rolling = Math.min(10, thirdRolling() + 1); state.rollingUntil = gameNow() + 10000; }
  if (sk.chainCast && rng() * 100 < sk.chainCast.perLv * lv && state.monsters && state.monsters.length) {
    castSkillInner(sk.chainCast.id, { free: true, forceLv: lv });
  }
}
function thirdRolling() { return gameNow() < (state.rollingUntil || 0) ? (state.rolling || 0) : 0; }

/* 施放條件（自動施放先問、castSkillInner 再擋一次） */
function thirdSkillUsable(sk, lv, announce) {
  if (!sk || sk.type === 'passive') return true;
  if (sk.needExplosion && !monkExplosionActive()) {
    if (announce) logMsg(`⚠️ 「${sk.name}」需要爆氣狀態！`);
    return false;
  }
  const need = lvArr(sk.spiritCost, lv) || 0;
  if (need && (state.spirits || 0) < need) {
    if (announce) logMsg(`⚠️ 氣球體不足（需要 ${need} 顆），無法施放「${sk.name}」！`);
    return false;
  }
  if (sk.needBuff && !thirdHasBuff(sk.needBuff.skillId)) {
    if (announce) logMsg(`⚠️ 「${sk.name}」需要「${(SKILLS[sk.needBuff.skillId] || {}).name || sk.needBuff.skillId}」狀態！`);
    return false;
  }
  if (sk.needCounter && gameNow() >= (state._wbCounterUntil || 0)) return false;
  if (sk.needRolling && !(thirdRolling() > 0)) return false;
  if (sk.needRage && !(state.rage > 0)) {
    if (announce) logMsg(`⚠️ 沒有憤怒還擊，無法施放「${sk.name}」！`);
    return false;
  }
  return true;
}
function thirdSkillPay(sk, lv) {
  if (!sk || sk.type === 'passive') return;
  const need = lvArr(sk.spiritCost, lv) || 0;
  if (need) state.spirits = Math.max(0, (state.spirits || 0) - need);
  if (sk.needRage) { state._rageSpent = state.rage || 0; state.rage = 0; }   // 憤怒突擊：全部射出
  if (sk.payItems && skillItemCost(sk, lv)) sagePay(sk.costItems, sk.costQty || 1, sk.goldFallback);
}
/* 潛龍昇天：氣球體上限 5＋Lv */
function thirdSpiritsMax() {
  return thirdHasBuff('sr_raisingdragon') ? 5 + skillLv('sr_raisingdragon') : 0;
}

/* buff_list：一次推多個 buff */
function thirdBuffList(sk, lv) {
  const dur = lvArr(sk.duration, lv) || 60;
  /* castAs：用別的技能（學到的等級，沒學就 1 級）的效果、改成這招的持續時間，放給全隊（慈悲術＝天使之賜福…）。
     放出來的 buff／護盾改掛這招的 id，輔助自動施放才認得「效果還在」。 */
  if (sk.castAs) {
    const b0 = new Set(state.buffs), s0 = new Set(state.shields || []);
    castSkillInner(sk.castAs, { free: true, forceLv: Math.max(1, skillLv(sk.castAs)), override: { party: true, duration: [dur] } });
    state.buffs.forEach(b => { if (!b0.has(b)) b.skillId = sk.id; });
    (state.shields || []).forEach(x => { if (!s0.has(x)) x.id = sk.id; });
    return;
  }
  (sk.exclusive || []).forEach(id => { state.buffs = state.buffs.filter(b => b.skillId !== id); });
  const parts = [];
  for (const e of sk.buffList || []) {
    if (e.lv && e.lv !== lv) continue;
    let v = lvArr(e.val, lv) || 0;
    for (const k in (e.statLv || {})) v += thirdStat(k) * lv / e.statLv[k];
    if (e.calc) v = THIRD_CALC[e.calc](lv);
    const b = { type: e.type, mult: e.mult ? 1 + v / 100 : 1, flatBonus: e.mult ? 0 : v, msRemaining: dur * 1000, skillId: sk.id };
    if (e.type === 'spdrain') { b.spDrainPct = v; b.flatBonus = 0; }
    if (e.type === 'hpregen_sec') { b.hpPctSec = v; b.flatBonus = 0; }
    if (e.type === 'spregen_sec') { b.spPctSec = v; b.flatBonus = 0; }
    if (e.type === 'hpdrain_sec') { b.hpDrainSec = v; b.spDrainPct = e.sp ? lvArr(e.sp, lv) : 0; b.flatBonus = 0; }
    if (e.type === 'ailimmune') { b.ailType = 'all'; b.flatBonus = 0; }
    state.buffs.push(b);
    if (e.label) parts.push(e.label.replace('{v}', Math.round(v * 10) / 10));
  }
  // 潛龍昇天：同時進入爆氣（暴擊照爆氣的數字）
  if (sk.id === 'sr_raisingdragon' && state.explosionSpirits) {
    state.buffs = state.buffs.filter(b => b.skillId !== 'mo_explosionspirits');
    state.buffs.push({ type: 'crit', mult: 1, flatBonus: state.explosionSpirits.critFlat, msRemaining: dur * 1000, skillId: 'mo_explosionspirits' });
  }
  if (sk.cureAll) { state.playerAil = {}; delete state.playerAilTick; }
  recomputeDerived(false);
  if (sk.healFull) state.hp = state.maxHp;
  logMsg(`✨ 「${sk.name}」Lv${lv} 發動！${parts.join('、')}（${dur} 秒）`);
}

/* 每秒：烈火戰車的 SP 消耗、吸氣攻 */
const ASSIMILATE_SP_PCT = 20;   // 吸氣攻：SP 低於 20% 才吸（本作自訂門檻，免得把球吃光）
function tickThirdJob() {
  for (const b of state.buffs) {
    if (b.spDrainPct) state.sp = Math.max(0, state.sp - state.maxSp * b.spDrainPct / 100);
    if (b.hpDrainSec) state.hp = Math.max(1, state.hp - state.maxHp * b.hpDrainSec / 100);
    if (b.hpPctSec && state.hp > 0) state.hp = Math.min(state.maxHp, state.hp + state.maxHp * b.hpPctSec / 100);
    if (b.spPctSec) state.sp = Math.min(state.maxSp, state.sp + state.maxSp * b.spPctSec / 100);
  }
  // 吸氣攻：吸收全部氣球體，每顆回復 1% SP（rAthena status_percent_heal）
  const now = gameNow();
  if (skillLv('sr_assimilatepower') && (state.spirits || 0) > 0 && now >= (state._assimilateAt || 0)
      && state.sp < state.maxSp * ASSIMILATE_SP_PCT / 100) {
    const n = state.spirits;
    state.spirits = 0;
    state.sp = Math.min(state.maxSp, state.sp + Math.round(state.maxSp * n / 100));
    state._assimilateAt = now + lvArr(SKILLS.sr_assimilatepower.internalCooldown, 1) * 1000;
    logMsg(`🌀 「${SKILLS.sr_assimilatepower.name}」吸收 ${n} 顆氣球體，回復 ${n}% SP。`);
  }
}

/* 異常機率加成：點穴-默 +(DEX＋BaseLv)÷10；statDiv { agi: 10, baseLevel: 10 }；onlyLv＝只有這一級附帶 */
function thirdInflictBonus(sk, lv) {
  const f = sk.inflict;
  if (!f) return 0;
  if (f.onlyLv && lv !== f.onlyLv) return -1000;
  let v = f.dexLvDiv ? (thirdStat('dex') + thirdStat('baseLevel')) / f.dexLvDiv : 0;
  for (const k in (f.statDiv || {})) v += thirdStat(k) / f.statDiv[k];
  return v;
}

/* ---------------- 皇家禁衛隊 ---------------- */
const THIRD_CALC = {
  // 威信：DEF +(15×Lv + 10×光之盾Lv)×BaseLv/100、魔法迴避 (INT+LUK)×Lv/20×BaseLv/200 + Lv
  prestigeDef: lv => (15 * lv + 10 * skillLv('cr_defender')) * thirdStat('baseLevel') / 100,
  prestigeEvade: lv => (thirdStat('int') + thirdStat('luk')) * lv / 20 * thirdStat('baseLevel') / 200 + lv,
  // 聚集：身邊有隊友時 DEF +6×Lv（rAthena）
  bandingDef: lv => (allyList().some(a => a && !a._downed && allyOnThisMap(a)) ? 6 * lv : 0),
  // 強化衝擊：下一次普攻 +(150×Lv + 15×JobLv + 武器重量/10×武器等級×BaseLv/100)%
  exeedBreak: lv => {
    const w = ITEMS[getEquipBaseItemId('weapon')] || {};
    return 150 * lv + 15 * thirdStat('jobLevel') + Math.floor((w.weight || 0) / 10) * (w.weaponLv || 1) * thirdStat('baseLevel') / 100;
  },
};
function thirdNextAttackMult() {
  const b = state.buffs.find(x => x.type === 'exeedbreak');
  if (!b) return 1;
  state.buffs = state.buffs.filter(x => x !== b);
  return 1 + b.flatBonus / 100;
}
function thirdMagicEvade() {
  const v = buffMult('magicevade').flatBonus;
  return v > 0 && rng() * 100 < v;
}
/* 先鋒部隊：受到物理傷害時機率累積憤怒還擊（上限 5+2×Lv） */
function thirdRageOnHit() {
  if (!state.buffs.some(b => b.skillId === 'lg_forceofvanguard')) return;
  const lv = skillLv('lg_forceofvanguard');
  if ((state.rage || 0) < 5 + 2 * lv && rng() * 100 < 8 + 12 * lv) state.rage = (state.rage || 0) + 1;
}

/* ---------------- 修羅 ---------------- */
function suraStrike(id, lv, target, monDef, opts) {
  const sk = SKILLS[id];
  const m = lvArr(sk.mult, lv) * thirdSkillFactor(sk, lv, target, monDef);
  return monkStrike(target, monDef, m, Object.assign({ name: sk.name }, opts || {}));
}
/* 雙龍腳（普攻觸發）→ 大纏崩墜（消耗氣球體，開 3 秒連段視窗給虎砲／羅剎破凰擊） */
function suraDragonChain(target, monDef, forced) {
  const dl = skillLv('sr_dragoncombo');
  if (!dl) return;
  const dsk = SKILLS.sr_dragoncombo;
  if (!forced && rng() * 100 >= lvArr(dsk.procChance, dl)) return;
  if (!suraStrike('sr_dragoncombo', dl, target, monDef, { icon: '🐉', suffix: '（2 連擊）' })) return;
  if (!monDef.isBoss && rng() * 100 < lvArr(dsk.stunChance, dl)) applyAilment(target, monDef, 'stun');
  const fl = skillLv('sr_fallenempire');
  if (!fl) return;
  const fsk = SKILLS.sr_fallenempire;
  const cost = forced ? 0 : lvArr(fsk.spiritCost, fl);
  if ((state.spirits || 0) < cost || (!forced && rng() * 100 >= lvArr(fsk.procChance, fl))) return;
  state.spirits -= cost;
  if (!suraStrike('sr_fallenempire', fl, target, monDef, { icon: '🏔️' })) return;
  state.suraComboUntil = gameNow() + THIRD_COMBO_MS;
}
function trySuraProcs(target, monDef) {
  if (!target || target.hp <= 0 || !monDef) return;
  if (isBowWeapon(getEquipBaseItemId('weapon'))) return;   // 近距離普攻才算
  suraEnergyGain();
  suraDragonChain(target, monDef, false);
  thirdDupleLight(target, monDef);
  thirdPoisonWeapon(target, monDef);
}
/* 點穴-球：普攻或受到傷害時機率補 1 顆氣球體 */
function suraEnergyGain() {
  const b = state.buffs.find(x => x.skillId === 'sr_gentletouch_energygain');
  if (!b || !state.spiritsMax || (state.spirits || 0) >= state.spiritsMax) return;
  if (rng() * 100 < 10 + 5 * skillLv('sr_gentletouch_energygain')) state.spirits = (state.spirits || 0) + 1;
}
/* 閃電步：遠程普攻機率無效（內部冷卻） */
function trySuraDodge(mon, monDef) {
  if (thirdWeaponBlock(mon, monDef)) return true;
  const lv = skillLv('sr_lightningwalk');
  if (!lv || monMove(mon).range < RANGED_ATTACK_CELLS) return false;
  const now = gameNow();
  if (now < (state._lightningWalkAt || 0)) return false;
  const chance = thirdStat('jobLevel') / 2 + 40 + 5 * lv;
  if (rng() * 100 >= chance) return false;
  state._lightningWalkAt = now + lvArr(SKILLS.sr_lightningwalk.internalCooldown, lv) * 1000;
  logMsg(`⚡ 「${SKILLS.sr_lightningwalk.name}」！閃過了 ${monDef.name} 的遠程攻擊。`);
  if (typeof showPlayerFloat === 'function') showPlayerFloat('閃電步', 'miss');
  return true;
}
/* 破碎柱：受到近戰普攻時機率反擊（消耗 2 顆氣球體、對首領無效、自己承受反擊傷害的 1/10） */
function trySuraOnHit(mon, monDef, dmg) {
  thirdRageOnHit();
  suraEnergyGain();
  const lv = skillLv('sr_crescentelbow');
  if (!lv || mon.hp <= 0 || monDef.isBoss || monMove(mon).range >= RANGED_ATTACK_CELLS) return;
  const sk = SKILLS.sr_crescentelbow;
  const now = gameNow();
  const cost = lvArr(sk.spiritCost, lv);
  if (now < (state._crescentAt || 0) || (state.spirits || 0) < cost) return;
  if (rng() * 100 >= lvArr(sk.procChance, lv)) return;
  state.spirits -= cost;
  state._crescentAt = now + lvArr(sk.internalCooldown, lv) * 1000;
  // ATK [(目標HP/100)×Lv×BaseLv/125]%（上限 5000%）＋ 受到的傷害×(1＋Lv×0.2)
  const ratio = Math.min(5000, Math.floor(mon.hp / 100) * lv * thirdStat('baseLevel') / 125);
  const hp0 = mon.hp;
  monkStrike(mon, monDef, Math.max(0.01, ratio / 100), { name: sk.name, icon: '🏛️', flat: Math.round(dmg * (1 + lv * 0.2)), suffix: '（反擊）' });
  const dealt = Math.max(0, hp0 - Math.max(0, mon.hp));
  const self = Math.min(Math.floor(dealt / 10), Math.max(0, state.hp - 1));
  if (self > 0) state.hp -= self;
}

const THIRD_SPECIAL = {
  /* 閃光連擊：雙龍腳 → 大纏崩墜 → 虎砲（各自最高等級，連段加成），期間 ATK 上升 */
  sr_flashcombo(sk, lv) {
    const target = state.monsters && state.monsters[0];
    if (!target) return;
    const def = MONSTERS[target.defId];
    state.buffs.push({ type: 'atkflat', mult: 1, flatBonus: lvArr(sk.atkFlat, lv), msRemaining: 3000, skillId: sk.id });
    recomputeDerived(false);
    suraDragonChain(target, def, true);
    if (target.hp > 0 && skillLv('sr_tigercannon')) castSkillInner('sr_tigercannon', { free: true });
  },
};

/* 點穴-快：回復 120×Lv ＋ 目標 MaxHP×Lv%，並解除部分異常狀態 */
function thirdHealAmount(sk, lv, tgt) {
  if (sk.healFormula === 'gentletouch') return Math.round((120 * lv + tgt.maxHp * lv / 100) * healOutputMult() * healRecvMult(tgt));
  // 高階治癒術＝治癒術（學到的等級）×倍數；燦爛聖光＝治癒術的量
  if (sk.healFormula === 'heal') {
    const hl = Math.max(1, skillLv('al_heal'));
    const base = (state.stats.int + state.baseLevel) * lvArr(SKILLS.al_heal.mult, hl);
    return Math.round(base * (lvArr(sk.healMult, lv) || 1) * healOutputMult() * healRecvMult(tgt));
  }
  return null;
}
/* 全隊治癒：同一張圖還站著的隊友各補一份（施術者那份在 heal case 裡已經補了） */
function thirdHealParty(sk, lv, tgt) {
  const owner = allyOwnerState();
  [owner].concat(allyList()).forEach(m => {
    if (!m || m === tgt || m._downed || !(m.hp > 0) || (m !== owner && !allyOnThisMap(m))) return;
    const amt = thirdHealAmount(sk, lv, m) || 0;
    m.hp = Math.min(m.maxHp, m.hp + amt);
  });
}
function thirdCureSelf(sk) {
  const list = playerAilList().filter(t => sk.cureTypes.includes(t));
  list.forEach(t => delete state.playerAil[t]);
  if (list.length) logMsg(`💊 「${sk.name}」解除了：${list.map(t => PLAYER_AILMENTS[t].icon + PLAYER_AILMENTS[t].name).join('、')}`);
}

/* ---------------- 大主教 ---------------- */
/* 二道聖光：近戰普攻時物理、魔法各自 (10+2×Lv)% 機率追加一擊
   物理 ATK (150+15×Lv)%、魔法 聖屬性 MATK (400+40×Lv)%（rAthena duplelight.cpp） */
function thirdDupleLight(target, def) {
  const b = state.buffs.find(x => x.skillId === 'ab_duplelight');
  if (!b || !target || target.hp <= 0) return;
  const lv = skillLv('ab_duplelight') || 1;
  const rate = 10 + 2 * lv;
  if (rng() * 100 < rate && !monkStrike(target, def, (150 + 15 * lv) / 100, { name: '二道聖光（物理）', icon: '✨' })) return;
  if (rng() * 100 < rate) {
    const em = getElementMultiplierVsMonster('holy', def, target);
    const dmg = Math.max(1, Math.round(mitigateDamage(skillBaseDamage(true, def, em) * (400 + 40 * lv) / 100, ...defOf(def, 1, true, target))));
    target.hp -= dmg;
    if (typeof showDamageFloatAt === 'function') showDamageFloatAt(target.id, '-' + dmg, 'normal', 'holy');
    logMsg(`✨ 「二道聖光（魔法）」造成 ${dmg} 點傷害！`);
    if (target.hp <= 0) killMonster(def, target);
  }
}

/* ---------------- 十字斬首者 ---------------- */
/* 武器抵禦：近戰普攻 (10+2×Lv)% 機率完全擋下，之後 10 秒可以放反擊斬與卸除武裝 */
function thirdWeaponBlock(mon, monDef) {
  if (!thirdHasBuff('gc_weaponblocking') || monMove(mon).range >= RANGED_ATTACK_CELLS) return false;
  const lv = skillLv('gc_weaponblocking') || 1;
  if (rng() * 100 >= 10 + 2 * lv) return false;
  state._wbCounterUntil = gameNow() + 10000;
  logMsg(`🗡️ 「武器抵禦」擋下了 ${monDef.name} 的攻擊！`);
  if (typeof showPlayerFloat === 'function') showPlayerFloat('BLOCK', 'miss');
  return true;
}
/* 劇毒武器：近戰普攻 (2+2×Lv)% 機率讓目標中毒 */
function thirdPoisonWeapon(target, def) {
  if (!thirdHasBuff('gc_poisoningweapon') || !target || target.hp <= 0) return;
  const lv = skillLv('gc_poisoningweapon') || 1;
  if (rng() * 100 < 2 + 2 * lv) applyAilment(target, def, 'poison');
}
