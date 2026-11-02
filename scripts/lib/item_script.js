/* rAthena 道具 Script → 本作加成鍵（工作 5：5a 詠唱、5b 套裝、5d 盤查共用）
   parseScript(src)      → [{ fn, args, conds, vars }]：bonus/bonus2 敘述，帶著外層 if 條件與精煉變數
   compile(expr, vars)   → f(R) 或 null：只認數字、精煉、算術、比較、三元、min/max
   convert(entries, opt) → { rec, skipped }：rec 是 { bonus, condBonus } 本作格式
     opt.keys    只收這些本作鍵（可省略）
     opt.skills  SKILLS 表（指定技能的鍵只收本作有的技能）
     opt.refine  精煉來源有沒有意義（套裝沒有單一宿主 → false，含精煉的整條略過） */

const RACE = {
  RC_Formless: 'formless', RC_Undead: 'undead', RC_Brute: 'brute', RC_Plant: 'plant', RC_Insect: 'insect',
  RC_Fish: 'fish', RC_Demon: 'demon', RC_DemiHuman: 'humanoid', RC_Angel: 'angel', RC_Dragon: 'dragon',
};
const ELE = {
  Ele_Neutral: 'none', Ele_Water: 'water', Ele_Earth: 'earth', Ele_Fire: 'fire', Ele_Wind: 'wind',
  Ele_Poison: 'poison', Ele_Holy: 'holy', Ele_Dark: 'shadow', Ele_Ghost: 'ghost', Ele_Undead: 'undead',
};
const SIZE = { Size_Small: 'small', Size_Medium: 'medium', Size_Large: 'large' };
const ALL = { RC_All: Object.values(RACE), Ele_All: Object.values(ELE), Size_All: Object.values(SIZE) };

/* bonus bX,N → 鍵 */
const B1 = {
  bStr: 'str', bAgi: 'agi', bVit: 'vit', bInt: 'int', bDex: 'dex', bLuk: 'luk', bAllStats: 'allStat',
  bMaxHP: 'hp', bMaxSP: 'sp', bMaxHPrate: 'hpPct', bMaxSPrate: 'spPct',
  bBaseAtk: 'atk', bAtkRate: 'atkPct', bMatk: 'matk', bMatkRate: 'matkPct',
  bDef: 'def', bMdef: 'mdef', bHit: 'hit', bFlee: 'flee', bFlee2: 'perfectDodge',
  bCritical: 'critRate', bCritAtkRate: 'critDmgPct', bAspd: 'aspdFlat', bAspdRate: 'aspdPct',
  bLongAtkRate: 'rangedDmgPct', bShortAtkRate: 'meleeDmgPct', bHealPower: 'healPower', bUseSPrate: 'spCostPct',
  bVariableCastrate: 'castVarPct', bCastrate: 'castVarPct', bFixedCastrate: 'castFixedPct', bFixedCast: 'castFixedMs',
  bDelayrate: 'acdPct', bNoCastCancel: 'noCastCancel',
};
/* bonus2 bX,類別,N → 鍵前綴＋類別 */
const B2 = {
  bAddRace: ['raceDmg_', RACE], bAddEle: ['eleDmg_', ELE], bAddSize: ['sizeDmg_', SIZE],
  bSubRace: ['raceDmgReduce_', RACE], bSubEle: ['eleReduce_', ELE], bSubSize: ['sizeDmgReduce_', SIZE],
  bMagicAtkEle: ['magicEleDmg_', ELE], bMagicAddRace: ['magicRaceDmg_', RACE], bMagicAddSize: ['magicSizeDmg_', SIZE],
  bIgnoreDefRaceRate: ['defIgnoreRace_', RACE], bExpAddRace: ['expRace_', RACE],
  bSkillAtk: ['skillDmg_', 'skill'], bVariableCastrate: ['castVarPct_', 'skill'], bSkillVariableCast: ['castVarMs_', 'skill'],
  bSkillFixedCast: ['castFixedMs_', 'skill'], bSkillCooldown: ['skillCdMs_', 'skill'],
  bAddClass: ['', { Class_All: 'allTargetDmgPct', Class_Boss: 'bossDmgPct' }],
  bSubClass: ['', { Class_Boss: 'bossDmgTakenPct', Class_Normal: 'normalDmgTakenPct' }],
};
/* 本作鍵是否由轉換程式負責（5d：負責的鍵以 rAthena 為準，手寫的移除） */
const OWN_PREFIX = Object.values(B2).map(([p]) => p).filter(Boolean);
const OWN_EXACT = new Set([...Object.values(B1), 'allTargetDmgPct', 'bossDmgPct', 'bossDmgTakenPct', 'normalDmgTakenPct']);
/* 手寫資料裡的同義鍵 → 對應的轉換鍵（rAthena 那條轉不了時，連同義鍵一起保留） */
const SYNONYM = { allEleDmg: 'eleDmg_', allEleDmgReducePct: 'eleReduce_', crit: 'critRate', aspd: 'aspdFlat' };
function ownKey(k) {
  if (OWN_EXACT.has(k) || k in SYNONYM) return true;
  return OWN_PREFIX.some(p => k.startsWith(p));
}
/* 鍵的家族（判斷「這一類 rAthena 有沒有轉不了的條目」用） */
function familyOf(k) {
  if (k in SYNONYM) return SYNONYM[k];
  const p = OWN_PREFIX.find(x => k.startsWith(x));
  return p && !['skillDmg_', 'castVarPct_', 'castVarMs_', 'castFixedMs_', 'skillCdMs_'].includes(p) ? p : k;
}

