/* rAthena skill_db / mob_db 條目 → 戰鬥用欄位（原型與正式資料共用）。 */

/* rAthena 的等級欄位有兩種寫法：純值，或 [{ Level, <欄位> }]。一律攤成長度 maxLv 的陣列。 */
function perLevel(v, maxLv, key) {
  if (v == null) return null;
  if (!Array.isArray(v)) return Array(maxLv).fill(v);
  const out = Array(maxLv).fill(0);
  let last = 0;
  for (let lv = 1; lv <= maxLv; lv++) {
    const row = v.find(r => r.Level === lv);
    if (row) last = row[key];
    out[lv - 1] = last;
  }
  return out;
}

function pickSkill(s) {
  const n = s.MaxLevel;
  const unit = s.Unit || null;
  return {
    id: s.Name,
    maxLv: n,
    type: s.Type,
    target: s.TargetType,
    range: perLevel(s.Range, n, 'Size'),
    hitCount: perLevel(s.HitCount, n, 'Count'),
    splash: perLevel(s.SplashArea, n, 'Area'),
    knockback: perLevel(s.Knockback, n, 'Amount'),
    castTime: perLevel(s.CastTime, n, 'Time') || Array(n).fill(0),
    fixedCastTime: perLevel(s.FixedCastTime, n, 'Time') || Array(n).fill(0),
    afterCastDelay: perLevel(s.AfterCastActDelay, n, 'Time') || Array(n).fill(0),
    cooldown: perLevel(s.Cooldown, n, 'Time') || Array(n).fill(0),
    duration: perLevel(s.Duration1, n, 'Time'),
    spCost: perLevel(s.Requires && s.Requires.SpCost, n, 'Amount') || Array(n).fill(0),
    castCancel: s.CastCancel !== false,
    element: s.Element || null,
    unit: unit && { id: unit.Id, layout: unit.Layout, range: perLevel(unit.Range, n, 'Size'), interval: unit.Interval },
  };
}

/* 照 rAthena doc/mob_db_mode_list.txt：Aggressive 位元（0x4）有開的 AI。
   24 是 MVP 召喚的小弟（被動、不亂走），以前誤列成主動；08／10／11／12／19／27 以前漏掉（螳螂是 19） */
const AGGRESSIVE_AI = new Set(['04', '05', '08', '09', '10', '11', '12', '13', '19', '20', '21', '26', '27']);
const IMMOBILE_AI = new Set(['06', '10', '11', '27']);
/* 06 是唯一沒有 CanAttack 位元（0x80）的 AI：蟲蛹、卵、草、菇這類不會攻擊（使用者 2026-11-14 照官方） */
const NO_ATTACK_AI = new Set(['06']);

/* 怪物移動與攻擊節奏（mob_db_re.yml） */
/* T17：屬性／種族／體型照 rAthena，抗性表照 attr_fix（屬性等級 × 攻擊屬性 × 防守屬性） */
const RA_ELE = { Neutral: 'none', Water: 'water', Earth: 'earth', Fire: 'fire', Wind: 'wind', Poison: 'poison', Holy: 'holy', Dark: 'shadow', Ghost: 'ghost', Undead: 'undead' };
const RA_RACE = { Formless: 'formless', Undead: 'undead', Brute: 'brute', Plant: 'plant', Insect: 'insect', Fish: 'fish', Demon: 'demon', Demihuman: 'humanoid', Angel: 'angel', Dragon: 'dragon' };
function eleResistance(attr, defEle, lv) {
  const row = attr && attr.find(r => r.Level === lv);
  if (!row) return null;
  const out = {};
  for (const [raAtk, atk] of Object.entries(RA_ELE)) out[atk] = (row[raAtk] || {})[defEle];
  return out;
}
function pickMobMove(m, attr) {
  const ai = String(m.Ai == null ? '06' : m.Ai).padStart(2, '0');
  return {
    range: m.AttackRange || 1,
    walkMs: m.WalkSpeed || 150,
    attackDelay: m.AttackDelay || 1000,
    attackMotion: m.AttackMotion || 0,
    damageMotion: m.DamageMotion || 480,
    aggressive: AGGRESSIVE_AI.has(ai),
    immobile: IMMOBILE_AI.has(ai),
    ...(NO_ATTACK_AI.has(ai) && !(m.Modes && m.Modes.CanAttack) ? { noAttack: true } : {}),
    eleLv: m.ElementLevel || 1,   // 屬性等級（怪物資訊顯示用；抗性已在 MONSTERS.elementResistance）
    baseExp: m.BaseExp || 0,       // 官方經驗（T4），engine 載入時覆寫 MONSTERS.exp／jobExp
    jobExp: m.JobExp || 0,
    int: m.Int || 1,               // 魔攻用（Renewal：INT＋等級＋Attack2×0.7~1.3）
    matk: m.Attack2 || 0,
    element: RA_ELE[m.Element || 'Neutral'] || 'none',
    race: RA_RACE[m.Race || 'Formless'] || 'formless',
    size: String(m.Size || 'Small').toLowerCase(),
    eleRes: eleResistance(attr, m.Element || 'Neutral', m.ElementLevel || 1),
  };
}

module.exports = { perLevel, pickSkill, pickMobMove, AGGRESSIVE_AI, IMMOBILE_AI };
