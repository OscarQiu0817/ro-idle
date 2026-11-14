/* 官方 .str 特效即時播放（WebGL）。使用者 2026-11-14：暴風雪兩版比較後，所有 .str 技能特效改用這個即時畫。
   資料：scripts/gen_skill_fx.py --str 輸出 images/effects/str/<名稱>.js（關鍵格）與 images/effects/tex/<貼圖>.webp（多招共用）。
   k0／k1＝看得到的第一格與最後一格之後：開頭的空白（官方延遲）跳過，施放當下就出現。
   第一次播某招時先等它的貼圖載完（最多 1.5 秒）才開始計時，免得前半段沒畫出來。
   規則照 roBrowser 的 StrEffect：每層找「目前格之前最後一個基準格（type 0）」，後面緊跟同一格的變化量（type 1）
   就照經過的格數內插位置、四角、角度、顏色、貼圖格；四角畫成四邊形，加亮層用加法混色。
   一張蓋滿視窗的透明 canvas，不擋點擊；沒有特效在播時不跑迴圈。

   StrPlayer.play(name, x, y, { scale, loop, onDone })   x, y＝特效原點（STR 的 320,320）的畫面座標；同時最多 MAX_ACTIVE 個
   StrPlayer.base    資源路徑前綴（proto/ 底下的頁面設 '../'）
   StrPlayer.stats   { frames, ms }：累計畫了幾幀、花了幾毫秒（量效能用）

   鍵格陣列：0 格 1 類型 2-3 位置 4-7 四角 x 8-11 四角 y 12 貼圖格 13 貼圖動畫類型 14 delay 15 角度 16-19 顏色 20 加亮 */
