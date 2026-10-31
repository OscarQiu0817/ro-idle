/* AUTO: node tools/build_skill_cast_data.js — Renewal FCT/VCT（勿手改） */
const SKILL_CAST_META = {
  "generatedAt": "2026-10-31T09:58:52.370Z",
  "phase": "1.1",
  "roSkillEntries": 1305,
  "gameSkills": 327,
  "roMapped": 322,
  "roMappedPct": 98.5,
  "authorCustomCount": 5,
  "authorCustomIds": [
    "novice_firstaid",
    "novice_basicskill",
    "novice_hpboost",
    "novice_flee",
    "swordcraft"
  ],
  "unmappedFailCount": 0,
  "withCastData": 140,
  "skillCastEntries": 140,
  "interruptDamage": 139,
  "interruptNone": 1,
  "passiveWithRoMapping": 181
};
const SKILL_CAST = {
  "energycoat": {
    "roId": "MG_ENERGYCOAT",
    "fixed": [
      5
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "firebolt": {
    "roId": "MG_FIREBOLT",
    "fixed": [
      0.3,
      0.4,
      0.5,
      0.6,
      0.7,
      0.8,
      0.9,
      1,
      1.1,
      1.2
    ],
    "variable": [
      0.5,
      0.8,
      1.1,
      1.4,
      1.7,
      2,
      2.3,
      2.6,
      2.9,
      3.2
    ],
    "interrupt": "damage"
  },
  "fireball": {
    "roId": "MG_FIREBALL",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "firewall": {
    "roId": "MG_FIREWALL",
    "fixed": [
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14
    ],
    "variable": [
      0.4,
      0.36,
      0.32,
      0.28,
      0.24,
      0.22,
      0.2,
      0.18,
      0.16,
      0.14
    ],
    "interrupt": "damage"
  },
  "lightningbolt": {
    "roId": "MG_LIGHTNINGBOLT",
    "fixed": [
      0.3,
      0.4,
      0.5,
      0.6,
      0.7,
      0.8,
      0.9,
      1,
      1.1,
      1.2
    ],
    "variable": [
      0.5,
      0.8,
      1.1,
      1.4,
      1.7,
      2,
      2.3,
      2.6,
      2.9,
      3.2
    ],
    "interrupt": "damage"
  },
  "thunderstorm": {
    "roId": "MG_THUNDERSTORM",
    "fixed": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "variable": [
      2.7,
      2.9,
      3.1,
      3.3,
      3.5,
      3.7,
      3.9,
      4.1,
      4.3,
      4.5
    ],
    "interrupt": "damage"
  },
  "coldbolt": {
    "roId": "MG_COLDBOLT",
    "fixed": [
      0.3,
      0.4,
      0.5,
      0.6,
      0.7,
      0.8,
      0.9,
      1,
      1.1,
      1.2
    ],
    "variable": [
      0.5,
      0.8,
      1.1,
      1.4,
      1.7,
      2,
      2.3,
      2.6,
      2.9,
      3.2
    ],
    "interrupt": "damage"
  },
  "frostdiver": {
    "roId": "MG_FROSTDIVER",
    "fixed": [
      0.16,
      0.16,
      0.16,
      0.16,
      0.16,
      0.16,
      0.16,
      0.16,
      0.16,
      0.16
    ],
    "variable": [
      0.64,
      0.64,
      0.64,
      0.64,
      0.64,
      0.64,
      0.64,
      0.64,
      0.64,
      0.64
    ],
    "interrupt": "damage"
  },
  "stonecurse": {
    "roId": "MG_STONECURSE",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "napalmbeat": {
    "roId": "MG_NAPALMBEAT",
    "fixed": [
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1
    ],
    "variable": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "interrupt": "damage"
  },
  "soulstrike": {
    "roId": "MG_SOULSTRIKE",
    "fixed": [
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1,
      0.1
    ],
    "variable": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "interrupt": "damage"
  },
  "safetywall": {
    "roId": "MG_SAFETYWALL",
    "fixed": [
      5,
      10,
      15,
      20,
      25,
      30,
      35,
      40,
      45,
      50
    ],
    "variable": [
      0.8,
      0.72,
      0.64,
      0.56,
      0.48,
      0.4,
      0.32,
      0.24,
      0.16,
      0.08
    ],
    "interrupt": "damage"
  },
  "chargearrow": {
    "roId": "AC_CHARGEARROW",
    "fixed": [
      0.8
    ],
    "variable": [
      0.4
    ],
    "interrupt": "damage"
  },
  "loudexclamation": {
    "roId": "MC_LOUD",
    "fixed": [
      0.3
    ],
    "variable": [
      1
    ],
    "interrupt": "damage"
  },
  "warpportal": {
    "roId": "AL_WARP",
    "fixed": [
      1,
      1,
      1,
      1
    ],
    "variable": [
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "angelusbarrier": {
    "roId": "AL_ANGELUS",
    "fixed": [
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15
    ],
    "variable": [
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35
    ],
    "interrupt": "damage"
  },
  "increaseagi": {
    "roId": "AL_INCAGI",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "decreaseagi": {
    "roId": "AL_DECAGI",
    "fixed": [
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25
    ],
    "variable": [
      0.75,
      0.75,
      0.75,
      0.75,
      0.75,
      0.75,
      0.75,
      0.75,
      0.75,
      0.75
    ],
    "interrupt": "damage"
  },
  "signumcrusis": {
    "roId": "AL_CRUCIS",
    "fixed": [
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15
    ],
    "variable": [
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35
    ],
    "interrupt": "damage"
  },
  "holywater": {
    "roId": "AL_HOLYWATER",
    "fixed": [
      0.2
    ],
    "variable": [
      0.8
    ],
    "interrupt": "damage"
  },
  "holylight": {
    "roId": "AL_HOLYLIGHT",
    "fixed": [
      0.2
    ],
    "variable": [
      0.8
    ],
    "interrupt": "damage"
  },
  "charge": {
    "roId": "AT_ROARING_CHARGE",
    "fixed": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "variable": [
      1.4,
      1.4,
      1.4,
      1.4,
      1.4
    ],
    "interrupt": "damage"
  },
  "bowlingbash": {
    "roId": "KN_BOWLINGBASH",
    "fixed": [
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "brandishspear": {
    "roId": "KN_BRANDISHSPEAR",
    "fixed": [
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "firebolt_wiz": {
    "roId": "WZ_SIGHTRASHER",
    "fixed": [
      0.08,
      0.08,
      0.08,
      0.08,
      0.08,
      0.08,
      0.08,
      0.08,
      0.08,
      0.08
    ],
    "variable": [
      0.32,
      0.32,
      0.32,
      0.32,
      0.32,
      0.32,
      0.32,
      0.32,
      0.32,
      0.32
    ],
    "interrupt": "damage"
  },
  "firepillar": {
    "roId": "WZ_FIREPILLAR",
    "fixed": [
      0.48,
      0.432,
      0.384,
      0.336,
      0.288,
      0.24,
      0.192,
      0.144,
      0.096,
      0.048
    ],
    "variable": [
      1.92,
      1.728,
      1.536,
      1.344,
      1.152,
      0.96,
      0.768,
      0.576,
      0.384,
      0.192
    ],
    "interrupt": "damage"
  },
  "meteorstorm": {
    "roId": "WZ_METEOR",
    "fixed": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "variable": [
      6.3,
      6.3,
      6.3,
      6.3,
      6.3,
      6.3,
      6.3,
      6.3,
      6.3,
      6.3
    ],
    "interrupt": "damage"
  },
  "jupitel": {
    "roId": "WZ_JUPITEL",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      2,
      2.2,
      2.4,
      2.6,
      2.8,
      3,
      3.2,
      3.4,
      3.6,
      3.8
    ],
    "interrupt": "damage"
  },
  "lordofvermillion": {
    "roId": "WZ_VERMILION",
    "fixed": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "variable": [
      6.3,
      6.1,
      5.9,
      5.7,
      5.5,
      5.3,
      5.1,
      4.9,
      4.7,
      4.5
    ],
    "interrupt": "damage"
  },
  "waterball": {
    "roId": "WZ_WATERBALL",
    "fixed": [
      0.16,
      0.32,
      0.48,
      0.64,
      0.8
    ],
    "variable": [
      0.64,
      1.28,
      1.92,
      2.56,
      3.2
    ],
    "interrupt": "damage"
  },
  "frostdiver_wiz": {
    "roId": "WZ_FROSTNOVA",
    "fixed": [
      1.5,
      3,
      4.5,
      6,
      7.5,
      9,
      10.5,
      12,
      13.5,
      15
    ],
    "variable": [
      0.16,
      0.16,
      0.144,
      0.144,
      0.128,
      0.128,
      0.112,
      0.112,
      0.096,
      0.096
    ],
    "interrupt": "damage"
  },
  "stormgust": {
    "roId": "WZ_STORMGUST",
    "fixed": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "variable": [
      4.5,
      4.7,
      4.9,
      5.1,
      5.3,
      5.5,
      5.7,
      5.9,
      6.1,
      6.3
    ],
    "interrupt": "damage"
  },
  "earthspike": {
    "roId": "WZ_EARTHSPIKE",
    "fixed": [
      0.4,
      0.6,
      0.8,
      1,
      1.2
    ],
    "variable": [
      0.8,
      1.4,
      2,
      2.6,
      3.2
    ],
    "interrupt": "damage"
  },
  "heavensdrive": {
    "roId": "WZ_HEAVENDRIVE",
    "fixed": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "variable": [
      1.1,
      1.3,
      1.5,
      1.7,
      1.9
    ],
    "interrupt": "damage"
  },
  "blitzbeat": {
    "roId": "HT_BLITZBEAT",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "trap": {
    "roId": "GN_THORNS_TRAP",
    "fixed": [
      0,
      0,
      0,
      0,
      0
    ],
    "variable": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "interrupt": "damage"
  },
  "blastmine": {
    "roId": "HT_BLASTMINE",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "claymoretrap": {
    "roId": "HT_CLAYMORETRAP",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "magnumbreak_h": {
    "roId": "HT_CLAYMORETRAP",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "weaponrepair": {
    "roId": "BS_REPAIRWEAPON",
    "fixed": [
      2.5
    ],
    "variable": [
      2.5
    ],
    "interrupt": "damage"
  },
  "venominfusion": {
    "roId": "AS_SPLASHER",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "enchantblade": {
    "roId": "RK_ENCHANTBLADE",
    "fixed": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "sanctuary": {
    "roId": "PR_SANCTUARY",
    "fixed": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4
    ],
    "interrupt": "damage"
  },
  "magnificat": {
    "roId": "PR_MAGNIFICAT",
    "fixed": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "variable": [
      3.2,
      3.2,
      3.2,
      3.2,
      3.2
    ],
    "interrupt": "damage"
  },
  "kyrie": {
    "roId": "PR_KYRIE",
    "fixed": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "variable": [
      1.6,
      1.6,
      1.6,
      1.6,
      1.6,
      1.6,
      1.6,
      1.6,
      1.6,
      1.6
    ],
    "interrupt": "damage"
  },
  "assumptio": {
    "roId": "HP_ASSUMPTIO",
    "fixed": [
      20,
      40,
      60,
      80,
      100
    ],
    "variable": [
      0.2,
      0.3,
      0.4,
      0.5,
      0.6
    ],
    "interrupt": "damage"
  },
  "resurrection": {
    "roId": "PR_RESURRECTION",
    "fixed": [
      1.2,
      0.8,
      0.4,
      0
    ],
    "variable": [
      4.8,
      3.2,
      1.6,
      0
    ],
    "interrupt": "damage"
  },
  "impositio": {
    "roId": "PR_IMPOSITIO",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "turnundead": {
    "roId": "PR_TURNUNDEAD",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "angelus": {
    "roId": "AL_ANGELUS",
    "fixed": [
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15,
      0.15
    ],
    "variable": [
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35,
      0.35
    ],
    "interrupt": "damage"
  },
  "asperio": {
    "roId": "PR_MAGNUS",
    "fixed": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4
    ],
    "interrupt": "damage"
  },
  "suffragium": {
    "roId": "PR_SUFFRAGIUM",
    "fixed": [
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "impositio_manus": {
    "roId": "PR_IMPOSITIO",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "grandcross": {
    "roId": "CR_GRANDCROSS",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "none"
  },
  "dispell_magic": {
    "roId": "SA_DISPELL",
    "fixed": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "variable": [
      1.6,
      1.6,
      1.6,
      1.6,
      1.6
    ],
    "interrupt": "damage"
  },
  "lk_spiralpierce": {
    "roId": "LK_SPIRALPIERCE",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      0.05,
      0.1,
      0.15,
      0.2,
      0.25
    ],
    "interrupt": "damage"
  },
  "asc_breaker": {
    "roId": "ASC_BREAKER",
    "fixed": [
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25
    ],
    "variable": [
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25
    ],
    "interrupt": "damage"
  },
  "asc_meteorassault": {
    "roId": "ASC_METEORASSAULT",
    "fixed": [
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25
    ],
    "variable": [
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25,
      0.25
    ],
    "interrupt": "damage"
  },
  "sn_windwalk": {
    "roId": "SN_WINDWALK",
    "fixed": [
      130,
      160,
      190,
      220,
      250,
      280,
      310,
      340,
      370,
      400
    ],
    "variable": [
      0.5,
      0.6,
      0.7,
      0.8,
      0.9,
      1,
      1.1,
      1.2,
      1.3,
      1.4
    ],
    "interrupt": "damage"
  },
  "sn_sharpshooting": {
    "roId": "SN_SHARPSHOOTING",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "sn_falconassault": {
    "roId": "SN_FALCONASSAULT",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "hw_ganbantein": {
    "roId": "HW_GANBANTEIN",
    "fixed": [
      3
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "hw_napalmvulcan": {
    "roId": "HW_NAPALMVULCAN",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "hw_magiccrasher": {
    "roId": "HW_MAGICCRASHER",
    "fixed": [
      0.06
    ],
    "variable": [
      0.24
    ],
    "interrupt": "damage"
  },
  "hw_magicpower": {
    "roId": "HW_MAGICPOWER",
    "fixed": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "variable": [
      0.7,
      0.7,
      0.7,
      0.7,
      0.7,
      0.7,
      0.7,
      0.7,
      0.7,
      0.7
    ],
    "interrupt": "damage"
  },
  "hw_gravitation": {
    "roId": "HW_GRAVITATION",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      5,
      5,
      5,
      5,
      5
    ],
    "interrupt": "damage"
  },
  "hp_basilica": {
    "roId": "HP_BASILICA",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      3,
      3,
      3,
      3,
      3
    ],
    "interrupt": "damage"
  },
  "hp_assumptio": {
    "roId": "HP_ASSUMPTIO",
    "fixed": [
      20,
      40,
      60,
      80,
      100
    ],
    "variable": [
      0.2,
      0.3,
      0.4,
      0.5,
      0.6
    ],
    "interrupt": "damage"
  },
  "cr_devotion": {
    "roId": "CR_DEVOTION",
    "fixed": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "variable": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "interrupt": "damage"
  },
  "cr_providence": {
    "roId": "CR_PROVIDENCE",
    "fixed": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "variable": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "interrupt": "damage"
  },
  "ba_dissonance": {
    "roId": "BA_DISSONANCE",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "ba_whistle": {
    "roId": "BA_WHISTLE",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "ba_assassincross": {
    "roId": "BA_ASSASSINCROSS",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "ba_poembragi": {
    "roId": "BA_POEMBRAGI",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "ba_appleidun": {
    "roId": "BA_APPLEIDUN",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "ba_musicalstrike": {
    "roId": "BA_MUSICALSTRIKE",
    "fixed": [
      0,
      0,
      0,
      0,
      0
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "ba_pangvoice": {
    "roId": "BA_PANGVOICE",
    "fixed": [
      0.2
    ],
    "variable": [
      0.8
    ],
    "interrupt": "damage"
  },
  "dc_uglydance": {
    "roId": "DC_UGLYDANCE",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "dc_humming": {
    "roId": "DC_HUMMING",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "dc_dontforgetme": {
    "roId": "DC_DONTFORGETME",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "dc_fortunekiss": {
    "roId": "DC_FORTUNEKISS",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "dc_serviceforyou": {
    "roId": "DC_SERVICEFORYOU",
    "fixed": [
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3,
      0.3
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "dc_throwarrow": {
    "roId": "DC_THROWARROW",
    "fixed": [
      0,
      0,
      0,
      0,
      0
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "dc_winkcharm": {
    "roId": "DC_WINKCHARM",
    "fixed": [
      0.2
    ],
    "variable": [
      0.8
    ],
    "interrupt": "damage"
  },
  "bd_lullaby": {
    "roId": "BD_LULLABY",
    "fixed": [
      0.5
    ],
    "variable": [
      1
    ],
    "interrupt": "damage"
  },
  "bd_intoabyss": {
    "roId": "BD_INTOABYSS",
    "fixed": [
      0.5
    ],
    "variable": [
      1
    ],
    "interrupt": "damage"
  },
  "bd_rokisweil": {
    "roId": "BD_ROKISWEIL",
    "fixed": [
      1
    ],
    "variable": [
      3
    ],
    "interrupt": "damage"
  },
  "bd_eternalchaos": {
    "roId": "BD_ETERNALCHAOS",
    "fixed": [
      0.5
    ],
    "variable": [
      1
    ],
    "interrupt": "damage"
  },
  "bd_siegfried": {
    "roId": "BD_SIEGFRIED",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "bd_richmankim": {
    "roId": "BD_RICHMANKIM",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "bd_drumbattlefield": {
    "roId": "BD_DRUMBATTLEFIELD",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "bd_ringnibelungen": {
    "roId": "BD_RINGNIBELUNGEN",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      3,
      3,
      3,
      3,
      3
    ],
    "interrupt": "damage"
  },
  "rg_striphelm": {
    "roId": "RG_STRIPHELM",
    "fixed": [
      75,
      90,
      105,
      120,
      135
    ],
    "variable": [
      0.14,
      0.18,
      0.22,
      0.26,
      0.3
    ],
    "interrupt": "damage"
  },
  "rg_stripshield": {
    "roId": "RG_STRIPSHIELD",
    "fixed": [
      75,
      90,
      105,
      120,
      135
    ],
    "variable": [
      0.14,
      0.18,
      0.22,
      0.26,
      0.3
    ],
    "interrupt": "damage"
  },
  "rg_striparmor": {
    "roId": "RG_STRIPARMOR",
    "fixed": [
      75,
      90,
      105,
      120,
      135
    ],
    "variable": [
      0.14,
      0.18,
      0.22,
      0.26,
      0.3
    ],
    "interrupt": "damage"
  },
  "rg_stripweapon": {
    "roId": "RG_STRIPWEAPON",
    "fixed": [
      75,
      90,
      105,
      120,
      135
    ],
    "variable": [
      0.14,
      0.18,
      0.22,
      0.26,
      0.3
    ],
    "interrupt": "damage"
  },
  "mo_callspirits": {
    "roId": "MO_CALLSPIRITS",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "mo_absorbspirits": {
    "roId": "MO_ABSORBSPIRITS",
    "fixed": [
      0.5
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "mo_steelbody": {
    "roId": "MO_STEELBODY",
    "fixed": [
      2.5,
      2.5,
      2.5,
      2.5,
      2.5
    ],
    "variable": [
      2.5,
      2.5,
      2.5,
      2.5,
      2.5
    ],
    "interrupt": "damage"
  },
  "mo_investigate": {
    "roId": "MO_INVESTIGATE",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "mo_fingeroffensive": {
    "roId": "MO_FINGEROFFENSIVE",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "mo_extremityfist": {
    "roId": "MO_EXTREMITYFIST",
    "fixed": [
      2,
      1.75,
      1.5,
      1.25,
      1
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "mo_kitranslation": {
    "roId": "MO_KITRANSLATION",
    "fixed": [
      1
    ],
    "variable": [
      1
    ],
    "interrupt": "damage"
  },
  "sa_flamelauncher": {
    "roId": "SA_FLAMELAUNCHER",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "sa_frostweapon": {
    "roId": "SA_FROSTWEAPON",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "sa_lightningloader": {
    "roId": "SA_LIGHTNINGLOADER",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "sa_seismicweapon": {
    "roId": "SA_SEISMICWEAPON",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "sa_volcano": {
    "roId": "SA_VOLCANO",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      4,
      4,
      4,
      4,
      4
    ],
    "interrupt": "damage"
  },
  "sa_deluge": {
    "roId": "SA_DELUGE",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      4,
      4,
      4,
      4,
      4
    ],
    "interrupt": "damage"
  },
  "sa_violentgale": {
    "roId": "SA_VIOLENTGALE",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      4,
      4,
      4,
      4,
      4
    ],
    "interrupt": "damage"
  },
  "sa_landprotector": {
    "roId": "SA_LANDPROTECTOR",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      4,
      4,
      4,
      4,
      4
    ],
    "interrupt": "damage"
  },
  "sa_autospell": {
    "roId": "SA_AUTOSPELL",
    "fixed": [
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "sa_spellbreaker": {
    "roId": "SA_SPELLBREAKER",
    "fixed": [
      0.14,
      0.14,
      0.14,
      0.14,
      0.14
    ],
    "variable": [
      0.56,
      0.56,
      0.56,
      0.56,
      0.56
    ],
    "interrupt": "damage"
  },
  "sa_dispell": {
    "roId": "SA_DISPELL",
    "fixed": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "variable": [
      1.6,
      1.6,
      1.6,
      1.6,
      1.6
    ],
    "interrupt": "damage"
  },
  "sa_elementfire": {
    "roId": "SA_ELEMENTFIRE",
    "fixed": [
      2
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "sa_elementwater": {
    "roId": "SA_ELEMENTWATER",
    "fixed": [
      2
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "sa_elementwind": {
    "roId": "SA_ELEMENTWIND",
    "fixed": [
      2
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "sa_elementearth": {
    "roId": "SA_ELEMENTGROUND",
    "fixed": [
      2
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "am_demonstration": {
    "roId": "AM_DEMONSTRATION",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "am_acidterror": {
    "roId": "AM_ACIDTERROR",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "am_spheremine": {
    "roId": "AM_SPHEREMINE",
    "fixed": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "variable": [
      1.6,
      1.6,
      1.6,
      1.6,
      1.6
    ],
    "interrupt": "damage"
  },
  "am_cannibalize": {
    "roId": "AM_CANNIBALIZE",
    "fixed": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "variable": [
      1.6,
      1.6,
      1.6,
      1.6,
      1.6
    ],
    "interrupt": "damage"
  },
  "am_cp_helm": {
    "roId": "AM_CP_HELM",
    "fixed": [
      2,
      2,
      2,
      2,
      2
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "am_cp_shield": {
    "roId": "AM_CP_SHIELD",
    "fixed": [
      2,
      2,
      2,
      2,
      2
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "am_cp_armor": {
    "roId": "AM_CP_ARMOR",
    "fixed": [
      2,
      2,
      2,
      2,
      2
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "am_cp_weapon": {
    "roId": "AM_CP_WEAPON",
    "fixed": [
      2,
      2,
      2,
      2,
      2
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "am_resurrecthomun": {
    "roId": "AM_RESURRECTHOMUN",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      2,
      2,
      2,
      2,
      2
    ],
    "interrupt": "damage"
  },
  "pa_shieldchain": {
    "roId": "PA_SHIELDCHAIN",
    "fixed": [
      0.2,
      0.2,
      0.2,
      0.2,
      0.2
    ],
    "variable": [
      0.8,
      0.8,
      0.8,
      0.8,
      0.8
    ],
    "interrupt": "damage"
  },
  "pa_pressure": {
    "roId": "PA_PRESSURE",
    "fixed": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "pf_doublecasting": {
    "roId": "PF_DOUBLECASTING",
    "fixed": [
      0.4,
      0.4,
      0.4,
      0.4,
      0.4
    ],
    "variable": [
      1.6,
      1.6,
      1.6,
      1.6,
      1.6
    ],
    "interrupt": "damage"
  },
  "pf_memorize": {
    "roId": "PF_MEMORIZE",
    "fixed": [
      2.5
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "pf_soulchange": {
    "roId": "PF_SOULCHANGE",
    "fixed": [
      3
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "cg_tarotcard": {
    "roId": "CG_TAROTCARD",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "cg_arrowvulcan": {
    "roId": "CG_ARROWVULCAN",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5,
      1.5
    ],
    "interrupt": "damage"
  },
  "bc_slimpitcher": {
    "roId": "BC_SLIMPITCHER",
    "fixed": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "interrupt": "damage"
  },
  "bc_aciddemonstration": {
    "roId": "BC_ACIDDEMONSTRATION",
    "fixed": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "bc_fullprotection": {
    "roId": "BC_FULLPROTECTION",
    "fixed": [
      1,
      1,
      1,
      1,
      1
    ],
    "variable": [
      0,
      0,
      0,
      0,
      0
    ],
    "interrupt": "damage"
  },
  "st_chasewalk": {
    "roId": "ST_CHASEWALK",
    "fixed": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "variable": [
      0.5,
      0.5,
      0.5,
      0.5,
      0.5
    ],
    "interrupt": "damage"
  },
  "st_preserve": {
    "roId": "ST_PRESERVE",
    "fixed": [
      1
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  },
  "ch_soulcollect": {
    "roId": "CH_SOULCOLLECT",
    "fixed": [
      1
    ],
    "variable": [
      0
    ],
    "interrupt": "damage"
  }
};
