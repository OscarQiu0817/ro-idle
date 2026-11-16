/* 王的紅圈技能表（T51 第 4 期，使用者 2026-11-12）
   BOSS_SKILL_LIB：招式範本。shape 決定紅圈形狀（js/boss_fight.js 的 bossZonesFor），
     wind＝預警 ms、dmg＝最大 HP 的比例、kind＝phys（吃 DEF／VIT）或 magic（吃 MDEF／INT）。
   特殊形狀：
     nova   全場，閃不掉：只能扛（站姿「硬扛」、防禦、護盾）或補血
     share  分攤圈：落在目標腳下，圈裡每多一人每人少吃一份（自動閃避的人會往圈裡站）
   快速預警（wind < 1000）的招，反應慢（AGI／DEX 低）的人會來不及躲。
   BOSS_PATTERNS：手寫輪替（虛擬對手、道館執行時填入），每項 { use: 範本, ...覆寫 }。
   其餘首領照官方技能產生（BOSS_OFFICIAL_SKILLS，使用者 2026-11-16）；
   一招都對不上的 MVP 用 BOSS_GENERIC_MVP，迷你王依種族分組（BOSS_MINI_BY_RACE）。 */
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

// 手寫輪替：虛擬對手（js/virtual_foe.js）、道館（js/dojo.js）執行時填入
const BOSS_PATTERNS = {};

/* 官方技能 → 紅圈招式（使用者 2026-11-16：王的技能照官方，不再是通用模式）
   鍵＝rAthena mob_skill_db 技能名（js/monster_skills.js 的 s），招式名用 MOB_SKILL_NAMES 的官方中文。
     use    範本（BOSS_SKILL_LIB）；其餘欄位覆寫範本（r、w、len、half、wind、dmg、kind）
     elem   屬性（吃玩家鎧甲屬性與屬性減傷卡）  ail／ailPct  命中後掛的異常與機率（%，預設 50）
     drain  打中多少補王多少  pri  優先度（3 招牌範圍技、2 特色技、1 普通附屬攻擊），塞不下時先留高的
     fx     借用特效（預設＝技能名小寫，對得上 SKILL_FX_PLAN 才播）
   自身行為（不畫紅圈）：self 'buff' 照官方增益值（MONSTER_SKILLS 的 buff／dur）；self 'heal' 回最大 HP 的 heal 比例。
   null＝不做：只對單人減益或吸 SP，紅圈表達不出來。 */
