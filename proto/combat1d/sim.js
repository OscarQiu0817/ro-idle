/* 一維距離戰鬥原型（docs/GAMEPLAY_DIRECTION.md 工作 1）
   - 玩家在原點，怪只記距離 d（格，連續值）
   - 詠唱：VCT × max(0, 1 − √((DEX×2+INT)/530)) + FCT；受擊打斷（CastCancel / 不可中斷除外）
   - 4 招優先序；傷害公式為簡化版，只用來看節奏 */
/* Node：require data.json；瀏覽器（demo.html）：先把 data.json 放到 window.COMBAT1D_DATA 再載入本檔 */
const IS_NODE = typeof module !== 'undefined' && module.exports;
const DATA = IS_NODE ? require('./data.json') : window.COMBAT1D_DATA;

const TICK = 50;
const PLAYER_MOVE_MS = 150;       // 玩家每格毫秒（rAthena DEFAULT_WALK_SPEED）
const MAX_D = 14;
const REGEN_HP_MS = 6000;
const REGEN_SP_MS = 8000;
const DEATH_DOWNTIME_MS = 10000;
const FIREWALL_HITS = 12;         // Lv10：lv+2（rAthena skill_unitsetting，不在 skill_db）
const FIREWALL_CELLS = 3;         // 牆寬（格）；方向角模式下蓋住的角度 ≈ 寬 ÷ 距離
const FIREWALL_RATIO = 0.5;
const THUNDERSTORM_RATIO = 0.8;

/* 技能傷害倍率：Renewal 約略值（skill_db 不含倍率，正式版需對照 rAthena battle.cpp） */
const SKILL_RATIO = {
  SM_BASH: lv => 1 + 0.3 * lv,
  SM_MAGNUM: lv => 1 + 0.2 * lv,
  KN_BOWLINGBASH: lv => (40 + 50 * lv) / 100,   // 每段
  AC_DOUBLE: lv => (90 + 10 * lv) / 100,       // 每段
  AC_SHOWER: lv => (150 + 10 * lv) / 100,
  MG_FIREBOLT: () => 1,                        // 每段
  MG_THUNDERSTORM: () => THUNDERSTORM_RATIO,   // 每段
};

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function lvVal(arr, lv) { return arr ? arr[lv - 1] : 0; }

