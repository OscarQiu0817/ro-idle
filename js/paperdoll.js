/* 紙娃娃（身體／頭／頭飾／武器分層疊加）的共用繪製函式。
   只讀 window.PAPERDOLL（js/paperdoll_layers.js），不碰遊戲狀態與 DOM，
   所以 ui.js 與 proto/combat1d/demo.html 都能用。
   跟目前角色狀態有關的（paperdollParts、syncPaperdoll…）留在 ui.js。 */

const PAPERDOLL_HEAD_SLOTS = ['head_bottom', 'head_mid', 'head_top'];
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
function paperdollFrame(part, act, fi) {
  const seq = window.PAPERDOLL.clip[part] && window.PAPERDOLL.clip[part][act];
  if (!seq || !seq.length) return null;
  return seq[Math.min(fi, seq.length - 1)];
}
function paperdollFrameCount(part, act) {
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
  let weaponCat = 'bare';
  try {
    const wid = equipRefItem(who, 'weapon');
    weaponCat = (typeof aspdCategoryOf === 'function' && aspdCategoryOf(wid)) || 'bare';
  } catch (e) { weaponCat = 'bare'; }
  return paperdollPartsFor({ job, gender: who.gender, hairStyle: who.hairStyle, hairColor: who.hairColor, hatViews, weaponCat });
}
function paperdollAlign(part, body, fr) {
  // 通用武器檔沒有錨點，圖層座標已經跟身體同一個原點。
  if (part.indexOf('weapon/') === 0 && !fr[0] && !fr[1]) return [0, 0];
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
  const body = paperdollFrame(parts[0], act, n);
  if (!body) return null;
  let ready = true;
  for (let p = 0; p < parts.length; p++) {
    const im = paperdollImage(parts[p]);
    if (!im.complete || !im.naturalWidth) ready = false;
  }
  if (!drawPaperdollLayers(ctx, parts[0], body, ox, oy)) return { ready: false };
  for (let p = 1; p < parts.length; p++) {
    const fr = paperdollFrame(parts[p], act, n);
    if (!fr) continue;
    const aligned = paperdollAlign(parts[p], body, fr);
    drawPaperdollLayers(ctx, parts[p], fr, ox + aligned[0], oy + aligned[1]);
  }
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
