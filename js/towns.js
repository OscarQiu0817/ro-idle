/* T27 城鎮分區（使用者 2026-11-06）
   主城不需要真的地圖檔：同一張城鎮圖上分成幾個區塊，每區擺不同功能的 NPC，
   玩家在戰鬥畫面上走過去，到了才開功能。只有世界地圖那層才是真的換圖。

   座標單位是格，跟 state.worldX／worldY 同一套（玩家走動＝世界反向平移，見 engine.js 的 playerMoveBy）。
   畫面一屏約 ±7 格，所以各區相距 13～16 格：從中央看不到其他區，要走過去。

   NPC 角色（role）：
     shop    商店，shop＝NPC_SHOPS 的 key
     kafra   卡普拉職員：倉庫、傳送服務
     refine  精煉師
     job     轉職官
     enchant 附魔師（D7：開附魔孔、裝附魔石、隨機附魔）
     soon    還沒開放的功能（副本），點了只顯示說明
   外觀 spr＝RO NPC sprite 名稱（grf_ex/sprite/npc → images/npc/<spr>.png，scripts/gen_npc_sprites.py）。
   配置（使用者 2026-11-06）：一進城是卡普拉（倉庫、傳送），分商店街／精煉・附魔區／副本三區，所有城鎮共用。 */

/* ---- 各城的武器／防具商人（rAthena npc/merchants/shops.txt，2026-11-06 抓的 master）----
   使用者 2026-11-06：不用完全照 RO 配置，一城四家：武器、防具照該城資料，道具、寵物沿用現行商店。
   數字是官方道具編號；同一城的幾個武器商人（劍／矛／拳套）合併成一家。沒有資料的城沿用通用商店。 */
const TOWN_SHOP_RA = {
  alberta: { weapon: [1750, 1751, 1101, 1104, 1107, 1201, 1204, 1207, 1601, 1701, 1301, 1351, 1354, 1357, 1360, 1146, 1245], armor: [2101, 2103, 2401, 2403, 2405, 2501, 2503, 2505, 2203, 2201, 2205, 2226, 2301, 2303, 2305, 2321, 2328, 2332, 2307, 2309, 2312, 2314, 2628] },
  aldebaran: { weapon: [1201, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1146, 1245], armor: [2228, 2103, 2105, 2307, 2309, 2312, 2314, 2316, 2505, 2405, 2628, 2627] },
  amatsu: { weapon: [1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519], armor: [2211, 2401, 2403, 2501, 2503, 2101, 2103, 2305, 2321, 2332, 2328, 2627] },
  ayothaya: { weapon: [1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519], armor: [2211, 2401, 2403, 2501, 2503, 2101, 2103, 2305, 2321, 2332, 2328, 2627] },
  brasilis: { weapon: [1407, 1457, 1354, 1519, 13003], armor: [] },
  comodo: { weapon: [1901, 1903, 1905, 1909, 1911, 1907, 1950, 1952, 1954, 1958, 1960, 1956], armor: [2226, 2228, 2103, 2105, 2405, 2503, 2505, 2305, 2321, 2307, 2309, 2335, 2312, 2314, 2316] },
  einbroch: { weapon: [1101, 1104, 1107, 1110, 1113, 1119, 1122, 1123, 1126, 1129, 1201, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1301, 1401, 1404, 1407, 1501, 1504, 1507, 1510, 1513, 1516, 1519, 1522, 1801, 1803, 1805, 1807, 1809, 1811, 1116, 1151, 1154, 1157, 1160, 1351, 1354, 1357, 1360, 1410, 1451, 1454, 1457, 1460, 1463, 1250, 1252, 1254, 1247, 1248, 1249, 13000], armor: [] },
  geffen: { weapon: [1750, 1751, 1101, 1701, 1201, 1204, 1207, 1210, 1213, 1216, 1601, 1604, 1607, 1610, 1146, 1245], armor: [2628, 2101, 2107, 2401, 2501, 2230, 2301, 2303, 2305, 2321, 2332] },
  gonryun: { weapon: [1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519], armor: [2211, 2401, 2403, 2501, 2503, 2101, 2103, 2305, 2321, 2332, 2328, 2627] },
  hugel: { weapon: [1116, 1154, 1354, 1201], armor: [2224, 2232, 2226, 2101, 2103, 2401, 2501, 2307, 2105] },
  izlude: { weapon: [1750, 1751, 1701, 1601, 1201, 1204, 1207, 1101, 1104, 1107, 1116, 1151, 1154, 1157, 1160, 1301], armor: [2103, 2105, 2403, 2405, 2503, 2505, 2226, 2228, 2303, 2305, 2328, 2307, 2309, 2312, 2314, 2316, 2628] },
  yuno: { weapon: [1750, 1751, 1101, 1701, 1201, 1204, 1207, 1210, 1213, 1216, 1601, 1604, 1607, 1610], armor: [2628, 2101, 2107, 2401, 2501, 2230, 2301, 2303, 2305, 2321, 2332] },
  lighthalzen: { weapon: [1201, 1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519, 13003], armor: [2101, 2103, 2403, 2405, 2503, 2321, 2314, 2309, 2335, 2628] },
  louyang: { weapon: [1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519], armor: [2211, 2401, 2403, 2501, 2503, 2101, 2103, 2305, 2321, 2332, 2328, 2627] },
  xmas: { weapon: [1201, 1204, 1207, 1210, 1213, 1216, 1219, 1222], armor: [2228, 2103, 2105, 2307, 2309, 2312, 2314, 2316, 2505, 2405] },
  morocc: { weapon: [1750, 1751, 1701, 1601, 1201, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1250, 1252, 1254, 1146, 1245], armor: [2101, 2103, 2401, 2403, 2405, 2501, 2503, 2218, 2301, 2303, 2305, 2321, 2328, 2332, 2307, 2309, 2335, 2628] },
  moscovia: { weapon: [1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519], armor: [2211, 2401, 2403, 2501, 2503, 2101, 2103, 2305, 2321, 2332, 2328, 2627] },
  niflheim: { weapon: [], armor: [2501, 2503, 2505] },
  payon: { weapon: [1750, 1751, 1101, 1104, 1107, 1201, 1204, 1207, 1601, 1701, 1704, 1707, 1710, 1713, 1714, 1718, 1146, 1245], armor: [2401, 2403, 2405, 2501, 2503, 2505, 2208, 2211, 2212, 2301, 2303, 2305, 2321, 2328, 2332, 2307, 2309, 2330, 2628] },
  prontera: { weapon: [1750, 1751, 1701, 1201, 1204, 1207, 1601, 1101, 1104, 1107, 1110, 1113, 1122, 1119, 1123, 1126, 1129, 1116, 1301, 1401, 1404, 1407, 1451, 1454, 1457, 1460, 1463, 1410, 1146, 1245, 1801, 1803, 1805], armor: [2101, 2103, 2401, 2403, 2501, 2503, 2220, 2226, 2301, 2303, 2305, 2328, 2307, 2309, 2312, 2314, 2628, 2627] },
  rachel: { weapon: [1201, 1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519, 13003, 1601, 1604, 1607], armor: [2101, 2103, 2403, 2405, 2503, 2321, 2314, 2309, 2335, 2628] },
  umbala: { weapon: [1501, 1504, 1507, 1510, 1513, 1519, 1807, 1811, 1809], armor: [] },
  veins: { weapon: [1201, 1207, 1216, 1107, 1122, 1116, 1154, 1407, 1457, 1354, 1519, 13003], armor: [2101, 2103, 2403, 2405, 2503, 2321, 2314, 2309, 2335, 2628] },
};

