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
     soon    還沒開放的功能（附魔、副本），點了只顯示說明
   外觀 look 用職業紙娃娃（images/paperdoll），沒有 NPC 專用圖。
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
  // 箭矢維持全部上架（#139），各城武器商人都賣
  const arrows = Object.keys(ITEMS).filter(k => ITEMS[k].type === 'ammo');
  for (const [town, def] of Object.entries(TOWN_SHOP_RA)) {
    const w = def.weapon.map(n => map[n]).filter(Boolean);
    const a = def.armor.map(n => map[n]).filter(Boolean);
    if (w.length) NPC_SHOPS[town + '_weapon'] = makeTownShop('武器商人', '⚔️', w.concat(arrows));
    if (a.length) NPC_SHOPS[town + '_armor'] = makeTownShop('防具商人', '🛡️', a);
  }
})();
// 沒有分區資料時的通用商店（道具、寵物一律用這兩家）
const GENERIC_TOWN_SHOPS = ['weapon', 'item', 'armor', 'pet'];

/* ---- 城鎮分區：一進城是卡普拉，三區：商店街／精煉・附魔區／副本 ----
   每座城都用同一個模板（WORLD.towns），只有商店內容依城而異。 */
const TOWN_TEMPLATE = {
  spawn: [0, 1.5],
  districts: [
    { id: 'gate', name: '卡普拉服務處', x: 0, y: 0 },
    { id: 'shops', name: '商店街', x: 0, y: -14 },
    { id: 'forge', name: '精煉・附魔區', x: 15, y: 0 },
    { id: 'dungeon', name: '副本', x: -15, y: 0 },
  ],
  npcs: [
    { id: 'kafra', name: '卡普拉職員', role: 'kafra', district: 'gate', x: 1.8, y: -0.5,
      look: { job: 'novice', gender: 'female', hair: 17, hc: 1 } },
    // 轉職暫時放入口（T29 會改成到各職業公會）
    { id: 'jobmaster', name: '轉職官', role: 'job', district: 'gate', x: -1.8, y: -0.5,
      look: { job: 'priest', gender: 'male', hair: 1, hc: 4 } },
    // 四家排在一列、間隔 2 格：站在最左那家也看得到最右那家（畫面一屏約 ±7 格）
    { id: 'weapon', name: '武器商人', role: 'shop', shopKind: 'weapon', district: 'shops', x: -3, y: -15,
      look: { job: 'blacksmith', gender: 'male', hair: 2, hc: 0 } },
    { id: 'armor', name: '防具商人', role: 'shop', shopKind: 'armor', district: 'shops', x: -1, y: -15,
      look: { job: 'merchant', gender: 'female', hair: 8, hc: 6 } },
    { id: 'item', name: '道具商人', role: 'shop', shopKind: 'item', district: 'shops', x: 1, y: -15,
      look: { job: 'merchant', gender: 'male', hair: 5, hc: 3 } },
    { id: 'pet', name: '寵物商人', role: 'shop', shopKind: 'pet', district: 'shops', x: 3, y: -15,
      look: { job: 'archer', gender: 'female', hair: 9, hc: 3 } },
    { id: 'refiner', name: '精煉師', role: 'refine', district: 'forge', x: 14, y: -1,
      look: { job: 'blacksmith', gender: 'male', hair: 10, hc: 1 } },
    { id: 'enchanter', name: '附魔師', role: 'soon', district: 'forge', x: 16, y: -1, soon: '附魔還沒開放（D7）。',
      look: { job: 'sage', gender: 'female', hair: 11, hc: 5 } },
    { id: 'dungeon', name: '副本管理員', role: 'soon', district: 'dungeon', x: -15, y: -1, soon: '副本還沒開放。',
      look: { job: 'knight', gender: 'male', hair: 3, hc: 4 } },
  ],
};
const _townLayoutCache = {};
function buildTownLayout(mapId) {
  if (_townLayoutCache[mapId]) return _townLayoutCache[mapId];
  const L = {
    spawn: TOWN_TEMPLATE.spawn,
    districts: TOWN_TEMPLATE.districts,
    npcs: TOWN_TEMPLATE.npcs.map(n => {
      const o = Object.assign({}, n);
      if (n.shopKind) {
        const own = mapId + '_' + n.shopKind;
        o.shop = (n.shopKind === 'weapon' || n.shopKind === 'armor') && NPC_SHOPS[own] ? own : n.shopKind;
      }
      return o;
    }),
  };
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
function townNpc(id) {
  const L = townLayout();
  return L ? L.npcs.find(n => n.id === id) || null : null;
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
