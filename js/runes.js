/* 盧恩石系統（T70，使用者 2026-11-26）
   盧恩騎士用盧恩精熟把「盧恩原石＋材料」做成盧恩石，盧恩石放進輔助／攻擊技能自動使用。
   效果照 rAthena（src/map/skills/swordman/*.cpp、battle.cpp、status.cpp），配方照 iRO Wiki Rune Mastery。
   跟官方不同的地方：
     · 使用不會失敗（官方 85%+ 成功、失敗有隨機壞事；放置沒辦法補救）
     · 離線不自動吃石頭（避免一晚吃光）
     · 艾伊瓦茲只加自己（官方全隊 ATK），攻速改成「技能攻速 +4×精熟Lv%」
     · 貝爾卡諾的盾合計 N×1000 傷害（官方一面一面擋）
   這個檔案在 engine_third.js 之後載入。 */

const RUNE_ORES = [   // 盧恩原石：成功率加成（iRO Wiki）
  { id: 'runstone_ordinary', bonus: 4 },
  { id: 'runstone_quality', bonus: 8 },
  { id: 'runstone_rare', bonus: 15 },
  { id: 'runstone_ancient', bonus: 30 },
  { id: 'runstone_mystic', bonus: 60 },
];
const RUNE_RANK_PENALTY = { C: 5, B: 10, A: 15, S: 20 };
/* stone：盧恩石物品  skill：用了放哪招  rm：需要的盧恩精熟等級  rank：製作難度  mats：除了原石以外的材料 */
const RUNE_STONES = [
  { stone: 'runstone_turisus', skill: 'rk_giantgrowth', rm: 1, rank: 'C', mats: [['elder_branch', 1], ['cobold_hair', 1], ['claw_of_desert_wolf', 1]] },
  { stone: 'runstone_isia', skill: 'rk_vitalityactivation', rm: 2, rank: 'B', mats: [['burning_heart', 1]] },
  { stone: 'runstone_pertz', skill: 'rk_stormblast', rm: 3, rank: 'B', mats: [['light_granule', 1], ['tangled_chain', 1], ['dragon_canine', 1]] },
  { stone: 'runstone_hagalas', skill: 'rk_stonehardskin', rm: 4, rank: 'C', mats: [['round_shell', 1], ['item_7123', 1]] },
  { stone: 'runstone_asir', skill: 'rk_fightingspirit', rm: 5, rank: 'C', mats: [['light_granule', 1], ['ogre_tooth', 1]] },
  { stone: 'runstone_urj', skill: 'rk_abundance', rm: 6, rank: 'A', mats: [['slender_snake', 1], ['honey', 1]] },
  { stone: 'runstone_rhydo', skill: 'rk_crushstrike', rm: 7, rank: 'C', mats: [['light_granule', 1], ['red_gemstone', 1]] },
  { stone: 'runstone_nosiege', skill: 'rk_refresh', rm: 8, rank: 'A', mats: [['light_granule', 1], ['broken_armor_piece', 1], ['old_magic_circle', 1]] },
  { stone: 'runstone_verkana', skill: 'rk_millenniumshield', rm: 9, rank: 'S', mats: [['dullahan_armor', 1]] },
  { stone: 'runstone_lux', skill: 'rk_luxanima', rm: 10, rank: 'S', mats: [['light_granule', 3], ['gold', 3]] },
];

// 一般／高級原石在道具商人買（官方盧恩商人 168／228z）
if (typeof ITEMS !== 'undefined') {
  if (ITEMS.runstone_ordinary) ITEMS.runstone_ordinary.buyPrice = 168;
  if (ITEMS.runstone_quality) ITEMS.runstone_quality.buyPrice = 228;
}
if (typeof NPC_SHOPS !== 'undefined' && NPC_SHOPS.item) {
  ['runstone_ordinary', 'runstone_quality'].forEach(id => { if (!NPC_SHOPS.item.items.includes(id)) NPC_SHOPS.item.items.push(id); });
}

/* ---------------- 盧恩石技能 ----------------
   runeStone：消耗的盧恩石（走 costItems，背包 → 倉庫；沒有就不放）。等級固定 1。 */
