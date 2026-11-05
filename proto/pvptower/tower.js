/* PVP 爬塔原型：俯視角 1 對 1 淘汰賽。
   關主＝角色資料（職業、等級、素質）換算成「人形怪物」數值，雙方跑同一套簡化戰鬥。
   只看畫面與節奏，公式不是正式版。 */
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const ACX = W / 2, ACY = H * 0.56, ARX = 400, ARY = 200;   // 場地橢圓（俯視 3/4 視角）
  const CELL = 34;                                            // 一格幾 px（場地座標）
  const Y_SQUASH = ARY / ARX;
  const SPRITE_SCALE = 1.35;
  const FLOOR_SEC = 60;

  /* ---- 職業模板 ---- */
  const JOBS = {
    knight: { label: '騎士', weaponCat: 'sword2', ratio: { str: 5, agi: 3, vit: 4, int: 1, dex: 3, luk: 1 }, hpK: 1.5, spK: 0.8, wk: 3.2, range: 2.4, aspd: 700,
      skill: { name: '怪物互擊', cast: 700, cd: 2500, sp: 13, mult: 3.5, kind: 'phys', fx: 'slash' } },
    assassin: { label: '刺客', weaponCat: 'katar', ratio: { str: 4, agi: 5, vit: 2, int: 1, dex: 3, luk: 2 }, hpK: 1.1, spK: 0.8, wk: 2.8, range: 2.4, aspd: 520,
      skill: { name: '音速投擲', cast: 0, cd: 3500, sp: 18, mult: 5.5, kind: 'phys', fx: 'slash', hits: 4 } },
    hunter: { label: '獵人', weaponCat: 'bow', ratio: { str: 2, agi: 4, vit: 2, int: 1, dex: 6, luk: 2 }, hpK: 1.05, spK: 1, wk: 2.6, range: 9, aspd: 620,
      skill: { name: '二連矢', cast: 0, cd: 1600, sp: 12, mult: 2.8, kind: 'phys', fx: 'arrow', hits: 2 } },
    wizard: { label: '巫師', weaponCat: 'rod1', ratio: { str: 1, agi: 2, vit: 3, int: 6, dex: 5, luk: 1 }, hpK: 0.85, spK: 2.2, wk: 1.2, range: 9, aspd: 950,
      skill: { name: '雷鳴術', cast: 1400, cd: 2000, sp: 30, mult: 4.2, kind: 'magic', fx: 'bolt', push: 2 } },
    priest: { label: '祭司', weaponCat: 'mace', ratio: { str: 3, agi: 2, vit: 4, int: 5, dex: 3, luk: 1 }, hpK: 1.1, spK: 1.8, wk: 2.2, range: 2.4, aspd: 720,
      skill: { name: '聖光術', cast: 900, cd: 1800, sp: 15, mult: 2.4, kind: 'magic', fx: 'holy' },
      heal: { name: '治癒術', cast: 0, cd: 3500, sp: 25, pct: 0.18 } },
    blacksmith: { label: '鐵匠', weaponCat: 'axe2', ratio: { str: 6, agi: 2, vit: 4, int: 1, dex: 3, luk: 2 }, hpK: 1.35, spK: 0.8, wk: 3.4, range: 2.4, aspd: 760,
      skill: { name: '金錢攻擊', cast: 0, cd: 2200, sp: 8, mult: 3.0, kind: 'phys', fx: 'slash' } },
  };
  const PLAYER_JOBS = ['knight', 'assassin', 'hunter', 'wizard', 'priest', 'blacksmith'];
  const PLAYER_LV = 70;

  /* ---- 樓層與關主（原創名字）---- */
  const NAMES = ['薩克', '米蕾', '諾頓', '琪菈', '巴爾', '艾文', '茱妮', '洛克', '芙蘿', '雷歐'];
  const FLOORS = [];
  for (let f = 1; f <= 10; f++) {
    const lv = 10 + f * 7;
    const jobs = Object.keys(JOBS);
    let b = { floor: f, job: jobs[(f * 7 + 3) % jobs.length], lv, name: NAMES[f - 1], gender: f % 2 ? 'male' : 'female', hair: 1 + (f * 3) % 12, hairColor: f % 8, boost: 1 };
    if (f === 5) b = { ...b, job: 'knight', name: '鐵壁騎士 葛倫', gender: 'male', lv: lv + 4, boost: 1.25, line: '想過這扇門，先讓我的劍滿意。' };
    if (f === 10) b = { ...b, job: 'wizard', name: '冰晶魔導士 艾蕾西亞', gender: 'female', lv: lv + 6, boost: 1.4, line: '塔頂的風很冷，你準備好了嗎？' };
    FLOORS.push(b);
  }

  /* ---- 角色資料 → 戰鬥數值（人形怪物）---- */
  function makeFighter(o) {
    const J = JOBS[o.job];
    const pts = 48 + o.lv * 4.2;
    const rsum = Object.values(J.ratio).reduce((a, b) => a + b, 0);
    const st = {};
    for (const k in J.ratio) st[k] = Math.min(120, Math.round(1 + pts * J.ratio[k] / rsum / 1.6));
    const L = o.lv, bst = o.boost || 1;
    const maxHp = Math.round((120 + L * L * 0.55 * J.hpK + L * 22) * (1 + st.vit / 100) * bst);
    const maxSp = Math.round((15 + L * 3 * J.spK) * (1 + st.int / 100));
    return {
      ...o, J, st, label: J.label,
      maxHp, hp: maxHp, maxSp, sp: maxSp,
      atk: (st.str * 2 + st.dex / 5 + st.luk / 3 + L * J.wk) * bst,
      matk: (st.int * 2.6 + L * 2) * bst,
      defMul: 300 / (300 + 10 + st.vit * 0.8 + L * 0.6),
      mdefMul: 300 / (300 + st.int * 0.6 + st.vit * 0.3),
      hit: L + st.dex + 175, flee: L + st.agi + 100, crit: st.luk * 0.3 + 1,
      aspd: Math.max(260, J.aspd * (1 - st.agi / 260)),
      x: 0, y: 0, atkT: 0, skillT: 0, healT: 0, potT: 0, cast: null,
      act: 'ready_s', actT0: 0, actOnce: 0, actDelay: 0, actFrom: 0, dead: false,
    };
  }

  /* ---- 紙娃娃 ---- */
  function buildDoll(f) {
    f.parts = paperdollPartsFor({ job: f.job, gender: f.gender, hairStyle: f.hair || 9, hairColor: f.hairColor != null ? f.hairColor : 5, hatViews: [], weaponCat: f.J.weaponCat });
    f.bounds = f.parts && paperdollBounds(f.parts);
    f.dc = document.createElement('canvas');
    if (f.bounds) { f.dc.width = f.bounds.width; f.dc.height = f.bounds.height; }
  }
  function attackAct(f) {
    const w = f.parts && f.parts.filter(p => p.indexOf('weapon/') === 0).pop();
    const named = w && window.PAPERDOLL.atk && window.PAPERDOLL.atk[w];
    if (named && paperdollFrameCount(f.parts[0], named)) return named;
    return 'attack';
  }
  function play(f, act, ms) {
    if (!f.parts) return;
    const n = paperdollFrameCount(f.parts[0], act);
    if (!n) return;
    const sw = paperdollSwingTiming(act, n, ms);
    Object.assign(f, { act, actT0: now, actOnce: sw.once, actDelay: sw.delay, actFrom: sw.from });
  }
  function drawFighter(f, faceRight) {
    if (!f.parts || !f.bounds) return;
    let act, n;
    if (f.dead) { act = 'die'; n = (paperdollFrameCount(f.parts[0], 'die') || 1) - 1; }
    else if (f.actOnce && now - f.actT0 < f.actOnce) {
      act = f.act;
      n = Math.min(f.actFrom + ((now - f.actT0) / f.actDelay | 0), (paperdollFrameCount(f.parts[0], act) || 1) - 1);
    } else {
      act = f.cast ? 'cast' : f.walking ? 'walk_s' : 'ready_s';
      const nF = paperdollFrameCount(f.parts[0], act) || 1;
      n = ((now / ((window.PAPERDOLL.delay || {})[act] || 100)) | 0) % nF;
    }
    const d = f.dc.getContext('2d');
    d.imageSmoothingEnabled = false;
    d.clearRect(0, 0, f.dc.width, f.dc.height);
    drawPaperdollFrame(d, f.parts, act, n, -f.bounds.minX, -f.bounds.minY);
    const p = scr(f), k = SPRITE_SCALE;
    const flip = act === 'idle' ? false : (/_s$/.test(act) ? !faceRight : faceRight);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(f.dc, f.bounds.minX * k, -f.bounds.feet * k, f.bounds.width * k, f.bounds.height * k);
    ctx.restore();
    f.headY = p.y - f.bounds.feet * k;
  }

  /* ---- 座標 ---- */
  const scr = f => ({ x: ACX + f.x, y: ACY + f.y * Y_SQUASH });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / CELL;

  /* ---- 狀態 ---- */
  let me = null, foe = null, floorIdx = 0, timeLeft = FLOOR_SEC, phase = 'idle', phaseT = 0, pots = 10;
  let now = performance.now(), last = now;
  const fx = [], nums = [];
  const logEl = $('log');
  const log = t => { logEl.insertAdjacentHTML('afterbegin', `<div>${t}</div>`); };

  /* ---- 每日次數（試玩用 localStorage）---- */
  const KEY = 'pvptower_demo';
  const today = () => new Date().toISOString().slice(0, 10);
  function loadRec() {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(KEY)); } catch (e) { r = null; }
    if (!r || r.date !== today()) r = { date: today(), tries: 3, best: (r && r.best) || 0 };
    return r;
  }
  function saveRec(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) { /* 無痕模式 */ } }
  let rec = loadRec();

  function renderSide() {
    $('tries').textContent = rec.tries;
    $('best').textContent = rec.best;
    $('start').disabled = rec.tries <= 0 || phase === 'fight' || phase === 'intro' || phase === 'win';
    $('floors').innerHTML = FLOORS.slice().reverse().map(b => {
      const cur = phase !== 'idle' && b.floor === floorIdx + 1;
      const cls = ['floor', b.boost > 1 ? 'boss' : '', cur ? 'cur' : '', b.floor <= rec.best ? 'done' : ''].join(' ');
      return `<div class="${cls}"><span>${b.floor}F ${b.boost > 1 ? '👑 ' : ''}${b.name}</span><span>${JOBS[b.job].label} Lv${b.lv}</span></div>`;
    }).join('');
  }

  /* ---- 流程 ---- */
  function startRun() {
    if (rec.tries <= 0) return;
    rec.tries--; saveRec(rec);
    const job = $('cls').value;
    me = makeFighter({ job, lv: PLAYER_LV, name: '你', gender: $('gender').value, hair: 9, hairColor: 5, isMe: true });
    buildDoll(me);
    pots = 10; floorIdx = 0;
    logEl.innerHTML = '';
    log(`開始挑戰（剩 ${rec.tries} 次）：${me.label} Lv${me.lv}`);
    enterFloor();
  }
  function enterFloor() {
    const b = FLOORS[floorIdx];
    foe = makeFighter(b);
    buildDoll(foe);
    me.x = -230; me.y = 90; foe.x = 230; foe.y = -90;
    me.cast = foe.cast = null; me.atkT = foe.atkT = 300;
    timeLeft = FLOOR_SEC; phase = 'intro'; phaseT = 1800;
    fx.length = 0; nums.length = 0;
    log(`<b>${b.floor}F</b> ${b.name}（${foe.label} Lv${b.lv}）${b.line ? '：「' + b.line + '」' : ''}`);
    renderSide();
  }
  function endFloor(win) {
    if (win) {
      if (floorIdx + 1 > rec.best) { rec.best = floorIdx + 1; saveRec(rec); }
      log(`✅ 擊敗 ${foe.name}`);
      phase = floorIdx + 1 >= FLOORS.length ? 'top' : 'win';
      phaseT = 2200;
      if (phase === 'top') log('🏆 登頂！');
    } else {
      phase = 'lose'; phaseT = 0;
      log(`💀 ${timeLeft <= 0 ? '時間到' : '倒下了'}，止步 ${floorIdx + 1}F`);
    }
    renderSide();
  }

  /* ---- 戰鬥 ---- */
  function addNum(f, text, color) { const p = scr(f); nums.push({ x: p.x + (Math.random() * 20 - 10), y: (f.headY || p.y - 90) - 4, text, color, t0: now }); }
  function shout(f, text) { nums.push({ x: scr(f).x, y: (f.headY || scr(f).y - 90) - 26, text, color: '#ffe08a', t0: now, big: true }); }
  function hurt(target, dmg, attacker) {
    target.hp = Math.max(0, target.hp - dmg);
    addNum(target, String(dmg), target.isMe ? '#ff7a6a' : '#fff');
    if (!target.cast && !(target.actOnce && now - target.actT0 < target.actOnce)) play(target, 'hit', 260);
    if (target.hp <= 0 && !target.dead) { target.dead = true; target.cast = null; endFloor(!target.isMe); }
  }
  function physHit(a, t, mult, hits) {
    const chance = Math.max(5, Math.min(95, 80 + a.hit - t.flee));
    hits = hits || 1;
    for (let i = 0; i < hits; i++) {
      const crit = Math.random() * 100 < a.crit;
      if (!crit && Math.random() * 100 >= chance) { addNum(t, 'Miss', '#9fc8ff'); continue; }
      const dmg = Math.round(a.atk * mult / hits * (0.9 + Math.random() * 0.2) * (crit ? 1.4 : t.defMul));
      setTimeout(() => { if (!t.dead && phase === 'fight') hurt(t, dmg, a); }, i * 120);
    }
  }
  function magicHit(a, t, mult) {
    hurt(t, Math.round(a.matk * mult * (0.95 + Math.random() * 0.1) * t.mdefMul), a);
  }
  function useSkill(a, t, sk) {
    a.sp -= sk.sp; a.skillT = sk.cd;
    shout(a, sk.name + '！');
    if (sk.fx === 'arrow') fx.push({ type: 'arrow', from: a, to: t, t0: now, dur: 220 });
    else if (sk.fx === 'bolt') fx.push({ type: 'bolt', to: t, t0: now, dur: 450 });
    else if (sk.fx === 'holy') fx.push({ type: 'holy', to: t, t0: now, dur: 500 });
    else fx.push({ type: 'slash', to: t, t0: now, dur: 300 });
    play(a, sk.kind === 'magic' ? 'cast' : attackAct(a), 400);
    if (sk.kind === 'magic') magicHit(a, t, sk.mult); else physHit(a, t, sk.mult, sk.hits);
    if (sk.push && !t.dead) {   // 擊退：沿兩人連線往後推
      const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy) || 1;
      t.x += dx / d * sk.push * CELL; t.y += dy / d * sk.push * CELL;
      clampArena(t);
    }
  }
  function clampArena(f) {
    const r = Math.hypot(f.x / (ARX - 40), f.y / (ARX * 0.9 - 40));
    if (r > 1) { f.x /= r; f.y /= r; }
  }
  function think(a, t, dt) {
    if (a.dead) return;
    a.atkT -= dt; a.skillT -= dt; a.healT -= dt; a.potT -= dt;
    a.sp = Math.min(a.maxSp, a.sp + dt / 1000 * (1 + a.maxSp / 150));
    a.walking = false;
    // 紅水（只有玩家）
    if (a.isMe && pots > 0 && a.hp < a.maxHp * 0.4 && a.potT <= 0) {
      pots--; a.potT = 600;
      const v = Math.round(a.maxHp * 0.12);
      a.hp = Math.min(a.maxHp, a.hp + v); addNum(a, '+' + v, '#7dff8a');
    }
    if (a.cast) {
      a.cast.t += dt;
      if (a.cast.t >= a.cast.ms) {
        const c = a.cast; a.cast = null;
        if (c.heal) doHeal(a, c.sk); else useSkill(a, t, c.sk);
      }
      return;
    }
    // 補血（祭司）
    const hl = a.J.heal;
    if (hl && a.hp < a.maxHp * 0.5 && a.healT <= 0 && a.sp >= hl.sp) {
      a.healT = hl.cd;
      if (hl.cast) a.cast = { sk: hl, ms: hl.cast, t: 0, heal: true }; else doHeal(a, hl);
      return;
    }
    const d = dist(a, t);
    if (d > a.J.range) {
      const step = 6.5 * CELL * dt / 1000;
      const dx = t.x - a.x, dy = t.y - a.y, len = Math.hypot(dx, dy) || 1;
      const go = Math.min(step, (d - a.J.range + 0.2) * CELL);
      a.x += dx / len * go; a.y += dy / len * go;
      a.walking = true;
      return;
    }
    const sk = a.J.skill;
    if (sk && a.skillT <= 0 && a.sp >= sk.sp) {
      if (sk.cast) { a.cast = { sk, ms: sk.cast, t: 0 }; a.skillT = sk.cd; shout(a, '詠唱 ' + sk.name); return; }
      useSkill(a, t, sk); a.atkT = Math.max(a.atkT, a.aspd); return;
    }
    if (a.atkT <= 0) {
      a.atkT = a.aspd;
      play(a, attackAct(a), Math.min(a.aspd, 600));
      if (a.J.range > 2) fx.push({ type: 'arrow', from: a, to: t, t0: now, dur: 200, small: a.job !== 'hunter' });
      if (a.job === 'wizard') magicHit(a, t, 0.6); else physHit(a, t, 1);
    }
  }
  function doHeal(a, hl) {
    a.sp -= hl.sp;
    const v = Math.round(a.maxHp * hl.pct);
    a.hp = Math.min(a.maxHp, a.hp + v);
    shout(a, hl.name + '！'); addNum(a, '+' + v, '#7dff8a');
    fx.push({ type: 'heal', to: a, t0: now, dur: 600 });
    play(a, 'cast', 400);
  }

  /* ---- 繪製 ---- */
  const floorImg = new Image(); floorImg.src = '../../images/maps/town.jpg';
  function drawArena() {
    ctx.fillStyle = '#0d0b08'; ctx.fillRect(0, 0, W, H);
    if (floorImg.complete && floorImg.naturalWidth) {
      const pat = ctx.createPattern(floorImg, 'repeat');
      ctx.save();
      ctx.globalAlpha = 0.25; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.ellipse(ACX, ACY, ARX, ARY, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(ACX, ACY, 40, ACX, ACY, ARX);
      g.addColorStop(0, 'rgba(255,220,150,.10)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // 外圈與魔法陣
    ctx.strokeStyle = 'rgba(201,162,74,.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(ACX, ACY, ARX, ARY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,160,255,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ACX, ACY, ARX * 0.42, ARY * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(ACX, ACY); ctx.scale(1, Y_SQUASH); ctx.rotate(now / 6000);
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) { const a = i * Math.PI * 4 / 5; const r = ARX * 0.42; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.stroke(); ctx.restore();
    // 四根火把柱
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([u, v]) => {
      const x = ACX + u * (ARX + 18), y = ACY + v * (ARY + 14);
      ctx.fillStyle = '#3a3126'; ctx.fillRect(x - 7, y - 40, 14, 40);
      const fl = 6 + Math.sin(now / 90 + u * 3 + v) * 2;
      const g = ctx.createRadialGradient(x, y - 46, 1, x, y - 46, 26);
      g.addColorStop(0, 'rgba(255,220,120,.95)'); g.addColorStop(.3, 'rgba(255,130,40,.6)'); g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 46, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(x, y - 46, 4, fl, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  function bar(x, y, w, v, max, color) {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y, w * Math.max(0, v / max), 4);
  }
  function drawHud(f) {
    const p = scr(f), y = (f.headY || p.y - 90) - 10;
    bar(p.x, y, 60, f.hp, f.maxHp, f.isMe ? '#4fd36a' : '#e0524a');
    bar(p.x, y + 6, 60, f.sp, f.maxSp, '#4a8cff');
    if (f.cast) bar(p.x, y - 10, 60, f.cast.t, f.cast.ms, '#ffd25a');
    ctx.font = '12px "Microsoft JhengHei", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(f.name, p.x + 1, p.y + 21);
    ctx.fillStyle = f.isMe ? '#bfe6ff' : (f.boost > 1 ? '#ffb26a' : '#fff'); ctx.fillText(f.name, p.x, p.y + 20);
  }
  function drawFx() {
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i], k = (now - e.t0) / e.dur;
      if (k >= 1) { fx.splice(i, 1); continue; }
      const tp = scr(e.to), ty = tp.y - 40;
      if (e.type === 'arrow') {
        const fp = scr(e.from), x = fp.x + (tp.x - fp.x) * k, y = fp.y - 40 + (ty - fp.y + 40) * k;
        const ang = Math.atan2(ty - fp.y + 40, tp.x - fp.x);
        ctx.strokeStyle = e.small ? '#9fd0ff' : '#f3e2b0'; ctx.lineWidth = e.small ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 18, y - Math.sin(ang) * 18); ctx.stroke();
      } else if (e.type === 'bolt') {
        ctx.strokeStyle = `rgba(190,220,255,${1 - k})`; ctx.lineWidth = 3;
        for (let b = 0; b < 3; b++) {
          ctx.beginPath(); let x = tp.x + (Math.random() * 30 - 15), y = ty - 160; ctx.moveTo(x, y);
          while (y < ty) { y += 22; x += Math.random() * 24 - 12; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(160,200,255,${0.4 * (1 - k)})`; ctx.beginPath(); ctx.arc(tp.x, ty, 30 + k * 20, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'holy') {
        const g = ctx.createRadialGradient(tp.x, ty, 2, tp.x, ty, 50);
        g.addColorStop(0, `rgba(255,255,220,${1 - k})`); g.addColorStop(1, 'rgba(255,240,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tp.x, ty, 50, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'heal') {
        ctx.strokeStyle = `rgba(120,255,150,${1 - k})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(tp.x, tp.y, 26 + k * 20, (26 + k * 20) * Y_SQUASH, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(tp.x, ty, 28, -1.2 + k * 1.5, 0.2 + k * 1.5); ctx.stroke();
      }
    }
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i], k = (now - n.t0) / 900;
      if (k >= 1) { nums.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `bold ${n.big ? 15 : 17}px "Microsoft JhengHei", sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(n.text, n.x + 1, n.y - k * 30 + 1);
      ctx.fillStyle = n.color; ctx.fillText(n.text, n.x, n.y - k * 30);
      ctx.globalAlpha = 1;
    }
  }
  function banner(text, sub) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H / 2 - 50, W, 100);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f0d68a'; ctx.font = 'bold 34px "Microsoft JhengHei", sans-serif';
    ctx.fillText(text, W / 2, H / 2 + 4);
    if (sub) { ctx.font = '15px "Microsoft JhengHei", sans-serif'; ctx.fillStyle = '#e8dcc4'; ctx.fillText(sub, W / 2, H / 2 + 32); }
  }
  function drawTop() {
    if (!foe) return;
    const b = FLOORS[floorIdx];
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = timeLeft < 10 ? '#ff7a6a' : '#f0d68a';
    ctx.fillText(Math.ceil(timeLeft), W / 2, 40);
    ctx.font = '14px "Microsoft JhengHei", sans-serif'; ctx.fillStyle = '#e8dcc4';
    ctx.fillText(`${b.floor}F　${me.label} Lv${me.lv}　VS　${foe.name}（${foe.label} Lv${foe.lv}）`, W / 2, 62);
    ctx.textAlign = 'left'; ctx.fillText(`🧪 紅水 ${pots}`, 16, 28);
  }

  function frame(t) {
    now = t;
    const sp = Number($('speed').value) || 1;
    const dt = Math.min(100, t - last) * sp; last = t;
    drawArena();
    if (phase === 'idle') {
      banner('試煉之塔', '選職業後按「開始挑戰」。每天 3 次，輸一場就淘汰。');
    } else {
      if (phase === 'intro') { phaseT -= dt; if (phaseT <= 0) phase = 'fight'; }
      else if (phase === 'fight') {
        timeLeft -= dt / 1000;
        think(me, foe, dt); think(foe, me, dt);
        if (timeLeft <= 0 && phase === 'fight') { timeLeft = 0; endFloor(false); }
      } else if (phase === 'win') { phaseT -= dt; if (phaseT <= 0) { floorIdx++; enterFloor(); } }
      // 畫面上方的先畫（俯視：y 小的在後面）
      const order = [me, foe].sort((a, b) => a.y - b.y);
      order.forEach(f => drawFighter(f, f === me ? foe.x > me.x : me.x > foe.x));
      order.forEach(drawHud);
      drawFx();
      drawTop();
      if (phase === 'intro') banner(`${FLOORS[floorIdx].floor}F`, `${foe.name}　${foe.label} Lv${foe.lv}${FLOORS[floorIdx].line ? '　「' + FLOORS[floorIdx].line + '」' : ''}`);
      if (phase === 'win') banner('勝利！', '往下一層……HP／SP 不回滿');
      if (phase === 'top') banner('🏆 登頂！', '試煉之塔全部通關');
      if (phase === 'lose') banner('淘汰', `止步 ${floorIdx + 1}F　今日剩 ${rec.tries} 次`);
    }
    if ((phase === 'lose' || phase === 'top') && $('start').disabled && rec.tries > 0) renderSide();
    requestAnimationFrame(frame);
  }

  /* ---- 介面 ---- */
  $('cls').innerHTML = PLAYER_JOBS.map(j => `<option value="${j}">${JOBS[j].label}</option>`).join('');
  $('start').onclick = startRun;
  $('resetDay').onclick = () => { rec.tries = 3; saveRec(rec); renderSide(); };
  renderSide();
  requestAnimationFrame(frame);
})();
