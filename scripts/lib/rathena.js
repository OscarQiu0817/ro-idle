/* 讀 rAthena 原始資料（grf_ex/）與台服 itemInfo。 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ROOT } = require('./game_data');

const GRF = path.join(ROOT, 'grf_ex');

function readYamlBody(file) {
  // json:true 容許重複鍵（rAthena 有少數重複的 RaceGroups）
  return yaml.load(fs.readFileSync(path.join(ROOT, file), 'utf8'), { json: true }).Body || [];
}

/* item_db_equip / etc / usable 合併成 Id → 條目 */
function loadItemDb() {
  const byId = new Map();
  for (const f of ['item_db_equip.yml', 'item_db_etc.yml', 'item_db_usable.yml']) {
    for (const it of readYamlBody(path.join('grf_ex', f))) byId.set(it.Id, it);
  }
  return byId;
}

/* itemInfo_true.txt（Big5 的 Lua 表）→ Id → { name, slots, desc } */
function loadItemInfo() {
  const buf = fs.readFileSync(path.join(GRF, 'itemInfo_true.txt'));
  const text = new TextDecoder('big5').decode(buf);
  const out = new Map();
  const re = /\[(\d+)\]\s*=\s*\{([\s\S]*?)\n\t\},/g;
  let m;
  while ((m = re.exec(text))) {
    const body = m[2];
    const name = (body.match(/(?<![a-zA-Z])identifiedDisplayName\s*=\s*"([^"]*)"/) || [])[1];
    const slots = Number((body.match(/slotCount\s*=\s*(\d+)/) || [])[1] || 0);
    const descBlock = (body.match(/(?<![a-zA-Z])identifiedDescriptionName\s*=\s*\{([\s\S]*?)\n\t\t\}/) || [])[1] || '';
    const desc = [...descBlock.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(x => x[1]);
    out.set(Number(m[1]), { name, slots, desc });
  }
  return out;
}

module.exports = { readYamlBody, loadItemDb, loadItemInfo, GRF };
