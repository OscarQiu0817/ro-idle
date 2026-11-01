/* 一維戰鬥原型的資料：rAthena skill_db / mob_db → proto/combat1d/data.json
   node scripts/gen_proto_data.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const yaml = require('js-yaml');
const { loadGameData, ROOT } = require('./lib/game_data');

const SKILL_IDS = [
  'SM_BASH', 'SM_MAGNUM', 'KN_BOWLINGBASH',
  'AC_DOUBLE', 'AC_SHOWER', 'HT_BLITZBEAT',
  'MG_FIREBOLT', 'MG_THUNDERSTORM', 'MG_FIREWALL',
];
const MAP_NAMES = ['史芬克斯洞穴02', '恩芭拉原野01'];

function readYamlBody(file) {
  // json:true 容許重複鍵（rAthena mob_db 有少數重複的 RaceGroups）
  return yaml.load(fs.readFileSync(path.join(ROOT, file), 'utf8'), { json: true }).Body;
}

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

function pickMob(m, zh) {
  const ai = String(m.Ai == null ? '06' : m.Ai).padStart(2, '0');
  return {
    id: m.AegisName,
    mobId: m.Id,
    name: zh,
    lv: m.Level,
    hp: m.Hp,
    atk: m.Attack || 0,
    def: m.Defense || 0,
    mdef: m.MagicDefense || 0,
    str: m.Str || 0, agi: m.Agi || 0, vit: m.Vit || 0,
    int: m.Int || 0, dex: m.Dex || 0, luk: m.Luk || 0,
    range: m.AttackRange || 1,
    walkMs: m.WalkSpeed || 150,
    attackDelay: m.AttackDelay || 1000,
    damageMotion: m.DamageMotion || 480,
    aggressive: AGGRESSIVE_AI.has(ai),
    immobile: IMMOBILE_AI.has(ai),
    boss: m.Class === 'Boss',
  };
}

function main() {
  const g = loadGameData();
  const skillBody = readYamlBody('grf_ex/skill_db.yml');
  const mobBody = readYamlBody('mob_db_re.yml');
  const mobById = new Map(mobBody.map(m => [m.Id, m]));

  const skills = {};
  for (const id of SKILL_IDS) {
    const s = skillBody.find(x => x.Name === id);
    if (!s) throw new Error('skill_db 找不到 ' + id);
    skills[id] = pickSkill(s);
  }

  const maps = [];
  const mobs = {};
  for (const name of MAP_NAMES) {
    const map = Object.values(g.MAPS).find(x => x.name === name);
    if (!map) throw new Error('MAPS 找不到 ' + name);
    const spawns = [];
    for (const s of map.monsters) {
      const gm = g.MONSTERS[s.id];
      const m = gm && mobById.get(gm.imgId);
      if (!m) { console.warn('略過（mob_db 對不到）', s.id); continue; }
      mobs[m.AegisName] = pickMob(m, gm.name);
      spawns.push({ mob: m.AegisName, weight: s.weight });
    }
    maps.push({ id: map.id, name: map.name, spawns });
  }

  /* 試玩頁的頭飾選單：有紙娃娃圖層的頭飾 */
  const pdCtx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'paperdoll_layers.js'), 'utf8'), pdCtx);
  const pd = pdCtx.window.PAPERDOLL;
  const hats = Object.values(g.ITEMS)
    .filter(it => it.armorType === 'headgear' && pd.view[String(it.imgId)] && pd.clip['hat/' + pd.view[String(it.imgId)] + '/male'])
    .sort((a, b) => a.imgId - b.imgId)
    .filter((it, i, arr) => i === 0 || pd.view[String(it.imgId)] !== pd.view[String(arr[i - 1].imgId)])
    .slice(0, 80)
    .map(it => ({ name: it.name.replace(/\s*\[\d\]$/, ''), view: pd.view[String(it.imgId)] }));

  const out = path.join(ROOT, 'proto', 'combat1d', 'data.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ source: 'rAthena skill_db.yml / mob_db_re.yml', skills, mobs, maps, hats }, null, 1));
  console.log('skills', Object.keys(skills).length, 'mobs', Object.keys(mobs).length, 'maps', maps.length, 'hats', hats.length, '→', path.relative(ROOT, out));
}

main();
