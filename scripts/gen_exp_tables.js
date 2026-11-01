/* 官方經驗表（T4）
   node scripts/gen_exp_tables.js   → 寫 js/exp_tables.js
   來源：rAthena db/re/job_exp.yml。優先讀 grf_ex/job_exp.yml，沒有的話從 rAthena GitHub 抓。
   陣列 [i] ＝ Lv(i+1) 升到下一級要的經驗（官方表在等級上限放 9999999 之類的哨兵值，原樣保留）。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const LOCAL = path.join(ROOT, 'grf_ex', 'job_exp.yml');
const URL = 'https://raw.githubusercontent.com/rathena/rathena/master/db/re/job_exp.yml';

async function main() {
  const text = fs.existsSync(LOCAL) ? fs.readFileSync(LOCAL, 'utf8') : await (await fetch(URL)).text();
  const groups = text.split(/\n  - Jobs:\n/).slice(1).map(g => {
    const jobs = [...g.matchAll(/^ {6}(\w+): true/mg)].map(m => m[1]);
    const sec = name => {
      const i = g.indexOf('\n    ' + name + ':\n');
      if (i < 0) return null;
      const rest = g.slice(i + name.length + 7);
      const end = rest.search(/\n {4}\w/);
      return [...(end < 0 ? rest : rest.slice(0, end)).matchAll(/Exp: (\d+)/g)].map(m => +m[1]);
    };
    return { jobs, base: sec('BaseExp'), job: sec('JobExp') };
  });
  const base = first => groups.find(g => g.base && g.jobs[0] === first).base;
  const job = first => groups.find(g => g.job && g.jobs[0] === first).job;
  const T = {
    base: base('Novice'),              // 一般（新手、一轉、二轉）1~99
    baseHigh: base('Novice_High'),     // 轉生後 1~99
    base3: base('Rune_Knight'),        // 三轉 1~200
    base4: base('Dragon_Knight'),      // 四轉 1~275（本作 200 以上借用）
    jobNovice: job('Novice'), jobNoviceHigh: job('Novice_High'),
    job1: job('Swordman'), job1High: job('Swordman_High'), jobSuperNovice: job('Super_Novice'),
    job2: job('Knight'), job2High: job('Lord_Knight'), job3: job('Rune_Knight'),
  };
  const body = Object.entries(T).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n');
  fs.writeFileSync(path.join(ROOT, 'js', 'exp_tables.js'),
    `/* 由 scripts/gen_exp_tables.js 產生，勿手改。來源：rAthena db/re/job_exp.yml。\n   [i] ＝ Lv(i+1) 升下一級所需經驗。 */\nconst EXP_TABLES = {\n${body}\n};\n`);
  console.log(Object.entries(T).map(([k, v]) => `${k} ${v.length}`).join('、'));
}
main();