const RUNE_SKILLS = {
  rk_giantgrowth: {
    id: 'rk_giantgrowth', name: '巨人成長 Giant Growth', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [0], duration: [900], mult: [1],
    buffList: [{ type: 'statflat', stat: 'str', val: [30], label: 'STR +30' }, { type: 'giantgrowth', val: [30], label: '普攻 ×3.5、近戰 30% 再 ×2.5' }],
    desc: '突裡薩茲符文石。15 分鐘內 STR +30，普攻傷害 +250%，近戰普攻 30% 機率傷害再 ×2.5；龍之氣息變聖屬性。（官方有機率弄壞武器，本作不做）',
  },
  rk_vitalityactivation: {
    id: 'rk_vitalityactivation', name: '活力激發 Vitality Activation', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [0], duration: [900], mult: [1],
    buffList: [{ type: 'healrecv', mult: true, val: [50], label: '受到的治療 +50%' }, { type: 'reflectcut', val: [50], label: '被反彈的傷害 −50%' }],
    desc: '伊札符文石。15 分鐘內受到的治療 +50%、被反彈的傷害 −50%。',
  },
  rk_stormblast: {
    id: 'rk_stormblast', name: '風暴衝擊 Storm Blast', maxLv: 1, type: 'damage_aoe',
    spCost: [0], cooldown: [1], mult: [1], ratioOffset: -100, skillPre: { rk_runemastery: 100 }, statPre: { str: 100 / 6 }, lvDiv: 100,
    desc: '培爾多羅符文石。打目標與周圍：ATK (盧恩精熟Lv + STR/6)×100%×BaseLv/100。',
  },
  rk_stonehardskin: {
    id: 'rk_stonehardskin', name: '石化皮膚 Stone Hard Skin', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [0], duration: [900], mult: [1], hpCostPct: 20,
    buffList: [{ type: 'defflat', calc: 'runeSkin', label: 'DEF +{v}' }, { type: 'mdefflat', calc: 'runeSkin', label: 'MDEF +{v}' }],
    desc: '哈卡拉茲符文石。扣目前 HP 20%，15 分鐘內 DEF／MDEF + JobLv×盧恩精熟Lv/4。（官方另有弄壞攻擊者武器，本作不做）',
  },
  rk_fightingspirit: {
    id: 'rk_fightingspirit', name: '戰鬥意志 Fighting Spirit', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [0], duration: [900], mult: [1],
    buffList: [{ type: 'atkflat', calc: 'runeAsirAtk', label: 'ATK +{v}' }, { type: 'aspd', mult: true, calc: 'runeAsirAspd', label: '攻速 +{v}%' }],
    desc: '艾伊瓦茲符文石。15 分鐘內 ATK +70+7×盧恩精熟Lv、攻速 +4×盧恩精熟Lv%；龍之氣息-水變念屬性。（官方全隊加 ATK，本作只加自己）',
  },
  rk_abundance: {
    id: 'rk_abundance', name: '豐饒 Abundance', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [0], duration: [900], mult: [1],
    buffList: [{ type: 'spgain_sec', val: [6], label: '每 10 秒回 60 SP' }],
    desc: '烏魯茲符文石。15 分鐘內每 10 秒回 60 SP（本作每秒回 6）。',
  },
  rk_crushstrike: {
    id: 'rk_crushstrike', name: '粉碎打擊 Crush Strike', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [30], duration: [30], mult: [1],
    buffList: [{ type: 'crushstrike', label: '下一次普攻變成粉碎打擊' }],
    desc: '萊德赫符文石。30 秒內下一次普攻：ATK [武器等級×(精煉+6)×100 + 武器ATK + 武器重量/10]%。冷卻 30 秒。（官方 20% 弄壞自己武器，本作不做）',
  },
  rk_refresh: {
    id: 'rk_refresh', name: '淨化 Refresh', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [120], duration: [60], mult: [1], cureAll: true, hpRestorePct: 25, runeCureOnly: true,
    buffList: [{ type: 'ailimmune', ail: 'all', label: '1 分鐘內免疫異常' }],
    desc: '那特席茲符文石。回 25% HP、解除異常，1 分鐘內免疫異常。冷卻 2 分鐘。自動使用時只在身上有異常才用。',
  },
  rk_millenniumshield: {
    id: 'rk_millenniumshield', name: '千年盾 Millennium Shield', maxLv: 1, type: 'buff_shield', autoSlot: 'support',
    spCost: [0], cooldown: [60], duration: [900], mult: [1], shieldRoll: true, shieldCharges: [999],
    desc: '貝爾卡諾符文石。叫出 2～4 面盾（50%／30%／20%），每面擋 1000 傷害，持續 15 分鐘。冷卻 1 分鐘。（本作合計 N×1000 一起擋）',
  },
  rk_luxanima: {
    id: 'rk_luxanima', name: '力量分享 Lux Anima', maxLv: 1, type: 'buff_list', autoSlot: 'support',
    spCost: [0], cooldown: [0], duration: [900], mult: [1],
    buffList: [
      { type: 'atk', mult: true, val: [30], label: '物理傷害 +30%' },
      { type: 'critdmg', val: [30], label: '爆擊傷害 +30%' },
      { type: 'maxhppct', val: [30], label: 'MaxHP +30%' },
      { type: 'maxsppct', val: [30], label: 'MaxSP +30%' },
      { type: 'luxanima', val: [15], label: '普攻 15% 觸發風暴衝擊' },
    ],
    desc: '力量分享符文石。15 分鐘內物理傷害、爆擊傷害、MaxHP、MaxSP +30%，普攻 15% 機率觸發風暴衝擊；龍之氣息變暗屬性、龍之氣息-水變無屬性。（官方給隊友，本作給自己）',
  },
};
RUNE_STONES.forEach(r => {
  const sk = RUNE_SKILLS[r.skill];
  sk.runeStone = r.stone;
  sk.costItems = [r.stone];
  sk.costQty = 1;
  sk.payItems = sk.type !== 'buff_shield';   // 護盾那個 case 自己會扣
  sk.desc = sk.desc.replace(/^[^。]*符文石。/, '');   // 石頭名稱照物品名放在最後
  sk.desc += `　需要盧恩精熟 Lv${r.rm}，每次消耗 1 個${(ITEMS[r.stone] || {}).name || r.stone}。`;
});
Object.assign(SKILLS, RUNE_SKILLS);
if (SKILLS.rk_runemastery) {
  SKILLS.rk_runemastery.desc = '被動技能。可以在「🔨 鍛造」製作盧恩石（Lv 越高能做的種類越多、一次做越多顆），'
    + '學到對應等級後盧恩石技能會出現在技能清單，勾選自動使用。';
}

