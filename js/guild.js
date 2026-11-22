/* ======================================================================
   公會（T55，使用者 2026-11-22）：單機版公會本身
   - 全帳號一個公會（跟跨角色倉庫一樣存在 GUILD_KEY，不放進角色存檔）；所有存檔角色自動是成員
   - 用華麗金屬創建（官方 /guild 要 1 個華麗金屬）
   - 公會經驗：成員打怪的基礎經驗照「上繳 %」（0～50%，官方）分給公會；招募成員每分鐘也帶經驗
   - 升級拿公會技能點（每級 1 點），技能照官方經典版（統率類 Lv5、每級素質 +1）
   - 招募成員（使用者：抽卡強化當另一個賣點）：商城點數抽 NPC 冒險者，同職業再抽到就升星（最多 ★5）；
     同系成員的星數加總給全公會加成（劍士系 HP%、魔法師系 MATK%…），星數也決定每分鐘帶多少公會經驗
   - 公會名同時是攻城戰的公會名；守護者研究／強化守護者提高自己城的守城戰力
   ====================================================================== */
const GUILD_KEY = 'ro_idle_guild';
const GUILD_MAX_LV = 50;
const GUILD_TAX_MAX = 50;
const GUILD_RECRUIT_COST = 20;          // 商城點數／抽
const GUILD_RECRUIT_STAR_W = [70, 25, 5];   // 抽到 ★1／★2／★3 的權重
const GUILD_RECRUIT_MAX_STAR = 5;
const GUILD_RECRUIT_BASE_CAP = 8;       // 招募成員上限（公會擴張每級 +1）
const GUILD_PASSIVE_PER_STAR = 2500;    // 每顆星每分鐘帶的公會經驗
const GUILD_PASSIVE_CAP_MS = 3 * 86400000;   // 離線最多補 3 天
const GUILD_OVERFLOW_EXP = 1000000;     // 滿星或滿額再抽到：每顆星換這麼多公會經驗

// 公會升級所需經驗（每級 2,000,000 × 等級）
function guildExpNeed(lv) { return 2000000 * lv; }

/* 官方公會技能（經典版；本作用得到的那些）。req＝前置技能 */
const GUILD_SKILLS = [
  { id: 'gd_approval', name: '正式公會認證', max: 1, desc: () => '公會正式成立。守護者研究的前置；自己的城守城戰力 +5%。' },
  { id: 'gd_guardresearch', name: '守護者研究', max: 1, req: { gd_approval: 1 }, desc: () => '城裡有守護者幫忙守。守城戰力 +10%。' },
  { id: 'gd_guardup', name: '強化守護者', max: 3, req: { gd_guardresearch: 1 }, desc: lv => `守護者變強。守城戰力 +${5 * lv}%。` },
  { id: 'gd_extension', name: '公會擴張', max: 10, desc: lv => `招募成員上限 +${lv}（目前上限 ${GUILD_RECRUIT_BASE_CAP + lv}）。` },
  { id: 'gd_gloryguild', name: '公會的榮耀', max: 1, desc: () => '可以換公會徽章。統率類技能的前置。' },
  { id: 'gd_leadership', name: '偉大的統率力', max: 5, req: { gd_gloryguild: 1 }, stat: 'str', desc: lv => `全部成員 STR +${lv}。` },
  { id: 'gd_glorywounds', name: '光榮的傷痕', max: 5, req: { gd_gloryguild: 1 }, stat: 'vit', desc: lv => `全部成員 VIT +${lv}。` },
  { id: 'gd_soulcold', name: '冷靜的心', max: 5, req: { gd_glorywounds: 1 }, stat: 'agi', desc: lv => `全部成員 AGI +${lv}。` },
  { id: 'gd_hawkeyes', name: '銳利的目光', max: 5, req: { gd_leadership: 1 }, stat: 'dex', desc: lv => `全部成員 DEX +${lv}。` },
  { id: 'gd_regeneration', name: '再生', max: 3, req: { gd_glorywounds: 1 }, desc: lv => `全部成員每 10 秒多回最大 HP／SP 的 ${lv}%。` },
];
const GUILD_EMBLEMS = ['🛡️', '⚔️', '🦁', '🐉', '🦅', '🌙', '⭐', '🔥', '❄️', '🍀', '👑', '🌹'];

