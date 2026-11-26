/* 紙娃娃（身體／頭／頭飾／武器分層疊加）的共用繪製函式。
   只讀 window.PAPERDOLL（js/paperdoll_layers.js），不碰遊戲狀態與 DOM，
   所以 ui.js 與 proto/combat1d/demo.html 都能用。
   跟目前角色狀態有關的（paperdollParts、syncPaperdoll…）留在 ui.js。 */

const PAPERDOLL_HEAD_SLOTS = ['head_bottom', 'head_mid', 'head_top'];

/* 官方圖檔缺格補圖（使用者 2026-11-23）：女刺客拿短劍揮擊（slash）前 4 格起手，官方 act 標 -1 沒畫短劍，
   第 5 格短劍才突然出現。補上第 5 格那把短劍（圖集第 1 張），握在右拳、刀身橫在身前；
   位置由 8 方向裡有畫的那幾格（act 82）跟身體錨點的相對距離推出來，逐格看過。
   格式：{ 圖層 key: { 動作: { 第幾格: [圖集序號, x, y, 翻面] } } }，只補原本是空的格子 */
const PAPERDOLL_FILL = {
  'weapon/assassin/female/dagger': { slash: { 0: [1, 8, -35, 0], 1: [1, 13, -37, 0], 2: [1, 17, -38, 0], 3: [1, 7, -36, 0] } },
};
/* 整格改寫（使用者 2026-11-23）：女刺客拿斧頭、單手劍揮擊的起手 4 格，官方畫的是頭右邊一塊 9×8 的小碎片、離手很遠，
   看起來像飄在空中。改成跟短劍一樣把第 5 格那把武器（圖集第 2 張）握在右拳 */
const PAPERDOLL_SET = {
  'weapon/assassin/female/axe1': { slash: { 0: [2, 8, -35, 0], 1: [2, 13, -37, 0], 2: [2, 17, -38, 0], 3: [2, 7, -36, 0] } },
  'weapon/assassin/female/sword1': { slash: { 0: [2, 8, -35, 0], 1: [2, 13, -37, 0], 2: [2, 17, -38, 0], 3: [2, 7, -36, 0] } },
  /* 十字斬首者（女）起手是右手舉在頭右邊（姿勢跟女刺客不同）：短劍（官方空的）、斧頭（官方一小塊）握在舉起的拳頭；單手劍官方本來就對 */
  'weapon/guillotinecross/female/dagger': { slash: { 0: [1, 23, -60, 0], 1: [1, 29, -65, 0], 2: [1, 32, -65, 0], 3: [1, 18, -62, 0] } },
  'weapon/guillotinecross/female/axe1': { slash: { 0: [2, 29, -66, 0], 1: [2, 35, -71, 0], 2: [2, 38, -71, 0], 3: [2, 24, -68, 0] } },
};
(function applyPaperdollFill(P) {
  if (!P || !P.clip) return;
  /* 刀光改成獨立圖層「<武器 key>/glow」（js/paperdoll_glow.js，官方 _검광 整段）：
     舊轉檔把刀光第一張接在武器圖層後面（有的座標還錯），照 glowTrim（武器本身每格圖層數）切掉 */
  Object.entries(P.glowTrim || {}).forEach(([key, acts]) => {
    const c = P.clip[key];
    if (!c) return;
    Object.entries(acts).forEach(([act, counts]) => {
      (c[act] || []).forEach((f, i) => { if (f[2] && counts[i] != null && f[2].length > counts[i] * 4) f[2] = f[2].slice(0, counts[i] * 4); });
    });
  });
  const apply = (table, force) => Object.entries(table).forEach(([key, acts]) => {
    const c = P.clip[key];
    if (!c) return;
    Object.entries(acts).forEach(([act, frames]) => {
      const list = c[act];
      if (!list) return;
      Object.entries(frames).forEach(([i, layer]) => {
        const f = list[i];
        if (f && (force || !f[2] || !f[2].length)) f[2] = layer.slice();
      });
    });
  });
  apply(PAPERDOLL_FILL, false);
  apply(PAPERDOLL_SET, true);
})(typeof window !== 'undefined' ? window.PAPERDOLL : null);
/* 有刀光的武器，緊接在武器後面多畫一層刀光 */
function pdWithGlow(parts) {
  const clip = window.PAPERDOLL && window.PAPERDOLL.clip;
  if (!clip || !parts) return parts;
  let out = null;
  for (let i = 0; i < parts.length; i++) {
    if (out) out.push(parts[i]);
    const g = parts[i] && parts[i].indexOf('weapon/') === 0 && clip[parts[i] + '/glow'] ? parts[i] + '/glow' : null;
    if (g && parts[i + 1] !== g) { if (!out) out = parts.slice(0, i + 1); out.push(g); }
  }
  return out || parts;
}
const _pdImg = {};

