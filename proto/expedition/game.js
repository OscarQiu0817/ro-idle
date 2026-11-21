/* 遠征原型（T65 第 0 期，docs/EXPEDITION_PLAN.md）：一張圖、無限層、割草、三選一強化。
   只驗證「好不好玩」與「幾十隻怪同屏撐不撐得住」，數值都是暫定，不接正式遊戲。
   操作：WASD／方向鍵移動（按了就暫停自動移動 1.5 秒）；「自動」＝自動走位＋自動選強化。 */
'use strict';
const D = window.EXP_DATA;
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0;
function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
addEventListener('resize', resize); resize();

/* ---------- 圖 ---------- */
const imgCache = {};
function img(src) { if (!imgCache[src]) { const i = new Image(); i.src = src; imgCache[src] = i; } return imgCache[src]; }
const mobSrc = m => `../../images/mob_anim/${m.imgId}.png`;
// 圖集一格一幀；RO 圖預設朝左，朝右就水平翻轉
function drawSprite(src, anim, act, t, x, y, flip, scale, alpha) {
  const im = img(src);
  if (!im.complete || !im.naturalWidth) return false;
  const a = anim.actions[act] || anim.actions.idle || anim.actions.walk;
  if (!a) return false;
  const once = act === 'die' || act === 'hit' || act === 'attack';
  let f = Math.floor(t / (a.delay || 100));
  f = once ? Math.min(f, a.frames - 1) : f % a.frames;
  const idx = a.start + f;
  const [cw, ch] = anim.cell;
  const sx = (idx % anim.cols) * cw, sy = Math.floor(idx / anim.cols) * ch;
  const s = scale || 1;
  ctx.save();
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, sx, sy, cw, ch, -anim.anchor[0] * s, -anim.anchor[1] * s, cw * s, ch * s);
  ctx.restore();
  return true;
}

/* ---------- 強化（三選一） ---------- */
const AUGS = {
  power:   { name: '力量', r: 0, max: 5, desc: l => `攻擊力 +${20 * l}%` },
  haste:   { name: '迅捷', r: 0, max: 5, desc: l => `攻擊速度 +${15 * l}%` },
  wide:    { name: '橫掃', r: 1, max: 3, desc: l => l >= 3 ? '普攻變 360 度' : `普攻範圍 +${60 * l} 度、距離 +${15 * l}` },
  triple:  { name: '三連擊', r: 1, max: 5, desc: l => `${15 + 15 * l}% 機率一次打 3 下` },
  explode: { name: '屍爆', r: 1, max: 5, desc: l => `擊殺時爆炸，周圍受到 ${25 + 25 * l}% 攻擊力傷害` },
  crit:    { name: '必殺', r: 0, max: 3, desc: l => `每第 ${6 - l} 下必定暴擊（暴擊 ×2）` },
  vamp:    { name: '嗜血', r: 0, max: 5, desc: l => `擊殺回復 ${l}% HP` },
  swift:   { name: '疾行', r: 0, max: 5, desc: l => `移動速度 +${12 * l}%` },
  thunder: { name: '落雷', r: 2, max: 5, desc: l => `每 3 秒落雷 ${l} 道，${150}% 攻擊力` },
  fire:    { name: '烈焰', r: 2, max: 5, desc: l => `普攻點燃 3 秒，每秒 ${10 + 10 * l}% 攻擊力` },
};
const AUTO_PRIORITY = ['wide', 'power', 'triple', 'haste', 'explode', 'thunder', 'fire', 'crit', 'vamp', 'swift'];

