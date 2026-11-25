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

  /* ================= 咒術士 ================= */
  wl_whiteimprison: {
    id: 'wl_whiteimprison', name: '白色監獄 White Imprison', maxLv: 5, type: 'debuff_single', autoSlot: 'support',
    effect: 'ailment', ailment: 'stun', spCost: [50, 55, 60, 65, 70], cooldown: [4], duration: [6, 8, 10, 12, 14], mult: [1],
    successChance: [50, 60, 70, 80, 90], markTarget: { key: 'whiteImprisonUntil', sec: [6, 8, 10, 12, 14] },
    desc: '目標 40+10×Lv% 機率被關住動彈不得 6~14 秒，期間受到靈魂爆炸傷害 2 倍。對首領無效。'
        + '（官方被關住時只吃持續傷害、結束扣 2000 HP，本作不做）',
  },
  wl_soulexpansion: {
    id: 'wl_soulexpansion', name: '靈魂爆炸 Soul Expansion', maxLv: 5, type: 'magic_aoe', element: 'ghost',
    spCost: [30, 35, 40, 45, 50], cooldown: [0],
    mult: [12, 14, 16, 18, 20], statPre: { int: 1 }, lvDiv: 100,
    markKey: 'whiteImprisonUntil', markMult: [24, 28, 32, 36, 40],
    desc: '念屬性魔法打目標與周圍：MATK (1000+200×Lv + INT)%×BaseLv/100；白色監獄中的目標 2 倍。',
  },
  wl_frostmisty: {
    id: 'wl_frostmisty', name: '寒冰濃霧 Frost Misty', maxLv: 5, type: 'magic_aoe', element: 'water',
    spCost: [40, 48, 56, 64, 72], cooldown: [8],
    mult: [3, 4, 5, 6, 7], lvDiv: 100, markKey: 'mistyUntil', markSec: 40,
    desc: '水屬性魔法打範圍內所有敵人：MATK (200+100×Lv)%×BaseLv/100，打中的怪 40 秒內結霜（凍僵術變痛）。'
        + '（官方的結冰：降防、降速、固定詠唱增加，本作怪物沒有這些數值，不做）',
  },
  wl_jackfrost: {
    id: 'wl_jackfrost', name: '凍僵術 Jack Frost', maxLv: 5, type: 'magic_aoe', element: 'water',
    spCost: [50, 60, 70, 80, 90], cooldown: [4],
    mult: [13, 16, 19, 22, 25], lvDiv: 100, markKey: 'mistyUntil', markMult: [18, 24, 30, 36, 42],
    desc: '水屬性魔法打目標與周圍：MATK (1000+300×Lv)%×BaseLv/100；結霜的目標 (1200+600×Lv)%。',
  },
  wl_marshofabyss: {
    id: 'wl_marshofabyss', name: '深淵沼地 Marsh of Abyss', maxLv: 5, type: 'debuff_single', autoSlot: 'support',
    effect: 'decagi', spCost: [40, 42, 44, 46, 48], cooldown: [2.5, 3, 3.5, 4, 4.5], duration: [30], mult: [1],
    successChance: [100, 100, 100, 100, 100], agiCut: [6, 12, 18, 24, 30],
    desc: '目標移動變慢、迴避 −6×Lv，持續 30 秒。（官方是 AGI/DEX −6×Lv%，怪物沒有素質，改成迴避）',
  },
  wl_recognizedspell: {
    id: 'wl_recognizedspell', name: '魔法省悟 Recognized Spell', maxLv: 5, type: 'buff_list',
    spCost: [100, 120, 140, 160, 180], cooldown: [50, 80, 110, 140, 170], duration: [60, 90, 120, 150, 180], mult: [1],
    buffList: [
      { type: 'matkmax', val: 0, label: '魔法傷害取最大值' },
      { type: 'spcost', mult: true, val: [25], label: '技能 SP 消耗 +{v}%' },
    ],
    desc: '60~180 秒內魔法傷害一律取 MATK 最大值，技能 SP 消耗 +25%。',
  },
  wl_siennaexecrate: {
    id: 'wl_siennaexecrate', name: '石化詛咒 Sienna Execrate', maxLv: 5, type: 'ailment_aoe', ailment: 'stone',
    spCost: [32, 34, 36, 38, 40], cooldown: [0], mult: [1], successChance: [48, 56, 64, 72, 80],
    costItems: ['red_gemstone'], costQty: 2, payItems: true,
    desc: '目標與周圍敵人 40+8×Lv% 機率石化。消耗 2 個紅色魔力礦石。',
  },
  wl_radius: {
    id: 'wl_radius', name: '半徑擴大 Radius', maxLv: 3,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。咒術士技能固定詠唱 −10/15/20%。（射程 +1~3 格本作不做）',
  },
  wl_stasis: {
    id: 'wl_stasis', name: '魔力凍結 Stasis', maxLv: 5, type: 'ailment_aoe', ailment: 'silence',
    spCost: [50, 60, 70, 80, 90], cooldown: [180, 190, 200, 210, 220], mult: [1],
    successChance: [100, 100, 100, 100, 100], ailmentSec: [20, 30, 40, 50, 60],
    desc: '周圍所有敵人 20~60 秒不能放技能。（官方連自己也不能放魔法，本作不限）',
  },
  wl_drainlife: {
    id: 'wl_drainlife', name: '吸星大法 Drain Life', maxLv: 5, type: 'magic', element: 'neutral',
    spCost: [20, 24, 28, 32, 36], cooldown: [2],
    mult: [2, 4, 6, 8, 10], statPre: { int: 1 }, lvDiv: 100,
    drain: { pct: [10, 15, 20, 25, 30], chance: [75, 80, 85, 90, 95] },
    desc: '無屬性魔法打一個目標：MATK (200×Lv + INT)%×BaseLv/100，(70+5×Lv)% 機率把傷害的 (5+5×Lv)% 吸成 HP。',
  },
  wl_crimsonrock: {
    id: 'wl_crimsonrock', name: '碧血隕石 Crimson Rock', maxLv: 5, type: 'magic_aoe', element: 'fire',
    spCost: [60, 70, 80, 90, 100], cooldown: [5],
    mult: [13, 19, 25, 31, 37], lvDiv: 100,
    desc: '火屬性魔法打目標與周圍：MATK (700+600×Lv)%×BaseLv/100。（官方的擊退本作不做）',
  },
  wl_hellinferno: {
    id: 'wl_hellinferno', name: '地獄火焰 Hell Inferno', maxLv: 5, type: 'magic_aoe', element: 'fire',
    spCost: [64, 70, 76, 82, 88], cooldown: [3],
    mult: [4, 8, 12, 16, 20], lvDiv: 100, secondHit: { element: 'shadow', mult: [6, 12, 18, 24, 30] },
    desc: '打目標與周圍兩段：火屬性 MATK 400×Lv%、暗屬性 MATK 600×Lv%，各 ×BaseLv/100。',
  },
  wl_comet: {
    id: 'wl_comet', name: '毀滅慧星 Comet', maxLv: 5, type: 'magic_aoe', element: 'neutral',
    spCost: [70, 90, 110, 130, 150], cooldown: [20],
    mult: [32, 39, 46, 53, 60], lvDiv: 100, woundPct: [50, 50, 50, 50, 50], woundSec: 20, woundBossFull: true,
    desc: '無屬性魔法打範圍內所有敵人：MATK (2500+700×Lv)%×BaseLv/100；打中的怪 20 秒內受到的傷害 +50%（魔力中毒）。',
  },
  wl_chainlightning: {
    id: 'wl_chainlightning', name: '連鎖電擊 Chain Lightning', maxLv: 5, type: 'magic_aoe', element: 'wind',
    spCost: [80, 90, 100, 110, 120], cooldown: [0],
    mult: [5, 6, 7, 8, 9], lvDiv: 100,
    desc: '風屬性魔法電擊連鎖到附近敵人：MATK (500+100×Lv)%×BaseLv/100。（官方逐隻跳、越跳越痛，本作改成一次打附近全部）',
  },
  wl_earthstrain: {
    id: 'wl_earthstrain', name: '地牛翻身 Earth Strain', maxLv: 5, type: 'magic_aoe', element: 'earth',
    spCost: [70, 78, 86, 94, 102], cooldown: [7],
    mult: [16, 22, 28, 34, 40], lvDiv: 100,
    desc: '地屬性魔法打大範圍所有敵人：MATK (1000+600×Lv)%×BaseLv/100。',
  },
  wl_tetravortex: {
    id: 'wl_tetravortex', name: '屬性漩渦 Tetra Vortex', maxLv: 10, type: 'third_special',
    spCost: [120, 150, 180, 210, 240, 200, 240, 280, 320, 360], cooldown: [15], mult: [1], needOrbs: 4,
    desc: '要有 4 顆屬性球。每顆各打一次 MATK (800+400×Lv)%，屬性照球；Lv6 起打目標與周圍。（官方的附帶異常本作不做）',
  },
  wl_summonfb: {
    id: 'wl_summonfb', name: '召喚火焰球 Summon Fire Ball', maxLv: 2, type: 'buff_list', orbElement: 'fire',
    spCost: [10, 12], cooldown: [0], duration: [280], mult: [1],
    desc: 'Lv1 召喚 1 顆火焰球（最多 5 顆）；Lv2 身上的球全換成 5 顆火焰球。持續 280 秒，給釋放與屬性漩渦用。',
  },
  wl_summonbl: {
    id: 'wl_summonbl', name: '召喚雷電球 Summon Lightning Ball', maxLv: 2, type: 'buff_list', orbElement: 'wind',
    spCost: [10, 12], cooldown: [0], duration: [280], mult: [1],
    desc: 'Lv1 召喚 1 顆雷電球（最多 5 顆）；Lv2 身上的球全換成 5 顆雷電球。持續 280 秒。',
  },
  wl_summonwb: {
    id: 'wl_summonwb', name: '召喚水球 Summon Water Ball', maxLv: 2, type: 'buff_list', orbElement: 'water',
    spCost: [10, 12], cooldown: [0], duration: [280], mult: [1],
    desc: 'Lv1 召喚 1 顆水球（最多 5 顆）；Lv2 身上的球全換成 5 顆水球。持續 280 秒。',
  },
  wl_summonstone: {
    id: 'wl_summonstone', name: '召喚石塊 Summon Stone', maxLv: 2, type: 'buff_list', orbElement: 'earth',
    spCost: [10, 12], cooldown: [0], duration: [280], mult: [1],
    desc: 'Lv1 召喚 1 顆石塊（最多 5 顆）；Lv2 身上的球全換成 5 顆石塊。持續 280 秒。',
  },
  wl_release: {
    id: 'wl_release', name: '釋放 Release', maxLv: 2, type: 'third_special',
    spCost: [3, 20], cooldown: [0], mult: [1], needOrbs: 1,
    desc: '把身上的屬性球全部丟向目標，每顆 MATK 300%×BaseLv/100，屬性照球。（官方 Lv1 是放出閱讀魔法書存的魔法，本作沒有魔法書）',
  },
  wl_reading_sb: {
    id: 'wl_reading_sb', name: '閱讀魔法書 Reading Spellbook', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '不需要：本作沒有魔法書系統。',
  },
  wl_freeze_sp: {
    id: 'wl_freeze_sp', name: '魔法保存 Freezing Spell', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '不需要：本作沒有魔法書系統。',
  },
  wl_telekinesis_intense: {
    id: 'wl_telekinesis_intense', name: '終極念力 Telekinesis Intense', maxLv: 5, type: 'buff_list',
    spCost: [100, 150, 200, 250, 300], cooldown: [300], duration: [60], mult: [1],
    buffList: [
      { type: 'eledmg_ghost', mult: true, val: [40, 80, 120, 160, 200], label: '念屬性傷害 +{v}%' },
      { type: 'castcut', val: [10, 20, 30, 40, 50], label: '變動詠唱 −{v}%' },
    ],
    desc: '60 秒內念屬性傷害 +40×Lv%、變動詠唱 −10×Lv%。（念屬性技能 SP 減少本作不做）',
  },

  /* ================= 魅影追蹤者 ================= */
  sc_fatalmenace: {
    id: 'sc_fatalmenace', name: '致命威脅 Fatal Menace', maxLv: 10, type: 'damage_aoe',
    spCost: thirdRange(10, l => 6 + 4 * l), cooldown: [0],
    mult: thirdRange(10, l => (100 + 120 * l) / 100), statPre: { agi: 1 }, lvDiv: 100, daggerMult: 2,
    desc: '打目標與周圍敵人：ATK (100+120×Lv + AGI)%×BaseLv/100，拿短劍打兩次。（官方打完把敵我瞬移走，本作不做）',
  },
  sc_triangleshot: {
    id: 'sc_triangleshot', name: '三角射擊 Triangle Shot', maxLv: 10, type: 'damage', requiresWeapon: 'bow',
    spCost: thirdRange(10, l => 20 + 2 * l), cooldown: [0.2], consumeAmmo: 3,
    mult: thirdRange(10, l => 2.3 * l), statPre: { agi: 3 }, lvDiv: 100,
    desc: '弓專用，消耗 3 支箭：ATK (230×Lv + AGI×3)%×BaseLv/100。',
  },
  sc_feintbomb: {
    id: 'sc_feintbomb', name: '虛擊炸彈 Feint Bomb', maxLv: 10, type: 'damage_aoe',
    spCost: thirdRange(10, l => 20 + 4 * l), cooldown: [5], mult: thirdRange(10, () => 1), formula: 'feintbomb', lvDiv: 120,
    costItems: ['surface_paint'], costQty: 1, payItems: true,
    desc: '假象爆炸打周圍所有敵人：ATK [(Lv+1)×DEX/2×(JobLv/10)]%×BaseLv/120。消耗 1 個牆面漆。（後退與隱匿本作不做）',
  },
  sc_reproduce: {
    id: 'sc_reproduce', name: '繁殖 Reproduce', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是另一格抄襲，本作的抄襲已經可以自己選要抄哪招）',
  },
  sc_autoshadowspell: {
    id: 'sc_autoshadowspell', name: '自動魅影念咒 Auto Shadow Spell', maxLv: 10, type: 'buff_list',
    spCost: thirdRange(10, l => 35 + 5 * l), cooldown: [0],
    duration: [60, 80, 100, 120, 140, 160, 180, 200, 220, 300], mult: [1],
    buffList: [
      { type: 'matkflat', val: thirdRange(10, l => 5 * l), label: 'MATK +{v}' },
      { type: 'autoshadow', val: thirdRange(10, l => 30 - 2 * l), label: '普攻 {v}% 機率放出抄襲技能' },
    ],
    desc: 'MATK +5×Lv；普攻時 (30−2×Lv)% 機率免費放出抄襲來的技能（等級 3~7）。（官方只放魔法技能，本作抄得到的都能放）',
  },
  sc_shadowform: {
    id: 'sc_shadowform', name: '魅影形態 Shadow Form', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是躲進別人影子把傷害轉嫁過去，本作不做）',
  },
  sc_bodypaint: {
    id: 'sc_bodypaint', name: '人體彩繪 Body Painting', maxLv: 5, type: 'ailment_aoe', ailment: 'blind',
    spCost: [10, 15, 20, 25, 30], cooldown: [2], mult: [1], successChance: [55, 57, 59, 61, 63],
    costItems: ['surface_paint'], costQty: 1, payItems: true,
    desc: '周圍敵人 (53+2×Lv)% 機率黑暗。消耗 1 個牆面漆。（攻速下降本作怪物沒有這個數值，不做）',
  },
  sc_invisibility: {
    id: 'sc_invisibility', name: '透明術 Invisibility', maxLv: 5, type: 'buff_list',
    spCost: [100], cooldown: [20, 30, 40, 50, 60], duration: [60], mult: [1],
    buffList: [
      { type: 'critdmg', val: [20, 40, 60, 80, 100], label: '暴擊傷害 +{v}%' },
      { type: 'aspd', mult: true, val: [-40, -30, -20, -10, 0], label: '攻速 {v}%' },
      { type: 'spdrain', val: [10, 8, 6, 4, 2], label: '每秒 SP −{v}%' },
    ],
    desc: '暴擊傷害 +20×Lv%、攻速 −(50−10×Lv)%，每秒消耗 SP (12−2×Lv)%。（官方是隱身、不能用技能、SP 用完才解除；本作改成 60 秒的增益）',
  },
  sc_deadlyinfect: {
    id: 'sc_deadlyinfect', name: '致命感染 Deadly Infect', maxLv: 5, type: 'buff_list',
    spCost: [40, 44, 48, 52, 56], cooldown: [2], duration: [10, 15, 20, 25, 30], mult: [1],
    buffList: [{ type: 'deadlyinfect', val: 0, label: '普攻時把自己的異常傳給目標' }],
    desc: '10~30 秒內普攻時，自己身上的異常狀態也讓目標中一份（自己的不會好）。',
  },
  sc_enervation: {
    id: 'sc_enervation', name: '面具:無力 Masquerade - Enervation', maxLv: 3, type: 'debuff_single', autoSlot: 'support',
    effect: 'strip', spCost: [30, 40, 50], cooldown: [2], duration: [10, 15, 20],
    successChance: [70, 80, 90], strips: [{ kind: 'atk', mult: 0.6 }],
    costItems: ['face_paint'], costQty: 1, payItems: true,
    desc: '目標物理攻擊力下降（rAthena 20+10×Lv%，本作取 Lv 平均 40%），10~20 秒。消耗 1 個化妝顏料。（成功率官方隨等級與 DEX 變動，本作固定 70/80/90%）',
  },
  sc_groomy: {
    id: 'sc_groomy', name: '面具-憂鬱 Masquerade - Gloomy', maxLv: 3, type: 'debuff_single', autoSlot: 'support',
    effect: 'strip', spCost: [30, 40, 50], cooldown: [2], duration: [10, 15, 20],
    successChance: [70, 80, 90], strips: [{ kind: 'atk', mult: 0.7 }],
    costItems: ['face_paint'], costQty: 1, payItems: true,
    desc: '目標攻速與命中下降，10~20 秒。消耗 1 個化妝顏料。（怪物沒有攻速／命中的減益欄位，本作換算成物理攻擊力 −30%）',
  },
  sc_ignorance: {
    id: 'sc_ignorance', name: '面具-無知 Masquerade - Ignorance', maxLv: 3, type: 'debuff_single', autoSlot: 'support',
    effect: 'ailment', ailment: 'silence', spCost: [30, 40, 50], cooldown: [2], duration: [10, 15, 20], mult: [1],
    successChance: [70, 80, 90], costItems: ['face_paint'], costQty: 1, payItems: true,
    desc: '目標 10~20 秒不能放技能。消耗 1 個化妝顏料。（吸 SP 那半對怪物沒意義，不做）',
  },
  sc_laziness: {
    id: 'sc_laziness', name: '面具:懶散 Masquerade - Laziness', maxLv: 3, type: 'debuff_single', autoSlot: 'support',
    effect: 'decagi', spCost: [30, 40, 50], cooldown: [2], duration: [10, 15, 20], mult: [1],
    successChance: [70, 80, 90], agiCut: [10, 20, 30],
    costItems: ['face_paint'], costQty: 1, payItems: true,
    desc: '目標移動變慢、迴避 −10×Lv，10~20 秒。消耗 1 個化妝顏料。',
  },
  sc_unlucky: {
    id: 'sc_unlucky', name: '面具-不幸 Masquerade - Unlucky', maxLv: 3, type: 'debuff_single', autoSlot: 'support',
    effect: 'ailments', spCost: [30, 40, 50], cooldown: [2], duration: [10, 15, 20], mult: [1],
    successChance: [70, 80, 90], ailments: [{ type: 'poison', chance: 33 }, { type: 'blind', chance: 33 }, { type: 'silence', chance: 33 }],
    costItems: ['face_paint'], costQty: 1, payItems: true,
    desc: '目標中毒、黑暗、沉默各 33% 機率，10~20 秒。消耗 1 個化妝顏料。（暴擊／完全迴避下降對怪物沒意義，不做）',
  },
  sc_weakness: {
    id: 'sc_weakness', name: '面具-衰弱 Masquerade - Weakness', maxLv: 3, type: 'debuff_single', autoSlot: 'support',
    effect: 'strip', spCost: [30, 40, 50], cooldown: [2], duration: [10, 15, 20],
    successChance: [70, 80, 90], strips: [{ key: 'sc_weakness_atk', kind: 'atk', mult: 0.75 }, { key: 'sc_weakness_def', kind: 'def', mult: 0.85 }],
    costItems: ['face_paint'], costQty: 1, payItems: true,
    desc: '卸除目標武器與盾牌（物理攻擊力 −25%、防禦 −15%，跟卸除武器／盾牌同一套），10~20 秒。消耗 1 個化妝顏料。（MaxHP 下降不做）',
  },
  sc_stripaccessary: {
    id: 'sc_stripaccessary', name: '卸除配件 Strip Accessory', maxLv: 5, type: 'debuff_single', autoSlot: 'support',
    effect: 'strip', spCost: [15, 18, 21, 24, 27], cooldown: [0], duration: [60, 70, 80, 90, 100],
    successChance: [14, 16, 18, 20, 22], strips: [{ kind: 'matk', mult: 0.8 }],
    desc: '(12+2×Lv)% 機率讓目標 INT/DEX/LUK −20%，60~100 秒。（怪物素質只影響魔攻，本作換算成魔法攻擊力 −20%）',
  },
  sc_manhole: {
    id: 'sc_manhole', name: '人孔 Manhole', maxLv: 3, type: 'debuff_single', autoSlot: 'support',
    effect: 'ailment', ailment: 'stun', spCost: [20, 25, 30], cooldown: [0], duration: [5, 10, 15], mult: [1],
    successChance: [100, 100, 100], costItems: ['surface_paint'], costQty: 1, payItems: true,
    desc: '目標掉進洞裡 5~15 秒什麼都不能做。消耗 1 個牆面漆。對首領無效。',
  },
  sc_dimensiondoor: {
    id: 'sc_dimensiondoor', name: '異次元之門 Dimension Door', maxLv: 3,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是隨機傳送門，本作不做）',
  },
  sc_chaospanic: {
    id: 'sc_chaospanic', name: '混沌恐慌 Chaos Panic', maxLv: 3, type: 'ailment_aoe', ailment: 'confusion',
    spCost: [30, 36, 42], cooldown: [0], mult: [1], successChance: [100, 100, 100], ailmentSec: [5, 10, 15],
    costItems: ['surface_paint'], costQty: 2, payItems: true,
    desc: '範圍內敵人混亂 5~15 秒。消耗 2 個牆面漆。',
  },
  sc_maelstrom: {
    id: 'sc_maelstrom', name: '漩渦 Maelstrom', maxLv: 3,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是吸收地面魔法換 SP，本作怪物不放地面魔法）',
  },
  sc_bloodylust: {
    id: 'sc_bloodylust', name: '血腥欲望 Bloody Lust', maxLv: 3, type: 'buff_list', party: true,
    spCost: [60, 70, 80], cooldown: [180], duration: [10, 20, 30], mult: [1],
    costItems: ['surface_paint'], costQty: 2, payItems: true,
    buffList: [
      { type: 'atk', mult: true, val: [32], label: 'ATK +{v}%' },
      { type: 'def', mult: true, val: [-55], label: 'DEF {v}%' },
    ],
    desc: '全隊進入狂怒：ATK +32%、DEF −55%，10~30 秒（數字照本作的狂暴狀態）。消耗 2 個牆面漆。',
  },
  sc_escape: {
    id: 'sc_escape', name: '緊急脫身 Emergency Escape', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是放陷阱後退，本作沒有走位脫身）',
  },

  /* ================= 盧恩騎士（飛龍當作一直都在，使用者 2026-11-25） ================= */
  rk_enchantblade: {
    id: 'rk_enchantblade', name: '魔力劍 Enchant Blade', maxLv: 10, type: 'buff_list',
    spCost: thirdRange(10, l => 30 + 4 * l), cooldown: [0], duration: [300], mult: [1],
    buffList: [{ type: 'enchantblade', val: thirdRange(10, l => 100 + 20 * l), label: '普攻追加魔法傷害（基礎 {v}×BaseLv/100）' }],
    desc: '300 秒內普攻另加 [(100+20×Lv)×BaseLv/100 + INT + MATK − 目標魔防] 的傷害。',
  },
  rk_sonicwave: {
    id: 'rk_sonicwave', name: '音速衝擊波 Sonic Wave', maxLv: 10, type: 'damage',
    spCost: thirdRange(10, l => 30 + 3 * l), cooldown: [1.75],
    mult: thirdRange(10, l => (1050 + 150 * l) / 100), lvDiv: 100, critRateMult: 1, critDmgMult: 0.5,
    desc: '衝擊波打一個目標：ATK (1050+150×Lv)%×BaseLv/100，會依暴擊率暴擊（暴擊加成一半）。',
  },
  rk_deathbound: {
    id: 'rk_deathbound', name: '死亡反彈 Death Bound', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', cooldown: [0], mult: [0],
    spCost: [50, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    desc: '被動技能。被非首領的近戰普攻打中時（內部冷卻 3 秒，扣 50~100 SP），把那下傷害放大 (500+100×Lv)%：'
        + '70% 彈給對方，自己只承受 30%。（官方是主動進入 3 秒的反彈狀態，本作改成被動）',
  },
  rk_hundredspear: {
    id: 'rk_hundredspear', name: '百矛穿刺 Hundred Spear', maxLv: 10, type: 'damage_aoe', requiresWeapon: 'spear',
    spCost: [60], cooldown: [3],
    mult: thirdRange(10, l => (600 + 200 * l) / 100), skillPre: { lk_spiralpierce: 50 }, lvDiv: 100,
    desc: '矛專用。連刺目標與周圍：ATK (600+200×Lv + 螺旋擊刺Lv×50)%×BaseLv/100。',
  },
  rk_windcutter: {
    id: 'rk_windcutter', name: '風壓飛刃 Wind Cutter', maxLv: 5, type: 'damage_aoe', requiresWeapon: 'blade_spear',
    spCost: [23, 26, 29, 32, 35], cooldown: [0.5, 0.45, 0.4, 0.35, 0.3],
    mult: [3, 6, 9, 12, 15], lvDiv: 100,
    weaponMult: { sword2: [5, 10, 15, 20, 25], spear1: [4, 8, 12, 16, 20], spear2: [4, 8, 12, 16, 20] },
    desc: '短劍、劍或矛。打周圍敵人：ATK 300×Lv%；雙手劍 250×Lv% 打兩次；矛 400×Lv%（各 ×BaseLv/100）。',
  },
  rk_ignitionbreak: {
    id: 'rk_ignitionbreak', name: '致命爆裂 Ignition Break', maxLv: 5, type: 'damage_aoe', requiresWeapon: 'blade_spear',
    spCost: [35, 40, 45, 50, 55], cooldown: [2],
    mult: [4.5, 9, 13.5, 18, 22.5], lvDiv: 100, critRateMult: 1, critDmgMult: 0.5,
    desc: '短劍、劍或矛。重擊地面打周圍所有敵人：ATK 450×Lv%×BaseLv/100，會依暴擊率暴擊（暴擊加成一半）。',
  },
  rk_dragontraining: {
    id: 'rk_dragontraining', name: '龍駕馭 Dragon Training', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能（飛龍當作一直都在）。拿矛打任何體型都是 100%，龍之氣息傷害 ×(90+10×Lv)%。'
        + '（騎龍的攻速懲罰本作不算）',
  },
  rk_dragonbreath: {
    id: 'rk_dragonbreath', name: '龍之氣息 Dragon Breath', maxLv: 10, type: 'damage_aoe', element: 'fire',
    spCost: thirdRange(10, l => 25 + 5 * l), cooldown: [0], mult: [1], formula: 'dragonbreath',
    desc: '火屬性，打目標與周圍：普攻傷害 ＋ (目前HP/50 + MaxSP/4)×Lv（BaseLv 超過 100 再 ×BaseLv/100）×龍駕馭倍率。'
        + '（官方的著火本作沒有這個狀態）',
  },
  rk_dragonbreath_water: {
    id: 'rk_dragonbreath_water', name: '龍之氣息-水 Dragon Water Breath', maxLv: 10, type: 'damage_aoe', element: 'water',
    spCost: thirdRange(10, l => 25 + 5 * l), cooldown: [0], mult: [1], formula: 'dragonbreath',
    desc: '水屬性，算法同龍之氣息。（官方的結冰本作怪物沒有這個數值）',
  },
  rk_dragonhowling: {
    id: 'rk_dragonhowling', name: '龍之咆哮 Dragon Howling', maxLv: 5, type: 'ailment_aoe', ailment: 'stun',
    spCost: [30], cooldown: [10], mult: [1], successChance: [56, 62, 68, 74, 80], ailmentSec: [2, 2, 2, 2, 2],
    desc: '周圍敵人 (50+6×Lv)% 機率陷入恐懼、2 秒動不了。（官方恐懼另有迴避下降，本作只做定身，用暈眩呈現）',
  },
  rk_runemastery: {
    id: 'rk_runemastery', name: '盧恩精熟 Rune Mastery', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是製作盧恩石，本作還沒有盧恩石系統）',
  },
  rk_phantomthrust: {
    id: 'rk_phantomthrust', name: '幻象突刺 Phantom Thrust', maxLv: 5, type: 'damage', requiresWeapon: 'spear',
    spCost: [15, 18, 21, 24, 27], cooldown: [0],
    mult: [0.5, 1, 1.5, 2, 2.5], skillPre: { kn_spearmastery: 10 }, lvDiv: 150,
    desc: '矛專用。刺一個遠方目標：ATK (50×Lv + 長矛熟練度Lv×10)%×BaseLv/150。（把目標拉到面前本作不做）',
  },

  /* ================= 遊俠（座狼當作一直都在，使用者 2026-11-25） ================= */
  ra_arrowstorm: {
    id: 'ra_arrowstorm', name: '箭雨風暴 Arrow Storm', maxLv: 10, type: 'damage_aoe', requiresWeapon: 'bow', consumeAmmo: 5,
    spCost: thirdRange(10, l => 20 + 4 * l), cooldown: [3.2],
    mult: thirdRange(10, l => (200 + 180 * l) / 100), lvDiv: 100,
    altMult: { skillId: 'ra_fearbreeze', mult: thirdRange(10, l => (200 + 250 * l) / 100) },
    desc: '弓專用，消耗 5 支箭，打目標與周圍：ATK (200+180×Lv)%×BaseLv/100；微風恐懼中 (200+250×Lv)%。',
  },
  ra_aimedbolt: {
    id: 'ra_aimedbolt', name: '瞄準標靶 Aimed Bolt', maxLv: 10, type: 'damage', requiresWeapon: 'bow', consumeAmmo: 3,
    spCost: [40], cooldown: [1],
    mult: thirdRange(10, l => (500 + 20 * l) / 100), lvDiv: 100,
    altMult: { skillId: 'ra_fearbreeze', mult: thirdRange(10, l => (800 + 35 * l) / 100) },
    desc: '弓專用，消耗 3 支箭打一個目標：ATK (500+20×Lv)%×BaseLv/100；微風恐懼中 (800+35×Lv)%。',
  },
  ra_fearbreeze: {
    id: 'ra_fearbreeze', name: '微風恐懼 Fear Breeze', maxLv: 5, type: 'buff_list', requiresWeapon: 'bow',
    spCost: [55, 60, 65, 70, 75], cooldown: [0], duration: [60, 90, 120, 150, 180], mult: [1],
    buffList: [{ type: 'fearbreeze', val: [12, 12, 21, 27, 30], label: '弓普攻 {v}% 機率多打' }],
    desc: '拿弓普攻時機率多打 1~4 下（Lv1~2 12% 打 2 下，Lv3 起再加 3／4／5 下的機率），持續 60~180 秒；'
        + '箭雨風暴與瞄準標靶變強。（多打的箭本作不另外扣）',
  },
  ra_rangermain: {
    id: 'ra_rangermain', name: '遊俠主意 Main Ranger', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。對動物、植物、魚貝類 ATK +5×Lv，受到牠們的傷害 −5×Lv%。',
  },
  ra_detonator: {
    id: 'ra_detonator', name: '雷管 Detonator', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（本作的陷阱放下就直接發動，不需要引爆）',
  },
  ra_electricshocker: {
    id: 'ra_electricshocker', name: '電擊陷阱 Electric Shocker', maxLv: 5, type: 'ailment_aoe', ailment: 'stun',
    spCost: [35], cooldown: [0], mult: [1], successChance: [100, 100, 100, 100, 100], ailmentSec: [20, 22, 24, 26, 28],
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '範圍內敵人 20~28 秒無法行動。消耗 1 個特殊合金陷阱。（扣怪物 SP 本作沒意義，不做）',
  },
  ra_clusterbomb: {
    id: 'ra_clusterbomb', name: '榴霰彈 Cluster Bomb', maxLv: 5, type: 'damage_aoe', element: 'neutral',
    spCost: [20], cooldown: [0], mult: [0], formula: 'trap', ignoreDef: true,
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '炸範圍內所有敵人，無視防禦：(Lv×DEX + INT×5)×BaseLv/150 × 陷阱研究Lv×20 ÷ 50（沒學陷阱研究沒傷害）。消耗 1 個特殊合金陷阱。',
  },
  ra_firingtrap: {
    id: 'ra_firingtrap', name: '燃燒陷阱 Firing Trap', maxLv: 5, type: 'damage_aoe', element: 'fire',
    spCost: [10], cooldown: [0], mult: [0], formula: 'trap', ignoreDef: true,
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '火屬性炸範圍內敵人，傷害同榴霰彈但 ÷100。消耗 1 個特殊合金陷阱。（官方的著火本作沒有這個狀態）',
  },
  ra_iceboundtrap: {
    id: 'ra_iceboundtrap', name: '冰封陷阱 Icebound Trap', maxLv: 5, type: 'damage_aoe', element: 'water',
    spCost: [10], cooldown: [0], mult: [0], formula: 'trap', ignoreDef: true,
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '水屬性炸範圍內敵人，傷害同燃燒陷阱。消耗 1 個特殊合金陷阱。（官方的結冰本作怪物沒有這個數值）',
  },
  ra_magentatrap: {
    id: 'ra_magentatrap', name: '紫紅陷阱 Magenta Trap', maxLv: 1, type: 'debuff_single', autoSlot: 'support',
    effect: 'elementChange', element: 'fire', spCost: [10], cooldown: [0], duration: [1800], mult: [1],
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '目標變成火屬性（首領無效）。消耗 1 個特殊合金陷阱。（官方另吃火靈碎片、效果永久；本作照元素更換 30 分鐘）',
  },
  ra_cobalttrap: {
    id: 'ra_cobalttrap', name: '深藍陷阱 Cobalt Trap', maxLv: 1, type: 'debuff_single', autoSlot: 'support',
    effect: 'elementChange', element: 'water', spCost: [10], cooldown: [0], duration: [1800], mult: [1],
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '目標變成水屬性（首領無效）。消耗 1 個特殊合金陷阱。',
  },
  ra_maizetrap: {
    id: 'ra_maizetrap', name: '淺黃陷阱 Maize Trap', maxLv: 1, type: 'debuff_single', autoSlot: 'support',
    effect: 'elementChange', element: 'earth', spCost: [10], cooldown: [0], duration: [1800], mult: [1],
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '目標變成地屬性（首領無效）。消耗 1 個特殊合金陷阱。',
  },
  ra_verduretrap: {
    id: 'ra_verduretrap', name: '青翠陷阱 Verdure Trap', maxLv: 1, type: 'debuff_single', autoSlot: 'support',
    effect: 'elementChange', element: 'wind', spCost: [10], cooldown: [0], duration: [1800], mult: [1],
    costItems: ['special_alloy_trap'], costQty: 1, payItems: true,
    desc: '目標變成風屬性（首領無效）。消耗 1 個特殊合金陷阱。',
  },
  ra_researchtrap: {
    id: 'ra_researchtrap', name: '陷阱研究 Research Trap', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。MaxSP +200+20×Lv，遊俠陷阱傷害 ×(20×Lv)。（INT 加成與射程本作不做）',
  },
  ra_wugmastery: {
    id: 'ra_wugmastery', name: '召狼術 Warg Mastery', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能（座狼當作一直都在）。',
  },
  ra_wugrider: {
    id: 'ra_wugrider', name: '騎狼術 Warg Rider', maxLv: 3,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（騎狼的移動速度本作沒意義）',
  },
  ra_wugdash: {
    id: 'ra_wugdash', name: '疾狼術 Warg Dash', maxLv: 1,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（騎狼衝刺本作沒有走位）',
  },
  ra_wugstrike: {
    id: 'ra_wugstrike', name: '狼突擊 Warg Strike', maxLv: 5, type: 'damage',
    spCost: [20, 22, 24, 26, 28], cooldown: [0], mult: [2, 4, 6, 8, 10], formula: 'warg',
    desc: '座狼撲擊一個目標：ATK 200×Lv% ＋ 狼牙Lv×30。普攻時也有 (LUK/3)‰ 機率自動發動。',
  },
  ra_wugbite: {
    id: 'ra_wugbite', name: '狼咬 Warg Bite', maxLv: 5, type: 'damage',
    spCost: [40, 42, 44, 46, 48], cooldown: [4, 6, 8, 10, 12], mult: [6, 8, 10, 12, 14], formula: 'warg',
    inflict: { type: 'stun', chance: [60, 70, 80, 90, 100], sec: [1, 2, 3, 4, 5] },
    desc: '座狼咬住一個目標：ATK (400+200×Lv)% ＋ 狼牙Lv×30，(50+10×Lv)% 機率讓目標 1~5 秒動不了。',
  },
  ra_toothofwug: {
    id: 'ra_toothofwug', name: '狼牙 Tooth of Warg', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。狼突擊、狼咬傷害 +30×Lv。',
  },
  ra_sensitivekeen: {
    id: 'ra_sensitivekeen', name: '敏銳嗅覺 Sensitive Keen', maxLv: 5, type: 'damage_aoe',
    spCost: [12], cooldown: [0], mult: [1.5, 2, 2.5, 3, 3.5], chainCast: { id: 'ra_wugbite', perLv: 8 },
    desc: '座狼攻擊周圍敵人 ATK (100+50×Lv)%，8×Lv% 機率接著狼咬。',
  },
  ra_camouflage: {
    id: 'ra_camouflage', name: '偽裝戰術 Camouflage', maxLv: 5, type: 'buff_list',
    spCost: [40], cooldown: [0], duration: [60], mult: [1],
    buffList: [
      { type: 'camo', val: 0, label: '每秒 ATK +30、暴擊 +10（最多 10 秒）' },
      { type: 'atkflat', val: 0 },
      { type: 'crit', val: 0 },
    ],
    desc: '每秒 ATK +30、暴擊 +10，10 秒後到頂（ATK +300、暴擊 +100）；每秒扣 SP 7−Lv。持續 60 秒。'
        + '（官方是躲起來、取消才結束，本作改成 60 秒的增益）',
  },
  ra_unlimit: {
    id: 'ra_unlimit', name: '菁英狙擊 Unlimit', maxLv: 5, type: 'buff_list',
    spCost: [100, 120, 140, 160, 180], cooldown: [300], duration: [150], mult: [1],
    buffList: [{ type: 'atk', mult: true, val: [50, 100, 150, 200, 250], label: '物理傷害 +{v}%' }],
    desc: '150 秒內物理傷害 +50×Lv%。（官方只加遠距離，遊俠本來就用弓，本作直接加物理）',
  },

  /* ================= 妖術師（元素精靈等 T69 召喚物整套再做） ================= */
  so_firewalk: {
    id: 'so_firewalk', name: '火焰步 Fire Walk', maxLv: 5, type: 'magic_aoe', element: 'fire',
    spCost: [30, 34, 38, 42, 46], cooldown: [0], mult: [0.6, 1.2, 1.8, 2.4, 3], lvDiv: 100,
    desc: '火屬性魔法打周圍敵人：MATK 60×Lv%×BaseLv/100。（官方是走過的地方留下火焰，本作沒有走位，改成一次打周圍）',
  },
  so_electricwalk: {
    id: 'so_electricwalk', name: '電流步 Electric Walk', maxLv: 5, type: 'magic_aoe', element: 'wind',
    spCost: [30, 34, 38, 42, 46], cooldown: [0], mult: [0.6, 1.2, 1.8, 2.4, 3], lvDiv: 100,
    desc: '風屬性魔法打周圍敵人：MATK 60×Lv%×BaseLv/100。（同火焰步，改成一次打周圍）',
  },
  so_spellfist: {
    id: 'so_spellfist', name: '魔力拳 Spell Fist', maxLv: 10, type: 'buff_list',
    spCost: thirdRange(10, l => 36 + 4 * l), cooldown: [0], duration: thirdRange(10, l => 30 + 15 * l), mult: [1],
    buffList: [{ type: 'spellfist', val: 20, label: '普攻放出箭術（每次 {v} SP）' }],
    desc: '普攻時免費放出學到的箭術（火箭／冰箭／雷擊，取等級最高的那支），每次扣 20 SP，SP 不夠就結束。持續 45~180 秒。'
        + '（官方要先詠唱箭術再取消，本作直接開）',
  },
  so_earthgrave: {
    id: 'so_earthgrave', name: '大地墳場 Earth Grave', maxLv: 5, type: 'magic_aoe', element: 'earth',
    spCost: [62, 70, 78, 86, 94], cooldown: [5], mult: [1], ratioOffset: -100,
    statPre: { int: 2 }, statLvPre: { int: 1 }, skillPre: { sa_seismicweapon: 300 }, lvDiv: 100,
    inflict: { type: 'bleed', chance: [5, 10, 15, 20, 25] },
    desc: '地屬性魔法打範圍內敵人：MATK (INT×2 + 地屬性附加Lv×300 + INT×Lv)%×BaseLv/100，5×Lv% 機率出血。',
  },
  so_diamonddust: {
    id: 'so_diamonddust', name: '鑽石星塵 Diamond Dust', maxLv: 5, type: 'magic_aoe', element: 'water',
    spCost: [50, 56, 62, 68, 74], cooldown: [5], mult: [1], ratioOffset: -100,
    statPre: { int: 2 }, statLvPre: { int: 1 }, skillPre: { sa_frostweapon: 300 }, lvDiv: 100,
    desc: '水屬性魔法打範圍內敵人：MATK (INT×2 + 水屬性附加Lv×300 + INT×Lv)%×BaseLv/100。（官方的冷凍本作沒有這個狀態）',
  },
  so_poison_buster: {
    id: 'so_poison_buster', name: '劇毒猛擊 Poison Buster', maxLv: 5, type: 'magic_aoe', element: 'poison',
    spCost: [70, 90, 110, 130, 150], cooldown: [2],
    mult: thirdRange(5, l => (1000 + 300 * l) / 100), statPre: { int: 1 }, lvDiv: 100,
    markKey: 'cloudPoisonUntil', markMult: thirdRange(5, l => (1000 + 500 * l) / 100),
    desc: '毒屬性魔法打目標與周圍：MATK (1000+300×Lv + INT)%×BaseLv/100；雲毒中的目標再 +200×Lv%。',
  },
  so_psychic_wave: {
    id: 'so_psychic_wave', name: '超自然波 Psychic Wave', maxLv: 5, type: 'field_aoe_magic', element: 'neutral',
    fieldRadius: 3, fieldTickIntervalSec: 1, duration: [3, 4, 5, 6, 7],
    spCost: [48, 56, 64, 70, 78], cooldown: [5],
    mult: [0.7, 1.4, 2.1, 2.8, 3.5], statPre: { int: 3 }, lvDiv: 100,
    desc: '在目標位置放出能量波（7×7）Lv+2 秒，每秒對範圍內敵人 MATK (70×Lv + INT×3)%×BaseLv/100。（官方拿杖或書每次打兩下，本作不做）',
  },
  so_cloud_kill: {
    id: 'so_cloud_kill', name: '雲殺 Cloud Kill', maxLv: 5, type: 'field_aoe_magic', element: 'poison',
    fieldRadius: 3, fieldTickIntervalSec: 1, duration: [1, 2, 3, 4, 5],
    spCost: [48, 56, 64, 70, 78], cooldown: [5],
    mult: [0.4, 0.8, 1.2, 1.6, 2], statPre: { int: 3 }, lvDiv: 100, markKey: 'cloudPoisonUntil', markSec: 5,
    desc: '在目標位置放毒雲（7×7）1~5 秒，每秒對範圍內敵人 MATK (40×Lv + INT×3)%×BaseLv/100，'
        + '被毒雲打到的怪 5 秒內陷入雲毒（劇毒猛擊變痛）。（雲毒降毒耐性本作不做）',
  },
  so_striking: {
    id: 'so_striking', name: '打擊強化 Striking', maxLv: 5, type: 'buff_list', party: true,
    spCost: [50, 55, 60, 65, 70], cooldown: [2], duration: [90], mult: [1],
    buffList: [
      { type: 'atkflat', val: [20, 40, 60, 80, 100], label: 'ATK +{v}' },
      { type: 'spflat_sec', val: [5, 4, 3, 2, 1], label: '每秒 SP −{v}' },
    ],
    desc: '全隊 ATK +20×Lv、每秒扣 SP 6−Lv，持續 90 秒。聖槍刺擊吃這招的等級。（誘導攻擊本作沒有）',
  },
  so_warmer: {
    id: 'so_warmer', name: '加熱術 Warmer', maxLv: 5, type: 'buff_list', party: true,
    spCost: [40, 52, 64, 76, 88], cooldown: [35, 40, 45, 50, 55], duration: [40, 45, 50, 55, 60], mult: [1],
    cureTypes: ['freeze'],
    buffList: [{ type: 'ailimmune', ail: 'freeze', val: 0, label: '冰凍免疫' }],
    desc: '解除冰凍，全隊 40~60 秒冰凍免疫。（官方另有回血，rAthena 沒寫數字，不做）',
  },
  so_vacuum_extreme: {
    id: 'so_vacuum_extreme', name: '極限空虛 Vacuum Extreme', maxLv: 5, type: 'ailment_aoe', ailment: 'stun',
    spCost: [34, 42, 50, 58, 66], cooldown: [5], mult: [1], successChance: [100, 100, 100, 100, 100], ailmentSec: [4, 6, 8, 10, 12],
    desc: '把範圍內敵人吸到中間，4~12 秒動不了。對首領無效。',
  },
  so_varetyr_spear: {
    id: 'so_varetyr_spear', name: '聖槍刺擊 Varetyr Spear', maxLv: 10, type: 'magic_aoe', element: 'wind',
    spCost: thirdRange(10, l => 60 + 5 * l), cooldown: [5], mult: thirdRange(10, () => 1), ratioOffset: -100,
    statPre: { int: 2 }, statLvPre: { int: 0.5 }, skillPre: { so_striking: 150, sa_lightningloader: 150 }, lvDiv: 100,
    inflict: { type: 'stun', chance: thirdRange(10, l => 5 * l) },
    desc: '風屬性魔法打目標與周圍 3 次：合計 MATK (INT×2 + (打擊強化Lv+風屬性附加Lv)×150 + INT×Lv/2)%×BaseLv/100，5×Lv% 機率暈眩。',
  },
  so_arrullo: {
    id: 'so_arrullo', name: '搖籃曲 Arrullo', maxLv: 5, type: 'ailment_aoe', ailment: 'sleep',
    spCost: [30, 35, 40, 45, 50], cooldown: [5, 6, 7, 8, 9], mult: [1], successChance: [100, 100, 100, 100, 100],
    ailmentSec: [8, 10, 12, 14, 16], costItems: ['yellow_gemstone'], costQty: 1, payItems: true,
    desc: '範圍內敵人沉睡 8~16 秒。消耗 1 個黃色魔力礦石。（官方限 PVP／攻城，本作打怪也能用）',
  },
  ...Object.fromEntries([
    ['so_el_control', '精靈控制 Spirit Control', 4], ['so_summon_agni', '召喚火元素 Summon Agni', 3],
    ['so_summon_aqua', '召喚水精靈阿奎亞 Summon Aqua', 3], ['so_summon_ventus', '召喚風精靈梵圖斯 Summon Ventus', 3],
    ['so_summon_tera', '召喚地精靈泰拉 Summon Tera', 3], ['so_el_action', '精靈激發 Elemental Action', 1],
    ['so_el_analysis', '元素分析 Elemental Analysis', 2], ['so_el_sympathy', '精靈交流 Spirit Sympathy', 5],
    ['so_el_cure', '精靈治癒 Spirit Recovery', 1], ['so_fire_insignia', '火之紋章 Fire Insignia', 3],
    ['so_water_insignia', '水之紋章 Water Insignia', 3], ['so_wind_insignia', '風之紋章 Wind Insignia', 3],
    ['so_earth_insignia', '地之紋章 Earth Insignia', 3], ['so_elemental_shield', '精靈結界 Elemental Shield', 5],
  ].map(([id, name, maxLv]) => [id, {
    id, name, maxLv, type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（元素精靈與紋章要等召喚物整套做好，見待辦 T69）',
  }])),

  /* ================= 宮廷樂師／浪姬舞者（WM_ 兩職共用） ================= */
  mi_rush_windmill: {
    id: 'mi_rush_windmill', name: '朝風車突擊 Windmill Rush', maxLv: 5, type: 'buff_list', party: true, requiresWeapon: 'instrument',
    spCost: [82, 88, 94, 100, 106], cooldown: [10], duration: [180], mult: [1],
    buffList: [{ type: 'atkflat', val: [7, 10, 13, 16, 19], lessonAdd: 1, jobLvDiv: 5, label: 'ATK +{v}' }],
    desc: '樂器專用。全隊 ATK +(4+3×Lv + 課程Lv + JobLv/5)，持續 180 秒。（移動速度本作沒意義）',
  },
  mi_echosong: {
    id: 'mi_echosong', name: '回音之歌 Echo Song', maxLv: 5, type: 'buff_list', party: true, requiresWeapon: 'instrument',
    spCost: [86, 92, 98, 104, 110], cooldown: [0], duration: [180], mult: [1],
    buffList: [{ type: 'defflat', val: [6, 12, 18, 24, 30], lessonAdd: 1, jobLvDiv: 4, label: 'DEF +{v}' }],
    desc: '樂器專用。全隊 DEF +(6×Lv + 課程Lv + JobLv/4)，持續 180 秒。',
  },
  mi_harmonize: {
    id: 'mi_harmonize', name: '和聲演奏 Harmonize', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方是降低目標全素質，怪物沒有素質）',
  },
  wa_swing_dance: {
    id: 'wa_swing_dance', name: '搖擺舞 Swing Dance', maxLv: 5, type: 'buff_list', party: true, requiresWeapon: 'whip',
    spCost: [96, 112, 128, 144, 160], cooldown: [5], duration: [180], mult: [1],
    buffList: [
      { type: 'aspd', mult: true, val: [3, 6, 9, 12, 15], lessonAdd: 1, label: '攻速 +{v}%' },
      { type: 'fixedcastcut', val: [6, 12, 18, 24, 30], label: '固定詠唱 −{v}%' },
    ],
    desc: '鞭子專用。全隊攻速 +(3×Lv + 課程Lv)%、固定詠唱 −6×Lv%，持續 180 秒。',
  },
  wa_symphony_of_lover: {
    id: 'wa_symphony_of_lover', name: '戀人交響樂 Symphony of Lovers', maxLv: 5, type: 'buff_list', party: true, requiresWeapon: 'whip',
    spCost: [60, 69, 78, 87, 96], cooldown: [5], duration: [180], mult: [1],
    buffList: [{ type: 'mdefflat', val: [2, 4, 6, 8, 10], lessonAdd: 1, jobLvDiv: 4, label: 'MDEF +{v}' }],
    desc: '鞭子專用。全隊 MDEF +(2×Lv + 課程Lv + JobLv/4)，持續 180 秒。（念／聖屬性抗性本作不做）',
  },
  wa_moonlit_serenade: {
    id: 'wa_moonlit_serenade', name: '月光小夜曲 Moonlit Serenade', maxLv: 5, type: 'buff_list', party: true, requiresWeapon: 'whip',
    spCost: [84, 96, 108, 120, 134], cooldown: [5], duration: [180], mult: [1],
    buffList: [{ type: 'matkflat', val: [7, 10, 13, 16, 19], lessonAdd: 1, jobLvDiv: 5, label: 'MATK +{v}' }],
    desc: '鞭子專用。全隊 MATK +(4+3×Lv + 課程Lv + JobLv/5)，持續 180 秒。',
  },
  wm_lesson: {
    id: 'wm_lesson', name: '課程 Lesson', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。MaxSP +30×Lv；很多歌曲的效果隨課程等級上升。（SP 回復速度本作不做）',
  },
  wm_metalicsound: {
    id: 'wm_metalicsound', name: '重金屬音樂 Metallic Sound', maxLv: 10, type: 'magic', element: 'neutral',
    spCost: thirdRange(10, l => 60 + 2 * l), cooldown: [2.5],
    mult: thirdRange(10, l => 1.2 * l), skillPre: { wm_lesson: 60 }, lvDiv: 100,
    desc: '無屬性魔法打一個目標：MATK (120×Lv + 課程Lv×60)%×BaseLv/100。',
  },
  wm_reverberation: {
    id: 'wm_reverberation', name: '殘響 Reverberation', maxLv: 5, type: 'magic_aoe', element: 'neutral',
    requiresWeapon: 'instrument_whip', consumeAmmo: 5,
    spCost: [56, 62, 68, 74, 80], cooldown: [0.15], mult: [10, 13, 16, 19, 22], lvDiv: 100,
    desc: '樂器或鞭子，消耗 5 支箭，打目標周圍：MATK (700+300×Lv)%×BaseLv/100。（官方屬性照箭，本作固定無屬性）',
  },
  wm_severe_rainstorm: {
    id: 'wm_severe_rainstorm', name: '大暴雨 Severe Rainstorm', maxLv: 5, type: 'field_phys_aoe', element: 'neutral',
    requiresWeapon: 'bow_instrument_whip', consumeAmmo: 10, tickSec: 0.3, duration: [3.6],
    spCost: [80, 90, 100, 110, 120], cooldown: [5, 5.5, 6, 6.5, 7],
    mult: [1, 2, 3, 4, 5], statPre: { dex: 1 / 300, agi: 1 / 200 }, lvDiv: 100,
    weaponMult: { instrument: [1.2, 2.4, 3.6, 4.8, 6], whip: [1.2, 2.4, 3.6, 4.8, 6] },
    desc: '弓、樂器或鞭子，消耗 10 支箭。箭雨持續 3.6 秒、每 0.3 秒打全場敵人一次（共 12 次）：'
        + '每次 ATK 100×Lv%（樂器／鞭子 120×Lv%）×BaseLv/100。',
  },
  wm_poemofnetherworld: {
    id: 'wm_poemofnetherworld', name: '絕望之歌 Poem of Netherworld', maxLv: 5, type: 'ailment_aoe', ailment: 'stun',
    requiresWeapon: 'instrument_whip', spCost: [12, 16, 20, 24, 28], cooldown: [0], mult: [1],
    successChance: [100, 100, 100, 100, 100], ailmentSec: [8, 10, 12, 14, 16],
    desc: '範圍內敵人 8~16 秒不能移動。對首領無效。（喉糖消耗本作不做）',
  },
  wm_voiceofsiren: {
    id: 'wm_voiceofsiren', name: '塞壬之音 Voice of Siren', maxLv: 5, type: 'debuff_single', autoSlot: 'support', effect: 'charm',
    requiresWeapon: 'instrument_whip', spCost: [48, 56, 64, 72, 80], cooldown: [5], duration: [15, 18, 21, 24, 27], mult: [1],
    successChance: [100, 100, 100, 100, 100],
    desc: '目標被迷住 15~27 秒，不會攻擊你，受傷就解除。（迷惑的條件照眨眼之誘：人型、天使、惡魔，非首領）',
  },
  wm_deadhillhere: {
    id: 'wm_deadhillhere', name: '死亡峽谷 Dead Hill Here', maxLv: 5, type: 'resurrection', requiresWeapon: 'instrument_whip',
    spCost: [50, 53, 56, 59, 62], cooldown: [0], mult: [1], revivePct: [10, 20, 30, 40, 50],
    desc: '扶起一位倒地的隊友。（官方是用剩下的 SP 量當 HP；本作改成 10~50% HP）',
  },
  wm_lullaby_deepsleep: {
    id: 'wm_lullaby_deepsleep', name: '沉睡搖籃曲 Lullaby Deep Sleep', maxLv: 5, type: 'ailment_aoe', ailment: 'sleep',
    requiresWeapon: 'instrument_whip', spCost: [80, 90, 100, 110, 120], cooldown: [30], mult: [1],
    successChance: [100, 100, 100, 100, 100], ailmentSec: [12, 14, 16, 18, 20],
    desc: '範圍內敵人沉睡 12~20 秒（受傷就醒）。',
  },
  wm_sircleofnature: {
    id: 'wm_sircleofnature', name: '循環的大自然之音 Circle of Nature', maxLv: 5, type: 'buff_list', party: true,
    requiresWeapon: 'instrument_whip', spCost: [42, 46, 50, 54, 58], cooldown: [180], duration: [180], mult: [1],
    buffList: [{ type: 'hpregenpct', val: [50, 100, 150, 200, 250], label: 'HP 自然回復 +{v}%' }],
    desc: '全隊 HP 自然回復 +50×Lv%，持續 180 秒。',
  },
  wm_song_of_mana: {
    id: 'wm_song_of_mana', name: '魔力之歌 Song of Mana', maxLv: 5, type: 'buff_list', party: true,
    requiresWeapon: 'instrument_whip', spCost: [120, 140, 160, 180, 200], cooldown: [20], duration: [120], mult: [1],
    spRestorePct: [10, 10, 15, 15, 20],
    buffList: [{ type: 'sprate', mult: true, val: [50, 100, 150, 200, 250], label: 'SP 自然回復 +{v}%' }],
    desc: '立刻回復 10~20% SP，全隊 SP 自然回復 +50×Lv%，持續 120 秒。',
  },
  wm_dance_with_wug: {
    id: 'wm_dance_with_wug', name: '與狼共舞 Dance with Warg', maxLv: 5, type: 'buff_list', party: true,
    requiresWeapon: 'instrument_whip', spCost: [120, 140, 160, 180, 200], cooldown: [180], duration: [120], mult: [1],
    buffList: [
      { type: 'aspd', mult: true, val: [5, 10, 15, 20, 25], label: '攻速 +{v}%' },
      { type: 'fixedcastcut', val: [30, 40, 50, 60, 70], label: '固定詠唱 −{v}%' },
    ],
    desc: '全隊攻速 +5×Lv%、固定詠唱 −(20+10×Lv)%，持續 120 秒。',
  },
  wm_lerads_dew: {
    id: 'wm_lerads_dew', name: '雷拉多露水 Lerad\'s Dew', maxLv: 5, type: 'buff_list', party: true,
    requiresWeapon: 'instrument_whip', spCost: [120, 130, 140, 150, 160], cooldown: [20], duration: [120], mult: [1],
    buffList: [{ type: 'maxhppct', val: [5, 8, 11, 14, 17], lessonAdd: 3, lessonCap: 25, label: 'MaxHP +{v}%' }],
    desc: '全隊 MaxHP +(2+3×Lv + 課程Lv×3，課程部分最多 25)%，持續 120 秒。',
  },
  wm_unlimited_humming_voice: {
    id: 'wm_unlimited_humming_voice', name: '無限哼唱聲 Unlimited Humming Voice', maxLv: 5, type: 'buff_list', party: true,
    requiresWeapon: 'instrument_whip', spCost: [120, 130, 140, 150, 160], cooldown: [180], duration: [60, 90, 120, 150, 180], mult: [1],
    buffList: [{ type: 'magicdmg', mult: true, val: [4, 8, 12, 16, 20], lessonAdd: 3, lessonCap: 15, label: '魔法傷害 +{v}%' }],
    desc: '全隊魔法傷害 +(4×Lv + 課程Lv×3，課程部分最多 15)%，持續 60~180 秒。（詠唱不中斷本作不做）',
  },
  wm_frigg_song: {
    id: 'wm_frigg_song', name: '豐年頌 Frigg\'s Song', maxLv: 5, type: 'buff_list', party: true,
    requiresWeapon: 'instrument_whip', spCost: [200, 230, 260, 290, 320], cooldown: [0], duration: [60], mult: [1],
    buffList: [
      { type: 'maxhppct', val: [5, 10, 15, 20, 25], label: 'MaxHP +{v}%' },
      { type: 'hpflat_sec', val: [100, 120, 140, 160, 180], label: '每秒回復 {v} HP' },
    ],
    desc: '全隊 MaxHP +5×Lv%、每秒回復 80+20×Lv HP，持續 60 秒。',
  },
  wm_great_echo: {
    id: 'wm_great_echo', name: '巨大共鳴 Great Echo', maxLv: 5, type: 'damage_aoe',
    spCost: [80, 90, 100, 110, 120], cooldown: [5], mult: [7.5, 12.5, 17.5, 22.5, 27.5], skillPre: { wm_lesson: 50 }, lvDiv: 100,
    desc: '巨響打範圍內所有敵人：ATK (250+500×Lv + 課程Lv×50)%×BaseLv/100。（隊上有另一位樂師／舞者傷害 2 倍，本作不做）',
  },
  ...Object.fromEntries([
    ['wm_randomizespell', '不確定要素的語言 Improvised Song', 5], ['wm_gloomyday', '羞怯一天的憂鬱 Gloomy Day', 5],
    ['wm_sound_of_destruction', '毀滅之聲 Sound of Destruction', 5], ['wm_saturday_night_fever', '狂歡週末夜 Saturday Night Fever', 5],
    ['wm_melodyofsink', '消沈旋律 Melody of Sink', 5], ['wm_beyond_of_warcry', '戰嚎的彼端 Warcry of Beyond', 5],
  ].map(([id, name, maxLv]) => [id, {
    id, name, maxLv, type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '前置技能。（官方只能對玩家或在 PVP 區使用）',
  }])),

  /* ================= 基因學者 ================= */
  gn_training_sword: {
    id: 'gn_training_sword', name: '單手劍使用熟練度 Sword Training', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。拿單手劍或短劍時 ATK +10×Lv、HIT +3×Lv。',
  },
  gn_remodeling_cart: {
    id: 'gn_remodeling_cart', name: '手推車改良 Cart Remodeling', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。手推車龍捲風、手推車加農砲的傷害隨等級上升。（手推車負重與命中本作不做）',
  },
  gn_cart_tornado: {
    id: 'gn_cart_tornado', name: '手推車龍捲風 Cart Tornado', maxLv: 10, type: 'damage_aoe',
    spCost: [30], cooldown: [2], mult: thirdRange(10, l => 2 * l), skillPre: { gn_remodeling_cart: 50 },
    desc: '旋轉手推車打周圍敵人：ATK (200×Lv + 手推車改良Lv×50)%。（手推車重量加成本作不做）',
  },
  gn_cartcannon: {
    id: 'gn_cartcannon', name: '手推車加農砲 Cart Cannon', maxLv: 5, type: 'damage_aoe',
    spCost: [40, 42, 46, 48, 50], cooldown: [0], mult: [1, 1, 1, 1, 1], formula: 'cartcannon', lvDiv: 100,
    costItems: ['cannon_ball'], costQty: 1, payItems: true,
    desc: '打目標與周圍：ATK [(250+20×手推車改良Lv)×Lv + 2×INT/(6−手推車改良Lv)]%×BaseLv/100。消耗 1 顆炮彈。',
  },
  gn_cartboost: {
    id: 'gn_cartboost', name: '手推車加速 Cart Boost', maxLv: 5, type: 'buff_list',
    spCost: [20, 24, 28, 32, 36], cooldown: [0], duration: [90], mult: [1],
    buffList: [{ type: 'atkflat', val: [10, 20, 30, 40, 50], label: 'ATK +{v}' }],
    desc: 'ATK +10×Lv，持續 90 秒。（移動速度本作沒意義）',
  },
  gn_thorns_trap: {
    id: 'gn_thorns_trap', name: '荊棘陷阱 Thorn Trap', maxLv: 5, type: 'debuff_single', autoSlot: 'support',
    effect: 'ailment', ailment: 'stun', spCost: [22, 26, 30, 34, 38], cooldown: [0], duration: [10, 12, 14, 16, 18], mult: [1],
    successChance: [100, 100, 100, 100, 100], costItems: ['seed_of_horny_plant'], costQty: 1, payItems: true,
    desc: '把目標綁住 10~18 秒。消耗 1 個荊棘種子。對首領無效。（荊棘的小傷害本作不做）',
  },
  gn_blood_sucker: {
    id: 'gn_blood_sucker', name: '吸血植物 Blood Sucker', maxLv: 5, type: 'buff_list',
    spCost: [50, 55, 60, 65, 70], cooldown: [1], duration: [40, 100, 160, 220, 280], mult: [1],
    costItems: ['bloodsuck_plant_seed'], costQty: 5, payItems: true,
    buffList: [{ type: 'bloodsucker', val: [1, 3, 5, 7, 9], label: '普攻 {v}% 機率吸血' }],
    desc: '普攻時 (2×Lv−1)% 機率把傷害的 Lv% 吸成 HP，持續 40~280 秒。消耗 5 個吸血植物種子。',
  },
  gn_spore_explosion: {
    id: 'gn_spore_explosion', name: '爆炸孢子 Spore Explosion', maxLv: 10, type: 'damage_aoe',
    spCost: thirdRange(10, l => 44 + 4 * l), cooldown: [5],
    mult: thirdRange(10, l => (400 + 200 * l) / 100), lvDiv: 100, woundPct: thirdRange(10, () => 10), woundSec: 5,
    costItems: ['bomb_mushroom_spore'], costQty: 1, payItems: true,
    desc: '打目標與周圍：ATK (400+200×Lv)%×BaseLv/100，打中的怪 5 秒內受到的傷害 +10%（首領 +5%）。消耗 1 個爆炸蘑菇孢子。'
        + '（官方只加遠距離傷害，本作全部都加）',
  },
  gn_wallofthorn: {
    id: 'gn_wallofthorn', name: '荊棘之壁 Wall of Thorns', maxLv: 5, type: 'damage_aoe',
    spCost: [40, 50, 60, 70, 80], cooldown: [5], mult: [0.1, 0.2, 0.3, 0.4, 0.5],
    costItems: ['seed_of_horny_plant'], costQty: 1, payItems: true,
    desc: '荊棘牆刺周圍敵人 ATK 10×Lv%。消耗 1 個荊棘種子。（擋路、推開、燒成火牆本作不做）',
  },
  gn_crazyweed: {
    id: 'gn_crazyweed', name: '瘋狂野草 Crazy Weed', maxLv: 10, type: 'damage_aoe',
    spCost: thirdRange(10, l => 20 + 4 * l), cooldown: [5], mult: thirdRange(10, l => (700 + 100 * l) / 100), lvDiv: 100,
    costItems: ['seed_of_horny_plant'], costQty: 1, payItems: true,
    desc: '打範圍內所有敵人：ATK (700+100×Lv)%×BaseLv/100。消耗 1 個荊棘種子。',
  },
  gn_demonic_fire: {
    id: 'gn_demonic_fire', name: '惡魔火焰 Demonic Fire', maxLv: 5, type: 'field_aoe_magic', element: 'fire',
    fieldRadius: 2, fieldTickIntervalSec: 1, duration: [10, 12, 14, 16, 18],
    spCost: [24, 28, 32, 36, 40], cooldown: [5], mult: [1.3, 1.5, 1.7, 1.9, 2.1],
    costItems: ['fire_bottle'], costQty: 1, payItems: true,
    desc: '在目標位置燒出火海（5×5）10~18 秒，每秒對範圍內敵人 MATK (110+20×Lv)%，走出火海就不會被燒。消耗 1 個火煙瓶。'
        + '（著火本作沒有這個狀態）',
  },
  gn_hells_plant: {
    id: 'gn_hells_plant', name: '地獄植物 Hell\'s Plant', maxLv: 5, type: 'damage_aoe',
    spCost: [40, 45, 50, 55, 60], cooldown: [0], mult: [1, 2, 3, 4, 5], formula: 'hellsplant', lvDiv: 100,
    costItems: ['meneater_plant_bottle'], costQty: 1, payItems: true,
    desc: '食人植物咬周圍敵人：ATK (100×Lv + INT×生物調撥Lv)%×BaseLv/100。消耗 1 個噬人植物瓶。（官方是藏在身上等怪靠近，本作改成一次咬周圍）',
  },
  gn_illusiondoping: {
    id: 'gn_illusiondoping', name: '幻覺禁藥 Illusion Doping', maxLv: 5, type: 'damage_aoe',
    spCost: [60, 70, 80, 90, 100], cooldown: [5, 4, 3, 2, 1], mult: [1],
    inflict: { type: 'confusion', chance: [70, 70, 70, 70, 70], sec: [10] },
    costItems: ['alchol'], costQty: 1, payItems: true,
    desc: '打目標與周圍 ATK 100%，70% 機率混亂 10 秒。消耗 1 個酒精。（命中下降本作不做）',
  },
  ...Object.fromEntries([
    ['gn_fire_expansion', '火焰擴散 Fire Expansion', 5, '要有惡魔火焰的場地，本作火海一次結算'],
    ['gn_mandragora', '曼陀羅魔花的尖叫 Howling of Mandragora', 5, '官方降低 INT 與 SP，怪物沒有這些數值'],
    ['gn_changematerial', '素材變化 Change Material', 1, '製作系統之後再做'],
    ['gn_mix_cooking', '調配料理 Mix Cooking', 2, '製作系統之後再做'],
    ['gn_s_pharmacy', '專門配藥 Special Pharmacy', 10, '製作系統之後再做'],
  ].map(([id, name, maxLv, why]) => [id, {
    id, name, maxLv, type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: `前置技能。（${why}）`,
  }])),

  /* ================= 機械工匠（魔導機甲當作一直都在，比照飛龍座狼） ================= */
  nc_madolicence: {
    id: 'nc_madolicence', name: '魔導機甲執照 Mado License', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。ATK +15×Lv（魔導機甲當作一直都在）。',
  },
  nc_boostknuckle: {
    id: 'nc_boostknuckle', name: '噴射飛拳 Boost Knuckle', maxLv: 5, type: 'damage',
    spCost: [5, 10, 15, 20, 25], cooldown: [0], mult: [2.6, 5.2, 7.8, 10.4, 13], statPre: { dex: 1 }, lvDiv: 100,
    desc: '火箭拳打一個目標：ATK (260×Lv + DEX)%×BaseLv/100。',
  },
  nc_pilebunker: {
    id: 'nc_pilebunker', name: '衝擊椎 Pile Bunker', maxLv: 3, type: 'damage',
    spCost: [50], cooldown: [5], mult: [4, 5, 6], statPre: { str: 1 }, lvDiv: 100,
    desc: '打一個目標：ATK (300+100×Lv + STR)%×BaseLv/100。（解除防禦類增益本作不做；不需要另外裝衝擊椎）',
  },
  nc_vulcanarm: {
    id: 'nc_vulcanarm', name: '火神砲 Vulcan Arm', maxLv: 3, type: 'damage_aoe',
    spCost: [9, 12, 15], cooldown: [0], mult: [2.3, 4.6, 6.9], statPre: { dex: 1 }, lvDiv: 100,
    costItems: ['vulcan_bullet'], costQty: 1, payItems: true,
    desc: '打目標與周圍：ATK (230×Lv + DEX)%×BaseLv/100。消耗 1 個火神彈。',
  },
  nc_flamelauncher: {
    id: 'nc_flamelauncher', name: '火焰噴射器 Flame Launcher', maxLv: 3, type: 'damage_aoe', element: 'fire',
    spCost: [20], cooldown: [0], mult: [6, 9, 12], lvDiv: 150,
    costItems: ['magic_gear_fuel'], costQty: 1, payItems: true,
    desc: '火屬性打範圍內敵人：ATK (300+300×Lv)%×BaseLv/150。消耗 1 個魔導戰甲燃料。（著火本作沒有這個狀態）',
  },
  nc_coldslower: {
    id: 'nc_coldslower', name: '液體冷卻彈 Cold Slower', maxLv: 3, type: 'damage_aoe', element: 'water',
    spCost: [20], cooldown: [0], mult: [6, 9, 12], lvDiv: 150,
    inflict: { type: 'freeze', chance: [10, 20, 30] },
    costItems: ['liquid_condensed_bullet'], costQty: 1, payItems: true,
    desc: '水屬性打範圍內敵人：ATK (300+300×Lv)%×BaseLv/150，10×Lv% 機率冰凍。消耗 1 個液體冷卻彈。',
  },
  nc_armscannon: {
    id: 'nc_armscannon', name: '加農砲 Arm Cannon', maxLv: 5, type: 'damage_aoe',
    spCost: [40, 45, 50, 55, 60], cooldown: [0.35, 0.3, 0.25, 0.2, 0.15],
    mult: [7.5, 11, 14.5, 18, 21.5], lvDiv: 100,
    costItems: ['cannon_ball'], costQty: 1, payItems: true,
    desc: '打目標與周圍：ATK (400+350×Lv)%×BaseLv/100。消耗 1 顆炮彈。（官方另扣燃料、屬性照砲彈，本作固定無屬性）',
  },
  nc_mainframe: {
    id: 'nc_mainframe', name: '主體改造 Mainframe Restructure', maxLv: 4,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。DEF +20+20×Lv；自我摧毀傷害上升。（過熱系統本作沒有）',
  },
  nc_selfdestruction: {
    id: 'nc_selfdestruction', name: '自我摧毀 Self-Destruction', maxLv: 3, type: 'damage_aoe',
    spCost: [200], cooldown: [300], mult: [1], formula: 'selfdestruct',
    costItems: ['magic_gear_fuel'], costQty: 1, payItems: true,
    desc: '打周圍所有敵人：普攻傷害 ＋ (Lv+1)×(主體改造Lv+8)×(目前SP+VIT)（BaseLv 超過 100 再 ×BaseLv/100）＋ 目前HP，'
        + '用掉全部 SP。消耗 1 個魔導戰甲燃料。（官方放完魔導機甲會解除，本作不會）',
  },
  nc_analyze: {
    id: 'nc_analyze', name: '解析 Analyze', maxLv: 3, type: 'debuff_single', autoSlot: 'support', effect: 'strip',
    spCost: [30], cooldown: [0], duration: [20], successChance: [100, 100, 100],
    strips: [{ kind: 'def', mult: 0.58 }], costItems: ['magic_gear_fuel'], costQty: 1, payItems: true,
    desc: '目標物理防禦下降 20 秒（官方 14×Lv%，本作取 Lv3 的 42%）。消耗 1 個魔導戰甲燃料。（魔防下降本作不做）',
  },
  nc_magneticfield: {
    id: 'nc_magneticfield', name: '磁場 Magnetic Field', maxLv: 3, type: 'ailment_aoe', ailment: 'stun',
    spCost: [60, 70, 80], cooldown: [20, 15, 10], mult: [1], successChance: [100, 100, 100], ailmentSec: [4, 6, 8],
    costItems: ['magic_gear_fuel'], costQty: 1, payItems: true,
    desc: '周圍敵人 4~8 秒無法移動。消耗 1 個魔導戰甲燃料。（扣 SP 本作沒意義）',
  },
  nc_neutralbarrier: {
    id: 'nc_neutralbarrier', name: '中性防護罩 Neutral Barrier', maxLv: 3, type: 'buff_list', party: true,
    spCost: [80, 90, 100], cooldown: [20, 15, 10], duration: [30, 45, 60], mult: [1],
    costItems: ['magic_gear_fuel'], costQty: 1, payItems: true,
    buffList: [{ type: 'def', mult: true, val: [15, 20, 25], label: 'DEF +{v}%' }],
    desc: '全隊 DEF +(10+5×Lv)%，持續 30~60 秒。消耗 1 個魔導戰甲燃料。（魔防與遠距離無效本作不做）',
  },
  nc_repair: {
    id: 'nc_repair', name: '修復 Repair', maxLv: 5, type: 'heal', healFormula: 'repair',
    spCost: [25, 30, 35, 40, 45], cooldown: [0], mult: [1], healPct: [4, 7, 13, 17, 23],
    desc: '回復 MaxHP 4/7/13/17/23%。（官方消耗補血丹，本作不扣）',
  },
  nc_trainingaxe: {
    id: 'nc_trainingaxe', name: '斧頭使用熟練度 Axe Training', maxLv: 10,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。拿斧頭時 ATK +5×Lv、HIT +3×Lv。',
  },
  nc_researchfe: {
    id: 'nc_researchfe', name: '火焰與大地的研究 Research Fire/Earth', maxLv: 5,
    type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: '被動技能。對火、地屬性怪物 ATK +10×Lv，受到火、地屬性傷害 −10×Lv%。',
  },
  nc_axeboomerang: {
    id: 'nc_axeboomerang', name: '迴旋斧 Axe Boomerang', maxLv: 5, type: 'damage', requiresWeapon: 'axe',
    spCost: [25, 30, 35, 40, 45], cooldown: [5, 4.5, 4, 3.5, 3], mult: [3, 3.5, 4, 4.5, 5], weaponWeightPre: 0.1, lvDiv: 100,
    desc: '斧頭專用。丟斧頭打一個目標：ATK (250+50×Lv + 斧頭重量/10)%×BaseLv/100。',
  },
  nc_powerswing: {
    id: 'nc_powerswing', name: '揮斧重擊 Power Swing', maxLv: 10, type: 'damage', requiresWeapon: 'axe',
    spCost: thirdRange(10, l => 18 + 2 * l), cooldown: [0],
    mult: thirdRange(10, l => (300 + 100 * l) / 100), statPre: { str: 0.5, dex: 0.5 }, lvDiv: 100,
    inflict: { type: 'stun', chance: thirdRange(10, () => 10) },
    desc: '斧頭專用。打一個目標：ATK (300+100×Lv + (STR+DEX)/2)%×BaseLv/100，10% 機率暈眩。',
  },
  nc_axetornado: {
    id: 'nc_axetornado', name: '戰斧颶風 Axe Tornado', maxLv: 5, type: 'damage_aoe', requiresWeapon: 'axe',
    spCost: [45], cooldown: [4, 3.5, 3, 2.5, 2], mult: [3.8, 5.6, 7.4, 9.2, 11], statPre: { vit: 2 }, lvDiv: 100,
    desc: '斧頭專用。打周圍敵人：ATK (200+180×Lv + VIT×2)%×BaseLv/100。',
  },
  nc_magma_eruption: {
    id: 'nc_magma_eruption', name: '岩漿噴發 Magma Eruption', maxLv: 5, type: 'damage_aoe',
    spCost: [60, 70, 80, 90, 100], cooldown: [10, 9, 8, 7, 6], mult: [5, 5.5, 6, 6.5, 7],
    inflict: { type: 'stun', chance: [90, 90, 90, 90, 90] },
    desc: '重擊地面打範圍內敵人 ATK (450+50×Lv)%，90% 機率暈眩。（熔岩區的持續傷害本作不做）',
  },
  ...Object.fromEntries([
    ['nc_acceleration', '魔導機甲加速 Acceleration', 3, '移動速度本作沒意義'],
    ['nc_hovering', '懸停 Hovering', 1, '怪物不放陷阱與地面魔法'],
    ['nc_f_sideslide', '大步前進 Front Side Slide', 1, '本作沒有走位'],
    ['nc_b_sideslide', '大步後退 Back Side Slide', 1, '本作沒有走位'],
    ['nc_shapeshift', '形態轉換 Shape Shift', 4, '魔導機甲屬性本作沒有'],
    ['nc_emergencycool', '緊急冷卻 Emergency Cool', 1, '過熱系統本作沒有'],
    ['nc_infraredscan', '紅外線掃瞄 Infrared Scan', 1, '本作沒有隱身的怪'],
    ['nc_stealthfield', '隱形力場 Stealth Field', 3, '本作沒有隱身'],
    ['nc_silversniper', 'FAW銀光狙擊手 FAW Silver Sniper', 5, '召喚物要等 T69 整套'],
    ['nc_magicdecoy', 'FAW魔法傀儡 FAW Magic Decoy', 5, '召喚物要等 T69 整套'],
    ['nc_disjoint', 'FAW解體 FAW Removal', 1, '召喚物要等 T69 整套'],
  ].map(([id, name, maxLv, why]) => [id, {
    id, name, maxLv, type: 'passive', passiveStat: 'thirdProc', spCost: [0], cooldown: [0], mult: [0],
    desc: `前置技能。（${why}）`,
  }])),

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
  warlock: ['wl_whiteimprison', 'wl_soulexpansion', 'wl_frostmisty', 'wl_jackfrost', 'wl_marshofabyss', 'wl_recognizedspell',
    'wl_siennaexecrate', 'wl_radius', 'wl_stasis', 'wl_drainlife', 'wl_crimsonrock', 'wl_hellinferno', 'wl_comet',
    'wl_chainlightning', 'wl_earthstrain', 'wl_tetravortex', 'wl_summonfb', 'wl_summonbl', 'wl_summonwb', 'wl_summonstone',
    'wl_release', 'wl_reading_sb', 'wl_freeze_sp', 'wl_telekinesis_intense', 'all_full_throttle'],
  shadowchaser: ['sc_fatalmenace', 'sc_triangleshot', 'sc_feintbomb', 'sc_reproduce', 'sc_autoshadowspell', 'sc_shadowform',
    'sc_bodypaint', 'sc_invisibility', 'sc_deadlyinfect', 'sc_enervation', 'sc_groomy', 'sc_ignorance', 'sc_laziness',
    'sc_unlucky', 'sc_weakness', 'sc_stripaccessary', 'sc_manhole', 'sc_dimensiondoor', 'sc_chaospanic', 'sc_maelstrom',
    'sc_bloodylust', 'sc_escape', 'all_full_throttle'],
  runeknight: ['rk_enchantblade', 'rk_sonicwave', 'rk_deathbound', 'rk_hundredspear', 'rk_windcutter', 'rk_ignitionbreak',
    'rk_dragontraining', 'rk_dragonbreath', 'rk_dragonhowling', 'rk_runemastery', 'rk_phantomthrust', 'rk_dragonbreath_water',
    'all_full_throttle'],
  ranger: ['ra_arrowstorm', 'ra_aimedbolt', 'ra_fearbreeze', 'ra_rangermain', 'ra_detonator', 'ra_electricshocker', 'ra_clusterbomb',
    'ra_firingtrap', 'ra_iceboundtrap', 'ra_magentatrap', 'ra_cobalttrap', 'ra_maizetrap', 'ra_verduretrap', 'ra_researchtrap',
    'ra_wugmastery', 'ra_wugrider', 'ra_wugdash', 'ra_wugstrike', 'ra_wugbite', 'ra_toothofwug', 'ra_sensitivekeen',
    'ra_camouflage', 'ra_unlimit', 'all_full_throttle'],
  sorcerer: ['so_firewalk', 'so_electricwalk', 'so_spellfist', 'so_earthgrave', 'so_diamonddust', 'so_poison_buster',
    'so_psychic_wave', 'so_cloud_kill', 'so_striking', 'so_warmer', 'so_vacuum_extreme', 'so_varetyr_spear', 'so_arrullo',
    'so_el_control', 'so_summon_agni', 'so_summon_aqua', 'so_summon_ventus', 'so_summon_tera', 'so_el_action',
    'so_el_analysis', 'so_el_sympathy', 'so_el_cure', 'so_fire_insignia', 'so_water_insignia', 'so_wind_insignia',
    'so_earth_insignia', 'so_elemental_shield', 'all_full_throttle'],
  minstrel: ['mi_rush_windmill', 'mi_echosong', 'mi_harmonize', 'wm_lesson', 'wm_metalicsound', 'wm_reverberation',
    'wm_severe_rainstorm', 'wm_poemofnetherworld', 'wm_voiceofsiren', 'wm_deadhillhere', 'wm_lullaby_deepsleep',
    'wm_sircleofnature', 'wm_randomizespell', 'wm_gloomyday', 'wm_great_echo', 'wm_song_of_mana', 'wm_dance_with_wug',
    'wm_sound_of_destruction', 'wm_saturday_night_fever', 'wm_lerads_dew', 'wm_melodyofsink', 'wm_beyond_of_warcry',
    'wm_unlimited_humming_voice', 'wm_frigg_song', 'all_full_throttle'],
  wanderer: ['wa_swing_dance', 'wa_symphony_of_lover', 'wa_moonlit_serenade', 'wm_lesson', 'wm_metalicsound',
    'wm_reverberation', 'wm_severe_rainstorm', 'wm_poemofnetherworld', 'wm_voiceofsiren', 'wm_deadhillhere',
    'wm_lullaby_deepsleep', 'wm_sircleofnature', 'wm_randomizespell', 'wm_gloomyday', 'wm_great_echo', 'wm_song_of_mana',
    'wm_dance_with_wug', 'wm_sound_of_destruction', 'wm_saturday_night_fever', 'wm_lerads_dew', 'wm_melodyofsink',
    'wm_beyond_of_warcry', 'wm_unlimited_humming_voice', 'wm_frigg_song', 'all_full_throttle'],
  geneticist: ['gn_training_sword', 'gn_remodeling_cart', 'gn_cart_tornado', 'gn_cartcannon', 'gn_cartboost',
    'gn_thorns_trap', 'gn_blood_sucker', 'gn_spore_explosion', 'gn_wallofthorn', 'gn_crazyweed', 'gn_demonic_fire',
    'gn_fire_expansion', 'gn_hells_plant', 'gn_mandragora', 'gn_changematerial', 'gn_mix_cooking', 'gn_s_pharmacy',
    'gn_illusiondoping', 'all_full_throttle'],
  mechanic: ['nc_madolicence', 'nc_boostknuckle', 'nc_pilebunker', 'nc_vulcanarm', 'nc_flamelauncher', 'nc_coldslower',
    'nc_armscannon', 'nc_acceleration', 'nc_hovering', 'nc_f_sideslide', 'nc_b_sideslide', 'nc_mainframe',
    'nc_selfdestruction', 'nc_shapeshift', 'nc_emergencycool', 'nc_infraredscan', 'nc_analyze', 'nc_magneticfield',
    'nc_neutralbarrier', 'nc_stealthfield', 'nc_repair', 'nc_trainingaxe', 'nc_researchfe', 'nc_axeboomerang',
    'nc_powerswing', 'nc_axetornado', 'nc_silversniper', 'nc_magicdecoy', 'nc_disjoint', 'nc_magma_eruption',
    'all_full_throttle'],
};
