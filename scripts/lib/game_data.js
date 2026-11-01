/* 在 Node 載入遊戲資料表（MONSTERS / MAPS / ITEMS…），不載 engine.js 與 ui.js。
   載入順序讀 index.html，載到 data.js 為止。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

function loadGameData() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = [];
  const re = /<script\s+src="([^"]+)"><\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    files.push(m[1]);
    if (m[1] === 'js/data.js') break;
  }
  const ctx = { console: { log() {}, warn() {}, error: console.error }, window: {}, document: undefined };
  ctx.window = ctx;
  vm.createContext(ctx);
  // const 宣告不會掛到 context 上，結尾補一行把需要的表匯出
  const src = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
    '\n;this.__out = { MONSTERS, MAPS, ITEMS, CARDS, SKILLS, JOB_TREE, jobCanUseWeapon };';
  vm.runInContext(src, ctx, { filename: 'game_data' });
  return ctx.__out;
}

module.exports = { loadGameData, ROOT };
