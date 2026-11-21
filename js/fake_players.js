/* T63 假人（使用者 2026-11-19）：遊戲人少太空曠，放一些「別的冒險者」。
   1. 主城交易區露天商店：擺攤賣怪物掉落物、補品、偶爾卡片，價格比 NPC 高；數量有限、賣完就沒了
   2. 收購攤：喊「收 ○○」，玩家身上有就能賣給他，比賣 NPC 多 20～50%，收多少都要；少數是以物易物
   3. 野外路過（畫面效果，ui.js）：走過去、偶爾停下來打自己的怪，不搶玩家的怪、不影響收益
   4. 交易喊話：只在「世界頻道」沒連線時的單機模擬視窗出現（chat/game-world-chat.js 的 pushLocalChat），
      連上真的聊天室後不混進去，免得讓人以為是真人

   攤位每 2 小時整批換一次：內容由「第幾個 2 小時」當種子算出來（重新整理也一樣），
   只把買走／賣出的數量記在 state.fakeHub。等級門檻在這一輪第一次看到時定下來，升級不會讓攤位變掉。 */

const FAKE_REFRESH_MS = 2 * 3600 * 1000;
const FAKE_VENDOR_N = 5;
const FAKE_BUYER_N = 3;
const FAKE_NAMES = ['小雨點', '風之旅人', '阿肥', '貓掌', '夜行者', '月下獨酌', '布丁', '老王賣瓜', '奶茶去冰', '迷路的羊',
  '劍聖小明', '鐵匠阿伯', '白開水', '晴天娃娃', '打工仔', '綠茶', '小黑', '鹹魚翻身', '藍莓', '雪球',
  '流浪吟遊', '咖啡因', '不想上班', '大胃王', '路人甲', '路人乙', '星期五', '麻糬', '飯糰', '豆花'];
const FAKE_SELL_TITLES = ['便宜賣', '清倉大拍賣', '新手好物', '材料便宜賣', '補品批發', '路過看看', '開店掛機中', '撿到什麼賣什麼'];
const FAKE_JOBS = ['swordsman', 'mage', 'archer', 'acolyte', 'merchant', 'thief', 'knight', 'wizard', 'hunter', 'priest',
  'blacksmith', 'assassin', 'crusader', 'sage', 'monk', 'rogue', 'alchemist', 'bard', 'dancer'];
// 擺攤位置（交易區，中心 0,14；交易所 NPC 在 0,13）
const FAKE_SPOTS = [[-6, 15], [-3, 16.8], [3, 16.8], [6, 15], [-6, 19], [-2, 20], [2, 20], [6, 19]];   // 錯開成兩排，招牌才不會疊在一起