/* 招募成員的職業：二轉與進階二轉；同系＝同一個一轉 */
const GUILD_LINES = {
  swordsman: { name: '劍士系', bonus: 'hpPct', label: '最大 HP' },
  mage: { name: '魔法師系', bonus: 'matkPct', label: 'MATK' },
  archer: { name: '弓箭手系', bonus: 'atkPct', label: 'ATK' },
  acolyte: { name: '服事系', bonus: 'spPct', label: '最大 SP' },
  merchant: { name: '商人系', bonus: 'dropPct', label: '掉寶率' },
  thief: { name: '盜賊系', bonus: 'critRate', label: '暴擊率' },
};
// 同系星數加總 → 加成 %（3★／8★／15★／24★）
const GUILD_SYNERGY_TIERS = [[3, 2], [8, 4], [15, 6], [24, 8]];

function guildJobLine(job) {
  const seen = {};
  let j = job;
  while (j && !seen[j] && JOB_TREE[j]) {
    seen[j] = 1;
    if (GUILD_LINES[j]) return j;
    j = JOB_TREE[j].parent;
  }
  return null;
}
let _guildRecruitJobs = null;
function guildRecruitJobs() {
  if (!_guildRecruitJobs) _guildRecruitJobs = Object.keys(JOB_TREE).filter(j => (JOB_TREE[j].tier === 2 || JOB_TREE[j].tier === 2.5) && guildJobLine(j));
  return _guildRecruitJobs;
}

/* ---------------- 存取 ---------------- */
let _guild;
function guildData() {
  if (_guild === undefined) {
    try { _guild = JSON.parse(localStorage.getItem(GUILD_KEY) || 'null'); } catch (e) { _guild = null; }
    if (_guild) { _guild.skills = _guild.skills || {}; _guild.recruits = _guild.recruits || {}; }
  }
  return _guild;
}
function guildSave() {
  const g = guildData();
  try { if (g) localStorage.setItem(GUILD_KEY, JSON.stringify(g)); else localStorage.removeItem(GUILD_KEY); } catch (e) { /* 略過 */ }
}
function guildReload() { _guild = undefined; return guildData(); }

function guildCreateReason(name) {
  if (guildData()) return '已經有公會了。';
  if (!String(name || '').trim()) return '公會名不能空白。';
  if (!(getItemQty('emperium') > 0)) return '創建公會要 1 個華麗金屬（巴風特、黃金蟲等魔物掉落）。';
  return '';
}
function guildCreate(name) {
  const why = guildCreateReason(name);
  if (why) return why;
  removeItem('emperium', 1);
  const n = String(name).trim().slice(0, 12);
  _guild = { name: n, lv: 1, exp: 0, skills: {}, recruits: {}, emblem: 0, master: state.name || '', createdAt: gameNow(), passiveAt: gameNow() };
  guildSave();
  if (typeof setGvgGuildName === 'function') setGvgGuildName(n);
  logMsg(`🏰 創建了公會「${n}」！`);
  saveGame();
  return '';
}
function guildRename(name) {
  const g = guildData();
  const n = String(name || '').trim().slice(0, 12);
  if (!g) return '還沒有公會。';
  if (!n) return '公會名不能空白。';
  g.name = n;
  guildSave();
  if (typeof setGvgGuildName === 'function') setGvgGuildName(n);
  return '';
}
/* 解散：公會整個刪掉（等級、技能、招募成員都沒了），華麗金屬不退 */
function guildDisband() {
  if (!guildData()) return '還沒有公會。';
  const n = _guild.name;
  _guild = null;
  guildSave();
  if (typeof recomputeDerived === 'function') recomputeDerived();
  logMsg(`🏰 公會「${n}」解散了。`);
  saveGame();
  return '';
}
/* 踢除招募成員：直接離開，不給補償，騰出名額 */
function guildKick(job) {
  const g = guildData();
  const r = g && g.recruits[job];
  if (!r) return '沒有這位成員。';
  delete g.recruits[job];
  guildSave();
  if (typeof recomputeDerived === 'function') recomputeDerived();
  return '';
}
function guildSetEmblem(i) {
  const g = guildData();
  if (!g || !guildSkillLv('gd_gloryguild')) return false;
  g.emblem = Math.max(0, Math.min(GUILD_EMBLEMS.length - 1, i | 0));
  guildSave();
  return true;
}
function guildEmblem() { const g = guildData(); return GUILD_EMBLEMS[(g && g.emblem) || 0]; }