const DEG = Math.PI / 180;
const BOSS_OFFICIAL_SKILLS = {
  // ---- 落點範圍魔法（目標腳下的圈／連環轟炸） ----
  WZ_METEOR:        { use: 'bombard', elem: 'fire', ail: 'stun', ailPct: 30, pri: 3 },
  WZ_STORMGUST:     { use: 'spot', r: 4.5, wind: 1900, dmg: 0.35, elem: 'water', ail: 'freeze', ailPct: 60, pri: 3 },
  MG_THUNDERSTORM:  { use: 'spot', r: 3.5, elem: 'wind', pri: 3 },
  WZ_HEAVENDRIVE:   { use: 'spot', r: 3, elem: 'earth', pri: 3 },
  NPC_EVILLAND:     { use: 'quake', kind: 'magic', elem: 'shadow', pri: 3 },
  WZ_EARTHSPIKE:    { use: 'spot', r: 2, wind: 1100, elem: 'earth', pri: 2 },
  WZ_FIREPILLAR:    { use: 'spot', r: 1.6, wind: 1200, elem: 'fire', pri: 2 },
  AS_VENOMDUST:     { use: 'spot', r: 3, dmg: 0.15, elem: 'poison', ail: 'poison', ailPct: 80, pri: 2 },
  AM_DEMONSTRATION: { use: 'spot', r: 2, kind: 'phys', elem: 'fire', pri: 2 },
  AC_SHOWER:        { use: 'bombard', kind: 'phys', pri: 2 },
  NPC_RANDOMATTACK: { use: 'bombard', kind: 'phys', pri: 1 },
  // ---- 單體魔法（目標腳下小圈） ----
  MG_FIREBALL:      { use: 'spot', r: 2.5, elem: 'fire', pri: 2 },
  WZ_WATERBALL:     { use: 'spot', r: 2.5, elem: 'water', pri: 2 },
  MG_FROSTDIVER:    { use: 'spot', r: 1.6, wind: 900, elem: 'water', ail: 'freeze', ailPct: 60, pri: 2 },
  MG_STONECURSE:    { use: 'spot', r: 1.6, dmg: 0.15, elem: 'earth', ail: 'stone', pri: 2 },
  PR_LEXDIVINA:     { use: 'spot', r: 1.6, dmg: 0.08, elem: 'holy', ail: 'silence', ailPct: 100, pri: 2 },
  NPC_DARKTHUNDER:  { use: 'spot', r: 2.2, elem: 'shadow', pri: 2 },
  BS_HAMMERFALL:    { use: 'spot', r: 2.5, kind: 'phys', ail: 'stun', pri: 2 },
  MG_LIGHTNINGBOLT: { use: 'spot', r: 1.6, wind: 1100, elem: 'wind', pri: 1 },
  MG_SOULSTRIKE:    { use: 'spot', r: 1.6, wind: 1100, elem: 'ghost', pri: 1 },
  MG_NAPALMBEAT:    { use: 'spot', r: 2, elem: 'ghost', pri: 1 },
  NPC_DARKSTRIKE:   { use: 'spot', r: 2.2, elem: 'shadow', pri: 1 },
  NPC_MAGICALATTACK: { use: 'spot', r: 1.6, pri: 1 },
  PF_SPIDERWEB:     { use: 'spot', r: 2, dmg: 0.08, kind: 'phys', ail: 'stun', ailPct: 70, pri: 1 },
  // ---- 施術者周圍 ----
  WZ_FROSTNOVA:     { use: 'burst', r: 4, kind: 'magic', elem: 'water', ail: 'freeze', pri: 3 },
  WZ_SIGHTRASHER:   { use: 'burst', r: 3.5, kind: 'magic', elem: 'fire', pri: 3 },
  ASC_METEORASSAULT: { use: 'burst', r: 3.5, ail: 'blind', pri: 3 },
  NPC_SELFDESTRUCTION: { use: 'burst', r: 4, wind: 2400, dmg: 0.6, pri: 3 },
  SM_MAGNUM:        { use: 'burst', r: 3, elem: 'fire', pri: 2 },
  NPC_PULSESTRIKE:  { use: 'quake', pri: 2 },
  // ---- 直線（吐息、穿刺、箭） ----
  NPC_DARKBREATH:   { use: 'beam', w: 2.4, kind: 'magic', elem: 'shadow', pri: 3 },
  NPC_FIREBREATH:   { use: 'beam', w: 2.4, kind: 'magic', elem: 'fire', pri: 3 },
  LK_SPIRALPIERCE:  { use: 'charge', dmg: 0.35, pri: 3 },
  SN_SHARPSHOOTING: { use: 'beam', w: 1.4, len: 14, dmg: 0.4, pri: 3 },
  WZ_JUPITEL:       { use: 'beam', w: 1.4, wind: 1200, kind: 'magic', elem: 'wind', pri: 2 },
  CR_SHIELDCHARGE:  { use: 'charge', ail: 'stun', pri: 2 },
  AS_SONICBLOW:     { use: 'beam', w: 1.4, len: 6, wind: 900, dmg: 0.35, pri: 2 },
  KN_PIERCE:        { use: 'beam', w: 1.2, len: 7, wind: 1100, pri: 2 },
  AC_CHARGEARROW:   { use: 'beam', w: 1.2, len: 12, pri: 2 },
  CR_HOLYCROSS:     { use: 'beam', w: 2, len: 5, elem: 'holy', pri: 2 },
  NPC_PIERCINGATT:  { use: 'beam', w: 1.2, len: 7, wind: 1100, pri: 1 },
  AC_DOUBLE:        { use: 'beam', w: 1, len: 12, wind: 900, dmg: 0.25, pri: 1 },
  // ---- 前方扇形 ----
  KN_BRANDISHSPEAR: { use: 'sweep', half: 40 * DEG, len: 6, dmg: 0.45, pri: 3 },
  NPC_CRITICALWOUND: { use: 'sweep', ail: 'bleed', ailPct: 60, pri: 2 },
  NPC_BLEEDING:     { use: 'sweep', ail: 'bleed', ailPct: 60, pri: 2 },
  NPC_FIREATTACK:   { use: 'sweep', elem: 'fire', pri: 1 },
  NPC_WATERATTACK:  { use: 'sweep', elem: 'water', pri: 1 },
  NPC_WINDATTACK:   { use: 'sweep', elem: 'wind', pri: 1 },
  NPC_GROUNDATTACK: { use: 'sweep', elem: 'earth', pri: 1 },
  NPC_DARKNESSATTACK: { use: 'sweep', elem: 'shadow', pri: 1 },
  NPC_HOLYATTACK:   { use: 'sweep', elem: 'holy', pri: 1 },
  NPC_TELEKINESISATTACK: { use: 'sweep', elem: 'ghost', pri: 1 },
  NPC_UNDEADATTACK: { use: 'sweep', elem: 'undead', pri: 1 },
  // ---- 撲到目標身上（近身單體） ----
  MC_MAMMONITE:     { use: 'share', pri: 2 },
  NPC_CRITICALSLASH: { use: 'pounce', pri: 1 },
  SM_BASH:          { use: 'pounce', dmg: 0.3, pri: 1 },
  NPC_GUIDEDATTACK: { use: 'jump', pri: 1 },
  NPC_COMBOATTACK:  { use: 'charge', pri: 1 },
  NPC_STUNATTACK:   { use: 'jump', ail: 'stun', pri: 1 },
  NPC_SILENCEATTACK: { use: 'pounce', ail: 'silence', pri: 1 },
  NPC_CURSEATTACK:  { use: 'pounce', ail: 'curse', pri: 1 },
  NPC_BLINDATTACK:  { use: 'pounce', ail: 'blind', pri: 1 },
  NPC_PETRIFYATTACK: { use: 'pounce', ail: 'stone', pri: 1 },
  NPC_POISONATTACK: { use: 'pounce', elem: 'poison', ail: 'poison', pri: 1 },
  TF_POISON:        { use: 'pounce', ail: 'poison', pri: 1 },
  NPC_BLOODDRAIN:   { use: 'pounce', drain: true, pri: 1 },
  NPC_VAMPIRE_GIFT: { use: 'pounce', drain: true, pri: 1 },
  // ---- 全場異常（閃不掉） ----
  NPC_WIDESILENCE:  { use: 'nova', dmg: 0.10, ail: 'silence', ailPct: 70, pri: 2 },
  NPC_WIDECURSE:    { use: 'nova', dmg: 0.10, ail: 'curse', ailPct: 70, pri: 2 },
  NPC_WIDESTUN:     { use: 'nova', dmg: 0.10, ail: 'stun', ailPct: 50, pri: 2 },
  NPC_WIDESLEEP:    { use: 'nova', dmg: 0.10, ail: 'sleep', ailPct: 50, pri: 2 },
  NPC_WIDEBLEEDING: { use: 'nova', dmg: 0.10, ail: 'bleed', ailPct: 70, pri: 2 },
  // ---- 自身行為 ----
  AL_HEAL:          { self: 'heal', heal: 0.03 },
  AM_POTIONPITCHER: { self: 'heal', heal: 0.03 },
  NPC_POWERUP:      { self: 'buff' },
  NPC_AGIUP:        { self: 'buff' },
  KN_TWOHANDQUICKEN: { self: 'buff' },
  BS_ADRENALINE:    { self: 'buff' },
  AL_INCAGI:        { self: 'buff' },
  BS_MAXIMIZE:      { self: 'buff' },
  CR_REFLECTSHIELD: { self: 'buff' },
  CR_AUTOGUARD:     { self: 'buff' },
  MG_SAFETYWALL:    { self: 'buff' },
  NPC_BARRIER:      { self: 'buff' },
  // ---- 不做 ----
  SM_PROVOKE: null, AL_DECAGI: null, PR_LEXAETERNA: null, SA_DISPELL: null,
  NPC_MENTALBREAKER: null, NPC_ENERGYDRAIN: null, WZ_QUAGMIRE: null,
};
const BOSS_ROTATION_MAX = { mvp: [3, 5, 2], mini: [2, 4, 1] };   // [攻擊招最少, 攻擊招最多, 自身行為最多]