function createSim(cfg) {
  const R = rng(cfg.seed || 1);
  /* angular：怪多記方向角 a（出生時決定，沿自己的方向直線走向玩家）。
     開啟後範圍技用平面距離、火牆只擋蓋到的弧；關閉時退回純距離（火牆一整圈）。 */
  const ANGULAR = !!cfg.angular;
  const RULE = cfg.interruptRule || 'any';   // any＝官方 / melee＝只有近戰打斷 / pushback＝受擊延長 20% / none
  const map = DATA.maps.find(m => m.id === cfg.mapId);
  if (!map) throw new Error('unknown map ' + cfg.mapId);
  const P = cfg.player;
  const st = P.stats;
  const melee = P.weaponRange <= 2;
  const statusAtk = (melee ? st.str + st.dex / 5 : st.dex + st.str / 5) + st.luk / 3 + P.lv / 4;
  const weaponAtk = P.watk * (1 + (melee ? st.str : st.dex) / 200);
  const atk = statusAtk * 2 + weaponAtk;
  const matk = st.int * 1.5 + st.dex / 5 + st.luk / 3 + P.lv / 4 + P.wmatk * (1 + st.int / 200);
  const hit = 175 + P.lv + st.dex + st.luk / 3;
  const flee = 100 + P.lv + st.agi + st.luk / 5;

  const S = {
    t: 0,
    hp: P.maxHp, sp: P.maxSp,
    cast: null, acdUntil: 0, actUntil: 0, cd: {},
    deadUntil: 0,
    mobs: [], walls: [],
    nextSpawn: 0, nextHpRegen: REGEN_HP_MS, nextSpRegen: REGEN_SP_MS, hpPotReadyAt: 0, spPotReadyAt: 0, kiting: false, kiteStart: 0, kiteCdUntil: 0,
    m: { kills: 0, dmgTaken: 0, dmgDealt: 0, casts: 0, castsTimed: 0, interrupts: 0, deaths: 0,
      hpPots: 0, spPots: 0, castMs: 0, idleMs: 0, moveMs: 0, wallHits: 0, skillUse: {} },
    log: cfg.trace ? [] : null,
  };
  /* 給畫面層用的事件（demo.html）；Node 跑數據時不設 */
  const emit = cfg.onEvent || (() => {});
  let uid = 0;
  const trace = msg => { if (S.log && S.t < cfg.trace) S.log.push((S.t / 1000).toFixed(2) + 's ' + msg); };

  function spawn() {
    const total = map.spawns.reduce((a, s) => a + s.weight, 0);
    let r = R() * total;
    const pick = map.spawns.find(s => (r -= s.weight) < 0) || map.spawns[0];
    const def = DATA.mobs[pick.mob];
    const mob = { uid: ++uid, def, hp: def.hp, d: 6 + R() * 4, a: R() * Math.PI * 2, aggro: def.aggressive, moveAcc: 0,
      nextAtk: 0, flinchUntil: 0 };
    S.mobs.push(mob);
    emit('spawn', { mob });
  }

  function hitChance(attHit, defFlee) { return Math.min(1, Math.max(0.05, (80 + attHit - defFlee) / 100)); }

  function physDmg(mob, ratio) {
    const v = 0.9 + R() * 0.2;
    const hardDef = (4000 + mob.def.def) / (4000 + 10 * mob.def.def);
    return Math.max(1, Math.floor(atk * ratio * v * hardDef - mob.def.vit / 2));
  }
  function magDmg(mob, ratio) {
    const v = 0.9 + R() * 0.2;
    const hardMdef = (1000 + mob.def.mdef) / (1000 + 10 * mob.def.mdef);
    return Math.max(1, Math.floor(matk * ratio * v * hardMdef - mob.def.int / 2));
  }

  function damageMob(mob, dmg, tag) {
    mob.hp -= dmg;
    mob.aggro = true;
    mob.flinchUntil = S.t + mob.def.damageMotion;
    S.m.dmgDealt += dmg;
    emit('mobHit', { mob, dmg, tag });
    if (mob.hp <= 0) { trace('擊殺 ' + mob.def.name + '（' + tag + '）'); emit('kill', { mob }); }
  }

  function knockback(mob, n) { if (n && !mob.def.boss) mob.d = Math.min(MAX_D, mob.d + n); }

  function nearest() {
    let best = null;
    for (const m of S.mobs) if (m.hp > 0 && (!best || m.d < best.d)) best = m;
    return best;
  }
  const angDiff = (a, b) => { const x = Math.abs(a - b) % (Math.PI * 2); return x > Math.PI ? Math.PI * 2 - x : x; };
  /* 兩點距離：方向角模式用餘弦定理，否則只比距離差 */
  function dist(p, q) {
    if (!ANGULAR) return Math.abs(p.d - q.d);
    return Math.sqrt(Math.max(0, p.d * p.d + q.d * q.d - 2 * p.d * q.d * Math.cos(angDiff(p.a, q.a))));
  }
  const ORIGIN = { d: 0, a: 0 };
  const near = (pt, radius) => S.mobs.filter(m => m.hp > 0 && dist(m, pt) <= radius + 1e-9);
  const wallCovers = (w, m) => !ANGULAR || angDiff(w.a, m.a) <= w.half;

  /* ---- 技能 ---- */
  function skillDef(id) { return DATA.skills[id]; }
  function skillRange(sk, lv) {
    const r = lvVal(sk.range, lv);
    if (r == null) return 0;
    return Math.abs(r);
  }
  function castTimeMs(sk, lv) {
    const statFactor = Math.max(0, 1 - Math.sqrt((st.dex * 2 + st.int) / 530));
    return Math.round(lvVal(sk.castTime, lv) * statFactor + lvVal(sk.fixedCastTime, lv));
  }

  /* 找出可施放的目標；回傳 null 代表條件不成立 */
  function planSkill(slot) {
    const sk = skillDef(slot.id);
    const lv = slot.lv;
    if (S.sp < lvVal(sk.spCost, lv)) return null;
    if ((S.cd[slot.id] || 0) > S.t) return null;
    const tgt = nearest();
    if (!tgt) return null;
    const c = slot.cond || {};
    if (sk.target === 'Self') {
      const hits = near(ORIGIN, lvVal(sk.splash, lv));
      if (hits.length < (c.minMobs || 1)) return null;
      return { center: ORIGIN };
    }
    if (slot.id === 'MG_FIREWALL') {
      const active = S.walls.filter(w => w.hits > 0 && w.until > S.t);
      if (active.length >= 3) return null;
      const threats = S.mobs.filter(m => m.hp > 0 && m.aggro && m.def.range <= 3
        && m.d < (P.wallTriggerD || 6) && !active.some(w => wallCovers(w, m) && w.d < m.d));
      if (!threats.length) return null;
      const nearestThreat = threats.reduce((a, b) => (a.d < b.d ? a : b));
      // 已貼身的怪：牆直接放在牠腳下（放下時擊退）
      const w = nearestThreat.d <= 1.5 ? Math.max(1, nearestThreat.d) : Math.min(3, nearestThreat.d - 0.5);
      const half = ANGULAR ? Math.min(Math.PI, FIREWALL_CELLS / 2 / w) : Math.PI;
      // 對準最多來襲怪的方向（方向角模式）
      let aim = nearestThreat.a, best = 0;
      if (ANGULAR) for (const t of threats.filter(x => x.d > 1.5 || x === nearestThreat)) {
        const n = threats.filter(x => angDiff(x.a, t.a) <= half).length;
        if (n > best) { best = n; aim = t.a; }
      }
      return { center: { d: w, a: aim }, half };
    }
    if (tgt.d > skillRange(sk, lv) + 1e-9) return null;
    const radius = sk.unit && sk.unit.range ? lvVal(sk.unit.range, lv) : (lvVal(sk.splash, lv) || 0);
    if (radius && near(tgt, radius).length < (c.minMobs || 1)) return null;
    return { center: { d: tgt.d, a: tgt.a }, target: tgt };
  }

  function executeSkill(id, lv, plan) {
    const sk = skillDef(id);
    // SP 與冷卻在放出時才結算（被打斷不扣）
    if (S.sp < lvVal(sk.spCost, lv)) return;
    S.sp -= lvVal(sk.spCost, lv);
    S.cd[id] = S.t + lvVal(sk.cooldown, lv);
    S.m.skillUse[id] = (S.m.skillUse[id] || 0) + 1;
    trace('施放 ' + id);
    emit('skill', { id, plan });
    if (id === 'MG_FIREWALL') {
      const wall = { d: plan.center.d, a: plan.center.a, half: plan.half, hits: FIREWALL_HITS, until: S.t + lvVal(sk.duration, lv) };
      S.walls.push(wall);
      for (const m of S.mobs) {   // 站在牆上的怪立刻吃一下、被擊退
        if (m.hp <= 0 || wall.hits <= 0 || Math.abs(m.d - wall.d) > 0.5 || !wallCovers(wall, m)) continue;
        wall.hits--;
        S.m.wallHits++;
        damageMob(m, magDmg(m, FIREWALL_RATIO), '火牆');
        if (!m.def.boss) m.d = wall.d + 2;
      }
      return;
    }
    if (id === 'HT_BLITZBEAT') {   // MISC：無視防禦與迴避
      const per = Math.floor((st.dex / 10 + st.int / 2 + 3 * 10 + 40) * 2);
      for (const m of near(plan.center, lvVal(sk.splash, lv))) damageMob(m, per * lvVal(sk.hitCount, lv), id);
      return;
    }
    const radius = sk.unit && sk.unit.range ? lvVal(sk.unit.range, lv) : (lvVal(sk.splash, lv) || 0);
    const targets = sk.target === 'Self' ? near(ORIGIN, radius)
      : radius ? near(plan.center, radius) : (plan.target && plan.target.hp > 0 ? [plan.target] : []);
    const hits = lvVal(sk.hitCount, lv) || 1;
    const ratio = SKILL_RATIO[id](lv);
    for (const m of targets) {
      if (sk.type === 'Magic') {
        let dmg = 0;
        for (let i = 0; i < hits; i++) dmg += magDmg(m, ratio);
        damageMob(m, dmg, id);
      } else {
        if (R() > hitChance(hit, 100 + m.def.lv + m.def.agi)) continue;
        let dmg = 0;
        for (let i = 0; i < hits; i++) dmg += physDmg(m, ratio);
        damageMob(m, dmg, id);
      }
      knockback(m, lvVal(sk.knockback, lv));
    }
  }

  function wallBetween(m) {
    return S.walls.some(w => w.hits > 0 && w.until > S.t && w.d < m.d && w.d >= m.def.range && wallCovers(w, m));
  }
  const canInterrupt = m => RULE === 'any' || (RULE === 'melee' && m.def.range <= 2);
  /* 智能施法：預估最快多久會被打到（會打斷的那種） */
  function firstHitMs(filter) {
    let best = Infinity;
    for (const m of S.mobs) {
      if (m.hp <= 0 || !m.aggro || (filter && !filter(m))) continue;
      const wait = Math.max(0, m.flinchUntil - S.t);
      let ms;
      if (m.d <= m.def.range + 1e-9) ms = Math.max(wait, m.nextAtk - S.t);
      else if (m.def.immobile || wallBetween(m)) continue;
      else ms = wait + (m.d - m.def.range) * m.def.walkMs;
      best = Math.min(best, ms);
    }
    return best;
  }

  /* ---- 玩家 ---- */
  function playerAct() {
    if (S.cast) {
      S.m.castMs += TICK;
      if (S.t >= S.cast.endAt) {
        const { id, lv, plan } = S.cast;
        S.cast = null;
        const sk = skillDef(id);
        executeSkill(id, lv, plan);
        S.acdUntil = S.t + lvVal(sk.afterCastDelay, lv);
        S.actUntil = S.t + (sk.type === 'Weapon' ? P.aspdMs : 0);
      }
      return;
    }
    if (S.t < S.actUntil) return;
    /* 風箏：近戰怪預估 kiteSafeMs 內會打到 → 後退（所有距離同時增加），退到兩倍安全時間才停。
       一維模型裡後退沒有成本，多隻怪時會退個不停 → 連續後退上限 2 秒、之後冷卻 3 秒。 */
    if (P.kite && S.t >= S.kiteCdUntil) {
      const threat = firstHitMs(m => m.def.range <= 2);
      if (threat < P.kiteSafeMs * (S.kiting ? 2 : 1)) {
        if (!S.kiting) S.kiteStart = S.t;
        S.kiting = true;
        if (S.t - S.kiteStart >= 2000) { S.kiting = false; S.kiteCdUntil = S.t + 3000; }
        for (const m of S.mobs) m.d = Math.min(MAX_D, m.d + TICK / PLAYER_MOVE_MS);
        S.m.moveMs += TICK;
        return;
      }
      S.kiting = false;
    }
    if (S.t >= S.acdUntil) {
      /* 智能施法：會被打斷的招先跳過。退路：已經有會打斷的怪貼身、而且沒有別招可放，
         就照放第一個被跳過的招（不然會站著挨打）。 */
      const cornered = P.smartCast && firstHitMs(m => canInterrupt(m) && m.d <= m.def.range + 1e-9) < Infinity;
      let pick = null, fallback = null;
      for (const slot of P.slots) {
        const plan = planSkill(slot);
        if (!plan) continue;
        const sk = skillDef(slot.id);
        const ct = castTimeMs(sk, slot.lv);
        const cancel = sk.castCancel && !P.noCastCancel;
        if (ct > 0 && P.smartCast && cancel && RULE !== 'pushback' && RULE !== 'none' && firstHitMs(canInterrupt) < ct) {
          if (!fallback) fallback = { slot, plan, sk, ct, cancel };
          continue;
        }
        pick = { slot, plan, sk, ct, cancel };
        break;
      }
      if (!pick && cornered && !(P.autoAttack && nearest() && nearest().d <= P.weaponRange)) pick = fallback;
      if (pick) {
        const { slot, plan, sk, ct, cancel } = pick;
        S.m.casts++;
        if (ct > 0) {
          S.m.castsTimed++;
          S.cast = { id: slot.id, lv: slot.lv, plan, ct, endAt: S.t + ct, cancel, pushes: 0 };
          trace('詠唱 ' + slot.id + ' ' + ct + 'ms');
          emit('castStart', { id: slot.id, ct });
        } else {
          executeSkill(slot.id, slot.lv, plan);
          S.acdUntil = S.t + lvVal(sk.afterCastDelay, slot.lv);
          S.actUntil = S.t + (sk.type === 'Weapon' ? P.aspdMs : 0);
        }
        return;
      }
    }
    const tgt = nearest();
    if (!tgt) { S.m.idleMs += TICK; return; }
    if (tgt.d <= P.weaponRange + 1e-9 && P.autoAttack) {
      emit('playerAttack', { target: tgt });
      if (R() <= hitChance(hit, 100 + tgt.def.lv + tgt.def.agi)) damageMob(tgt, physDmg(tgt, 1), '普攻');
      else emit('miss', { mob: tgt });
      S.actUntil = S.t + P.aspdMs;
      return;
    }
    /* 移動：只縮短目標距離（D1 已知限制：方向角不參與模擬） */
    if (tgt.d > P.engageRange) {
      tgt.d = Math.max(P.engageRange, tgt.d - TICK / PLAYER_MOVE_MS);
      S.m.moveMs += TICK;
      return;
    }
    S.m.idleMs += TICK;
  }

  /* ---- 怪物 ---- */
  function mobAct(m) {
    if (m.hp <= 0 || S.t < m.flinchUntil || !m.aggro) return;
    if (m.d > m.def.range + 1e-9) {
      if (m.def.immobile) return;
      const nd = m.d - TICK / m.def.walkMs;
      const wall = S.walls.find(w => w.hits > 0 && w.until > S.t && m.d > w.d && nd <= w.d && wallCovers(w, m));
      if (wall) {
        wall.hits--;
        S.m.wallHits++;
        damageMob(m, magDmg(m, FIREWALL_RATIO), '火牆');
        trace('火牆擋下 ' + m.def.name + '，剩 ' + wall.hits + ' 次');
        if (m.def.boss) m.d = wall.d; else m.d = wall.d + 2;
        return;
      }
      m.d = Math.max(m.def.range, nd);
      return;
    }
    if (S.t < m.nextAtk) return;
    m.nextAtk = S.t + m.def.attackDelay;
    emit('mobAttack', { mob: m });
    if (R() > hitChance(175 + m.def.lv + m.def.dex, flee)) { emit('playerMiss', { mob: m }); return; }
    const hardDef = (4000 + P.def) / (4000 + 10 * P.def);
    const dmg = Math.max(1, Math.floor(m.def.atk * (0.8 + R() * 0.4) * hardDef - st.vit / 2));
    S.hp -= dmg;
    S.m.dmgTaken += dmg;
    emit('playerHit', { mob: m, dmg });
    if (S.cast && S.cast.cancel) {
      if (RULE === 'pushback') {
        if (S.cast.pushes < 3) { S.cast.pushes++; S.cast.endAt += Math.round(S.cast.ct * 0.2); }
      } else if (canInterrupt(m)) {
        trace('詠唱被 ' + m.def.name + ' 打斷');
        emit('interrupt', { mob: m });
        S.cast = null;
        S.m.interrupts++;
      }
    }
  }

  /* 藥水有每分鐘上限（模擬經濟限制），喝不夠就會死 */
  function potions() {
    if (S.hp < P.maxHp * 0.5 && S.t >= S.hpPotReadyAt) {
      S.hp = Math.min(P.maxHp, S.hp + P.hpPotion); S.m.hpPots++; S.hpPotReadyAt = S.t + 60000 / P.potPerMin;
    }
    if (S.sp < P.maxSp * 0.2 && S.t >= S.spPotReadyAt) {
      S.sp = Math.min(P.maxSp, S.sp + P.spPotion); S.m.spPots++; S.spPotReadyAt = S.t + 60000 / P.potPerMin;
    }
  }

  function step() {
    S.t += TICK;
    if (S.t < S.deadUntil) return;
    if (S.t >= S.nextSpawn && S.mobs.length < (cfg.maxField || 5)) { spawn(); S.nextSpawn = S.t + (cfg.spawnMs || 1000); }
    S.walls = S.walls.filter(w => w.hits > 0 && w.until > S.t);
    if (S.t >= S.nextHpRegen) { S.hp = Math.min(P.maxHp, S.hp + P.maxHp / 200 + st.vit / 5); S.nextHpRegen += REGEN_HP_MS; }
    if (S.t >= S.nextSpRegen) { S.sp = Math.min(P.maxSp, S.sp + 1 + P.maxSp / 100 + st.int / 6); S.nextSpRegen += REGEN_SP_MS; }
    potions();
    playerAct();
    for (const m of S.mobs) mobAct(m);
    const before = S.mobs.length;
    S.mobs = S.mobs.filter(m => m.hp > 0);
    S.m.kills += before - S.mobs.length;
    if (S.hp <= 0) {
      trace('死亡');
      emit('death', {});
      S.m.deaths++;
      S.hp = P.maxHp; S.sp = P.maxSp; S.cast = null; S.mobs = []; S.walls = [];
      S.deadUntil = S.t + DEATH_DOWNTIME_MS;
    }
  }

  // 不足一步的時間留到下次：以前每次呼叫至少走一步 50ms，畫面 60fps 時約 3 倍速
  let acc = 0;
  return {
    run(ms) { acc += ms; while (acc >= TICK) { step(); acc -= TICK; } return S; },
    state: S,
    derived: { atk: Math.round(atk), matk: Math.round(matk), hit: Math.round(hit), flee: Math.round(flee) },
  };
}

if (IS_NODE) module.exports = { createSim, DATA };
else window.Combat1D = { createSim, DATA };
