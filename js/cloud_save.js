/* 雲端存檔（整包存檔同步，使用者 2026-11-08）
   伺服器在 world-chat（POST /account/register、/account/login、/save/get、/save/put、/save/claim，見 world-chat docs/API.md）。
   上傳的內容就是「匯出全部（含倉庫）」那份 buildFullBackup()：所有角色欄位＋跨角色倉庫＋傭兵帳本。

   決定（使用者）：
     - 帳號密碼登入，忘了就沒了（不收 Email）
     - 全自動：開遊戲時下載；遊戲中每 5 分鐘、切到背景、回標題、關閉前上傳
     - 同時只允許一台：另一台登入後，這台的上傳會被擋（OTHER_DEVICE），停止同步並問玩家要不要改在這台玩

   這是「整包上傳」，存檔仍在瀏覽器裡算，防不了改存檔（伺服器權威是之後的 T23）。 */

// 測試治具（Node）沒有 location／window：當成本機、不啟動同步
const CLOUD_HAS_DOM = typeof location !== 'undefined' && typeof window !== 'undefined';
const CLOUD_LOCAL = !CLOUD_HAS_DOM || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const CLOUD_BASE = CLOUD_LOCAL ? 'http://localhost:8787' : 'https://world-chat.oq-ro-idle.workers.dev';
// 本機用 Cloudflare 官方測試金鑰（一律通過）；線上用聊天室同一把
const CLOUD_TURNSTILE_KEY = CLOUD_LOCAL ? '1x00000000000000000000AA' : '0x4AAAAAAFqwdmZg7-wjGQnZ';
const CLOUD_KEY = 'ro_idle_cloud';            // { token, username, version, lastSyncAt, lastHash }
const CLOUD_DEVICE_KEY = 'ro_idle_device_id';
const CLOUD_SYNC_MS = 5 * 60 * 1000;

const cloud = { status: 'off', busy: false, msg: '', turnstileToken: null, turnstileWidget: null };

function cloudConf() {
  try { return JSON.parse(localStorage.getItem(CLOUD_KEY) || 'null'); } catch (e) { return null; }
}
function cloudSetConf(c) {
  if (c) localStorage.setItem(CLOUD_KEY, JSON.stringify(c)); else localStorage.removeItem(CLOUD_KEY);
}
function cloudDeviceId() {
  let id = localStorage.getItem(CLOUD_DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    localStorage.setItem(CLOUD_DEVICE_KEY, id);
  }
  return id;
}
async function cloudPost(path, body, keepalive) {
  const res = await fetch(CLOUD_BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: !!keepalive,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* 沒有內容 */ }
  return { status: res.status, data: data || {} };
}
const CLOUD_ERRORS = {
  INVALID_INPUT: '帳號要 3～20 個英數或底線，密碼要 6～64 個字。',
  USERNAME_TAKEN: '這個帳號已經有人用了。',
  LOGIN_FAILED: '帳號或密碼錯誤。',
  CHALLENGE_FAILED: '人機驗證沒有通過，請再試一次。',
  RATE_LIMITED: '操作太頻繁，請稍後再試。',
  TOO_LARGE: '存檔太大，無法上傳。',
  INVALID_TOKEN: '登入已失效，請重新登入。',
  SERVER_ERROR: '伺服器發生錯誤，請稍後再試。',
};
const cloudErr = code => CLOUD_ERRORS[code] || ('連不上雲端（' + (code || '網路錯誤') + '）');

/* 本機有沒有任何角色存檔 */
function cloudLocalHasData() {
  for (let i = 0; i < MAX_SLOTS; i++) if (localStorage.getItem(getSlotKey(i))) return true;
  return false;
}
/* 套用雲端存檔：整個取代本機（角色欄位、倉庫、傭兵帳本）。
   跟「匯入全部」不同：倉庫是整個換掉，不是併進去。 */
