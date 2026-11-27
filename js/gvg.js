/* 攻城戰・單機版（T55，使用者 2026-11-21：先做單機，不上雲端）。規格見 docs/GUILD_WAR_PLAN.md「單機攻城」。
   三座城各有一個 NPC 公會城主；守城隊伍＝用真的角色資料產生的三人組快照（js/actor_battle.js），走玩家戰鬥引擎。
     攻城：主城「攻城戰管理員」選城 → 打守城三人組 → 華麗金屬出現 → 打破就佔領（存自己隊伍的快照）
     反攻：每座城每 4 小時一輪（離線照算），別的 NPC 公會來打，用戰力算勝率，輸了易主；NPC 之間也會互搶
     結算：每天 22:00（台灣時間），當下城是誰的，誰拿獎勵（守住不另外給，使用者 2026-11-21）
     公告：易主時 broadcast（js/announce.js）「XX城被 XX 公會佔領了！」
   傷害：雙方角色互打套 GVG_DMG_RATE（0.3）；倒下出局、沒有復活，我方三人全倒才算輸。
   城的資料存在 state.gvgLocal（角色存檔）。雲端版在 commit 012d22df2 之前的這支檔案。
   這個檔案在 actor_battle.js 之後載入。 */
const GVG_MAP = 'gvg_castle_1';
const GVG_TOWN = 'hub';   // 冒險者主城（HUB_TOWN，towns.js 比這支晚載入）
const GVG_DMG_RATE = 0.3;   // 使用者 2026-11-13：0.6 時三人隊 5～6 秒分勝負，改 0.3
const GVG_DEFENSE_LIMIT_MS = 5 * 60 * 1000;
const GVG_RAID_MS = 4 * 3600 * 1000;      // 每座城多久被打一次
const GVG_RAID_CATCHUP = 12;              // 離線最多補幾輪
const GVG_GRACE_MS = 2 * 3600 * 1000;     // 剛佔領的保護時間（下一輪反攻至少隔這麼久）
const GVG_TICK_MS = 5000;
const GVG_SETTLE_HOUR = 22;               // 每天結算時刻（台灣時間）
const GVG_CATCHUP_MS = 2 * 24 * 3600 * 1000;   // 離線補算只算最近兩天
const GVG_EMPERIUM_SRC = 'empelium';                      // 華麗金屬（怪物編號 1288）
const GVG_CASTLES = [
  { id: 'castle_1', name: '克利姆希爾德城', lv: 60, refine: 4, trans: false, points: 10, gold: 20000 },
  { id: 'castle_2', name: '斯瓦希爾德城', lv: 85, refine: 7, trans: false, points: 15, gold: 50000 },
  { id: 'castle_3', name: '菲德格里德城', lv: 99, refine: 9, trans: true, points: 20, gold: 100000 },
];
const GVG_NPC_GUILDS = ['烈焰之翼', '星辰騎士團', '月影', '白銀之盾', '風暴旅團', '暗夜同盟'];
// 守城三人組：近戰／遠程／支援各一
const GVG_NPC_ROLES = {
  melee: { second: ['knight', 'crusader', 'assassin', 'monk', 'blacksmith', 'rogue'], trans: ['lordknight', 'paladin', 'assassincross', 'champion', 'whitesmith'] },
  ranged: { second: ['wizard', 'sage', 'hunter'], trans: ['highwizard', 'professor', 'sniper'] },
  support: { second: ['priest'], trans: ['highpriest'] },
};
// 素質分配比重（依職業）
const GVG_STAT_WEIGHTS = {
  melee: { str: 4, agi: 3, vit: 2, dex: 2 },
  assassin: { agi: 4, str: 3, dex: 2, vit: 1 },
  magic: { int: 5, dex: 3, vit: 2 },
  bow: { dex: 5, agi: 3, vit: 1, luk: 1 },
  priest: { int: 4, vit: 3, dex: 3 },
};
function gvgStatKind(job) {
  if (['wizard', 'sage', 'highwizard', 'professor'].includes(job)) return 'magic';
  if (['hunter', 'sniper'].includes(job)) return 'bow';
  if (['priest', 'highpriest'].includes(job)) return 'priest';
  if (['assassin', 'assassincross', 'rogue'].includes(job)) return 'assassin';
  return 'melee';
}

if (typeof MAPS !== 'undefined' && !MAPS.some(m => m.id === GVG_MAP)) {
  MAPS.push({ id: GVG_MAP, imgId: 0, name: GVG_CASTLES[0].name, monsters: [], bg: 'map-city', lv: '', arena: true });
}
function gvgCastleDef(id) { return GVG_CASTLES.find(c => c.id === id) || null; }
function gvgHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function gvgGuildLabel(name) { return /公會$/.test(name) ? name : name + ' 公會'; }