/* 數字編號 → 本作道具 key（ITEMS 的 imgId 就是官方編號）。同一個編號有多筆時取第一筆 */
function townItemByNum() {
  if (townItemByNum._m) return townItemByNum._m;
  const m = {};
  for (const k in ITEMS) {
    const n = ITEMS[k] && ITEMS[k].imgId;
    if (n && !(n in m)) m[n] = k;
  }
  return (townItemByNum._m = m);
}
function makeTownShop(name, icon, items) {
  return {
    name, icon, town: true,
    items: [...new Set(items)].filter(k => ITEMS[k] && ITEMS[k].buyPrice > 0),
    getItems() {
      return this.items.filter(k => {
        const it = ITEMS[k];
        return it && !(it.reqLevel && state && state.baseLevel < it.reqLevel);
      });
    },
  };
}
(function registerTownShops() {
  if (typeof NPC_SHOPS === 'undefined') return;
  const map = townItemByNum();
  /* T61（使用者 2026-11-19）：拿掉「各城賣的武器／防具不同」（例：法杖只在吉芬），
     主城武器、防具商人各一家，內容＝各城清單聯集＋通用商店；箭矢全部上架（#139） */
  const arrows = Object.keys(ITEMS).filter(k => ITEMS[k].type === 'ammo');
  const w = [], a = [];
  for (const def of Object.values(TOWN_SHOP_RA)) {
    def.weapon.forEach(n => { if (map[n]) w.push(map[n]); });
    def.armor.forEach(n => { if (map[n]) a.push(map[n]); });
  }
  NPC_SHOPS.hub_weapon = makeTownShop('武器商人', '⚔️', NPC_SHOPS.weapon.items.concat(w, arrows));
  NPC_SHOPS.hub_armor = makeTownShop('防具商人', '🛡️', NPC_SHOPS.armor.items.concat(a));
})();
/* ---- 各城 NPC 外觀（使用者 2026-11-07：照官方預設，同城商人不重複）----
   來源：rAthena npc/merchants/shops.txt（各城第一個武器／防具／道具商人）、npc/kafras/kafras.txt、
   pre-re shops.txt 的寵物美容師（Pet Groomer）。官方沒有的欄位用卡普拉 1 號／寵物美容師補，
   同城撞圖的改用其他商人圖（1_m_merchant、1_f_merchant_01／02…）。沒列的城鎮用普隆德拉那組。 */
