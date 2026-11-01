/* 裝備名稱改動對照表：比對 data.js 原名稱與 js/item_identity.js 的新名稱。
   node scripts/report_item_names.js → docs/ITEM_NAME_CHANGES.md、docs/ITEM_NAME_CHANGES.csv */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGameData, ROOT } = require('./lib/game_data');

const WEAPON_CAT_ZH = {
  sword: '單手劍', tsword: '雙手劍', dagger: '短劍', katar: '拳刃', axe1: '單手斧', axe2: '雙手斧', mace: '鈍器',
  spear: '矛', rod: '杖', book: '書', bow: '弓', knuckle: '拳套', instrument: '樂器', whip: '鞭子', huuma: '風魔飛鏢',
  pistol: '槍械', rifle: '槍械', shotgun: '槍械', gatling: '槍械', grenade: '槍械',
};
const ARMOR_TYPE_ZH = { headgear: '頭飾', leather: '鎧甲', armor: '鎧甲', footgear: '鞋子', garment: '披肩', shield: '盾牌', accessory: '飾品' };

function main() {
  const g = loadGameData();
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'item_identity.js'), 'utf8') + ';this.P = ITEM_IDENTITY;', ctx);
  const P = ctx.P;

  const strip = s => String(s).replace(/\s*\[\d\]$/, '');
  const groups = {};
  let total = 0, suffixOnly = 0;
  for (const id of Object.keys(P)) {
    const p = P[id];
    const it = g.ITEMS[id];
    if (!p.name || !it || (it.type !== 'weapon' && it.type !== 'armor')) continue;
    const cat = it.type === 'weapon'
      ? '武器／' + (WEAPON_CAT_ZH[p.weaponCat || it.weaponCat] || '其他')
      : '防具／' + (ARMOR_TYPE_ZH[p.armorType || it.armorType] || '其他');
    const only = strip(it.name) === strip(p.name);
    if (only) suffixOnly++;
    (groups[cat] = groups[cat] || []).push({ from: it.name, to: p.name, id, only });
    total++;
  }
  const cats = Object.keys(groups).sort((a, b) =>
    (a.startsWith('武器') ? 0 : 1) - (b.startsWith('武器') ? 0 : 1) || a.localeCompare(b, 'zh-Hant'));
  const esc = s => String(s).replace(/\|/g, '\\|');

  let md = '# 裝備名稱改動對照表\n\n'
    + '> `node scripts/report_item_names.js` 產生。比對 data.js 原名稱與 `js/item_identity.js` 的新名稱。\n'
    + '> 新名稱取自台服客戶端 itemInfo，裝備加上 rAthena 孔數後綴 ` [N]`。\n'
    + '> 配對：道具 id 對 rAthena AegisName，對不到再用圖示編號（imgId）對 rAthena 道具編號。\n\n'
    + `共 ${total} 件裝備改名，其中 ${suffixOnly} 件只有孔數後綴不同（備註標「孔數」）。\n\n`
    + '## 目錄\n\n| 類別 | 件數 |\n|---|---|\n'
    + cats.map(c => `| [${c}](#${c.replace('／', '')}) | ${groups[c].length} |`).join('\n') + '\n\n';
  for (const c of cats) {
    md += `## ${c}\n\n| 原名稱 | 新名稱 | 道具 id | 備註 |\n|---|---|---|---|\n`
      + groups[c].sort((a, b) => a.from.localeCompare(b.from, 'zh-Hant'))
        .map(r => `| ${esc(r.from)} | ${esc(r.to)} | \`${r.id}\` | ${r.only ? '孔數' : ''} |`).join('\n') + '\n\n';
  }
  fs.writeFileSync(path.join(ROOT, 'docs', 'ITEM_NAME_CHANGES.md'), md);

  const q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const csv = '﻿類別,原名稱,新名稱,道具id,只改孔數\n'
    + cats.flatMap(c => groups[c].map(r => [c, r.from, r.to, r.id, r.only ? '是' : ''].map(q).join(','))).join('\n');
  fs.writeFileSync(path.join(ROOT, 'docs', 'ITEM_NAME_CHANGES.csv'), csv);
  console.log('裝備改名', total, '（只改孔數', suffixOnly, '）→ docs/ITEM_NAME_CHANGES.md / .csv');
}

main();