/* ---------------- NPC 守城隊伍 ----------------
   用 createCharacter 造一個真的角色（換身、靜音），設好職業鏈、等級、素質、技能、裝備，再取快照。
   同一個種子造出同一支隊伍；結果快取在記憶體（存檔只記城主是哪個公會＋第幾代）。 */
const GVG_BUILD_MUTE = ['logMsg', 'saveGame', 'saveGameThrottled', 'spawnMonster', 'updatePlayerSprite', 'showToast', 'renderAll', 'playEventSfx'];
function gvgJobChain(job) {
  const out = [];
  for (let j = job; j; j = (JOB_TREE[j] || {}).parent) out.unshift(j);
  return out;
}
function gvgAllocStats(level, kind, startPts) {
  const st = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
  let pts = startPts;
  for (let l = 2; l <= level; l++) pts += statPointsAtLevel(l);
  const w = GVG_STAT_WEIGHTS[kind];
  for (let guard = 0; guard < 2000; guard++) {
    // 比重下最落後的那項先加；加不起就停
    const k = Object.keys(w).filter(x => st[x] < 99).sort((a, b) => st[a] / w[a] - st[b] / w[b])[0];
    if (!k) break;
    const c = statPointCost(st[k]);
    if (c > pts) break;
    pts -= c; st[k]++;
  }
  return st;
}
function gvgPickGear(level, kind) {
  const info = typeof vfoeJobInfo === 'function' ? vfoeJobInfo(state.jobId) : null;
  // 只挑主城商店買得到的（不然會挑到 MVP 裝備）；強弱靠等級、精煉、職業拉開
  const shop = new Set([].concat((NPC_SHOPS.hub_weapon || NPC_SHOPS.weapon || {}).items || [], (NPC_SHOPS.hub_armor || NPC_SHOPS.armor || {}).items || []));
  const ok = id => { const d = ITEMS[id]; return d && shop.has(id) && !(d.reqLevel > level) && !equipBlockReason(id); };
  const wScore = d => kind === 'magic' || kind === 'priest' ? (d.matk || 0) * 2 + (d.int || 0) * 3 + (d.atk || 0) * 0.2 : (d.atk || 0) + (d.weaponLv || 0) * 5;
  const weapons = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'weapon' && ok(id));
  const cat = info && info.weapon;
  const pref = weapons.filter(id => typeof aspdCategoryOf === 'function' && aspdCategoryOf(id) === cat);
  const pickBest = (list, score) => list.slice().sort((a, b) => score(ITEMS[b]) - score(ITEMS[a]))[0] || null;
  const weapon = pickBest(pref.length ? pref : weapons, wScore);
  const aScore = d => (d.def || 0) * 2 + (d.mdef || 0) * 2;
  const gear = { weapon };
  ['armor', 'garment', 'footgear', 'headgear', 'accessory'].forEach(t => {
    const at = t === 'armor' ? 'leather' : t;   // 鎧甲在道具表的 armorType 是 leather（以前寫 armor，NPC 一直沒穿鎧甲）
    gear[t] = pickBest(Object.keys(ITEMS).filter(id => ITEMS[id].type === 'armor' && ITEMS[id].armorType === at && ok(id)), aScore);
  });
  if (!(weapon && isTwoHanded(weapon))) gear.shield = pickBest(Object.keys(ITEMS).filter(id => ITEMS[id].type === 'armor' && ITEMS[id].armorType === 'shield' && ok(id)), aScore);
  return gear;
}
/* 攻城 NPC 的對人配裝（使用者 2026-11-22 指定「不切裝」對人套裝，網路攻略）。
   每格 [道具, [卡片…]]；穿不上（等級、職業、遊戲沒這件）就留原本的商店裝。
   二轉 NPC 用對應進階二轉的那套（等級不夠的格子自然退回商店裝）。
   攻略裡遊戲沒有的：紅蓮劍、貝克斧、慈悲魔杖、裂空拳套、魔王的戒指 → 退回商店武器、虎爪拳套、戰鬥短劍、歐羅萊昂的手套。 */
