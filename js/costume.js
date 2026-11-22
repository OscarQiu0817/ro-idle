/* 頭部服飾（使用者 2026-11-21）：只換外觀，不加數值。資料在 js/costumes.js（scripts/gen_costumes.js 產生）。
   服飾就是背包裡的道具（type:'costume'，背包與裝備清單多一個「服飾」分類），穿上從背包拿出、脫下放回背包，跟防具一樣。
   遊戲裡原本就有的同一件（同 imgId、以前當收藏品）直接改成服飾；沒有的補一筆 cos_<編號>。
   state.costume＝{ head_top, head_mid, head_bottom } 穿著的道具 id。一件佔多個部位時每個部位都記同一個 id，畫面只畫一次（最上面那格）。
   有穿服飾的部位蓋掉原本頭飾的外觀；裝備數值照舊。
   lazy 的服飾頭飾圖層在 js/costume_hats/<view>.js，第一次要畫時才載入（使用者：用到再載入）。
   2026-11-22 加披肩服飾（garment）：圖層是每件一個 js/costume_robes/<robe>.js（各職業各一份），畫在身體後面。
   同日加服飾轉蛋：頭部服飾轉蛋、披肩服飾轉蛋（商城點數），只開有圖的服飾、均勻抽。
   這個檔案在 costumes.js 之後載入。 */
const COSTUME_SLOTS = ['head_top', 'head_mid', 'head_bottom', 'garment'];
const COSTUME_SLOT_NAME = { head_top: '頭上', head_mid: '頭中', head_bottom: '頭下', garment: '披肩' };
const _costumeByItem = {};

(function registerCostumes() {
  if (typeof COSTUMES === 'undefined' || typeof ITEMS === 'undefined') return;
  const byImg = {};
  Object.values(ITEMS).forEach(it => { if (it.imgId && (it.type === 'material' || it.type === 'consumable' || it.type === 'costume')) (byImg[it.imgId] = byImg[it.imgId] || it); });
  Object.values(COSTUMES).forEach(c => {
    const it = byImg[c.raId] || (ITEMS[c.id] = { id: c.id, imgId: c.raId });
    Object.assign(it, { name: '(服飾)' + c.name, type: 'costume', icon: '👒', weight: 0, sell: it.sell || 0, costumeSlots: c.slots });
    _costumeByItem[it.id] = c;
  });
})();

function costumeList() { return Object.keys(_costumeByItem); }
function costumeDef(itemId) { return _costumeByItem[itemId] || null; }
function costumeSlotLabel(itemId) { const d = costumeDef(itemId); return d ? d.slots.map(s => COSTUME_SLOT_NAME[s]).join('＋') : ''; }
function wornCostumes(who) {
  who = who || state;
  return [...new Set(COSTUME_SLOTS.map(s => who.costume && who.costume[s]).filter(Boolean))];
}
function wearCostume(itemId) {
  const d = costumeDef(itemId);
  if (!d) return '這不是服飾。';
  if (!(getItemQty(itemId) > 0)) return '背包裡沒有這件服飾。';
  if (!state.costume) state.costume = {};
  // 跟這件搶部位的整件脫下放回背包
  new Set(d.slots.map(s => state.costume[s]).filter(Boolean)).forEach(id => takeOffCostume(id, true));
  removeItem(itemId, 1);
  d.slots.forEach(s => { state.costume[s] = itemId; });
  if (typeof saveGame === 'function') saveGame();
  return null;
}
function takeOffCostume(itemId, quiet) {
  if (!state.costume || !Object.values(state.costume).includes(itemId)) return;
  COSTUME_SLOTS.forEach(s => { if (state.costume[s] === itemId) delete state.costume[s]; });
  addItem(itemId, 1);
  if (!quiet && typeof saveGame === 'function') saveGame();
}

/* 紙娃娃：拿頭飾外觀陣列（順序同 PAPERDOLL_HEAD_SLOTS：頭下、頭中、頭上），有服飾的部位換掉。
   多部位服飾畫在最上面那格，其餘被佔的格清空。圖層還沒載入時先照原本的畫，載入後自然換上 */