function fakeRand(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const fakePick = (a, r) => a[Math.floor(r() * a.length)];
/* 假人拿的武器（使用者 2026-11-21：空手很奇怪）：照職業挑招牌武器，沒有這種武器圖層的跳過 */
const FAKE_WEAPON_PREF = {
  novice: ['dagger', 'sword1'], swordsman: ['sword1', 'sword2', 'spear1'], knight: ['spear1', 'spear2', 'sword2', 'sword1'],
  lordknight: ['spear1', 'spear2', 'sword2'], crusader: ['spear1', 'sword1', 'mace'], paladin: ['spear1', 'sword1', 'mace'],
  mage: ['rod1', 'rod2'], wizard: ['rod1', 'rod2'], highwizard: ['rod1', 'rod2'], sage: ['book', 'rod1'], professor: ['book', 'rod1'],
  archer: ['bow'], hunter: ['bow'], sniper: ['bow'], bard: ['instrument', 'bow'], clown: ['instrument', 'bow'], dancer: ['whip', 'bow'], gypsy: ['whip', 'bow'],
  acolyte: ['mace', 'rod1', 'book'], priest: ['mace', 'book', 'rod1'], highpriest: ['mace', 'book', 'rod1'], monk: ['knuckle', 'mace'], champion: ['knuckle', 'mace'],
  merchant: ['axe1', 'axe2', 'mace'], blacksmith: ['axe1', 'axe2', 'mace'], whitesmith: ['axe1', 'axe2', 'mace'], alchemist: ['axe1', 'mace', 'sword1'], creator: ['axe1', 'mace'],
  thief: ['dagger', 'sword1'], assassin: ['katar', 'dagger'], assassincross: ['katar', 'dagger'], rogue: ['dagger', 'bow', 'sword1'], stalker: ['dagger', 'bow', 'sword1'],
};
function fakeWeaponCat(job, gender, r) {
  let list = FAKE_WEAPON_PREF[job] || ['dagger'];
  if (typeof paperdollWeaponPartFor === 'function' && typeof window !== 'undefined' && window.PAPERDOLL) {
    const ok = list.filter(c => paperdollWeaponPartFor(job, gender, c));
    if (ok.length) list = ok;
  }
  return list[Math.floor(r() * list.length)];
}
function fakeLook(r) {
  const gender = r() < 0.5 ? 'male' : 'female';
  let job = fakePick(FAKE_JOBS, r);
  if (job === 'bard' && gender === 'female') job = 'dancer';
  if (job === 'dancer' && gender === 'male') job = 'bard';
  const hairStyle = 1 + Math.floor(r() * 20), hairColor = Math.floor(r() * 9);
  return { job, gender, hairStyle, hairColor, weaponCat: fakeWeaponCat(job, gender, r) };
}

// 地圖上出得到、等級不超過 cap 的怪 → 掉落物與卡片
function fakeItemPool(cap) {
  const mobs = new Set();
  MAPS.forEach(m => (m.monsters || []).forEach(x => mobs.add(x.id)));
  const drops = new Set(), cards = [];
  mobs.forEach(id => {
    const d = MONSTERS[id];
    if (!d || d.isBoss || d.isMvp || !(d.level <= cap)) return;
    (d.drops || []).forEach(x => { const it = ITEMS[x.item]; if (it && it.sell > 0 && it.type !== 'card' && !(typeof CARDS !== 'undefined' && CARDS[x.item])) drops.add(x.item); });
    const c = typeof MONSTER_CARD_DROPS !== 'undefined' && MONSTER_CARD_DROPS[id];
    if (c && c.card && ITEMS[c.card]) cards.push({ card: c.card, lv: d.level });
  });
  return { drops: [...drops], cards };
}
const fakeUnitPrice = (id, mult) => Math.max(1, Math.round((ITEMS[id].sell || 1) * mult));
/* 裝備定價（使用者 2026-11-21）：很多裝備回收價只有 5～10z，照回收價賣會出現 5z 的洞裝。
   改照要求等級（沒有就看武器等級）× 洞數 × 武器等級算行情，回收價比較高就用回收價那套 */
function fakeGearPrice(id, r) {
  const it = ITEMS[id];
  const lv = it.reqLevel || (it.weaponLv ? it.weaponLv * 15 : 10);
  const base = 200 + lv * lv * 8;                                   // Lv1 約 200、Lv30 約 7 千、Lv60 約 3 萬、Lv99 約 8 萬
  const mult = (1 + 0.5 * (it.slots || 0)) * (1 + 0.25 * Math.max(0, (it.weaponLv || 1) - 1));
  const price = Math.max(fakeUnitPrice(id, 1.5 + r() * 1.5), base * mult * (0.8 + r() * 0.6));
  return price >= 1000 ? Math.round(price / 100) * 100 : Math.round(price / 10) * 10;
}

/* 這一輪的攤位（不含已買賣的數量）。bucket＝第幾個 2 小時、cap＝等級門檻 */
function fakeHubRoll(bucket, cap) {
  const r = fakeRand(bucket * 7919 + 17);
  const pool = fakeItemPool(cap);
  const names = FAKE_NAMES.slice();
  const takeName = () => names.splice(Math.floor(r() * names.length), 1)[0];
  const potions = ['red_potion', 'orange_potion', 'yellow_potion', 'white_potion', 'blue_potion'].filter(id => ITEMS[id]);
  const out = [];
  for (let i = 0; i < FAKE_VENDOR_N && pool.drops.length; i++) {
    const items = [];
    const n = 3 + Math.floor(r() * 4);
    while (items.length < n) {
      const roll = r();
      let id, price, qty;
      if (roll < 0.12 && pool.cards.length) {
        const c = fakePick(pool.cards, r);
        id = c.card; qty = 1;
        price = Math.round((5000 + c.lv * c.lv * 20) * (1 + r()) / 100) * 100;   // Lv1 約 5 千、Lv99 約 20～40 萬
      } else if (roll < 0.3 && potions.length) {
        id = fakePick(potions, r); qty = 10 + Math.floor(r() * 41);
        price = Math.max(fakeUnitPrice(id, 1.6), Math.round((ITEMS[id].buyPrice || 0) * 0.9));   // 比 NPC 便宜一點、比回收價貴
      } else {
        id = fakePick(pool.drops, r);
        const gear = ITEMS[id].type === 'weapon' || ITEMS[id].type === 'armor';
        qty = gear ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 20);   // 裝備一攤最多 2 件
        price = gear ? fakeGearPrice(id, r) : fakeUnitPrice(id, 1.5 + r() * 1.5);
      }
      if (!items.some(x => x.item === id)) items.push({ item: id, price, qty });
    }
    out.push({ id: 'fv' + i, kind: 'sell', name: takeName(), title: fakePick(FAKE_SELL_TITLES, r), look: fakeLook(r), items });
  }
  // 收購只收素材類（掉落物裡的武器、防具不收）
  const mats = pool.drops.filter(id => ITEMS[id].type !== 'weapon' && ITEMS[id].type !== 'armor');
  for (let i = 0; i < FAKE_BUYER_N && mats.length; i++) {
    const id = fakePick(mats, r);
    const want = Infinity;   // 收購不設上限（使用者 2026-11-21：量太少沒吸引力）
    // 約 1／4 以物易物：每收 per 個換 1 瓶藥水
    const barter = potions.length && r() < 0.25 ? { item: fakePick(potions, r), per: 2 + Math.floor(r() * 4) } : null;
    out.push({ id: 'fb' + i, kind: 'buy', name: takeName(), look: fakeLook(r), item: id, want,
      price: barter ? 0 : fakeUnitPrice(id, 1.2 + r() * 0.3), barter });
  }
  out.forEach((v, i) => { v.x = FAKE_SPOTS[i % FAKE_SPOTS.length][0]; v.y = FAKE_SPOTS[i % FAKE_SPOTS.length][1]; });
  return out;
}