const TOWN_NPC_SPRITE = {
  prontera: { kafra: '4_f_kafra6', weapon: '1_m_jobguider', armor: '1_m_02', item: '1_m_innkeeper', pet: '4_m_teleporter' },
  alberta: { kafra: '4_f_kafra2', weapon: '1_m_03', armor: '4w_f_01', item: '1_f_merchant_01', pet: '4_f_teleporter' },
  aldebaran: { kafra: '4_f_kafra5', weapon: '1_m_03', armor: '4w_f_01', item: '4_m_01', pet: '4_f_teleporter' },
  amatsu: { kafra: '4_f_kafra2', weapon: '4_m_jpnoji', armor: '4_f_jpn2', item: '4_m_jpn', pet: '4_f_teleporter' },
  ayothaya: { kafra: '4_f_kafra2', weapon: '4_m_thaiongbak', armor: '4_m_thaiold', item: '4_f_thaishaman', pet: '4_f_teleporter' },
  brasilis: { kafra: '4_f_kafra1', weapon: '4_m_brz_man2', armor: '1_m_merchant', item: '4_f_brz_woman', pet: '4_f_teleporter' },
  comodo: { kafra: '4_f_kafra7', weapon: '1_m_03', armor: '4w_f_01', item: '4_m_01', pet: '4_f_teleporter' },
  einbroch: { kafra: '4_f_kafra8', weapon: '4_f_einwoman', armor: '1_m_merchant', item: '1_f_merchant_01', pet: '4_f_teleporter' },
  geffen: { kafra: '4_f_kafra3', weapon: '1_m_01', armor: '1_f_01', item: '1_f_03', pet: '4_f_teleporter' },
  gonryun: { kafra: '4_f_kafra2', weapon: '4_m_twboy', armor: '4_f_twgirl', item: '4_m_twoldman', pet: '4_f_teleporter' },
  hugel: { kafra: '4_f_kafra1', weapon: '4_m_human_01', armor: '4_m_04', item: '1_m_innkeeper', pet: '4_f_teleporter' },
  izlude: { kafra: '4_f_kafra1', weapon: '1_f_maria', armor: '1_m_siz', item: '1_m_01', pet: '4_f_teleporter' },
  yuno: { kafra: '4_f_kafra8', weapon: '1_m_03', armor: '4w_f_01', item: '4_m_02', pet: '4_f_teleporter' },
  lighthalzen: { kafra: '4_f_kafra8', weapon: '4_m_repair', armor: '1_m_merchant', item: '4_f_01', pet: '4_m_teleporter' },
  louyang: { kafra: '4_f_kafra2', weapon: '4_m_chnman', armor: '4_f_chnwoman', item: '1_m_merchant', pet: '4_f_teleporter' },
  xmas: { kafra: '4_f_kafra1', weapon: '1_m_03', armor: '4w_f_01', item: '4_m_01', pet: '4_f_teleporter' },
  morocc: { kafra: '4_f_kafra5', weapon: '1_m_merchant', armor: '1_f_merchant_01', item: '1_f_merchant_02', pet: '4_f_teleporter' },
  moscovia: { kafra: '4_f_kafra4', weapon: '4_m_rusman2', armor: '4_f_ruswoman3', item: '1_m_merchant', pet: '4_f_teleporter' },
  niflheim: { kafra: '4_f_nfdeadkafra', weapon: '4_nfcoffin', armor: '1_m_merchant', item: '1_f_merchant_01', pet: '4_f_teleporter' },
  payon: { kafra: '4_f_kafra5', weapon: '1_f_orient_03', armor: '1_f_orient_02', item: '4_m_orient01', pet: '4_f_teleporter' },
  rachel: { kafra: '4_f_kafra1', weapon: '4_m_rachman1', armor: '4_f_shabby', item: '1_m_merchant', pet: '4_f_teleporter' },
  umbala: { kafra: '4_f_kafra7', weapon: '4_m_umsoldier', armor: '1_m_merchant', item: '4_m_umoldman', pet: '4_f_teleporter' },
  veins: { kafra: '4_f_kafra1', weapon: '4_m_rachman1', armor: '4_f_shabby', item: '4_m_desert', pet: '4_f_teleporter' },
};
// 沒有分區資料時的通用商店（道具、寵物一律用這兩家）
const GENERIC_TOWN_SHOPS = ['weapon', 'item', 'armor', 'pet'];