function paperdollImage(id) {
  let im = _pdImg[id];
  if (im) return im;
  im = new Image();
  // 圖層路徑相對於遊戲根目錄；不在根目錄的頁面（試玩頁）設 window.PAPERDOLL_BASE
  im.src = (window.PAPERDOLL_BASE || '') + window.PAPERDOLL.img[id].src;
  _pdImg[id] = im;
  return im;
}
/* 朝上（背面）動作 idle_n／walk_n：圖層在 n/<原 key>（scripts/gen_paperdoll_north.py），用到才載入 */
function pdKey(part, act) {
  return act && act.slice(-2) === '_n' && part.indexOf('n/') !== 0 ? 'n/' + part : part;
}
const _pdNorthPending = {};
function paperdollNorthLoadFile(name) {
  if ((window.PAPERDOLL_N && window.PAPERDOLL_N[name]) || _pdNorthPending[name] || typeof document === 'undefined') return;
  _pdNorthPending[name] = 1;
  const s = document.createElement('script');
  s.src = (window.PAPERDOLL_BASE || '') + 'js/paperdoll_n/' + name + '.js';
  s.onerror = () => { (window.PAPERDOLL_N = window.PAPERDOLL_N || {})[name] = 'fail'; };
  document.head.appendChild(s);
}
// 這組圖層每一層都有朝上的圖才回 true；缺的先去載（披肩跟著披肩檔一起來）
function paperdollNorthReady(parts) {
  const pd = window.PAPERDOLL;
  if (!pd || !parts) return false;
  let ok = true;
  for (const p of parts) {
    if (pd.clip['n/' + p]) continue;
    ok = false;
    if (p.indexOf('hat/') === 0) paperdollNorthLoadFile('hat_' + p.split('/')[1]);
    else if (p.indexOf('robe/') !== 0) paperdollNorthLoadFile('core');
  }
  return ok;
}
function paperdollFrame(part, act, fi) {
  part = pdKey(part, act);
  const seq = window.PAPERDOLL.clip[part] && window.PAPERDOLL.clip[part][act];
  if (!seq || !seq.length) return null;
  return seq[Math.min(fi, seq.length - 1)];
}
function paperdollFrameCount(part, act) {
  part = pdKey(part, act);
  const seq = window.PAPERDOLL.clip[part] && window.PAPERDOLL.clip[part][act];
  return seq ? seq.length : 0;
}
// 這個職業自己沒有這種武器的紙娃娃時，外觀改播短劍。頭盔照常疊。
function visualWeaponCat(job, gender, cat) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip || !cat || cat === 'bare') return cat || 'bare';
  // 女劍士的雙手劍圖層是空的，外觀改用同一職業的單手劍。
  if (job === 'swordsman' && gender === 'female' && cat === 'sword2') cat = 'sword1';
  if (pd.clip['weapon/' + job + '/' + gender + '/' + cat]) return cat;
  if (pd.clip['weapon/' + job + '/' + gender + '/dagger']) return 'dagger';
  return cat;
}
/* 武器圖層：本職沒有就沿 JOB_TREE 往上找母職的。cat 是 aspdCategoryOf 的武器類別。 */
function paperdollWeaponPartFor(job, gender, cat) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip) return null;
  cat = visualWeaponCat(job, gender, cat);
  if (!cat || cat === 'bare') return null;
  const seen = {};
  let j = job;
  while (j && !seen[j]) {
    seen[j] = 1;
    const id = 'weapon/' + j + '/' + gender + '/' + cat;
    if (pd.clip[id]) return id;
    const node = (typeof JOB_TREE !== 'undefined') && JOB_TREE[j];
    j = node && node.parent;
  }
  return null;
}
function equipRefItem(who, slot) {
  const ref = who && who.equip && who.equip[slot];
  if (ref && who.instances && who.instances[ref]) return who.instances[ref].item;
  return ref || null;
}
function paperdollWeaponId(job, gender, itemId) {
  let cat = 'bare';
  try { cat = (typeof aspdCategoryOf === 'function' && aspdCategoryOf(itemId)) || 'bare'; } catch (e) { cat = 'bare'; }
  return paperdollWeaponPartFor(job, gender, cat);
}
/* 由外觀參數組圖層清單（身體一定在第一層）。
   look = { job, gender, hairStyle, hairColor, hatViews: [view…], weaponCat }
   job 是圖層用的職業名（已套 SPRITE_ALIAS）；身體圖層不存在時回 null。 */
