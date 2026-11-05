/* Boss 預警與閃避原型（GAMEPLAY_DIRECTION 工作 6＋8）。
   座標單位是格；鏡頭跟著玩家，玩家永遠在畫面中央（對應 D1 的 playerMoveBy：世界反向平移）。
   預警形狀：定點圓、扇形、直線衝鋒、腳下爆發、甜甜圈（貼近王才安全）。 */
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const CX = 34, CY = 24;                 // 一格的螢幕寬／高（俯視 3/4，Y 壓扁）
  const SCX = W / 2, SCY = H * 0.58;      // 玩家在畫面上的位置
  const WALK = 6.5;                       // 格／秒（rAthena 一般移速 150ms／格）
  const K = 1.4;                          // 角色縮放

  /* ---- 預警技能 ---- */
  const SKILLS = {
    circle: { name: '定點落雷', wind: 1600, dmg: 0.35, desc: '玩家腳下半徑 3 格' },
    cone: { name: '黑暗氣息', wind: 1300, dmg: 0.45, desc: '王前方 100° 扇形、長 8 格' },
    line: { name: '衝鋒', wind: 1100, dmg: 0.4, desc: '朝玩家方向寬 2.4 格的直線，王跟著衝過去' },
    burst: { name: '地獄之火', wind: 1500, dmg: 0.5, desc: '王身邊半徑 5 格' },
    donut: { name: '大地震波', wind: 1900, dmg: 0.55, desc: '王身邊 3～10 格，貼近王才安全' },
  };
  const ORDER = ['circle', 'cone', 'line', 'burst', 'donut'];

  /* ---- 圖片 ---- */
  const imgCache = {};
  const img = src => imgCache[src] || (imgCache[src] = Object.assign(new Image(), { src }));
  const floorImg = img('../../images/maps/field.jpg');
  const BOSS_ID = 1039;   // 巴風特

  /* ---- 狀態 ---- */
  let now = performance.now(), last = now;
  let party, boss, zones, fx, nums, nextSkillAt, skillIdx, stat;
  const logEl = $('log');
  const log = t => logEl.insertAdjacentHTML('afterbegin', `<div>${t}</div>`);

  function mkUnit(o) {
    const u = { ...o, hp: o.maxHp, cast: null, atkT: 500, dodge: null, seenZone: null, act: 'ready_s', actT0: 0, actOnce: 0, actDelay: 0, actFrom: 0, dead: 0 };
    u.parts = paperdollPartsFor({ job: o.job, gender: o.gender, hairStyle: o.hair, hairColor: o.hc, hatViews: [], weaponCat: o.weaponCat });
    u.bounds = u.parts && paperdollBounds(u.parts);
    u.dc = document.createElement('canvas');
    if (u.bounds) { u.dc.width = u.bounds.width; u.dc.height = u.bounds.height; }
    return u;
  }
  function reset() {
    party = [
      mkUnit({ name: '你（騎士）', job: 'knight', gender: 'male', hair: 9, hc: 5, weaponCat: 'sword2', x: 0, y: 0, maxHp: 9000, range: 2, aspd: 700, atk: 900, me: true }),
      mkUnit({ name: '祭司', job: 'priest', gender: 'female', hair: 4, hc: 2, weaponCat: 'mace', x: -2, y: 2.5, maxHp: 5500, range: 7, aspd: 900, atk: 0, healer: true }),
      mkUnit({ name: '獵人', job: 'hunter', gender: 'male', hair: 6, hc: 7, weaponCat: 'bow', x: 2, y: 2.5, maxHp: 6000, range: 8, aspd: 650, atk: 700 }),
    ];
    boss = { x: 0, y: -7, maxHp: 400000, hp: 400000, atkT: 1200, cast: null, dash: null, act: 'idle', actT0: 0, face: 1 };
    zones = []; fx = []; nums = [];
    nextSkillAt = now + 2500; skillIdx = 0;
    stat = { hits: 0, dodged: 0, taken: 0, casts: 0 };
    logEl.innerHTML = '';
    log('巴風特出現了。');
  }

  /* ---- 幾何 ---- */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function inZone(z, p, margin) {
    const m = margin || 0;
    const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy);
    if (z.type === 'circle' || z.type === 'burst') return d <= z.r + m;
    if (z.type === 'donut') return d >= z.r0 - m && d <= z.r1 + m;
    if (z.type === 'cone') {
      if (d > z.len + m) return false;
      let da = Math.atan2(dy, dx) - z.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      return Math.abs(da) <= z.half + (d > 0.01 ? Math.atan(m / d) : Math.PI);
    }
    if (z.type === 'line') {
      const ux = Math.cos(z.ang), uy = Math.sin(z.ang);
      const along = dx * ux + dy * uy, side = -dx * uy + dy * ux;
      return along >= -m && along <= z.len + m && Math.abs(side) <= z.w / 2 + m;
    }
    return false;
  }
  // 最近的安全點：16 個方向 × 0.5～10 格，跳過還在任何預警裡的點
  function safeSpot(u) {
    let best = null, bd = 1e9;
    for (let r = 0.5; r <= 10; r += 0.5) {
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        const p = { x: u.x + Math.cos(a) * r, y: u.y + Math.sin(a) * r };
        if (zones.some(z => inZone(z, p, 0.6))) continue;
        if (r < bd) { bd = r; best = p; }
      }
      if (best) return best;
    }
    return null;
  }

  /* ---- 王 ---- */
  function castSkill(id) {
    const sk = SKILLS[id], t = party[0];
    const ang = Math.atan2(t.y - boss.y, t.x - boss.x);
    let z;
    if (id === 'circle') z = { type: 'circle', x: t.x, y: t.y, r: 3 };
    if (id === 'cone') z = { type: 'cone', x: boss.x, y: boss.y, ang, half: 50 * Math.PI / 180, len: 8 };
    if (id === 'line') z = { type: 'line', x: boss.x, y: boss.y, ang, w: 2.4, len: 12 };
    if (id === 'burst') z = { type: 'burst', x: boss.x, y: boss.y, r: 5 };
    if (id === 'donut') z = { type: 'donut', x: boss.x, y: boss.y, r0: 3, r1: 10 };
    Object.assign(z, { id, sk, t0: now, end: now + sk.wind });
    zones.push(z);
    boss.cast = z;
    stat.casts++;
    shout(boss, sk.name);
    log(`👑 巴風特準備施放「${sk.name}」（${sk.desc}）`);
  }
  function resolveZone(z) {
    party.forEach(u => {
      if (u.dead) return;
      if (inZone(z, u)) {
        const d = Math.round(u.maxHp * z.sk.dmg * (0.9 + Math.random() * 0.2));
        hurt(u, d); stat.hits++; stat.taken += d;
      } else if (u.seenZone === z) { stat.dodged++; addNum(u, '閃過', '#9fe6ff'); }
    });
    fx.push({ type: 'boom', z, t0: now, dur: 450 });
    if (z.type === 'line') boss.dash = { fx: boss.x, fy: boss.y, tx: z.x + Math.cos(z.ang) * z.len * 0.85, ty: z.y + Math.sin(z.ang) * z.len * 0.85, t0: now, dur: 300 };
    if (boss.cast === z) boss.cast = null;
  }
  function bossTick(dt) {
    if (boss.dash) {
      const k = Math.min(1, (now - boss.dash.t0) / boss.dash.dur);
      boss.x = boss.dash.fx + (boss.dash.tx - boss.dash.fx) * k;
      boss.y = boss.dash.fy + (boss.dash.ty - boss.dash.fy) * k;
      if (k >= 1) boss.dash = null;
      return;
    }
    zones.filter(z => now >= z.end).forEach(resolveZone);
    zones = zones.filter(z => now < z.end);
    if (boss.cast) return;
    const pick = $('skill').value;
    if (now >= nextSkillAt) {
      castSkill(pick || ORDER[skillIdx++ % ORDER.length]);
      nextSkillAt = now + 4200 + Math.random() * 1200;
      return;
    }
    // 追最近的人、近戰普攻
    const alive = party.filter(u => !u.dead);
    if (!alive.length) return;
    const t = alive.reduce((a, b) => (dist(a, boss) < dist(b, boss) ? a : b));
    boss.face = t.x > boss.x ? 1 : -1;
    const d = dist(t, boss);
    if (d > 2) {
      const step = Math.min(WALK * 0.75 * dt / 1000, d - 2);
      boss.x += (t.x - boss.x) / d * step; boss.y += (t.y - boss.y) / d * step;
      boss.act = 'walk';
    } else {
      boss.act = 'idle';
      boss.atkT -= dt;
      if (boss.atkT <= 0) {
        boss.atkT = 1400;
        boss.act = 'attack'; boss.actT0 = now;
        hurt(t, Math.round(t.maxHp * 0.06 * (0.8 + Math.random() * 0.4)));
      }
    }
  }

  /* ---- 隊伍 ---- */
  function hurt(u, d) {
    u.hp = Math.max(0, u.hp - d);
    addNum(u, String(d), u.me ? '#ff7a6a' : '#ffb3a8');
    if (u.cast) { u.cast = null; addNum(u, '詠唱中斷', '#ffd25a'); }
    if (u.hp <= 0 && !u.dead) { u.dead = now; log(`💀 ${u.name}倒下了（3 秒後復活）`); }
    else play(u, 'hit', 250);
  }
  function unitTick(u, dt) {
    if (u.dead) {
      if (now - u.dead > 3000) { u.dead = 0; u.hp = Math.round(u.maxHp * 0.5); log(`${u.name}站起來了`); }
      return;
    }
    u.walking = false;
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.004 * dt / 1000);
    // 看到新的預警：反應時間後決定要不要跑
    const react = Number($('react').value);
    const threat = zones.find(z => inZone(z, u, 0.4));
    if (threat && $('dodge').checked) {
      if (u.seenZone !== threat) { u.seenZone = threat; u.reactAt = now + react + (u.me ? 0 : Math.random() * 200); }
      if (now >= u.reactAt && !u.dodge) { u.dodge = safeSpot(u); u.cast = null; }
    }
    if (u.dodge) {
      const d = dist(u, u.dodge);
      if (d < 0.05 || !zones.length) u.dodge = null;
      else { moveTo(u, u.dodge, dt, 0); return; }
    }
    if (threat && !$('dodge').checked) u.seenZone = threat;
    // 一般行動：走到射程內、打王；祭司補血
    const d = dist(u, boss);
    if (d > u.range) { moveTo(u, boss, dt, u.range - 0.3, $('dodge').checked); return; }
    if (u.cast) {
      if (now >= u.cast.end) { u.cast.done(); u.cast = null; }
      return;
    }
    u.atkT -= dt;
    if (u.atkT > 0) return;
    u.atkT = u.aspd;
    if (u.healer) {
      const low = party.filter(p => !p.dead).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low && low.hp < low.maxHp * 0.75) {
        u.cast = { end: now + 600, done: () => { const v = Math.round(low.maxHp * 0.15); low.hp = Math.min(low.maxHp, low.hp + v); addNum(low, '+' + v, '#7dff8a'); } };
        play(u, 'cast', 600);
      }
      return;
    }
    play(u, attackAct(u), Math.min(u.aspd, 600));
    if (u.range > 3) fx.push({ type: 'arrow', from: { x: u.x, y: u.y }, to: boss, t0: now, dur: 200 });
    const dmg = Math.round(u.atk * (0.9 + Math.random() * 0.2));
    boss.hp = Math.max(0, boss.hp - dmg);
    addNum(boss, String(dmg), '#fff');
    if (boss.hp <= 0) { log('🏆 巴風特被擊敗！'); boss.hp = boss.maxHp; }
  }
  /* avoid：預警還在時不踏進去（判定比觸發閃避的 0.4 格多留 0.1，避免邊緣來回抽動），原地等結算 */
  function moveTo(u, p, dt, stop, avoid) {
    const d = dist(u, p);
    const step = Math.min(WALK * dt / 1000, d - stop);
    if (step <= 0) return;
    const nx = u.x + (p.x - u.x) / d * step, ny = u.y + (p.y - u.y) / d * step;
    if (avoid && zones.some(z => inZone(z, { x: nx, y: ny }, 0.5) && !inZone(z, u, 0.5))) return;
    u.x = nx; u.y = ny;
    u.walking = true;
  }

  /* ---- 動畫 ---- */
  function attackAct(u) {
    const w = u.parts && u.parts.filter(p => p.indexOf('weapon/') === 0).pop();
    const named = w && window.PAPERDOLL.atk && window.PAPERDOLL.atk[w];
    return (named && paperdollFrameCount(u.parts[0], named)) ? named : 'attack';
  }
  function play(u, act, ms) {
    if (!u.parts) return;
    const n = paperdollFrameCount(u.parts[0], act);
    if (!n) return;
    const sw = paperdollSwingTiming(act, n, ms);
    Object.assign(u, { act, actT0: now, actOnce: sw.once, actDelay: sw.delay, actFrom: sw.from });
  }

  /* ---- 繪製 ---- */
  const cam = () => party[0];
  const sx = x => SCX + (x - cam().x) * CX;
  const sy = y => SCY + (y - cam().y) * CY;
  function addNum(u, text, color) { nums.push({ wx: u.x, wy: u.y, text, color, t0: now, off: Math.random() * 16 - 8 }); }
  function shout(u, text) { nums.push({ wx: u.x, wy: u.y, text: text + '！', color: '#ffe08a', t0: now, big: true, off: 0 }); }

  function drawFloor() {
    ctx.fillStyle = '#1a2414'; ctx.fillRect(0, 0, W, H);
    if (!floorImg.complete || !floorImg.naturalWidth) return;
    const pat = ctx.createPattern(floorImg, 'repeat');
    // 地板跟著世界座標捲（玩家走動＝世界反向平移）
    const ox = -cam().x * CX, oy = -cam().y * CY;
    ctx.save();
    ctx.translate(ox % 512, oy % 512);
    ctx.fillStyle = pat; ctx.fillRect(-512, -512, W + 1024, H + 1024);
    ctx.restore();
    const g = ctx.createRadialGradient(SCX, SCY, 120, SCX, SCY, W * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // 預警形狀在「地面座標」畫：先縮放成俯視橢圓
  function zonePath(z) {
    ctx.beginPath();
    if (z.type === 'circle' || z.type === 'burst') ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    else if (z.type === 'donut') { ctx.arc(0, 0, z.r1, 0, Math.PI * 2); ctx.moveTo(z.r0, 0); ctx.arc(0, 0, z.r0, 0, Math.PI * 2, true); }
    else if (z.type === 'cone') { ctx.moveTo(0, 0); ctx.arc(0, 0, z.len, z.ang - z.half, z.ang + z.half); ctx.closePath(); }
    else if (z.type === 'line') { ctx.rotate(z.ang); ctx.rect(0, -z.w / 2, z.len, z.w); }
  }
  function drawZones() {
    zones.forEach(z => {
      const k = Math.min(1, (now - z.t0) / (z.end - z.t0));
      ctx.save();
      ctx.translate(sx(z.x), sy(z.y)); ctx.scale(CX, CY);
      zonePath(z);
      ctx.fillStyle = `rgba(255,60,40,${0.14 + 0.1 * Math.sin(now / 80)})`; ctx.fill('evenodd');
      ctx.lineWidth = 2 / CX; ctx.strokeStyle = 'rgba(255,90,60,.95)'; ctx.stroke();
      ctx.restore();
      // 填滿進度：同形狀等比放大（直線改成往前長）
      ctx.save();
      ctx.translate(sx(z.x), sy(z.y)); ctx.scale(CX, CY);
      const zz = { ...z };
      if (z.type === 'circle' || z.type === 'burst') zz.r = z.r * k;
      if (z.type === 'cone') zz.len = z.len * k;
      if (z.type === 'line') zz.len = z.len * k;
      if (z.type === 'donut') zz.r1 = z.r0 + (z.r1 - z.r0) * k;
      zonePath(zz);
      ctx.fillStyle = 'rgba(255,70,40,.32)'; ctx.fill('evenodd');
      ctx.restore();
    });
  }
  function drawUnit(u) {
    if (!u.parts || !u.bounds) return;
    const faceRight = boss.x > u.x;
    let act, n;
    if (u.dead) { act = 'die'; n = (paperdollFrameCount(u.parts[0], 'die') || 1) - 1; }
    else if (u.actOnce && now - u.actT0 < u.actOnce) {
      act = u.act; n = Math.min(u.actFrom + ((now - u.actT0) / u.actDelay | 0), (paperdollFrameCount(u.parts[0], act) || 1) - 1);
    } else {
      act = u.cast ? 'cast' : u.walking ? 'walk_s' : 'ready_s';
      n = ((now / ((window.PAPERDOLL.delay || {})[act] || 100)) | 0) % (paperdollFrameCount(u.parts[0], act) || 1);
    }
    const d = u.dc.getContext('2d');
    d.imageSmoothingEnabled = false; d.clearRect(0, 0, u.dc.width, u.dc.height);
    drawPaperdollFrame(d, u.parts, act, n, -u.bounds.minX, -u.bounds.minY);
    const x = sx(u.x), y = sy(u.y);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    const flip = /_s$/.test(act) ? !faceRight : faceRight;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(u.dc, u.bounds.minX * K, -u.bounds.feet * K, u.bounds.width * K, u.bounds.height * K);
    ctx.restore();
    u.headY = y - u.bounds.feet * K;
    bar(x, u.headY - 8, 46, u.hp, u.maxHp, u.me ? '#4fd36a' : '#7fd09a');
    if (u.cast) bar(x, u.headY - 14, 46, 600 - (u.cast.end - now), 600, '#ffd25a');
    if (u.dodge) { ctx.fillStyle = '#9fe6ff'; ctx.font = '11px "Microsoft JhengHei"'; ctx.textAlign = 'center'; ctx.fillText('閃避', x, u.headY - 18); }
  }
  function drawBoss() {
    const d = window.MOB_ANIM_TABLE[BOSS_ID], sheet = img('../../images/mob_anim/' + BOSS_ID + '.png');
    const x = sx(boss.x), y = sy(boss.y), k = 1.6;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, y, 34, 11, 0, 0, Math.PI * 2); ctx.fill();
    let top = y - 120;
    if (d && sheet.complete && sheet.naturalWidth) {
      const actName = boss.cast ? 'attack' : (boss.act === 'attack' && now - boss.actT0 < 800 ? 'attack' : boss.dash ? 'walk' : boss.act === 'attack' ? 'idle' : boss.act);
      const a = d.actions[actName] || d.actions.idle;
      const idx = a.start + (((now / a.delay) | 0) % a.frames);
      const [cw, ch] = d.cell, [ax, ay] = d.anchor;
      ctx.save(); ctx.translate(x, y); if (boss.face > 0) ctx.scale(-1, 1);
      ctx.drawImage(sheet, (idx % d.cols) * cw, Math.floor(idx / d.cols) * ch, cw, ch, -ax * k, -ay * k, cw * k, ch * k);
      ctx.restore();
      top = y - ay * k;
    }
    boss.headY = top;
    bar(x, top - 10, 90, boss.hp, boss.maxHp, '#e0524a');
    if (boss.cast) bar(x, top - 18, 90, now - boss.cast.t0, boss.cast.end - boss.cast.t0, '#ff9a3a');
  }
  function bar(x, y, w, v, max, color) {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, v / max)), 4);
  }
  function drawFx() {
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i], k = (now - e.t0) / e.dur;
      if (k >= 1) { fx.splice(i, 1); continue; }
      if (e.type === 'boom') {
        ctx.save(); ctx.translate(sx(e.z.x), sy(e.z.y)); ctx.scale(CX, CY);
        zonePath(e.z); ctx.fillStyle = `rgba(255,200,120,${0.6 * (1 - k)})`; ctx.fill('evenodd');
        ctx.restore();
      } else if (e.type === 'arrow') {
        const x0 = sx(e.from.x), y0 = sy(e.from.y) - 40, x1 = sx(e.to.x), y1 = sy(e.to.y) - 50;
        const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, a = Math.atan2(y1 - y0, x1 - x0);
        ctx.strokeStyle = '#f3e2b0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 16, y - Math.sin(a) * 16); ctx.stroke();
      }
    }
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i], k = (now - n.t0) / 900;
      if (k >= 1) { nums.splice(i, 1); continue; }
      const x = sx(n.wx) + n.off, y = sy(n.wy) - (n.big ? 150 : 95) - k * 28;
      ctx.globalAlpha = 1 - k * k; ctx.textAlign = 'center';
      ctx.font = `bold ${n.big ? 18 : 15}px "Microsoft JhengHei", sans-serif`;
      ctx.fillStyle = '#000'; ctx.fillText(n.text, x + 1, y + 1);
      ctx.fillStyle = n.color; ctx.fillText(n.text, x, y);
      ctx.globalAlpha = 1;
    }
  }
  function renderStats() {
    const rate = stat.hits + stat.dodged ? Math.round(stat.dodged / (stat.hits + stat.dodged) * 100) : 0;
    $('stats').innerHTML = [
      ['王施放預警技', stat.casts], ['閃過（人次）', stat.dodged], ['被打中（人次）', stat.hits],
      ['閃避率', rate + '%'], ['預警技總傷害', stat.taken.toLocaleString()],
    ].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
  }

  let statT = 0;
  function frame(t) {
    const sp = Number($('speed').value) || 1;
    const dt = Math.min(100, t - last) * sp; last = t;
    now += dt;   // 模擬時鐘（倍速時預警也跟著快）
    bossTick(dt);
    party.forEach(u => unitTick(u, dt));
    drawFloor();
    drawZones();
    const drawables = [...party.map(u => ({ y: u.y, f: () => drawUnit(u) })), { y: boss.y, f: drawBoss }];
    drawables.sort((a, b) => a.y - b.y).forEach(d => d.f());
    drawFx();
    if ((statT += dt) > 250) { statT = 0; renderStats(); }
    requestAnimationFrame(frame);
  }

  $('skill').innerHTML += ORDER.map(id => `<option value="${id}">${SKILLS[id].name}（${SKILLS[id].desc}）</option>`).join('');
  $('reset').onclick = reset;
  reset();
  window.__bossview = () => ({ party, zones });   // 除錯用
  last = performance.now();
  requestAnimationFrame(frame);
})();
