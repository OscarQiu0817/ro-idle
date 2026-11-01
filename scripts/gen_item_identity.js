/* 道具身分層比對（docs/GAMEPLAY_DIRECTION.md 工作 2）：
   遊戲 ITEMS 對照 rAthena item_db（職業、階級、部位、類型、武器類別、孔數、等級）與台服 itemInfo（名稱）。
   node scripts/gen_item_identity.js          → 摘要＋ scripts/out/item_identity_report.json
   node scripts/gen_item_identity.js --write  → 另產生 js/item_identity.js（data.js 之後載入，覆寫身分欄位） */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { loadItemDb, loadItemInfo } = require('./lib/rathena');

/* D4：v2 只做到進階二轉。遊戲職業 → rAthena Jobs 名稱 */
const SCOPE_JOB_TO_RA = {
  novice: 'Novice', supernovice: 'SuperNovice',
  swordsman: 'Swordman', knight: 'Knight', crusader: 'Crusader', lordknight: 'Knight', paladin: 'Crusader',
  mage: 'Mage', wizard: 'Wizard', sage: 'Sage', highwizard: 'Wizard', professor: 'Sage',
  archer: 'Archer', hunter: 'Hunter', bard: 'BardDancer', dancer: 'BardDancer', sniper: 'Hunter', clown: 'BardDancer', gypsy: 'BardDancer',
  acolyte: 'Acolyte', priest: 'Priest', monk: 'Monk', highpriest: 'Priest', champion: 'Monk',
  merchant: 'Merchant', blacksmith: 'Blacksmith', alchemist: 'Alchemist', whitesmith: 'Blacksmith', creator: 'Alchemist',
  thief: 'Thief', assassin: 'Assassin', rogue: 'Rogue', assassincross: 'Assassin', stalker: 'Rogue',
};
/* 詩人系限男、舞孃系限女：rAthena 用 BardDancer＋Gender 區分 */
const JOB_GENDER = { bard: 'Male', clown: 'Male', dancer: 'Female', gypsy: 'Female' };
const TRANS_JOBS = new Set(['lordknight', 'paladin', 'highwizard', 'professor', 'sniper', 'clown', 'gypsy',
  'highpriest', 'champion', 'whitesmith', 'creator', 'assassincross', 'stalker']);

const RA_TYPE_TO_GAME = {
  Weapon: 'weapon', Armor: 'armor', Ammo: 'ammo', Etc: 'material', Card: 'card',
  Healing: 'consumable', Usable: 'consumable', DelayConsume: 'consumable', Delayconsume: 'consumable', Cash: 'consumable',
  PetEgg: 'pet', Petegg: 'pet', PetArmor: 'pet', Petarmor: 'pet', ShadowGear: 'shadow', Shadowgear: 'shadow',
};
/* rAthena SubType → 遊戲 weaponCat（攻速分類用的那個欄位）與是否雙手 */
const RA_SUBTYPE_TO_CAT = {
  '1hSword': ['sword', false], '2hSword': ['tsword', true], Dagger: ['dagger', false], Katar: ['katar', true],
  '1hAxe': ['axe1', false], '2hAxe': ['axe2', true], Mace: ['mace', false], '2hMace': ['mace', true],
  '1hSpear': ['spear', false], '2hSpear': ['spear', true], Staff: ['rod', false], '2hStaff': ['rod', true],
  Book: ['book', false], Bow: ['bow', true], Knuckle: ['knuckle', false], Musical: ['instrument', false],
  Whip: ['whip', false], Huuma: ['huuma', true], Revolver: ['pistol', false], Rifle: ['rifle', true],
  Shotgun: ['shotgun', true], Gatling: ['gatling', true], Grenade: ['grenade', true],
};
/* 消耗品身上有這些欄位就是有使用效果，不改成雜物 */
const BASE_KEYS = new Set(['id', 'imgId', 'name', 'type', 'icon', 'sell', 'weight', 'desc', 'buyPrice']);
const RA_SUBTYPE_TO_GAME = {
  '1hSword': 'sword', '2hSword': 'tsword', Dagger: 'dagger', Katar: 'katar', '1hAxe': 'axe', '2hAxe': 'taxe',
  Mace: 'mace', '2hMace': 'mace', '1hSpear': 'spear', '2hSpear': 'tspear', Staff: 'rod', '2hStaff': 'rod',
  Book: 'book', Bow: 'bow', Knuckle: 'knuckle', Musical: 'instrument', Whip: 'whip', Huuma: 'shuriken',
  Revolver: 'gun', Rifle: 'gun', Shotgun: 'gun', Gatling: 'gun', Grenade: 'gun',
};