/* ---- 一般城鎮（T61 起）：只剩卡普拉（倉庫、傳送、前往主城）＋職業公會 ----
   商店、精煉、附魔、副本全部搬到主城。 */
const TOWN_TEMPLATE = {
  spawn: [0, 1.5],
  districts: [
    { id: 'gate', name: '卡普拉服務處', x: 0, y: 0 },
  ],
  npcs: [
    { id: 'kafra', name: '卡普拉職員', role: 'kafra', district: 'gate', x: 1.8, y: -0.5 },
  ],
};

/* ---- T61 獨立主城（使用者 2026-11-19）----
   比照私服：主城不在世界地圖上，只能找各城卡普拉「前往主城」（免費）進來，
   出去找主城傳送師（傳到各城，費用照原本）。
   放攻城／副本／附魔／精煉／小遊戲／商人／活動／交易所。交易所要雲端（T12），小遊戲、活動還沒內容，先放佔位 NPC。 */
/* 特殊地區傳送（使用者 2026-11-24）：副本、夢魘版、任務地圖沒有傳送點連得到，放進城鎮傳送 NPC 的「特殊地區」分頁。
   town＝在那邊倒下或回城回哪個城；lv＝隊伍最高等級要到多少才開放（地圖怪物平均等級 −10）。
   名字是 id 的四張客戶端沒有中文名，這裡先給暫定名稱 */
