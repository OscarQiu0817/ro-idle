/* 附魔石池（D7，使用者 2026-11-14）：全裝備最多 2 個附魔孔、先開孔、找附魔師；
   有附魔石就直接裝，沒有就隨機。
   node scripts/gen_enchants.js           → 印報告
   node scripts/gen_enchants.js --write   → 寫 js/enchants.js

   來源：本作 ITEMS 裡的附魔石（官方編號 4700～4999），效果照 rAthena item_db 腳本轉換。
   只收範圍內、通用的種類；職業限定、幻影系列、外服專用、星座等不收。
   同系列依等級分 4 檔稀有度，隨機附魔照權重抽。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemDb } = require('./lib/rathena');
const { parseScript, convert, setContext } = require('./lib/item_script');

const WRITE = process.argv.includes('--write');
const OUT = path.join(ROOT, 'js', 'enchants.js');

/* 收錄的系列：名稱比對（去掉結尾數字、Lv、+、%、。後） */
const FAMILIES = [
  ['str', /^STR\+\d+/], ['agi', /^AGI\+\d+/], ['vit', /^VIT\+\d+/],
  ['int', /^INT\+\d+/], ['dex', /^DEX\+\d+/], ['luk', /^LUK\+\d+/],
  ['def', /^DEF\+\d+/], ['mdef', /^MDEF\+\d+/], ['hp', /^HP\+\d+/], ['sp', /^SP\+\d+/],
  ['mhp', /^MHP\+\d+%/], ['msp', /^MSP\+\d+%/], ['flee', /^FLEE\+\d+/], ['cri', /^CRI\+\d+/], ['hit', /^HIT\+\d+/],
  ['ess_str', /^魔神的武力精髓/], ['ess_int', /^魔神的智慧精髓/], ['ess_agi', /^魔神的速度精髓/],
  ['ess_vit', /^魔神的體力精髓/], ['ess_dex', /^魔神的集中精髓/], ['ess_luk', /^魔神的幸運精髓/],
  ['crit', /^暴擊Lv/], ['dodge', /^(流溢Lv|完全迴避\+)/],
  ['fighting', /^鬥志Lv/], ['spell', /^魔力Lv/], ['sharp', /^尖銳Lv/], ['archer', /^名弓Lv/], ['fatal', /^致命Lv/],
  ['aspd', /^ASPD\+\d/], ['acd', /^攻擊後延遲Lv/], ['skd', /^技能後延遲Lv/], ['save', /^節約Lv/], ['chant', /^咒語\d/],
  ['phys', /^對全階級的物理傷害\+\d+%/], ['matkp', /^MATK\+\d+%/],
  ['neutral', /^無屬性抗性Lv/], ['size_l', /^攻擊大型/], ['size_m', /^攻擊中型/], ['size_s', /^攻擊小型/],
  ['heal', /^恢復效果上升/], ['sprec', /^SP恢復/],
];
const FAMILY_NAME = {
  str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK', def: 'DEF', mdef: 'MDEF', hp: 'HP', sp: 'SP',
  mhp: 'MaxHP%', msp: 'MaxSP%', flee: 'FLEE', cri: 'CRI', hit: 'HIT',
  ess_str: '魔神精髓・武力', ess_int: '魔神精髓・智慧', ess_agi: '魔神精髓・速度', ess_vit: '魔神精髓・體力', ess_dex: '魔神精髓・集中', ess_luk: '魔神精髓・幸運',
  crit: '暴擊', dodge: '完全迴避', fighting: '鬥志', spell: '魔力', sharp: '尖銳', archer: '名弓', fatal: '致命',
  aspd: 'ASPD', acd: '攻擊後延遲', skd: '技能後延遲', save: '節約', chant: '咒語', phys: '物理傷害%', matkp: 'MATK%',
  neutral: '無屬性抗性', size_l: '攻擊大型', size_m: '攻擊中型', size_s: '攻擊小型', heal: '恢復效果', sprec: 'SP 恢復',
};
const TIER_WEIGHT = [100, 35, 10, 2];   // 同系列由低到高四檔