const StrPlayer = (() => {
  const api = { base: '', stats: { frames: 0, ms: 0 }, supported: true };
  let canvas = null, gl = null, prog = null, loc = null, vbuf = null, raf = 0;
  const data = {}, pending = {}, textures = {}, active = [];
  const verts = new Float32Array(16);
  const MAX_ACTIVE = 40;

  function init() {
    if (canvas) return !!gl;
    canvas = document.createElement('canvas');
    canvas.className = 'str-fx-canvas';
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:61;';
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) { api.supported = false; return false; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER,
      'attribute vec2 aPos;attribute vec2 aUv;uniform vec2 uRes;varying vec2 vUv;'
      + 'void main(){vUv=aUv;vec2 p=aPos/uRes*2.0-1.0;gl_Position=vec4(p.x,-p.y,0.0,1.0);}'));
    /* 輸出預乘透明度。加亮層 alpha 輸出 0：畫面合成時＝特效顏色直接加在遊戲畫面上（官方的加法混色） */
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,
      'precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform vec4 uColor;uniform float uAdd;'
      + 'void main(){vec4 c=texture2D(uTex,vUv)*uColor;gl_FragColor=vec4(c.rgb*c.a,c.a*(1.0-uAdd));}'));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    loc = { pos: gl.getAttribLocation(prog, 'aPos'), uv: gl.getAttribLocation(prog, 'aUv'),
      res: gl.getUniformLocation(prog, 'uRes'), color: gl.getUniformLocation(prog, 'uColor'), add: gl.getUniformLocation(prog, 'uAdd') };
    vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc.pos); gl.enableVertexAttribArray(loc.uv);
    gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, 16, 8);
    gl.enable(gl.BLEND);
    document.body.appendChild(canvas);
    return true;
  }

  function texture(file) {
    let t = textures[file];
    if (t) return t;
    t = textures[file] = { tex: null, ready: false, done: false, wait: [] };
    const settle = () => { t.done = true; t.wait.forEach(f => f()); t.wait = []; };
    const im = new Image();
    im.onerror = settle;
    im.onload = () => {
      try {
        const tx = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        t.tex = tx; t.ready = true;
      } catch (e) { api.supported = false; }   // file:// 開啟時瀏覽器不讓 WebGL 讀本機圖片
      settle();
    };
    im.src = api.base + 'images/effects/tex/' + file;
    return t;
  }

  /* 關鍵格資料用 <script> 載入（不用 fetch，單機雙擊開啟也讀得到） */
  function load(name, cb) {
    if (data[name]) { cb(data[name]); return; }
    if (pending[name]) { pending[name].push(cb); return; }
    pending[name] = [cb];
    const s = document.createElement('script');
    s.src = api.base + 'images/effects/str/' + name + '.js';
    s.onload = () => {
      const d = (window.STR_DATA || {})[name];
      const finish = () => { (pending[name] || []).forEach(f => f(d || null)); delete pending[name]; };
      if (!d || !init()) { finish(); return; }
      d.layers.forEach(L => { L.last = L.keys.reduce((m, k) => Math.max(m, k[0]), 0); });
      if (d.k0 == null) d.k0 = 0;
      if (d.k1 == null) d.k1 = d.maxKey;
      data[name] = d;
      const list = [...new Set(d.layers.flatMap(L => L.tex))].map(texture).filter(t => !t.done);
      let left = list.length, fired = false;
      const go = () => { if (!fired) { fired = true; finish(); } };
      if (!left) { go(); return; }
      list.forEach(t => t.wait.push(() => { if (--left <= 0) go(); }));
      setTimeout(go, 1500);
    };
    s.onerror = () => { (pending[name] || []).forEach(f => f(null)); delete pending[name]; };
    document.head.appendChild(s);
  }

  const key = new Float64Array(21);
  function keyAt(L, k) {
    const keys = L.keys, kf = Math.floor(k);
    let fi = -1, ti = -1;
    for (let i = 0; i < keys.length; i++) {
      const q = keys[i];
      if (q[0] > kf) break;
      if (q[1] === 0) fi = i; else if (q[1] === 1) ti = i;
    }
    if (fi < 0) return false;
    const f = keys[fi];
    const morph = ti === fi + 1 && keys[ti][0] === f[0];
    if (kf > L.last && !morph) return false;
    for (let i = 0; i < 21; i++) key[i] = f[i];
    if (!morph) return true;
    const t = keys[ti], d = k - f[0], n = Math.max(1, L.tex.length);
    for (let i = 2; i <= 11; i++) key[i] = f[i] + t[i] * d;
    key[15] = f[15] + t[15] * d;
    for (let i = 16; i <= 19; i++) key[i] = f[i] + t[i] * d;
    const at = t[13];
    key[12] = at === 1 ? f[12] + t[12] * d : at === 2 ? Math.min(f[12] + t[14] * d, n - 1)
      : at === 3 ? (f[12] + t[14] * d) % n : at === 4 ? (((f[12] - t[14] * d) % n) + n) % n : 0;
    return true;
  }

  function frame(now) {
    raf = 0;
    const t0 = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(loc.res, w, h);
    let mode = -1, bound = null;
    for (let i = active.length - 1; i >= 0; i--) {
      const e = active[i], d = e.data;
      let k = d.k0 + (now - e.t0) / 1000 * d.fps;
      if (k >= d.k1) {
        if (e.loop) { e.t0 = now; k = d.k0; } else { active.splice(i, 1); if (e.onDone) e.onDone(); continue; }
      }
      const s = e.scale * dpr, ox = e.x * dpr, oy = e.y * dpr;
      for (const L of d.layers) {
        if (!keyAt(L, k)) continue;
        const a = Math.max(0, Math.min(1, key[19]));
        if (a <= 0.004) continue;
        const tx = textures[L.tex[Math.min(L.tex.length - 1, Math.max(0, key[12] | 0))]];
        if (!tx || !tx.ready) continue;
        const add = key[20] ? 1 : 0;
        if (add !== mode) {
          mode = add;
          if (add) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform1f(loc.add, add);
        }
        if (bound !== tx.tex) { gl.bindTexture(gl.TEXTURE_2D, tx.tex); bound = tx.tex; }
        gl.uniform4f(loc.color, Math.max(0, Math.min(1, key[16])), Math.max(0, Math.min(1, key[17])), Math.max(0, Math.min(1, key[18])), a);
        const cx = ox + (key[2] - 320) * s, cy = oy + (key[3] - 320) * s;
        const r = key[15] * Math.PI / 180, ca = Math.cos(r), sa = Math.sin(r);
        // 三角帶順序：v0=(x0,y0) v1=(x1,y1) v2=(x3,y3) v3=(x2,y2)；貼圖座標 左上、右上、左下、右下
        const order = [0, 1, 3, 2], uv = [0, 0, 1, 0, 0, 1, 1, 1];
        for (let v = 0; v < 4; v++) {
          const x = key[4 + order[v]] * s, y = key[8 + order[v]] * s;
          verts[v * 4] = cx + x * ca - y * sa; verts[v * 4 + 1] = cy + x * sa + y * ca;
          verts[v * 4 + 2] = uv[v * 2]; verts[v * 4 + 3] = uv[v * 2 + 1];
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    api.stats.frames++; api.stats.ms += performance.now() - t0;
    if (active.length) raf = requestAnimationFrame(frame);
    else gl.clear(gl.COLOR_BUFFER_BIT);
  }

  api.preload = name => load(name, () => {});
  api.play = (name, x, y, opt) => {
    opt = opt || {};
    const h = { stop() { const i = active.indexOf(h.e); if (i >= 0) active.splice(i, 1); } };
    load(name, d => {
      if (!d || !gl || active.length >= MAX_ACTIVE) { if (opt.onDone) opt.onDone(); return; }
      h.e = { data: d, x, y, scale: opt.scale || 0.5, loop: !!opt.loop, onDone: opt.onDone, t0: performance.now() };
      active.push(h.e);
      if (!raf) raf = requestAnimationFrame(frame);
    });
    return h;
  };
  api.activeCount = () => active.length;
  return api;
})();
