/* 虛擬對手產生器（T51 第 5 期，使用者 2026-11-13；吉芬魔法大賽與 T26 PVP 爬塔共用）
   對手＝一隻臨時的「首領級」怪物：外觀用紙娃娃（職業、性別、髮型、髮色、頭飾、武器），
   職業招牌技能走打王的紅圈系統（js/boss_patterns.js 的形狀＋ js/boss_fight.js 的預警／閃避／站姿），
   追人、射程內普攻走一般怪物的移動與攻擊（MOB_MOVE 的 range：遠程職業會停在射程外）。
   數值：以同等級的人型怪為底，血量依輪次放大（第 7 期再用模擬調）。
   對手不給經驗、掉落、圖鑑；用完就從 MONSTERS／MOB_MOVE／BOSS_PATTERNS 移除。
   這個檔案在 boss_fight.js 之後載入。 */

// 職業 → 外觀武器、射程、招牌技能（紅圈）。進階二轉沿用二轉並多一招
const VFOE_JOBS = {
  knight: { name: '騎士', weapon: 'spear2', range: 2, walkMs: 140, skills: [
    { use: 'sweep', name: '怪物互擊' },
    { use: 'sweep', name: '連刺攻擊', half: 0.45, len: 5, wind: 1100, dmg: 0.35 }] },
  crusader: { name: '十字軍', weapon: 'spear1', range: 2, walkMs: 150, skills: [
    { shape: 'burst', name: '聖十字審判', r: 3.5, kind: 'magic', wind: 1700, dmg: 0.40 },
    { use: 'charge', name: '盾擊衝鋒' }] },
  wizard: { name: '巫師', weapon: 'rod2', range: 9, walkMs: 170, skills: [
    { shape: 'spot', name: '暴風雪', r: 3.5, wind: 2200, dmg: 0.40, kind: 'magic' },
    { shape: 'spot', name: '隕石術', r: 3, wind: 2000, dmg: 0.45, kind: 'magic' }] },
  sage: { name: '賢者', weapon: 'book', range: 9, walkMs: 170, skills: [
    { shape: 'spot', name: '火球術', r: 1.6, wind: 1200, dmg: 0.30, kind: 'magic' },
    { shape: 'spot', name: '雷擊術', r: 1.2, wind: 900, dmg: 0.25, kind: 'magic' }] },
  hunter: { name: '獵人', weapon: 'bow', range: 9, walkMs: 150, skills: [
    { shape: 'spot', name: '箭雨', r: 2.5, wind: 1500, dmg: 0.30 },
    { shape: 'spot', name: '鷹爆', r: 1.2, wind: 900, dmg: 0.25 }] },
  assassin: { name: '刺客', weapon: 'katar', range: 1, walkMs: 120, skills: [
    { use: 'charge', name: '音速投擲', dmg: 0.40 },
    { use: 'pounce', name: '無影之牙', dmg: 0.25 }] },
  monk: { name: '武僧', weapon: 'knuckle', range: 1, walkMs: 140, skills: [
    { shape: 'beam', name: '阿修羅霸凰拳', w: 1.6, len: 10, wind: 2200, dmg: 0.60 },
    { use: 'pounce', name: '猛龍誇強' }] },
  priest: { name: '祭司', weapon: 'mace', range: 1, walkMs: 160, skills: [
    { shape: 'burst', name: '十字驅魔', r: 3, kind: 'magic', wind: 1800, dmg: 0.30, heal: 0.10 },
    { shape: 'burst', name: '光耀之堂', r: 2.5, kind: 'magic', wind: 1500, dmg: 0.20, heal: 0.08 }] },
  rogue: { name: '流氓', weapon: 'dagger', range: 1, walkMs: 130, skills: [
    { use: 'pounce', name: '背刺', wind: 800, dmg: 0.30 },
    { shape: 'spot', name: '箭雨', r: 2.5, wind: 1500, dmg: 0.25 }] },
  blacksmith: { name: '鐵匠', weapon: 'axe2', range: 1, walkMs: 150, skills: [
    { shape: 'ring', name: '大地之擊', r0: 2.5, r1: 6, wind: 1700, dmg: 0.35 },
    { use: 'sweep', name: '猛擊' }] },
};
const VFOE_TRANS = {
  lordknight: { base: 'knight', name: '騎士領主', extra: { shape: 'beam', name: '螺旋擊刺', w: 1.4, len: 8, wind: 1300, dmg: 0.50 } },
  paladin: { base: 'crusader', name: '聖殿十字軍', extra: { use: 'nova', name: '神之威壓', dmg: 0.18 } },
  highwizard: { base: 'wizard', name: '超魔導士', extra: { use: 'nova', name: '重力原野', dmg: 0.20 } },
  professor: { base: 'sage', name: '智者', extra: { use: 'bombard', name: '雙倍投擲' } },
  sniper: { base: 'hunter', name: '神射手', extra: { shape: 'beam', name: '銳利射擊', w: 1.4, len: 12, wind: 1400, dmg: 0.50 } },
  assassincross: { base: 'assassin', name: '十字刺客', extra: { shape: 'spot', name: '心靈震波', r: 1.4, wind: 1000, dmg: 0.40 } },
  champion: { base: 'monk', name: '武術宗師', extra: { use: 'pounce', name: '伏虎拳', wind: 800, dmg: 0.30 } },
  highpriest: { base: 'priest', name: '神官', extra: { use: 'share', name: '聖母之祈福', dmg: 0.40 } },
  whitesmith: { base: 'blacksmith', name: '神工匠', extra: { use: 'charge', name: '手推車終結技', dmg: 0.45 } },
};
const VFOE_NAMES = { male: ['艾倫', '凱恩', '雷歐', '亞瑟', '迪克', '馬可', '洛基', '巴特', '諾亞', '盧恩'], female: ['莉亞', '蜜雪', '娜塔', '琳恩', '菲歐', '伊芙', '希兒', '艾瑪', '蘿絲', '妮可'] };