/* ---------- 狀態 ---------- */
const RUN_MS = 15 * 60 * 1000;
let S;
function newRun() {
  S = {
    t: 0, floor: 1, kills: 0, floorKills: 0, quota: 0, bossOut: false, boss: null,
    p: { x: 0, y: 0, hp: 3000, maxHp: 3000, atk: 260, interval: 650, crit: 0.08, range: 95, arc: 120, speed: 170,
         face: -1, act: 'idle', actT: 0, atkCd: 0, swings: 0, manualUntil: 0, inv: 0 },
    mobs: [], shots: [], fx: [], nums: [], gems: [], slams: [],
    augs: {}, combo: 0, comboT: 0, maxCombo: 0, multi: [], spawnCd: 0, thunderCd: 3000,
    shake: 0, stop: 0, paused: false, over: false, auto: S ? S.auto : true,
    fps: 60, fpsAcc: 0, fpsN: 0,
  };
  startFloor();
  document.getElementById('over').classList.remove('show');
}
const theme = () => D.themes[Math.floor((S.floor - 1) / 2) % D.themes.length];
const lv = k => S.augs[k] || 0;
function startFloor() {
  S.floorKills = 0;
  S.quota = 50 + 15 * (S.floor - 1);
  S.bossOut = false; S.boss = null;
  S.mobs = S.mobs.filter(m => m.dead);   // 留下正在播死亡的
  S.shots = []; S.slams = [];
}
// 怪物強度：照該主題 RO 血量比例分配，整體隨層數上升
function scaleOf() { return Math.pow(1.22, S.floor - 1); }
function spawnGroup(n) {
  const T = theme();
  const avgHp = T.mobs.reduce((a, m) => a + m.hp, 0) / T.mobs.length;
  const avgAtk = T.mobs.reduce((a, m) => a + m.atk, 0) / T.mobs.length || 1;
  const tw = T.mobs.reduce((a, m) => a + m.weight, 0);
  let r = Math.random() * tw, def = T.mobs[0];
  for (const m of T.mobs) { if ((r -= m.weight) <= 0) { def = m; break; } }
  const ang = Math.random() * Math.PI * 2, dist = Math.max(W, H) * 0.6 + 60;
  const cx = S.p.x + Math.cos(ang) * dist, cy = S.p.y + Math.sin(ang) * dist;
  const k = scaleOf();
  for (let i = 0; i < n; i++) {
    const hp = Math.round(320 * k * Math.sqrt(def.hp / avgHp));
    S.mobs.push({
      def, x: cx + (Math.random() - 0.5) * 120, y: cy + (Math.random() - 0.5) * 120,
      hp, maxHp: hp, atk: Math.round(16 * k * Math.sqrt((def.atk || avgAtk) / avgAtk)),
      speed: (def.ranged ? 55 : 75) + Math.random() * 25, cd: 800 + Math.random() * 800,
      act: 'walk', actT: Math.random() * 1000, burn: 0, burnT: 0, dead: false, deadT: 0, flash: 0,
    });
  }
}
function spawnBoss() {
  const T = theme();
  const k = scaleOf();
  const hp = Math.round(320 * k * 25);
  const ang = Math.random() * Math.PI * 2;
  S.boss = {
    def: T.boss, boss: true, x: S.p.x + Math.cos(ang) * 420, y: S.p.y + Math.sin(ang) * 420,
    hp, maxHp: hp, atk: Math.round(16 * k * 4), speed: 65, cd: 1500, slamCd: 3500,
    act: 'walk', actT: 0, burn: 0, burnT: 0, dead: false, deadT: 0, flash: 0,
  };
  S.mobs.push(S.boss);
  S.bossOut = true;
  banner(`${T.boss.name} 出現了！`, '#ff6b6b');
}

