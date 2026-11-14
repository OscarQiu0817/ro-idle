/* 補上漏轉的裝備（使用者 2026-11-15：洞冒險衣找不到，其他裝備一起排查補上）
   早期轉資料時，同一個台服名稱的有洞／無洞版本只留了一件（冒險衣 [1] 被併成冒險衣），
   另有一批官方有怪會掉、但從沒轉進來的裝備。

   node scripts/gen_missing_equips.js          → 只印報告
   node scripts/gen_missing_equips.js --write  → 寫進 js/data.js（道具＋怪物掉落）

   挑選：rAthena item_db_equip 有、data.js 沒有（含被 item_prune 刪掉的都算「有」，不重複加）、
         台服 itemInfo 有名稱、官方（mob_db_re）有本作地圖上的怪會掉、要求等級 ≤99、有範圍內職業能穿。
   道具：名稱與說明照台服 itemInfo（說明格式照 data.js 既有的：去色碼、「系列: X」、裝備職業後加「可以裝備」），
         數值照 rAthena（攻擊、防禦、重量 ÷10、價格、孔數、要求等級）；
         類別圖示照同類別既有道具最常用的。職業／部位／武器類別交給 gen_item_identity.js，效果交給 gen_item_effects.js。
   掉落：本作掉率＝官方 ×2（例：Phracon 43 → 0.86%）。
         怪物原本掉的是同名的另一個版本、而官方沒有那個版本 → 換成新道具、沿用原機率；否則新增一筆。 */
const fs = require('fs');
const path = require('path');
const { loadGameData, ROOT } = require('./lib/game_data');
const { readYamlBody, loadItemInfo } = require('./lib/rathena');

const DATA = path.join(ROOT, 'js', 'data.js');
const raw = fs.readFileSync(DATA, 'utf8');
const { ITEMS, MONSTERS, MAPS } = loadGameData();
const eq = readYamlBody('grf_ex/item_db_equip.yml');
const mobs = readYamlBody('mob_db_re.yml');
const info = loadItemInfo();

const SCOPE = new Set(['All', 'Novice', 'SuperNovice', 'Swordman', 'Knight', 'Crusader', 'Mage', 'Wizard', 'Sage', 'Archer', 'Hunter',
  'BardDancer', 'Acolyte', 'Priest', 'Monk', 'Merchant', 'Blacksmith', 'Alchemist', 'Thief', 'Assassin', 'Rogue']);
const rawImg = new Set([...raw.matchAll(/"imgId":(\d+),/g)].map(m => +m[1]));
const itemByImg = {};
Object.values(ITEMS).forEach(it => { if (!(it.imgId in itemByImg)) itemByImg[it.imgId] = it; });
const eqById = {}, eqByAeg = {};
eq.forEach(e => { eqById[e.Id] = e; eqByAeg[e.AegisName] = e; });
const monByImg = {};
Object.values(MONSTERS).forEach(m => (monByImg[m.imgId] = monByImg[m.imgId] || []).push(m.id));
const onMap = new Set();
MAPS.forEach(mp => (mp.monsters || []).forEach(x => onMap.add(x.id || x)));

/* 類別鍵：武器看 SubType，防具看主要部位 */
const LOC_ORDER = ['Head_Top', 'Head_Mid', 'Head_Low', 'Armor', 'Left_Hand', 'Garment', 'Shoes', 'Right_Accessory', 'Left_Accessory', 'Both_Accessory',
  'Costume_Head_Top', 'Costume_Head_Mid', 'Costume_Head_Low', 'Costume_Garment'];
const catOf = e => e.Type === 'Weapon' ? 'W:' + (e.SubType || '') : 'A:' + (LOC_ORDER.find(l => e.Locations && e.Locations[l]) || Object.keys(e.Locations || {})[0] || '');
const tally = {};
for (const e of eq) {
  const it = itemByImg[e.Id];
  if (!it) continue;
  const c = catOf(e);
  const k = JSON.stringify([it.type, it.icon, it.weaponType || null, it.armorType || null]);
  (tally[c] = tally[c] || {})[k] = (tally[c][k] || 0) + 1;
}
const typical = c => {
  const t = tally[c];
  if (!t) return null;
  const [type, icon, weaponType, armorType] = JSON.parse(Object.entries(t).sort((a, b) => b[1] - a[1])[0][0]);
  return { type, icon, weaponType, armorType };
};

/* 台服 lua 字串：Big5 第二位元組是 0x5C 的字後面會多一個反斜線（骷髏\鎧甲），一併拿掉 */
const unesc = s => String(s || '').replace(/\\(.)/g, '$1');
/* 說明照 data.js 既有格式 */
function descOf(lines) {
  return lines.map(l => unesc(l).replace(/\^[0-9a-fA-F]{6}/g, '').replace(/\s*:\s*/g, ': ').replace(/\s+/g, ' ').trim())
    .map(l => l.replace(/^(.*?)裝備: (.+)$/, (m, pre, jobs) => pre + '裝備: ' + (/^全職業$/.test(jobs.trim()) ? '所有職業' : jobs.trim() + '可以裝備')))
    .filter(Boolean).join(' ');
}
function keyOf(e) {
  let k = e.AegisName.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!k || ITEMS[k] || /^\d/.test(k)) k = 'item_' + e.Id;
  return k;
}