function raArmorType(loc) {
  const k = Object.keys(loc || {});
  if (k.some(x => x.startsWith('Costume_'))) return 'costume';
  if (k.some(x => x.startsWith('Shadow_'))) return 'shadow';
  if (k.some(x => x.startsWith('Head_'))) return 'headgear';
  if (k.includes('Armor')) return 'body';
  if (k.includes('Shoes')) return 'footgear';
  if (k.includes('Garment')) return 'garment';
  if (k.includes('Left_Hand')) return 'shield';
  if (k.some(x => /Accessory/.test(x))) return 'accessory';
  return k.join('+') || null;
}
const gameArmorType = t => (t === 'leather' || t === 'armor') ? 'body' : t;

/* rAthena 階級：Upper＝轉生後；All_Third / Third… / Fourth＝三轉以上（D4 範圍外） */
function raTier(classes) {
  const k = Object.keys(classes || {}).filter(x => classes[x]);
  if (!k.length || k.includes('All')) return 'all';
  if (k.some(x => x === 'Normal' || x === 'Baby' || x === 'All_Normal')) return 'all';
  if (k.includes('Upper') || k.includes('All_Upper')) return 'upper';
  if (k.includes('Fourth')) return 'fourth';
  return 'third';
}

function main() {
  const g = loadGameData();
  const db = loadItemDb();
  const info = loadItemInfo();
  const byAegis = new Map();
  db.forEach(it => byAegis.set(String(it.AegisName).toLowerCase(), it));

  const chainOf = job => { const c = []; let j = job; while (j) { c.push(j); j = g.JOB_TREE[j] && g.JOB_TREE[j].parent; } return c; };
  const scopeJobs = Object.keys(SCOPE_JOB_TO_RA).filter(j => g.JOB_TREE[j]);

  const R = {
    unmatched: [], matchBy: { aegis: 0, imgId: 0 },
    outOfScope: [], typeDiff: [], armorTypeDiff: [], weaponTypeDiff: [],
    jobTooLoose: [], jobTooStrict: [], tierUpperOnly: [],
    slotsDiff: [], reqLevelDiff: [], nameDiff: [],
  };

  const patch = {};
  const put = (id, k, v) => { (patch[id] = patch[id] || {})[k] = v; };
  for (const it of Object.values(g.ITEMS)) {
    let ra = byAegis.get(String(it.id).toLowerCase());
    if (ra) R.matchBy.aegis++;
    else if (it.imgId && db.get(it.imgId)) { ra = db.get(it.imgId); R.matchBy.imgId++; }
    if (!ra) { R.unmatched.push({ id: it.id, name: it.name, type: it.type }); continue; }
    const row = { id: it.id, raId: ra.Id, name: it.name };

    const raType = RA_TYPE_TO_GAME[ra.Type] || ra.Type || 'material';
    const isEquip = raType === 'weapon' || raType === 'armor';
    const zhAll = info.get(ra.Id);
    const twName = zhAll && zhAll.name && zhAll.name.replace(/\\/g, '').trim();

    /* 類型：只在雜物↔消耗品之間修；消耗品身上有效果欄位的不改 */
    if (it.type === 'material' && raType === 'consumable') put(it.id, 'type', 'consumable');
    if (it.type === 'consumable' && raType === 'material' && !Object.keys(it).some(k => !BASE_KEYS.has(k))) put(it.id, 'type', 'material');
    /* 名稱：非裝備直接用台服名稱；裝備在下面加孔數後綴 */
    if (twName && !(it.type === 'weapon' || it.type === 'armor') && twName !== it.name) put(it.id, 'name', twName);
    if (raType !== it.type && !(raType === 'card' && it.type === 'material')) R.typeDiff.push({ ...row, game: it.type, ra: raType });

    const tier = raTier(ra.Classes);
    if (isEquip && (tier === 'third' || tier === 'fourth')) { R.outOfScope.push({ ...row, tier }); continue; }
    if (!isEquip || (it.type !== 'weapon' && it.type !== 'armor')) continue;

    if (raType === 'armor' && it.type === 'armor') {
      const want = raArmorType(ra.Locations);
      if (want !== gameArmorType(it.armorType)) R.armorTypeDiff.push({ ...row, game: it.armorType, ra: want });
    }
    if (raType === 'weapon' && it.type === 'weapon') {
      const want = RA_SUBTYPE_TO_GAME[ra.SubType];
      if (want && want !== it.weaponType) R.weaponTypeDiff.push({ ...row, game: it.weaponType, ra: want });
    }

    /* 職業：逐一比對範圍內每個職業「遊戲規則准不准」與「rAthena 准不准」 */
    const raJobs = ra.Jobs || {};
    const raAll = !Object.keys(raJobs).length || raJobs.All;
    const loose = [], strict = [];
    for (const job of scopeJobs) {
      // 遊戲現行規則：reqJob 比整條職業鏈，武器另有攻速表限制（engine.js equipBlockReason）
      const gameOk = (!(it.reqJob && it.reqJob.length) || chainOf(job).some(j => it.reqJob.includes(j)))
        && (it.type !== 'weapon' || g.jobCanUseWeapon(job, it.id));
      const genderOk = !ra.Gender || ra.Gender === 'Both' || !JOB_GENDER[job] || JOB_GENDER[job] === ra.Gender;
      const raOk = (raAll || !!raJobs[SCOPE_JOB_TO_RA[job]]) && genderOk;
      if (gameOk && !raOk) loose.push(job);
      if (!gameOk && raOk) strict.push(job);
    }
    // rAthena 不給範圍內任何職業（忍者、槍手、喵族等專用）→ 算 D4 範圍外
    if (loose.length && loose.length === scopeJobs.filter(job => {
      const gameOk = (!(it.reqJob && it.reqJob.length) || chainOf(job).some(j => it.reqJob.includes(j)))
        && (it.type !== 'weapon' || g.jobCanUseWeapon(job, it.id));
      return gameOk;
    }).length && !scopeJobs.some(job => (raAll || !!raJobs[SCOPE_JOB_TO_RA[job]]))) {
      R.outOfScope.push({ ...row, tier: 'jobs:' + Object.keys(raJobs).join(',') });
      continue;
    }
    const allowed = scopeJobs.filter(job => {
      const genderOk = !ra.Gender || ra.Gender === 'Both' || !JOB_GENDER[job] || JOB_GENDER[job] === ra.Gender;
      return (raAll || !!raJobs[SCOPE_JOB_TO_RA[job]]) && genderOk;
    });
    put(it.id, 'reqJobs', allowed.length === scopeJobs.length ? null : allowed);
    put(it.id, 'reqUpper', tier === 'upper' ? true : null);
    put(it.id, 'reqGender', ra.Gender === 'Male' || ra.Gender === 'Female' ? ra.Gender : null);
    put(it.id, 'slots', ra.Slots || 0);
    put(it.id, 'reqLevel', ra.EquipLevelMin > 1 ? ra.EquipLevelMin : null);
    if (twName) {
      const nm = twName + ((ra.Slots || 0) > 0 ? ' [' + ra.Slots + ']' : '');
      if (nm !== it.name) put(it.id, 'name', nm);
    }
    if (raType === 'armor' && it.type === 'armor') {
      const want = raArmorType(ra.Locations);
      if (['headgear', 'footgear', 'garment', 'shield', 'accessory'].includes(want) && want !== it.armorType) put(it.id, 'armorType', want);
      if (want === 'body' && gameArmorType(it.armorType) !== 'body') put(it.id, 'armorType', 'leather');
    }
    if (raType === 'weapon' && it.type === 'weapon' && RA_SUBTYPE_TO_CAT[ra.SubType]) {
      const [cat, two] = RA_SUBTYPE_TO_CAT[ra.SubType];
      if (cat !== it.weaponCat) put(it.id, 'weaponCat', cat);
      put(it.id, 'twoHanded', two);
    }

    if (loose.length) R.jobTooLoose.push({ ...row, jobs: loose, reqJob: it.reqJob || [], viaNovice: (it.reqJob || []).includes('novice') });
    if (strict.length) R.jobTooStrict.push({ ...row, jobs: strict, reqJob: it.reqJob || [] });
    if (tier === 'upper') R.tierUpperOnly.push(row);

    if ((ra.Slots || 0) !== (it.slots || 0)) R.slotsDiff.push({ ...row, game: it.slots || 0, ra: ra.Slots || 0 });
    if (Math.max(1, ra.EquipLevelMin || 0) !== Math.max(1, it.reqLevel || 0)) R.reqLevelDiff.push({ ...row, game: it.reqLevel || 0, ra: ra.EquipLevelMin || 0 });
    const zh = info.get(ra.Id);
    const base = String(it.name).replace(/\s*\[\d\]$/, '');
    if (zh && zh.name && zh.name.replace(/\\/g, '') !== base) R.nameDiff.push({ ...row, game: base, tw: zh.name });
  }

  const outDir = path.join(ROOT, 'scripts', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'item_identity_report.json'), JSON.stringify(R, null, 1));

  if (process.argv.includes('--write')) writeIdentity(patch, scopeJobs);

  const n = k => (Array.isArray(R[k]) ? R[k].length : R[k]);
  console.log('ITEMS', Object.keys(g.ITEMS).length, '｜對到 rAthena：AegisName', R.matchBy.aegis, '／imgId', R.matchBy.imgId, '｜對不到', n('unmatched'));
  console.log('類型不同', n('typeDiff'), '｜三轉以上專用（D4 範圍外）', n('outOfScope'));
  console.log('防具部位不同', n('armorTypeDiff'), '｜武器類別不同', n('weaponTypeDiff'));
  console.log('職業：遊戲放太寬', n('jobTooLoose'), '（其中 reqJob 含 novice 造成', R.jobTooLoose.filter(x => x.viaNovice).length, '）', '／遊戲擋太嚴', n('jobTooStrict'), '｜限轉生後', n('tierUpperOnly'));
  console.log('孔數不同', n('slotsDiff'), '｜等級限制不同', n('reqLevelDiff'), '｜名稱與台服不同', n('nameDiff'));
}

