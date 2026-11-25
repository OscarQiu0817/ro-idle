/* 三轉技能（使用者 2026-11-24：三轉技能第一批，修羅／皇家禁衛隊／大主教／十字斬首者）。
   名稱與說明：台服 skillinfoz；倍率：rAthena src/map/skills/<職業>/*.cpp（RE_LVL_DMOD＝× BaseLv ÷ lvDiv）。
   前置技能由 skill_requires.js 照 rAthena skill_tree 套；詠唱、冷卻、範圍由 skill_cast_data.js 照 skill_db 套。
   新欄位的意思見 js/engine_third.js 開頭。skills.js 之後、jobs.js 之前載入。 */
const thirdRange = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1));
const THIRD_SKILLS = {
  /* ================= 修羅 ================= */
  /* 雙龍腳／大纏崩墜：武僧系連段一律被動（使用者 2026-08-10），延續成普攻觸發。
     大纏崩墜之後 3 秒是連段視窗，虎砲與羅剎破凰擊在視窗內施放用連段倍率。 */
  sr_dragoncombo: {
    id: 'sr_dragoncombo', name: '雙龍腳 Dragon Combo', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0],
    mult: thirdRange(10, l => (200 + 80 * l) / 100), lvDiv: 100,
    procChance: thirdRange(10, () => 20), stunChance: thirdRange(10, l => 1 + l),
    desc: '被動技能。近距離普攻有 20% 機率發動 2 連踢：ATK (200+80×Lv)%×BaseLv/100，1+Lv% 機率暈眩。'
        + '之後有 50% 機率接上大纏崩墜。（官方是主動技，本作照武僧連段改成普攻觸發）',
  },
  sr_fallenempire: {
    id: 'sr_fallenempire', name: '大纏崩墜 Fallen Empire', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0],
    mult: thirdRange(10, l => (100 + 300 * l) / 100), lvDiv: 150,
    procChance: thirdRange(10, () => 50), spiritCost: thirdRange(10, l => (l <= 5 ? 2 : 1)),
    desc: '被動技能。雙龍腳之後 50% 機率接上，消耗氣球體 2 顆（Lv6 起 1 顆）：ATK (100+300×Lv)%×BaseLv/150。'
        + '之後 3 秒內施放虎砲或羅剎破凰擊會用連段倍率。',
  },
  sr_skynetblow: {
    id: 'sr_skynetblow', name: '天羅地網 Sky Net Blow', maxLv: 5, type: 'damage_aoe',
    spCost: [12, 14, 16, 18, 20], cooldown: [0],
    mult: [2, 4, 6, 8, 10], statPre: { agi: 1 / 6 }, lvDiv: 100,
    desc: '原地旋轉攻擊周圍所有敵人：ATK (200×Lv + AGI/6)% × BaseLv/100。',
  },
  sr_earthshaker: {
    id: 'sr_earthshaker', name: '地雷震 Earth Shaker', maxLv: 5, type: 'damage_aoe',
    spCost: [36, 40, 44, 48, 52], cooldown: [3],
    mult: [4, 8, 12, 16, 20], lvDiv: 100, statPost: { str: 2 }, markSec: 4.5,
    inflict: { type: 'stun', chance: [30, 35, 40, 45, 50], sec: [1, 2, 2, 3, 3] },
    desc: '衝擊波打周圍所有敵人：ATK 400×Lv%×BaseLv/100 + STR×2%，(25+5×Lv)% 機率暈眩。'
        + '被打中的怪 4.5 秒內受到爆氣散彈的傷害提高。',
  },
  sr_rampageblaster: {
    id: 'sr_rampageblaster', name: '爆氣散彈 Rampage Blaster', maxLv: 5, type: 'damage_aoe',
    spCost: [100], cooldown: [10], needExplosion: true, spiritCost: 3,
    mult: thirdRange(5, l => (1000 + 350 * l) / 100), lvDiv: 150,
    markMult: thirdRange(5, l => (1500 + 550 * l) / 100), markLvDiv: 120,
    boostBy: { skillId: 'sr_gentletouch_change', pct: 30 },
    desc: '爆氣狀態限定，消耗 3 顆氣球體，打周圍所有敵人：ATK (1000+350×Lv)%×BaseLv/150；'
        + '對地雷震標記的目標 (1500+550×Lv)%×BaseLv/120。點穴-反期間 +30%。',
  },
  sr_knucklearrow: {
    id: 'sr_knucklearrow', name: '修羅身彈 Knuckle Arrow', maxLv: 10, type: 'damage',
    spCost: thirdRange(10, l => 10 + 2 * l), cooldown: [0], spiritCost: thirdRange(10, l => (l <= 5 ? 1 : 0)),
    mult: thirdRange(10, l => 1.5 * l), tgtLvPre: 5, lvDiv: 150,
    boostBy: { skillId: 'sr_gentletouch_change', pct: 30 },
    desc: '衝向目標猛擊：ATK (150×Lv + 目標等級×5)%×BaseLv/150。Lv1~5 消耗 1 顆氣球體。點穴-反期間 +30%。'
        + '（撞牆追加傷害本作沒有地形，不做）',
  },
  sr_windmill: {
    id: 'sr_windmill', name: '旋風腿 Windmill', maxLv: 1, type: 'damage_aoe',
    spCost: [45], cooldown: [3],
    mult: [1], ratioOffset: -100, statPre: { baseLevel: 1, dex: 1 }, lvDiv: 100,
    inflict: { type: 'stun', chance: [100], sec: [2] },
    desc: '轉身踢周圍所有敵人：ATK (BaseLv + DEX)%×BaseLv/100，非首領怪暈眩。',
  },
  sr_howlingoflion: {
    id: 'sr_howlingoflion', name: '獅子吼 Howling of Lion', maxLv: 5, type: 'damage_aoe',
    spCost: [70], cooldown: [10], spiritCost: 3,
    mult: [5, 10, 15, 20, 25], lvDiv: 100,
    desc: '消耗 3 顆氣球體大吼，打周圍所有敵人：ATK 500×Lv%×BaseLv/100。',
  },
  sr_rideinlightning: {
    id: 'sr_rideinlightning', name: '雷光彈 Ride in Lightning', maxLv: 5, type: 'damage_aoe',
    spCost: [25, 30, 35, 40, 45], cooldown: [0.5], spiritCost: 2,
    mult: [0.4, 0.8, 1.2, 1.6, 2], knuckleAdd: [0.5, 1, 1.5, 2, 2.5], lvDiv: 100,
    desc: '射出 2 顆氣球體引爆，打範圍內所有敵人：ATK 40×Lv%（拳套再 +50×Lv%）×BaseLv/100。',
  },
  sr_gentletouch_quiet: {
    id: 'sr_gentletouch_quiet', name: '點穴-默 Gentle Touch-Silence', maxLv: 5, type: 'damage',
    spCost: [20, 25, 30, 35, 40], cooldown: [1, 1.5, 2, 2.5, 3],
    mult: [1, 2, 3, 4, 5], statPre: { dex: 1 }, lvDiv: 100,
    inflict: { type: 'silence', chance: [5, 10, 15, 20, 25], dexLvDiv: 10, sec: [5, 7, 9, 11, 13] },
    desc: '點穴打一個目標：ATK (100×Lv + DEX)%×BaseLv/100，(5×Lv + (DEX+BaseLv)/10)% 機率沉默。',
  },
  sr_tigercannon: {
    id: 'sr_tigercannon', name: '虎砲 Tiger Cannon', maxLv: 10, type: 'damage_aoe',
    spCost: thirdRange(10, l => 25 + 5 * l), cooldown: [3], needExplosion: true, spiritCost: 2,
    mult: thirdRange(10, () => 1), comboMult: thirdRange(10, () => 1), formula: 'tigercannon', lvDiv: 100,
    boostBy: { skillId: 'sr_gentletouch_revitalize', pct: 30 },
    desc: '爆氣狀態限定，消耗 2 顆氣球體打周圍敵人。倍率% = [MaxHP×(10+2×Lv)% + MaxSP×(5+Lv)%] ÷ 4 × BaseLv/100，'
        + '另加 240×Lv + 目標等級×40 固定傷害；大纏崩墜之後改成 ÷2 與 500×Lv。點穴-活期間 +30%。',
  },
  sr_gateofhell: {
    id: 'sr_gateofhell', name: '羅剎破凰擊 Gate of Hell', maxLv: 10, type: 'damage', element: 'neutral',
    spCost: [100], cooldown: [0], spiritCost: 2,
    mult: thirdRange(10, l => 5 * l), comboMult: thirdRange(10, l => 8 * l), formula: 'gateofhell', lvDiv: 100,
    boostBy: { skillId: 'sr_gentletouch_revitalize', pct: 30 },
    desc: '消耗 2 顆氣球體連打一個目標：ATK 500×Lv%×BaseLv/100，另加「已損失 HP + 目前 SP×倍數 + 10×BaseLv」；'
        + '大纏崩墜之後改成 800×Lv% 與「已損失 HP + MaxSP×倍數 + 40×BaseLv」。點穴-活期間 +30%。',
  },
  sr_flashcombo: {
    id: 'sr_flashcombo', name: '閃光連擊 Flash Combo', maxLv: 5, type: 'third_special',
    spCost: [65], cooldown: [15, 12, 9, 6, 3], spiritCost: [5, 5, 4, 4, 3],
    mult: [1], atkFlat: [40, 60, 80, 100, 120],
    desc: '一口氣使出雙龍腳 → 大纏崩墜 → 虎砲（各用學到的最高等級、虎砲吃連段倍率），3 秒內 ATK +40~120。'
        + '消耗氣球體 5/5/4/4/3 顆。',
  },
  sr_crescentelbow: {
    id: 'sr_crescentelbow', name: '破碎柱 Crescent Elbow', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0],
    mult: [0], spiritCost: 2, procChance: [55, 60, 65, 70, 75], internalCooldown: [5],
    desc: '被動技能。受到近戰普攻時 55~75% 機率消耗 2 顆氣球體反擊（內部冷卻 5 秒、對首領無效）：'
        + 'ATK [(目標HP/100)×Lv×BaseLv/125]%（上限 5000%）＋受到的傷害×(1+0.2×Lv)，自己承受反擊傷害的 1/10。'
        + '（官方是主動進入反擊狀態，本作改成被動）',
  },
  sr_lightningwalk: {
    id: 'sr_lightningwalk', name: '閃電步 Lightning Walk', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0],
    mult: [0], internalCooldown: [5],
    desc: '被動技能。受到遠程普攻時有 (JobLv/2 + 40 + 5×Lv)% 機率完全無效（內部冷卻 5 秒）。（官方是主動狀態，本作改成被動）',
  },
  sr_cursedcircle: {
    id: 'sr_cursedcircle', name: '咒縛陣 Cursed Circle', maxLv: 5, type: 'ailment_aoe',
    spCost: [40, 60, 80, 100, 120], cooldown: [10], spiritCost: 1,
    mult: [1], ailment: 'stun', successChance: [100, 100, 100, 100, 100], ailmentSec: [3, 4, 5, 6, 7],
    desc: '範圍內敵人 3~7 秒無法行動。消耗 1 顆氣球體。（官方每個目標 1 顆，本作固定 1 顆）',
  },
  sr_assimilatepower: {
    id: 'sr_assimilatepower', name: '吸氣攻 Assimilate Power', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0],
    mult: [0], internalCooldown: [5],
    desc: '被動技能。SP 低於 20% 時吸收身上全部氣球體，每顆回復 1% SP（內部冷卻 5 秒）。'
        + '（官方是主動吸收周圍氣球體；本作改成低 SP 自動吸）',
  },
  sr_powervelocity: {
    id: 'sr_powervelocity', name: '全氣注入 Power Velocity', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是把氣球體全給一位隊友；本作隊友分球由振氣注入負責，這格只當潛龍昇天與吸氣攻的前置）',
  },
  sr_raisingdragon: {
    id: 'sr_raisingdragon', name: '潛龍昇天 Raising Dragon', maxLv: 10, type: 'buff_list',
    spCost: [120], cooldown: [30], duration: thirdRange(10, l => 100 + 20 * l), mult: [1],
    buffList: [
      { type: 'maxhppct', val: thirdRange(10, l => l), label: 'MaxHP/MaxSP +{v}%' },
      { type: 'maxsppct', val: thirdRange(10, l => l) },
      { type: 'raisingdragon', val: thirdRange(10, l => 5 + l), label: '氣球體上限 {v} 顆、維持爆氣' },
    ],
    desc: '氣球體上限 5+Lv 顆、MaxHP/MaxSP +Lv%，期間維持爆氣狀態。持續 120~300 秒。',
  },
  sr_gentletouch_cure: {
    id: 'sr_gentletouch_cure', name: '點穴-快 Gentle Touch-Cure', maxLv: 5, type: 'heal',
    spCost: [40, 50, 60, 70, 80], cooldown: [1, 1.5, 2, 2.5, 3], spiritCost: 1, mult: [1],
    healFormula: 'gentletouch', cureTypes: ['stone', 'freeze', 'stun', 'poison', 'silence', 'blind', 'confusion'],
    desc: '消耗 1 顆氣球體，回復 120×Lv + MaxHP×Lv% 的 HP，並解除石化、冰凍、暈眩、中毒、沉默、黑暗、混亂。',
  },
  sr_gentletouch_energygain: {
    id: 'sr_gentletouch_energygain', name: '點穴-球 Gentle Touch-Energy Gain', maxLv: 5, type: 'buff_list',
    spCost: [40, 50, 60, 70, 80], cooldown: [0], duration: [240], hpCostPct: [1, 2, 3, 4, 5], mult: [1],
    buffList: [{ type: 'gt_energygain', val: [15, 20, 25, 30, 35], label: '普攻／受傷時 {v}% 機率形成氣球體' }],
    desc: '消耗 Lv% HP。240 秒內普攻或受到傷害時有 (10+5×Lv)% 機率形成 1 顆氣球體。'
        + '（台服說明寫的增加猛龍誇強等傷害，rAthena 沒有實作，照 rAthena）',
  },
  sr_gentletouch_change: {
    id: 'sr_gentletouch_change', name: '點穴-反 Gentle Touch-Change', maxLv: 5, type: 'buff_list',
    spCost: [40, 50, 60, 70, 80], cooldown: [1], duration: [240], hpCostPct: [1, 2, 3, 4, 5], spiritCost: 1, mult: [1],
    exclusive: ['sr_gentletouch_revitalize'],
    buffList: [
      { type: 'atkflat', val: [8, 16, 24, 32, 40], label: 'ATK +{v}' },
      { type: 'aspd', val: 0, mult: true, statLv: { agi: 60 }, label: '攻速 +{v}%' },
    ],
    desc: '消耗 1 顆氣球體與 Lv% HP。240 秒內 ATK +8×Lv、攻速 +(AGI×Lv/60)%，爆氣散彈與修羅身彈 +30%。不能和點穴-活並存。',
  },
  sr_gentletouch_revitalize: {
    id: 'sr_gentletouch_revitalize', name: '點穴-活 Gentle Touch-Revitalize', maxLv: 5, type: 'buff_list',
    spCost: [40, 50, 60, 70, 80], cooldown: [1], duration: [240], spiritCost: 1, mult: [1],
    exclusive: ['sr_gentletouch_change'],
    buffList: [
      { type: 'maxhppct', val: [2, 4, 6, 8, 10], label: 'MaxHP +{v}%' },
      { type: 'defflat', val: [20, 40, 60, 80, 100], label: 'DEF +{v}' },
      { type: 'hpregenpct', val: [80, 110, 140, 170, 200], label: 'HP 自然回復 +{v}%' },
    ],
    desc: '消耗 1 顆氣球體。240 秒內 MaxHP +2×Lv%、DEF +20×Lv、HP 自然回復 +(30×Lv+50)%，虎砲與羅剎破凰擊 +30%。不能和點穴-反並存。',
  },

  /* ================= 皇家禁衛隊 ================= */
  lg_cannonspear: {
    id: 'lg_cannonspear', name: '加農砲攻擊 Cannon Spear', maxLv: 5, type: 'damage_aoe', requiresWeapon: 'spear',
    spCost: [30, 35, 40, 45, 50], cooldown: [1.7],
    mult: [1.2, 2.4, 3.6, 4.8, 6], statLvPre: { str: 1 }, lvDiv: 100, critRateMult: 1, critDmgMult: 0.5,
    desc: '矛專用。打目標與周圍敵人：ATK Lv×(120+STR)%×BaseLv/100。會依暴擊率暴擊，暴擊加成只算一半。',
  },
  lg_banishingpoint: {
    id: 'lg_banishingpoint', name: '放逐攻擊 Banishing Point', maxLv: 10, type: 'damage', requiresWeapon: 'spear',
    spCost: thirdRange(10, l => 18 + 2 * l), cooldown: [0],
    mult: thirdRange(10, l => l), skillPre: { sm_bash: 70 }, lvDiv: 100,
    desc: '矛專用，射程 7 格打一個目標：ATK (100×Lv + 狂擊Lv×70)%×BaseLv/100。',
  },
  lg_shieldpress: {
    id: 'lg_shieldpress', name: '重壓盾擊 Shield Press', maxLv: 10, type: 'damage', requiresEquip: 'shield',
    spCost: thirdRange(10, l => 8 + 2 * l), cooldown: [2],
    mult: thirdRange(10, l => 2 * l), statPre: { str: 1 }, shieldWeightPre: 0.1, lvDiv: 100,
    desc: '要裝盾牌。用盾牌打一個目標：ATK (200×Lv + STR + 盾牌重量/10)%×BaseLv/100。',
  },
  lg_pinpointattack: {
    id: 'lg_pinpointattack', name: '精準攻擊 Pinpoint Attack', maxLv: 5, type: 'damage', requiresWeapon: 'spear',
    spCost: [50], cooldown: [5],
    mult: [1, 2, 3, 4, 5], statPre: { agi: 5 }, lvDiv: 120, critRateMult: 1, critDmgMult: 0.5,
    inflict: { type: 'bleed', chance: [35, 0, 0, 0, 0], statDiv: { agi: 10, baseLevel: 10 }, onlyLv: 1 },
    desc: '矛專用。打一個目標：ATK (100×Lv + AGI×5)%×BaseLv/120，會依暴擊率暴擊（暴擊加成一半）。'
        + 'Lv1 附帶出血（35% + (AGI+BaseLv)/10）。（Lv2~5 官方是破壞裝備，怪物沒有裝備，不做）',
  },
  lg_forceofvanguard: {
    id: 'lg_forceofvanguard', name: '先鋒部隊 Force of Vanguard', maxLv: 5, type: 'buff_list',
    spCost: [30], cooldown: [0], duration: [300], mult: [1],
    buffList: [
      { type: 'maxhppct', val: [3, 6, 9, 12, 15], label: 'MaxHP +{v}%' },
      { type: 'def', mult: true, val: [2, 4, 6, 8, 10], label: 'DEF +{v}%' },
      { type: 'vanguard', val: [20, 32, 44, 56, 68], label: '受到物理攻擊 {v}% 機率累積憤怒還擊' },
    ],
    desc: 'MaxHP +3×Lv%、DEF +2×Lv%。受到物理攻擊時 (8+12×Lv)% 機率累積 1 個憤怒還擊（上限 5+2×Lv），給憤怒突擊用。持續 300 秒。'
        + '（官方持續扣 SP，rAthena 沒寫數字，不做）',
  },
  lg_rageburst: {
    id: 'lg_rageburst', name: '憤怒突擊 Rage Burst', maxLv: 1, type: 'damage',
    spCost: [150], cooldown: [0], needRage: true,
    mult: [1], formula: 'rageburst', lvDiv: 100,
    desc: '射出全部憤怒還擊打一個目標：ATK (200×憤怒還擊數 + 已損失HP/100)%×BaseLv/100。',
  },
  lg_overbrand: {
    id: 'lg_overbrand', name: '支配烙印 Overbrand', maxLv: 5, type: 'damage_aoe', requiresWeapon: 'spear',
    spCost: [20, 30, 40, 50, 60], cooldown: [0.3],
    mult: [3.5, 7, 10.5, 14, 17.5], skillPre: { cr_spearquicken: 50 }, lvDiv: 100,
    altMult: { skillId: 'lg_moonslasher', mult: [5, 10, 15, 20, 25], consume: true },
    desc: '矛專用。打周圍所有敵人：ATK (350×Lv + 長矛加速術Lv×50)%×BaseLv/100；半月斬之後改成 500×Lv%。',
  },
  lg_moonslasher: {
    id: 'lg_moonslasher', name: '半月斬 Moon Slasher', maxLv: 5, type: 'damage_aoe', requiresWeapon: 'spear',
    spCost: [20, 24, 28, 32, 36], cooldown: [6, 5, 4, 3, 2],
    mult: [1.2, 2.4, 3.6, 4.8, 6], skillPre: { lg_overbrand: 80 }, lvDiv: 100, selfMark: [2, 4, 6, 8, 10],
    desc: '矛專用。打周圍所有敵人：ATK (120×Lv + 支配烙印Lv×80)%×BaseLv/100。之後 2~10 秒內支配烙印傷害提高。',
  },
  lg_rayofgenesis: {
    id: 'lg_rayofgenesis', name: '創世之光 Ray of Genesis', maxLv: 10, type: 'magic_aoe', element: 'holy',
    spCost: thirdRange(10, l => 40 + 5 * l), cooldown: [2],
    mult: thirdRange(10, l => 3.5 * l), statPre: { int: 3 }, lvDiv: 100, blindRaces: ['undead', 'demon'],
    desc: '聖屬性魔法打周圍所有敵人：MATK (350×Lv + INT×3)%×BaseLv/100；不死、惡魔種族 50% 黑暗。'
        + '（官方靈感狀態改無屬性，本作不做）',
  },
  lg_earthdrive: {
    id: 'lg_earthdrive', name: '大地毀滅 Earth Drive', maxLv: 5, type: 'damage_aoe', requiresEquip: 'shield',
    spCost: [52, 60, 68, 76, 84], cooldown: [6.5, 5.5, 4.5, 3.5, 2.5],
    mult: [3.8, 7.6, 11.4, 15.2, 19], statPre: { str: 1, vit: 1 }, lvDiv: 100,
    desc: '要裝盾牌。重擊地面打周圍所有敵人：ATK (380×Lv + STR + VIT)%×BaseLv/100。',
  },
  lg_hesperuslit: {
    id: 'lg_hesperuslit', name: '黃昏星之光 Hesperus Lit', maxLv: 5, type: 'damage', requiresWeapon: 'spear',
    spCost: [37, 44, 51, 58, 65], cooldown: [0.2],
    mult: [3, 6, 9, 12, 15], statPre: { vit: 1 / 6 }, lvDiv: 100,
    altMult: { skillId: 'lg_inspiration', mult: [4.5, 9, 13.5, 18, 22.5] },
    desc: '打一個目標：ATK (300×Lv + VIT/6)%×BaseLv/100；靈感狀態改成 450×Lv%。（官方要隊伍裡有聚集的禁衛隊，本作不限）',
  },
  lg_exeedbreak: {
    id: 'lg_exeedbreak', name: '強化衝擊 Exceed Break', maxLv: 5, type: 'buff_list',
    spCost: [20, 32, 44, 56, 68], cooldown: [0], duration: [300], mult: [1],
    buffList: [{ type: 'exeedbreak', calc: 'exeedBreak', label: '下一次普攻 +{v}%' }],
    desc: '下一次普攻傷害 +(150×Lv + 15×JobLv + 武器重量/10×武器等級×BaseLv/100)%，打完就消失。'
        + '（官方的移動速度下降本作不做）',
  },
  lg_trample: {
    id: 'lg_trample', name: '摧殘 Trample', maxLv: 3,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是踩壞陷阱，本作怪物不放陷阱，只當威信的前置）',
  },
  lg_reflectdamage: {
    id: 'lg_reflectdamage', name: '聖冕加護 Reflect Damage', maxLv: 5, type: 'buff_list', requiresEquip: 'shield',
    spCost: [60, 70, 80, 90, 100], cooldown: [60], duration: [300], mult: [1],
    buffList: [{ type: 'reflectcut', val: [10, 20, 30, 40, 50], label: '受到的反射傷害 −{v}%' }],
    desc: '要裝盾牌。300 秒內受到的反射傷害（怪物的反射盾）−10×Lv%。',
  },
  lg_prestige: {
    id: 'lg_prestige', name: '威信 Prestige', maxLv: 5, type: 'buff_list',
    spCost: [75, 80, 85, 90, 95], cooldown: [60], duration: [30, 45, 60, 75, 90], mult: [1], exclusive: ['lg_banding'],
    buffList: [
      { type: 'defflat', calc: 'prestigeDef', label: 'DEF +{v}' },
      { type: 'magicevade', calc: 'prestigeEvade', label: '魔法迴避 {v}%' },
    ],
    desc: 'DEF +(15×Lv + 10×光之盾Lv)×BaseLv/100，並有 [(INT+LUK)×Lv/20×BaseLv/200 + Lv]% 機率完全迴避魔法。不能和聚集並存。',
  },
  lg_banding: {
    id: 'lg_banding', name: '聚集 Banding', maxLv: 5, type: 'buff_list',
    spCost: [30, 36, 42, 48, 54], cooldown: [5], duration: [60, 90, 120, 150, 180], mult: [1], exclusive: ['lg_prestige'],
    buffList: [{ type: 'defflat', calc: 'bandingDef', label: 'DEF +{v}' }],
    desc: '同一張圖有隊友時 DEF +6×Lv（rAthena；台服說明的每位隊員 +18~30 沒採用）。不能和威信並存。',
  },
  lg_piety: {
    id: 'lg_piety', name: '虔誠 Piety', maxLv: 5, type: 'buff_elearmor', element: 'holy', party: true,
    spCost: [40, 45, 50, 55, 60], cooldown: [0], duration: [60, 80, 100, 120, 140], mult: [1],
    costItems: ['holy_water'], costQty: 2, payItems: true,
    desc: '自己與隊友的鎧甲變成聖屬性 60~140 秒。消耗 2 個聖水。',
  },
  lg_shieldspell: {
    id: 'lg_shieldspell', name: '盾咒 Shield Spell', maxLv: 3, type: 'buff_list', requiresEquip: 'shield',
    spCost: [50], cooldown: [2], duration: [90], mult: [1],
    buffList: [
      { lv: 1, type: 'hpregen_sec', val: [5 / 3], label: '每秒回復 {v}% HP' },
      { lv: 2, type: 'spregen_sec', val: [0, 0.6], label: '每秒回復 {v}% SP' },
      { lv: 3, type: 'atkflat', val: [0, 0, 150], label: 'ATK +{v}' },
      { lv: 3, type: 'matkflat', val: [0, 0, 150], label: 'MATK +{v}' },
    ],
    desc: '要裝盾牌，90 秒。Lv1：每 3 秒回復 5% HP；Lv2：每 5 秒回復 3% SP；Lv3：ATK/MATK +150。（數字照 rAthena；想要哪種效果就把等級點到哪）',
  },
  lg_inspiration: {
    id: 'lg_inspiration', name: '靈感 Inspiration', maxLv: 5, type: 'buff_list',
    spCost: [80, 90, 100, 110, 120], cooldown: [500, 420, 340, 260, 180], duration: [60, 90, 120, 150, 180], mult: [1],
    buffList: [
      { type: 'hit', val: [12, 24, 36, 48, 60], label: 'HIT +{v}' },
      { type: 'allstat', val: [6, 12, 18, 24, 30], label: '全素質 +{v}' },
      { type: 'maxhppct', val: [4, 8, 12, 16, 20], label: 'MaxHP +{v}%' },
      { type: 'atkflat', val: [40, 80, 120, 160, 200], label: 'ATK/MATK +{v}' },
      { type: 'matkflat', val: [40, 80, 120, 160, 200] },
      { type: 'ailimmune', val: 0, label: '異常狀態全免疫' },
      { type: 'hpdrain_sec', val: [0.6, 0.5, 0.4, 0.3, 0.2], sp: [0.8, 0.7, 0.6, 0.5, 0.4], label: '每秒消耗 {v}% HP' },
    ],
    desc: 'HIT +12×Lv、全素質 +6×Lv、MaxHP +4×Lv%、ATK/MATK +40×Lv，異常狀態全免疫；'
        + '每 5 秒消耗 HP 3~1%、SP 4~2%。',
  },
  lg_kings_grace: {
    id: 'lg_kings_grace', name: '王的恩典 King\'s Grace', maxLv: 5, type: 'buff_list', party: true, cureAll: true,
    spCost: [200, 180, 160, 140, 120], cooldown: [100, 90, 80, 70, 60], duration: [5], mult: [1],
    buffList: [
      { type: 'dmgtaken', mult: true, val: [-100], label: '不受傷害' },
      { type: 'hpregen_sec', val: [4, 5, 6, 7, 8], label: '每秒回復 {v}% HP' },
      { type: 'ailimmune', val: 0, label: '異常狀態全免疫' },
    ],
    desc: '自己與隊友解除全部異常狀態，5 秒內不受傷害、異常全免疫、每秒回復 (3+Lv)% HP。（官方期間不能動，本作不限）',
  },

  /* ================= 大主教 ================= */
  ab_judex: {
    id: 'ab_judex', name: '審判 Judex', maxLv: 10, type: 'magic_aoe', element: 'holy',
    spCost: [20, 23, 26, 29, 32, 34, 36, 38, 40, 42], cooldown: [0],
    mult: thirdRange(10, l => (300 + 70 * l) / 100), lvDiv: 100,
    desc: '聖屬性魔法打目標與周圍：MATK (300+70×Lv)%×BaseLv/100。',
  },
  ab_adoramus: {
    id: 'ab_adoramus', name: '謳歌 Adoramus', maxLv: 10, type: 'magic_aoe', element: 'holy',
    spCost: thirdRange(10, l => 16 + 6 * l), cooldown: [2.5],
    mult: thirdRange(10, l => (300 + 250 * l) / 100), lvDiv: 100,
    costItems: ['blue_gemstone'], costQty: 1, payItems: true,
    inflict: { type: 'blind', chance: thirdRange(10, l => 4 * l), statDiv: { jobLevel: 2 }, sec: thirdRange(10, l => 7 + l) },
    desc: '聖屬性魔法打目標與周圍：MATK (300+250×Lv)%×BaseLv/100，(4×Lv + JobLv/2)% 機率黑暗。消耗 1 個藍色魔力礦石。'
        + '（官方的緩速、安希拉改無屬性本作不做）',
  },
  ab_ancilla: {
    id: 'ab_ancilla', name: '安希拉 Ancilla', maxLv: 1, type: 'buff_list',
    spCost: [30], cooldown: [0], duration: [60], mult: [1],
    costItems: ['blue_gemstone'], costQty: 1, payItems: true,
    buffList: [
      { type: 'healpower', val: [15], label: '治癒量 +{v}%' },
      { type: 'sprate', mult: true, val: [30], label: 'SP 回復 +{v}%' },
    ],
    desc: '消耗 1 個藍色魔力礦石，60 秒內治癒量 +15%、SP 自然回復 +30%。（官方是做出安希拉道具再使用，本作直接生效）',
  },
  ab_clementia: {
    id: 'ab_clementia', name: '慈悲術 Clementia', maxLv: 3, type: 'buff_list', castAs: 'al_blessing',
    spCost: [280, 320, 360], cooldown: [0], duration: [120, 180, 240], mult: [1],
    desc: '全隊施放天使之賜福（學到的等級），持續 120/180/240 秒。',
  },
  ab_canto: {
    id: 'ab_canto', name: '純白百合花 Canto Candidus', maxLv: 3, type: 'buff_list', castAs: 'al_incagi',
    spCost: [200, 220, 240], cooldown: [0], duration: [120, 180, 240], mult: [1],
    desc: '全隊施放加速術（學到的等級），持續 120/180/240 秒。',
  },
  ab_cheal: {
    id: 'ab_cheal', name: '燦爛聖光 Coluceo Heal', maxLv: 3, type: 'heal', healFormula: 'heal', healParty: true,
    spCost: [200, 220, 240], cooldown: [2], mult: [1],
    desc: '全隊回復治癒術（學到的等級）的 HP 量。',
  },
  ab_highnessheal: {
    id: 'ab_highnessheal', name: '高階治癒術 Highness Heal', maxLv: 5, type: 'heal', healFormula: 'heal',
    spCost: [70, 100, 130, 160, 190], cooldown: [3], mult: [1], healMult: [2, 2.3, 2.6, 2.9, 3.2],
    desc: '回復治癒術（學到的等級）2~3.2 倍的 HP。',
  },
  ab_renovatio: {
    id: 'ab_renovatio', name: '淨化 Renovatio', maxLv: 4, type: 'buff_list', party: true,
    spCost: [240, 280, 320, 360], cooldown: [1], duration: [90, 120, 150, 180], mult: [1],
    buffList: [{ type: 'hpregen_sec', val: [1, 1.2, 1.4, 1.6], label: '每秒回復 {v}% HP' }],
    desc: '全隊每 5 秒回復 (Lv+4)% HP，持續 90~180 秒。（官方對不死怪造成傷害，本作不做）',
  },
  ab_praefatio: {
    id: 'ab_praefatio', name: '感恩歌 Praefatio', maxLv: 10, type: 'buff_list', castAs: 'pr_kyrie',
    spCost: thirdRange(10, l => 80 + 10 * l), cooldown: [0], duration: [120], mult: [1],
    desc: '全隊施放霸邪之陣（學到的等級），持續 120 秒。',
  },
  ab_oratio: {
    id: 'ab_oratio', name: '祈禱文 Oratio', maxLv: 10, type: 'debuff_single', autoSlot: 'support', effect: 'oratio', cutElement: 'holy',
    spCost: thirdRange(10, l => 32 + 3 * l), cooldown: [2], duration: [30], mult: [1],
    successChance: thirdRange(10, l => 40 + 5 * l), eleCutPct: thirdRange(10, l => 2 * l),
    desc: '畫面內的敵人 (40+5×Lv)% 機率聖屬性耐性 −2×Lv%，持續 30 秒（聖屬性攻擊變痛）。',
  },
  ab_laudaagnus: {
    id: 'ab_laudaagnus', name: '羔羊歌頌 Lauda Agnus', maxLv: 4, type: 'buff_list', party: true,
    spCost: [50, 60, 70, 80], cooldown: [3], duration: [60], mult: [1], cureTypes: ['freeze', 'stone', 'blind'],
    buffList: [{ type: 'maxhppct', val: [4, 6, 8, 10], label: 'MaxHP +{v}%' }],
    desc: '解除冰凍、石化、黑暗，全隊 MaxHP +(2+2×Lv)% 60 秒。（官方有成功率，本作必成功）',
  },
  ab_laudaramus: {
    id: 'ab_laudaramus', name: '折枝讚頌 Lauda Ramus', maxLv: 4, type: 'buff_list', party: true,
    spCost: [50, 60, 70, 80], cooldown: [3], duration: [60], mult: [1], cureTypes: ['silence', 'sleep', 'stun'],
    buffList: [{ type: 'critdmg', val: [5, 10, 15, 20], label: '暴擊傷害 +{v}%' }],
    desc: '解除沉默、睡眠、暈眩，全隊暴擊傷害 +5×Lv% 60 秒。（官方有成功率，本作必成功）',
  },
  ab_clearance: {
    id: 'ab_clearance', name: '解除 Clearance', maxLv: 5, type: 'debuff_single', autoSlot: 'support', effect: 'dispel',
    spCost: [54, 60, 66, 72, 78], cooldown: [10], mult: [1], successChance: [68, 76, 84, 92, 100],
    desc: '(60+8×Lv)% 機率解除目標身上的增益。',
  },
  ab_expiatio: {
    id: 'ab_expiatio', name: '贖罪 Expiatio', maxLv: 5, type: 'buff_list',
    spCost: [35, 40, 45, 50, 55], cooldown: [0], duration: [150, 180, 210, 240, 270], mult: [1],
    buffList: [{ type: 'defignore', val: [5, 10, 15, 20, 25], label: '無視防禦 {v}%' }],
    desc: '物理與魔法攻擊無視目標 5×Lv% 防禦，持續 150~270 秒。',
  },
  ab_duplelight: {
    id: 'ab_duplelight', name: '二道聖光 Duple Light', maxLv: 10, type: 'buff_list',
    spCost: thirdRange(10, l => 50 + 5 * l), cooldown: [0], duration: thirdRange(10, l => 60 + 30 * l), mult: [1],
    buffList: [{ type: 'duplelight', val: thirdRange(10, l => 10 + 2 * l), label: '近戰普攻 {v}% 機率追加聖光' }],
    desc: '近戰普攻時物理、魔法各自 (10+2×Lv)% 機率追加：ATK (150+15×Lv)%、聖屬性 MATK (400+40×Lv)%。',
  },
  ab_silentium: {
    id: 'ab_silentium', name: '靜寂 Silentium', maxLv: 5, type: 'ailment_aoe',
    spCost: [64, 68, 72, 76, 80], cooldown: [15], mult: [1], ailment: 'silence',
    successChance: [100, 100, 100, 100, 100], ailmentSec: [20, 30, 40, 50, 60],
    desc: '周圍所有敵人沉默 20~60 秒（不能放技能）。',
  },
  ab_secrament: {
    id: 'ab_secrament', name: '聖典 Sacrament', maxLv: 5, type: 'buff_list', party: true,
    spCost: [100, 120, 140, 160, 180], cooldown: [0], duration: [60, 90, 120, 150, 180], mult: [1],
    buffList: [{ type: 'fixedcastcut', val: [10, 20, 30, 40, 50], label: '固定詠唱 −{v}%' }],
    desc: '全隊固定詠唱 −10×Lv%，持續 60~180 秒。',
  },
  ab_offertorium: {
    id: 'ab_offertorium', name: '奉獻頌 Offertorium', maxLv: 5, type: 'buff_list',
    spCost: [30, 60, 90, 120, 150], cooldown: [0], duration: [90], mult: [1],
    cureTypes: ['blind', 'curse', 'poison', 'confusion', 'bleed'],
    buffList: [
      { type: 'healpower', val: [30, 60, 90, 120, 150], label: '治癒量 +{v}%' },
      { type: 'spcost', mult: true, val: [20, 40, 60, 80, 100], label: '技能 SP 消耗 +{v}%' },
    ],
    desc: '90 秒內治癒量 +30×Lv%、技能 SP 消耗 +20×Lv%，並解除自己的黑暗、詛咒、中毒、混亂、出血。',
  },
  ab_epiclesis: {
    id: 'ab_epiclesis', name: '聖靈降臨祈禱 Epiclesis', maxLv: 5, type: 'buff_list', party: true,
    spCost: [300], cooldown: [60], duration: [18, 21, 24, 27, 30], mult: [1],
    costItems: ['holy_water'], costQty: 1, payItems: true,
    buffList: [
      { type: 'maxhppct', val: [5, 10, 15, 20, 25], label: 'MaxHP +{v}%' },
      { type: 'hpregen_sec', val: [3, 3, 4, 4, 5], label: '每秒回復 {v}% HP' },
      { type: 'spregen_sec', val: [2, 2, 3, 3, 4], label: '每秒回復 {v}% SP' },
    ],
    desc: '全隊 MaxHP +5×Lv%、每秒回復 3~5% HP 與 2~4% SP，持續 18~30 秒。消耗 1 個聖水。'
        + '（官方是生命之樹場地、另消耗安希拉；本作改全隊效果，只吃聖水）',
  },
  ab_vituperatum: {
    id: 'ab_vituperatum', name: '天罰 Vituperatum', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '未實作：rAthena 沒有這招的公式，等有資料再做。',
  },
  ab_convenio: {
    id: 'ab_convenio', name: '集結 Convenio', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '不需要：官方是把隊員叫到身邊，本作隊伍本來就一起行動。',
  },

  /* ================= 十字斬首者 ================= */
  gc_crossimpact: {
    id: 'gc_crossimpact', name: '十字斬 Cross Impact', maxLv: 5, type: 'damage',
    spCost: [40], cooldown: [0.35],
    mult: [15.5, 17, 18.5, 20, 21.5], lvDiv: 100, critRateMult: 0.5, critDmgMult: 0.5,
    desc: '衝向目標斬擊：ATK (1400+150×Lv)%×BaseLv/100。用暴擊率的一半判定暴擊，暴擊加成也只算一半。',
  },
  gc_darkillusion: {
    id: 'gc_darkillusion', name: '黑色幻影 Dark Illusion', maxLv: 5, type: 'damage',
    spCost: [40], cooldown: [0], mult: [1], chainCast: { id: 'gc_crossimpact', perLv: 4 },
    desc: '衝向目標打 ATK 100%，有 4×Lv% 機率接著發動同等級的十字斬。',
  },
  gc_counterslash: {
    id: 'gc_counterslash', name: '反擊斬 Counter Slash', maxLv: 10, type: 'damage_aoe',
    spCost: [5, 8, 11, 14, 17, 19, 21, 23, 25, 27], cooldown: [0], needCounter: true, ignoreDef: true,
    mult: thirdRange(10, l => (300 + 150 * l) / 100), lvDiv: 120, statPost: { agi: 2, jobLevel: 4 },
    desc: '武器抵禦擋下攻擊後 10 秒內可用，打周圍所有敵人、無視防禦：ATK (300+150×Lv)%×BaseLv/120 + AGI×2% + JobLv×4%。',
  },
  gc_weaponblocking: {
    id: 'gc_weaponblocking', name: '武器抵禦 Weapon Blocking', maxLv: 5, type: 'buff_list',
    spCost: [40, 36, 32, 28, 24], cooldown: [0], duration: [180], mult: [1],
    buffList: [{ type: 'weaponblock', val: [12, 14, 16, 18, 20], label: '{v}% 機率擋下近戰攻擊' }],
    desc: '180 秒內受到近戰普攻時 (10+2×Lv)% 機率完全擋下，之後 10 秒可放反擊斬與卸除武裝。（官方持續扣 SP，本作不做）',
  },
  gc_weaponcrush: {
    id: 'gc_weaponcrush', name: '卸除武裝 Weapon Crush', maxLv: 5, type: 'debuff_single', autoSlot: 'support', effect: 'strip',
    spCost: [20], cooldown: [0], needCounter: true, duration: [60],
    successChance: [100, 100, 100, 100, 100], strips: [{ kind: 'atk', mult: 0.75 }],
    desc: '武器抵禦擋下攻擊後可用：卸除目標武器，物理攻擊力 −25%，持續 60 秒。（跟卸除武器同一套效果）',
  },
  gc_venomimpress: {
    id: 'gc_venomimpress', name: '毒耐性弱化 Venom Impress', maxLv: 5, type: 'debuff_single', autoSlot: 'support',
    effect: 'oratio', cutElement: 'poison', spCost: [12, 16, 20, 24, 28], cooldown: [0], duration: [10, 20, 30, 40, 50], mult: [1],
    successChance: [100, 100, 100, 100, 100], eleCutPct: [10, 20, 30, 40, 50],
    desc: '目標毒屬性耐性 −10×Lv%，持續 10~50 秒（毒屬性攻擊變痛）。',
  },
  gc_researchnewpoison: {
    id: 'gc_researchnewpoison', name: '新毒研究 Research New Poison', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是製作八種新毒素，本作沒有新毒系統；劇毒武器改用一般中毒）',
  },
  gc_createnewpoison: {
    id: 'gc_createnewpoison', name: '新毒製作 Create New Poison', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（新毒系統本作沒有）',
  },
  gc_antidote: {
    id: 'gc_antidote', name: '解毒劑 Antidote', maxLv: 1, type: 'cure', cureTypes: ['poison'],
    spCost: [10], cooldown: [0], mult: [1],
    desc: '解除自己的中毒。（官方解的是新毒素，本作沒有新毒，改解一般中毒）',
  },
  gc_poisoningweapon: {
    id: 'gc_poisoningweapon', name: '劇毒武器 Poisoning Weapon', maxLv: 5, type: 'buff_list', requiresWeapon: 'dagger_katar',
    spCost: [20, 24, 28, 32, 36], cooldown: [0], duration: [60, 120, 180, 240, 300], mult: [1],
    buffList: [{ type: 'poisonweapon', val: [4, 6, 8, 10, 12], label: '近戰普攻 {v}% 機率中毒' }],
    desc: '短劍或拳刃。近戰普攻 (2+2×Lv)% 機率讓目標中毒，持續 60~300 秒。劇毒強制賦予與毒霧要在這個狀態下才能放。'
        + '（官方塗的是八種新毒素，本作改一般中毒）',
  },
  gc_venompressure: {
    id: 'gc_venompressure', name: '劇毒強制賦予 Venom Pressure', maxLv: 5, type: 'damage',
    spCost: [30, 40, 50, 60, 70], cooldown: [0], mult: [10], hitBonus: [14, 18, 22, 26, 30],
    needBuff: { skillId: 'gc_poisoningweapon', consume: true },
    inflict: { type: 'poison', chance: [75, 80, 85, 90, 95] },
    desc: '劇毒武器狀態下：ATK 1000%、命中 +10+4×Lv，(70+5×Lv)% 機率中毒，放完解除劇毒武器。',
  },
  gc_poisonsmoke: {
    id: 'gc_poisonsmoke', name: '毒霧 Poison Smoke', maxLv: 5, type: 'ailment_aoe', ailment: 'poison',
    spCost: [40], cooldown: [0], mult: [1], needBuff: { skillId: 'gc_poisoningweapon', consume: true },
    successChance: [67, 74, 79, 83, 87],
    desc: '劇毒武器狀態下：範圍內敵人中毒，放完解除劇毒武器。'
        + '（官方是 10~18 秒的毒霧、每 2 秒 20%，本作換算成一次 67~87%）',
  },
  gc_cloakingexceed: {
    id: 'gc_cloakingexceed', name: '偽裝強化 Cloaking Exceed', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是更強的隱身，本作沒有隱身移動，只當惡靈威脅的前置）',
  },
  gc_phantommenace: {
    id: 'gc_phantommenace', name: '惡靈威脅 Phantom Menace', maxLv: 1, type: 'damage_aoe',
    spCost: [30], cooldown: [0], mult: [3],
    desc: '打周圍所有敵人 ATK 300%。',
  },
  gc_hallucinationwalk: {
    id: 'gc_hallucinationwalk', name: '幻影步 Hallucination Walk', maxLv: 5, type: 'buff_list',
    spCost: [100], cooldown: [300], duration: [30, 35, 40, 45, 50], mult: [1],
    buffList: [
      { type: 'flee', mult: false, val: [50, 100, 150, 200, 250], label: 'FLEE +{v}' },
      { type: 'magicevade', val: [10, 20, 30, 40, 50], label: '魔法迴避 {v}%' },
    ],
    desc: 'FLEE +50×Lv、10×Lv% 機率完全迴避魔法，持續 30~50 秒。（官方的消耗 HP 與結束後減速本作不做）',
  },
  gc_rollingcutter: {
    id: 'gc_rollingcutter', name: '迴旋刀刃 Rolling Cutter', maxLv: 5, type: 'damage_aoe', requiresWeapon: 'katar',
    spCost: [5], cooldown: [0], mult: [1.3, 2.1, 2.9, 3.7, 4.5], lvDiv: 100, addRolling: true,
    desc: '拳刃專用。旋轉打周圍所有敵人：ATK (50+80×Lv)%×BaseLv/100，旋轉次數 +1（上限 10，10 秒）。',
  },
  gc_crossripperslasher: {
    id: 'gc_crossripperslasher', name: '迴旋十字斬 Cross Ripper Slasher', maxLv: 5, type: 'damage', requiresWeapon: 'katar',
    spCost: [20, 24, 28, 32, 36], cooldown: [0.2], needRolling: true,
    mult: [0.8, 1.6, 2.4, 3.2, 4], statPre: { agi: 3 }, lvDiv: 100,
    desc: '拳刃專用，要有旋轉次數。ATK (80×Lv + AGI×3)%×BaseLv/100 ＋ 旋轉次數×200%，放完旋轉次數歸零。',
  },
  gc_darkcrow: {
    id: 'gc_darkcrow', name: '致命爪痕 Dark Claw', maxLv: 5, type: 'damage',
    spCost: [22, 34, 46, 58, 70], cooldown: [60], mult: [1, 2, 3, 4, 5],
    woundPct: [30, 60, 90, 120, 150], woundSec: 20,
    desc: 'ATK 100×Lv%，目標 20 秒內受到的傷害 +30×Lv%（首領減半）。（官方只加近戰傷害，本作所有傷害都加）',
  },

  /* ================= 三轉共通 ================= */
  all_full_throttle: {
    id: 'all_full_throttle', name: '烈火戰車 Full Throttle', maxLv: 5, type: 'buff_list',
    spCost: [1], cooldown: [3000], duration: [10, 15, 20, 25, 30], mult: [1], healFull: true,
    buffList: [
      { type: 'allstatpct', val: [20], label: '全素質 +{v}%' },
      { type: 'spdrain', val: [6, 4, 3, 2, 1], label: '每秒 SP −{v}%' },
    ],
    desc: 'HP 全滿，持續時間內全素質 +20%、每秒消耗 MaxSP 6/4/3/2/1%。冷卻 50 分鐘。（官方結束後的疲勞減速本作不做）',
  },
};
// 短陣列補滿到 maxLv（engine 有地方直接讀 sk.mult[lv - 1]、sk.spCost[lv - 1]）
Object.values(THIRD_SKILLS).forEach(sk => ['mult', 'spCost', 'cooldown', 'duration'].forEach(k => {
  const v = sk[k];
  if (Array.isArray(v) && v.length && v.length < sk.maxLv) while (v.length < sk.maxLv) v.push(v[v.length - 1]);
}));
Object.assign(SKILLS, THIRD_SKILLS);
const THIRD_JOB_SKILLS = {
  sura: ['sr_dragoncombo', 'sr_fallenempire', 'sr_skynetblow', 'sr_earthshaker', 'sr_rampageblaster', 'sr_knucklearrow',
    'sr_windmill', 'sr_howlingoflion', 'sr_rideinlightning', 'sr_gentletouch_quiet', 'sr_tigercannon', 'sr_gateofhell',
    'sr_flashcombo', 'sr_crescentelbow', 'sr_lightningwalk', 'sr_cursedcircle', 'sr_assimilatepower', 'sr_powervelocity',
    'sr_raisingdragon', 'sr_gentletouch_cure', 'sr_gentletouch_energygain', 'sr_gentletouch_change',
    'sr_gentletouch_revitalize', 'all_full_throttle'],
  royalguard: ['lg_cannonspear', 'lg_banishingpoint', 'lg_shieldpress', 'lg_pinpointattack', 'lg_forceofvanguard', 'lg_rageburst',
    'lg_overbrand', 'lg_moonslasher', 'lg_rayofgenesis', 'lg_earthdrive', 'lg_hesperuslit', 'lg_exeedbreak', 'lg_trample',
    'lg_reflectdamage', 'lg_prestige', 'lg_banding', 'lg_piety', 'lg_shieldspell', 'lg_inspiration', 'lg_kings_grace',
    'all_full_throttle'],
  archbishop: ['ab_judex', 'ab_adoramus', 'ab_ancilla', 'ab_clementia', 'ab_canto', 'ab_cheal', 'ab_highnessheal', 'ab_renovatio',
    'ab_praefatio', 'ab_oratio', 'ab_laudaagnus', 'ab_laudaramus', 'ab_clearance', 'ab_expiatio', 'ab_duplelight', 'ab_silentium',
    'ab_secrament', 'ab_offertorium', 'ab_epiclesis', 'ab_vituperatum', 'ab_convenio', 'all_full_throttle'],
  guillotinecross: ['gc_crossimpact', 'gc_darkillusion', 'gc_counterslash', 'gc_weaponblocking', 'gc_weaponcrush', 'gc_venomimpress',
    'gc_researchnewpoison', 'gc_createnewpoison', 'gc_antidote', 'gc_poisoningweapon', 'gc_venompressure', 'gc_poisonsmoke',
    'gc_cloakingexceed', 'gc_phantommenace', 'gc_hallucinationwalk', 'gc_rollingcutter', 'gc_crossripperslasher', 'gc_darkcrow',
    'all_full_throttle'],
};