const SPECIAL_WARPS = [
  { id: 'treasure_n1', town: 'alberta', lv: 1 },
  { id: 'treasure_n2', town: 'alberta', lv: 5 },
  { id: 'pay_d03_i', town: 'payon', lv: 25 },
  { id: 'gl_cas02_', town: 'geffen', lv: 55, name: '古城 2樓（夢魘）' },
  { id: 'teg_dun01', town: 'lighthalzen', lv: 90, name: '闇之試煉 1樓（暫定名）' },
  { id: 'teg_dun02', town: 'lighthalzen', lv: 90, name: '闇之試煉 2樓（暫定名）' },
  { id: 'nyd_dun01', town: 'splendide', lv: 100 },
  { id: 'moc_prydn1', town: 'morocc', lv: 105 },
  { id: 'gl_chyard_', town: 'geffen', lv: 110, name: '古城墓地（夢魘）' },
  { id: 'prt_q', town: 'prontera', lv: 120 },
  { id: 'moc_prydn2', town: 'morocc', lv: 120 },
  { id: 'c_tower2_', town: 'aldebaran', lv: 145 },
  { id: 'c_tower3_', town: 'aldebaran', lv: 150 },
  { id: 'lhz_dun_n', town: 'lighthalzen', lv: 165 },
];
const SPECIAL_WARP_COST = 5000;
if (typeof MAPS !== 'undefined') SPECIAL_WARPS.forEach(s => { const m = MAPS.find(x => x.id === s.id); if (m && s.name && (!m.name || m.name === m.id)) m.name = s.name; });
const HUB_TOWN = 'hub';
const HUB_NAME = '冒險者主城';
if (typeof MAPS !== 'undefined' && !MAPS.some(m => m.id === HUB_TOWN)) {
  MAPS.push({ id: HUB_TOWN, imgId: 0, name: HUB_NAME, monsters: [], bg: 'map-city', lv: '', town: true, hub: true });
}
if (typeof WORLD !== 'undefined' && !WORLD.towns.some(t => t.id === HUB_TOWN)) {
  WORLD.towns.unshift({ id: HUB_TOWN, name: HUB_NAME, lv: 1, cost: 0 });
}
if (typeof MAP_FLOOR_TOWN !== 'undefined') MAP_FLOOR_TOWN[HUB_TOWN] = MAP_FLOOR_TOWN.prontera;
if (typeof MAP_BGM !== 'undefined') MAP_BGM[HUB_TOWN] = MAP_BGM.prontera;
const HUB_LAYOUT = {
  spawn: [0, 1.5],
  districts: [
    { id: 'gate', name: '中央廣場', x: 0, y: 0 },
    { id: 'shops', name: '商店街', x: 0, y: -14 },
    { id: 'forge', name: '精煉・附魔區', x: 15, y: 0 },
    { id: 'dungeon', name: '副本區', x: -15, y: 0 },
    { id: 'trade', name: '交易區', x: 0, y: 14 },
    { id: 'fun', name: '遊樂區', x: 15, y: -14 },
  ],
  // 同一區的 NPC 排一列、間隔 2 格：站在最左那位也看得到最右那位（畫面一屏約 ±7 格）
  npcs: [
    { id: 'kafra', name: '卡普拉職員', bubble: '倉庫・傳送', role: 'kafra', district: 'gate', x: 1.8, y: -0.5, spr: '4_f_kafra6' },
    { id: 'warper', name: '主城傳送師', bubble: '傳送到各城', role: 'warper', district: 'gate', x: -1.8, y: -0.5, spr: '4_m_teleporter' },
    { id: 'peco', name: '大嘴鳥・獵鷹飼育員', bubble: '大嘴鳥・獵鷹租借', role: 'peco', district: 'gate', x: 4, y: 1, spr: '4_m_knight_silver' },
    { id: 'event', name: '活動 NPC', bubble: '活動', role: 'soon', district: 'gate', x: 0, y: -2.5, spr: '4_f_jpn2', soon: '目前沒有舉辦中的活動。' },
    { id: 'weapon', name: '武器商人', role: 'shop', shop: 'hub_weapon', district: 'shops', x: -3, y: -15, spr: '1_m_merchant' },
    { id: 'armor', name: '防具商人', role: 'shop', shop: 'hub_armor', district: 'shops', x: -1, y: -15, spr: '1_f_merchant_01' },
    { id: 'item', name: '道具商人', role: 'shop', shop: 'item', district: 'shops', x: 1, y: -15, spr: '1_m_innkeeper' },
    { id: 'pet', name: '寵物商人', role: 'shop', shop: 'pet', district: 'shops', x: 3, y: -15, spr: '4_f_01' },
    { id: 'refiner', name: '精煉師', bubble: '精煉裝備', role: 'refine', district: 'forge', x: 14, y: -1, spr: '4_m_03' },
    { id: 'enchanter', name: '附魔師', bubble: '裝備附魔', role: 'enchant', district: 'forge', x: 16.5, y: -1, spr: '4_m_sage_a' },
    { id: 'dojo', name: '道館館主', bubble: '道館挑戰', role: 'dojo', district: 'dungeon', x: -19.5, y: -1, spr: '2_m_swordmaster' },
    { id: 'gvg', name: '攻城戰管理員', bubble: '攻城戰', role: 'gvg', district: 'dungeon', x: -16.5, y: -2, spr: '1_m_knightmaster' },
    { id: 'gmt', name: '吉芬魔法大賽報名處', bubble: '魔法大賽報名', role: 'gmt', district: 'dungeon', x: -13.5, y: -1, spr: '2_f_magicmaster' },
    { id: 'gmt_shop', name: '大賽兌換員', bubble: '大賽硬幣兌換', role: 'gmtshop', district: 'dungeon', x: -10.5, y: -2, spr: '1_f_01' },
    { id: 'exchange', name: '交易所', bubble: '交易所', role: 'soon', district: 'trade', x: 0, y: 13, spr: '1_f_merchant_02', soon: '交易所要連線伺服器，還在準備中。' },
    { id: 'minigame', name: '小遊戲管理員', bubble: '小遊戲', role: 'soon', district: 'fun', x: 15, y: -15, spr: '4w_f_01', soon: '小遊戲還在準備中。' },
  ],
};
/* 大嘴鳥租借（使用者 2026-11-21）：學過騎乘術（騎士、十字軍與其進階）才能租；只換外觀，存在 state.riding */
const PECO_RENT_COST = 1000;
const PECO_JOBS = ['knight', 'crusader', 'lordknight', 'paladin'];
function pecoRentReason() {
  if (!PECO_JOBS.includes(state.jobId)) return '大嘴鳥只租給騎士、十字軍（含進階）。';
  if (!(state.learnedSkills && state.learnedSkills.kn_riding)) return '要先學會騎乘術才能騎大嘴鳥。';
  if (state.riding) return '你已經騎著大嘴鳥了。';
  if ((state.gold || 0) < PECO_RENT_COST) return `租金 ${PECO_RENT_COST.toLocaleString()}z，錢不夠。`;
  return null;
}
function rentPeco() {
  const why = pecoRentReason();
  if (why) return why;
  state.gold -= PECO_RENT_COST;
  state.riding = true;
  logMsg(`🐤 租了一隻大嘴鳥（${PECO_RENT_COST.toLocaleString()}z）。`);
  saveGame();
  return null;
}
function dismountPeco() {
  if (!state.riding) return;
  state.riding = false;
  logMsg('🐤 把大嘴鳥還給飼育員了。');
  saveGame();
}
/* 獵鷹也用租的（使用者 2026-11-21）：學過馴鷹術的獵人、神射手；身邊有獵鷹才顯示（狙擊之王的獵鷹外觀不同） */
const FALCON_RENT_COST = 1000;
const FALCON_JOBS = ['hunter', 'sniper'];
function falconRentReason() {
  if (!FALCON_JOBS.includes(state.jobId)) return '獵鷹只租給獵人、神射手。';
  if (!(state.learnedSkills && state.learnedSkills.ht_falcon)) return '要先學會馴鷹術才能帶獵鷹。';
  if (state.falconRent) return '你已經帶著獵鷹了。';
  if ((state.gold || 0) < FALCON_RENT_COST) return `租金 ${FALCON_RENT_COST.toLocaleString()}z，錢不夠。`;
  return null;
}
function rentFalcon() {
  const why = falconRentReason();
  if (why) return why;
  state.gold -= FALCON_RENT_COST;
  state.falconRent = true;
  logMsg(`🦅 租了一隻獵鷹（${FALCON_RENT_COST.toLocaleString()}z）。`);
  saveGame();
  return null;
}
function returnFalcon() {
  if (!state.falconRent) return;
  state.falconRent = false;
  logMsg('🦅 把獵鷹還給飼育員了。');
  saveGame();
}
function isHubTown(mapId) { return (mapId || (state && state.mapId)) === HUB_TOWN; }

