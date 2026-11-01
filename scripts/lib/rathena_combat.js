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

const AGGRESSIVE_AI = new Set(['04', '05', '09', '13', '20', '21', '24', '26']);
const IMMOBILE_AI = new Set(['06', '10']);

/* 怪物移動與攻擊節奏（mob_db_re.yml） */
function pickMobMove(m) {
  const ai = String(m.Ai == null ? '06' : m.Ai).padStart(2, '0');
  return {
    range: m.AttackRange || 1,
    walkMs: m.WalkSpeed || 150,
    attackDelay: m.AttackDelay || 1000,
    attackMotion: m.AttackMotion || 0,
    damageMotion: m.DamageMotion || 480,
    aggressive: AGGRESSIVE_AI.has(ai),
    immobile: IMMOBILE_AI.has(ai),
    eleLv: m.ElementLevel || 1,   // 屬性等級（怪物資訊顯示用；抗性已在 MONSTERS.elementResistance）
    baseExp: m.BaseExp || 0,       // 官方經驗（T4），engine 載入時覆寫 MONSTERS.exp／jobExp
    jobExp: m.JobExp || 0,
  };
}

module.exports = { perLevel, pickSkill, pickMobMove, AGGRESSIVE_AI, IMMOBILE_AI };