/* ---- 挑選 ---- */
const picked = {};
for (const mob of mobs) {
  for (const d of (mob.Drops || []).concat(mob.MvpDrops || [])) {
    const e = eqByAeg[d.Item];
    if (!e || rawImg.has(e.Id) || !info.has(e.Id) || !info.get(e.Id).name) continue;
    const keys = (monByImg[mob.Id] || []).filter(k => onMap.has(k));
    if (!keys.length) continue;
    const jobs = Object.entries(e.Jobs || { All: true }).filter(([, v]) => v).map(([j]) => j);
    if ((e.EquipLevelMin || 0) > 99 || !jobs.some(j => SCOPE.has(j))) continue;
    const p = picked[e.Id] = picked[e.Id] || { e, drops: [] };
    keys.forEach(k => p.drops.push({ mon: k, aeg: mob.AegisName, rate: d.Rate, mobDrops: (mob.Drops || []).map(x => x.Item) }));
  }
}

/* ---- 道具 ---- */
const newItems = [];
for (const { e } of Object.values(picked)) {
  const tw = info.get(e.Id);
  const t = typical(catOf(e)) || { type: e.Type === 'Weapon' ? 'weapon' : 'armor', icon: e.Type === 'Weapon' ? '⚔️' : '🦺', weaponType: null, armorType: null };
  const slots = e.Slots || 0;
  const it = { id: keyOf(e), imgId: e.Id, name: unesc(tw.name) + (slots ? ` [${slots}]` : ''), type: t.type, icon: t.icon };
  if (t.weaponType) it.weaponType = t.weaponType;
  if (t.armorType) it.armorType = t.armorType;
  const gear = t.type === 'weapon' || t.type === 'armor';   // 服飾在本作是收藏品（material），不帶防禦與孔數
  if (e.Type === 'Weapon') { it.weaponLv = e.WeaponLevel || 1; it.atk = e.Attack || 0; if (e.MagicAttack) it.matk = e.MagicAttack; }
  else if (gear) it.def = e.Defense || 0;
  it.weight = Math.round((e.Weight || 0) / 10);
  it.sell = Math.floor((e.Buy || 0) / 2);
  it.buyPrice = e.Buy || 0;
  it.desc = descOf(tw.desc);
  if (gear) it.slots = slots;
  if (gear && e.EquipLevelMin > 1) it.reqLevel = e.EquipLevelMin;
  newItems.push(it);
}

/* ---- 掉落 ---- */
const sibKeys = e => eq.filter(x => x.Name === e.Name && x.Id !== e.Id && itemByImg[x.Id]).map(x => ({ key: itemByImg[x.Id].id, aeg: x.AegisName }));
const dropEdits = {};   // 怪物 key → [{op:'swap', from, to} | {op:'add', to, chance}]
for (const { e, drops } of Object.values(picked)) {
  const key = newItems.find(i => i.imgId === e.Id).id;
  const sibs = sibKeys(e);
  for (const d of drops) {
    const cur = MONSTERS[d.mon].drops || [];
    const swap = sibs.find(s => cur.some(x => x.item === s.key) && !d.mobDrops.includes(s.aeg));
    const list = dropEdits[d.mon] = dropEdits[d.mon] || [];
    if (list.some(x => x.to === key)) continue;
    if (swap) list.push({ op: 'swap', from: swap.key, to: key });
    else list.push({ op: 'add', to: key, chance: Math.min(1, Math.round(d.rate * 2) / 10000) });
  }
}

/* ---- 報告 ---- */
console.log(`補上 ${newItems.length} 件裝備、改 ${Object.keys(dropEdits).length} 隻怪的掉落`);
for (const it of newItems) {
  const who = Object.entries(dropEdits).filter(([, l]) => l.some(x => x.to === it.id))
    .map(([m, l]) => { const x = l.find(y => y.to === it.id); return MONSTERS[m].name + (x.op === 'swap' ? `（換掉 ${ITEMS[x.from].name}）` : ` ${(x.chance * 100).toFixed(2)}%`); });
  console.log(`  ${it.imgId} ${it.id} ${it.name} ← ${who.join('、')}`);
}

if (process.argv.includes('--write')) {
  let s = raw;
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const itemsEnd = s.indexOf(nl + '};', s.indexOf('const ITEMS = {'));
  const block = newItems.map(it => `  ${JSON.stringify(it.id)}: ${JSON.stringify(it)},`).join(nl);
  s = s.slice(0, itemsEnd) + nl + block + s.slice(itemsEnd);
  for (const [mon, list] of Object.entries(dropEdits)) {
    // 怪物那一行有兩種寫法：物件字面（drops:[{item:'x',chance:1}]）與 JSON（"drops":[{"item":"x","chance":1}]）
    const json = new RegExp(`^  "${mon}": \\{`, 'm').test(s);
    const re = json ? new RegExp(`^(  "${mon}": \\{.*?"drops":\\[)(.*?)(\\])`, 'm')
      : new RegExp(`^(  ${mon}: \\{id:'${mon}'.*?drops:\\[)(.*?)(\\])`, 'm');
    const m = re.exec(s);
    if (!m) { console.log('找不到怪物那一行', mon); continue; }
    let body = m[2];
    const one = (item, chance) => json ? `{"item":"${item}",` + (chance == null ? '' : `"chance":${chance}}`) : `{item:'${item}',` + (chance == null ? '' : `chance:${chance}}`);
    for (const x of list) {
      if (x.op === 'swap') body = body.replace(one(x.from), one(x.to));
      else body += (body ? ',' : '') + one(x.to, x.chance);
    }
    s = s.slice(0, m.index) + m[1] + body + m[3] + s.slice(m.index + m[0].length);
  }
  fs.writeFileSync(DATA, s);
  console.log('寫入', DATA);
}