const GVG_PVP_BASE = {
  head_top: ['feather_beret_', ['nightmare_card']], head_mid: ['scuba_mask_k', ['marduk_card']], head_bottom: ['pirate_dagger'],
  armor: ['valkyrie_armor', ['marc_card']], shield: ['item_2115', ['thara_frog_card']], garment: ['piece_of_angent_skin', ['daydric_card']],
  footgear: ['variant_shoes'], accessory1: ['orleans_glove', ['phen_card']], accessory2: ['orleans_glove', ['yoyo_card']],
};
const GVG_PVP_CASTER = { armor: ['orleans_gown', ['marc_card']], accessory1: ['orleans_glove', ['zerom_card']], accessory2: ['orleans_glove', ['zerom_card']] };
const GVG_PVP_JOB = {
  lordknight: { weapon: ['hunting_spear', ['hydra_card']], accessory2: ['orleans_glove', ['mantis_card']] },
  paladin: { weapon: ['combat_knife'], armor: ['valkyrie_armor', ['pecopeco_card']] },
  highwizard: Object.assign({ weapon: ['mighty_staff'] }, GVG_PVP_CASTER),
  professor: Object.assign({ weapon: ['combat_knife'] }, GVG_PVP_CASTER),
  sniper: { weapon: ['bow_of_rudra'], head_top: ['corsair_'], garment: ['piece_of_angent_skin', ['baphomet_card']], shield: null },
  clown: Object.assign({ weapon: ['electronic_guitar'], shield: null }, GVG_PVP_CASTER),
  gypsy: Object.assign({ weapon: ['queens_whip'], shield: null }, GVG_PVP_CASTER),
  // 紅蓮劍遊戲裡沒有：右手改笨拙短劍 [3]，左手笨拙短劍 [4]（雙持放 shield 格）
  assassincross: { weapon: ['main_gauche', ['hydra_card', 'hydra_card', 'hydra_card']], shield: ['main_gauche_', ['hydra_card', 'hydra_card', 'skel_worker_card', 'skel_worker_card']], accessory2: ['orleans_glove', ['mantis_card']] },
  stalker: { weapon: ['combat_knife'], accessory2: ['orleans_glove', ['zerom_card']] },
  highpriest: Object.assign({ weapon: ['combat_knife'] }, GVG_PVP_CASTER),
  champion: { weapon: ['waghnakh_', ['hydra_card', 'hydra_card', 'skel_worker_card']], accessory2: ['orleans_glove', ['mantis_card']] },
  whitesmith: { accessory2: ['orleans_glove', ['mantis_card']] },
  creator: { accessory2: ['orleans_glove', ['zerom_card']] },
};
const GVG_PVP_OF_SECOND = { knight: 'lordknight', crusader: 'paladin', wizard: 'highwizard', sage: 'professor', hunter: 'sniper', bard: 'clown', dancer: 'gypsy',
  assassin: 'assassincross', rogue: 'stalker', priest: 'highpriest', monk: 'champion', blacksmith: 'whitesmith', alchemist: 'creator' };
