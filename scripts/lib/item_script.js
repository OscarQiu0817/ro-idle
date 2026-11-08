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
  bDefRate: 'defPct', bMdefRate: 'mdefPct', bNoGemStone: 'noGemStone',
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
      /* 區域變數：.@x = 式子／+=／-=／set .@x,式子。存成「代換後的式子字串」，
         在 if 裡面指派的包成三元式（條件不成立維持舊值），之後的 bonus 拿到的就是完整式子 */
      const va = t.match(/^(?:set\s+)?\.@(\w+)\s*(=|\+=|-=|\*=|,)\s*([\s\S]+)$/);
      if (va && !/^\.@\w+\s*==/.test(t)) {
        const [, v, op, rhs] = va;
        const sub = substVars(rhs, vars);
        const old = vars[v] != null ? vars[v] : '0';
        const val = op === '+=' ? `(${old})+(${sub})` : op === '-=' ? `(${old})-(${sub})` : op === '*=' ? `(${old})*(${sub})` : sub;
        vars[v] = conds.length ? `((${conds.map(c => substVars(c, vars)).join(')&&(')}))?(${val}):(${old})` : val;
        continue;
      }
      const b = t.match(/^(bonus\d?)\s+(b\w+)\s*(?:,\s*([\s\S]+))?$/);
      if (b) out.push({ fn: b[1], name: b[2], args: b[3] ? splitArgs(b[3]) : [], conds, vars: { ...vars }, raw: t });
      else if (/^skill\s/.test(t)) out.push({ fn: 'skill', name: 'skill', args: splitArgs(t.replace(/^skill\s+/, '')), conds, vars: { ...vars }, raw: t });
      else if (/^autobonus[23]?\s/.test(t)) { const nm = t.match(/^(autobonus[23]?)/)[1]; out.push({ fn: nm, name: nm, args: splitArgs(t.slice(nm.length).trim()), conds, vars: { ...vars }, raw: t }); }
      else if (/^(bonus|autobonus)\b/.test(t)) out.push({ fn: 'other', name: t.split(/[\s,]/)[0], args: [], conds, vars: { ...vars }, raw: t });
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

/* 區域變數代換：.@x → (式子)。沒指派過的變數 rAthena 是 0 */
function substVars(s, vars) {
  return String(s).replace(/\.@(\w+)/g, (m, v) => (vars[v] != null ? `(${vars[v]})` : '0'));
}
/* 腳本裡的條件與變數 → 原子（$名稱），compile 的 env 用同一組名稱：
     R          精煉值              $s_<素質>   readparam（本作看加點素質）
     $blv/$jlv  基礎／職業等級      $k_<技能>   學到的技能等級
     $wlv       手上武器等級        $w_<W_類別> 手上武器是不是這一類（0/1）
     $bc_/$bj_  職業血脈有這個職業  $cl_        目前職業就是這個
     $third     三轉以上            $eq_<id…>   穿著這幾件 */
const STAT = { bStr: 'str', bAgi: 'agi', bVit: 'vit', bInt: 'int', bDex: 'dex', bLuk: 'luk' };
function atomize(e) {
  return String(e)
    .replace(/\(\s*(getiteminfo\(\s*getequipid\(\s*EQI_(?:HAND_R|COMPOUND_ON)\s*\)\s*,\s*(?:ITEMINFO_VIEW|11)\s*\))\s*\)/g, '$1')
    .replace(/getequiprefinerycnt\(\s*EQI_HAND_R\s*\)/g, '$wref')
    .replace(/\bUpper\s*!=\s*2/g, '1').replace(/\bUpper\s*==\s*2/g, '0')
    .replace(/getiteminfo\(\s*getequipid\(\s*EQI_(?:HAND_R|COMPOUND_ON)\s*\)\s*,\s*(?:ITEMINFO_VIEW|11)\s*\)\s*(==|!=)\s*(W_\w+)/g,
      (m, op, w) => (op === '!=' ? '!' : '') + '$w_' + w)
    .replace(/\(\s*eaclass\(\)\s*&\s*EAJ_BASEMASK\s*\)\s*(==|!=)\s*EAJ_(\w+)/g, (m, op, j) => (op === '!=' ? '!' : '') + '$bc_Job_' + j)
    .replace(/\(?\s*eaclass\(\)\s*&\s*EAJL_THIRD\s*\)?/g, '$third')
    .replace(/\b(BaseClass|BaseJob|Class)\s*(==|!=)\s*(Job_\w+)/g, (m, k, op, j) =>
      (op === '!=' ? '!' : '') + (k === 'Class' ? '$cl_' : k === 'BaseJob' ? '$bj_' : '$bc_') + j.replace(/_T$/, ''))   // 轉生版（_T）本作同一個職業
    .replace(/readparam\(\s*(b\w+)\s*\)/g, (m, s) => (STAT[s] ? '$s_' + STAT[s] : m))
    .replace(/\bBaseLevel\b/g, '$blv').replace(/\bJobLevel\b/g, '$jlv')
    .replace(/getskilllv\(\s*"?(\w+)"?\s*\)/g, (m, s) => '$k_' + s.toLowerCase())
    .replace(/getequipweaponlv\([^)]*\)/g, '$wlv')
    .replace(/isequipped\(([^)]*)\)/g, (m, ids) => '$eq_' + ids.split(',').map(x => x.trim()).join('_'))
    .replace(/vip_status\([^)]*\)/g, '0')
    .replace(/getrefine\(\)/g, 'R')
    .replace(/getenchantgrade\([^)]*\)/g, '0')
    .replace(/ENCHANTGRADE_(NONE|D|C|B|A)\b/g, (m, x) => ({ NONE: 0, D: 1, C: 2, B: 3, A: 4 })[x]);
}
/* 運算式 → f(env)，env.R 是精煉、其他原子用名稱查（沒給的當 0）。
   回傳的函式帶 dims（用到的原子）與 usesR。看不懂回 null */
