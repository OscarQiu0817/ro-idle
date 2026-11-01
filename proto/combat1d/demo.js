/* 一維戰鬥原型的試玩頁：sim.js 跑模擬，這裡只負責畫。
   座標：怪的 (d, a) → 螢幕 (cx + cos a·d·CELL, cy + sin a·d·CELL·Y_SQUASH) */
(async function () {
  const CELL = 34;
  const Y_SQUASH = 0.72;
  const SPRITE_SCALE = 1.1;
  const MAP_BG = { in_sphinx2: '../../images/maps/desert.jpg', um_fild01: '../../images/maps/field.jpg' };
  const SKILL_NAME = {
    SM_BASH: '狂擊', SM_MAGNUM: '怒爆', KN_BOWLINGBASH: '連環暴擊',
    AC_DOUBLE: '二連矢', AC_SHOWER: '箭雨', HT_BLITZBEAT: '獵鷹',
    MG_FIREBOLT: '火箭術', MG_THUNDERSTORM: '雷爆術', MG_FIREWALL: '火牆',
  };

  window.COMBAT1D_DATA = await (await fetch('data.json')).json();
  await new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'sim.js'; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
  const { createSim, DATA } = window.Combat1D;
  const CLASSES = window.COMBAT1D_CLASSES;

  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height, CX = W / 2, CY = H * 0.56;
  const $ = id => document.getElementById(id);

  /* ---- 選單 ---- */
  for (const [k, c] of Object.entries(CLASSES)) $('cls').add(new Option(c.label, k));
  for (const m of DATA.maps) $('map').add(new Option(m.name, m.id));
  for (const h of DATA.hats) $('hat').add(new Option(h.name, h.view));
  $('cls').value = 'wizard';

  /* ---- 圖片 ---- */
  const imgCache = {};
  function img(src) {
    if (!imgCache[src]) { const im = new Image(); im.src = src; imgCache[src] = im; }
    return imgCache[src];
  }
  const mobSheet = id => img('../../images/mob_anim/' + id + '.png');

  /* ---- 狀態 ---- */
  let sim, S, P, vis, fx, floats, corpses, logLines, parts, bounds, doll, castInfo;
  const dollCanvas = document.createElement('canvas');

  function log(msg) {
    logLines.unshift((S.t / 1000).toFixed(1) + 's　' + msg);
    if (logLines.length > 60) logLines.length = 60;
    $('log').textContent = logLines.join('\n');
  }

  function pos(d, a) { return [CX + Math.cos(a) * d * CELL, CY + Math.sin(a) * d * CELL * Y_SQUASH]; }

  function mobVis(mob) {
    let v = vis.get(mob.uid);
    if (!v) { v = { act: 'walk', t0: performance.now(), once: 0, lastD: mob.d }; vis.set(mob.uid, v); }
    return v;
  }
  function playMob(mob, act) {
    const d = window.MOB_ANIM_TABLE[mob.def.mobId];
    const a = d && d.actions[act];
    if (!a) return;
    const v = mobVis(mob);
    v.act = act; v.t0 = performance.now(); v.once = a.frames * a.delay;
  }
  function addFloat(x, y, text, color) { floats.push({ x, y, text, color, t0: performance.now() }); }

  function onEvent(type, e) {
    const now = performance.now();
    switch (type) {
      case 'spawn': mobVis(e.mob); break;
      case 'mobAttack': playMob(e.mob, 'attack'); break;
      case 'mobHit': {
        const v = mobVis(e.mob);
        if (v.act !== 'attack' || now - v.t0 > v.once) playMob(e.mob, 'hit');
        const [x, y] = pos(e.mob.d, e.mob.a);
        addFloat(x, y - 60, String(e.dmg), e.tag === '火牆' ? '#ff9a3c' : '#ffffff');
        break;
      }
      case 'miss': { const [x, y] = pos(e.mob.d, e.mob.a); addFloat(x, y - 60, 'MISS', '#9aa'); break; }
      case 'kill': {
        const [x, y] = pos(e.mob.d, e.mob.a);
        corpses.push({ mob: e.mob, x, y, t0: now, flip: x < CX });
        vis.delete(e.mob.uid);
        break;
      }
      case 'playerAttack': playDoll(attackAct()); break;
      case 'playerHit': addFloat(CX, CY - 110, String(e.dmg), '#ff5a5a'); if (!S.cast) playDoll('hit', 300); break;
      case 'playerMiss': addFloat(CX, CY - 110, 'MISS', '#9aa'); break;
      case 'castStart': castInfo = { id: e.id, ct: e.ct, t0: S.t }; log('詠唱 ' + SKILL_NAME[e.id] + '（' + (e.ct / 1000).toFixed(1) + ' 秒）'); break;
      case 'interrupt': addFloat(CX, CY - 135, '詠唱中斷', '#ffd23c'); log('詠唱被 ' + e.mob.def.name + ' 打斷'); castInfo = null; break;
      case 'skill': {
        castInfo = null;
        const c = e.plan && e.plan.center;
        fx.push({ id: e.id, t0: now, center: c ? { d: c.d, a: c.a } : null, half: e.plan && e.plan.half });
        if (e.id !== 'MG_FIREWALL') playDoll(DATA.skills[e.id].type === 'Magic' ? 'cast' : attackAct(), 400);
        break;
      }
      case 'death': log('倒下了，10 秒後復活'); corpses.length = 0; vis.clear(); break;
    }
  }

  /* ---- 紙娃娃 ---- */
  function buildDoll() {
    const look = P.look;
    parts = paperdollPartsFor({ job: look.job, gender: $('gender').value, hairStyle: 9, hairColor: 5,
      hatViews: [Number($('hat').value)], weaponCat: look.weaponCat });
    bounds = parts && paperdollBounds(parts);
    if (bounds) { dollCanvas.width = bounds.width; dollCanvas.height = bounds.height; }
    doll = { act: 'idle', t0: performance.now(), once: 0, delay: 0, from: 0 };
  }
  function attackAct() {
    const weapon = parts && parts.filter(p => p.indexOf('weapon/') === 0).pop();
    const named = weapon && window.PAPERDOLL.atk && window.PAPERDOLL.atk[weapon];
    if (named && paperdollFrameCount(parts[0], named)) return named;
    if (weapon && paperdollFrameCount(parts[0], 'slash')) return 'slash';
    return 'attack';
  }
  function playDoll(act, ms) {
    if (!parts) return;
    const n = paperdollFrameCount(parts[0], act);
    if (!n) return;
    const sw = paperdollSwingTiming(act, n, ms || P.aspdMs);
    doll = { act, t0: performance.now(), once: sw.once, delay: sw.delay, from: sw.from };
  }
  function drawDoll(now, faceRight) {
    if (!parts || !bounds) return;
    let act = doll.act, n;
    if (doll.once && now - doll.t0 < doll.once) {
      const nF = paperdollFrameCount(parts[0], act) || 1;
      n = Math.min(doll.from + ((now - doll.t0) / doll.delay | 0), nF - 1);
    } else {
      act = S.t < S.deadUntil ? 'die' : S.cast ? 'cast' : (S.mobs.length && paperdollFrameCount(parts[0], 'ready_s') ? 'ready_s' : 'idle');
      const nF = paperdollFrameCount(parts[0], act) || 1;
      const delay = (window.PAPERDOLL.delay && window.PAPERDOLL.delay[act]) || 100;
      n = act === 'die' ? nF - 1 : ((now / delay) | 0) % nF;
    }
    const dctx = dollCanvas.getContext('2d');
    dctx.imageSmoothingEnabled = false;
    dctx.clearRect(0, 0, dollCanvas.width, dollCanvas.height);
    drawPaperdollFrame(dctx, parts, act, n, -bounds.minX, -bounds.minY);
    const k = SPRITE_SCALE;
    const flip = act === 'idle' ? false : (/_s$/.test(act) ? !faceRight : faceRight);
    ctx.save();
    ctx.translate(CX, CY);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(dollCanvas, -(-bounds.minX) * k, -bounds.feet * k, bounds.width * k, bounds.height * k);
    ctx.restore();
  }

  /* ---- 怪物 ---- */
  function drawMobSprite(mob, x, y, act, frameIdx, flip, alpha) {
    const d = window.MOB_ANIM_TABLE[mob.def.mobId];
    const sheet = mobSheet(mob.def.mobId);
    if (!d || !sheet.complete || !sheet.naturalWidth) {
      ctx.fillStyle = '#c55'; ctx.beginPath(); ctx.arc(x, y - 12, 10, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const a = d.actions[act] || d.actions.idle;
    const idx = a.start + Math.min(frameIdx, a.frames - 1);
    const [cw, ch] = d.cell;
    const sx = (idx % d.cols) * cw, sy = Math.floor(idx / d.cols) * ch;
    const [ax, ay] = d.anchor;
    const k = SPRITE_SCALE;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, sy, cw, ch, -ax * k, -ay * k, cw * k, ch * k);
    ctx.restore();
  }
  function mobFrame(mob, now) {
    const d = window.MOB_ANIM_TABLE[mob.def.mobId];
    const v = mobVis(mob);
    const moved = Math.abs(mob.d - v.lastD) > 0.001;
    v.lastD = mob.d;
    let act = v.act;
    if (!(v.once && now - v.t0 < v.once)) { act = moved ? 'walk' : 'idle'; v.act = act; v.once = 0; }
    const a = d && (d.actions[act] || d.actions.idle);
    if (!a) return { act, n: 0 };
    const el = now - v.t0;
    const n = v.once ? Math.floor(el / a.delay) : Math.floor(now / a.delay) % a.frames;
    return { act, n };
  }

  /* ---- 特效 ---- */
  function drawWall(w, now) {
    const flick = 0.75 + 0.25 * Math.sin(now / 60 + w.d * 3);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['rgba(255,90,20,', 'rgba(255,170,40,', 'rgba(255,240,150,'][i] + (0.55 * flick) + ')';
      ctx.lineWidth = [16, 9, 4][i];
      ctx.beginPath();
      ctx.ellipse(CX, CY, w.d * CELL, w.d * CELL * Y_SQUASH, 0, w.a - w.half, w.a + w.half);
      ctx.stroke();
    }
    const [x, y] = pos(w.d + 0.6, w.a);
    ctx.fillStyle = '#ffd9a0'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(w.hits, x, y);
    ctx.restore();
  }
  function drawFx(now) {
    fx = fx.filter(f => now - f.t0 < 600);
    for (const f of fx) {
      const t = (now - f.t0) / 600;
      if (!f.center || f.id === 'MG_FIREWALL') continue;
      const [x, y] = pos(f.center.d, f.center.a);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      if (f.id === 'MG_THUNDERSTORM' || f.id === 'AC_SHOWER' || f.id === 'KN_BOWLINGBASH' || f.id === 'HT_BLITZBEAT') {
        const r = (DATA.skills[f.id].unit && DATA.skills[f.id].unit.range ? 2 : (DATA.skills[f.id].splash || [1])[0] || 1) * CELL;
        ctx.fillStyle = f.id === 'MG_THUNDERSTORM' ? 'rgba(170,200,255,0.35)' : 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.ellipse(x, y, r, r * Y_SQUASH, 0, 0, Math.PI * 2); ctx.fill();
        if (f.id === 'MG_THUNDERSTORM') {
          ctx.strokeStyle = '#dfe9ff'; ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) { const ox = (Math.random() - 0.5) * r; ctx.beginPath(); ctx.moveTo(x + ox, y - 120); ctx.lineTo(x + ox * 0.5, y - 40); ctx.lineTo(x + ox, y); ctx.stroke(); }
        }
      } else if (f.id === 'SM_MAGNUM') {
        const r = 2 * CELL * (0.5 + t);
        ctx.strokeStyle = 'rgba(255,120,40,0.8)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(CX, CY, r, r * Y_SQUASH, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeStyle = f.id === 'MG_FIREBOLT' ? '#ff8a3c' : '#ffffff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(CX, CY - 40); ctx.lineTo(x, y - 30); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawFloats(now) {
    floats = floats.filter(f => now - f.t0 < 900);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    for (const f of floats) {
      const t = (now - f.t0) / 900;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 3; ctx.strokeStyle = '#000';
      ctx.strokeText(f.text, f.x, f.y - t * 30);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - t * 30);
    }
    ctx.restore();
  }

  /* ---- HUD ---- */
  function bar(x, y, w, h, ratio, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * ratio), h - 2);
  }
  function drawHud() {
    bar(16, 16, 220, 14, S.hp / P.maxHp, '#d94b4b');
    bar(16, 34, 220, 14, S.sp / P.maxSp, '#4b7fd9');
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('HP ' + Math.max(0, Math.round(S.hp)) + ' / ' + P.maxHp, 22, 27);
    ctx.fillText('SP ' + Math.round(S.sp) + ' / ' + P.maxSp, 22, 45);
    if (S.cast && castInfo) {
      const ratio = Math.min(1, (S.t - castInfo.t0) / Math.max(1, S.cast.endAt - castInfo.t0));
      bar(CX - 50, CY - 125, 100, 10, ratio, '#e8c34b');
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText(SKILL_NAME[S.cast.id], CX, CY - 130);
    }
    for (let d = 2; d <= 10; d += 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.ellipse(CX, CY, d * CELL, d * CELL * Y_SQUASH, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  function updateStats() {
    const min = Math.max(1 / 60, S.t / 60000);
    const m = S.m;
    const rows = [
      ['擊殺/分', (m.kills / min).toFixed(1)],
      ['承傷/分', Math.round(m.dmgTaken / min)],
      ['打斷率', m.castsTimed ? Math.round(m.interrupts / m.castsTimed * 100) + '%' : '—'],
      ['死亡', m.deaths],
      ['火牆擋下', m.wallHits],
      ['模擬時間', (S.t / 1000).toFixed(0) + ' 秒'],
    ];
    $('stats').innerHTML = rows.map(r => `<div class="stat"><b>${r[1]}</b><span>${r[0]}</span></div>`).join('');
  }

  /* ---- 主迴圈 ---- */
  function reset() {
    P = { ...CLASSES[$('cls').value], smartCast: $('smart').checked, noCastCancel: $('phen').checked };
    vis = new Map(); fx = []; floats = []; corpses = []; logLines = []; castInfo = null;
    sim = createSim({ player: P, mapId: $('map').value, seed: Date.now() % 100000, angular: true,
      interruptRule: $('rule').value, onEvent });
    S = sim.state;
    buildDoll();
    $('log').textContent = '';
  }
  ['cls', 'map', 'rule', 'smart', 'phen'].forEach(id => $(id).addEventListener('change', reset));
  ['gender', 'hat'].forEach(id => $(id).addEventListener('change', buildDoll));
  $('reset').addEventListener('click', reset);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    sim.run(dt * Number($('speed').value));

    const bg = img(MAP_BG[$('map').value]);
    if (bg.complete && bg.naturalWidth) {
      const k = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      ctx.drawImage(bg, (W - bg.naturalWidth * k) / 2, (H - bg.naturalHeight * k) / 2, bg.naturalWidth * k, bg.naturalHeight * k);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    } else { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W, H); }
    drawHud();
    for (const w of S.walls) drawWall(w, now);

    /* 依 y 排序：遠的先畫 */
    const items = [];
    corpses = corpses.filter(c => now - c.t0 < 1500);
    for (const c of corpses) items.push({ y: c.y, draw: () => {
      const d = window.MOB_ANIM_TABLE[c.mob.def.mobId];
      const a = d && d.actions.die;
      const n = a ? Math.floor((now - c.t0) / a.delay) : 0;
      drawMobSprite(c.mob, c.x, c.y, 'die', n, c.flip, 1 - Math.max(0, (now - c.t0 - 900) / 600));
    } });
    let target = null;
    for (const mob of S.mobs) {
      const [x, y] = pos(mob.d, mob.a);
      if (!target || mob.d < target.d) target = mob;
      const f = mobFrame(mob, now);
      items.push({ y, draw: () => {
        drawMobSprite(mob, x, y, f.act, f.n, x < CX, 1);
        bar(x - 20, y + 4, 40, 5, mob.hp / mob.def.hp, '#d94b4b');
      } });
    }
    const faceRight = target ? pos(target.d, target.a)[0] >= CX : true;
    items.push({ y: CY, draw: () => drawDoll(now, faceRight) });
    items.sort((a, b) => a.y - b.y).forEach(it => it.draw());

    drawFx(now);
    drawFloats(now);
    if ((now | 0) % 10 < 2) updateStats();
    requestAnimationFrame(frame);
  }
  reset();
  requestAnimationFrame(frame);
})();
