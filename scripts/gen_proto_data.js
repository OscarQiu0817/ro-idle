/* 一維戰鬥原型的資料：rAthena skill_db / mob_db → proto/combat1d/data.json
   node scripts/gen_proto_data.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const yaml = require('js-yaml');
const { loadGameData, ROOT } = require('./lib/game_data');
const { pickSkill, pickMobMove } = require('./lib/rathena_combat');

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

function pickMob(m, zh) {
  const mv = pickMobMove(m);
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
    range: mv.range,
    walkMs: mv.walkMs,
    attackDelay: mv.attackDelay,
    damageMotion: mv.damageMotion,
    aggressive: mv.aggressive,
    immobile: mv.immobile,
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