/* 照官方技能產生輪替；一招都對不上回傳 null */
function bossOfficialPattern(defId, def) {
  const list = (typeof MONSTER_SKILLS !== 'undefined' && MONSTER_SKILLS[defId]) || [];
  const names = typeof MOB_SKILL_NAMES !== 'undefined' ? MOB_SKILL_NAMES : {};
  const fxOk = id => typeof SKILL_FX_PLAN === 'undefined' || !!SKILL_FX_PLAN[id];
  const atk = [], self = [], seen = new Set();
  list.forEach((e, order) => {
    const map = BOSS_OFFICIAL_SKILLS[e.s];
    if (!map || seen.has(e.s)) return;
    seen.add(e.s);
    const fx = map.fx || e.s.toLowerCase();
    const base = { src: e.s, name: names[e.s] || e.s, fx: fxOk(fx) ? fx : null, order };
    if (map.self === 'buff') {
      if (!e.buff) return;
      self.push(Object.assign(base, { self: 'buff', buff: Object.assign({}, e.buff), dur: e.dur || 30, key: 'b:' + Object.keys(e.buff)[0] }));
    } else if (map.self === 'heal') self.push(Object.assign(base, { self: 'heal', heal: map.heal, key: 'heal' }));
    else {
      const o = Object.assign({}, BOSS_SKILL_LIB[map.use], map, base);
      delete o.use;
      if (e.magic && !map.kind) o.kind = 'magic';
      // 普通附屬攻擊（pri 1）同形狀同異常只留一招，免得一排屬性攻擊全變成同一個扇形
      // 全場技閃不掉，一輪最多一招
      o.key = map.use === 'nova' ? 'nova' : (map.pri || 1) >= 2 ? e.s : 'p1:' + map.use + ':' + (map.ail || '');
      atk.push(o);
    }
  });
  if (!atk.length && !self.length) return null;
  const [minA, maxA, maxS] = BOSS_ROTATION_MAX[def.isMvp ? 'mvp' : 'mini'];
  const uniq = arr => arr.filter((x, i) => arr.findIndex(y => y.key === x.key) === i);
  let A = uniq(atk).sort((a, b) => (b.pri || 1) - (a.pri || 1) || a.order - b.order).slice(0, maxA);
  A.sort((a, b) => a.order - b.order);
  // 補血排第一，其餘照官方順序
  const S = uniq(self).sort((a, b) => (b.self === 'heal') - (a.self === 'heal') || a.order - b.order).slice(0, maxS);
  // 攻擊招不夠：用通用招補（避開已有的形狀）
  if (A.length < minA) {
    const fill = (def.isMvp ? BOSS_GENERIC_MVP : (BOSS_MINI_BY_RACE[def.race] || BOSS_GENERIC_MINI))
      .map(x => Object.assign({}, BOSS_SKILL_LIB[x.use], x)).filter(x => !A.some(a => a.shape === x.shape));
    A = A.concat(fill.slice(0, minA - A.length));
  }
  // 自身行為平均插進攻擊招之間
  const out = A.slice();
  S.forEach((s, i) => out.splice(Math.round((i + 1) * A.length / (S.length + 1)) + i, 0, s));
  return out;
}

/* 這隻王的輪替（展開成完整招式物件）；手寫的 BOSS_PATTERNS 優先 */
const _bossPatternCache = {};
function bossPatternFor(defId) {
  if (BOSS_PATTERNS[defId]) return BOSS_PATTERNS[defId].map(e => Object.assign({}, BOSS_SKILL_LIB[e.use || e.shape], e));
  if (_bossPatternCache[defId]) return _bossPatternCache[defId];
  const def = MONSTERS[defId] || {};
  const list = bossOfficialPattern(defId, def)
    || (def.isMvp ? BOSS_GENERIC_MVP : (BOSS_MINI_BY_RACE[def.race] || BOSS_GENERIC_MINI));
  return (_bossPatternCache[defId] = list.map(e => Object.assign({}, BOSS_SKILL_LIB[e.use || e.shape], e)));
}
