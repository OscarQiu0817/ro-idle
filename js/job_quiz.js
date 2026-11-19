/* T62 轉職考試（使用者 2026-11-19）
   只有一轉→二轉要考：到公會 NPC 應考，問答題 10 題、答對 7 題過關，沒過可以馬上重考。
   初心者→一轉、進階二轉、三轉照舊對話就轉。
   題庫全部從遊戲資料現場產生（不手寫題目，資料改了題目跟著對）：
     技能  目標職業與目前一轉的技能：「XX」的效果是？／這段效果是哪個技能？
     卡片  會掉落的怪物卡片效果
     魔物  出沒地圖上的一般怪：屬性、種族、體型
     屬性  攻擊哪個屬性最有效（ELEMENT_CHART）
     精煉  精煉礦石的用途（REFINEMENT_MATERIALS）
   通過記在 state.jobQuizPassed[職業]，按了確認轉職前反悔也不用重考。 */

const JOB_QUIZ_COUNT = 10;
const JOB_QUIZ_PASS = 7;
const JOB_QUIZ_REASON = '要先通過轉職考試。';
const QUIZ_RACE = { plant: '植物', insect: '昆蟲', brute: '動物', formless: '無形', fish: '魚貝',
  undead: '不死', humanoid: '人型', demon: '惡魔', dragon: '龍族', angel: '天使' };
const QUIZ_SIZE = { small: '小型', medium: '中型', large: '大型' };

function jobQuizRequired(targetId) {
  const t = JOB_TREE[targetId];
  return !!t && t.tier === 2 && !((state.jobQuizPassed || {})[targetId]);
}

// 說明文字整理成選項：去掉「被動技能。」、括號註記、數值區間保留，太長截斷
function quizText(s, max) {
  let x = String(s || '').replace(/（[^）]*）|\([^)]*\)/g, '').replace(/^被動技能[。，]?/, '').replace(/[。，,]\s*[，,]+/g, '，').replace(/\s+/g, ' ').trim();
  const lim = max || 54;
  if (x.length > lim) {
    const cut = x.slice(0, lim);
    const p = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('，'));
    x = (p > 20 ? cut.slice(0, p) : cut) + '…';
  }
  return x.replace(/[。，、；]$/, '');
}
const quizSkillName = sk => String(sk.name || sk.id).split(' ')[0];
function quizShuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const quizPick = (a, rnd) => a[Math.floor(rnd() * a.length)];
// 正解＋從 pool 挑 3 個不重複的干擾項；湊不到 4 個回 null
function quizMake(kind, q, right, pool, rnd) {
  const wrong = quizShuffle([...new Set(pool.filter(x => x && x !== right))], rnd).slice(0, 3);
  if (wrong.length < 3) return null;
  const options = quizShuffle([right, ...wrong], rnd);
  return { kind, q, options, answer: options.indexOf(right) };
}

function jobSkillIds(jobId) {
  return ((JOB_TREE[jobId] || {}).skills || []).map(e => typeof e === 'string' ? e : (e && (e.id || e[0])))
    .filter(id => SKILLS[id] && SKILLS[id].desc && !SKILLS[id].autoGrant && !SKILLS[id].isQuest);
}

function quizSkill(targetId, rnd, used) {
  const t = JOB_TREE[targetId];
  const mine = [...new Set(jobSkillIds(targetId).concat(jobSkillIds(t.parent)))].filter(id => !used.has(id));
  if (!mine.length) return null;
  const id = quizPick(mine, rnd);
  used.add(id);
  const sk = SKILLS[id];
  const all = Object.values(SKILLS).filter(s => s && s.desc && s.id !== id);
  if (rnd() < 0.5) {
    return quizMake('skill', `「${quizSkillName(sk)}」的效果是？`, quizText(sk.desc), all.map(s => quizText(s.desc)), rnd);
  }
  // 反過來問名字：干擾項優先用同一條職業線的技能，比較有鑑別度
  const near = mine.filter(x => x !== id).map(x => quizSkillName(SKILLS[x]));
  const pool = near.length >= 3 ? near : near.concat(all.map(quizSkillName));
  return quizMake('skill', `哪個技能的效果是「${quizText(sk.desc, 70)}」？`, quizSkillName(sk), pool, rnd);
}

function quizCardPool() {
  if (quizCardPool._c) return quizCardPool._c;
  const drop = typeof MONSTER_CARD_DROPS !== 'undefined' ? MONSTER_CARD_DROPS : {};
  const has = new Set(Object.values(drop).map(d => d && d.card).filter(Boolean));
  return (quizCardPool._c = Object.values(CARDS).filter(c => c && has.has(c.id) && c.slot !== 'enchant'
    && c.desc && !/⚠|未實/.test(c.desc) && quizText(c.desc).length >= 4));
}
function quizCard(rnd, used) {
  const pool = quizCardPool().filter(c => !used.has(c.id));
  if (!pool.length) return null;
  const c = quizPick(pool, rnd);
  used.add(c.id);
  const same = pool.filter(x => x.slot === c.slot && x.id !== c.id);
  const opts = (same.length >= 6 ? same : pool).map(x => quizText(x.desc));
  return quizMake('card', `「${c.name}」的效果是？`, quizText(c.desc), opts, rnd);
}