function cloudApply(save) {
  let obj;
  try { obj = JSON.parse(save.data); } catch (e) { return false; }
  if (!obj || obj.app !== 'ro-idle' || obj.type !== 'backup' || !obj.slots) return false;
  for (let i = 0; i < MAX_SLOTS; i++) {
    const v = obj.slots[i];
    if (v && typeof v === 'object') localStorage.setItem(getSlotKey(i), JSON.stringify(v));
    else localStorage.removeItem(getSlotKey(i));
  }
  localStorage.setItem(WAREHOUSE_KEY, JSON.stringify(obj.warehouse || { items: [], gold: 0 }));
  if (obj.mercLedger) localStorage.setItem(MERC_LEDGER_KEY, JSON.stringify(obj.mercLedger));
  else localStorage.removeItem(MERC_LEDGER_KEY);
  const c = cloudConf();
  if (c) { c.version = save.version; c.lastSyncAt = Date.now(); c.lastHash = cloudHash(save.data); cloudSetConf(c); }
  return true;
}
function cloudHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return s.length + ':' + h;
}
function cloudInGame() {
  const g = document.getElementById('screen-game');
  return typeof state !== 'undefined' && !!state && !!g && g.classList.contains('active');
}

/* 上傳。跟上次上傳的內容一樣就不送（省伺服器寫入） */
async function cloudUpload(opts) {
  opts = opts || {};
  const c = cloudConf();
  if (!c || cloud.status === 'other_device' || cloud.busy) return false;
  if (cloudInGame() && typeof saveGame === 'function') saveGame();
  const data = JSON.stringify(buildFullBackup());
  const hash = cloudHash(data);
  if (hash === c.lastHash && !opts.force) return true;
  cloud.busy = true;
  try {
    // keepalive 的請求內容上限 64KB；太大就用一般請求（關閉分頁時不保證送到，下次開遊戲前那台會再傳）
    const r = await cloudPost('/save/put', { token: c.token, data, baseVersion: c.version || 0 }, opts.keepalive && data.length < 60000);
    if (r.status === 200) {
      Object.assign(c, { version: r.data.version, lastSyncAt: Date.now(), lastHash: hash });
      cloudSetConf(c);
      cloud.status = 'ok'; cloud.msg = '';
      return true;
    }
    cloudHandleError(r.data.error);
    return false;
  } catch (e) {
    cloud.msg = cloudErr();
    return false;
  } finally {
    cloud.busy = false;
    cloudRefreshUi();
  }
}
function cloudHandleError(code) {
  if (code === 'OTHER_DEVICE' || code === 'VERSION_CONFLICT') {
    cloud.status = 'other_device';
    cloudShowOtherDevice();
  } else if (code === 'INVALID_TOKEN') {
    cloudSetConf(null);
    cloud.status = 'off';
    cloud.msg = cloudErr(code);
  } else {
    cloud.msg = cloudErr(code);
  }
}

/* 開遊戲時：雲端版本比這台新就下載（標題畫面還沒進角色，可以直接換） */
let cloudBootPromise = null;
async function cloudBoot() {
  const c = cloudConf();
  if (!c) { cloudRefreshUi(); return; }
  cloud.booting = true;
  cloudRefreshUi();
  try {
    const r = await cloudPost('/save/get', { token: c.token });
    if (r.status === 200) {
      cloud.status = 'ok';
      const s = r.data.save;
      if (s && s.version > (c.version || 0) && !cloudInGame()) {
        cloudApply(s);
        if (typeof renderSlotList === 'function') renderSlotList();
        if (typeof showToast === 'function') showToast('☁ 已下載雲端存檔');
      }
    } else {
      cloudHandleError(r.data.error);
    }
  } catch (e) {
    cloud.msg = cloudErr();
  }
  cloud.booting = false;
  cloudRefreshUi();
}
/* 切回分頁時（ui.js 的 visibilitychange 呼叫）：登入中就先問伺服器，還是這台才結算離線收益。
   回傳 true＝由這裡接手（之後會呼叫 resume 或等玩家回答）；false＝沒登入，照原本流程。 */