function readBalanced(s, i, open, close) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '"') { j = s.indexOf('"', j + 1); if (j < 0) break; continue; }
    if (s[j] === open) depth++;
    else if (s[j] === close && --depth === 0) return j;
  }
  return s.length - 1;
}
function readStatement(s, i) {
  let depth = 0, j = i;
  for (; j < s.length; j++) {
    if (s[j] === '"') { j = s.indexOf('"', j + 1); if (j < 0) return s.length; continue; }
    if (s[j] === '(') depth++; else if (s[j] === ')') depth--;
    else if (s[j] === ';' && depth <= 0) return j;
  }
  return j;
}
function readBody(s, j) {
  while (/\s/.test(s[j])) j++;
  if (s[j] === '{') { const e = readBalanced(s, j, '{', '}'); return { body: s.slice(j + 1, e), end: e }; }
  if (/^if\b/.test(s.slice(j))) { const e = ifEnd(s, j); return { body: s.slice(j, e), end: e - 1 }; }
  const e = readStatement(s, j);
  return { body: s.slice(j, e + 1), end: e };
}
function ifEnd(s, i) {
  const p = s.indexOf('(', i), pe = readBalanced(s, p, '(', ')');
  let { end } = readBody(s, pe + 1);
  const rest = s.slice(end + 1).match(/^\s*else\b/);
  if (!rest) return end + 1;
  return readBody(s, end + 1 + rest[0].length).end + 1;
}
function parseScript(src) {
  src = String(src || '').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const walk = (s, conds, vars) => {
    let i = 0;
    while (i < s.length) {
      while (i < s.length && /[\s;]/.test(s[i])) i++;
      if (i >= s.length) break;
      if (s[i] === '{') { const e = readBalanced(s, i, '{', '}'); walk(s.slice(i + 1, e), conds, vars); i = e + 1; continue; }
      if (/^if\s*\(/.test(s.slice(i))) {
        const p = s.indexOf('(', i), pe = readBalanced(s, p, '(', ')');
        const cond = s.slice(p + 1, pe);
        const t = readBody(s, pe + 1);
        walk(t.body, conds.concat([cond]), vars);
        i = t.end + 1;
        const rest = s.slice(i).match(/^\s*else\b/);
        if (rest) {
          const eb = readBody(s, i + rest[0].length);
          walk(eb.body, conds.concat(['!(' + cond + ')']), vars);
          i = eb.end + 1;
        }
        continue;
      }
      const e = readStatement(s, i);
      const t = s.slice(i, e).trim();
      i = e + 1;
      const m = t.match(/^\.@(\w+)\s*=\s*getrefine\(\)$/);
      if (m) { vars[m[1]] = 'refine'; continue; }
      const mg = t.match(/^\.@(\w+)\s*=\s*getenchantgrade\([^)]*\)$/);
      if (mg) { vars[mg[1]] = 'grade'; continue; }
      const b = t.match(/^(bonus\d?)\s+(b\w+)\s*(?:,\s*([\s\S]+))?$/);
      if (b) out.push({ fn: b[1], name: b[2], args: b[3] ? splitArgs(b[3]) : [], conds, vars: { ...vars }, raw: t });
      else if (/^(bonus|autobonus|skill)\b/.test(t)) out.push({ fn: 'other', name: t.split(/[\s,]/)[0], args: [], conds, vars: { ...vars }, raw: t });
    }
  };
  walk(src, [], {});
  return out;
}
function splitArgs(s) {
  const out = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { const j = s.indexOf('"', i + 1); cur += s.slice(i, j + 1); i = j; continue; }
    if (c === '(') depth++; else if (c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* 運算式在精煉 R 下的值 */
function compile(expr, vars) {
  /* 附魔階級（四轉時代的系統）本作沒有：一律當 0（無階級），條件不成立 */
  let e = String(expr).replace(/getrefine\(\)/g, 'R').replace(/getenchantgrade\([^)]*\)/g, '0')
    .replace(/ENCHANTGRADE_(NONE|D|C|B|A)\b/g, (m, x) => ({ NONE: 0, D: 1, C: 2, B: 3, A: 4 })[x]);
  e = e.replace(/\.@(\w+)/g, (m, v) => vars[v] === 'refine' ? 'R' : vars[v] === 'grade' ? '0' : '#');
  const toks = e.match(/\d+|R|min|max|&&|\|\||==|!=|>=|<=|[-+*/%()?:<>!,]|\S/g) || [];
  if (toks.some(t => !/^(\d+|R|min|max|&&|\|\||==|!=|>=|<=|[-+*/%()?:<>!,])$/.test(t))) return null;
  const f = R => {
    let i = 0;
    const peek = () => toks[i], eat = t => { if (toks[i] !== t) throw 0; i++; };
    const tern = () => { const c = or(); if (peek() !== '?') return c; i++; const a = tern(); eat(':'); const b = tern(); return c ? a : b; };
    const bin = (next, ops, fn) => () => { let v = next(); while (ops.includes(peek())) { const op = toks[i++]; v = fn(op, v, next()); } return v; };
    const un = () => {
      const t = toks[i++];
      if (t === '-') return -un();
      if (t === '+') return un();
      if (t === '!') return un() ? 0 : 1;
      if (t === '(') { const v = tern(); eat(')'); return v; }
      if (t === 'R') return R;
      if (t === 'min' || t === 'max') { eat('('); const a = tern(); eat(','); const b = tern(); eat(')'); return Math[t](a, b); }
      if (/^\d+$/.test(t)) return +t;
      throw 0;
    };
    const mul = bin(un, ['*', '/', '%'], (op, a, b) => op === '*' ? a * b : op === '/' ? Math.trunc(a / b) : a % b);
    const add = bin(mul, ['+', '-'], (op, a, b) => op === '+' ? a + b : a - b);
    const cmp = bin(add, ['<', '>', '<=', '>='], (op, a, b) => +(op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b));
    const eq = bin(cmp, ['==', '!='], (op, a, b) => +(op === '==' ? a === b : a !== b));
    const and = bin(eq, ['&&'], (op, a, b) => +(a && b));
    const or = bin(and, ['||'], (op, a, b) => +(a || b));
    const v = tern();
    if (i !== toks.length) throw 0;
    return v;
  };
  try { f(0); return Object.assign(f, { usesR: toks.includes('R') }); } catch (_) { return null; }
}

/* 一條 bonus → [{ key, expr }]；認不得回 null */
function keysOf(en, skills) {
  if (en.fn === 'bonus' && en.name in B1) return [{ key: B1[en.name], expr: en.name === 'bNoCastCancel' ? '1' : en.args[0] }];
  if (en.fn === 'bonus2' && en.name in B2 && en.args.length >= 2) {
    const [prefix, table] = B2[en.name];
    const cat = en.args[0].replace(/"/g, '');
    if (table === 'skill') {
      const id = cat.toLowerCase();
      return skills && !skills[id] ? [] : [{ key: prefix + id, expr: en.args[1] }];
    }
    if (/^RC_Player_/.test(cat)) return [];   // 只對玩家（PvP），本作沒有
    const list = ALL[cat] || (table[cat] ? [table[cat]] : null);
    return list ? list.map(v => ({ key: prefix + v, expr: en.args[1] })) : null;
  }
  return null;
}

const REFINE_MAX = 20;
/* 精煉表 → 資料：不隨精煉變的進 bonus；會變的拆成 condBonus（加總鍵給差值，castFixedPct 給區間絕對值） */
/* 精煉每 +N 加 v（N=1..5，從 +0 起完全規律）→ { n, v }；不是就回 null */
function periodic(t) {
  for (let n = 1; n <= 5; n++) {
    const v = t[n] - t[0];
    if (!v) continue;
    if (t.every((x, r) => x === t[0] + v * Math.floor(r / n))) return { n, v };
  }
  return null;
}
function emit(rec, key, t, style) {
  if (t.every(v => v === t[0])) { if (t[0]) (rec.bonus = rec.bonus || {})[key] = (rec.bonus[key] || 0) + t[0]; return; }
  rec.condBonus = rec.condBonus || [];
  const push = (when, v) => {
    const same = rec.condBonus.find(c => JSON.stringify(c.when) === JSON.stringify(when));
    if (same) same.bonus[key] = (same.bonus[key] || 0) + v; else rec.condBonus.push({ when, bonus: { [key]: v } });
  };
  if (key === 'castFixedPct') {
    for (let a = 0; a <= REFINE_MAX;) {
      let b = a; while (b < REFINE_MAX && t[b + 1] === t[a]) b++;
      if (t[a]) push(b === REFINE_MAX ? { refineMin: a } : { refineMin: a, refineMax: b }, t[a]);
      a = b + 1;
    }
    return;
  }
  if (t[0]) (rec.bonus = rec.bonus || {})[key] = (rec.bonus[key] || 0) + t[0];
  const per = style && periodic(t);
  if (per) {
    if (per.n === 1) { (rec.perRefine = rec.perRefine || {})[key] = per.v; return; }
    if (style === 'item') { const s = 'per' + per.n + 'Refine'; (rec[s] = rec[s] || {})[key] = per.v; return; }
    // 卡片：宿主精煉每 +N 寫成 condBonus 的 perNRefine_ 鍵（engine 卡片路徑）
    let e = rec.condBonus.find(c => !Object.keys(c.when).length);
    if (!e) rec.condBonus.push(e = { when: {}, bonus: {} });
    e.bonus['per' + per.n + 'Refine_' + key] = per.v;
    return;
  }
  for (let r = 1; r <= REFINE_MAX; r++) if (t[r] !== t[r - 1]) push({ refineMin: r }, t[r] - t[r - 1]);
}
function convert(entries, opt) {
  opt = opt || {};
  const rec = {}, skipped = [], table = {}, skippedFam = new Set();
  for (const en of entries) {
    const ks = keysOf(en, opt.skills);
    if (!ks) { if (!opt.keys) skipped.push(en.raw); continue; }
    for (const { key, expr } of ks) {
      if (opt.keys && !opt.keys.some(k => k.endsWith('_') ? key.startsWith(k) : key === k)) continue;
      const fv = compile(expr, en.vars);
      const fc = en.conds.map(c => compile(c, en.vars));
      const bad = !fv || fc.some(f => !f) || (opt.refine === false && (fv.usesR || fc.some(f => f.usesR)));
      if (bad) { skipped.push(en.raw + (en.conds.length ? '  if(' + en.conds.join(' && ') + ')' : '')); skippedFam.add(familyOf(key)); continue; }
      const t = table[key] = table[key] || new Array(REFINE_MAX + 1).fill(0);
      for (let r = 0; r <= REFINE_MAX; r++) if (fc.every(f => f(r))) t[r] += fv(r);
    }
  }
  for (const [key, t] of Object.entries(table)) emit(rec, key, t, opt.perStyle);
  if (rec.condBonus && !rec.condBonus.length) delete rec.condBonus;
  return { rec, skipped, skippedFam };
}

/* 自動念咒（T16）：bonus3/4/5 bAutoSpell（普攻時）、bAutoSpellWhenHit（被打時）→ [{ on, skill, lv, chance, when?, useLearnedLv? }]
   機率 rAthena 是千分比。等級或機率隨精煉變 → 依精煉分段（when.refineMin／refineMax）。
   max(getskilllv("同技能"),N) → lv N＋useLearnedLv（學得更高就用學到的等級）。
   技能或魔法觸發的（flag 帶 BF_MAGIC／BF_SKILL／BF_MISC）本作沒有對應時機，跟其他轉不了的一起列缺口。
   bonus4 bAutoSpellOnSkill,施放的技能,接著放的技能,lv,機率 → on:'chain'（engine 的連鎖念咒，元素劍那種）。 */
const AUTOSPELL_ON = { bAutoSpell: 'attack', bAutoSpellWhenHit: 'hit', bAutoSpellOnSkill: 'chain' };
function autoSpellsOf(entries, skills, refineOk) {
  const list = [], skipped = [];
  for (const en of entries) {
    if (!(en.name in AUTOSPELL_ON) || !/^bonus[345]$/.test(en.fn)) continue;
    const chain = en.name === 'bAutoSpellOnSkill';
    const after = chain ? String(en.args[0] || '').replace(/"/g, '').toLowerCase() : null;
    if (chain && (!skills || !skills[after])) { skipped.push(en.raw); continue; }
    const [skArg, lvArg, rateArg, flag, other] = chain ? en.args.slice(1) : en.args;
    const id = String(skArg || '').replace(/"/g, '').toLowerCase();
    if (!skills || !skills[id] || /BF_(MAGIC|SKILL|MISC)/.test(String(flag || '') + ' ' + String(other || ''))) { skipped.push(en.raw); continue; }
    let lvExpr = lvArg, learned = false;
    const m = String(lvArg || '').match(/^max\(getskilllv\("(\w+)"\),\s*(\d+)\)$/);
    if (m && m[1].toLowerCase() === id) { lvExpr = m[2]; learned = true; }
    const fl = compile(lvExpr, en.vars), fr = compile(rateArg, en.vars), fc = en.conds.map(c => compile(c, en.vars));
    if (!fl || !fr || fc.some(f => !f) || (!refineOk && (fl.usesR || fr.usesR || fc.some(f => f.usesR)))) { skipped.push(en.raw); continue; }
    const maxLv = skills[id].maxLv || 99;   // 等級隨精煉長的（電鰻 +20 → Lv20）照官方封頂在技能上限
    const at = r => (fc.every(f => f(r)) ? [Math.min(maxLv, fl(r)), fr(r)] : null);
    for (let a = 0; a <= REFINE_MAX;) {
      const cur = JSON.stringify(at(a));
      let b = a;
      while (b < REFINE_MAX && JSON.stringify(at(b + 1)) === cur) b++;
      const v = at(a);
      if (v && v[0] > 0 && v[1] > 0) {
        const e = { on: AUTOSPELL_ON[en.name], skill: id, lv: v[0], chance: v[1] / 10 };
        if (chain) e.after = after;
        if (learned) e.useLearnedLv = true;
        if (a > 0 || b < REFINE_MAX) e.when = b === REFINE_MAX ? { refineMin: a } : { refineMin: a, refineMax: b };
        list.push(e);
      }
      a = b + 1;
    }
  }
  return { list, skipped };
}

module.exports = { parseScript, compile, convert, keysOf, autoSpellsOf, ownKey, familyOf, B1, B2, RACE, ELE, SIZE };