/* ---------- 戰鬥 ---------- */
function dmgNum(x, y, v, crit, color) {
  S.nums.push({ x: x + (Math.random() - 0.5) * 16, y: y - 40, v: Math.round(v), crit, color, t: 0 });
}
function hurtMob(m, v, crit, color) {
  if (m.dead) return;
  m.hp -= v; m.flash = 90;
  if (!m.boss && m.act !== 'attack') { m.act = 'hit'; m.actT = 0; }
  dmgNum(m.x, m.y, v, crit, color);
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  m.dead = true; m.act = 'die'; m.actT = 0; m.deadT = 0;
  S.kills++;
  if (!m.boss) S.floorKills++;
  S.combo++; S.comboT = 2000; S.maxCombo = Math.max(S.maxCombo, S.combo);
  S.multi.push(S.t);
  for (let i = 0; i < (m.boss ? 30 : 1); i++) S.gems.push({ x: m.x + (Math.random() - 0.5) * (m.boss ? 80 : 10), y: m.y + (Math.random() - 0.5) * (m.boss ? 80 : 10), vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, t: 0 });
  if (lv('vamp')) S.p.hp = Math.min(S.p.maxHp, S.p.hp + S.p.maxHp * lv('vamp') / 100);
  if (lv('explode')) {
    const v = S.p.atk * atkMult() * (0.25 + 0.25 * lv('explode'));
    S.fx.push({ kind: 'boom', x: m.x, y: m.y, r: 70, t: 0 });
    // 連鎖：下一拍再算，免得遞迴爆光
    S.pendingBoom = (S.pendingBoom || []).concat([{ x: m.x, y: m.y, v }]);
  }
  if (m.boss) {
    S.shake = 18; S.stop = 220;
    banner(`擊敗 ${m.def.name}！`, '#ffd479');
    setTimeout(() => openPick(), 900);
  }
}
const atkMult = () => 1 + 0.2 * lv('power');
function swing() {
  const p = S.p;
  const arc = lv('wide') >= 3 ? 360 : p.arc + 60 * lv('wide');
  const range = p.range + 15 * lv('wide');
  p.swings++;
  const forceCrit = lv('crit') && p.swings % (6 - lv('crit')) === 0;
  const hits = Math.random() < (lv('triple') ? 0.15 + 0.15 * lv('triple') : 0) ? 3 : 1;
  const faceAng = p.face < 0 ? Math.PI : 0;
  let any = false;
  S.fx.push({ kind: 'arc', x: p.x, y: p.y - 30, r: range, a0: faceAng, arc, t: 0 });
  for (const m of S.mobs) {
    if (m.dead) continue;
    const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy);
    if (d > range + (m.boss ? 40 : 10)) continue;
    if (arc < 360) {
      let da = Math.atan2(dy, dx) - faceAng;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > (arc / 2) * Math.PI / 180 && d > 30) continue;
    }
    any = true;
    for (let h = 0; h < hits; h++) {
      const crit = forceCrit || Math.random() < p.crit;
      const v = p.atk * atkMult() * (crit ? 2 : 1) * (0.9 + Math.random() * 0.2);
      hurtMob(m, v, crit, crit ? '#ffef5a' : '#fff');
      if (crit) { S.shake = Math.max(S.shake, 6); S.stop = Math.max(S.stop, 45); }
    }
    if (lv('fire')) { m.burn = 3000; m.burnV = p.atk * atkMult() * (0.1 + 0.1 * lv('fire')); }
  }
  if (any && hits === 3) S.fx.push({ kind: 'text', x: p.x, y: p.y - 110, s: '三連擊！', c: '#7fdcff', t: 0 });
}
function nearestMob(maxD) {
  let best = null, bd = maxD || 1e9;
  for (const m of S.mobs) { if (m.dead) continue; const d = Math.hypot(m.x - S.p.x, m.y - S.p.y); if (d < bd) { bd = d; best = m; } }
  return best;
}

