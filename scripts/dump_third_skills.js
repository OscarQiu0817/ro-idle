/* 三轉技能資料整理（使用者 2026-11-24：開始做三轉技能，第一批修羅、皇家禁衛隊、大主教、十字斬首者）。
   合併：rAthena skill_tree（前置）＋ skill_db（SP、詠唱、冷卻、範圍、屬性）＋ battle.cpp 倍率片段 ＋ 台服 skillinfoz（中文名稱、說明）
   node scripts/dump_third_skills.js [Sura,Royal_Guard,...]  → scripts/out/third_skills.json ＋ 摘要 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const ROOT = path.join(__dirname, '..');
const JOBS = (process.argv[2] || 'Sura,Royal_Guard,Arch_Bishop,Guillotine_Cross').split(',');

function lub(file) {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/lib/lub.js'), 'utf8')
    .replace("d.toString('utf8', pos, pos + n - 1)", "new TextDecoder('big5').decode(d.subarray(pos, pos + n - 1))");
  const m = { exports: {} };
  new Function('module', 'exports', 'require', src)(m, m.exports, require);
  const t = m.exports.readLub(path.join(ROOT, file));
  return t[Object.keys(t)[0]];
}
const info = lub('grf_ex/skillinfoz/skillinfolist.lub');
const desc = lub('grf_ex/skillinfoz/skilldescript.lub');
const tree = yaml.load(fs.readFileSync(path.join(ROOT, 'grf_ex/skill_tree.yml'), 'utf8'), { json: true }).Body;
const sdb = yaml.load(fs.readFileSync(path.join(ROOT, 'grf_ex/skill_db.yml'), 'utf8'), { json: true }).Body;
const byName = {}; sdb.forEach(s => { byName[s.Name] = s; });
const battle = fs.readFileSync(path.join(ROOT, 'grf_ex/battle.cpp'), 'utf8');
const status = fs.readFileSync(path.join(ROOT, 'grf_ex/status.cpp'), 'utf8');
/* battle.cpp 裡 case SKILL: 到下一個 break 的片段（可能好幾段：倍率、命中、屬性…） */
function snippets(src, name, max = 3) {
  const out = [];
  const re = new RegExp(`case ${name}:`, 'g');
  let m;
  while ((m = re.exec(src)) && out.length < max) {
    const end = src.indexOf('break;', m.index);
    out.push(src.slice(m.index, Math.min(end + 6, m.index + 900)).replace(/\t+/g, ' ').replace(/\r/g, ''));
  }
  return out;
}
const clean = l => String(l).replace(/\^[0-9a-fA-F]{6}/g, '').replace(/\n/g, '');
const lv = v => Array.isArray(v) ? v.map(x => x.Amount != null ? x.Amount : x.Time != null ? x.Time : x.Area != null ? x.Area : x.Size != null ? x.Size : x) : v;
const out = {};
for (const job of JOBS) {
  const e = tree.find(x => x.Job === job);
  if (!e) { console.log('沒有', job); continue; }
  out[job] = (e.Tree || []).map(t => {
    const s = byName[t.Name] || {};
    const tw = info['SKID.' + t.Name] || {};
    return {
      id: t.Name, tw: tw.SkillName || null, maxLv: s.MaxLevel || t.MaxLevel,
      req: (t.Requires || []).map(r => r.Name + r.Level),
      type: s.Type, target: s.TargetType, flags: Object.keys(s.DamageFlags || {}), hit: s.Hit, hitCount: lv(s.HitCount),
      element: lv(s.Element), range: lv(s.Range), splash: lv(s.SplashArea),
      sp: lv((s.Requires || {}).SpCost), hp: lv((s.Requires || {}).HpCost), items: (s.Requires || {}).ItemCost, weapon: (s.Requires || {}).Weapon,
      status: (s.Requires || {}).Status, spheres: lv((s.Requires || {}).SpiritSphereCost),
      cast: lv(s.CastTime), fixed: lv(s.FixedCastTime), acd: lv(s.AfterCastDelay), cd: lv(s.Cooldown), dur1: lv(s.Duration1), dur2: lv(s.Duration2),
      sc: s.Status || null,
      desc: (desc['SKID.' + t.Name] || []).map(clean),
      battle: snippets(battle, t.Name),
    };
  });
}
fs.mkdirSync(path.join(ROOT, 'scripts/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scripts/out/third_skills.json'), JSON.stringify(out, null, 1));
for (const [job, list] of Object.entries(out)) {
  console.log(`\n## ${job}（${list.length}）`);
  list.forEach(s => console.log(`${s.id} ${s.tw} Lv${s.maxLv} ${s.type || '-'}/${s.target || '-'} sp${JSON.stringify(s.sp)} 前置${s.req.join(',')}${s.battle.length ? ' [有公式]' : ''}`));
}
