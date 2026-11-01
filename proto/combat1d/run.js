/* 原型情境：3 職業 × 2 地圖，每組 3 個種子、各 20 分鐘
   node proto/combat1d/run.js [any|melee|pushback|none]   結果表（打斷規則，預設 any）
   node proto/combat1d/run.js trace      印出巫師前 30 秒事件 */
const { createSim, DATA } = require('./sim');

const { CLASSES } = require('./classes');
/* [職業, 角色覆寫, 模擬設定]；日常打怪不風箏（P2），風箏只留一組當參考 */
const VARIANTS = [
  ['knight', {}, {}],
  ['knight', { label: '騎士｜方向角' }, { angular: true }],
  ['hunter', {}, {}],
  ['hunter', { label: '獵人｜方向角' }, { angular: true }],
  ['wizard', { label: '巫師｜圓圈牆' }, {}],
  ['wizard', { label: '巫師｜弧形牆' }, { angular: true }],
  ['wizard', { label: '巫師｜圓圈牆＋早放', wallTriggerD: 9 }, {}],
  ['wizard', { label: '巫師｜弧形牆＋早放', wallTriggerD: 9 }, { angular: true }],
  ['wizard', { label: '巫師｜弧形牆＋早放＋風箏', wallTriggerD: 9, kite: true }, { angular: true }],
  ['wizard', { label: '巫師｜不可中斷', noCastCancel: true }, { angular: true }],
];
const RULES = (process.argv[2] && process.argv[2] !== 'trace') ? [process.argv[2]] : ['any'];
const MINUTES = 20;
const SEEDS = [1, 2, 3];

const MAX_FIELD = Number(process.env.MAX_FIELD || 5);
function runOne(player, mapId, seed, interruptRule, simCfg) {
  return createSim({ player, mapId, seed, interruptRule, maxField: MAX_FIELD, ...simCfg }).run(MINUTES * 60000).m;
}

function main() {
  if (process.argv[2] === 'trace') {
    const sim = createSim({ player: { ...CLASSES.wizard, wallTriggerD: 9 }, mapId: DATA.maps[0].id, seed: 1, trace: 30000, angular: true });
    sim.run(30000);
    console.log(sim.derived);
    console.log(sim.state.log.join('\n'));
    return;
  }
  const rows = [];
  for (const rule of RULES)
  for (const map of DATA.maps) {
    for (const [cls, over, simCfg] of VARIANTS) {
      const player = { ...CLASSES[cls], ...over };
      const sum = {};
      for (const seed of SEEDS) {
        const m = runOne(player, map.id, seed, rule, simCfg);
        for (const k of Object.keys(m)) if (typeof m[k] === 'number') sum[k] = (sum[k] || 0) + m[k];
      }
      const n = SEEDS.length * MINUTES;
      rows.push({
        規則: rule,
        地圖: map.name,
        職業: player.label,
        '擊殺/分': (sum.kills / n).toFixed(1),
        '承傷/分': Math.round(sum.dmgTaken / n),
        打斷率: sum.castsTimed ? Math.round(sum.interrupts / sum.castsTimed * 100) + '%' : '—',
        死亡: sum.deaths,
        '紅水/分': (sum.hpPots / n).toFixed(1),
        '藍水/分': (sum.spPots / n).toFixed(1),
        詠唱佔比: Math.round(sum.castMs / (n * 60000) * 100) + '%',
        閒置佔比: Math.round(sum.idleMs / (n * 60000) * 100) + '%',
      });
    }
  }
  console.table(rows);
}

main();