if (typeof THIRD_CALC !== 'undefined') Object.assign(THIRD_CALC, {
  runeSkin: () => Math.floor(thirdStat('jobLevel') * skillLv('rk_runemastery') / 4),
  runeAsirAtk: () => 70 + 7 * skillLv('rk_runemastery'),
  runeAsirAspd: () => 4 * skillLv('rk_runemastery'),
});

function isRuneKnight(who) { return !!who && who.jobId === 'runeknight'; }

/* 盧恩騎士照盧恩精熟等級拿到盧恩石技能（recomputeDerived 併進 cardSkills） */
function runeGrantedSkills() {
  const out = {};
  if (!isRuneKnight(state)) return out;
  const rm = (state.learnedSkills && state.learnedSkills.rk_runemastery) || 0;
  RUNE_STONES.forEach(r => { if (rm >= r.rm) out[r.skill] = 1; });
  return out;
}

/* ---------------- 製作 ---------------- */
// [32～50%（精熟Lv）+ DEX/30 + LUK/10 + JobLv/10 + 原石加成 − 難度]%（iRO Wiki）
function runeCraftChance(r, oreId) {
  const rm = skillLv('rk_runemastery');
  const ore = RUNE_ORES.find(o => o.id === oreId);
  const v = 30 + 2 * rm + thirdStat('dex') / 30 + thirdStat('luk') / 10 + (state.jobLevel || 1) / 10
    + (ore ? ore.bonus : 0) - (RUNE_RANK_PENALTY[r.rank] || 0);
  return Math.max(0, Math.min(100, Math.floor(v * 10) / 10));
}
// 一次做幾顆：精熟 1～4 固定 2、5～9 是 2～4、10 是 2～6
function runeCraftQty() {
  const rm = skillLv('rk_runemastery');
  const max = rm >= 10 ? 6 : rm >= 5 ? 4 : 2;
  return 2 + Math.floor(rng() * (max - 1));
}
function runeCraftBlockReason(r, oreId) {
  if (!isRuneKnight(state)) return '只有盧恩騎士能製作盧恩石';
  if (skillLv('rk_runemastery') < r.rm) return `需要盧恩精熟 Lv${r.rm}`;
  if (!RUNE_ORES.some(o => o.id === oreId) || getItemQty(oreId) < 1) return '缺少盧恩原石';
  const miss = r.mats.find(([id, n]) => getItemQty(id) < n);
  if (miss) return `缺少${(ITEMS[miss[0]] || {}).name || miss[0]}`;
  return null;
}
/* 做 times 次（失敗材料照樣消耗）。回傳 { tries, ok, made } */
function craftRune(stoneId, oreId, times) {
  const r = RUNE_STONES.find(x => x.stone === stoneId);
  const res = { tries: 0, ok: 0, made: 0 };
  if (!r) return res;
  const why = runeCraftBlockReason(r, oreId);
  if (why) { logMsg(`⚠️ ${why}，無法製作。`); return res; }
  for (let i = 0; i < (times || 1); i++) {
    if (runeCraftBlockReason(r, oreId)) break;
    removeItem(oreId, 1);
    r.mats.forEach(([id, n]) => removeItem(id, n));
    res.tries++;
    if (rng() * 100 < runeCraftChance(r, oreId)) {
      const n = runeCraftQty();
      addItem(r.stone, n);
      res.ok++; res.made += n;
    }
  }
  const name = (ITEMS[r.stone] || {}).name || r.stone;
  logMsg(`🪨 製作${name} ${res.tries} 次，成功 ${res.ok} 次，得到 ${res.made} 個。`);
  saveGame();
  return res;
}