/* ---- T29 職業公會（使用者 2026-11-07：找 NPC 就能轉，不跑任務）----
   地點照官方（rAthena npc/re/jobs、npc/jobs），外觀照該 NPC 的 sprite。官方在室內／專屬地圖的，放到所屬城鎮。
     獵人：renewal 在毀葛（hu_in01）　流氓：官方在克魔島野外的流氓公會 → 克魔島
     刺客：夢羅克金字塔 → 夢羅克　轉生、進階二轉：官方在英靈殿（從朱諾進）→ 朱諾女武神
   轉生後的高等一轉（還是 swordsman 等同一個 id）照樣找一轉公會。
   三轉官方散在各地、有些地圖本作沒有，先一律交給女武神。
   弓箭手公會官方是 4_M_03，跟精煉師同圖，斐揚兩個並排會分不出來 → 改 4_m_job_hunter。 */
const JOB_GUILDS = [
  { id: 'g_swordsman', town: 'izlude', name: '劍士公會', spr: '2_m_swordmaster', jobs: ['swordsman'] },
  { id: 'g_mage', town: 'geffen', name: '魔法師公會', spr: '2_f_magicmaster', jobs: ['mage'] },
  { id: 'g_wizard', town: 'geffen', name: '巫師公會', spr: '1_f_gypsy', jobs: ['wizard'] },
  { id: 'g_archer', town: 'payon', name: '弓箭手公會', spr: '4_m_job_hunter', jobs: ['archer'] },
  { id: 'g_merchant', town: 'alberta', name: '商人公會', spr: '4_m_04', jobs: ['merchant'] },
  { id: 'g_thief', town: 'morocc', name: '盜賊公會', spr: '2_m_thiefmaster', jobs: ['thief'] },
  { id: 'g_assassin', town: 'morocc', name: '刺客公會', spr: '1_m_jobtester', jobs: ['assassin'] },
  { id: 'g_church', town: 'prontera', name: '普隆德拉教堂', spr: '1_m_pastor', jobs: ['acolyte', 'priest'] },
  { id: 'g_knight', town: 'prontera', name: '騎士團', spr: '1_m_knightmaster', jobs: ['knight'] },
  { id: 'g_crusader', town: 'prontera', name: '十字軍', spr: '4_f_cru', jobs: ['crusader'] },
  { id: 'g_monk', town: 'prontera', name: '聖卡皮多利那修道院', spr: '4_f_monk', jobs: ['monk'] },
  { id: 'g_supernovice', town: 'aldebaran', name: '超級初心者導師', spr: '4_m_seaman', jobs: ['supernovice'] },
  { id: 'g_alchemist', town: 'aldebaran', name: '鍊金術士公會', spr: '4_f_alche', jobs: ['alchemist'] },
  { id: 'g_sage', town: 'yuno', name: '賢者學院', spr: '2_m_sage_old', jobs: ['sage'] },
  { id: 'g_hunter', town: 'hugel', name: '獵人公會', spr: '4_f_job_hunter', jobs: ['hunter'] },
  { id: 'g_bard', town: 'comodo', name: '吟遊詩人', spr: '2_m_bard_orient', jobs: ['bard'] },
  { id: 'g_dancer', town: 'comodo', name: '舞孃', spr: '4_f_07', jobs: ['dancer'] },
  { id: 'g_rogue', town: 'comodo', name: '流氓公會', spr: '4_f_rogue', jobs: ['rogue'] },
  { id: 'g_blacksmith', town: 'einbroch', name: '鐵匠公會', spr: '4_m_job_blacksmith', jobs: ['blacksmith'] },
  // 轉生＋進階二轉＋三轉；jobs 留空，jobGuildFor 依 tier 判斷
  { id: 'g_valkyrie', town: 'yuno', name: '女武神', spr: '4_f_valkyrie', jobs: [], rebirth: true },
];
// 這個職業要找哪個公會：tier 2 以上不在名單上的（進階二轉、三轉）都歸女武神
function jobGuildFor(jobId) {
  const g = JOB_GUILDS.find(x => x.jobs.includes(jobId));
  if (g) return g;
  const jd = typeof JOB_TREE !== 'undefined' ? JOB_TREE[jobId] : null;
  return jd && jd.tier >= 2 ? JOB_GUILDS.find(x => x.rebirth) : null;
}
function townName(mapId) {
  const m = typeof MAPS !== 'undefined' ? MAPS.find(x => x.id === mapId) : null;
  // 「衛星都市 依斯魯得島」→ 依斯魯得島、「…共和國首都朱諾」→ 朱諾
  return m && m.name ? m.name.trim().split(/\s+/).pop().replace(/^.*首都/, '') : mapId;
}
/* 站在公會 NPC 旁邊才能轉（T29）。查不到公會的職業不擋 */
function jobGuildBlockReason(jobId) {
  const g = jobGuildFor(jobId);
  if (!g) return null;
  if (state.mapId === g.town) {
    const n = townNpc(g.id);
    if (n && townNpcDist(n) <= TOWN_NPC_NEAR) return null;
  }
  return `要到${townName(g.town)}找「${g.name}」轉職。`;
}
function rebirthPlaceReason() {
  const g = JOB_GUILDS.find(x => x.rebirth);
  if (state.mapId === g.town) {
    const n = townNpc(g.id);
    if (n && townNpcDist(n) <= TOWN_NPC_NEAR) return null;
  }
  return `要到${townName(g.town)}找「${g.name}」轉生。`;
}
/* 前往公會：同城直接走過去；不同城沿傳送點趕路，進城後自動走向 NPC（townEnter 接手） */
function goToJobGuildNpc(g) {
  if (!g) return false;
  if (state.mapId === g.town && isInTown()) return walkToTownNpc(g.id);
  state.townGoal = { map: g.town, npc: g.id };
  if (startTravel(g.town)) return true;
  state.townGoal = null;
  return false;
}
/* 前往主城的某個 NPC（每日任務的「前往」）：在主城直接走過去；在別的城找傳送 NPC 免費傳；
   在野外先走回最近的城，抵達時 tickTravel 接著傳（npcWarp 會清掉 townGoal，所以傳完再設） */
