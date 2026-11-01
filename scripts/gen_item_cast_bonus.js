/* 道具效果層 5a：詠唱／延遲／冷卻／不可中斷（docs/GAMEPLAY_DIRECTION.md D2、工作 5）
   node scripts/gen_item_cast_bonus.js           → 只印報告
   node scripts/gen_item_cast_bonus.js --write   → 寫 js/item_cast_bonus.js

   來源：rAthena item_db 的 Script。只認下列 bonus，其他照舊由 data.js 的 bonus 管：
     bonus  bVariableCastrate,N        castVarPct（%，正＝變慢）
     bonus2 bVariableCastrate,"S",N    castVarPct_<技能>
     bonus2 bSkillVariableCast,"S",ms  castVarMs_<技能>
     bonus  bFixedCastrate,N           castFixedPct（取最大單一減免，見 engine mergeBonus）
     bonus  bFixedCast,ms              castFixedMs
     bonus2 bSkillFixedCast,"S",ms     castFixedMs_<技能>
     bonus  bDelayrate,N               acdPct
     bonus2 bSkillCooldown,"S",ms      skillCdMs_<技能>
     bonus  bNoCastCancel              noCastCancel
   條件只認精煉（getrefine() / .@r >= N，含 else），值只認常數與「精煉 ×／÷ N」；
   其他條件（職業、等級、套裝…）整段略過，列在報告。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemDb } = require('./lib/rathena');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'js', 'item_cast_bonus.js');
const KEYS = {
  bVariableCastrate: 'castVarPct', bCastrate: 'castVarPct', bFixedCastrate: 'castFixedPct',
  bFixedCast: 'castFixedMs', bDelayrate: 'acdPct', bNoCastCancel: 'noCastCancel',
};
const KEYS2 = {
  bVariableCastrate: 'castVarPct_', bSkillVariableCast: 'castVarMs_', bSkillFixedCast: 'castFixedMs_', bSkillCooldown: 'skillCdMs_',
};

/* ---- 迷你腳本解析：if/else、{} 區塊、; 結尾的敘述 ---- */
function readBalanced(s, i, open, close) {
  let depth = 0, j = i;
  for (; j < s.length; j++) {
    if (s[j] === '"') { j = s.indexOf('"', j + 1); continue; }
    if (s[j] === open) depth++;
    else if (s[j] === close && --depth === 0) return j;
  }
  return s.length - 1;
}
function readStatement(s, i) {
  let depth = 0, j = i;
  for (; j < s.length; j++) {
    if (s[j] === '"') { j = s.indexOf('"', j + 1); continue; }
    if (s[j] === '(') depth++; else if (s[j] === ')') depth--;
    else if (s[j] === ';' && depth <= 0) return j;
  }
  return j;
}
function parseScript(src) {
  src = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
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
        let j = pe + 1;
        while (/\s/.test(s[j])) j++;
        let body, e;
        if (s[j] === '{') { e = readBalanced(s, j, '{', '}'); body = s.slice(j + 1, e); }
        else { e = readStatement(s, j); body = s.slice(j, e + 1); }
        walk(body, conds.concat([cond]), vars);
        i = e + 1;
        const rest = s.slice(i).match(/^\s*else\b/);
        if (rest) {
          i += rest[0].length;
          while (/\s/.test(s[i])) i++;
          let eb, ee;
          if (s[i] === '{') { ee = readBalanced(s, i, '{', '}'); eb = s.slice(i + 1, ee); }
          else if (/^if\b/.test(s.slice(i))) { const k = findIfEnd(s, i); eb = s.slice(i, k); ee = k - 1; }
          else { ee = readStatement(s, i); eb = s.slice(i, ee + 1); }
          walk(eb, conds.concat(['!(' + cond + ')']), vars);
          i = ee + 1;
        }
        continue;
      }
      const e = readStatement(s, i);
      stmt(s.slice(i, e).trim(), conds, vars);
      i = e + 1;
    }
  };
  // else if 的範圍：讀完整條 if（含它自己的 else）
  const findIfEnd = (s, i) => {
    const p = s.indexOf('(', i), pe = readBalanced(s, p, '(', ')');
    let j = pe + 1;
    while (/\s/.test(s[j])) j++;
    let e = s[j] === '{' ? readBalanced(s, j, '{', '}') : readStatement(s, j);
    const rest = s.slice(e + 1).match(/^\s*else\b\s*/);
    if (!rest) return e + 1;
    let k = e + 1 + rest[0].length;
    if (/^if\b/.test(s.slice(k))) return findIfEnd(s, k);
    return (s[k] === '{' ? readBalanced(s, k, '{', '}') : readStatement(s, k)) + 1;
  };
  const stmt = (t, conds, vars) => {
    let m = t.match(/^\.@(\w+)\s*=\s*getrefine\(\)$/);
    if (m) { vars[m[1]] = 'refine'; return; }
    m = t.match(/^bonus\s+(b\w+)(?:\s*,\s*(.+))?$/);
    if (m && m[1] in KEYS) { out.push({ key: KEYS[m[1]], val: m[1] === 'bNoCastCancel' ? '1' : m[2], conds, vars: { ...vars } }); return; }
    m = t.match(/^bonus2\s+(b\w+)\s*,\s*"(\w+)"\s*,\s*(.+)$/);
    if (m && m[1] in KEYS2) out.push({ key: KEYS2[m[1]] + m[2].toLowerCase(), val: m[3], conds, vars: { ...vars } });
  };
  walk(src, [], {});
  return out;
}
/* 運算式在精煉 r 下的值：精煉變數換成 R，只允許數字、R、算術、比較、三元、min/max。
   有其他變數（素質、技能等級、附魔階級…）就回 null。rAthena 整數除法 → 截斷。 */
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
  try { f(0); return f; } catch (_) { return null; }
}
const REFINE_MAX = 20;
/* 精煉表 → 資料：不隨精煉變的進 bonus；會變的拆成 condBonus。
   一般鍵是加總，用「精煉 ≥ r 時再加差值」；castFixedPct 取最大單一減免，不能加差值，改用區間給絕對值。 */