function paperdollPartsFor(look) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip || !look) return null;
  const gender = look.gender === 'female' ? 'female' : 'male';
  const body = 'body/' + look.job + '/' + gender;
  if (!pd.clip[body]) return null;
  const parts = [body];
  const style = look.hairStyle || 9;
  const color = look.hairColor != null ? look.hairColor : 5;
  const keyed = 'head/' + gender + '/' + (style | 0) + '/' + (color | 0);
  const plain = 'head/' + gender;
  if (pd.clip[keyed]) parts.push(keyed);
  else if (pd.clip[plain]) parts.push(plain);
  for (const view of look.hatViews || []) {
    const hat = view && 'hat/' + view + '/' + gender;
    if (hat && pd.clip[hat]) parts.push(hat);
  }
  const weapon = paperdollWeaponPartFor(look.job, gender, look.weaponCat);
  if (weapon) parts.push(weapon);
  if (look.robe && pd.clip[look.robe]) parts.push(look.robe);   // 披肩服飾（畫在身體後面，見 drawPaperdollFrame）
  return parts;
}
/* 隊友等「別人」的外觀：who 帶 jobId／gender／hairStyle／hairColor／equip（可含 instances）。 */
function paperdollLookParts(who) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip || !who) return null;
  const job = (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[who.jobId]) || who.jobId || 'novice';
  const hatViews = [];
  if (pd.view && typeof ITEMS !== 'undefined') {
    for (let s = 0; s < PAPERDOLL_HEAD_SLOTS.length; s++) {
      const itemId = equipRefItem(who, PAPERDOLL_HEAD_SLOTS[s]);
      const it = itemId && ITEMS[itemId];
      hatViews.push((it && pd.view[String(it.imgId)]) || 0);
    }
  }
  if (typeof costumeApplyViews === 'function') {   // 隊友的頭部服飾
    // 要傳副本：沒穿服飾時會原樣回傳同一個陣列，下一行清空就把頭飾一起清掉（選角畫面、隊友沒頭飾，使用者 2026-11-26）
    const v = costumeApplyViews(hatViews.slice(), who);
    hatViews.length = 0; v.forEach(x => hatViews.push(x));
  }
  let weaponCat = 'bare';
  try {
    const wid = equipRefItem(who, 'weapon');
    weaponCat = (typeof aspdCategoryOf === 'function' && aspdCategoryOf(wid)) || 'bare';
  } catch (e) { weaponCat = 'bare'; }
  const g = who.gender === 'female' ? 'female' : 'male';
  const look = who.riding && pd.clip['body/' + job + '_mount/' + g] ? job + '_mount' : job;   // 隊友租了大嘴鳥
  const robe = typeof costumeRobePart === 'function' ? costumeRobePart(who, look, g) : null;
  return paperdollPartsFor({ job: look, gender: who.gender, hairStyle: who.hairStyle, hairColor: who.hairColor, hatViews, weaponCat, robe });
}
function paperdollAlign(part, body, fr) {
  // 通用武器檔沒有錨點，圖層座標已經跟身體同一個原點。
  const k = part.indexOf('n/') === 0 ? part.slice(2) : part;
  if ((k.indexOf('weapon/') === 0 || k.indexOf('robe/') === 0) && !fr[0] && !fr[1]) return [0, 0];
  return [body[0] - fr[0], body[1] - fr[1]];
}
function paperdollExpand(part, fr, ox, oy, box) {
  const rects = window.PAPERDOLL.img[part].f;
  const flat = fr[2];
  for (let i = 0; i < flat.length; i += 4) {
    const r = rects[flat[i]];
    const w = r[2], h = r[3];
    const cx = ox + flat[i + 1], cy = oy + flat[i + 2];
    box.minX = Math.min(box.minX, cx - w / 2);
    box.minY = Math.min(box.minY, cy - h / 2);
    box.maxX = Math.max(box.maxX, cx + w / 2);
    box.maxY = Math.max(box.maxY, cy + h / 2);
  }
}
/* 掃過所有動作的所有格，算出畫布大小與腳底位置（原點＝身體錨點）。
   回傳 { minX, minY, width, height, idleH（身體待機高）, feet（腳底到畫布頂） } */