function writeIdentity(patch, scopeJobs) {
  const counts = {};
  for (const p of Object.values(patch)) for (const k of Object.keys(p)) counts[k] = (counts[k] || 0) + 1;
  const lines = Object.keys(patch).sort().map(id => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(patch[id]) + ',');
  const src = `/* 此檔由 scripts/gen_item_identity.js --write 產生，不要手改。
   來源：rAthena item_db（職業、階級、性別、孔數、等級、部位、武器類別）、台服 itemInfo（名稱）。
   在 data.js 之後載入，覆寫 ITEMS 的身分欄位；值為 null 代表刪除該欄位。
   reqJobs：可穿職業（精確比對，見 engine.js itemJobBlock）；三轉以上沿用最近的範圍內祖先。 */
const ITEM_JOB_SCOPE = ${JSON.stringify(scopeJobs)};
const ITEM_IDENTITY = {
${lines.join('\n')}
};
(function applyItemIdentity() {
  if (typeof ITEMS === 'undefined') return;
  for (const id in ITEM_IDENTITY) {
    const it = ITEMS[id];
    if (!it) continue;
    const p = ITEM_IDENTITY[id];
    for (const k in p) { if (p[k] === null) delete it[k]; else it[k] = p[k]; }
  }
})();
`;
  fs.writeFileSync(path.join(ROOT, 'js', 'item_identity.js'), src);
  console.log('寫入 js/item_identity.js：', Object.keys(patch).length, '筆道具', JSON.stringify(counts));
}

main();