function cloudBeforeResume(resume) {
  if (!cloudConf() || cloud.status === 'other_device') {
    if (cloud.status === 'other_device') { cloud.pendingResume = resume; cloudShowOtherDevice(); return true; }
    return false;
  }
  cloudCheckDevice().then(() => {
    if (cloud.status === 'other_device') cloud.pendingResume = resume;   // 等玩家選「改在這台玩」或「先不要」
    else resume();
  });
  return true;
}
/* 「先不要」：只在這台繼續玩（不再同步），補上剛才擋住的結算 */
function cloudContinueLocal() {
  closeCloudModal();
  const r = cloud.pendingResume;
  cloud.pendingResume = null;
  if (r) r();
}
/* 切回這個分頁時立刻問一次：別台已經接手就馬上停，不要繼續在舊進度上玩 */
async function cloudCheckDevice() {
  const c = cloudConf();
  if (!c || cloud.status === 'other_device' || cloud.busy) return;
  try {
    const r = await cloudPost('/save/get', { token: c.token });
    if (r.status !== 200) cloudHandleError(r.data.error);
    else if (r.data.save && r.data.save.version > (c.version || 0)) cloudHandleError('VERSION_CONFLICT');
  } catch (e) { /* 連不上就等下次 */ }
  cloudRefreshUi();
}

async function cloudSubmit(mode) {
  const u = document.getElementById('cloud-user').value.trim();
  const p = document.getElementById('cloud-pass').value;
  if (mode === 'register' && !cloud.turnstileToken) { cloud.msg = '請先完成人機驗證。'; renderCloudModal(); return; }
  cloud.busy = true; cloud.msg = ''; renderCloudModal();
  try {
    const body = { username: u, password: p, deviceId: cloudDeviceId() };
    if (mode === 'register') body.turnstile = cloud.turnstileToken;
    const r = await cloudPost(mode === 'register' ? '/account/register' : '/account/login', body);
    cloud.turnstileToken = null;
    if (r.status !== 200) { cloud.msg = cloudErr(r.data.error); return; }
    cloudSetConf({ token: r.data.token, username: r.data.username, version: 0, lastSyncAt: 0, lastHash: '' });
    cloud.status = 'ok';
    const save = r.data.save;
    if (save && cloudLocalHasData()) {
      // 兩邊都有：讓玩家選
      cloud.pendingSave = save;
      cloud.view = 'choose';
    } else if (save) {
      cloudApplyAndRefresh(save);
    } else {
      cloud.busy = false;
      await cloudUpload({ force: true });
      cloud.msg = '已登入，本機存檔已上傳。';
    }
  } catch (e) {
    cloud.msg = cloudErr();
  } finally {
    cloud.busy = false;
    renderCloudModal();
    cloudRefreshUi();
    if (cloudConf() && cloud.view !== 'choose' && cloudOnTitleLogin()) {
      if (cloud.msg) showToast('☁ ' + cloud.msg);
      cloud.msg = '';
      showSlotSelect();
    }
  }
}
/* 套用雲端存檔：在遊戲中就重新整理頁面（記憶體裡的角色是舊的），在標題就重畫欄位 */
function cloudApplyAndRefresh(save) {
  const inGame = cloudInGame();
  if (inGame) {
    if (typeof stopLoop === 'function') stopLoop();
    _suppressSave = true;                 // engine：saveGame() 看到就不存
    window.__cloudReloading = true;
  }
  cloudApply(save);
  if (inGame) {
    window.removeEventListener('beforeunload', cloudOnUnload);
    location.reload();
    return;
  }
  // 標題畫面：記憶體裡可能還留著回標題前的角色，清掉免得之後被存回去
  if (typeof state !== 'undefined') state = null;
  if (typeof renderSlotList === 'function') renderSlotList();
  cloud.msg = '已下載雲端存檔。';
}
async function cloudChoose(useCloud) {
  const save = cloud.pendingSave;
  cloud.pendingSave = null; cloud.view = null;
  if (useCloud && save) {
    const c = cloudConf(); c.version = save.version; cloudSetConf(c);
    cloudApplyAndRefresh(save);
  } else {
    const c = cloudConf(); c.version = save ? save.version : 0; cloudSetConf(c);
    await cloudUpload({ force: true });
    cloud.msg = '已用本機存檔覆蓋雲端。';
  }
  renderCloudModal();
  cloudRefreshUi();
  if (cloudOnTitleLogin()) {
    if (cloud.msg) showToast('☁ ' + cloud.msg);
    cloud.msg = '';
    showSlotSelect();
  }
}
/* 改在這台玩：取得同步權，下載雲端進度蓋掉這台 */
async function cloudClaim() {
  const c = cloudConf();
  if (!c) return;
  try {
    const r = await cloudPost('/save/claim', { token: c.token });
    if (r.status !== 200) { cloudHandleError(r.data.error); renderCloudModal(); return; }
    cloud.status = 'ok';
    closeCloudModal();
    if (r.data.save) cloudApplyAndRefresh(r.data.save);
    else await cloudUpload({ force: true });
  } catch (e) {
    cloud.msg = cloudErr();
    renderCloudModal();
  }
  cloudRefreshUi();
}
function cloudLogout() {
  if (!confirm('登出後這台裝置不再同步（存檔仍留在這台與雲端）。確定登出？')) return;
  cloudSetConf(null);
  cloud.status = 'off'; cloud.msg = '已登出。';
  cloudRefreshUi();
  const scr = document.getElementById('screen-title');
  if (scr && scr.classList.contains('active') && typeof showTitleLogin === 'function') {
    try { localStorage.removeItem(TITLE_LOCAL_ONLY_KEY); } catch (e) { /* 忽略 */ }
    closeCloudModal();
    showTitleLogin();
    return;
  }
  renderCloudModal();
}