function paperdollBounds(parts) {
  parts = pdWithGlow(parts);
  const empty = () => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const all = empty();
  const idle = empty();
  const bodyIdle = empty();
  const acts = Object.keys(window.PAPERDOLL.delay || {});
  acts.forEach(act => {
    const n = paperdollFrameCount(parts[0], act);
    for (let fi = 0; fi < n; fi++) {
      const body = paperdollFrame(parts[0], act, fi);
      if (!body) continue;
      const boxes = act === 'idle' && fi === 0 ? [all, idle] : [all];
      boxes.forEach(box => paperdollExpand(parts[0], body, 0, 0, box));
      if (act === 'idle' && fi === 0) paperdollExpand(parts[0], body, 0, 0, bodyIdle);
      for (let p = 1; p < parts.length; p++) {
        const fr = paperdollFrame(parts[p], act, fi);
        if (!fr) continue;
        const aligned = paperdollAlign(parts[p], body, fr);
        boxes.forEach(box => paperdollExpand(parts[p], fr, aligned[0], aligned[1], box));
      }
    }
  });
  const pad = 2;
  const minX = Math.floor(all.minX) - pad;
  const minY = Math.floor(all.minY) - pad;
  const bodyH = isFinite(bodyIdle.maxY) ? (bodyIdle.maxY - bodyIdle.minY) : (idle.maxY - idle.minY);
  return {
    minX, minY,
    width: Math.max(1, Math.ceil(all.maxX) + pad - minX),
    height: Math.max(1, Math.ceil(all.maxY) + pad - minY),
    idleH: Math.max(1, bodyH),
    feet: idle.maxY - minY,
  };
}
function drawPaperdollLayers(ctx, part, fr, ox, oy) {
  const meta = window.PAPERDOLL.img[part];
  const im = paperdollImage(part);
  if (!im.complete || !im.naturalWidth || !meta) return false;
  const rects = meta.f;
  const flat = fr[2];
  for (let i = 0; i < flat.length; i += 4) {
    const r = rects[flat[i]];
    const w = r[2], h = r[3];
    ctx.save();
    ctx.translate(ox + flat[i + 1], oy + flat[i + 2]);
    if (flat[i + 3]) ctx.scale(-1, 1);
    ctx.drawImage(im, r[0], r[1], w, h, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  return true;
}
/* 畫一整格（身體＋各圖層）。(ox, oy) 是身體錨點在畫布上的位置。
   回傳 null＝這個動作沒有這格；否則 { ready }，ready=false 代表有圖層還沒載完。 */
function drawPaperdollFrame(ctx, parts, act, n, ox, oy) {
  const north = act && act.slice(-2) === '_n';
  if (north) parts = parts.map(p => pdKey(p, act));
  else parts = pdWithGlow(parts);   // 朝上沒有刀光圖層
  const body = paperdollFrame(parts[0], act, n);
  if (!body) return null;
  let ready = true;
  for (let p = 0; p < parts.length; p++) {
    const im = paperdollImage(parts[p]);
    if (!im.complete || !im.naturalWidth) ready = false;
  }
  const layer = p => {
    const fr = paperdollFrame(parts[p], act, n);
    if (!fr) return;
    const aligned = paperdollAlign(parts[p], body, fr);
    drawPaperdollLayers(ctx, parts[p], fr, ox + aligned[0], oy + aligned[1]);
  };
  // 披肩：正面、側面在身體後面；朝上（背面）在身體前面
  const behind = p => !north && parts[p].indexOf('robe/') === 0;
  const im0 = paperdollImage(parts[0]);
  if (!im0.complete || !im0.naturalWidth) return { ready: false };
  for (let p = 1; p < parts.length; p++) if (behind(p)) layer(p);
  drawPaperdollLayers(ctx, parts[0], body, ox, oy);
  for (let p = 1; p < parts.length; p++) if (!behind(p)) layer(p);
  return { ready };
}
/* 攻速比整段動作快時，把揮擊壓進這一次的攻擊間隔。
   一格最快約 16ms，再短就丟掉前面的出手，只留收招那幾格。 */
function paperdollSwingTiming(act, n, intervalMs) {
  const native = (window.PAPERDOLL.delay && window.PAPERDOLL.delay[act]) || 90;
  const interval = Math.max(1, intervalMs || n * native);
  const full = n * native;
  if (interval >= full) return { from: 0, delay: native, once: full };
  const minMs = 16;
  let count = n;
  let delay = interval / count;
  if (delay < minMs) {
    count = Math.max(1, Math.floor(interval / minMs));
    delay = interval / count;
  }
  return { from: n - count, delay: delay, once: count * delay };
}
