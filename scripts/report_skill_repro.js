/* 範圍內官方技能（rAthena skill_tree.yml，新手～進階二轉）依「可重現」四類分類。
   node scripts/report_skill_repro.js → docs/SKILL_REPRO.md
   四類（docs/GAMEPLAY_DIRECTION.md D8）：
     戰鬥＝作用在自己／隊友／怪物，用戰鬥機制（距離、詠唱、場地）能做
     系統＝作用在遊戲現有系統（掉落、金錢、商店、製作、精煉、圖鑑）
     新系統＝要先做出遊戲沒有的系統
     無法＝依賴自由移動、真人玩家、PvP／攻城、地形物件
   沒列在下面覆寫表的一律先歸「戰鬥」。「轉譯」欄是放置版的可能做法，由使用者決定是否採用。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGameData, ROOT } = require('./lib/game_data');
const { readYamlBody } = require('./lib/rathena');

const JOBS = [
  ['Novice', '初心者'], ['Swordman', '劍士'], ['Mage', '魔法師'], ['Archer', '弓箭手'], ['Acolyte', '服事'], ['Merchant', '商人'], ['Thief', '盜賊'],
  ['Knight', '騎士'], ['Crusader', '十字軍'], ['Wizard', '巫師'], ['Sage', '賢者'], ['Hunter', '獵人'], ['Bard', '詩人'], ['Dancer', '舞孃'],
  ['Priest', '祭司'], ['Monk', '武僧'], ['Blacksmith', '鐵匠'], ['Alchemist', '鍊金術師'], ['Assassin', '刺客'], ['Rogue', '流氓'],
  ['Lord_Knight', '騎士領主'], ['Paladin', '聖殿十字軍'], ['High_Wizard', '超魔導師'], ['Professor', '智者'], ['Sniper', '神射手'],
  ['Clown', '搞笑藝人'], ['Gypsy', '冷豔舞姬'], ['High_Priest', '神官'], ['Champion', '武術宗師'], ['Whitesmith', '神工匠'],
  ['Creator', '創造者'], ['Assassin_Cross', '十字刺客'], ['Stalker', '神行太保'],
];

const SYS = '系統', NEW = '新系統', NO = '無法', FIGHT = '戰鬥';
/* [類別, 說明／轉譯] */
const OVERRIDE = {
  NV_BASIC: [SYS, '基本動作解鎖；本作只當前置技能'],
  NV_TRICKDEAD: [NO, '轉譯：裝死期間怪物停止攻擊（緊急避難）'],
  WE_CALLBABY: [NO, '婚姻／養子系統'],
  AL_TELEPORT: [NO, '轉譯：立即換一批怪，或脫離戰鬥'],
  AL_WARP: [NO, '轉譯：快速回城或移動到記錄點'],
  AL_HOLYWATER: [SYS, '製作聖水'],
  AC_MAKINGARROW: [SYS, '製作箭矢'],
  MC_INCCARRY: [SYS, '負重上限'],
  MC_DISCOUNT: [SYS, '商店買價折扣'],
  MC_OVERCHARGE: [SYS, '商店賣價提高'],
  MC_PUSHCART: [SYS, '手推車（手推車攻擊等技能的前置）'],
  MC_IDENTIFY: [SYS, '鑑定未鑑定道具'],
  MC_VENDING: [SYS, '露天商店'],
  MC_CHANGECART: [NEW, '手推車外觀'],
  MC_CARTDECORATE: [NEW, '手推車外觀'],
  ALL_BUYING_STORE: [NEW, '收購商店'],
  TF_PICKSTONE: [NO, '轉譯：取得石頭道具（擲石的彈藥）'],
  TF_THROWSTONE: [FIGHT, '需要石頭道具'],
  WZ_ESTIMATION: [SYS, '顯示怪物情報（圖鑑／介面）'],
  BS_IRON: [SYS, '鍛造（重製中）'], BS_STEEL: [SYS, '鍛造（重製中）'], BS_ENCHANTEDSTONE: [SYS, '鍛造（重製中）'],
  BS_ORIDEOCON: [SYS, '鍛造成功率'], BS_DAGGER: [SYS, '鍛造（重製中）'], BS_SWORD: [SYS, '鍛造（重製中）'],
  BS_TWOHANDSWORD: [SYS, '鍛造（重製中）'], BS_AXE: [SYS, '鍛造（重製中）'], BS_MACE: [SYS, '鍛造（重製中）'],
  BS_KNUCKLE: [SYS, '鍛造（重製中）'], BS_SPEAR: [SYS, '鍛造（重製中）'],
  BS_HILTBINDING: [FIGHT, '另有鍛造加成（重製中）'], BS_WEAPONRESEARCH: [FIGHT, '另有鍛造加成（重製中）'],
  BS_FINDINGORE: [SYS, '打怪額外掉礦石'],
  BS_REPAIRWEAPON: [NEW, '裝備損壞系統'],
  BS_GREED: [NO, '掉落已自動入包，沒有作用'],
  AM_LEARNINGPOTION: [SYS, '製藥成功率'], AM_PHARMACY: [SYS, '製藥'],
  AM_TWILIGHT1: [SYS, '大量製藥'], AM_TWILIGHT2: [SYS, '大量製藥'], AM_TWILIGHT3: [SYS, '大量製藥'],
  AM_CP_WEAPON: [NEW, '裝備損壞／剝離系統'], AM_CP_SHIELD: [NEW, '裝備損壞／剝離系統'],
  AM_CP_ARMOR: [NEW, '裝備損壞／剝離系統'], AM_CP_HELM: [NEW, '裝備損壞／剝離系統'],
  AM_BIOETHICS: [NEW, '生命體（決定不做）'], AM_CALLHOMUN: [NEW, '生命體（決定不做）'],
  AM_REST: [NEW, '生命體（決定不做）'], AM_RESURRECTHOMUN: [NEW, '生命體（決定不做）'],
  SA_CREATECON: [SYS, '製作屬性轉換器'],
  WS_WEAPONREFINE: [SYS, '精煉'],
  ASC_CDP: [SYS, '製作毒藥瓶'],
  RG_GRAFFITI: [NO, '地面塗鴉'], RG_FLAGGRAFFITI: [NO, '攻城戰旗幟塗鴉'], RG_CLEANER: [NO, '清除塗鴉'],
  RG_GANGSTER: [NO, '影響其他坐下的玩家'],
  RG_TUNNELDRIVE: [NO, '轉譯：隱匿狀態下仍可行動'],
  RG_COMPULSION: [SYS, '商店買價折扣'],
  RG_PLAGIARISM: [FIGHT, '複製怪物施放的技能'],
  HT_REMOVETRAP: [NO, '回收地上的陷阱'],
  HT_TALKIEBOX: [NO, '留言陷阱'],
  HT_SPRINGTRAP: [NO, '破壞他人的陷阱'],
  BD_RICHMANKIM: [SYS, '經驗值加成（合奏）'],
  ST_CHASEWALK: [NO, '轉譯：隱匿狀態下的移速／STR 加成'],
};