/* ---------------- 畫面 ---------------- */
function openCloudModal() {
  const m = document.getElementById('cloud-modal');
  if (!m) return;
  cloud.view = cloud.status === 'other_device' ? 'other' : (cloud.view === 'choose' ? 'choose' : null);
  renderCloudModal();
  m.classList.remove('hidden');
}
function closeCloudModal() {
  const m = document.getElementById('cloud-modal');
  if (m) m.classList.add('hidden');
}
function cloudShowOtherDevice() {
  cloud.view = 'other';
  const m = document.getElementById('cloud-modal');
  if (!m) return;
  renderCloudModal();
  m.classList.remove('hidden');
}
function cloudTimeText(t) {
  if (!t) return '還沒同步過';
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/* 標題畫面一打開就是登入（使用者 2026-11-09）：登入表單畫在標題上，其他時候畫在彈窗裡 */
function cloudOnTitleLogin() {
  return typeof titleLoginVisible === 'function' && titleLoginVisible();
}
function renderCloudModal() {
  const onTitle = cloudOnTitleLogin();
  const modalBody = document.getElementById('cloud-modal-body');
  if (onTitle && modalBody) modalBody.innerHTML = '';   // 同一組 id 只能有一份
  const el = onTitle ? document.getElementById('title-login-body') : modalBody;
  if (!el) return;
  const c = cloudConf();
  const msg = cloud.msg ? `<div class="cloud-msg">${shopEsc(cloud.msg)}</div>` : '';
  if (cloud.view === 'other') {
    el.innerHTML = `<div class="empty-hint">這個帳號已在其他裝置登入，這台已停止雲端同步。</div>
      <div class="empty-hint">要改在這台玩嗎？會下載雲端進度、蓋掉這台目前的進度。</div>${msg}
      <div class="cloud-btns">
        <button class="btn btn-primary" onclick="cloudClaim()">改在這台玩</button>
        <button class="btn-small" onclick="cloudContinueLocal()">先不要（只存在這台）</button>
      </div>`;
    return;
  }
  if (cloud.view === 'choose') {
    const s = cloud.pendingSave;
    el.innerHTML = `<div class="empty-hint">雲端和這台都有存檔，要用哪一份？另一份會被覆蓋。</div>
      <div class="empty-hint">雲端存檔：${cloudTimeText(s && s.updatedAt)} 上傳</div>
      <div class="cloud-btns">
        <button class="btn btn-primary" onclick="cloudChoose(true)">用雲端（覆蓋這台）</button>
        <button class="btn-small" onclick="cloudChoose(false)">用這台（覆蓋雲端）</button>
      </div>`;
    return;
  }
  if (c) {
    el.innerHTML = `<div class="empty-hint">已登入：<b>${shopEsc(c.username)}</b></div>
      <div class="empty-hint">上次同步：${cloudTimeText(c.lastSyncAt)}　｜　自動同步：開遊戲時下載，遊戲中每 5 分鐘、切到背景、回標題時上傳</div>${msg}
      <div class="cloud-btns">
        <button class="btn btn-primary" ${cloud.busy ? 'disabled' : ''} onclick="cloudUpload({force:true}).then(renderCloudModal)">立即上傳</button>
        <button class="btn-small" onclick="cloudLogout()">登出</button>
      </div>`;
    return;
  }
  el.innerHTML = `<div class="empty-hint">登入雲端存檔後，手機和電腦共用同一份存檔（所有角色＋倉庫）。同時只能一台在玩。</div>
    <div class="empty-hint">⚠ 沒有 Email 驗證，<b>忘記密碼就無法找回帳號</b>。</div>
    <div class="cloud-form">
      <input id="cloud-user" class="ab-select" placeholder="帳號（3～20 個英數或底線）" maxlength="20" autocomplete="username">
      <input id="cloud-pass" class="ab-select" type="password" placeholder="密碼（6～64 字）" maxlength="64" autocomplete="current-password">
      <div id="cloud-turnstile"></div>
    </div>${msg}
    <div class="cloud-btns">
      <button class="btn btn-primary" ${cloud.busy ? 'disabled' : ''} onclick="cloudSubmit('login')">登入</button>
      <button class="btn-small" ${cloud.busy ? 'disabled' : ''} onclick="cloudSubmit('register')">註冊新帳號</button>
    </div>${onTitle ? `<div class="cloud-btns"><button class="btn-small ghost" onclick="titleSkipLogin()">不登入，只存在這台</button></div>` : ''}`;
  cloudRenderTurnstile();
}
/* 註冊才需要人機驗證；Turnstile 的程式第一次打開表單時才載入 */
function cloudRenderTurnstile() {
  const box = document.getElementById('cloud-turnstile');
  if (!box) return;
  const render = () => {
    if (!window.turnstile || !document.getElementById('cloud-turnstile')) return;
    cloud.turnstileWidget = window.turnstile.render('#cloud-turnstile', {
      sitekey: CLOUD_TURNSTILE_KEY,
      callback: t => { cloud.turnstileToken = t; },
      'expired-callback': () => { cloud.turnstileToken = null; },
    });
  };
  if (window.turnstile) { render(); return; }
  if (!document.getElementById('cloud-turnstile-script')) {
    const s = document.createElement('script');
    s.id = 'cloud-turnstile-script';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }
}
/* 標題畫面與選單上的狀態字 */
function cloudRefreshUi() {
  const c = cloudConf();
  const text = !c ? '☁ 雲端存檔：未登入'
    : cloud.booting ? '☁ 同步中…'
    : cloud.status === 'other_device' ? '☁ 已在其他裝置登入（未同步）'
    : `☁ ${c.username}｜${cloudTimeText(c.lastSyncAt)}`;
  document.querySelectorAll('.cloud-status').forEach(e => { e.textContent = text; });
}

function cloudOnUnload() {
  if (window.__cloudReloading) return;
  cloudUpload({ keepalive: true });
}
(function cloudStart() {
  if (!CLOUD_HAS_DOM || location.protocol === 'file:') return;   // 測試治具／本機直接開檔案時不同步
  window.addEventListener('load', () => { cloudBootPromise = cloudBoot(); });
  // 進角色前等開遊戲時的雲端檢查（最多 8 秒，連不上就照本機存檔玩）
  if (typeof continueGame === 'function') {
    const orig = continueGame;
    continueGame = async function () {
      if (cloudBootPromise && cloud.booting) {
        if (typeof showToast === 'function') showToast('☁ 正在檢查雲端存檔…');
        await Promise.race([cloudBootPromise, new Promise(res => setTimeout(res, 8000))]);
        if (cloud.status === 'other_device') return;   // 已在別台登入：先回答「要不要改在這台玩」
      }
      return orig.apply(this, arguments);
    };
  }
  setInterval(() => { if (cloudInGame()) cloudUpload(); }, CLOUD_SYNC_MS);
  // 切回分頁的檢查由 ui.js 呼叫 cloudBeforeResume（要在結算前問）；這裡只管切走時上傳
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cloudUpload({ keepalive: true });
  });
  window.addEventListener('beforeunload', cloudOnUnload);
})();