// 可重現的亂數（同一個種子＝同一個對手，大賽「同一天大家遇到的一樣」要用）
function vfoeRand(seed) {
  let x = (seed >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
function vfoeJobInfo(job) {
  const t = VFOE_TRANS[job];
  if (t) { const b = VFOE_JOBS[t.base]; return Object.assign({}, b, { name: t.name, skills: b.skills.concat([t.extra]) }); }
  return VFOE_JOBS[job] || null;
}
/* 數值底：同等級前後 5 級的一般怪取中位數（單挑一隻挑到的怪可能血特別少，實測 Lv30 挑到 HP 10 的怪）。
   回傳最接近等級的那隻當欄位樣板，數值欄位換成中位數 */
function vfoeTemplate(level) {
  const ok = m => m && !m.isBoss && m.hp > 0 && m.atk > 0 && !m.isVirtual;
  let pool = Object.values(MONSTERS).filter(m => ok(m) && Math.abs(m.level - level) <= 5);
  if (pool.length < 5) pool = Object.values(MONSTERS).filter(ok).sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level)).slice(0, 20);
  if (!pool.length) return null;
  const med = k => { const v = pool.map(m => m[k] || 0).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const base = pool.slice().sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))[0];
  return Object.assign({}, base, { hp: med('hp'), atk: med('atk'), def: med('def'), defSoft: med('defSoft'), mdef: med('mdef'), mdefSoft: med('mdefSoft'),
    hit: med('hit'), flee: med('flee'), atkInterval: med('atkInterval') || 1.5 });
}

let _vfoeSeq = 0;
/* 造一個虛擬對手，回傳 MONSTERS 的 key。
   opts = { job, level, hpMult（預設 8）, atkMult（預設 1.2）, skills（取前幾招，預設全部）, seed, gender,
            name（自訂名字，冠軍用）, extraSkills（額外招式）, windMult（預警時間倍率，<1＝更快）,
            displayLevel（畫面上顯示的等級；數值仍照 level 算）, like（照這隻怪的屬性與屬性抗性，官方參賽者用）,
            skillList（整份換掉招式）, lookJob（紙娃娃用的職業，沒有外觀的職業換成現有的）, weapon, range, isMvp } */
