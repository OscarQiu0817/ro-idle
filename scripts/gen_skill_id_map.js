/* 技能 id → rAthena 技能名稱（小寫）對照表，給 3a 全專案改名用。
   node scripts/gen_skill_id_map.js → docs/SKILL_ID_MAP.md ＋ scripts/out/skill_id_map.json
   依據（依序）：
     1. 遊戲 id 本身就是 rAthena 名稱（lk_spiralpierce）
     2. 技能名稱裡的英文 ＝ skill_db Description
     3. 中文名稱 ＝ ro_skill_data 的 nameZh
     4. 遊戲 id ＝ rAthena 名稱去掉職業前綴（firebolt ↔ MG_FIREBOLT）
   多種依據指向不同技能、或同一個 rAthena 技能被多個遊戲技能對到，都列為「需確認」。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGameData, ROOT } = require('./lib/game_data');
const { readYamlBody } = require('./lib/rathena');

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function loadNtome() {
  const dir = path.join(ROOT, 'ro_skill_data', 'js_data');
  const byZh = new Map();
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const ctx = {};
    vm.runInNewContext(fs.readFileSync(path.join(dir, f), 'utf8') + ';this.o = class_skill;', ctx);
    for (const [aegis, v] of Object.entries(ctx.o || {})) {
      const zh = String(v.nameZh || '').replace(/\s+/g, '');
      if (!zh) continue;
      if (!byZh.has(zh)) byZh.set(zh, new Set());
      byZh.get(zh).add(aegis);
    }
  }
  return byZh;
}

function main() {
  const g = loadGameData();
  const db = readYamlBody(path.join('grf_ex', 'skill_db.yml'));
  const names = new Set(db.map(s => s.Name));
  const byDesc = new Map();
  const bySuffix = new Map();
  for (const s of db) {
    const d = norm(s.Description);
    if (d) { if (!byDesc.has(d)) byDesc.set(d, new Set()); byDesc.get(d).add(s.Name); }
    const suf = norm(String(s.Name).replace(/^[A-Z0-9]+_/, ''));
    if (!bySuffix.has(suf)) bySuffix.set(suf, new Set()); bySuffix.get(suf).add(s.Name);
  }
  const byZh = loadNtome();

  const rows = [];
  for (const sk of Object.values(g.SKILLS)) {
    const zh = String(sk.name).replace(/\s+[A-Za-z].*$/, '').replace(/\s+/g, '');
    const en = (String(sk.name).match(/[A-Za-z][A-Za-z0-9 '’:\-.()]*$/) || [''])[0];
    const votes = [];
    const up = sk.id.toUpperCase();
    if (names.has(up)) votes.push(['id', [up]]);
    if (en && byDesc.has(norm(en))) votes.push(['英文名', [...byDesc.get(norm(en))]]);
    if (byZh.has(zh)) votes.push(['中文名', [...byZh.get(zh)].filter(n => names.has(n))]);
    if (bySuffix.has(norm(sk.id))) votes.push(['id 後綴', [...bySuffix.get(norm(sk.id))]]);
    const cands = new Set(votes.flatMap(v => v[1]));
    let pick = null, status;
    if (votes.length && votes[0][0] === 'id') { pick = up; status = 'ok'; }
    else if (cands.size === 1) { pick = [...cands][0]; status = 'ok'; }
    else if (cands.size > 1) {
      // 多數決：被最多依據指到的那個；平手列需確認
      const score = {};
      votes.forEach(v => v[1].forEach(n => { score[n] = (score[n] || 0) + 1 / v[1].length; }));
      const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
      pick = ranked[0][0];
      status = ranked[1] && ranked[1][1] === ranked[0][1] ? '需確認' : 'ok';
    } else status = '對不到';
    rows.push({ id: sk.id, name: sk.name, type: sk.type, pick, status,
      basis: votes.map(v => v[0] + '→' + v[1].join('/')).join('；'), cands: [...cands] });
  }
  // 同一個 rAthena 技能被多個遊戲技能對到
  const used = {};
  rows.filter(r => r.pick).forEach(r => (used[r.pick] = used[r.pick] || []).push(r.id));
  rows.forEach(r => { if (r.pick && used[r.pick].length > 1) { r.status = '需確認'; r.dup = used[r.pick].filter(x => x !== r.id); } });

  fs.mkdirSync(path.join(ROOT, 'scripts', 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'scripts', 'out', 'skill_id_map.json'), JSON.stringify(rows, null, 1));

  const esc = s => String(s).replace(/\|/g, '\\|');
  const sec = (title, list, cols) => `## ${title}（${list.length}）\n\n| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|\n`
    + list.map(r => '| ' + [`\`${r.id}\``, esc(r.name), r.pick ? `\`${r.pick.toLowerCase()}\`` : '—', esc(r.basis || '—') + (r.dup ? `；同對到 ${r.dup.join('、')}` : '')].join(' | ') + ' |').join('\n') + '\n\n';
  const cols = ['遊戲 id', '名稱', '新 id（rAthena 小寫）', '依據'];
  const bad = rows.filter(r => r.status === '對不到');
  const unsure = rows.filter(r => r.status === '需確認');
  // 只靠一種依據、而且是中文名的：遊戲 id 跟實際技能常常不一致（例：firebolt_wiz 其實是火狩），列出來給人看
  const zhOnly = rows.filter(r => r.status === 'ok' && r.basis && !r.basis.includes('；') && r.basis.startsWith('中文名'));
  const ok = rows.filter(r => r.status === 'ok' && !zhOnly.includes(r));
  const md = '# 技能 id 對照表（3a）\n\n'
    + '> `node scripts/gen_skill_id_map.js` 產生。新 id ＝ rAthena 技能名稱轉小寫。\n'
    + '> 依據：id 本身／技能名稱裡的英文＝skill_db Description／中文名＝ro_skill_data nameZh／id＝rAthena 名稱去掉職業前綴。\n\n'
    + `共 ${rows.length} 個技能：對到 ${ok.length}、只靠中文名對到 ${zhOnly.length}、需確認 ${unsure.length}、對不到 ${bad.length}。\n\n`
    + sec('對不到（請決定保留、刪除或指定對應）', bad, cols)
    + sec('需確認（依據互相衝突，或多個技能對到同一個）', unsure, cols)
    + sec('只靠中文名對到（遊戲 id 與技能內容不一致，請過目）', zhOnly, cols)
    + sec('對到（兩種以上依據一致，或 id 本身就是 rAthena 名稱）', ok, cols);
  fs.writeFileSync(path.join(ROOT, 'docs', 'SKILL_ID_MAP.md'), md);
  console.log('技能', rows.length, '｜對到', ok.length, '｜需確認', unsure.length, '｜對不到', bad.length);
}

main();
