/* 吉芬魔法大賽（T51 第 6 期，使用者 2026-11-12 規劃、2026-11-13 實作；建議值照用）
   只借官方的名稱與形式：吉芬「副本」區報名 → 競技場一輪一場、13 輪 → 照打到的輪數給硬幣 → 兌換員換裝備。
   對手是虛擬角色（js/virtual_foe.js），照官方 13 關名單（GMT_LINEUP）。
     入場 Base Lv30；每個角色每天 1 次；只能單人（比照官方，使用者 2026-11-13），隊友留在吉芬
     第 3、6、9、12 輪結束後治療師補滿 HP／SP（倒地的隊友扶起）；總時限 30 分鐘
     對手比照官方 13 輪名單（全部 1 對 1，見 GMT_LINEUP）；每輪限時 3 分鐘、準決賽與決賽 5 分鐘
     硬幣照官方每輪 1～20 枚（全破 110 枚）×組隊倍率；第一次打完送 100 商城點數
   這個檔案在 virtual_foe.js 之後載入。 */
const GMT_ENTRY_LV = 30;   // 使用者 2026-11-13：Lv30 就能報名（對手數值照玩家等級造）
const GMT_ROUNDS = 13;
const GMT_TOTAL_MS = 30 * 60 * 1000;
const GMT_HEAL_AFTER = [3, 6, 9, 12];
const GMT_NEXT_DELAY_MS = 3000;
const GMT_CLEAR_BONUS = 0;   // 官方沒有全破加碼（第 13 輪本身給 20 枚）
const GMT_FIRST_CLEAR_POINTS = 100;
const GMT_COIN = 'geffen_magic_coin';
const GMT_ARENA = 'gmt_arena';
const GMT_MELEE = ['knight', 'crusader', 'assassin', 'monk', 'priest', 'blacksmith'];
const GMT_RANGED = ['wizard', 'sage', 'hunter'];
const GMT_2ND = GMT_MELEE.concat(GMT_RANGED);
const GMT_TRANS = ['lordknight', 'paladin', 'highwizard', 'professor', 'sniper', 'assassincross', 'champion', 'highpriest', 'whitesmith'];
// 兌換（硬幣價格）
const GMT_SHOP = [
  { item: 'geffen_mage_robe', price: 100 },
  { item: 'geffen_magic_muffler', price: 80 },
  { item: 'geffen_refine_cube', price: 200 },
];

// 競技場：沒有野怪、不在世界地圖上的獨立地圖
if (typeof MAPS !== 'undefined' && !MAPS.some(m => m.id === GMT_ARENA)) {
  MAPS.push({ id: GMT_ARENA, imgId: 0, name: '吉芬魔法大賽競技場', monsters: [], bg: 'map-city', lv: '', arena: true });
}

function gmtToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function gmtDaySeed(day) {
  let h = 2166136261;
  for (const ch of (day || gmtToday())) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function gmtCoinsFor(r) { return GMT_COINS[r - 1] || 0; }
function gmtPartyMult() { return 1; }   // 只能單人，不再有組隊倍率
function gmtPartySize() { return 1 + allyList().filter(a => a && allyOnThisMap(a)).length; }

/* 第 r 輪的對手：比照官方吉芬魔法大賽（使用者 2026-11-13 提供的對照表）。
   名字、職業、技能、屬性（念 2：第 6、12、13 關）、第 3 關三選一（沒觸發城內支線＝盜賊）、第 12 關二選一照表；
   沒有外觀的職業用現有的（超級初心者→初心者、忍者→刺客；使用者 2026-11-13），生命體不做。
   表上只列輔助技能的對手補一招同職業的攻擊技（不然打不出傷害）。
   官方等級只顯示；數值以玩家等級的一般怪為底，乘「官方血量／攻擊相對第 1 關的比例」再乘 GMT_HP_K／GMT_ATK_K。
   like＝遊戲資料裡那位官方參賽者（屬性與屬性抗性照抄）。 */
const HEAL = (name, heal) => ({ shape: 'burst', name, r: 0.6, wind: 900, dmg: 0, heal });
const GMT_LINEUP = [
  { like: 'geffen_mage_1', name: '阿爾西', job: 'supernovice', lookJob: 'novice', weapon: 'dagger', range: 1, hp: 1, atk: 237, skills: [
    { shape: 'spot', name: '火箭術', r: 1.2, wind: 1000, dmg: 0.20, kind: 'magic' }, HEAL('治癒術', 0.08),
    { shape: 'spot', name: '丟石頭', r: 0.8, wind: 700, dmg: 0.12 }] },
  { like: 'geffen_mage_2', name: '戴奧・阿奈默斯', job: 'mage', lookJob: 'mage', weapon: 'rod1', range: 9, hp: 2, atk: 429, skills: [
    { shape: 'spot', name: '冰箭術', r: 1.2, wind: 1000, dmg: 0.25, kind: 'magic' },
    { shape: 'spot', name: '冰凍術', r: 1.0, wind: 900, dmg: 0.20, kind: 'magic' },
    { shape: 'spot', name: '雷爆術', r: 3, wind: 1800, dmg: 0.30, kind: 'magic' }] },
  [{ like: 'geffen_mage_3_1', name: '吉芬小偷', job: 'thief', lookJob: 'thief', weapon: 'dagger', range: 1, hp: 3, atk: 385, skills: [
     { use: 'pounce', name: '噴砂', wind: 800, dmg: 0.20 }, { use: 'sweep', name: '二刀連擊', half: 0.5, len: 3, wind: 900, dmg: 0.25 }] },
   { like: 'geffen_mage_3_2', name: '吉芬不良少年', job: 'champion', lookJob: 'champion', weapon: 'knuckle', range: 1, hp: 3, atk: 385, skills: [
     { use: 'pounce', name: '猛虎硬派山', dmg: 0.30 }, { shape: 'spot', name: '伏虎拳', r: 1.2, wind: 900, dmg: 0.35 }] },
   { like: 'geffen_mage_3_3', name: '吉芬流氓', job: 'assassincross', lookJob: 'assassincross', weapon: 'katar', range: 1, hp: 3, atk: 385, skills: [
     { use: 'charge', name: '音速投擲', dmg: 0.40 }, { shape: 'spot', name: '心靈震波', r: 1.4, wind: 1000, dmg: 0.35 }] }],
  { like: 'geffen_mage_4', name: '費蒙', job: 'monk', lookJob: 'monk', weapon: 'knuckle', range: 1, hp: 4, atk: 390, skills: [
    { shape: 'spot', name: '緩速術', r: 1.5, wind: 900, dmg: 0.10, kind: 'magic' },
    { shape: 'burst', name: '爆氣', r: 2.5, wind: 1300, dmg: 0.30 },
    { use: 'pounce', name: '連環全身掌', dmg: 0.30 }] },
  { like: 'geffen_mage_5', name: '奧爾德爾', job: 'wizard', lookJob: 'wizard', weapon: 'rod2', range: 9, hp: 6, atk: 630, skills: [
    { shape: 'spot', name: '冰箭術', r: 1.2, wind: 1000, dmg: 0.30, kind: 'magic' },
    { shape: 'burst', name: '霜凍之術', r: 3, wind: 1400, dmg: 0.30, kind: 'magic' },
    { shape: 'spot', name: '暴風雪', r: 3.5, wind: 2200, dmg: 0.45, kind: 'magic' }] },
  { like: 'geffen_mage_6', name: '貝爾特・哈則', job: 'paladin', lookJob: 'paladin', weapon: 'spear1', range: 2, hp: 10, atk: 301, skills: [
    { shape: 'burst', name: '聖十字審判', r: 3.5, wind: 1700, dmg: 0.40, kind: 'magic' },
    { use: 'charge', name: '盾擊衝鋒' }] },
  { like: 'geffen_mage_7', name: '黑惡魔', job: 'ninja', lookJob: 'assassin', weapon: 'dagger', range: 1, hp: 12, atk: 664, skills: [
    { shape: 'spot', name: '飛刀', r: 1.0, wind: 800, dmg: 0.25 },
    { use: 'charge', name: '一閃', wind: 900, dmg: 0.45 }] },
  { like: 'geffen_mage_8', name: '依佛德斯', job: 'lordknight', lookJob: 'lordknight', weapon: 'sword2', range: 1, hp: 14, atk: 483, skills: [
    { shape: 'beam', name: '螺旋刺擊', w: 1.4, len: 8, wind: 1300, dmg: 0.50 },
    { use: 'sweep', name: '雙手劍格擋反擊', wind: 1200, dmg: 0.35 }] },
  { like: 'geffen_mage_9', name: '列伽尼耶', job: 'archbishop', lookJob: 'archbishop', weapon: 'mace', range: 9, hp: 16, atk: 711, skills: [
    HEAL('高階治癒術', 0.12), { shape: 'spot', name: '審判', r: 2.5, wind: 1500, dmg: 0.35, kind: 'magic' }, HEAL('光壁', 0.06)] },
  { like: 'geffen_mage_10', name: '幽梅西梅', job: 'ranger', lookJob: 'ranger', weapon: 'bow', range: 9, hp: 20, atk: 750, skills: [
    { shape: 'spot', name: '二連矢', r: 1.0, wind: 900, dmg: 0.30 },
    { shape: 'ring', name: '陷阱', r0: 2, r1: 5, wind: 1600, dmg: 0.30 },
    { use: 'nova', name: '重金屬音樂', dmg: 0.15 }] },
  { like: 'geffen_mage_11', name: '喬', job: 'professor', lookJob: 'professor', weapon: 'book', range: 9, hp: 50, atk: 1050, skills: [
    { shape: 'spot', name: '屬性箭', r: 1.2, wind: 1000, dmg: 0.30, kind: 'magic' },
    { shape: 'spot', name: '地震術', r: 2, wind: 1300, dmg: 0.35, kind: 'magic' },
    { shape: 'spot', name: '易燃之網', r: 1.5, wind: 1100, dmg: 0.10 }] },
  [{ like: 'geffen_mage_12', name: '黛外', job: 'sorcerer', lookJob: 'sorcerer', weapon: 'book', range: 9, hp: 70, atk: 1500, skills: [
     { shape: 'spot', name: '精神波動', r: 3, wind: 1800, dmg: 0.40, kind: 'magic' },
     { shape: 'beam', name: '雷神之槍', w: 1.4, len: 10, wind: 1300, dmg: 0.45, kind: 'magic' },
     { use: 'nova', name: '鑽石星塵', dmg: 0.18 }] },
   { like: 'geffen_mage_12', name: '飛依・卡娜比昂', job: 'geneticist', lookJob: 'geneticist', weapon: 'axe1', range: 1, hp: 80, atk: 1500, skills: [
     { shape: 'spot', name: '強酸攻擊', r: 1.2, wind: 1000, dmg: 0.45 },
     { shape: 'beam', name: '手推車加農砲', w: 1.6, len: 9, wind: 1400, dmg: 0.40 },
     { use: 'sweep', name: '手推車迴旋', wind: 1200, dmg: 0.35 }] }],
  { like: 'geffen_fenrir', name: '潘利爾', job: 'highwizard', lookJob: 'highwizard', weapon: 'rod2', range: 9, hp: 200, atk: 2250, mvp: true, skills: [
    { shape: 'spot', name: '毀滅彗星', r: 4, wind: 2500, dmg: 0.50, kind: 'magic' },
    { use: 'nova', name: '地牛翻身', dmg: 0.20 },
    { shape: 'spot', name: '屬性漩渦', r: 2.5, wind: 1500, dmg: 0.35, kind: 'magic' },
    { use: 'share', name: '破壞鎧甲', dmg: 0.45 }] },
];
// 官方每輪硬幣（累計 110）
const GMT_COINS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 20];
/* 第 7 期模擬（2026-11-13，tools 的 sim：Lv99 一般／重生、只穿商店裝備、單人 9 職業）：
   攻擊照官方比例線性爬升（第 1 關→決賽約 ×9.5），係數 1.2 時沒人在前 10 關倒、1.6 時第 11、12 關開始倒 → 取 1.4。
   血量照官方比例 ×1：一般角色多停在第 6～8 關（時間不夠）、重生 8～12 關，決賽留給練好裝備的人（使用者：不必弱化到一定打得完）。 */