function makeVirtualFoe(opts) {
  const o = opts || {};
  const base = vfoeJobInfo(o.job) || vfoeJobInfo(o.lookJob) || VFOE_JOBS.knight;
  const info = Object.assign({}, base, o.weapon ? { weapon: o.weapon } : {}, o.range ? { range: o.range } : {}, o.skillList ? { skills: o.skillList } : {});
  const level = Math.max(1, Math.round(o.level || 50));
  const rnd = vfoeRand(o.seed != null ? o.seed : Date.now());
  const tpl = vfoeTemplate(level);
  if (!tpl) return null;
  const id = 'vfoe_' + (++_vfoeSeq) + '_' + o.job;
  const gender = o.gender || (rnd() < 0.5 ? 'male' : 'female');
  const pd = typeof window !== 'undefined' ? window.PAPERDOLL : null;
  const views = pd && pd.view ? Object.values(pd.view).filter(v => v) : [];
  const hat = views.length && rnd() < 0.8 ? views[Math.floor(rnd() * views.length)] : 0;
  const look = {
    job: o.lookJob || (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[o.job]) || o.job, gender,
    hairStyle: 1 + Math.floor(rnd() * 20), hairColor: Math.floor(rnd() * 9), hatViews: [0, 0, hat], weaponCat: info.weapon,
  };
  const hp = Math.round(tpl.hp * (o.hpMult || 8));
  const like = o.like && MONSTERS[o.like];
  const def = Object.assign({}, tpl, {
    id, name: o.name || `${info.name}・${VFOE_NAMES[gender][Math.floor(rnd() * VFOE_NAMES[gender].length)]}`, icon: '🧑',
    level: o.displayLevel || level, hp, atk: Math.round(tpl.atk * (o.atkMult || 1.2)), race: 'humanoid', size: 'medium',
    element: like ? like.element : 'none',
    elementResistance: like && like.elementResistance ? Object.assign({}, like.elementResistance)
      : { none: 100, water: 100, earth: 100, fire: 100, wind: 100, poison: 100, holy: 100, shadow: 100, ghost: 100, undead: 100 },
    isBoss: true, isMvp: !!o.isMvp, isVirtual: true, exp: 0, jobExp: 0, drops: [], look, vfoeJob: o.job,
  });
  MONSTERS[id] = def;
  if (typeof MOB_MOVE !== 'undefined') {
    MOB_MOVE[id] = Object.assign({}, MOB_MOVE[tpl.id] || {}, { range: info.range, walkMs: info.walkMs || 150, aggressive: true, immobile: false, drops: undefined });
  }
  const skills = (o.skills ? info.skills.slice(0, o.skills) : info.skills).concat(o.extraSkills || []);
  const wm = o.windMult || 1;
  BOSS_PATTERNS[id] = skills.map(s => {
    const e = Object.assign({}, s);
    if (wm !== 1) e.wind = Math.round((e.wind || (BOSS_SKILL_LIB[e.use || e.shape] || {}).wind || 1500) * wm);
    return e;
  });
  return id;
}
function removeVirtualFoe(id) {
  if (!id || !MONSTERS[id] || !MONSTERS[id].isVirtual) return;
  delete MONSTERS[id];
  if (typeof MOB_MOVE !== 'undefined') delete MOB_MOVE[id];
  delete BOSS_PATTERNS[id];
}

/* ---------------- 單挑（第 5 期驗收用；第 6 期的大賽一輪一場也走這裡） ----------------
   state.vDuel = { foes: [monId…], startAt, limitMs, mapId, label }
   onVirtualDuelEnd(fn)：大賽掛結果用（win, info） */