/* 目前的攤位（套上已買賣的數量）。不在遊戲裡回空陣列 */
function fakeHub() {
  if (!state) return [];
  const bucket = Math.floor(gameNow() / FAKE_REFRESH_MS);
  let h = state.fakeHub;
  if (!h || h.bucket !== bucket) h = state.fakeHub = { bucket, cap: Math.max(30, (state.baseLevel || 1) + 20), used: {} };
  if (!fakeHub._c || fakeHub._c.key !== bucket + ':' + h.cap) fakeHub._c = { key: bucket + ':' + h.cap, list: fakeHubRoll(bucket, h.cap) };
  return fakeHub._c.list.map(v => {
    if (v.kind === 'sell') return Object.assign({}, v, { items: v.items.map((x, k) => Object.assign({}, x, { qty: Math.max(0, x.qty - (h.used[v.id + ':' + k] || 0)) })) });
    return Object.assign({}, v, { want: Math.max(0, v.want - (h.used[v.id] || 0)) });
  });
}
function fakeVendor(id) { return fakeHub().find(v => v.id === id) || null; }
// 給城鎮地圖用的 NPC 形式（交易區）
function fakeHubNpcs() {
  return fakeHub().map(v => ({ id: v.id, name: v.name, role: v.kind === 'sell' ? 'vendor' : 'buyer', district: 'trade', x: v.x, y: v.y, fake: v }));
}
function fakeShopLabel(v) {
  if (v.kind === 'sell') return v.title;
  return `收 ${ITEMS[v.item].name}`;
}