function build() {
  const { ITEMS } = loadGameData('js/item_identity.js');
  const db = loadItemDb();
  setContext({ skills: loadGameData().SKILLS, jobs: {}, mobKey: {}, itemKeys: {}, groups: {} });
  const byFam = {};
  const skipped = [];
  const seenImg = new Set();
  for (const it of Object.values(ITEMS)) {
    if (!(it.imgId >= 4700 && it.imgId <= 4999) || /卡片$/.test(it.name)) continue;
    const name = it.name.replace(/。$/, '');
    const fam = FAMILIES.find(([, re]) => re.test(name));
    if (!fam) continue;
    const ra = db.get(it.imgId);
    if (!ra || !ra.Script) { skipped.push(name + '（rAthena 沒腳本）'); continue; }
    const conv = convert(parseScript(ra.Script), { perStyle: 'card' });
    const bonus = conv.rec.bonus || {};
    if (!Object.keys(bonus).length || conv.skipped.length) { skipped.push(name + '：' + conv.skipped.join('；')); continue; }
    const key = name;
    if (seenImg.has(fam[0] + key)) continue;   // 同名重複的（MATK+1% 有兩顆）只收先出現那顆
    seenImg.add(fam[0] + key);
    (byFam[fam[0]] = byFam[fam[0]] || []).push({ id: it.id, name, bonus });
  }
  const out = {};
  for (const [fam, list] of Object.entries(byFam)) {
    // 同系列照效果大小排：取 bonus 數值絕對值總和
    const mag = e => Object.values(e.bonus).reduce((s, v) => s + Math.abs(v), 0);
    list.sort((a, b) => mag(a) - mag(b));
    list.forEach((e, i) => {
      const tier = list.length === 1 ? 1 : Math.min(4, 1 + Math.floor(i * 4 / list.length));
      out[e.id] = { name: e.name, fam, tier, weight: TIER_WEIGHT[tier - 1], bonus: e.bonus };
    });
  }
  return { out, skipped, byFam };
}

const { out, skipped, byFam } = build();
console.log(`收錄 ${Object.keys(out).length} 顆、${Object.keys(byFam).length} 系列`);
for (const [fam, list] of Object.entries(byFam)) console.log(`  ${FAMILY_NAME[fam] || fam}：${list.map(e => e.name).join(' ')}`);
if (skipped.length) console.log('略過：\n  ' + skipped.join('\n  '));
if (WRITE) {
  const body = Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  fs.writeFileSync(OUT, `/* 由 scripts/gen_enchants.js --write 產生，勿手改。
   附魔石池（D7，使用者 2026-11-14）：fam 系列、tier 稀有度 1～4、weight 隨機附魔權重、bonus 效果（rAthena 腳本轉換）。
   在 item_effects.js 之後載入：附魔石寫進 CARDS（slot 'enchant'，不能當卡片插），效果走卡片加成流程。 */
const ENCHANTS = {
${body}
};
const ENCHANT_FAMILY_NAME = ${JSON.stringify(FAMILY_NAME)};
Object.entries(ENCHANTS).forEach(([id, e]) => {
  CARDS[id] = { id, monsterId: null, name: e.name, icon: '💠', slot: 'enchant', bonus: e.bonus, desc: (CARDS[id] && CARDS[id].desc) || '' };
});
// 原作者當卡片插的其他附魔石（DEF+20、ATK+5…）：不進隨機池，但有石頭仍可請附魔師裝
Object.values(CARDS).forEach(c => { if (c.slot === 'any' && !/卡片$/.test(c.name)) c.slot = 'enchant'; });
Object.values(CARDS).forEach(c => {
  const it = ITEMS[c.id];
  if (c.slot !== 'enchant' || !it || /💠 附魔石/.test(it.desc || '')) return;
  it.desc = (it.desc || c.name) + ' （💠 附魔石：到各城「精煉・附魔區」找附魔師，裝在已開的附魔孔上' + (ENCHANTS[c.id] ? '；可從商城附魔轉蛋取得' : '') + '。）';
});
`);
  console.log('已寫入 ' + path.relative(ROOT, OUT));
}