function compile(expr, vars) {
  const e = atomize(substVars(expr, vars || {}));
  const toks = e.match(/\d+|\$\w+|R|min|max|pow|&&|\|\||==|!=|>=|<=|[-+*/%()?:<>!,&]|\S/g) || [];
  if (toks.some(t => !/^(\d+|\$\w+|R|min|max|pow|&&|\|\||==|!=|>=|<=|[-+*/%()?:<>!,&])$/.test(t))) return null;
  const dims = [...new Set(toks.filter(t => t === 'R' || t[0] === '$'))];
  const f = env => {
    env = typeof env === 'number' ? { R: env } : (env || {});
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
      if (t === 'R' || (t && t[0] === '$')) return env[t] || 0;
      if (t === 'min' || t === 'max' || t === 'pow') { eat('('); const a = tern(); eat(','); const b = tern(); eat(')'); return Math[t](a, b); }
      if (/^\d+$/.test(t)) return +t;
      throw 0;
    };
    const mul = bin(un, ['*', '/', '%'], (op, a, b) => op === '*' ? a * b : op === '/' ? (b ? Math.trunc(a / b) : 0) : (b ? a % b : 0));
    const add = bin(mul, ['+', '-'], (op, a, b) => op === '+' ? a + b : a - b);
    const cmp = bin(add, ['<', '>', '<=', '>='], (op, a, b) => +(op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b));
    const eq = bin(cmp, ['==', '!='], (op, a, b) => +(op === '==' ? a === b : a !== b));
    const band = bin(eq, ['&'], (op, a, b) => a & b);
    const and = bin(band, ['&&'], (op, a, b) => +(a && b));
    const or = bin(and, ['||'], (op, a, b) => +(a || b));
    const v = tern();
    if (i !== toks.length) throw 0;
    return v;
  };
  try { f({}); return Object.assign(f, { usesR: dims.includes('R'), dims }); } catch (_) { return null; }
}

/* 異常狀態 */
const EFF = {
  Eff_Stun: 'stun', Eff_Freeze: 'freeze', Eff_Stone: 'stone', Eff_Sleep: 'sleep', Eff_Poison: 'poison', Eff_DPoison: 'poison',
  Eff_Curse: 'curse', Eff_Silence: 'silence', Eff_Confusion: 'confusion', Eff_Blind: 'blind', Eff_Bleeding: 'bleed', Eff_Fear: 'fear',
};
/* 第 2 類（2026-11-07）：本作有機制、原本沒對應的。scale：rAthena 單位 → 本作（萬分比→%、千分比→%） */
const B1X = {
  bHPrecovRate: 'hpRegenPct', bSPrecovRate: 'spRegenPct', bAddItemHealRate: 'itemHealPct', bHPGainValue: 'hpOnMeleeKill',
  bSPDrainValue: 'spOnAttack', bShortWeaponDamageReturn: 'reflectPct', bMagicDamageReturn: 'magicReflectChance',
};
const X_EXACT = ['hpRegenPct', 'spRegenPct', 'itemHealPct', 'hpOnMeleeKill', 'lifeStealChance', 'lifeStealPct', 'spStealChance', 'spStealPct',
  'spOnAttack', 'reflectPct', 'magicReflectChance', 'splashAttack', 'rangedDmgTakenPct', 'meltdownAtkChance', 'meltdownDefChance',
  'defIgnorePct', 'mdefIgnorePct', 'bossMdefIgnorePct', 'regenTickHp', 'regenTickSp', 'rangedCritRate', 'bossDefIgnorePct'];
const X_PREFIX = ['monDmgTaken_', 'monEleDmgTaken_', 'comaRace_', 'spOnAttackRace_', 'itemSpHeal_', 'familyDmg_', 'ailResist_', 'raceCrit_', 'spOnKillRace_', 'monDmg_', 'itemHeal_', 'spCost_', 'armorEle_', 'atkEle_', 'magicTargetEleDmg_', 'mdefIgnoreRace_'];
X_EXACT.push('dropPct', 'spOnMagicKill', 'spOnRangedKill', 'hpOnMagicKill', 'regenTickHpPct', 'regenTickSpPct', 'comaNormalPct',
  'normalDefIgnorePct', 'normalMdefIgnorePct', 'ignoreSizePenalty', 'defRatioAtk', 'reviveFullRestore', 'magicImmunePct');
X_EXACT.forEach(k => OWN_EXACT.add(k));
OWN_PREFIX.push(...X_PREFIX);

/* 一條 bonus → [{ key, expr, scale? }]；認不得回 null；本作沒有的對象（技能、怪、道具）回 []
   opt.skills／opt.mobKey(官方怪 id → 本作 key)／opt.itemKeys(官方道具 id → [本作 key]) */