function goToHubNpc(npcId) {
  if (isHubTown(state.mapId)) return walkToTownNpc(npcId);
  const goal = { map: HUB_TOWN, npc: npcId };
  if ((currentMap() || {}).town) {
    if (npcWarp(HUB_TOWN)) return false;
    state.townGoal = goal;
    return true;
  }
  state.townGoal = goal;
  if (startTravel(nearestTownId(state.mapId))) return true;
  state.townGoal = null;
  return false;
}
function goToJobGuild(jobId) { return goToJobGuildNpc(jobGuildFor(jobId)); }
function goToRebirth() { return goToJobGuildNpc(JOB_GUILDS.find(x => x.rebirth)); }

const _townLayoutCache = {};
function buildTownLayout(mapId) {
  if (_townLayoutCache[mapId]) return _townLayoutCache[mapId];
  if (mapId === HUB_TOWN) {
    return (_townLayoutCache[mapId] = { spawn: HUB_LAYOUT.spawn, districts: HUB_LAYOUT.districts, npcs: HUB_LAYOUT.npcs.map(n => Object.assign({}, n)) });
  }
  const look = TOWN_NPC_SPRITE[mapId] || TOWN_NPC_SPRITE.prontera;
  const L = {
    spawn: TOWN_TEMPLATE.spawn,
    districts: TOWN_TEMPLATE.districts,
    npcs: TOWN_TEMPLATE.npcs.map(n => Object.assign({ spr: look[n.role] }, n)),
  };
  // 有公會的城多一區「職業公會」，在城門口正下方；NPC 排一列、間隔 2 格。
  // 城裡只剩卡普拉跟公會，公會拉近到 8 格（還是要走一小段，但不用走一整屏）
  const guilds = JOB_GUILDS.filter(g => g.town === mapId);
  if (guilds.length) {
    L.districts = L.districts.concat([{ id: 'guild', name: '職業公會', x: 0, y: 8 }]);
    guilds.forEach((g, i) => L.npcs.push({
      id: g.id, name: g.name, role: 'job', district: 'guild', spr: g.spr, guild: g,
      x: (i - (guilds.length - 1) / 2) * 2, y: 7,
    }));
  }
  return (_townLayoutCache[mapId] = L);
}