/* ---------------- 等級、經驗 ---------------- */
function guildAddExp(n) {
  const g = guildData();
  if (!g || !(n > 0)) return;
  g.exp += Math.floor(n);
  while (g.lv < GUILD_MAX_LV && g.exp >= guildExpNeed(g.lv)) {
    g.exp -= guildExpNeed(g.lv);
    g.lv++;
    logMsg(`🏰 公會「${g.name}」升到 Lv${g.lv}！獲得 1 點公會技能點。`, 'exp');
  }
  if (g.lv >= GUILD_MAX_LV) g.exp = Math.min(g.exp, guildExpNeed(g.lv));
  g._dirty = true;
}
// 成員資格：自己的存檔角色（主角沒有 _slot、隊友是數字欄位）。攻城對手、道館複製體的 _slot 不是數字，不算
function isGuildMember(st) {
  if (!guildData() || !st) return false;
  return st._slot == null || /^\d+$/.test(String(st._slot));
}
function guildTaxPct(st) { return Math.max(0, Math.min(GUILD_TAX_MAX, ((st || state) && (st || state).guildTax) | 0)); }
function setGuildTax(pct) { state.guildTax = Math.max(0, Math.min(GUILD_TAX_MAX, pct | 0)); saveGame(); }
/* 打怪的基礎經驗先扣上繳的部分給公會（在 withAlly／withOwner 裡呼叫，state＝拿經驗的人） */
function guildTaxExp(base) {
  if (!(base > 0) || !isGuildMember(state)) return base;
  const pct = guildTaxPct(state);
  if (!pct) return base;
  const tax = Math.floor(base * pct / 100);
  guildAddExp(tax);
  return base - tax;
}

/* ---------------- 技能 ---------------- */
function guildSkillLv(id) { const g = guildData(); return (g && g.skills[id]) || 0; }
function guildSkillPointsLeft() {
  const g = guildData();
  if (!g) return 0;
  return g.lv - Object.values(g.skills).reduce((a, b) => a + b, 0);
}
function guildLearnReason(id) {
  const sk = GUILD_SKILLS.find(s => s.id === id);
  if (!guildData() || !sk) return '沒有這個技能。';
  if (guildSkillLv(id) >= sk.max) return '已經滿級。';
  if (guildSkillPointsLeft() <= 0) return '公會技能點不夠。';
  for (const [r, lv] of Object.entries(sk.req || {})) {
    if (guildSkillLv(r) < lv) return `要先學「${GUILD_SKILLS.find(s => s.id === r).name}」Lv${lv}。`;
  }
  return '';
}
function guildLearn(id) {
  const why = guildLearnReason(id);
  if (why) return why;
  const g = guildData();
  g.skills[id] = guildSkillLv(id) + 1;
  guildSave();
  if (typeof recomputeDerived === 'function') recomputeDerived();
  return '';
}
// 素質（recomputeDerived 記在 buffSrc，角色分頁看得到來源）
function guildStatBonus(st) {
  const out = {};
  if (!isGuildMember(st)) return out;
  GUILD_SKILLS.forEach(sk => { if (sk.stat && guildSkillLv(sk.id)) out[sk.stat] = guildSkillLv(sk.id); });
  return out;
}
// 守城戰力倍率（gvg.js 自己的城反攻時乘上）
function guildGuardMult() {
  if (!guildData()) return 1;
  return 1 + (guildSkillLv('gd_approval') ? 0.05 : 0) + (guildSkillLv('gd_guardresearch') ? 0.1 : 0) + 0.05 * guildSkillLv('gd_guardup');
}