function gvgPvpGearFor(job) {
  const own = GVG_PVP_JOB[job] || GVG_PVP_JOB[GVG_PVP_OF_SECOND[job]] || {};
  return Object.assign({}, GVG_PVP_BASE, own);
}
/* 照對人配裝換上（state 已是 NPC 本人）；refine 照城的精煉，回傳換上的格數 */
function gvgApplyPvpGear(st, job, refine) {
  const plan = gvgPvpGearFor(job);
  const REFINE_SLOTS = ['weapon', 'armor', 'shield', 'garment', 'footgear', 'head_top'];
  let n = 0;
  const put = (slot, id, cards) => {
    if (!ITEMS[id] || equipBlockReason(id)) return false;
    // 頭飾的位置寫在說明裡、部分被截斷，指定配裝直接照格子放；副手武器（雙持）放 shield 格
    const fam = /^head_/.test(slot) ? (ITEMS[id].armorType === 'headgear' ? slot : null) : resolveEquipSlotFor(id);
    if (!fam || (fam.replace(/\d$/, '') !== slot.replace(/\d$/, ''))) return false;
    const max = ITEMS[id].slots || 0;
    const cs = (cards || []).filter(c => CARDS[c] && cardFitsSlot(CARDS[c], ITEMS[id].type === 'weapon' ? 'weapon' : slot)).slice(0, max);
    const iid = 'pvp_' + slot;
    st.instances[iid] = { item: id, refine: REFINE_SLOTS.includes(slot) ? refine : 0, cards: cs };
    st.equip[slot] = iid;
    n++;
    return true;
  };
  if (plan.weapon) put('weapon', plan.weapon[0], plan.weapon[1]);
  const w = st.equip.weapon && (st.instances[st.equip.weapon] || {}).item;
  const twoHand = w && typeof isTwoHanded === 'function' && isTwoHanded(w);
  Object.entries(plan).forEach(([slot, v]) => {
    if (slot === 'weapon') return;
    if (slot === 'shield' && (v === null || twoHand)) { if (v === null) st.equip.shield = null; return; }
    if (v) put(slot, v[0], v[1]);
  });
  return n;
}
function gvgBuildNpcActor(job, level, refine, r) {
  const saved = state, sa = typeof _allyActing !== 'undefined' ? _allyActing : null;
  const muted = {};
  GVG_BUILD_MUTE.forEach(k => { if (typeof globalThis[k] === 'function') { muted[k] = globalThis[k]; globalThis[k] = () => {}; } });
  try {
    const gender = ['bard'].includes(job) ? 'male' : ['dancer'].includes(job) ? 'female' : (r() < 0.5 ? 'male' : 'female');
    const names = (typeof VFOE_NAMES !== 'undefined' && VFOE_NAMES[gender]) || ['冒險者'];
    createCharacter(names[Math.floor(r() * names.length)], {}, gender, { hairStyle: 1 + Math.floor(r() * 20), hairColor: Math.floor(r() * 9) });
    const st = state;
    const chain = gvgJobChain(job);
    st.jobLevelHistory = {};
    chain.slice(0, -1).forEach(j => { st.jobLevelHistory[j] = (JOB_TREE[j] || {}).jobLevelMax || 50; });
    st.jobId = job;
    if ((JOB_TREE[job] || {}).tier >= 2.5) st.rebirthCount = 1;   // 進階二轉＝轉生過（限轉生的裝備才穿得上）
    st.baseLevel = level;
    st.jobLevel = (JOB_TREE[job] || {}).jobLevelMax || 50;
    const kind = gvgStatKind(job);
    st.stats = gvgAllocStats(level, kind, 48);
    st.statPoints = 0;
    // 技能：整條職業鏈全點滿（未實裝的跳過）
    st.learnedSkills = {};
    chain.forEach(j => ((JOB_TREE[j] || {}).skills || []).forEach(s => {
      const sk = SKILLS[s.id];
      if (sk && sk.type !== 'unimplemented' && !sk.unimplemented) st.learnedSkills[s.id] = sk.maxLv || 1;
    }));
    if (typeof grantAutoSkills === 'function') grantAutoSkills(false);
    st.inventory = [];
    recomputeDerived(true);
    // 裝備＋精煉（做成個體才帶得了精煉）
    const gear = gvgPickGear(level, kind);
    Object.keys(st.equip).forEach(k => { st.equip[k] = null; });
    st.instances = {};
    Object.entries(gear).forEach(([t, id], i) => {
      if (!id) return;
      const slot = resolveEquipSlotFor(id);
      if (!slot || st.equip[slot]) return;
      const iid = 'npc' + i;
      st.instances[iid] = { item: id, refine: ITEMS[id].type === 'weapon' || ['armor', 'shield', 'garment', 'footgear', 'headgear'].includes(t) ? refine : 0, cards: [] };
      st.equip[slot] = iid;
    });
    gvgApplyPvpGear(st, job, refine);   // 對人配裝蓋在商店裝上（穿不上的格子留商店裝）
    // 自動戰鬥：攻擊技挑後面職業、等級要求高的 4 招；輔助全勾
    const atk = [], sup = {};
    chain.slice().reverse().forEach(j => ((JOB_TREE[j] || {}).skills || []).forEach(s => {
      const sk = SKILLS[s.id];
      if (!sk || !st.learnedSkills[s.id]) return;
      if (isAttackSkill(sk) && atk.length < AUTO_SKILL_SLOTS && !atk.includes(s.id)) atk.push(s.id);
      else if (isAutoSupportSkill(sk) && sk.type !== 'resurrection') sup[s.id] = true;
    }));
    st.autoSkill = true; st.autoAttack = true;
    st.autoSkillConfig = { slots: Array.from({ length: AUTO_SKILL_SLOTS }, (_, i) => Object.assign(emptyAutoSkillSlot(), { skillId: atk[i] || null, spThreshold: 0 })) };
    st.autoSupportSkills = sup;
    recomputeDerived(true);
    st.hp = st.maxHp; st.sp = st.maxSp;
    return snapshotOfActor(st);
  } finally {
    Object.entries(muted).forEach(([k, f]) => { globalThis[k] = f; });
    state = saved;
    if (typeof _allyActing !== 'undefined') _allyActing = sa;
  }
}
const _gvgSnapCache = {};
function gvgNpcSnap(castleId, guild, era) {
  const key = castleId + '|' + guild + '|' + era;
  if (_gvgSnapCache[key]) return _gvgSnapCache[key];
  const c = gvgCastleDef(castleId);
  const r = fakeRandSafe(gvgHash(key));
  const pool = c.trans ? 'trans' : 'second';
  const members = ['melee', 'ranged', 'support'].map(role => {
    const list = GVG_NPC_ROLES[role][pool];
    return gvgBuildNpcActor(list[Math.floor(r() * list.length)], c.lv, c.refine, r);
  });
  const mats = [['red_potion', 200], ['white_potion', 100], ['blue_potion', 100], ['blue_gemstone', 100], ['arrow', 2000], ['silver_arrow', 2000]]
    .filter(([id]) => ITEMS[id]).map(([item, qty]) => ({ item, qty }));
  return (_gvgSnapCache[key] = { v: PARTY_SNAPSHOT_VERSION, takenAt: 0, leader: members[0].name, guild, members, mats });
}
function fakeRandSafe(seed) {
  if (typeof fakeRand === 'function') return fakeRand(seed);
  return typeof vfoeRand === 'function' ? vfoeRand(seed) : Math.random;
}

