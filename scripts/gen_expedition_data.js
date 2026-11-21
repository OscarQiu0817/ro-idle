/* 遠征原型（T65 第 0 期）的資料：四個主題的怪物（真的 RO 數值＋圖集）→ proto/expedition/data.js
   node scripts/gen_expedition_data.js */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');

const THEMES = [
  { name: '獸人村', map: 'gef_fild10', boss: 'ork_hero', floor: 'grass' },
  { name: '斐揚洞穴', map: 'pay_dun01', boss: 'moonlight', floor: 'cave_rock' },
  { name: '人面獅身', map: 'in_sphinx3', boss: 'pharaoh', floor: 'desert' },
  { name: '古城', map: 'gl_cas01', boss: 'dark_lord', floor: 'glast_heim' },
];
const RANGED = new Set(['archer_skeleton', 'orc_archer', 'marduk', 'pasana', 'rideword', 'dark_frame']);
const PASSIVE = /plant|mushroom|mimic/;   // 草、菇不會打人；邪惡箱太怪先不放

const d = loadGameData();
const mobAnim = JSON.parse(fs.readFileSync(path.join(ROOT, 'images/mob_anim/index.json'), 'utf8'));
const playerAnim = JSON.parse(fs.readFileSync(path.join(ROOT, 'images/player_anim/index.json'), 'utf8'));

function pick(id, weight) {
  const m = d.MONSTERS[id];
  if (!m) return null;
  const a = mobAnim[String(m.imgId)];
  if (!a) return null;
  const { cell, anchor, cols, actions } = a;
  return {
    id, name: m.name, imgId: m.imgId, lv: m.level, hp: m.hp, atk: m.atk || 0, def: m.def || 0,
    race: m.race, element: m.element, size: m.size, ranged: RANGED.has(id), weight: weight || 1,
    anim: { cell, anchor, cols, actions },
  };
}

const themes = THEMES.map(t => {
  const map = d.MAPS.find(m => m.id === t.map);
  const mobs = map.monsters.filter(x => !PASSIVE.test(x.id)).map(x => pick(x.id, x.weight)).filter(Boolean);
  return { name: t.name, floor: `../../images/maps/floor/${t.floor}.jpg`, mobs, boss: pick(t.boss) };
});
const pk = 'knight_male_sword1';
const pa = playerAnim[pk];
const out = {
  themes,
  player: { sheet: `../../images/player_anim/${pk}.png`, anim: { cell: pa.cell, anchor: pa.anchor, cols: pa.cols, actions: pa.actions } },
};
const file = path.join(ROOT, 'proto/expedition/data.js');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, '/* 由 scripts/gen_expedition_data.js 產生，不要手改 */\nwindow.EXP_DATA = ' + JSON.stringify(out) + ';\n');
themes.forEach(t => console.log(t.name, t.mobs.map(m => m.name).join('、'), '王：' + (t.boss && t.boss.name)));