let GMT_HP_K = 1.0, GMT_ATK_K = 1.4;
// 前兩關血量打折（讓前面好上手；第 7 期模擬：純輔助職業單人 3 分鐘打不完第 1 關）
const GMT_EARLY_HP = [0.5, 0.75];
function gmtTune(hpK, atkK) { if (hpK) GMT_HP_K = hpK; if (atkK) GMT_ATK_K = atkK; }   // 模擬工具用
function gmtRoundFoes(r, seed, level) {
  let e = GMT_LINEUP[r - 1];
  if (Array.isArray(e)) e = r === 3 ? e[0] : e[Math.floor(vfoeRand(seed + r * 7919)() * e.length)];   // 第 3 關：沒有城內支線＝盜賊
  const off = MONSTERS[e.like] || {};
  return [{
    level, seed: seed + r * 131, job: e.job, lookJob: e.lookJob, weapon: e.weapon, range: e.range, skillList: e.skills,
    like: e.like, name: e.name, displayLevel: off.level, isMvp: !!e.mvp,
    hpMult: GMT_HP_K * e.hp * (GMT_EARLY_HP[r - 1] || 1), atkMult: GMT_ATK_K * (e.atk / 237), windMult: r >= 11 ? 0.85 : 1,
  }];
}
// 每輪時限：官方 3 分鐘、準決賽與決賽 5 分鐘（也不超過大賽剩餘時間）
function gmtRoundLimitMs(r) { return (r >= 12 ? 5 : 3) * 60 * 1000; }