/* ---------------- 戰力 ----------------
   每人 √(有效血量 × 每秒輸出) 加總（還原成角色、照算好的數值）。只拿來比大小、算反攻勝率 */
const _gvgPowerCache = new WeakMap();
function gvgSnapPower(snap) {
  if (!snap || !Array.isArray(snap.members)) return 0;
  if (_gvgPowerCache.has(snap)) return _gvgPowerCache.get(snap);
  let total = 0;
  snap.members.forEach((m, i) => {
    const a = buildAllySnapshot(m, 'pw' + i);
    if (!a) return;
    const ehp = (a.maxHp || 1) * (1 + (a.def || 0) / 100 + (a.mdef || 0) / 200);
    const dps = Math.max(a.atk || 0, (a.matk || 0) * 1.2) / Math.max(0.2, (a.attackInterval || 1000) / 1000);
    total += Math.sqrt(Math.max(1, ehp) * Math.max(1, dps));
  });
  total = Math.round(total);
  _gvgPowerCache.set(snap, total);
  return total;
}
function gvgCastlePower(castleId) {
  const c = gvgLocal().castles[castleId];
  if (!c) return 0;
  return c.owner.kind === 'player' ? gvgSnapPower(c.owner.snap) : gvgSnapPower(gvgNpcSnap(castleId, c.owner.guild, c.era));
}
// 防守方守住的機率：戰力比 r，r²／(1＋r²)（對等 50%、強一倍 80%）
function gvgDefendChance(defPower, atkPower) {
  const r = defPower / Math.max(1, atkPower);
  return (r * r) / (1 + r * r);
}

/* ---------------- 城的資料 ---------------- */
function gvgLocal() {
  if (!state.gvgLocal) state.gvgLocal = { castles: {}, guildName: '', log: [] };
  const L = state.gvgLocal;
  const now = gameNow();
  GVG_CASTLES.forEach((d, i) => {
    if (L.castles[d.id]) return;
    L.castles[d.id] = { owner: { kind: 'npc', guild: GVG_NPC_GUILDS[(i * 2 + Math.floor(rng() * 2)) % GVG_NPC_GUILDS.length] }, era: 0, since: now, nextRaidAt: now + GVG_RAID_MS * (0.5 + rng() * 0.5) };
  });
  if (!Array.isArray(L.log)) L.log = [];
  return L;
}
function gvgGuildName() {
  const g = typeof guildData === 'function' && guildData();   // 有公會就用公會名
  return (g && g.name) || (state.gvgLocal && state.gvgLocal.guildName) || state.name || '冒險者';
}
function setGvgGuildName(name) {
  const n = String(name || '').trim().slice(0, 12);
  if (!n) return '公會名不能空白。';
  gvgLocal().guildName = n;
  // 自己的城：城主名一起換
  Object.values(gvgLocal().castles).forEach(c => { if (c.owner.kind === 'player') c.owner.guild = n; });
  saveGame();
  return null;
}
function gvgOwnerLabel(c) { return c.owner.kind === 'player' ? c.owner.guild : c.owner.guild; }
function gvgIsMine(castleId) { const c = gvgLocal().castles[castleId]; return !!c && c.owner.kind === 'player'; }
function gvgMyCastles() { return GVG_CASTLES.filter(d => gvgIsMine(d.id)); }
function gvgLogPush(text) {
  const L = gvgLocal();
  L.log.unshift({ at: gameNow(), text });
  if (L.log.length > 30) L.log.length = 30;
}
// 易主：存檔、戰報、公告（live＝現在發生的才跑馬燈；離線補算的只寫戰報）
function gvgChangeOwner(castleId, owner, live) {
  const c = gvgLocal().castles[castleId];
  const d = gvgCastleDef(castleId);
  c.owner = owner;
  c.era = (c.era || 0) + 1;
  c.since = gameNow();
  const text = `${d.name}被 ${gvgGuildLabel(owner.guild)}佔領了！`;
  gvgLogPush(text);
  if (live && typeof broadcast === 'function') broadcast(text, 'gvg');
  else logMsg(`🏰 ${text}`);
}

