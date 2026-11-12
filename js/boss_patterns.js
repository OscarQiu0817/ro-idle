/* 王的紅圈技能表（T51 第 4 期，使用者 2026-11-12）
   BOSS_SKILL_LIB：招式範本。shape 決定紅圈形狀（js/boss_fight.js 的 bossZonesFor），
     wind＝預警 ms、dmg＝最大 HP 的比例、kind＝phys（吃 DEF／VIT）或 magic（吃 MDEF／INT）。
   特殊形狀：
     nova   全場，閃不掉：只能扛（站姿「硬扛」、防禦、護盾）或補血
     share  分攤圈：落在目標腳下，圈裡每多一人每人少吃一份（自動閃避的人會往圈裡站）
   快速預警（wind < 1000）的招，反應慢（AGI／DEX 低）的人會來不及躲。
   BOSS_PATTERNS：專屬輪替（依序循環），每項 { use: 範本, ...覆寫 }。
   沒寫的 MVP 用 BOSS_GENERIC_MVP；迷你王依種族分組（BOSS_MINI_BY_RACE）。 */
const BOSS_SKILL_LIB = {
  charge:  { name: '衝撞', shape: 'charge', wind: 1100, dmg: 0.30, kind: 'phys' },
  jump:    { name: '彈跳', shape: 'jump', wind: 1500, dmg: 0.35, kind: 'phys' },
  bombard: { name: '連環轟炸', shape: 'bombard', wind: 1800, dmg: 0.25, kind: 'magic' },
  sweep:   { name: '橫掃', shape: 'sweep', wind: 1300, dmg: 0.40, kind: 'phys' },
  quake:   { name: '震地', shape: 'quake', wind: 1900, dmg: 0.45, kind: 'phys' },
  nova:    { name: '全場衝擊', shape: 'nova', wind: 2200, dmg: 0.18, kind: 'magic' },
  share:   { name: '分攤重擊', shape: 'share', wind: 2400, dmg: 0.50, kind: 'phys' },
  pounce:  { name: '急襲', shape: 'jump', wind: 750, dmg: 0.22, kind: 'phys' },
  // 虛擬對手（第 5 期）用的形狀：不移動施術者
  spot:    { name: '定點轟擊', shape: 'spot', wind: 1500, dmg: 0.30, kind: 'magic', r: 2.5 },   // 目標腳下的圓
  burst:   { name: '爆發', shape: 'burst', wind: 1600, dmg: 0.35, kind: 'phys', r: 3 },        // 施術者身邊的圓
  beam:    { name: '光束', shape: 'beam', wind: 1800, dmg: 0.45, kind: 'phys', w: 1.6, len: 10 }, // 施術者朝目標的直線（不衝過去）
  ring:    { name: '外圈', shape: 'ring', wind: 1700, dmg: 0.35, kind: 'phys', r0: 2.5, r1: 6 }, // 施術者外圈（貼近才安全）
};

const BOSS_GENERIC_MINI = [{ use: 'charge' }, { use: 'jump' }, { use: 'bombard' }];
const BOSS_GENERIC_MVP = [{ use: 'charge' }, { use: 'jump' }, { use: 'bombard' }, { use: 'sweep' }, { use: 'quake' }];

// 迷你王：依種族分 4 組，不再全部一樣
const BOSS_MINI_BY_RACE = {
  brute: BOSS_GENERIC_MINI, insect: BOSS_GENERIC_MINI, fish: BOSS_GENERIC_MINI, plant: BOSS_GENERIC_MINI,
  undead: [{ use: 'pounce', name: '亡者急襲' }, { use: 'bombard', name: '詛咒轟炸' }, { use: 'nova', name: '怨念擴散', dmg: 0.12 }],
  demon: [{ use: 'pounce', name: '惡魔急襲' }, { use: 'bombard', name: '暗黑轟炸' }, { use: 'nova', name: '魔氣擴散', dmg: 0.12 }],
  dragon: [{ use: 'sweep', name: '龍尾橫掃' }, { use: 'quake' }, { use: 'bombard', name: '吐息轟炸' }],
  angel: [{ use: 'sweep' }, { use: 'quake', kind: 'magic', name: '聖光震地' }, { use: 'bombard', name: '光彈' }],
  formless: [{ use: 'sweep' }, { use: 'quake' }, { use: 'bombard' }],
  humanoid: [{ use: 'charge' }, { use: 'sweep', name: '斬擊' }, { use: 'pounce' }, { use: 'share', dmg: 0.4 }],
};