function emit(rec, key, t) {
  if (t.every(v => v === t[0])) { if (t[0]) (rec.bonus = rec.bonus || {})[key] = t[0]; return; }
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
  if (t[0]) (rec.bonus = rec.bonus || {})[key] = t[0];
  for (let r = 1; r <= REFINE_MAX; r++) if (t[r] !== t[r - 1]) push({ refineMin: r }, t[r] - t[r - 1]);
}
function build() {
  const { ITEMS, CARDS, SKILLS } = loadGameData();
  const db = loadItemDb();
  const byAegis = new Map();
  db.forEach(it => byAegis.set(String(it.AegisName).toLowerCase(), it));
  const out = {};
  const skipped = [];
  let n = 0;
  for (const it of Object.values(ITEMS)) {
    const ra = byAegis.get(String(it.id).toLowerCase()) || (it.imgId && db.get(it.imgId));
    if (!ra || !ra.Script) continue;
    const entries = parseScript(ra.Script);
    if (!entries.length) continue;
    const rec = {};
    const table = {};   // key → 精煉 0..20 的值
    for (const e of entries) {
      const sk = e.key.match(/_(\w+)$/);
      if (sk && !SKILLS[sk[1]]) continue;   // 範圍外技能
      const fv = compile(e.val, e.vars);
      const fc = e.conds.map(c => compile(c, e.vars));
      if (!fv || fc.some(f => !f)) { skipped.push(`${it.id}: ${e.key} ${e.val}${e.conds.length ? ' if(' + e.conds.join(' && ') + ')' : ''}`); continue; }
      const t = table[e.key] = table[e.key] || new Array(REFINE_MAX + 1).fill(0);
      for (let r = 0; r <= REFINE_MAX; r++) if (fc.every(f => f(r))) t[r] += fv(r);
    }
    for (const [key, t] of Object.entries(table)) emit(rec, key, t);
    if (Object.keys(rec).length) { out[it.id] = rec; n++; }
  }
  return { out, skipped, n, cards: Object.keys(out).filter(id => CARDS[id]).length };
}

const { out, skipped, n, cards } = build();
console.log(`有詠唱／延遲／冷卻效果的道具 ${n} 件（其中卡片 ${cards} 張）`);
console.log(`略過 ${skipped.length} 條（條件或寫法不支援）`);
skipped.slice(0, process.argv.includes('--all') ? Infinity : 40).forEach(s => console.log('  ' + s));
if (WRITE) {
  const body = Object.keys(out).sort().map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(out[id])},`).join('\n');
  fs.writeFileSync(OUT, `/* 由 scripts/gen_item_cast_bonus.js --write 產生，勿手改。
   在 data.js 之後載入：先清掉舊的魔改鍵（skillCdFlat 冷卻 ±秒、afterCastPct、fixedCast），
   再把 rAthena 的詠唱／延遲／冷卻／不可中斷效果併進 ITEMS 與 CARDS（卡片以宿主精煉算）。 */
const ITEM_CAST_BONUS = {
${body}
};
(function applyItemCastBonus() {
  const OLD = /^(skillCdFlat|afterCastPct|fixedCast)/;
  const strip = o => { if (o) for (const k of Object.keys(o)) if (OLD.test(k)) delete o[k]; };
  const clean = d => {
    if (!d) return;
    strip(d.bonus); strip(d.perRefine); strip(d);
    (d.condBonus || []).forEach(c => strip(c.bonus));
  };
  Object.values(ITEMS).forEach(clean);
  Object.values(CARDS).forEach(clean);
  for (const [id, rec] of Object.entries(ITEM_CAST_BONUS)) {
    for (const d of [CARDS[id] || ITEMS[id]]) {
      if (!d) continue;
      for (const [k, v] of Object.entries(rec)) {
        if (k === 'condBonus') d.condBonus = (d.condBonus || []).concat(v);
        else d[k] = Object.assign(d[k] || {}, v);
      }
    }
  }
})();
`);
  console.log('寫入 ' + path.relative(ROOT, OUT));
}