const TOWN_NPC_REACH = 1.6;   // 走到幾格內算到達（開功能）
const TOWN_NPC_FRONT = 1.2;   // 停在 NPC 正前方（畫面下方）幾格，不要跟 NPC 疊在一起
const TOWN_NPC_NEAR = 3;      // 幾格內算「在 NPC 旁邊」（倉庫、精煉、轉職的使用條件）

function townLayout(mapId) {
  const id = mapId || (state && state.mapId);
  if (!id || typeof WORLD === 'undefined' || !WORLD.towns.some(t => t.id === id)) return null;
  return buildTownLayout(id);
}
// 這座城的全部 NPC：主城再加上交易區的假人攤位（T63，每 2 小時換一批，所以不放進快取的 layout）
function townNpcList(L) {
  L = L || townLayout();
  if (!L) return [];
  return isHubTown() && typeof fakeHubNpcs === 'function' ? L.npcs.concat(fakeHubNpcs()) : L.npcs;
}
function townNpc(id) {
  return townNpcList().find(n => n.id === id) || null;
}
function townNpcDist(n) {
  return Math.hypot(n.x - (state.worldX || 0), n.y - (state.worldY || 0));
}
// 現在玩家最靠近哪一區
function townDistrictHere() {
  const L = townLayout();
  if (!L) return null;
  let best = null, bd = Infinity;
  L.districts.forEach(d => {
    const v = Math.hypot(d.x - (state.worldX || 0), d.y - (state.worldY || 0));
    if (v < bd) { bd = v; best = d; }
  });
  return best;
}
/* 進城：站到城門口，清掉上一個要去的 NPC */
function townEnter(mapId) {
  const L = townLayout(mapId);
  state.townTarget = null;
  if (!L) return;
  state.worldX = L.spawn[0];
  state.worldY = L.spawn[1];
  // 前往公會（goToJobGuild）到了目的城：接著走向那個 NPC
  const goal = state.townGoal;
  if (goal && goal.map === mapId) {
    state.townGoal = null;
    if (L.npcs.some(n => n.id === goal.npc)) state.townTarget = goal.npc;
  }
}
/* 走向 NPC（畫面點 NPC、地圖分頁點清單都走這支）；已經在旁邊就直接開 */
function walkToTownNpc(id) {
  const n = townNpc(id);
  if (!n || !isInTown()) return false;
  if (state.travel) cancelTravel(true);
  if (Math.hypot(n.x - (state.worldX || 0), n.y + TOWN_NPC_FRONT - (state.worldY || 0)) <= 0.5) { townNpcArrive(n); return true; }
  state.townTarget = id;
  return true;
}
function walkToTownDistrict(did) {
  const L = townLayout();
  const d = L && L.districts.find(x => x.id === did);
  if (!d || !isInTown()) return false;
  if (state.travel) cancelTravel(true);
  state.townTarget = 'district:' + did;
  return true;
}
function townNpcArrive(n) {
  state.townTarget = null;
  if (typeof openTownNpc === 'function') openTownNpc(n.id);
}
/* gameTick 沒怪、沒趕路時呼叫：朝目標走，到了就開功能 */
function tickTownWalk(dt) {
  const t = state.townTarget;
  if (!t || playerImmobile() || state.casting) return;
  let tx, ty, reach, npc = null;
  if (t.indexOf('district:') === 0) {
    const L = townLayout();
    const d = L && L.districts.find(x => x.id === t.slice(9));
    if (!d) { state.townTarget = null; return; }
    tx = d.x; ty = d.y; reach = 0.5;
  } else {
    npc = townNpc(t);
    if (!npc) { state.townTarget = null; return; }
    tx = npc.x; ty = npc.y + TOWN_NPC_FRONT; reach = 0.3;
  }
  const dx = tx - (state.worldX || 0), dy = ty - (state.worldY || 0);
  const d = Math.hypot(dx, dy);
  if (d <= reach) {
    if (npc) townNpcArrive(npc); else state.townTarget = null;
    return;
  }
  playerMoveBy(Math.min(d, dt / PLAYER_WALK_MS), Math.atan2(dy, dx));
}
/* 使用條件：分區城鎮要站在對應 NPC 旁邊；還沒做分區的城鎮在城裡就能用（沿用舊規則） */
function townServiceBlockReason(role) {
  if (!isInTown()) return '要在城鎮裡找 NPC。';
  const L = townLayout();
  if (!L) return null;
  const list = L.npcs.filter(n => n.role === role);
  if (!list.length) return '這座城鎮沒有這項服務。';
  if (list.some(n => townNpcDist(n) <= TOWN_NPC_NEAR)) return null;
  return `要走到「${list[0].name}」旁邊。`;
}
