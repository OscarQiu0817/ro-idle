/* 3a：戰鬥資料（rAthena → js/），3b／3c 接進引擎用；本身不改遊戲行為。
   node scripts/gen_combat_data.js
     → js/skill_cast_data.js  SKILL_CAST[技能 id]：詠唱、固詠、後延遲、冷卻、可否打斷、射程、範圍、擊退、段數、場地
     → js/mob_move.js         MOB_MOVE[怪物 id]：射程、每格毫秒、攻擊間隔、攻擊動作、受擊硬直、主動／不會動
   技能 id 已是 rAthena 名稱小寫（3a 改名），直接轉大寫查 skill_db。
   怪物：先用怪物 id 對 mob_db AegisName，對不到再用 imgId 對 mob_db Id。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { readYamlBody } = require('./lib/rathena');
const { pickSkill, pickMobMove } = require('./lib/rathena_combat');

const HEADER = src => `/* 此檔由 scripts/gen_combat_data.js 產生，不要手改。來源：rAthena ${src}。 */\n`;

function writeTable(file, name, src, table) {
  const lines = Object.keys(table).sort().map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(table[k]) + ',');
  fs.writeFileSync(path.join(ROOT, 'js', file), HEADER(src) + `const ${name} = {\n${lines.join('\n')}\n};\n`);
}

function main() {
  const g = loadGameData();

  /* 技能 */
  const skillDb = new Map(readYamlBody(path.join('grf_ex', 'skill_db.yml')).map(s => [s.Name, s]));
  const cast = {};
  const noSkill = [];
  for (const id of Object.keys(g.SKILLS)) {
    const s = skillDb.get(id.toUpperCase());
    if (!s) { noSkill.push(id); continue; }
    const p = pickSkill(s);
    delete p.id;
    delete p.spCost;   // SP 消耗仍以 skills.js 為準，等 3c 再決定是否改用官方值
    cast[id] = p;
  }
  writeTable('skill_cast_data.js', 'SKILL_CAST', 'db/re/skill_db.yml', cast);

  /* 怪物 */
  const mobBody = readYamlBody('mob_db_re.yml');
  const byAegis = new Map(mobBody.map(m => [String(m.AegisName).toLowerCase(), m]));
  const byId = new Map(mobBody.map(m => [m.Id, m]));
  const move = {};
  const by = { aegis: 0, imgId: 0 };
  const noMob = [];
  for (const mon of Object.values(g.MONSTERS)) {
    let m = byAegis.get(String(mon.id).toLowerCase());
    if (m) by.aegis++;
    else if (mon.imgId && byId.get(mon.imgId)) { m = byId.get(mon.imgId); by.imgId++; }
    if (!m) { noMob.push(mon.id); continue; }
    move[mon.id] = pickMobMove(m);
  }
  writeTable('mob_move.js', 'MOB_MOVE', 'db/re/mob_db.yml（mob_db_re.yml）', move);

  console.log('技能', Object.keys(g.SKILLS).length, '｜寫入', Object.keys(cast).length, '｜skill_db 沒有', noSkill.length, noSkill.join(' '));
  console.log('怪物', Object.keys(g.MONSTERS).length, '｜寫入', Object.keys(move).length,
    '（AegisName', by.aegis, '／imgId', by.imgId, '）｜對不到', noMob.length, noMob.slice(0, 20).join(' '));
}

main();