/* 跟露天商店買：回傳 null 或失敗原因 */
function fakeVendorBuy(id, idx, qty) {
  const v = fakeVendor(id);
  const x = v && v.kind === 'sell' && v.items[idx];
  if (!x || x.qty <= 0) return '已經賣完了。';
  const n = Math.min(Math.max(1, qty | 0), x.qty, Math.floor((state.gold || 0) / x.price));
  if (n <= 0) return `鋅幣不足（一個 ${x.price.toLocaleString()}z）。`;
  state.gold -= x.price * n;
  addItem(x.item, n);
  const h = state.fakeHub;
  h.used[id + ':' + idx] = (h.used[id + ':' + idx] || 0) + n;
  logMsg(`🛒 跟「${v.name}」買了 ${ITEMS[x.item].name} ×${n}，花了 ${(x.price * n).toLocaleString()}z。`);
  saveGame();
  return null;
}
/* 賣給收購攤：回傳 null 或失敗原因 */
function fakeBuyerSell(id, qty) {
  const v = fakeVendor(id);
  if (!v || v.kind !== 'buy' || v.want <= 0) return '他已經收滿了。';
  let n = Math.min(Math.max(1, qty | 0), v.want, getItemQty(v.item));
  if (v.barter) n -= n % v.barter.per;
  if (n <= 0) return v.barter ? `要 ${v.barter.per} 個才能換。` : `身上沒有${ITEMS[v.item].name}。`;
  removeItem(v.item, n);
  let got;
  if (v.barter) { const k = n / v.barter.per; addItem(v.barter.item, k); got = `${ITEMS[v.barter.item].name} ×${k}`; }
  else { state.gold = (state.gold || 0) + v.price * n; got = `${(v.price * n).toLocaleString()}z`; }
  const h = state.fakeHub;
  h.used[id] = (h.used[id] || 0) + n;
  logMsg(`🤝 把 ${ITEMS[v.item].name} ×${n} 賣給「${v.name}」，換到 ${got}。`);
  saveGame();
  return null;
}