/* ---------- 每拍 ---------- */
const keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
function step(dt) {
  S.t += dt;
  const p = S.p;
  if (S.t >= RUN_MS) return gameOver('時間到');
  // 移動：手動優先；自動＝靠近最近的怪、被圍太多就往外拉
  let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (mx || my) p.manualUntil = S.t + 1500;
  else if (S.auto && S.t > p.manualUntil) {
    const near = S.boss && !S.boss.dead ? S.boss : nearestMob();
    let crowd = 0, cx = 0, cy = 0;
    for (const m of S.mobs) { if (m.dead) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < 70) { crowd++; cx += m.x - p.x; cy += m.y - p.y; } }
    const slam = S.slams.find(sl => !sl.done && Math.hypot(p.x - sl.x, p.y - sl.y) < sl.r + 10);
    if (slam) { mx = p.x - slam.x || 1; my = p.y - slam.y; }
    else if (crowd >= 8 || (p.hp < p.maxHp * 0.35 && crowd >= 3)) { mx = -cx; my = -cy; }
    else if (near && Math.hypot(near.x - p.x, near.y - p.y) > p.range * 0.7) { mx = near.x - p.x; my = near.y - p.y; }
  }
  const ml = Math.hypot(mx, my);
  const spd = p.speed * (1 + 0.12 * lv('swift'));
  if (ml) { p.x += mx / ml * spd * dt / 1000; p.y += my / ml * spd * dt / 1000; }
  // 面向：有怪朝怪，沒怪朝移動方向
  const tgt = nearestMob(p.range + 60);
  if (tgt) p.face = tgt.x < p.x ? -1 : 1; else if (mx) p.face = mx < 0 ? -1 : 1;
  // 普攻
  p.atkCd -= dt;
  if (p.atkCd <= 0 && tgt) {
    p.atkCd = p.interval / (1 + 0.15 * lv('haste'));
    p.act = 'attack'; p.actT = 0;
    swing();
  }
  p.actT += dt;
  if (p.act === 'attack' && p.actT > 450) { p.act = ml ? 'walk' : 'idle'; p.actT = 0; }
  else if (p.act !== 'attack') { const want = ml ? 'walk' : 'idle'; if (p.act !== want) { p.act = want; p.actT = 0; } }
  if (p.inv > 0) p.inv -= dt;
  p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.006 * dt / 1000);   // 自然回復每秒 0.6%
  // 落雷
  if (lv('thunder')) {
    S.thunderCd -= dt;
    if (S.thunderCd <= 0) {
      S.thunderCd = 3000;
      const alive = S.mobs.filter(m => !m.dead);
      for (let i = 0; i < lv('thunder') && alive.length; i++) {
        const m = alive.splice(Math.floor(Math.random() * alive.length), 1)[0];
        S.fx.push({ kind: 'bolt', x: m.x, y: m.y, t: 0 });
        hurtMob(m, p.atk * atkMult() * 1.5, false, '#b6a4ff');
      }
    }
  }
  // 屍爆
  if (S.pendingBoom) {
    const list = S.pendingBoom; S.pendingBoom = null;
    for (const b of list) for (const m of S.mobs) if (!m.dead && Math.hypot(m.x - b.x, m.y - b.y) < 70) hurtMob(m, b.v, false, '#ff9a4a');
  }
  // 生怪
  const alive = S.mobs.filter(m => !m.dead).length;
  S.spawnCd -= dt;
  const cap = Math.min(70, 28 + S.floor * 4);
  if (!S.bossOut && S.floorKills >= S.quota) spawnBoss();
  if (S.spawnCd <= 0 && alive < (S.bossOut ? 12 : cap)) {
    spawnGroup(S.bossOut ? 3 : 5 + Math.floor(Math.random() * 5));
    S.spawnCd = Math.max(500, 1800 - S.floor * 80);
  }
  // 怪
  for (const m of S.mobs) {
    m.actT += dt;
    if (m.flash > 0) m.flash -= dt;
    if (m.dead) { m.deadT += dt; continue; }
    if (m.burn > 0) {
      m.burn -= dt; m.burnT += dt;
      if (m.burnT >= 1000) { m.burnT = 0; hurtMob(m, m.burnV, false, '#ff7b3a'); if (m.dead) continue; }
    }
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    const reach = m.boss ? 70 : m.def.ranged ? 230 : 32;
    if (d > reach) { m.x += dx / d * m.speed * dt / 1000; m.y += dy / d * m.speed * dt / 1000; if (m.act !== 'hit' && m.act !== 'attack') m.act = 'walk'; }
    if ((m.act === 'hit' || m.act === 'attack') && m.actT > 500) { m.act = 'walk'; m.actT = 0; }
    m.cd -= dt;
    if (d <= reach + 4 && m.cd <= 0) {
      m.cd = m.boss ? 1600 : 1500 + Math.random() * 600;
      m.act = 'attack'; m.actT = 0;
      if (m.def.ranged) S.shots.push({ x: m.x, y: m.y - 30, vx: dx / d * 260, vy: dy / d * 260, atk: m.atk, t: 0 });
      else hurtPlayer(m.atk, m.boss ? 'boss' : 'melee');
    }
    if (m.boss) {
      m.slamCd -= dt;
      if (m.slamCd <= 0) { m.slamCd = 4200; S.slams.push({ x: p.x, y: p.y, r: 110, t: 0, atk: m.atk * 2.5 }); }
    }
  }
  // 推開：怪不要疊成一團。格子分桶，只比同格與鄰格
  const SEP = 28, grid = new Map();
  for (const m of S.mobs) {
    if (m.dead) continue;
    const key = Math.floor(m.x / SEP) + ',' + Math.floor(m.y / SEP);
    (grid.get(key) || grid.set(key, []).get(key)).push(m);
  }
  for (const m of S.mobs) {
    if (m.dead) continue;
    const gx = Math.floor(m.x / SEP), gy = Math.floor(m.y / SEP);
    for (let ix = -1; ix <= 1; ix++) for (let iy = -1; iy <= 1; iy++) {
      const cell = grid.get((gx + ix) + ',' + (gy + iy));
      if (!cell) continue;
      for (const o of cell) {
        if (o === m) continue;
        const r = (m.boss || o.boss) ? 60 : SEP;
        const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < r) { const k = (r - d) / r * 0.5; m.x += dx / d * k * 4; m.y += dy / d * k * 4; }
      }
    }
  }
  // 王的重擊：先畫紅圈 1 秒再打
  for (const sl of S.slams) {
    sl.t += dt;
    if (!sl.done && sl.t >= 1000) { sl.done = true; S.shake = 14; if (Math.hypot(p.x - sl.x, p.y - sl.y) < sl.r) hurtPlayer(sl.atk, 'slam'); }
  }
  S.slams = S.slams.filter(s => s.t < 1300);
  // 遠程彈
  for (const s of S.shots) {
    s.t += dt; s.x += s.vx * dt / 1000; s.y += s.vy * dt / 1000;
    if (!s.hit && Math.hypot(s.x - p.x, s.y - (p.y - 30)) < 20) { s.hit = true; hurtPlayer(s.atk, 'shot'); }
  }
  S.shots = S.shots.filter(s => !s.hit && s.t < 2500);
  S.mobs = S.mobs.filter(m => !m.dead || m.deadT < 900);
  // 經驗寶石飛向角色
  for (const g of S.gems) {
    g.t += dt;
    if (g.t < 250) { g.x += g.vx * dt / 1000; g.y += g.vy * dt / 1000; g.vy += 900 * dt / 1000; }
    else { const dx = p.x - g.x, dy = p.y - 30 - g.y, d = Math.hypot(dx, dy) || 1, v = 400 + g.t; g.x += dx / d * v * dt / 1000; g.y += dy / d * v * dt / 1000; if (d < 14) g.got = true; }
  }
  S.gems = S.gems.filter(g => !g.got);
  // 連殺與多殺
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  S.multi = S.multi.filter(t => S.t - t < 600);
  if (S.multi.length >= 3 && !S.multiShown) {
    const n = S.multi.length;
    S.fx.push({ kind: 'text', x: p.x, y: p.y - 130, s: n >= 8 ? `${n} 殺！大屠殺！` : n >= 5 ? `${n} 殺！` : '三殺！', c: n >= 8 ? '#ff5a5a' : '#ffd479', t: 0, big: true });
    S.multiShown = true;
  }
  if (!S.multi.length) S.multiShown = false;
  for (const f of S.fx) f.t += dt;
  S.fx = S.fx.filter(f => f.t < (f.kind === 'text' ? 900 : f.kind === 'bolt' ? 250 : 220));
  for (const n of S.nums) n.t += dt;
  S.nums = S.nums.filter(n => n.t < 700);
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 0.06);
}
function hurtPlayer(v, src) {
  const p = S.p;
  if (p.inv > 0) return;
  S.taken = S.taken || {}; S.taken[src || '?'] = (S.taken[src || '?'] || 0) + v;
  p.hp -= v;
  dmgNum(p.x, p.y - 20, v, false, '#ff5a5a');
  if (p.hp <= 0) { p.hp = 0; gameOver('倒下了'); }
}
let bannerEl = null;
function banner(s, c) { S.fx.push({ kind: 'banner', s, c, t: 0 }); }