function gmtBlockReason() {
  if (state.gmt) return '已經在大賽中。';
  if ((state.baseLevel || 0) < GMT_ENTRY_LV) return `基本等級 ${GMT_ENTRY_LV} 以上才能報名。`;
  if (state.gmtDay === gmtToday()) return '今天已經參加過了，明天再來。';
  if (state.mapId !== 'geffen') return '要在吉芬報名。';
  if (state.travel) return '趕路中不能報名。';
  if (state.bossChallenge || state.bossHunt || state.vDuel) return '正在打王或對戰中。';
  if (!(state.hp > 0)) return '倒下時不能報名。';
  return null;
}
function gmtEnter() {
  const why = gmtBlockReason();
  if (why) { logMsg('⚠️ ' + why); return false; }
  const now = Date.now();
  state.gmtDay = gmtToday();
  state.gmt = { round: 0, cleared: 0, startAt: now, endAt: now + GMT_TOTAL_MS, size: 1, seed: gmtDaySeed(), level: state.baseLevel, nextAt: now + 1500 };
  changeMap(GMT_ARENA);   // 只有自己進去，隊友留在吉芬
  logMsg(`🏟️ 吉芬魔法大賽開始！單人挑戰${allyList().length ? '（隊友在吉芬等你）' : ''}，總時限 30 分鐘。`);
  saveGame();
  return true;
}
function gmtNextRound() {
  const g = state.gmt;
  if (!g) return;
  const r = g.round + 1;
  const left = g.endAt - Date.now();
  if (left <= 0) return gmtFinish(false, '時間到');
  g.round = r;
  const ok = startVirtualDuel(gmtRoundFoes(r, g.seed, g.level), { label: `第 ${r} 輪${r === GMT_ROUNDS ? '（決賽）' : r === 12 ? '（準決賽）' : ''}`, limitMs: Math.min(left, gmtRoundLimitMs(r)) });
  if (!ok) gmtFinish(false, '無法開始下一輪');
}
function gmtHealParty() {
  state.hp = state.maxHp; state.sp = state.maxSp;
  logMsg('💖 治療師幫你補滿了 HP 與 SP。');
}
onVirtualDuelEnd((win, info) => {
  const g = state.gmt;
  if (!g) return;
  if (!win) return gmtFinish(false, info.why);
  g.cleared = g.round;
  if (g.round >= GMT_ROUNDS) return gmtFinish(true);
  if (GMT_HEAL_AFTER.includes(g.round)) gmtHealParty();
  g.nextAt = Date.now() + GMT_NEXT_DELAY_MS;
});
// 每拍（由 boss_fight 的 tickBossFight 呼叫）：倒數下一輪、離開競技場就結束
function tickGmt(now) {
  const g = state.gmt;
  if (!g) return;
  if (state.mapId !== GMT_ARENA && !state.vDuel) return gmtFinish(false, '離開了競技場');
  if (g.nextAt && now >= g.nextAt && !state.vDuel) { g.nextAt = 0; gmtNextRound(); }
}
/* 結算：照打贏的輪數給硬幣（×組隊倍率），全破再加碼；第一次全破送商城點數 */
function gmtFinish(clear, why) {
  const g = state.gmt;
  if (!g) return;
  state.gmt = null;
  if (state.vDuel) endVirtualDuel(false, '大賽結束');
  let coins = 0;
  for (let r = 1; r <= g.cleared; r++) coins += gmtCoinsFor(r);
  if (clear) coins += GMT_CLEAR_BONUS;
  coins = Math.round(coins * gmtPartyMult(g.size));
  if (coins > 0) addItem(GMT_COIN, coins);
  let firstClear = false;
  if (clear && !state.gmtFirstClear) {
    state.gmtFirstClear = Date.now();
    firstClear = true;
    if (typeof addCashPoints === 'function') addCashPoints(GMT_FIRST_CLEAR_POINTS);
  }
  state.gmtBest = Math.max(state.gmtBest || 0, g.cleared);
  state.gmtLast = { cleared: g.cleared, coins, clear: !!clear, why: why || '', at: Date.now() };
  logMsg(clear
    ? `🏆 吉芬魔法大賽全破！獲得 ${coins} 枚${ITEMS[GMT_COIN].name}${firstClear ? `，首次全破再送 ${GMT_FIRST_CLEAR_POINTS} 商城點數` : ''}！`
    : `🏟️ 吉芬魔法大賽結束（${why || '中斷'}）：打到第 ${g.cleared} 輪，獲得 ${coins} 枚${ITEMS[GMT_COIN].name}。`);
  if (state.mapId === GMT_ARENA) changeMap('geffen');
  saveGame();
}
function gmtAbandon() { if (state.gmt) gmtFinish(false, '放棄'); }
// 讀檔時大賽中斷：照已打贏的輪數結算，人放回吉芬
function gmtOnLoad() {
  if (state.gmt) {
    const g = state.gmt;
    state.gmt = null;
    let coins = 0;
    for (let r = 1; r <= (g.cleared || 0); r++) coins += gmtCoinsFor(r);
    coins = Math.round(coins * gmtPartyMult(g.size || 1));
    if (coins > 0) addItem(GMT_COIN, coins);
    state.gmtLast = { cleared: g.cleared || 0, coins, clear: false, why: '中斷', at: Date.now() };
  }
  if (state.mapId === GMT_ARENA) state.mapId = 'geffen';
}
/* 兌換 */
function gmtBuy(itemId) {
  const e = GMT_SHOP.find(x => x.item === itemId);
  if (!e || !ITEMS[itemId]) return false;
  if (getItemQty(GMT_COIN) < e.price) { logMsg(`⚠️ ${ITEMS[GMT_COIN].name}不足，需要 ${e.price} 枚。`); return false; }
  removeItem(GMT_COIN, e.price);
  addItem(itemId, 1);
  logMsg(`🪙 用 ${e.price} 枚${ITEMS[GMT_COIN].name}換到了 ${ITEMS[itemId].name}。`);
  saveGame();
  return true;
}
/* 12 精煉方塊：身上穿的吉芬魔法袍／披肩直接變 +12（未滿 +12 的第一件） */
const GMT_CUBE_TARGETS = ['geffen_mage_robe', 'geffen_magic_muffler'];
function useGmtRefineCube() {
  const slots = (typeof EQUIP_SLOTS_ALL !== 'undefined' ? EQUIP_SLOTS_ALL : []);
  const slot = slots.find(k => GMT_CUBE_TARGETS.includes(getEquipBaseItemId(k)) && getRefinementLevel(k) < 12);
  if (!slot) { logMsg('⚠️ 要先穿上精煉未滿 +12 的吉芬魔法袍或吉芬魔法披肩。'); return false; }
  const inst = state.instances[getOrCreateEquipInstance(slot)];
  inst.refine = 12;
  removeItem('geffen_refine_cube', 1);
  logMsg(`✨ ${ITEMS[getEquipBaseItemId(slot)].name} 精煉到 +12！`);
  recomputeDerived(false);
  saveGame();
  return true;
}