/* 交易喊話：收購攤喊真的在收的東西，露天商店喊架上的東西 */
/* 喊話口吻（使用者 2026-11-21：不用報價、可以一次喊好幾樣，生活化一點） */
const FAKE_SELL_FMT = [
  (it, t) => `賣 ${it}，主城交易區「${t}」`,
  (it) => `${it} 便宜出～交易區找我`,
  (it) => `清背包！${it} 有要的來交易區`,
  (it, t) => `「${t}」開張啦，${it} 都有`,
  (it) => `${it} 帶不動了，路過交易區看看～`,
];
const FAKE_BUY_FMT = [
  (it) => `收 ${it}，主城交易區找我`,
  (it) => `有人有 ${it} 嗎？交易區收～`,
  (it) => `高價收 ${it}，有的來交易區`,
  (it) => `收 ${it}！打到的別賣 NPC 啦`,
];
function fakeShoutLine(r) {
  r = r || Math.random;
  const list = fakeHub().filter(v => (v.kind === 'buy' ? v.want > 0 : v.items.some(x => x.qty > 0)));
  if (!list.length) return null;
  const v = fakePick(list, r);
  if (v.kind === 'buy') {
    // 收購攤只收一樣：同名的其他收購攤一起喊，湊成「A / B」
    const items = [...new Set([v].concat(list.filter(o => o.kind === 'buy' && o !== v && r() < 0.4)).map(o => ITEMS[o.item].name))].slice(0, 3);
    return { name: v.name, text: fakePick(FAKE_BUY_FMT, r)(items.join(' / ')) };
  }
  const have = v.items.filter(i => i.qty > 0);
  const n = Math.min(have.length, 1 + Math.floor(r() * 3));
  const pick = have.slice().sort(() => r() - 0.5).slice(0, n).map(x => ITEMS[x.item].name);
  return { name: v.name, text: fakePick(FAKE_SELL_FMT, r)(pick.join(' / '), v.title) };
}
/* GM 小幫手（使用者 2026-11-21）：像單機遊戲讀取畫面的小知識，口吻輕鬆；偶爾提醒休息。只出現在單機模擬聊天室 */
const FAKE_GM_NAME = '📣 GM 小幫手';
const FAKE_TIPS = [
  '精煉 +4 以上就有機率失敗，貴的裝備記得先準備鐵匠的祝福再敲～',
  '武器精煉用神之金屬、防具用鋁，別拿錯了喔',
  '離線掛機最多算 12 小時，睡前開好掛機地圖，早上起來收成剛剛好',
  '打怪現在不掉錢了，想賺錢就把東西賣給收購攤，比賣 NPC 划算',
  '轉蛋碎片 10 片可以換一次轉蛋，MVP 掉得比較多',
  '攻城戰每天 22:00 結算，那時城是誰的獎勵就是誰的',
  '騎士、十字軍學了騎乘術，可以去主城租大嘴鳥，帥度直接 +100',
  '自動戰鬥的技能可以設發動條件，例如「目標是首領才放」，省藍很有感',
  '打不贏的王別硬上，先回去把裝備精煉一下再來',
  '背包快滿了？自動販賣可以設定哪些東西直接賣掉',
  '倉庫是全帳號共用的，換角色也拿得到',
  '野外偶爾會有怪物爆走，記得留一點藍給範圍技',
];
function fakeMvpTip(r) {
  if (typeof MVP_MAP_DATA === 'undefined' || typeof ELEMENT_CHART === 'undefined') return null;
  const ids = [...new Set(Object.values(MVP_MAP_DATA).flat())].filter(id => MONSTERS[id] && MONSTERS[id].isMvp && MONSTERS[id].element && MONSTERS[id].element !== 'none');
  if (!ids.length) return null;
  const m = MONSTERS[fakePick(ids, r)];
  let best = null, bm = 1;
  Object.keys(ELEMENT_CHART).forEach(e => { const k = getElementMultiplier(e, m.element); if (k > bm) { bm = k; best = e; } });
  if (!best) return null;
  return `打 ${m.name} 的話，帶${ELEMENT_NAMES[best]}屬性會輕鬆很多（牠是${ELEMENT_NAMES[m.element]}屬性）`;
}
let _fakeRestAt = 0;
function fakeTipLine(r, now) {
  r = r || Math.random;
  now = now || Date.now();
  // 休息提醒：上線後每 60 分鐘最多一次
  if (!_fakeRestAt) _fakeRestAt = now;
  if (now - _fakeRestAt >= 60 * 60000) {
    _fakeRestAt = now;
    const d = new Date(now);
    const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    const late = d.getHours() >= 23 || d.getHours() < 5;
    return { name: FAKE_GM_NAME, text: late ? `已經 ${hm} 了，明天還要上班上課的早點睡吧，角色會自己掛機的～` : `現在 ${hm}，玩一陣子了，起來走走、喝口水再回來吧` };
  }
  const t = r() < 0.35 ? fakeMvpTip(r) : null;
  return { name: FAKE_GM_NAME, text: t || fakePick(FAKE_TIPS, r) };
}
function fakeTip() {
  const line = state && typeof window !== 'undefined' && typeof window.pushLocalChat === 'function' && fakeTipLine();
  if (line) window.pushLocalChat(line.name, line.text);
}
function fakeShout() {
  const line = state && typeof window !== 'undefined' && typeof window.pushLocalChat === 'function' && fakeShoutLine();
  if (line) window.pushLocalChat(line.name, line.text);
}
