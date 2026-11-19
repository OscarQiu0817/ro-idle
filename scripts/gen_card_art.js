/* T44 補卡片插圖（2026-11-19）：images/cards/<imgId>.jpg 缺的卡片，從 grf 的卡片插圖補。
   來源：grf_ex/유저인터페이스/cardbmp/<名稱>.bmp（300×400），轉成跟現有一樣的 240×320 jpg。
   檔名對法：卡片 id 本身 → 去掉 sealed_（封印卡沿用原卡插圖）→ 去掉結尾 _ ／_e ／_h 等變體後綴。
   node scripts/gen_card_art.js           → 列出對得上／對不上的
   node scripts/gen_card_art.js --write   → 實際轉檔（需要 python + Pillow） */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadGameData, ROOT } = require('./lib/game_data');

const { CARDS, ITEMS } = loadGameData();
const BMP_DIR = path.join(ROOT, 'grf_ex', '유저인터페이스', 'cardbmp');
const OUT = path.join(ROOT, 'images', 'cards');
const bmp = new Map(fs.readdirSync(BMP_DIR).map(f => [f.toLowerCase().replace(/\.bmp$/, ''), f]));
const have = new Set(fs.readdirSync(OUT).map(f => f.replace(/\.jpg$/, '')));

function candidates(id) {
  const base = id.replace(/^sealed_/, '');
  const list = [id, base, base.replace(/_+$/, ''), base.replace(/_(e|h|c)$/, ''), base.replace(/_(e|h|c)$/, '').replace(/_+$/, '')];
  if (!/_card$/.test(base)) list.push(base.replace(/_c$/, '') + '_card');
  return [...new Set(list)];
}

const jobs = [], miss = [];
Object.values(CARDS).filter(c => c && c.slot !== 'enchant').forEach(c => {
  const it = ITEMS[c.id];
  if (!it || !it.imgId || have.has(String(it.imgId))) return;
  const k = candidates(c.id).find(x => bmp.has(x));
  if (k) jobs.push([path.join(BMP_DIR, bmp.get(k)), path.join(OUT, it.imgId + '.jpg')]);
  else miss.push(c.id);
});
console.log(`缺插圖 ${jobs.length + miss.length} 張：對得上 ${jobs.length}、對不上 ${miss.length}`);
if (miss.length) console.log('對不上：' + miss.join(' '));

if (process.argv.includes('--write') && jobs.length) {
  const py = 'import sys,json\nfrom PIL import Image\nfor s,d in json.load(sys.stdin):\n'
    + '    Image.open(s).convert("RGB").resize((240,320),Image.LANCZOS).save(d,quality=85)\n';
  execFileSync('python', ['-c', py], { input: JSON.stringify(jobs), stdio: ['pipe', 'inherit', 'inherit'] });
  console.log(`已寫入 ${jobs.length} 張到 images/cards/`);
}