/* ---------------- 反攻（每 4 小時一輪，離線照算） ---------------- */
function gvgResolveRaid(castleId, live) {
  const L = gvgLocal();
  const c = L.castles[castleId];
  const d = gvgCastleDef(castleId);
  const others = GVG_NPC_GUILDS.filter(g => g !== c.owner.guild);
  const attacker = others[Math.floor(rng() * others.length)];
  const base = gvgSnapPower(gvgNpcSnap(castleId, attacker, 0));
  const atkPower = base * (0.8 + rng() * 0.4);
  const mine = c.owner.kind === 'player';
  if (!mine && rng() < 0.5) return;   // NPC 之間只有一半的輪次真的開打
  // 自己的城：公會的正式公會認證／守護者研究／強化守護者提高守城戰力（js/guild.js）
  const defPower = mine ? gvgSnapPower(c.owner.snap) * (typeof guildGuardMult === 'function' ? guildGuardMult() : 1) : base * (0.8 + rng() * 0.4);
  if (rng() < gvgDefendChance(defPower, atkPower)) {
    if (mine) {
      gvgLogPush(`🛡️ ${d.name}擋下了 ${gvgGuildLabel(attacker)}的進攻`);
      if (live) logMsg(`🛡️ ${d.name}擋下了 ${gvgGuildLabel(attacker)}的進攻！`);
    }
    return;
  }
  gvgChangeOwner(castleId, { kind: 'npc', guild: attacker }, live);
}
/* 反攻與結算照時間先後一起補算：離線期間城換過手，結算時是誰的就算誰的 */
function gvgRaidTick(now) {
  const L = gvgLocal();
  const from = now - GVG_CATCHUP_MS;   // 太久以前的不補
  if (!L.nextSettleAt) L.nextSettleAt = gvgNextSettleAfter(now);
  if (L.nextSettleAt < from) L.nextSettleAt = gvgNextSettleAfter(from);
  const busy = state.gvg && state.gvg.castleId;   // 正在攻這座城：先不算它的反攻
  const count = {};
  GVG_CASTLES.forEach(d => {
    const c = L.castles[d.id];
    if (c.nextRaidAt < from) c.nextRaidAt = from + rng() * GVG_RAID_MS;
    count[d.id] = 0;
  });
  let changed = false;
  for (let guard = 0; guard < 200; guard++) {
    let next = null;
    GVG_CASTLES.forEach(d => {
      const c = L.castles[d.id];
      if (d.id === busy || count[d.id] >= GVG_RAID_CATCHUP || c.nextRaidAt > now) return;
      if (!next || c.nextRaidAt < L.castles[next].nextRaidAt) next = d.id;
    });
    const raidAt = next ? L.castles[next].nextRaidAt : Infinity;
    if (L.nextSettleAt <= now && L.nextSettleAt <= raidAt) {
      gvgSettle(now - L.nextSettleAt < 60000);
      L.nextSettleAt = gvgNextSettleAfter(L.nextSettleAt + 1000);
      changed = true;
      continue;
    }
    if (!next) break;
    const c = L.castles[next];
    gvgResolveRaid(next, now - c.nextRaidAt < 60000);
    c.nextRaidAt += GVG_RAID_MS * (0.75 + rng() * 0.5);
    count[next]++; changed = true;
  }
  GVG_CASTLES.forEach(d => {
    const c = L.castles[d.id];
    if (d.id !== busy && c.nextRaidAt <= now) c.nextRaidAt = now + GVG_RAID_MS * (0.5 + rng() * 0.5);
  });
  if (changed) saveGame();
}

