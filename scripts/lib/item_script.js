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
  bMagicAtkEle: ['magicEleDmg_', ELE], bIgnoreDefRaceRate: ['defIgnoreRace_', RACE], bExpAddRace: ['expRace_', RACE],
  bSkillAtk: ['skillDmg_', 'skill'], bVariableCastrate: ['castVarPct_', 'skill'], bSkillVariableCast: ['castVarMs_', 'skill'],
  bSkillFixedCast: ['castFixedMs_', 'skill'], bSkillCooldown: ['skillCdMs_', 'skill'],
};

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
  let e = String(expr).replace(/getrefine\(\)/g, 'R');
  e = e.replace(/\.@(\w+)/g, (m, v) => vars[v] === 'refine' ? 'R' : '#');
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
function emit(rec, key, t) {
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
  for (let r = 1; r <= REFINE_MAX; r++) if (t[r] !== t[r - 1]) push({ refineMin: r }, t[r] - t[r - 1]);
}
function convert(entries, opt) {
  opt = opt || {};
  const rec = {}, skipped = [], table = {};
  for (const en of entries) {
    const ks = keysOf(en, opt.skills);
    if (!ks) { if (!opt.keys) skipped.push(en.raw); continue; }
    for (const { key, expr } of ks) {
      if (opt.keys && !opt.keys.some(k => k.endsWith('_') ? key.startsWith(k) : key === k)) continue;
      const fv = compile(expr, en.vars);
      const fc = en.conds.map(c => compile(c, en.vars));
      const bad = !fv || fc.some(f => !f) || (opt.refine === false && (fv.usesR || fc.some(f => f.usesR)));
      if (bad) { skipped.push(en.raw + (en.conds.length ? '  if(' + en.conds.join(' && ') + ')' : '')); continue; }
      const t = table[key] = table[key] || new Array(REFINE_MAX + 1).fill(0);
      for (let r = 0; r <= REFINE_MAX; r++) if (fc.every(f => f(r))) t[r] += fv(r);
    }
  }
  for (const [key, t] of Object.entries(table)) emit(rec, key, t);
  return { rec, skipped };
}

module.exports = { parseScript, compile, convert, keysOf, B1, B2, RACE, ELE, SIZE };