function costumeApplyViews(views, who) {
  who = who || state;
  if (!who || !who.costume || typeof PAPERDOLL_HEAD_SLOTS === 'undefined') return views;
  if (who.showCostume === false) return views;   // 裝備欄「顯示服飾外觀」沒勾：照一般裝備畫
  const out = views.slice();
  const drawn = new Set();
  for (let i = PAPERDOLL_HEAD_SLOTS.length - 1; i >= 0; i--) {
    const id = who.costume[PAPERDOLL_HEAD_SLOTS[i]];
    const d = id && costumeDef(id);
    if (!d) continue;
    if (drawn.has(id)) { out[i] = 0; continue; }
    if (d.lazy && !costumeHatReady(d.view)) { costumeHatLoad(d.view); continue; }
    out[i] = d.view;
    drawn.add(id);
  }
  return out;
}
function costumeHatReady(view) {
  return !!(typeof window !== 'undefined' && window.PAPERDOLL && window.PAPERDOLL.clip['hat/' + view + '/male']);
}
function costumeRobeReady(robe) {
  return !!(typeof window !== 'undefined' && window.COSTUME_ROBE_LOADED && window.COSTUME_ROBE_LOADED[robe]);
}
const _costumeLazyPending = {};
function costumeLazyLoad(src, cb) {
  if (typeof document === 'undefined' || !document.head || !document.createElement) return;
  if (_costumeLazyPending[src]) { if (cb) _costumeLazyPending[src].push(cb); return; }
  _costumeLazyPending[src] = cb ? [cb] : [];
  const s = document.createElement('script');
  s.src = src;
  s.onload = () => {
    const cbs = _costumeLazyPending[src] || [];
    delete _costumeLazyPending[src];
    cbs.forEach(f => f());
    if (typeof onCostumeHatLoaded === 'function') onCostumeHatLoaded();
  };
  s.onerror = () => { delete _costumeLazyPending[src]; };
  document.head.appendChild(s);
}
function costumeHatLoad(view, cb) {
  if (costumeHatReady(view)) { if (cb) cb(); return; }
  costumeLazyLoad('js/costume_hats/' + view + '.js', cb);
}
function costumeRobeLoad(robe, cb) {
  if (costumeRobeReady(robe)) { if (cb) cb(); return; }
  costumeLazyLoad('js/costume_robes/' + robe + '.js', cb);
}
/* 紙娃娃：披肩服飾圖層 key（job 是紙娃娃職業名，含 _mount）；沒穿、沒勾顯示、還沒載入或這職業沒圖＝null */
function costumeRobePart(who, job, gender) {
  who = who || state;
  const id = who && who.costume && who.costume.garment;
  const d = id && costumeDef(id);
  if (!d || !d.robe || who.showCostume === false) return null;
  if (!costumeRobeReady(d.robe)) { costumeRobeLoad(d.robe); return null; }
  const key = 'robe/' + d.robe + '/' + job + '/' + (gender === 'female' ? 'female' : 'male');
  return window.PAPERDOLL.clip[key] ? key : null;
}

/* 服飾轉蛋：只開有圖的服飾，均勻抽 */
const COSTUME_GACHA = [
  ['gacha_costume_head', '頭部服飾轉蛋', 12947, 30, d => d.slots[0] !== 'garment'],
  ['gacha_costume_robe', '披肩服飾轉蛋', 617, 30, d => d.slots[0] === 'garment'],
];
if (typeof BOX_POOLS !== 'undefined') COSTUME_GACHA.forEach(([id, name, img, , pick]) => {
  ITEMS[id] = {
    id, imgId: img, name, type: 'consumable', icon: '🎁', weight: 1, sell: 0, boxOpen: 'costume_' + id,
    desc: `打開後隨機獲得一件${name.replace('轉蛋', '')}（只換外觀，不加能力）。`,
  };
  BOX_POOLS['costume_' + id] = { build: () => costumeList().filter(k => pick(costumeDef(k))) };
  const cat = typeof CASH_SHOP !== 'undefined' && CASH_SHOP.find(c => c.cat === '轉蛋');
  if (cat) cat.items.push([id, COSTUME_GACHA.find(g => g[0] === id)[3]]);
});