/* ---------------- 每日結算 ---------------- */
// t 之後（含）的下一個結算時刻
function gvgNextSettleAfter(t) {
  const tw = new Date(t + 8 * 3600000);
  let at = Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate(), GVG_SETTLE_HOUR) - 8 * 3600000;
  if (at < t) at += 24 * 3600000;
  return at;
}
function gvgSettle(live) {
  const L = gvgLocal();
  const parts = [];
  GVG_CASTLES.forEach(d => {
    const c = L.castles[d.id];
    parts.push(`${d.name}－${gvgGuildLabel(c.owner.guild)}`);
    if (c.owner.kind !== 'player') return;
    addCashPoints(d.points);
    state.gold = (state.gold || 0) + d.gold;
    gvgLogPush(`💰 結算：${d.name}是你的，獲得 ${d.points} 商城點數＋${d.gold.toLocaleString()} 鋅幣`);
    logMsg(`🏰 攻城結算：${d.name}城主獎勵 ${d.points} 商城點數＋${d.gold.toLocaleString()} 鋅幣。`);
    if (typeof openCastleChests === 'function') openCastleChests(d);   // 神器材料寶箱（js/godly_mats.js）
  });
  if (live && typeof broadcast === 'function') broadcast(`本日攻城結算：${parts.join('、')}`, 'gvg');
}

/* ---------------- 攻城 ---------------- */
function gvgBlockReason(castleId) {
  const d = gvgCastleDef(castleId);
  if (!d) return '沒有這座城。';
  if (gvgIsMine(castleId)) return '這座城已經是你的了。';
  if (state.gvg) return '已經在攻城中。';
  if (state.gmt) return '正在參加吉芬魔法大賽。';
  if (state.dojo) return '正在道館挑戰。';
  if (state.vDuel) return '已經在對戰中。';
  if (state.bossChallenge || state.bossHunt) return '正在挑戰或討伐首領。';
  if (!(state.hp > 0)) return '倒下時不能進城。';
  return null;
}
function gvgSpawn(srcId, d, a, extra) {
  const src = MONSTERS[srcId];
  if (!src) return null;
  const id = 'gvg_' + srcId;
  if (!MONSTERS[id]) MONSTERS[id] = Object.assign({}, src, { id, exp: 0, jobExp: 0, drops: [], isBoss: false, isMvp: false });
  if (typeof MOB_MOVE !== 'undefined' && MOB_MOVE[srcId]) MOB_MOVE[id] = MOB_MOVE[srcId];
  state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
  const def = MONSTERS[id];
  const mon = Object.assign({ defId: id, hp: def.hp, maxHp: def.hp, id: state.monsterIdCounter, spawnedAt: gameNow(), d, a }, extra || {});
  state.monsters.push(mon);
  state.monster = state.monsters[0];
  return mon;
}
function gvgSpawnEmperium() {
  const g = state.gvg;
  if (!g) return;
  const mon = gvgSpawn(GVG_EMPERIUM_SRC, 4, 0, { hp: 100, maxHp: 100 });
  if (!mon) { gvgCapture(); return; }
  if (typeof setMonDamageRule === 'function') setMonDamageRule(mon, { fixed: 1 });
  g.empId = mon.id;
  g.phase = 'emperium';
  logMsg('💎 守城隊伍倒下了，華麗金屬出現！把它打破！');
}
function gvgEnter(castleId) {
  const why = gvgBlockReason(castleId);
  if (why) { logMsg('⚠️ ' + why); return false; }
  const d = gvgCastleDef(castleId);
  const c = gvgLocal().castles[castleId];
  const snap = gvgNpcSnap(castleId, c.owner.guild, c.era);
  const m = MAPS.find(x => x.id === GVG_MAP);
  if (m) m.name = d.name;
  if (!changeMap(GVG_MAP, { party: true })) return false;
  state.monsters = []; state.monster = null; state.bossCasts = [];
  state.gvg = { castleId, phase: 'defenders', enteredAt: gameNow(), empId: null, era: c.era };
  logMsg(`🏰 ${d.name}：${gvgGuildLabel(c.owner.guild)}的隊伍守著城！`);
  if (!startActorBattle(snap, { label: '攻城戰', dmgRate: GVG_DMG_RATE, limitMs: GVG_DEFENSE_LIMIT_MS, team: true, noRevive: true, onEnd: gvgDefendersEnd })) {
    gvgExit('進城失敗。');
    return false;
  }
  saveGame();
  return true;
}
function gvgDefendersEnd(win, info) {
  if (!state.gvg) return;
  if (win) { gvgSpawnEmperium(); return; }
  gvgExit(`攻城失敗（${info && info.why ? info.why : '敗北'}）`);
}
function gvgExit(why) {
  const g = state.gvg;
  if (!g) return;
  state.gvg = null;
  if (state.vDuel) endVirtualDuel(false, '離開城堡');
  state.monsters = (state.monsters || []).filter(m => !String(m.defId).startsWith('gvg_'));
  state.monster = state.monsters[0] || null;
  if (!(state.hp > 0)) { state.hp = state.maxHp; state.sp = state.maxSp; }   // 倒下的人被送出城、在城裡療傷
  if (why) logMsg('🏰 ' + why);
  if (state.mapId === GVG_MAP) changeMap(GVG_TOWN, { party: true });
  saveGame();
  if (typeof renderMapTab === 'function') renderMapTab();
}
function gvgLeave() { gvgExit('離開了城堡。'); }
/* 打破華麗金屬：存下自己隊伍的快照，成為城主 */
function gvgCapture() {
  const g = state.gvg;
  if (!g || g.captured) return;
  g.captured = true;
  const c = gvgLocal().castles[g.castleId];
  const d = gvgCastleDef(g.castleId);
  gvgChangeOwner(g.castleId, { kind: 'player', guild: gvgGuildName(), name: state.name, snap: snapshotParty() }, true);
  c.nextRaidAt = Math.max(c.nextRaidAt, gameNow() + GVG_GRACE_MS);
  logMsg(`🎉 你成為 ${d.name} 的城主！你的隊伍會留下來守城；每天 ${GVG_SETTLE_HOUR}:00 結算時城還是你的，就拿 ${d.points} 商城點數＋${d.gold.toLocaleString()} 鋅幣。`);
  gvgExit(null);
}
/* 守城隊伍換成目前的隊伍（要在主城） */
function gvgUpdateDefense(castleId) {
  if (!gvgIsMine(castleId)) return '這座城不是你的。';
  if (state.mapId !== GVG_TOWN) return '要在主城才能更新守城隊伍。';
  const c = gvgLocal().castles[castleId];
  c.owner.snap = snapshotParty();
  c.owner.name = state.name;
  logMsg(`🛡️ ${gvgCastleDef(castleId).name}的守城隊伍換成了目前的隊伍。`);
  saveGame();
  return null;
}

