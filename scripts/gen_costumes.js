/* 頭部服飾清單（使用者 2026-11-21：實裝 RO 服飾，先做頭部）→ js/costumes.js
   ＋ 要另外轉圖的頭飾清單 → scripts/out/costume_hats.json（給 scripts/gen_costume_hats.py）。
   規則：rAthena item_db 裡部位是 Costume_Head_*、有 View 的服飾；
     名稱用台服 itemInfo（沒有中文名的不收）；
     外觀：紙娃娃已經有這個 View 的頭飾圖層就直接用，否則 grf_ex/sprite/악세사리 男女都有圖才轉；都沒有＝不收。
   2026-11-22 加披肩服飾（Costume_Garment）：View 對 spriterobeid／spriterobename 找 grf_ex/sprite/로브 資料夾，
     有資料夾才收；圖層由 scripts/gen_costume_robes.py 轉（清單寫在 scripts/out/costume_robes.json），一律 lazy。
   node scripts/gen_costumes.js */
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/game_data');
const { loadItemDb, loadItemInfo } = require('./lib/rathena');

// lub 字串是 EUC-KR（scripts/lib/lub.js 預設用 utf8 讀，韓文檔名會壞掉）：載入時換掉解碼
function readLubKr(file) {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/lib/lub.js'), 'utf8')
    .replace("d.toString('utf8', pos, pos + n - 1)", "new TextDecoder('euc-kr').decode(d.subarray(pos, pos + n - 1))");
  const m = { exports: {} };
  new Function('module', 'exports', 'require', src)(m, m.exports, require);
  return m.exports.readLub(path.join(ROOT, file));
}

const SLOT = { Costume_Head_Top: 'head_top', Costume_Head_Mid: 'head_mid', Costume_Head_Low: 'head_bottom' };
const db = loadItemDb();
const info = loadItemInfo();
const AN = readLubKr('grf_ex/accname.lub').AccNameTable;
const AI = readLubKr('grf_ex/accessoryid.lub').ACCESSORY_IDs;
const viewName = {};
for (const [k, v] of Object.entries(AN)) { const id = AI[k.replace('ACCESSORY_IDs.', '')]; if (id != null) viewName[id] = v; }
const layers = fs.readFileSync(path.join(ROOT, 'js/paperdoll_layers.js'), 'utf8');
const hatViews = new Set([...layers.matchAll(/"hat\/(\d+)\/male"/g)].map(m => Number(m[1])));
const sprExists = (g, n) => fs.existsSync(path.join(ROOT, 'grf_ex/sprite/악세사리', g, g + n + '.spr'));

const RN = readLubKr('grf_ex/spriterobename.lub');
const RI = readLubKr('grf_ex/spriterobeid.lub').SPRITE_ROBE_IDs;
const robeKey = {};
for (const [k, v] of Object.entries(RI)) robeKey[v] = k;
const robeDirs = new Map(fs.readdirSync(path.join(ROOT, 'grf_ex/sprite/로브')).map(d => [d.toLowerCase(), d]));
function robeFolder(it) {
  const k = robeKey[it.View], kk = 'SPRITE_ROBE_IDs.' + k;
  const cands = [it.AegisName, k && k.replace(/^ROBE_/, ''), RN.RobeNameTable_Eng[kk], RN.RobeNameTable[kk]];
  return cands.filter(Boolean).map(c => robeDirs.get(String(c).toLowerCase())).find(Boolean) || null;
}

const out = {}, convert = {}, robes = {};
const stat = { costume: 0, noName: 0, noSprite: 0, ready: 0, lazy: 0 };
for (const it of db.values()) {
  const loc = it.Locations || {};
  if (loc.Costume_Garment && it.View) {
    const tw = info.get(it.Id);
    const name = tw && tw.name && tw.name.replace(/\\/g, '').replace(/^\s*[（(]服飾[)）]\s*/, '').trim();
    const folder = name && /[一-鿿]/.test(name) && robeFolder(it);
    if (folder) {
      robes[folder] = 1;
      stat.robe = (stat.robe || 0) + 1;
      out['cos_' + it.Id] = { id: 'cos_' + it.Id, raId: it.Id, name, slots: ['garment'], robe: folder, lazy: true };
    }
    continue;
  }
  const slots = Object.keys(SLOT).filter(k => loc[k]).map(k => SLOT[k]);
  if (!slots.length || !it.View) continue;
  stat.costume++;
  const tw = info.get(it.Id);
  // 台服名稱有的帶「(服飾)」有的沒有：統一拿掉，畫面上自己加
  const name = tw && tw.name && tw.name.replace(/\\/g, '').replace(/^\s*[（(]服飾[)）]\s*/, '').trim();
  if (!name || !/[一-鿿]/.test(name)) { stat.noName++; continue; }
  let lazy = false;
  if (!hatViews.has(it.View)) {
    const n = viewName[it.View];
    if (!n || !sprExists('남', n) || !sprExists('여', n)) { stat.noSprite++; continue; }
    convert[it.View] = n;
    lazy = true;
  }
  lazy ? stat.lazy++ : stat.ready++;
  out['cos_' + it.Id] = { id: 'cos_' + it.Id, raId: it.Id, name, slots, view: it.View, lazy: lazy || undefined };
}
const js = '/* 由 scripts/gen_costumes.js 產生，不要手改。頭部＋披肩服飾：只換外觀。lazy＝圖層在 js/costume_hats/<view>.js、js/costume_robes/<robe>.js，穿上或預覽時才載入 */\n'
  + 'const COSTUMES = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'js/costumes.js'), js);
fs.mkdirSync(path.join(ROOT, 'scripts/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scripts/out/costume_hats.json'), JSON.stringify(convert));
fs.writeFileSync(path.join(ROOT, 'scripts/out/costume_robes.json'), JSON.stringify(Object.keys(robes)));
console.log(stat, 'views to convert', Object.keys(convert).length, 'js', js.length, 'bytes');