/* ---------------- 戰鬥掛點（engine.js 呼叫） ---------------- */
function runeBuff(type) { return state.buffs && state.buffs.find(b => b.type === type); }
/* 普攻倍率：粉碎打擊（用掉）取代巨人成長的 +250%；巨人成長近戰再 30% ×2.5 */
function runeNormalAttackMult() {
  if (!state.buffs || !state.buffs.length) return 1;
  let m = 1;
  const cs = runeBuff('crushstrike');
  if (cs) {
    const wid = getEquipBaseItemId('weapon');
    const w = ITEMS[wid];
    if (w && w.type === 'weapon') {
      const ratio = (w.weaponLv || 1) * (getRefinementLevel('weapon') + 6) * 100 + (w.atk || 0) + (w.weight || 0) / 10;
      m = ratio / 100;
      state.buffs = state.buffs.filter(b => b !== cs);
      logMsg(`💥 「${SKILLS.rk_crushstrike.name}」！ATK ${Math.round(ratio)}%`);
    }
  } else if (runeBuff('giantgrowth')) m = 3.5;
  if (runeBuff('giantgrowth') && playerAttackRange() <= 2 && rng() * 100 < 30) m *= 2.5;
  return m;
}
/* 普攻後：力量分享 15% 觸發風暴衝擊 */
function runeAttackProcs(target) {
  const lx = runeBuff('luxanima');
  if (!lx || !target || target.hp <= 0) return;
  if (rng() * 100 < (lx.flatBonus || 15)) castSkillInner('rk_stormblast', { free: true, forceLv: 1 });
}
/* 龍之氣息的屬性：巨人成長→聖、力量分享→暗；龍之氣息-水：戰鬥意志→念、力量分享→無 */
function runeSkillElement(sk) {
  if (!sk || !state.buffs || !state.buffs.length) return null;
  if (sk.id === 'rk_dragonbreath') {
    if (runeBuff('luxanima')) return 'shadow';
    if (runeBuff('giantgrowth')) return 'holy';
  }
  if (sk.id === 'rk_dragonbreath_water') {
    if (runeBuff('luxanima')) return 'neutral';
    if (state.buffs.some(b => b.skillId === 'rk_fightingspirit')) return 'ghost';
  }
  return null;
}
/* 輔助自動施放要不要跳過：離線不吃石頭、淨化只在有異常時用 */
function runeSkipAuto(sk) {
  if (!sk || !sk.runeStone) return false;
  if (typeof _offlineSampling !== 'undefined' && _offlineSampling) return true;
  if (sk.runeCureOnly && !(state.playerAil && Object.keys(state.playerAil).length)) return true;
  return false;
}