/* ---------- 三選一 ---------- */
let pickTimer = null;
function openPick() {
  if (S.over) return;
  S.paused = true;
  const pool = Object.keys(AUGS).filter(k => lv(k) < AUGS[k].max);
  const opts = [];
  while (opts.length < 3 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const box = document.getElementById('pick');
  box.querySelectorAll('.card').forEach(c => c.remove());
  document.getElementById('pickTitle').textContent = `第 ${S.floor} 層通過！選一個強化` + (S.auto ? '（自動：3 秒後照優先順序選）' : '');
  opts.forEach(k => {
    const a = AUGS[k], l = lv(k) + 1;
    const el = document.createElement('div');
    el.className = 'card r' + a.r;
    el.innerHTML = `<h3>${a.name}</h3><div class="lv">${['一般', '稀有', '傳說'][a.r]}　Lv${l}／${a.max}</div><p>${a.desc(l)}</p>`;
    el.onclick = () => choose(k);
    box.appendChild(el);
  });
  box.classList.add('show');
  clearTimeout(pickTimer);
  if (S.auto) pickTimer = setTimeout(() => choose(opts.slice().sort((a, b) => AUTO_PRIORITY.indexOf(a) - AUTO_PRIORITY.indexOf(b))[0]), 3000);
}
function choose(k) {
  clearTimeout(pickTimer);
  if (k) S.augs[k] = lv(k) + 1;
  document.getElementById('pick').classList.remove('show');
  S.floor++;
  S.p.hp = Math.min(S.p.maxHp, S.p.hp + S.p.maxHp * 0.3);   // 過層回 30%
  S.p.inv = 1500;
  startFloor();
  banner(`第 ${S.floor} 層・${theme().name}`, '#fff');
  S.paused = false;
}
function gameOver(why) {
  if (S.over) return;
  S.over = true; S.paused = true;
  const m = Math.floor(S.t / 60000), s = Math.floor(S.t / 1000) % 60;
  const el = document.getElementById('over');
  el.innerHTML = `<div style="font-size:24px;color:#ffd479">遠征結束：${why}</div>
    <div>最高第 <b>${S.floor}</b> 層（${theme().name}）　擊殺 <b>${S.kills}</b>　最大連殺 <b>${S.maxCombo}</b>　時間 ${m}:${String(s).padStart(2, '0')}</div>
    <div>強化：${Object.entries(S.augs).map(([k, l]) => AUGS[k].name + ' Lv' + l).join('、') || '無'}</div>
    <button onclick="newRun()">再來一場</button>`;
  el.classList.add('show');
}

/* ---------- 畫面 ---------- */
function draw() {
  const p = S.p;
  const sx = (Math.random() - 0.5) * S.shake, sy = (Math.random() - 0.5) * S.shake;
  const camX = p.x - W / 2 + sx, camY = p.y - H / 2 + sy;
  // 地板
  const fl = img(theme().floor);
  if (fl.complete && fl.naturalWidth) {
    const tw = fl.naturalWidth, th = fl.naturalHeight;
    const ox = -((camX % tw) + tw) % tw, oy = -((camY % th) + th) % th;
    for (let x = ox; x < W; x += tw) for (let y = oy; y < H; y += th) ctx.drawImage(fl, x, y);
  } else { ctx.fillStyle = '#2b3a22'; ctx.fillRect(0, 0, W, H); }
  ctx.save();
  ctx.translate(-camX, -camY);
  // 王的紅圈
  for (const sl of S.slams) {
    ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r, 0, Math.PI * 2);
    ctx.fillStyle = sl.done ? 'rgba(255,80,40,.5)' : `rgba(255,0,0,${0.12 + 0.25 * sl.t / 1000})`;
    ctx.fill();
    if (!sl.done) { ctx.beginPath(); ctx.arc(sl.x, sl.y, sl.r * sl.t / 1000, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,60,60,.8)'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  // 依 y 排序畫（近的蓋遠的）
  const list = S.mobs.slice();
  list.push({ isP: true, y: p.y });
  list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o.isP) {
      const pa = D.player.anim;
      const act = p.act === 'attack' ? 'attack' : p.act;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 18, 6, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      drawSprite(D.player.sheet, pa, act, p.actT, p.x, p.y, p.face > 0, 1, p.inv > 0 && Math.floor(p.inv / 100) % 2 ? 0.5 : 1);
      continue;
    }
    const m = o;
    if (m.x < camX - 150 || m.x > camX + W + 150 || m.y < camY - 150 || m.y > camY + H + 200) continue;
    const alpha = m.dead ? Math.max(0, 1 - m.deadT / 900) : 1;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.boss ? 40 : 14, m.boss ? 12 : 5, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,0,0,${0.3 * alpha})`; ctx.fill();
    const ok = drawSprite(mobSrc(m.def), m.def.anim, m.act, m.actT, m.x, m.y, m.x < p.x, 1, alpha);
    if (!ok) { ctx.fillStyle = '#a44'; ctx.fillRect(m.x - 12, m.y - 30, 24, 30); }
    if (m.flash > 0 && !m.dead) { ctx.beginPath(); ctx.arc(m.x, m.y - 25, m.boss ? 50 : 18, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${m.flash / 300})`; ctx.fill(); }
    if (m.burn > 0 && !m.dead) { ctx.fillStyle = 'rgba(255,120,40,.7)'; ctx.fillRect(m.x - 3, m.y - 50 - Math.random() * 6, 6, 6); }
    if (!m.dead && m.hp < m.maxHp && !m.boss) {
      ctx.fillStyle = '#300'; ctx.fillRect(m.x - 16, m.y + 4, 32, 4);
      ctx.fillStyle = '#e33'; ctx.fillRect(m.x - 16, m.y + 4, 32 * m.hp / m.maxHp, 4);
    }
  }
  // 特效
  for (const f of S.fx) {
    const k = f.t / 220;
    if (f.kind === 'arc') {
      ctx.beginPath();
      if (f.arc >= 360) ctx.arc(f.x, f.y + 30, f.r, 0, Math.PI * 2);
      else { const h = f.arc / 2 * Math.PI / 180; ctx.moveTo(f.x, f.y + 30); ctx.arc(f.x, f.y + 30, f.r, f.a0 - h, f.a0 + h); ctx.closePath(); }
      ctx.fillStyle = `rgba(255,240,200,${0.22 * (1 - k)})`; ctx.fill();
    } else if (f.kind === 'boom') {
      ctx.beginPath(); ctx.arc(f.x, f.y - 20, f.r * (0.4 + k), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,140,40,${0.5 * (1 - k)})`; ctx.fill();
    } else if (f.kind === 'bolt') {
      ctx.strokeStyle = `rgba(190,170,255,${1 - f.t / 250})`; ctx.lineWidth = 4;
      ctx.beginPath(); let y = f.y - 400, x = f.x; ctx.moveTo(x, y);
      while (y < f.y - 20) { y += 40; x = f.x + (Math.random() - 0.5) * 30; ctx.lineTo(x, y); }
      ctx.stroke();
    } else if (f.kind === 'text') {
      ctx.font = `bold ${f.big ? 26 : 18}px "Microsoft JhengHei"`; ctx.textAlign = 'center';
      ctx.fillStyle = f.c; ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
      const y = f.y - f.t / 25;
      ctx.globalAlpha = Math.max(0, 1 - f.t / 900);
      ctx.strokeText(f.s, f.x, y); ctx.fillText(f.s, f.x, y); ctx.globalAlpha = 1;
    }
  }
  // 彈、寶石
  ctx.fillStyle = '#ffe08a';
  for (const s of S.shots) { ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7fe0ff';
  for (const g of S.gems) { ctx.beginPath(); ctx.arc(g.x, g.y, 3, 0, Math.PI * 2); ctx.fill(); }
  // 傷害數字：越大字越大
  ctx.textAlign = 'center';
  for (const n of S.nums) {
    const size = Math.min(34, 12 + Math.log10(Math.max(10, n.v)) * 4) * (n.crit ? 1.35 : 1);
    ctx.font = `bold ${Math.round(size)}px Arial`;
    ctx.globalAlpha = Math.max(0, 1 - n.t / 700);
    const y = n.y - n.t / 12;
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(n.v, n.x, y);
    ctx.fillStyle = n.color; ctx.fillText(n.v, n.x, y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // 王血條
  if (S.boss && !S.boss.dead) {
    const b = S.boss, bw = Math.min(500, W - 40);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - bw / 2 - 2, 46, bw + 4, 16);
    ctx.fillStyle = '#c22'; ctx.fillRect(W / 2 - bw / 2, 48, bw * b.hp / b.maxHp, 12);
    ctx.font = 'bold 13px "Microsoft JhengHei"'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(b.def.name, W / 2, 42);
  }
  // 連殺
  if (S.combo >= 5) {
    ctx.textAlign = 'right'; ctx.font = `bold ${Math.min(44, 22 + S.combo / 5)}px Arial`;
    ctx.fillStyle = S.combo >= 100 ? '#ff5a5a' : S.combo >= 50 ? '#ffb347' : '#ffd479';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    const s = `×${S.combo} 連殺`;
    ctx.strokeText(s, W - 16, H / 2); ctx.fillText(s, W - 16, H / 2);
  }
  // 橫幅
  for (const f of S.fx) if (f.kind === 'banner' && f.t < 1800) {
    ctx.textAlign = 'center'; ctx.font = 'bold 30px "Microsoft JhengHei"';
    ctx.globalAlpha = Math.min(1, (1800 - f.t) / 400);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.strokeText(f.s, W / 2, H * 0.28);
    ctx.fillStyle = f.c; ctx.fillText(f.s, W / 2, H * 0.28); ctx.globalAlpha = 1;
  }
}
function hud() {
  const p = S.p, left = Math.max(0, RUN_MS - S.t);
  const alive = S.mobs.filter(m => !m.dead).length;
  document.getElementById('hud').innerHTML =
    `第 <b>${S.floor}</b> 層・${theme().name}　${S.bossOut ? '<b style="color:#ff6b6b">首領戰</b>' : `擊殺 <b>${S.floorKills}</b>／${S.quota}`}<br>
     <div id="hpbar"><i style="width:${100 * p.hp / p.maxHp}%"></i></div>
     HP ${Math.ceil(p.hp)}／${p.maxHp}　剩 ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}<br>
     總擊殺 ${S.kills}　最大連殺 ${S.maxCombo}<br>
     <span style="color:#8f8">FPS ${S.fps}</span>　場上 ${alive} 隻`;
  document.getElementById('augs').innerHTML = Object.entries(S.augs).map(([k, l]) => `${AUGS[k].name} Lv${l}`).join('<br>');
}
// 每 100 種寶石經驗不做系統，先純視覺

/* ---------- 主迴圈 ---------- */
let last = performance.now(), hudT = 0;
function frame(now) {
  let dt = Math.min(50, now - last);
  last = now;
  S.fpsAcc += dt; S.fpsN++;
  if (S.fpsAcc >= 500) { S.fps = Math.round(1000 * S.fpsN / S.fpsAcc); S.fpsAcc = 0; S.fpsN = 0; }
  if (!S.paused) {
    if (S.stop > 0) { S.stop -= dt; for (const n of S.nums) n.t += dt * 0.3; }   // 打擊停頓：世界停一下
    else step(dt);
  }
  draw();
  hudT += dt;
  if (hudT > 150) { hudT = 0; hud(); }
  requestAnimationFrame(frame);
}
document.getElementById('bAuto').onclick = e => { S.auto = !S.auto; e.target.classList.toggle('on', S.auto); };
document.getElementById('bStress').onclick = () => { for (let i = 0; i < 20; i++) spawnGroup(5); };
document.getElementById('bRestart').onclick = () => newRun();
newRun();
banner(`第 1 層・${theme().name}`, '#fff');
requestAnimationFrame(frame);