/* 每拍（tickBossFight 呼叫） */
function tickGvg(now) {
  if (!state || typeof _allyActing !== 'undefined' && _allyActing) return;
  if (!state._gvgTickAt || now - state._gvgTickAt >= GVG_TICK_MS) {
    state._gvgTickAt = now;
    gvgRaidTick(now);
  }
  const g = state.gvg;
  if (!g) return;
  if (state.mapId !== GVG_MAP) { state.gvg = null; return; }
  if (g.phase === 'emperium' && !(state.monsters || []).some(m => m.id === g.empId && m.hp > 0)) gvgCapture();
}
/* 玩家倒下：留在城裡，隊友還站著就繼續；全倒才算輸。回傳 true＝已處理 */
function gvgOnPlayerDown() {
  state.hp = 0;
  if (allyAliveList().length) { logMsg('💀 你倒下了！隊友繼續作戰（攻城中沒有復活）。'); return true; }
  gvgExit('攻城失敗（全隊倒下）。');
  return true;
}
/* 玩家倒下後的每拍：隊友、怪物、敵方隊伍照跑 */
function gvgDownedTick() {
  const now = gameNow();
  if (!allyAliveList().length) return gvgExit('攻城失敗（全隊倒下）。');
  if (now - (state._lastSlowTick || 0) >= 1000) { state._lastSlowTick = now; tickAllyRegen(); alliesTick(); }
  const dt = Math.min(1000, now - (state._lastMoveTick || now));
  state._lastMoveTick = now;
  tickMonsterMovement(dt, now);
  tickAllyFormation(dt);
  tickBossFight(dt, now);
  if (!state.gvg) return;
  alliesCastTick(now);
  (state.monsters || []).forEach(mon => {
    const d = MONSTERS[mon.defId];
    if (!d || d.actorProxy || d.passive) return;
    if (!mon.lastAttackTime) mon.lastAttackTime = now;
    if (!monInRange(mon) || mon._bossCast) { mon.lastAttackTime = now; return; }
    if (now - mon.lastAttackTime >= (d.atkInterval || 1) * 1000) { mon.lastAttackTime = now; monsterAttackSingle(mon); }
  });
  tickActorBattle(now);
  if (typeof onTickUI === 'function') onTickUI();
}
// 讀檔：攻城中斷就放回主城；舊的雲端欄位不用了
function gvgOnLoad() {
  if (state.gvg) state.gvg = null;
  if (state.mapId === GVG_MAP) state.mapId = GVG_TOWN;
  delete state.gvgRewardDay;
  if (state.gvgLocal) Object.values(state.gvgLocal.castles || {}).forEach(c => { delete c.rewardDay; });
}