function keysOf(en, skills, opt) {
  opt = opt || {};
  const A = en.args;
  if (en.fn === 'bonus' && en.name in B1) return [{ key: B1[en.name], expr: (en.name === 'bNoCastCancel' || en.name === 'bNoGemStone') ? '1' : A[0] }];
  if (en.fn === 'bonus' && en.name in B1X) return [{ key: B1X[en.name], expr: A[0] }];
  if (en.fn === 'bonus' && en.name === 'bSPGainValue') return Object.values(RACE).map(r => ({ key: 'spOnKillRace_' + r, expr: A[0] }));
  if (en.fn === 'bonus' && en.name === 'bDefEle' && ELE[A[0]]) return [{ key: 'armorEle_' + ELE[A[0]], expr: '1' }];
  if (en.fn === 'bonus' && en.name === 'bSplashRange') return [{ key: 'splashAttack', expr: '1' }];
  // ---- 第 4 類（2026-11-08）----
  const X4 = { bMagicSPGainValue: 'spOnMagicKill', bLongSPGainValue: 'spOnRangedKill', bMagicHPGainValue: 'hpOnMagicKill', bNoMagicDamage: 'magicImmunePct' };
  if (en.fn === 'bonus' && X4[en.name]) return [{ key: X4[en.name], expr: A[0] }];
  if (en.fn === 'bonus' && en.name === 'bNoSizeFix') return [{ key: 'ignoreSizePenalty', expr: '1' }];
  if (en.fn === 'bonus' && en.name === 'bDefRatioAtkClass') return A[0] === 'Class_All' ? [{ key: 'defRatioAtk', expr: '1' }] : null;
  if (en.fn === 'bonus' && en.name === 'bRestartFullRecover') return [{ key: 'reviveFullRestore', expr: '1' }];
  if (en.fn === 'bonus' && en.name === 'bDef2Rate') return [];   // 本作 DEF% 硬防軟防一起打折，同件的 bDefRate 已涵蓋
  if (en.fn === 'bonus2' && (en.name === 'bHPLossRate' || en.name === 'bSPLossRate') && /^\d+$/.test(A[1])) return [{ key: en.name === 'bHPLossRate' ? 'regenTickHp' : 'regenTickSp', expr: `-(${A[0]})`, scale: 10000 / +A[1] }];
  if (en.fn === 'bonus2' && (en.name === 'bRegenPercentHP' || en.name === 'bRegenPercentSP') && /^\d+$/.test(A[1])) return [{ key: en.name === 'bRegenPercentHP' ? 'regenTickHpPct' : 'regenTickSpPct', expr: A[0], scale: 10000 / +A[1] }];
  if (en.fn === 'bonus2' && en.name === 'bAddDefMonster') { const k = opt.mobKey && opt.mobKey[+A[0]]; return k ? [{ key: 'monDmgTaken_' + k, expr: `-(${A[1]})` }] : []; }
  if (en.fn === 'bonus2' && en.name === 'bSubDefEle') { const l = ALL[A[0]] || (ELE[A[0]] ? [ELE[A[0]]] : null); return l ? l.map(e => ({ key: 'monEleDmgTaken_' + e, expr: `-(${A[1]})` })) : null; }
  if (en.fn === 'bonus3' && en.name === 'bSubEle') { const l = ALL[A[0]] || (ELE[A[0]] ? [ELE[A[0]]] : null); return l ? l.map(e => ({ key: 'eleReduce_' + e, expr: A[1] })) : null; }
  if (en.fn === 'bonus2' && en.name === 'bComaRace') { if (/^RC_Player_/.test(A[0])) return []; const l = ALL[A[0]] || (RACE[A[0]] ? [RACE[A[0]]] : null); return l ? l.map(r => ({ key: 'comaRace_' + r, expr: A[1], scale: 0.01 })) : null; }
  if (en.fn === 'bonus2' && en.name === 'bComaClass') return (A[0] === 'Class_Normal' || A[0] === 'Class_All') ? [{ key: 'comaNormalPct', expr: A[1], scale: 0.01 }] : [];
  if (en.fn === 'bonus2' && en.name === 'bSPDrainValueRace') { if (/^RC_Player_/.test(A[0])) return []; const l = ALL[A[0]] || (RACE[A[0]] ? [RACE[A[0]]] : null); return l ? l.map(r => ({ key: 'spOnAttackRace_' + r, expr: A[1] })) : null; }
  if (en.fn === 'bonus2' && en.name === 'bAddRace2') { const f = { RC2_Goblin: 'goblin', RC2_Kobold: 'kobold', RC2_Golem: 'golem', RC2_Orc: 'orc', RC2_SCARABA: 'scaraba' }[A[0]]; return f ? [{ key: 'familyDmg_' + f, expr: A[1] }] : []; }
  if (en.fn === 'bonus2' && en.name === 'bAddItemGroupHealRate') { const ks = opt.groups && opt.groups[String(A[0]).replace(/^IG_/, '').toUpperCase()]; return ks ? ks.map(k => ({ key: 'itemHeal_' + k, expr: A[1] })) : []; }
  if (en.fn === 'bonus2' && en.name === 'bAddItemSPHealRate') { const ks = opt.itemKeys && opt.itemKeys[+A[0]]; return ks ? ks.map(k => ({ key: 'itemSpHeal_' + k, expr: A[1] })) : []; }
  if (en.fn === 'bonus' && en.name === 'bAgiVit') return [{ key: 'agi', expr: A[0] }, { key: 'vit', expr: A[0] }];
  if (en.fn === 'bonus' && en.name === 'bAgiDexStr') return ['agi', 'dex', 'str'].map(k => ({ key: k, expr: A[0] }));
  if (en.fn === 'bonus' && en.name === 'bCriticalLong') return [{ key: 'rangedCritRate', expr: A[0] }];
  if (en.fn === 'bonus' && en.name === 'bNoCastCancel2') return [{ key: 'noCastCancel', expr: '1' }];
  if (en.fn === 'bonus' && en.name === 'bAtkEle' && ELE[A[0]]) return [{ key: 'atkEle_' + ELE[A[0]], expr: '1' }];
  if (en.fn === 'bonus2' && en.name === 'bMagicAddEle') { const l = ALL[A[0]] || (ELE[A[0]] ? [ELE[A[0]]] : null); return l ? l.map(e => ({ key: 'magicTargetEleDmg_' + e, expr: A[1] })) : null; }
  if (en.fn === 'bonus2' && en.name === 'bIgnoreMdefRaceRate') { if (/^RC_Player_/.test(A[0])) return []; const l = ALL[A[0]] || (RACE[A[0]] ? [RACE[A[0]]] : null); return l ? l.map(r => ({ key: 'mdefIgnoreRace_' + r, expr: A[1] })) : null; }
  if (en.fn === 'bonus2' && en.name === 'bDropAddRace') return A[0] === 'RC_All' ? [{ key: 'dropPct', expr: A[1] }] : null;
  if (en.fn === 'bonus' && en.name === 'bLongAtkDef') return [{ key: 'rangedDmgTakenPct', expr: `-(${A[0]})` }];
  if (en.fn === 'bonus' && en.name === 'bBreakWeaponRate') return [{ key: 'meltdownAtkChance', expr: A[0], scale: 0.01 }];
  if (en.fn === 'bonus' && en.name === 'bBreakArmorRate') return [{ key: 'meltdownDefChance', expr: A[0], scale: 0.01 }];
  if (en.fn === 'bonus' && en.name === 'bNoRegen') return [{ key: String(A[0]) === '2' ? 'spRegenPct' : 'hpRegenPct', expr: '-100' }];
  if (en.fn === 'bonus' && en.name === 'bIgnoreDefRace') return A[0] === 'RC_All' ? [{ key: 'defIgnorePct', expr: '100' }] : RACE[A[0]] ? [{ key: 'defIgnoreRace_' + RACE[A[0]], expr: '100' }] : (/^RC_Player_/.test(A[0]) ? [] : null);
  if (en.fn === 'bonus' && en.name === 'bIgnoreDefClass') return A[0] === 'Class_All' ? [{ key: 'defIgnorePct', expr: '100' }] : A[0] === 'Class_Boss' ? [{ key: 'bossDefIgnorePct', expr: '100' }] : A[0] === 'Class_Normal' ? [{ key: 'normalDefIgnorePct', expr: '100' }] : null;
  if (en.fn === 'bonus2' && en.name === 'bIgnoreDefClassRate') return A[0] === 'Class_All' ? [{ key: 'defIgnorePct', expr: A[1] }] : A[0] === 'Class_Normal' ? [{ key: 'normalDefIgnorePct', expr: A[1] }] : null;
  if (en.fn === 'bonus2' && en.name === 'bIgnoreMdefClassRate') return A[0] === 'Class_All' ? [{ key: 'mdefIgnorePct', expr: A[1] }] : A[0] === 'Class_Boss' ? [{ key: 'bossMdefIgnorePct', expr: A[1] }] : A[0] === 'Class_Normal' ? [{ key: 'normalMdefIgnorePct', expr: A[1] }] : null;
  // 每 t 毫秒回 n（本作的定時回復固定 10 秒一次，換算成每 10 秒的量）
  if (en.fn === 'bonus2' && (en.name === 'bHPRegenRate' || en.name === 'bSPRegenRate') && /^\d+$/.test(A[1])) return [{ key: en.name === 'bHPRegenRate' ? 'regenTickHp' : 'regenTickSp', expr: A[0], scale: 10000 / +A[1] }];
  if (en.fn === 'bonus2' && A.length >= 2) {
    const cat = String(A[0]).replace(/"/g, '');
    if (en.name === 'bResEff') return EFF[cat] ? [{ key: 'ailResist_' + EFF[cat], expr: A[1], scale: 0.01 }] : null;
    if (en.name === 'bCriticalAddRace' || en.name === 'bSPGainRace') {
      if (/^RC_Player_/.test(cat)) return [];
      const list = ALL[cat] || (RACE[cat] ? [RACE[cat]] : null);
      const p = en.name === 'bCriticalAddRace' ? 'raceCrit_' : 'spOnKillRace_';
      return list ? list.map(r => ({ key: p + r, expr: A[1] })) : null;
    }
    if (en.name === 'bAddDamageClass') { const k = opt.mobKey && opt.mobKey[+cat]; return k ? [{ key: 'monDmg_' + k, expr: A[1] }] : []; }
    if (en.name === 'bAddItemHealRate') {
      const ks = opt.itemKeys && opt.itemKeys[+cat];
      return ks ? ks.map(k => ({ key: 'itemHeal_' + k, expr: A[1] })) : (/^\d+$/.test(cat) ? [] : null);
    }
    if (en.name === 'bSkillUseSP') { const id = cat.toLowerCase(); return skills && !skills[id] ? [] : [{ key: 'spCost_' + id, expr: `-(${A[1]})` }]; }
    if (en.name === 'bHPDrainRate' || en.name === 'bSPDrainRate') {
      const p = en.name === 'bHPDrainRate' ? 'life' : 'sp';
      return [{ key: p + 'StealChance', expr: A[0], scale: 0.1 }, { key: p + 'StealPct', expr: A[1] }];
    }
  }
  if (en.fn === 'bonus2' && en.name in B2 && A.length >= 2) {
    const [prefix, table] = B2[en.name];
    const cat = A[0].replace(/"/g, '');
    if (table === 'skill') {
      const id = cat.toLowerCase();
      return skills && !skills[id] ? [] : [{ key: prefix + id, expr: A[1] }];
    }
    if (/^RC_Player_/.test(cat)) return [];   // 只對玩家（PvP），本作沒有
    const list = ALL[cat] || (table[cat] ? [table[cat]] : null);
    return list ? list.map(v => ({ key: prefix + v, expr: A[1] })) : null;
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
/* ---- 多維條件（第 3 類，2026-11-07）----
   精煉以外還看素質／等級／技能／職業／武器的式子：在各原子的值域上逐點算，
   再用「混合差分」拆成一組 condBonus（每項的 when 是各原子「≥ 某值」或「成立」的交集）。
   加總鍵才能這樣拆；castFixedPct（區間絕對值）不拆。 */
const W_CAT = {
  W_FIST: ['bare'], W_DAGGER: ['dagger'], W_1HSWORD: ['sword1'], W_2HSWORD: ['sword2'], W_1HSPEAR: ['spear1'], W_2HSPEAR: ['spear2'],
  W_1HAXE: ['axe1'], W_2HAXE: ['axe2'], W_MACE: ['mace'], W_2HMACE: ['mace'], W_STAFF: ['rod1'], W_2HSTAFF: ['rod2'], W_BOW: ['bow'],
  W_KNUCKLE: ['knuckle'], W_MUSICAL: ['instrument'], W_WHIP: ['whip'], W_BOOK: ['book'], W_KATAR: ['katar'],
  W_REVOLVER: ['pistol'], W_RIFLE: ['rifle'], W_GATLING: ['gatling'], W_SHOTGUN: ['shotgun'], W_GRENADE: ['grenade'],
};
const JOB_ALIAS = { swordman: 'swordsman', genetic: 'geneticist' };
function jobOf(name, jobs) {
  if (!jobs || /^Job_Baby/.test(name)) return null;
  let n = name.replace(/^Job_/, '').replace(/_T$/, '').replace(/_/g, '').toLowerCase();
  n = JOB_ALIAS[n] || n;
  return jobs[n] ? n : null;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function dimSpec(d, opt) {
  let m;
  if (d === 'R') return { dom: range(0, REFINE_MAX), when: v => ({ refineMin: v }) };
  if ((m = d.match(/^\$s_(\w+)$/))) return { dom: range(0, 130), when: v => ({ statMin: { [m[1]]: v } }) };
  if (d === '$blv') return { dom: range(1, 250), when: v => ({ levelMin: v }) };
  if (d === '$jlv') return { dom: range(1, 70), when: v => ({ jobLevelMin: v }) };
  if ((m = d.match(/^\$k_(\w+)$/))) {
    const sk = opt.skills && opt.skills[m[1]];
    return sk ? { dom: range(0, sk.maxLv || 10), when: v => ({ skillMin: { [m[1]]: v } }) } : { dom: [0] };
  }
  if (d === '$wlv') return { dom: range(0, 5), when: v => ({ weaponLvMin: v }) };
  if (d === '$wref') return { dom: range(0, REFINE_MAX), when: v => ({ weaponRefineMin: v }) };
  if ((m = d.match(/^\$w_(W_\w+)$/))) { const c = W_CAT[m[1]]; return c ? { dom: [0, 1], when: () => ({ weaponCat: c }) } : { dom: [0] }; }
  if ((m = d.match(/^\$(bc|bj|cl)_(Job_\w+)$/))) {
    const j = jobOf(m[2], opt.jobs);
    return j ? { dom: [0, 1], when: () => (m[1] === 'cl' ? { jobIs: j } : { jobLine: j }) } : { dom: [0] };
  }
  if (d === '$third') return { dom: [0, 1], when: () => ({ tierMin: 3 }) };
  if ((m = d.match(/^\$eq_(.+)$/))) {
    const keys = m[1].split('_').map(i => opt.itemKeys && opt.itemKeys[+i]);
    if (keys.some(k => !k)) return { dom: [0] };
    return { dom: [0, 1], when: () => (keys.length === 1 ? { withAnyItem: keys[0] } : { withItems: keys.map(k => k[0]) }) };
  }
  return null;
}
const MIN_KEYS = ['refineMin', 'levelMin', 'jobLevelMin', 'weaponLvMin', 'weaponRefineMin', 'tierMin'];
function mergeWhen(a, b) {
  const o = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (k === 'statMin' || k === 'skillMin') { o[k] = { ...(o[k] || {}) }; for (const [x, y] of Object.entries(v)) o[k][x] = Math.max(o[k][x] || 0, y); }
    else if (MIN_KEYS.includes(k)) o[k] = Math.max(o[k] || 0, v);
    else if (o[k] != null && JSON.stringify(o[k]) !== JSON.stringify(v)) return null;
    else o[k] = v;
  }
  return o;
}
const MAX_TERMS = 160;
/* f(x) = c + v×floor(x/N)（N=1..30）→ { c, v, prefix }；prefix 是 engine getCardBonus 認得的 per 鍵 */
function linearPer(fn, d, opt) {
  let m, prefix;
  if (d === '$blv') prefix = n => `perLv_${n}_`;
  else if (d === '$jlv') prefix = n => `perJobLv_${n}_`;
  else if ((m = d.match(/^\$s_(\w+)$/))) prefix = n => `perStat_${m[1]}_${n}_`;
  else if ((m = d.match(/^\$k_(\w+)$/)) && opt.skills && opt.skills[m[1]]) prefix = n => `perSkill_${m[1]}_${n}_`;
  else return null;
  const spec = dimSpec(d, opt);
  const xs = spec.dom, ys = xs.map(x => fn({ [d]: x }));
  if (ys.every(y => y === ys[0])) return null;
  for (let n = 1; n <= 30; n++) {
    const i = xs.findIndex(x => Math.floor(x / n) !== Math.floor(xs[0] / n));
    if (i < 0) continue;
    const v = ys[i] - ys[0], c = ys[0] - v * Math.floor(xs[0] / n);
    if (v && xs.every((x, k) => Math.abs(ys[k] - (c + v * Math.floor(x / n))) < 1e-9)) return { c: Math.round(c * 1000) / 1000, v: Math.round(v * 1000) / 1000, prefix: prefix(n) };
  }
  return null;
}
function decompose(fn, dims, opt) {
  const specs = dims.map(d => dimSpec(d, opt));
  if (specs.some(s => !s)) return null;
  const size = specs.reduce((n, s) => n * s.dom.length, 1);
  if (size > 400000) return null;
  const T = new Float64Array(size);
  for (let p = 0; p < size; p++) {
    let r = p; const env = {};
    for (let k = dims.length - 1; k >= 0; k--) { const n = specs[k].dom.length; env[dims[k]] = specs[k].dom[r % n]; r = Math.floor(r / n); }
    T[p] = fn(env);
  }
  let stride = 1;
  for (let k = dims.length - 1; k >= 0; k--) {
    const n = specs[k].dom.length;
    for (let p = size - 1; p >= 0; p--) if (Math.floor(p / stride) % n > 0) T[p] -= T[p - stride];
    stride *= n;
  }
  const terms = [];
  for (let p = 0; p < size; p++) {
    if (Math.abs(T[p]) < 1e-9) continue;
    let r = p, when = {};
    for (let k = dims.length - 1; k >= 0 && when; k--) {
      const n = specs[k].dom.length, i = r % n; r = Math.floor(r / n);
      if (i > 0) when = mergeWhen(when, specs[k].when(specs[k].dom[i]));
    }
    if (!when) continue;   // 互相矛盾的條件（兩個不同職業）永遠不成立
    terms.push({ when, v: Math.round(T[p] * 1000) / 1000 });
    if (terms.length > MAX_TERMS) return null;
  }
  return terms;
}
function convert(entries, opt) {
  opt = opt || {};
  const rec = {}, skipped = [], table = {}, skippedFam = new Set(), multi = [];
  for (const en of entries) {
    const ks = keysOf(en, opt.skills, opt);
    if (!ks) { if (!opt.keys) skipped.push(en.raw); continue; }
    for (const { key, expr, scale } of ks) {
      if (opt.keys && !opt.keys.some(k => k.endsWith('_') ? key.startsWith(k) : key === k)) continue;
      const sc = scale || 1;
      const fv = compile(expr, en.vars);
      const fc = en.conds.map(c => compile(c, en.vars));
      const fail = () => { skipped.push(en.raw + (en.conds.length ? '  if(' + en.conds.join(' && ') + ')' : '')); skippedFam.add(familyOf(key)); };
      if (!fv || fc.some(f => !f) || (opt.refine === false && (fv.usesR || fc.some(f => f.usesR)))) { fail(); continue; }
      const dims = [...new Set([...fv.dims, ...fc.flatMap(f => f.dims)])];
      if (dims.every(d => d === 'R')) {
        const t = table[key] = table[key] || new Array(REFINE_MAX + 1).fill(0);
        for (let r = 0; r <= REFINE_MAX; r++) if (fc.every(f => f(r))) t[r] += fv(r) * sc;
        continue;
      }
      const g = env => (fc.every(f => f(env)) ? fv(env) * sc : 0);
      const lp = dims.length === 1 && key !== 'castFixedPct' ? linearPer(g, dims[0], opt) : null;
      if (key === 'castFixedPct' && dims.includes('R')) { fail(); continue; }
      if (lp) { if (lp.c) multi.push({ key, when: {}, v: lp.c }); multi.push({ key: lp.prefix + key, when: {}, v: lp.v }); continue; }
      // 兩個原子相加的（-(AGI+BaseLevel) 那種）：可分離就各自轉 per 鍵
      if (dims.length === 2 && key !== 'castFixedPct') {
        const [d1, d2] = dims, x0 = dimSpec(d1, opt), y0 = dimSpec(d2, opt);
        if (x0 && y0 && x0.dom.length * y0.dom.length <= 400000) {
          const b1 = x0.dom[0], b2 = y0.dom[0];
          const sep = x0.dom.every(x => y0.dom.every(y => Math.abs(g({ [d1]: x, [d2]: y }) - g({ [d1]: x, [d2]: b2 }) - g({ [d1]: b1, [d2]: y }) + g({ [d1]: b1, [d2]: b2 })) < 1e-9));
          const p1 = sep && linearPer(env => g({ [d1]: env[d1], [d2]: b2 }), d1, opt);
          const p2 = sep && linearPer(env => g({ [d1]: b1, [d2]: env[d2] }), d2, opt);
          if (p1 && p2) {
            const c = p1.c + p2.c - g({ [d1]: b1, [d2]: b2 });
            if (c) multi.push({ key, when: {}, v: Math.round(c * 1000) / 1000 });
            multi.push({ key: p1.prefix + key, when: {}, v: p1.v }, { key: p2.prefix + key, when: {}, v: p2.v });
            continue;
          }
        }
      }
      const terms = key === 'castFixedPct' && dims.includes('R') ? null : decompose(g, dims, opt);
      if (!terms) { fail(); continue; }
      terms.forEach(t => multi.push({ key, ...t }));
    }
  }
  for (const [key, t] of Object.entries(table)) emit(rec, key, t, opt.perStyle);
  for (const { key, when, v } of multi) {
    if (!Object.keys(when).length) { (rec.bonus = rec.bonus || {})[key] = (rec.bonus[key] || 0) + v; continue; }
    rec.condBonus = rec.condBonus || [];
    const same = rec.condBonus.find(c => JSON.stringify(c.when) === JSON.stringify(when));
    if (same) same.bonus[key] = (same.bonus[key] || 0) + v; else rec.condBonus.push({ when, bonus: { [key]: v } });
  }
  if (rec.condBonus && !rec.condBonus.length) delete rec.condBonus;
  return { rec, skipped, skippedFam };
}

/* 異常（攻擊附帶／被打反擊）、擊殺掉落、賦予技能（第 2 類）→ 本作 ailment／killDrop／grantSkill 清單。
   條件或數值只隨精煉變的依精煉分段；用到其他原子的不轉（列缺口）。對象本作沒有的（技能、道具）直接略過。 */
function specialsOf(entries, opt) {
  opt = opt || {};
  const lists = { ailment: [], killDrop: [], grantSkill: [], autoBonus: [] }, done = new Set(), skipped = [], kinds = new Set();
  const segs = (fns, mk) => {
    const at = r => JSON.stringify(fns.map(f => f(r)));
    const out = [];
    for (let a = 0; a <= REFINE_MAX;) {
      let b = a; const cur = at(a);
      while (b < REFINE_MAX && at(b + 1) === cur) b++;
      const e = mk(JSON.parse(cur));
      if (e) { if (a > 0 || b < REFINE_MAX) e.when = b === REFINE_MAX ? { refineMin: a } : { refineMin: a, refineMax: b }; out.push(e); }
      a = b + 1;
    }
    return out;
  };
  for (const en of entries) {
    const A = en.args;
    let kind = null, parts = null;
    if ((en.name === 'bAddEff' || en.name === 'bAddEffWhenHit') && /^bonus[23]$/.test(en.fn)) {
      kind = 'ailment';
      const type = EFF[A[0]], flag = String(A[2] || '');
      if (type && (!/ATF_SELF/.test(flag) || /ATF_TARGET/.test(flag))) {
        const on = en.name === 'bAddEff' ? (/ATF_MAGIC/.test(flag) && !/ATF_WEAPON/.test(flag) ? 'magic' : 'attack') : 'hit';
        parts = { exprs: [A[1]], mk: ([rate]) => (rate > 0 ? { on, type, chance: rate / 100 } : null) };
      }
    } else if (en.name === 'bAddEff2' && en.fn === 'bonus2') {
      kind = 'ailment';
      const type = EFF[A[0]];
      if (type) parts = { exprs: [A[1]], mk: ([rate]) => (rate > 0 ? { on: 'attack', type, chance: rate / 100, target: 'self' } : null) };
    } else if (en.name === 'bAddEffOnSkill' && en.fn === 'bonus3') {
      kind = 'ailment';
      const sk = String(A[0]).replace(/"/g, '').toLowerCase(), type = EFF[A[1]];
      if (!opt.skills || !opt.skills[sk]) parts = 'none';
      else if (type) parts = { exprs: [A[2]], mk: ([rate]) => (rate > 0 ? { on: 'skill', skill: sk, type, chance: rate / 100 } : null) };
    } else if (en.name === 'bAddMonsterDropItemGroup' && en.fn === 'bonus2') {
      kind = 'killDrop';
      const ks = opt.groups && opt.groups[String(A[0]).replace(/^IG_/, '').toUpperCase()];
      // 官方機率要再乘群組內各道具的權重，換算不直觀；沒寫明數字的一律 0.5%（使用者 2026-11-08）
      if (!ks || !ks.length) parts = 'none';
      else parts = { exprs: ['1'], mk: () => ({ items: ks, chance: 0.5 }) };
    } else if (en.name === 'bAddMonsterIdDropItem' && en.fn === 'bonus3') {
      kind = 'killDrop';
      const ks = opt.itemKeys && opt.itemKeys[+A[0]], mk = opt.mobKey && opt.mobKey[+A[1]];
      if (!ks || !mk) parts = 'none';
      else parts = { exprs: [A[2]], mk: ([rate]) => (rate > 0 ? { mon: mk, items: [ks[0]], chance: rate / 100 } : null) };
    } else if (en.name === 'bGetZenyNum' && en.fn === 'bonus2') {
      kind = 'killDrop';
      parts = { exprs: [A[0], A[1]], mk: ([n, rate]) => (n > 0 && rate > 0 ? { zenyMax: n, chance: rate } : null) };
    } else if (/^autobonus[23]?$/.test(en.fn)) {
      kind = 'autoBonus';
      // autobonus "{ 腳本 }",機率(千分比),持續(ms),flag,"{ 特效 }"；autobonus2 是被打時
      const inner = String(A[0] || '').replace(/^"\{|\}"$/g, '');
      const sub = convert(parseScript(inner), opt);
      const flag = String(A[3] || '');
      const sk3 = en.fn === 'autobonus3' ? String(A[3] || '').replace(/"/g, '').toLowerCase() : null;
      if (sk3 && (!opt.skills || !opt.skills[sk3])) { done.add(en.raw); continue; }
      const ons = en.fn === 'autobonus3' ? ['skill'] : en.fn === 'autobonus2' ? ['hit'] : /BF_MAGIC/.test(flag) && !/BF_WEAPON/.test(flag) ? ['magic'] : /BF_MAGIC/.test(flag) ? ['attack', 'magic'] : ['attack'];
      if (!sub.skipped.length && sub.rec.bonus && !sub.rec.condBonus && Object.keys(sub.rec).length === 1)
        parts = { exprs: [A[1], A[2]], mk: ([rate, dur]) => (rate > 0 && dur > 0 ? { ons, chance: rate / 10, durMs: dur, bonus: sub.rec.bonus, ...(sk3 ? { skill: sk3 } : {}) } : null) };
    } else if (en.name === 'bAddMonsterDropItem' && /^bonus[23]$/.test(en.fn)) {
      kind = 'killDrop';
      const keys = opt.itemKeys && opt.itemKeys[+A[0]];
      const race = en.fn === 'bonus3' ? A[1] : null, rateArg = en.fn === 'bonus3' ? A[2] : A[1];
      const r = race && race !== 'RC_All' ? RACE[race] : null;
      if (!keys) parts = 'none';
      else if (!race || race === 'RC_All' || r) parts = { exprs: [rateArg], mk: ([rate]) => (rate > 0 ? { ...(r ? { race: r } : {}), items: [keys[0]], chance: rate / 100 } : null) };
    } else if (en.fn === 'skill') {
      kind = 'grantSkill';
      const id = String(A[0] || '').replace(/"/g, '').toLowerCase();
      if (!opt.skills || !opt.skills[id]) parts = 'none';
      else parts = { exprs: [A[1] || '1'], mk: ([lv]) => (lv > 0 ? { id, lv } : null) };
    } else continue;
    kinds.add(kind);
    if (parts === 'none') { done.add(en.raw); continue; }
    const fns = parts ? parts.exprs.map(x => compile(x, en.vars)) : [];
    const fc = en.conds.map(c => compile(c, en.vars));
    if (!parts || fns.some(f => !f) || fc.some(f => !f)) { skipped.push(en.raw); continue; }
    const xd = [...new Set([...fns, ...fc].flatMap(f => f.dims))].filter(d => d !== 'R');
    if (xd.length) {
      // 單一數值（機率／等級）才拆；條件不成立的組合直接沒有
      if (fns.length !== 1 || fns[0].dims.includes('R') && kind === 'grantSkill') { skipped.push(en.raw); continue; }
      const dims = [...new Set([...fns[0].dims, ...fc.flatMap(f => f.dims)])];
      const terms = decompose(env => (fc.every(c => c(env)) ? fns[0](env) : 0), dims, opt);
      if (!terms || terms.some(t => t.v < 0) || (kind === 'grantSkill' && terms.length > 1)) { skipped.push(en.raw); continue; }
      terms.forEach(t => { const e = parts.mk([t.v]); if (e) { if (Object.keys(t.when).length) e.when = t.when; lists[kind].push(e); } });
      done.add(en.raw);
      continue;
    }
    const g = fns.map(f => r => (fc.every(c => c(r)) ? f(r) : 0));
    const got = segs(g, parts.mk);
    if (kind === 'autoBonus') got.forEach(e => e.ons.forEach(on => { const x = { ...e, on }; delete x.ons; lists.autoBonus.push(x); }));
    else lists[kind].push(...got);
    done.add(en.raw);
  }
  return { lists, done, skipped, kinds };
}

/* 自動念咒（T16）：bonus3/4/5 bAutoSpell（普攻時）、bAutoSpellWhenHit（被打時）→ [{ on, skill, lv, chance, when?, useLearnedLv? }]
   機率 rAthena 是千分比。等級或機率隨精煉變 → 依精煉分段（when.refineMin／refineMax）。
   max(getskilllv("同技能"),N) → lv N＋useLearnedLv（學得更高就用學到的等級）。
   技能或魔法觸發的（flag 帶 BF_MAGIC／BF_SKILL／BF_MISC）本作沒有對應時機，跟其他轉不了的一起列缺口。
   bonus4 bAutoSpellOnSkill,施放的技能,接著放的技能,lv,機率 → on:'chain'（engine 的連鎖念咒，元素劍那種）。 */
const AUTOSPELL_ON = { bAutoSpell: 'attack', bAutoSpellWhenHit: 'hit', bAutoSpellOnSkill: 'chain' };
// 職業／道具對照（產生器設定；自動念咒的條件拆分要用）
const AUTOSPELL_CTX = { jobs: null, itemKeys: null };
function setContext(c) { AUTOSPELL_CTX.jobs = c.jobs; AUTOSPELL_CTX.itemKeys = c.itemKeys; }
function autoSpellsOf(entries, skills, refineOk) {
  const list = [], skipped = [];
  for (const en of entries) {
    if (!(en.name in AUTOSPELL_ON) || !/^bonus[345]$/.test(en.fn)) continue;
    const chain = en.name === 'bAutoSpellOnSkill';
    const after = chain ? String(en.args[0] || '').replace(/"/g, '').toLowerCase() : null;
    if (chain && (!skills || !skills[after])) { skipped.push(en.raw); continue; }
    const [skArg, lvArg, rateArg, flag, other] = chain ? en.args.slice(1) : en.args;
    const id = String(skArg || '').replace(/"/g, '').toLowerCase();
    const fl0 = String(flag || '') + ' ' + String(other || '');
    const magicOnly = /BF_MAGIC/.test(fl0) && !/BF_(WEAPON|SHORT|LONG|NORMAL)/.test(fl0);
    if (!skills || !skills[id] || (/BF_(SKILL|MISC)/.test(fl0) && !/BF_(WEAPON|SHORT|LONG|NORMAL|MAGIC)/.test(fl0))) { skipped.push(en.raw); continue; }
    const onOf = () => (magicOnly ? (en.name === 'bAutoSpellWhenHit' ? 'hitMagic' : en.name === 'bAutoSpell' ? 'magic' : null) : AUTOSPELL_ON[en.name]);
    if (!onOf()) { skipped.push(en.raw); continue; }
    let lvExpr = lvArg, learned = false;
    const m = String(lvArg || '').match(/^max\(getskilllv\("(\w+)"\),\s*(\d+)\)$/);
    if (m && m[1].toLowerCase() === id) { lvExpr = m[2]; learned = true; }
    let fl = compile(lvExpr, en.vars);
    const fr = compile(rateArg, en.vars), fc = en.conds.map(c => compile(c, en.vars));
    if (!fl || !fr || fc.some(f => !f) || (!refineOk && (fl.usesR || fr.usesR || fc.some(f => f.usesR)))) { skipped.push(en.raw); continue; }
    // 等級寫成「學到 Lv10 就放 Lv10」「max(1,學到的等級)」：本作用 useLearnedLv 近似（學得比基本等級高就放學到的）
    if (fl.dims.length && fl.dims.every(d => d === '$k_' + id)) {
      const base = Math.max(1, fl({}));
      fl = Object.assign(() => base, { dims: [], usesR: false });
      learned = true;
    }
    if (fl.dims.some(d => d !== 'R')) { skipped.push(en.raw); continue; }
    const xd = [...new Set([fr, ...fc].flatMap(f => f.dims))].filter(d => d !== 'R');
    if (xd.length) {
      if (fl.usesR) { skipped.push(en.raw); continue; }
      const lv = Math.min(skills[id].maxLv || 99, fl({}));
      const dims = [...new Set([...fr.dims, ...fc.flatMap(f => f.dims)])];
      const terms = decompose(env => (fc.every(c => c(env)) ? fr(env) : 0), dims, { skills, jobs: AUTOSPELL_CTX.jobs, itemKeys: AUTOSPELL_CTX.itemKeys });
      if (!terms || terms.some(t => t.v < 0) || lv <= 0) { skipped.push(en.raw); continue; }
      terms.forEach(t => {
        const e = { on: onOf(), skill: id, lv, chance: t.v / 10 };
        if (chain) e.after = after;
        if (learned) e.useLearnedLv = true;
        if (Object.keys(t.when).length) e.when = t.when;
        list.push(e);
      });
      continue;
    }
    const maxLv = skills[id].maxLv || 99;   // 等級隨精煉長的（電鰻 +20 → Lv20）照官方封頂在技能上限
    const at = r => (fc.every(f => f(r)) ? [Math.min(maxLv, fl(r)), fr(r)] : null);
    for (let a = 0; a <= REFINE_MAX;) {
      const cur = JSON.stringify(at(a));
      let b = a;
      while (b < REFINE_MAX && JSON.stringify(at(b + 1)) === cur) b++;
      const v = at(a);
      if (v && v[0] > 0 && v[1] > 0) {
        const e = { on: onOf(), skill: id, lv: v[0], chance: v[1] / 10 };
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

module.exports = { parseScript, compile, convert, keysOf, autoSpellsOf, specialsOf, setContext, ownKey, familyOf, B1, B2, RACE, ELE, SIZE };
