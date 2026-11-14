/* 世界地圖與地圖資料（工作 7、docs/GAMEPLAY_DIRECTION.md D1b）
   node scripts/gen_worldmap.js
     → js/world_data.js        遊戲用：WORLD（世界地圖格子、地城、連線、NPC 城鎮）、WORLD_MAPS（取代舊 MAPS）、WORLD_BOSSES（取代 MVP_MAP_DATA）
     → proto/worldmap/data.js  原型用（多帶怪物名稱）
     → images/worldmap/、images/effects/warp/  底圖與傳點貼圖（grf_ex 不進版控，要複製出來）
   來源（grf_ex/world_map/）：
     worldviewdata_table.lub  客戶端世界地圖：原野／城鎮格子（群組 ≥ 100）、地城入口圖示（*_Dun）與樓層清單（群組 < 100）
     中文地圖.txt              mapnametable（地圖中文名）
     mobs/                    rAthena 刷怪
   連線：grf_ex/warps_re、warps_common 的 warp／warp2。
   世界地圖畫面先只做主大陸（worldtable_main）；其他地區的地圖照樣收進 WORLD_MAPS（NPC 傳送到得了）。 */
const fs = require('fs');
const path = require('path');
const { readLub } = require('./lib/lub');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'grf_ex', 'world_map');
const OUT = path.join(ROOT, 'proto', 'worldmap', 'data.js');
const OUT_GAME = path.join(ROOT, 'js', 'world_data.js');

const walk = dir => fs.readdirSync(dir).flatMap(f => {
  const p = path.join(dir, f);
  return fs.statSync(p).isDirectory() ? walk(p) : [p];
});
const mapId = rsw => rsw.replace(/\.rsw$/i, '');

