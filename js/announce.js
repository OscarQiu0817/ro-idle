/* 公告（廣播）系統（使用者 2026-11-21）：比照 RO 的全服廣播，畫面上方跑一條黃字，同時寫進戰鬥訊息。
   用途：攻城易主（「XX城被 XX 公會佔領了」）、攻城結算、精煉 +10 以上成功（自己和假人都會）。
   broadcast() 引擎端呼叫；畫面由 ui.js 的 showBroadcast() 接手（測試環境沒有 ui.js，只寫訊息）。
   聊天室：只寫進「單機模擬」視窗（pushLocalChat）；連上真的聊天室時不混進去（使用者 2026-11-21）。
   state.broadcastOff＝true 時不跑畫面上的跑馬燈（訊息照寫）。
   這個檔案在 fake_players.js 之後載入。 */
const BROADCAST_REFINE_MIN = 10;   // 精煉到 +10 以上才廣播
const BROADCAST_KEEP = 30;
const _broadcastLog = [];          // 最近的公告（測試、公告紀錄用）

function broadcast(text, kind) {
  if (!text) return;
  _broadcastLog.push({ text, kind: kind || 'info', at: gameNow() });
  if (_broadcastLog.length > BROADCAST_KEEP) _broadcastLog.shift();
  logMsg(`📢 ${text}`);
  // pushLocalChat 自己會判斷：連上聊天室就不顯示模擬訊息
  if (typeof window !== 'undefined' && typeof window.pushLocalChat === 'function') window.pushLocalChat('📢 公告', text);
  if (typeof showBroadcast === 'function' && !(state && state.broadcastOff)) showBroadcast(text, kind || 'info');
}
function recentBroadcasts() { return _broadcastLog.slice(); }

/* 精煉成功時呼叫（engine.js 的精煉）：+10 以上廣播 */
function broadcastRefine(who, itemName, lv) {
  if (lv < BROADCAST_REFINE_MIN) return;
  broadcast(`恭喜 ${who} 成功將 ${itemName} 精煉到 +${lv}！`, 'refine');
}

/* 假人精煉公告：武器挑主城商店賣的，+10 最常見、越高越少 */
function fakeRefineBroadcast(r) {
  r = r || Math.random;
  if (typeof FAKE_NAMES === 'undefined' || typeof NPC_SHOPS === 'undefined') return false;
  const shop = (NPC_SHOPS.hub_weapon || NPC_SHOPS.weapon || {}).items || [];
  const list = shop.filter(id => ITEMS[id] && ITEMS[id].type === 'weapon');
  if (!list.length) return false;
  const roll = r();
  const lv = roll < 0.6 ? 10 : roll < 0.85 ? 11 : roll < 0.95 ? 12 : roll < 0.99 ? 13 : 14;
  broadcastRefine(fakePick(FAKE_NAMES, r), ITEMS[fakePick(list, r)].name, lv);
  return true;
}