function loadZhNames() {
  const dir = path.join(ROOT, 'ro_skill_data', 'js_data');
  const zh = {};
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const ctx = {};
    vm.runInNewContext(fs.readFileSync(path.join(dir, f), 'utf8') + ';this.o = class_skill;', ctx);
    for (const [k, v] of Object.entries(ctx.o || {})) if (v.nameZh && !zh[k]) zh[k] = v.nameZh;
  }
  return zh;
}

function main() {
  const g = loadGameData();
  const tree = readYamlBody(path.join('grf_ex', 'skill_tree.yml'));
  const db = new Map(readYamlBody(path.join('grf_ex', 'skill_db.yml')).map(s => [s.Name, s]));
  const zh = loadZhNames();
  const mapFile = path.join(ROOT, 'scripts', 'out', 'skill_id_map.json');
  const idMap = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : [];
  const gameBy = {};
  idMap.filter(r => r.pick).forEach(r => { gameBy[r.pick] = r; });
  // 遊戲把傭兵的狂暴狀態當成劍士技能
  if (gameBy.MER_AUTOBERSERK && !gameBy.SM_AUTOBERSERK) gameBy.SM_AUTOBERSERK = gameBy.MER_AUTOBERSERK;

  const seen = new Set();
  const counts = { [FIGHT]: 0, [SYS]: 0, [NEW]: 0, [NO]: 0 };
  const status = { 現有: 0, 遊戲改成被動: 0, 缺少: 0 };
  let body = '';
  for (const [job, jobZh] of JOBS) {
    const e = tree.find(t => t.Job === job);
    const list = ((e && e.Tree) || []).filter(s => !seen.has(s.Name));
    list.forEach(s => seen.add(s.Name));
    if (!list.length) continue;
    body += `## ${jobZh}（${job}）\n\n| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |\n|---|---|---|---|---|\n`;
    for (const s of list) {
      const d = db.get(s.Name) || {};
      const passive = !d.TargetType || d.TargetType === 'Passive';
      const [cat, note] = OVERRIDE[s.Name] || [FIGHT, ''];
      const gm = gameBy[s.Name];
      const gsk = gm && g.SKILLS[gm.id];
      let st = '缺少';
      if (gsk) st = (gsk.type === 'passive' && !passive) ? '遊戲改成被動' : '現有';
      counts[cat]++;
      status[st]++;
      const name = zh[s.Name] || (gsk && String(gsk.name).replace(/\s+[A-Za-z].*$/, '')) || d.Description || s.Name;
      body += `| ${name} | \`${s.Name.toLowerCase()}\` | ${cat} | ${st}${gsk ? '（`' + gm.id + '`）' : ''} | ${note} |\n`;
    }
    body += '\n';
  }
  const md = '# 技能可重現分類（D8）\n\n'
    + '> `node scripts/report_skill_repro.js` 產生。範圍：rAthena `skill_tree.yml` 新手～進階二轉（不含生命體以外的擴充職業）。\n'
    + '> 類別標準：**戰鬥**＝作用在自己／隊友／怪物、戰鬥機制能做；**系統**＝作用在現有系統（掉落、金錢、商店、製作、精煉、圖鑑）；'
    + '**新系統**＝要先做出遊戲沒有的系統；**無法**＝依賴自由移動、真人玩家、PvP／攻城、地形物件。\n'
    + '> 「說明／轉譯」是放置版的可能做法，採用與否由使用者決定。遊戲現況欄的括號是目前的遊戲技能 id。\n\n'
    + `共 ${seen.size} 個技能：戰鬥 ${counts[FIGHT]}、系統 ${counts[SYS]}、新系統 ${counts[NEW]}、無法 ${counts[NO]}。`
    + `遊戲現況：現有 ${status.現有}、遊戲改成被動 ${status.遊戲改成被動}、缺少 ${status.缺少}。\n\n`
    + body;
  fs.writeFileSync(path.join(ROOT, 'docs', 'SKILL_REPRO.md'), md);
  console.log('技能', seen.size, JSON.stringify(counts), JSON.stringify(status));
}

main();