// 中文名：同一張圖出現多次取最後一筆有效的（檔案後段是較新的改版）；mapnametable 沒有的用 twRO 名稱補
const NAME_FIX = {
  gw_fild01: '灰狼叢林', gw_fild02: '灰狼叢林', mag_dun03: '朱諾諾可羅德3樓',
  oz_dun01: '歐茲迷宮一樓', oz_dun02: '歐茲迷宮二樓', prt_mk: '普隆德拉市集',
};
const names = {};
for (const line of fs.readFileSync(path.join(SRC, '中文地圖.txt'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([\w@-]+)\.rsw#([^#]*)#/i);
  if (m && m[2] && !/^-+$/.test(m[2])) names[m[1].toLowerCase()] = m[2].trim();
}
Object.assign(names, NAME_FIX);

// 怪物名稱：data.js 的 MONSTERS 以 imgId（＝rAthena 怪物 id）對照（兩種寫法都有；要有 level 才是怪物，道具也有 imgId）；
// 本作沒收的用 mob_db 英文名
const monName = {};
const monKey = {};      // rAthena 怪物 id → MONSTERS 的 key
const monBoss = {};     // rAthena 怪物 id → 首領階級（MVP 或迷你王）
{
  const src = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
  const re = /['"]?id['"]?:\s*['"](\w+)['"],\s*['"]?imgId['"]?:\s*(\d+),\s*['"]?name['"]?:\s*['"]([^'"]+)['"],\s*['"]?icon['"]?:\s*['"][^'"]*['"],\s*['"]?level['"]?:.*$/mg;
  const keyBoss = {};    // MONSTERS key → 首領階級
  for (const m of src.matchAll(re)) {
    monName[m[2]] = m[3];
    if (!monKey[m[2]]) monKey[m[2]] = m[1];
    keyBoss[m[1]] = /['"]?isBoss['"]?:\s*true/.test(m[0]);
    if (keyBoss[m[1]]) monBoss[m[2]] = true;
  }
  /* rAthena 有些地圖刷的是 G_ 版本（G_ALIOT、G_THA_ODIUM…），本作只收一般版本；
     G_ 版本對不到時改用去掉 G_ 的那隻（MONSTERS 的 key 就是小寫 AegisName） */
  const db = fs.readFileSync(path.join(ROOT, 'grf_ex', 'mob_db.yml'), 'utf8');
  for (const m of db.matchAll(/^ {2}- Id: (\d+)\r?\n {4}AegisName: G_(\w+)/mg)) {
    const base = m[2].toLowerCase();
    if (monKey[m[1]] || !(base in keyBoss)) continue;
    monKey[m[1]] = base;
    if (keyBoss[base]) monBoss[m[1]] = true;
  }
  for (const m of db.matchAll(/^ {2}- Id: (\d+)\r?\n {4}AegisName: \w+\r?\n {4}Name: (.+)$/mg)) if (!monName[m[1]]) monName[m[1]] = m[2].trim() + '（未收錄）';
}

const W = readLub(path.join(SRC, 'worldviewdata_table.lub'));
const main = W.worldtable_main;
const tiles = main.filter(e => e[0] >= 100).map(e => ({
  id: mapId(e[1]), x1: e[2], y1: e[3], x2: e[4], y2: e[5], lv: e[7] || '',
}));
const lcp = list => {
  let p = list[0] || '';
  for (const s of list) while (p && !s.startsWith(p)) p = p.slice(0, -1);
  return p.replace(/(?:[\s\d樓F層一二三四五六七八九十-]|地上|地下|地)+$/, '').trim();
};
const dungeons = W.worldtable_main_Dun.map(e => {
  const floors = main.filter(f => f[0] === e[0]).map(f => ({ id: mapId(f[1]), lv: f[7] || '' }));
  const floorNames = floors.map(f => names[f.id]).filter(Boolean);
  return {
    group: e[0], x1: e[1], y1: e[2], x2: e[3], y2: e[4], lv: e[6] || '',
    name: lcp(floorNames) || floorNames[0] || floors[0].id, floors,
  };
});

// 傳送點連線（無向；同一對只留一條）。註解掉的行（// 開頭）不讀
// 手動補的：復興後夢羅克北邊封路（moc_fild07↔moc_fild06 等被註解），沙漠一帶跟主大陸斷開；從正北的普隆德拉原野接過去
// 官方要任務或道具才進得去的樓層，先直接連上（使用者 2026-11-04；之後有任務系統再加條件）
const EXTRA_LINKS = [
  ['moc_fild07', 'prt_fild11'],
  ['geffen', 'gefenia01'],          // 吉芬噴水池的 NPC
  ['tha_t06', 'tha_t07'],           // 達納托斯塔台上層
  ['abyss_03', 'abyss_04'],
  ['juperos_01', 'juperos_02'],
  ['juperos_02', 'jupe_core'],
  ['kh_dun01', 'kh_dun02'],
  ['iz_dun04', 'iz_dun05'],
  ['odin_tem02', 'odin_past'],      // 古代奧丁神殿：官方從奧丁神殿接任務進去
];
const links = new Set(EXTRA_LINKS.map(([a, b]) => (a < b ? a + '|' + b : b + '|' + a)));
/* 不走的捷徑：工房（普隆德拉↔里希塔樂）、飛空艇、任務圖、攻城城堡。
   跨大陸要靠 NPC 傳送（D1b），這些會讓找路繞出奇怪的路線（例：普隆德拉經飛空艇走到天津） */
const LINK_SKIP = /^(s_atelier|airplane(_\d+)?|airport|que_\w+|prt_cas|\w+g_cas\d+)$/;
const warpFiles = [...walk(path.join(ROOT, 'grf_ex', 'warps_re')), ...walk(path.join(ROOT, 'grf_ex', 'warps_common'))]
  .filter(f => !/guildcastles|pvp/.test(path.basename(f)));    // 攻城、PVP 不收
for (const f of warpFiles) {
  for (const line of fs.readFileSync(f, 'latin1').split('\n')) {
    const m = line.match(/^([\w@-]+),\d+,\d+,\d+\twarp2?\t[^\t]+\t\d+,\d+,([\w@-]+),/);
    if (!m) continue;
    const a = m[1].toLowerCase(), b = m[2].toLowerCase();
    if (a !== b && !LINK_SKIP.test(a) && !LINK_SKIP.test(b)) links.add(a < b ? a + '|' + b : b + '|' + a);
  }
}

// 刷怪：每張圖每種怪的數量（同種多行相加）
const spawns = {};
// 不收：訓練場測試魔物、攻城、公會地城、冠軍魔物
const MOB_SKIP_FILES = /^(tra_fild.*|prt_cas|championmobs|gld_dunSE|gld_re)\.txt$/;
for (const f of walk(path.join(SRC, 'mobs')).filter(f => !MOB_SKIP_FILES.test(path.basename(f)))) {
  for (const line of fs.readFileSync(f, 'latin1').split('\n')) {
    const m = line.match(/^([\w@-]+),\d+,\d+(?:,\d+,\d+)?\t(boss_)?monster\t[^\t]+\t(\d+),(\d+)/);
    if (!m) continue;
    const id = m[1].toLowerCase();
    const s = spawns[id] || (spawns[id] = {});
    s[m[3]] = (s[m[3]] || 0) + +m[4];
  }
}
const mobs = {};
for (const [id, s] of Object.entries(spawns)) {
  mobs[id] = Object.entries(s).sort((a, b) => b[1] - a[1]).map(([mid, n]) => [monName[mid] || '#' + mid, n]);
}

// 顯示得到的圖都要有名字；沒有的列出來
const shown = new Set([...tiles.map(t => t.id), ...dungeons.flatMap(d => d.floors.map(f => f.id))]);
const missing = [...shown].filter(id => !names[id]).sort();
// 只輸出用得到的名字：顯示的圖＋連線會經過的圖
const used = new Set(shown);
for (const l of links) l.split('|').forEach(x => used.add(x));
const nameOut = {};
for (const id of used) if (names[id]) nameOut[id] = names[id];

/* NPC 傳送的城鎮（docs/GAMEPLAY_DIRECTION.md D1b）：清單取 warper.txt 的 Towns 選單。
   六大職業主城 1000z、一開始就開放；其他 5000z，開放等級＝相連地圖（世界地圖表上有等級的）平均，
   一層找不到往外再找一層。等級欄 '110~130' 取中間值。 */
const MAIN_TOWNS = ['prontera', 'morocc', 'geffen', 'payon', 'alberta', 'izlude'];
// 周遭沒有標等級的地圖，等級由使用者指定（2026-11-03）
const TOWN_LV_FIX = { nameless_n: 99, harboro1: 99, ba_maison: 200 };
// 拿掉：無名島重複的一筆；附近沒有怪可打的爪哇、冰霜城堡、托爾火山後勤基地（2026-11-03）
const TOWN_SKIP = ['nameless_i', 'jawaii', 'icecastle', 'thor_camp'];
const lvNum = s => { const n = String(s).split('~').map(Number).filter(x => x > 0); return n.length ? n.reduce((a, b) => a + b) / n.length : null; };
const lvOf = {};
for (const [k, v] of Object.entries(W)) {
  if (k.endsWith('_Dun')) continue;
  v.forEach(e => { const n = lvNum(e[7]); if (n) lvOf[mapId(e[1])] = n; });
}
const adj = {};
for (const l of links) { const [a, b] = l.split('|'); (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
const warperTowns = [];
{
  const src = fs.readFileSync(path.join(SRC, 'warper.txt'), 'latin1');
  const sec = src.slice(src.indexOf('\tTowns:'), src.indexOf('\tFields:'));
  for (const m of sec.matchAll(/Go\("([\w@-]+)"/g)) warperTowns.push(m[1].toLowerCase());
  // mapnametable 沒有的名字用選單上的（選單順序＝T1、T2…＝Go 的順序）
  const big5 = new TextDecoder('big5').decode(fs.readFileSync(path.join(SRC, 'warper.txt')));
  const menu = big5.slice(big5.indexOf('\tTowns:'), big5.indexOf('\tFields:')).split(/T1:/)[0];
  [...menu.matchAll(/"([^"]+)",T\d+/g)].forEach((m, i) => { const id = warperTowns[i]; if (id && !names[id]) names[id] = m[1]; });
}
const towns = warperTowns.filter(id => !TOWN_SKIP.includes(id)).map(id => {
  if (MAIN_TOWNS.includes(id)) return { id, name: names[id] || id, lv: 1, cost: 1000 };
  if (TOWN_LV_FIX[id]) return { id, name: names[id] || id, lv: TOWN_LV_FIX[id], cost: 5000 };
  let ring = [id], lvs = [];
  const seen = new Set(ring);
  for (let depth = 0; depth < 2 && !lvs.length; depth++) {
    ring = ring.flatMap(x => adj[x] || []).filter(x => !seen.has(x) && seen.add(x));
    lvs = ring.map(x => lvOf[x]).filter(Boolean);
  }
  const lv = lvs.length ? Math.round(lvs.reduce((a, b) => a + b) / lvs.length) : null;
  return { id, name: names[id] || id, lv, cost: 5000 };
});

const data = { tiles, dungeons, links: [...links].map(l => l.split('|')), names: nameOut, mobs, towns };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, '/* 由 scripts/gen_worldmap.js 產生，不要手改 */\nconst WORLD = ' + JSON.stringify(data) + ';\n');
/* ---------- 遊戲用 ----------
   地圖清單＝世界地圖表上的圖（所有地區）＋城鎮＋連線經過的圖＋有刷怪的圖。
   monsters：rAthena 刷怪數量當權重；首領階級另外放 WORLD_BOSSES（MVP／迷你王模式才出）；本作沒收的怪略過。 */
const allIds = new Set([...warperTowns, ...Object.keys(spawns)]);
const dungeonFloor = new Set();
const lvStr = {};
for (const [k, v] of Object.entries(W)) {
  if (k.endsWith('_Dun')) continue;
  v.forEach(e => {
    const id = mapId(e[1]);
    allIds.add(id);
    if (e[0] < 100) dungeonFloor.add(id);
    if (e[7]) lvStr[id] = e[7];
  });
}
for (const l of links) l.split('|').forEach(x => allIds.add(x));
const townSet = new Set(warperTowns);
const bosses = {};
const maps = [...allIds].sort().map(id => {
  const town = townSet.has(id);
  const monsters = [];
  for (const [mid, n] of Object.entries(spawns[id] || {})) {
    const key = monKey[mid];
    if (!key || town) continue;
    // G_ 版本對應回一般版本後可能跟原本那行重複：同一隻合併
    if (monBoss[mid]) { const b = bosses[id] = bosses[id] || []; if (!b.includes(key)) b.push(key); }
    else { const o = monsters.find(x => x.id === key); if (o) o.weight += n; else monsters.push({ id: key, weight: n }); }
  }
  monsters.sort((a, b) => b.weight - a.weight);
  return {
    id, imgId: 0, name: names[id] || id, monsters,
    bg: town ? 'map-city' : dungeonFloor.has(id) ? 'map-dungeon' : 'map-field',
    lv: lvStr[id] || '', town,
  };
});
/* 坐船與城內 NPC（D1b，使用者 2026-11-04）：不併進走路的連線，要先走到出發的城鎮才搭得上；
   來回都有。官方是港口／城內的 NPC，rAthena 寫在 NPC 腳本裡、不在傳送點資料。 */
const FERRIES = [
  { from: 'izlude', to: 'izlu2dun', via: '依斯魯得港口的船' },
  { from: 'alberta', to: 'alb2trea', via: '艾爾貝塔港口的船' },
  { from: 'alberta', to: 'tur_dun01', via: '艾爾貝塔港口的船' },
  { from: 'alberta', to: 'malangdo', via: '艾爾貝塔港口的船' },
  { from: 'hugel', to: 'odin_tem01', via: '毀葛港口的船' },
  { from: 'prontera', to: 'prt_mk', via: '普隆德拉城內的 NPC' },
];
/* 官方刷怪檔沒有、本作手動放的首領（使用者 2026-11-08）：
   水晶龍——rAthena 把冰穴的刷點改成任務召喚，本作放回「拉赫冰穴 封印的空間」（MVP 模式才出） */
// 使用者 2026-11-14：魔劍士 達納托斯放塔台最高層；迪文（研究所 MVP）跟其他進階二轉人形王一起放研究所地下 3 樓
const EXTRA_BOSSES = { ice_dun04: ['ktullanux'], tha_t12: ['thanatos'] };
// 整張替換（使用者 2026-11-14）：研究所地下 3 樓放 MVP 型態的 6 隻人形王（官方 lhz_dun03 的 MVP），不放 g_ 護衛版
const REPLACE_BOSSES = { lhz_dun03: ['b_seyren', 'b_eremes', 'b_harword', 'b_magaleta', 'b_katrinn', 'b_shecil'] };
for (const [m, l] of Object.entries(EXTRA_BOSSES)) { const b = bosses[m] = bosses[m] || []; l.forEach(k => { if (!b.includes(k)) b.push(k); }); }
for (const [m, l] of Object.entries(REPLACE_BOSSES)) bosses[m] = l.slice();
const game = {
  main: { img: 'images/worldmap/worldmap.jpg', w: 1280, h: 1024, tiles, dungeons },
  links: [...links].map(l => l.split('|')),
  towns,
  ferries: FERRIES,
};
fs.writeFileSync(OUT_GAME, '/* 由 scripts/gen_worldmap.js 產生，不要手改 */\n'
  + 'const WORLD = ' + JSON.stringify(game) + ';\n'
  + 'const WORLD_MAPS = ' + JSON.stringify(maps) + ';\n'
  + 'const WORLD_BOSSES = ' + JSON.stringify(bosses) + ';\n');
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
copy(path.join(SRC, 'worldmap.jpg'), path.join(ROOT, 'images', 'worldmap', 'worldmap.jpg'));

console.log(`遊戲地圖 ${maps.length} 張（有怪 ${maps.filter(m => m.monsters.length).length}、城鎮 ${maps.filter(m => m.town).length}）、有首領的圖 ${Object.keys(bosses).length}`);
console.log(`格子 ${tiles.length}、地城 ${dungeons.length}（樓層 ${dungeons.reduce((n, d) => n + d.floors.length, 0)}）、連線 ${links.size}、有刷怪 ${Object.keys(mobs).length} 張`);
console.log(`缺中文名 ${missing.length}：${missing.join(' ')}`);