const VDUEL_LIMIT_MS = 3 * 60 * 1000;
const _vduelHooks = [];
function onVirtualDuelEnd(fn) { _vduelHooks.push(fn); }
function virtualDuelBlockReason() {
  if (isInTown() && !state.gmt) return '城裡不能開打。';   // 吉芬魔法大賽的競技場沒有野怪，算城鎮，但可以打
  if (state.travel) return '趕路中不能開打，先停下來。';
  if (state.bossChallenge) return '正在挑戰首領。';
  if (state.bossHunt) return '正在討伐首領，等討伐結束。';
  if (state.vDuel) return '已經在對戰中。';
  if (!(state.hp > 0)) return '倒下時不能開打。';
  return null;
}
/* foes：makeVirtualFoe 的參數陣列（一場可以兩名對手） */
function startVirtualDuel(foes, opts) {
  const why = virtualDuelBlockReason();
  if (why) { logMsg('⚠️ ' + why); return false; }
  const list = (Array.isArray(foes) ? foes : [foes]).map(makeVirtualFoe).filter(Boolean);
  if (!list.length) return false;
  const now = Date.now();
  state.monsters = [];
  state.bossCasts = [];
  const ids = [];
  list.forEach((defId, i) => {
    const def = MONSTERS[defId];
    state.monsterIdCounter = (state.monsterIdCounter || 0) + 1;
    const mon = { defId, hp: def.hp, maxHp: def.hp, id: state.monsterIdCounter, spawnedAt: now, d: 6 + i * 1.5, a: (i ? 0.6 : -0.3), vfoe: true };
    state.monsters.push(mon);
    ids.push(mon.id);
  });
  state.monster = state.monsters[0];
  state.vDuel = { foes: ids, defs: list, startAt: now, limitMs: (opts && opts.limitMs) || VDUEL_LIMIT_MS, mapId: state.mapId, label: (opts && opts.label) || '對戰' };
  logMsg(`⚔️ ${state.vDuel.label}開始：${list.map(id => MONSTERS[id].name).join('、')}！`);
  return true;
}
function endVirtualDuel(win, why) {
  const v = state.vDuel;
  if (!v) return;
  state.vDuel = null;
  state.bossCasts = [];
  const ms = Date.now() - v.startAt;
  state.monsters = (state.monsters || []).filter(m => !(MONSTERS[m.defId] && MONSTERS[m.defId].isVirtual));
  state.monster = state.monsters[0] || null;
  state.lastSpawnTime = Date.now();
  (v.defs || []).forEach(removeVirtualFoe);
  logMsg(win ? `🏆 ${v.label}獲勝！用時 ${(ms / 1000).toFixed(1)} 秒。` : `💢 ${v.label}失敗（${why}）。`);
  _vduelHooks.forEach(fn => { try { fn(!!win, { ms, why, label: v.label }); } catch (e) { console.error(e); } });
}
// killMonster 呼叫：打倒一名虛擬對手。全倒就獲勝
function onVirtualFoeKilled(def, mon) {
  const v = state.vDuel || (typeof _allyActing !== 'undefined' && _allyActing && allyOwnerState().vDuel);
  logMsg(`💥 打倒了 ${def.name}！`);
  if (!v) { removeVirtualFoe(mon.defId); return; }
  const left = (allyOwnerState().monsters || []).filter(m => m.id !== mon.id && v.foes.includes(m.id) && m.hp > 0);
  if (!left.length) withOwner(() => endVirtualDuel(true));
}
// 每拍：時限、換圖、對手不見 → 失敗
function tickVirtualDuel(now) {
  const v = state.vDuel;
  if (!v) return;
  if (state.mapId !== v.mapId) return endVirtualDuel(false, '離開了地圖');
  if (!(state.hp > 0)) return endVirtualDuel(false, '倒下了');
  if (!(state.monsters || []).some(m => v.foes.includes(m.id))) return endVirtualDuel(false, '對手不見了');
  if (now - v.startAt > v.limitMs) return endVirtualDuel(false, '時間到');
}