// 熱門 MVP 專屬（先做 10 隻）
const BOSS_PATTERNS = {
  baphomet: [
    { use: 'sweep', name: '鐮刀橫掃', dmg: 0.45 },
    { use: 'jump', name: '惡魔跳斬' },
    { use: 'nova', name: '地獄審判', dmg: 0.20 },
    { use: 'quake', name: '黑暗震地', kind: 'magic' },
  ],
  osiris: [
    { use: 'quake', name: '詛咒之地', kind: 'magic', dmg: 0.40 },
    { use: 'pounce', name: '死者之觸', dmg: 0.25 },
    { use: 'bombard', name: '冥界召喚' },
    { use: 'nova', name: '冥界審判', dmg: 0.20 },
  ],
  golden_bug: [
    { use: 'charge', name: '黃金衝撞', dmg: 0.35 },
    { use: 'quake', name: '甲殼震地' },
    { use: 'share', name: '黃金重壓' },
    { use: 'bombard', name: '金光轟炸' },
  ],
  moonlight: [
    { use: 'pounce', name: '九尾急襲', wind: 700, dmg: 0.25 },
    { use: 'bombard', name: '月光轟炸' },
    { use: 'sweep', name: '妖狐爪擊' },
    { use: 'nova', name: '狐火', dmg: 0.15 },
  ],
  dracula: [
    { use: 'bombard', name: '蝙蝠群', dmg: 0.22 },
    { use: 'pounce', name: '吸血之觸' },
    { use: 'sweep', name: '暗夜橫掃' },
    { use: 'nova', name: '血月', dmg: 0.20 },
  ],
  ork_hero: [
    { use: 'charge', name: '英雄衝鋒', dmg: 0.35 },
    { use: 'sweep', name: '巨斧橫掃', dmg: 0.45 },
    { use: 'share', name: '戰神重擊' },
    { use: 'quake', name: '戰吼震地' },
  ],
  eddga: [
    { use: 'pounce', name: '猛虎撲擊', dmg: 0.30 },
    { use: 'sweep', name: '虎爪橫掃' },
    { use: 'charge', name: '猛虎衝撞' },
    { use: 'nova', name: '虎嘯', dmg: 0.15 },
  ],
  maya: [
    { use: 'bombard', name: '酸液轟炸' },
    { use: 'charge', name: '蟻群衝鋒' },
    { use: 'share', name: '女王重壓' },
    { use: 'quake', name: '蟻穴震動' },
  ],
  pharaoh: [
    { use: 'nova', name: '審判之光', dmg: 0.22 },
    { use: 'quake', name: '沙暴', kind: 'magic' },
    { use: 'jump', name: '詛咒落雷', kind: 'magic' },
    { use: 'bombard', name: '聖甲蟲轟炸' },
  ],
  drake: [
    { use: 'charge', name: '海浪衝撞' },
    { use: 'sweep', name: '彎刀橫掃', dmg: 0.45 },
    { use: 'bombard', name: '艦砲轟擊' },
    { use: 'pounce', name: '亡靈急襲' },
  ],
};

/* 這隻王的輪替（展開成完整招式物件） */
function bossPatternFor(defId) {
  const def = MONSTERS[defId] || {};
  const list = BOSS_PATTERNS[defId] || (def.isMvp ? BOSS_GENERIC_MVP : (BOSS_MINI_BY_RACE[def.race] || BOSS_GENERIC_MINI));
  return list.map(e => Object.assign({}, BOSS_SKILL_LIB[e.use || e.shape], e));
}