// 地圖上看得到的一般怪，等級不超過自己 +15（至少 30）
function quizMobPool() {
  const cap = Math.max(30, (state.baseLevel || 1) + 15);
  const ids = new Set();
  MAPS.forEach(m => (m.monsters || []).forEach(x => ids.add(x.id)));
  return [...ids].map(id => MONSTERS[id]).filter(d => d && !d.isBoss && !d.isMvp && !d.isVirtual && d.level <= cap && d.element && d.race);
}
function quizMonster(rnd, used) {
  const pool = quizMobPool().filter(d => !used.has(d.id));
  if (!pool.length) return null;
  const d = quizPick(pool, rnd);
  used.add(d.id);
  const r = rnd();
  if (r < 0.45) return quizMake('mob', `「${d.name}」是什麼屬性？`, ELEMENT_NAMES[d.element], Object.values(ELEMENT_NAMES), rnd);
  if (r < 0.85 && QUIZ_RACE[d.race]) return quizMake('mob', `「${d.name}」是什麼種族？`, QUIZ_RACE[d.race], Object.values(QUIZ_RACE), rnd);
  if (!QUIZ_SIZE[d.size]) return null;
  // 體型只有 3 種，補一個「不分體型」湊 4 個選項
  return quizMake('mob', `「${d.name}」是什麼體型？`, QUIZ_SIZE[d.size], Object.values(QUIZ_SIZE).concat(['不分體型']), rnd);
}

function quizElement(rnd) {
  const defs = Object.keys(ELEMENT_CHART.none).filter(def => {
    const v = Object.keys(ELEMENT_CHART).map(a => ELEMENT_CHART[a][def]);
    const top = Math.max(...v);
    return top > 100 && v.filter(x => x === top).length === 1;   // 只問最有效的屬性唯一的
  });
  const def = quizPick(defs, rnd);
  const atks = Object.keys(ELEMENT_CHART);
  const best = atks.reduce((b, a) => (ELEMENT_CHART[a][def] > ELEMENT_CHART[b][def] ? a : b));
  const weak = atks.filter(a => ELEMENT_CHART[a][def] <= 100).map(a => ELEMENT_NAMES[a]);
  return quizMake('element', `用哪個屬性攻擊「${ELEMENT_NAMES[def]}屬性」的魔物最有效？`, ELEMENT_NAMES[best], weak, rnd);
}

function quizRefineLabel(m) {
  const lv = m.usableWeaponLv || [];
  if (m.minLevel) return (m.usableArmor ? '+10 以上的防具' : '+10 以上的武器') + (m.failPenalty === 'minus1' ? '，失敗只退 1 級' : '');
  if (m.enriched) return m.usableArmor ? '防具，成功率比一般礦高' : '所有等級的武器，成功率比一般礦高';
  if (m.usableArmor) return '防具';
  return `Lv${Math.min(...lv)}～Lv${Math.max(...lv)} 武器`;
}
function quizRefine(rnd) {
  const list = Object.values(REFINEMENT_MATERIALS);
  const m = quizPick(list, rnd);
  return quizMake('refine', `「${m.name}」用來精煉什麼？`, quizRefineLabel(m), list.map(quizRefineLabel), rnd);
}

/* 出一份考卷：技能 4、卡片 2、魔物 2、屬性 1、精煉 1，順序打亂。rnd 可傳固定亂數（測試用） */
function buildJobQuiz(targetId, rnd) {
  rnd = rnd || Math.random;
  const used = new Set();
  const plan = ['skill', 'skill', 'skill', 'skill', 'card', 'card', 'mob', 'mob', 'element', 'refine'];
  const make = { skill: () => quizSkill(targetId, rnd, used), card: () => quizCard(rnd, used),
    mob: () => quizMonster(rnd, used), element: () => quizElement(rnd), refine: () => quizRefine(rnd) };
  const out = [];
  plan.forEach(k => {
    // 某一類出不了題（例如技能不夠）就換魔物題補上
    for (let tries = 0; tries < 6; tries++) {
      const q = make[tries < 3 ? k : 'mob']();
      if (q && !out.some(o => o.q === q.q)) { out.push(q); return; }
    }
  });
  return quizShuffle(out, rnd);
}

/* 交卷：answers＝每題選的選項索引。回傳 { score, pass } 並記錄通過 */
function submitJobQuiz(targetId, quiz, answers) {
  const score = quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const pass = score >= Math.min(JOB_QUIZ_PASS, quiz.length);
  if (pass) {
    state.jobQuizPassed = state.jobQuizPassed || {};
    state.jobQuizPassed[targetId] = true;
    logMsg(`🎓 轉職考試通過（${score}／${quiz.length}）！可以轉職成「${JOB_TREE[targetId].name}」了。`);
    saveGame();
  }
  return { score, pass };
}