/* ---------------- 招募成員 ---------------- */
function guildRecruitList() { const g = guildData(); return g ? Object.values(g.recruits) : []; }
function guildRecruitCap() { return GUILD_RECRUIT_BASE_CAP + guildSkillLv('gd_extension'); }
function guildRollStar(r) {
  let x = r() * GUILD_RECRUIT_STAR_W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < GUILD_RECRUIT_STAR_W.length; i++) { x -= GUILD_RECRUIT_STAR_W[i]; if (x < 0) return i + 1; }
  return 1;
}
/* 抽一次：回傳 { job, star, kind:'new'|'up'|'exp', name, exp } */
function guildRecruitOnce() {
  const g = guildData();
  const job = guildRecruitJobs()[Math.floor(rng() * guildRecruitJobs().length)];
  const star = guildRollStar(rng);
  const cur = g.recruits[job];
  if (cur) {
    const room = GUILD_RECRUIT_MAX_STAR - cur.star;
    const up = Math.min(room, star);
    cur.star += up;
    const exp = (star - up) * GUILD_OVERFLOW_EXP;
    if (exp) guildAddExp(exp);
    return { job, star, kind: up ? 'up' : 'exp', name: cur.name, exp, now: cur.star };
  }
  if (guildRecruitList().length >= guildRecruitCap()) {
    const exp = star * GUILD_OVERFLOW_EXP;
    guildAddExp(exp);
    return { job, star, kind: 'exp', name: '', exp };
  }
  const gender = JOB_TREE[job].genderLock || (rng() < 0.5 ? 'male' : 'female');
  const names = typeof FAKE_NAMES !== 'undefined' ? FAKE_NAMES : ['冒險者'];
  const used = new Set(guildRecruitList().map(x => x.name));
  const free = names.filter(n => !used.has(n));
  const name = (free.length ? free : names)[Math.floor(rng() * (free.length || names.length))];
  g.recruits[job] = { job, star, name, gender, hairStyle: 1 + Math.floor(rng() * 20), hairColor: Math.floor(rng() * 9), at: gameNow() };
  return { job, star, kind: 'new', name, now: star };
}
function guildRecruit(times) {
  const g = guildData();
  if (!g) return { err: '還沒有公會。' };
  const n = Math.max(1, times | 0);
  if (cashPoints() < GUILD_RECRUIT_COST * n) return { err: `${CASH_POINT_NAME}不足，招募 ${n} 次要 ${GUILD_RECRUIT_COST * n} 點。` };
  state.cashPoints -= GUILD_RECRUIT_COST * n;
  const got = [];
  for (let i = 0; i < n; i++) got.push(guildRecruitOnce());
  guildSave();
  if (typeof recomputeDerived === 'function') recomputeDerived();
  saveGame();
  return { got };
}
// 各系星數加總與目前加成
function guildSynergy() {
  const out = {};
  Object.keys(GUILD_LINES).forEach(l => { out[l] = { stars: 0, pct: 0, next: GUILD_SYNERGY_TIERS[0][0] }; });
  guildRecruitList().forEach(r => { const l = guildJobLine(r.job); if (l) out[l].stars += r.star; });
  Object.values(out).forEach(o => {
    GUILD_SYNERGY_TIERS.forEach(([need, pct]) => { if (o.stars >= need) o.pct = pct; });
    const nx = GUILD_SYNERGY_TIERS.find(([need]) => o.stars < need);
    o.next = nx ? nx[0] : null;
  });
  return out;
}
let _guildBonusCache = null, _guildBonusKey = '';
// getCardBonusRaw 尾端加上：同系加成、再生
function guildGearBonus(stat) {
  if (!isGuildMember(state)) return 0;
  const g = guildData();
  const key = g.lv + '|' + JSON.stringify(g.skills) + '|' + guildRecruitList().map(r => r.job + r.star).join();
  if (key !== _guildBonusKey) {
    _guildBonusKey = key;
    _guildBonusCache = {};
    Object.entries(guildSynergy()).forEach(([l, o]) => { if (o.pct) _guildBonusCache[GUILD_LINES[l].bonus] = (_guildBonusCache[GUILD_LINES[l].bonus] || 0) + o.pct; });
    const rg = guildSkillLv('gd_regeneration');
    if (rg) { _guildBonusCache.regenTickHpPct = rg; _guildBonusCache.regenTickSpPct = rg; }
  }
  return _guildBonusCache[stat] || 0;
}
// 招募成員每分鐘帶的公會經驗
function guildPassivePerMin() { return guildRecruitList().reduce((a, r) => a + r.star, 0) * GUILD_PASSIVE_PER_STAR; }
/* 慢拍呼叫：照實際經過時間補公會經驗（全帳號共用，換角色也照算；離線最多補 3 天） */
function tickGuild(now) {
  const g = guildData();
  if (!g) return;
  const from = Math.max(g.passiveAt || now, now - GUILD_PASSIVE_CAP_MS);
  const mins = Math.floor((now - from) / 60000);
  if (mins > 0) {
    g.passiveAt = from + mins * 60000;
    guildAddExp(mins * guildPassivePerMin());
  } else if (!g.passiveAt) g.passiveAt = now;
  if (g._dirty) { delete g._dirty; guildSave(); }
}
