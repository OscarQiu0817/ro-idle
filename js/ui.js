/* ============================================================
   諸神放置錄 — 免費同人放置遊戲
   本作完全免費，純為懷舊而作。**禁止任何形式的販售或營利**
   （販售、內購、付費解鎖、廣告分潤皆不允許），修改版本亦同。
   設定致敬《仙境傳說 Ragnarok Online》；程式與文字為原創實作，
   與 Gravity Co., Ltd. 無關，亦未獲其授權或認可。
   授權：CC BY-NC-SA 4.0（可散布可改作，不得商用，衍生版本須同樣授權）。
   特別鳴謝：本作靈感源自 秋玥[shifine] 發布的免費遊戲。
   完整聲明與授權全文見 repo 根目錄的 LICENSE。
   ============================================================ */
/* ============================================================
   RO 放置世界 — 畫面渲染
   ============================================================ */

let creationAlloc = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
let creationBudget = 15;
let selectedGender = 'male';
let activeTab = 'map';

/* ---------------- 初始畫面切換 ---------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

let slotPage = 0;
const SLOTS_PER_PAGE = 3;

function initApp() {
  installTabLock();
  renderCreationStats();
  bindSearchComposition();
  renderDisclaimers();          // 免責聲明（#118）：四個位置一次填好
  showScreen('screen-title');
  maybeShowConsent();           // 首次開啟才出現的一次性確認（#121）
}
/* 後開的分頁寫一筆鎖，先開的分頁收到 storage 事件就停手。
   同一個分頁自己寫入不會觸發 storage，所以後開的那個留著。 */
function installTabLock() {
  const KEY = 'ro_idle_tab_lock_v1';
  const myId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const write = () => {
    if (typeof tabSessionBlocked === 'function' && tabSessionBlocked()) return;
    try { localStorage.setItem(KEY, myId + '|' + Date.now()); } catch (e) { /* 沒有存檔空間就算了 */ }
  };
  window.addEventListener('storage', e => {
    if (e.key !== KEY || !e.newValue) return;
    if (String(e.newValue).split('|')[0] !== myId) showTabBlocked();
  });
  write();
  setInterval(write, 2000);
}
function showTabBlocked() {
  if (typeof setTabSessionBlocked === 'function') setTabSessionBlocked(true);
  try { stopLoop(); } catch (e) { /* 還沒進場 */ }
  try { stopMusic(); } catch (e) { /* 同上 */ }
  const el = document.getElementById('tab-lock-modal');
  if (el) el.classList.remove('hidden');
}

/* ---------------- 免責聲明（#118）----------------
   文字全部來自 js/about.js，這裡只負責放到畫面上的三個位置：
   標題畫面、創角畫面、「關於本作」視窗（漢堡選單）。

   在 DOMContentLoaded 時填一次就好——內容是固定的，不必每個 tick 重畫。
------------------------------------------------- */
function renderDisclaimers() {
  const lines = document.getElementById('title-disclaimer-lines');
  if (lines) {
    lines.innerHTML = DISCLAIMER_LINES.map(t => `<div>${t}</div>`).join('')
      + `<div class="disclaimer-license">📄 ${LICENSE_NAME}　${creditLinkHtml()}</div>`;
  }

  const create = document.getElementById('create-disclaimer');
  if (create) create.textContent = DISCLAIMER_SHORT;
}

/* 鳴謝的連結。開新分頁並加上 noopener——這是外部網站 */
function creditLinkHtml() {
  return `${CREDIT_TITLE}：<a href="${CREDIT_URL}" target="_blank" rel="noopener noreferrer">秋玥[shifine]</a>`;
}

function openAboutModal() {
  const body = document.getElementById('about-modal-body');
  if (body) {
    body.innerHTML = `
      <div class="disclaimer-badge">💚 完全免費　🚫 禁止販售　🕹️ 純為懷舊</div>
      <div class="about-lines">${DISCLAIMER_LINES.map(t => `<p>${t}</p>`).join('')}</div>
      <div class="about-sec">
        <h4>📄 授權條款　${LICENSE_NAME}</h4>
        <p>${LICENSE_NOTE}</p>
        <p><a href="${LICENSE_URL}" target="_blank" rel="noopener noreferrer">閱讀完整授權條款</a></p>
      </div>
      ${legalSectionsHtml()}
      <div class="about-sec">
        <h4>🙏 ${CREDIT_TITLE}</h4>
        ${CREDIT_LINES.map(t => `<p>${t}</p>`).join('')}
        <p><a href="${CREDIT_URL}" target="_blank" rel="noopener noreferrer">秋玥[shifine] 的原作討論串</a></p>
      </div>
      <p class="about-home">${PROJECT_HOME_NOTE}</p>`;
  }
  const m = document.getElementById('about-modal');
  if (m) m.classList.remove('hidden');
}
function closeAboutModal() {
  const m = document.getElementById('about-modal');
  if (m) m.classList.add('hidden');
}

/* 三段法律聲明。關於視窗與首次確認視窗共用 */
function legalSectionsHtml() {
  return `<div class="about-sec legal-sec">
    <h4>⚖️ 法律免責與著作權聲明</h4>
    <ol class="legal-list">
      ${LEGAL_SECTIONS.map(sec =>
        `<li><b>${sec.title}</b>${sec.body.map(t => `<p>${t}</p>`).join('')}</li>`).join('')}
    </ol>
  </div>`;
}

/* ---- 首次開啟的一次性確認（#121）----
   勾過就記住，之後不再出現。**不是每次都擋的同意閘**——見 js/about.js 的說明。
   讀寫 localStorage 包 try：無痕模式或停用儲存時會丟例外，
   那種情況就當成「沒同意過」每次問，也比整個畫面掛掉好。 */
function legalConsentGiven() {
  try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch (e) { return false; }
}
function setLegalConsent() {
  try { localStorage.setItem(CONSENT_KEY, '1'); } catch (e) { /* 存不了就算了 */ }
}
function onConsentCheck(el) {
  const btn = document.getElementById('consent-enter');
  if (btn) btn.disabled = !el.checked;
}
function acceptLegalConsent() {
  const box = document.getElementById('consent-check');
  if (!box || !box.checked) return;
  setLegalConsent();
  const m = document.getElementById('consent-modal');
  if (m) m.classList.add('hidden');
}
/* 標題畫面載入時叫一次。已經同意過就什麼都不做 */
function maybeShowConsent() {
  if (legalConsentGiven()) return;
  const body = document.getElementById('consent-modal-body');
  if (body) {
    body.innerHTML = `
      <div class="disclaimer-badge">💚 完全免費　🚫 禁止販售　🕹️ 純為懷舊</div>
      <div class="about-lines">${DISCLAIMER_LINES.map(t => `<p>${t}</p>`).join('')}</div>
      ${legalSectionsHtml()}
      <div class="about-sec">
        <h4>📄 授權條款　${LICENSE_NAME}</h4>
        <p>${LICENSE_NOTE}</p>
      </div>`;
  }
  const m = document.getElementById('consent-modal');
  if (m) m.classList.remove('hidden');
}


/* 注音／中文輸入法送出時補一次重畫。

   **不能寫成 `oncompositionend="..."` 的 inline 屬性**——HTML 規格的
   event handler content attribute 清單裡沒有 composition 那組，瀏覽器不會建立
   對應的 handler，屬性寫了完全沒作用（第一版就是這樣，屬性在、事件不觸發）。
   輸入框每次重畫都會換成新元素，所以掛在 document 上做委派，只綁一次。 */
const SEARCH_INPUT_HANDLERS = {
  'codex-search': v => onCodexSearch(v),
  'inv-search': v => onInvSearch(v),
  'wh-search': v => onWhSearch(v),
};
function bindSearchComposition() {
  document.addEventListener('compositionend', ev => {
    const t = ev.target;
    const fn = t && t.id ? SEARCH_INPUT_HANDLERS[t.id] : null;
    if (fn) fn(t.value);
  });
}

function playTitleMusic() {
  bgmToken++;
  const myToken = bgmToken;
  stopMusic();
  const muted = state && state.muted;
  if (muted) return;
  const vol = (state && state.bgmVolume != null) ? state.bgmVolume : 0.5;
  const audio = new Audio();
  audio.loop = true;
  audio.volume = vol;
  audio.addEventListener('canplaythrough', () => {
    if (bgmToken !== myToken) return;
    bgmAudio = audio;
    audio.play().catch(() => {});
  }, { once: true });
  audio.src = 'music/maps/0000.mp3';
  audio.load();
}

function showSlotSelect() {
  document.getElementById('title-buttons').classList.add('hidden');
  document.getElementById('slot-select').classList.remove('hidden');
  slotPage = 0;
  renderSlotList();
  // 點擊開始冒險後播放標題音樂
  playTitleMusic();
}

function backToTitle() {
  saveGame();
  // 走 stopLoop() 而不是自己清計時器：那支還會把 loopRunning() 的旗標放下來（#135），
  // 少了那一步，切分頁的處理會以為迴圈還在跑，回來就不重啟了
  stopLoop();
  stopAnim();
  if (animCanvas) animCanvas.style.display = 'none';
  const img = document.getElementById('player-img');
  if (img) img.style.display = '';
  document.getElementById('title-buttons').classList.remove('hidden');
  document.getElementById('slot-select').classList.add('hidden');
  showScreen('screen-title');
  playTitleMusic();
}

function renderSlotList() {
  const list = document.getElementById('slot-list');
  const pagination = document.getElementById('slot-pagination');
  if (!list) return;
  const start = slotPage * SLOTS_PER_PAGE;
  const end = Math.min(start + SLOTS_PER_PAGE, MAX_SLOTS);
  let html = '';
  for (let i = start; i < end; i++) {
    const raw = localStorage.getItem(getSlotKey(i));
    if (raw) {
      try {
        const s = JSON.parse(raw);
        const job = JOB_TREE[s.jobId] || { icon: '?', name: '???' };
        html += `<div class="slot-item has-save" onclick="selectSlot(${i})">
          <div class="slot-header">欄位 ${i + 1}</div>
          <div class="slot-info">${job.icon} ${s.name || '無名'} Lv.${s.baseLevel || '?'} ${job.name}</div>
          <button class="btn-small ghost" onclick="event.stopPropagation();exportSlotSave(${i})" title="把這個存檔匯出成 JSON 檔">匯出</button>
          <button class="btn-small ghost" onclick="event.stopPropagation();importSlotFile(${i})" title="從 JSON 檔匯入到這個欄位（會覆蓋）">匯入</button>
          <button class="btn-small ghost" onclick="event.stopPropagation();deleteSlotConfirm(${i})">刪除</button>
        </div>`;
      } catch(e) {
        html += `<div class="slot-item" onclick="selectSlot(${i})"><div class="slot-header">欄位 ${i + 1}</div><div class="slot-info">損壞的存檔</div></div>`;
      }
    } else {
      html += `<div class="slot-item empty-slot" onclick="selectSlot(${i})">
        <div class="slot-header">欄位 ${i + 1}</div>
        <div class="slot-info">空欄位</div>
        <button class="btn-small ghost" onclick="event.stopPropagation();importSlotFile(${i})" title="從 JSON 檔匯入到這個欄位">匯入</button>
      </div>`;
    }
  }
  list.innerHTML = html;

  // 分頁按鈕
  const totalPages = Math.ceil(MAX_SLOTS / SLOTS_PER_PAGE);
  let pagHtml = `<button class="btn-small" onclick="if(slotPage>0){slotPage--;renderSlotList();}" ${slotPage===0?'disabled':''}>◀</button>`;
  for (let p = 0; p < totalPages; p++) {
    pagHtml += `<button class="btn-small ${p===slotPage?'active':''}" onclick="slotPage=${p};renderSlotList();">${p + 1}</button>`;
  }
  pagHtml += `<button class="btn-small" onclick="if(slotPage<${totalPages - 1}){slotPage++;renderSlotList();}" ${slotPage>=totalPages-1?'disabled':''}>▶</button>`;
  pagination.innerHTML = pagHtml;
}

function selectSlot(slot) {
  currentSlot = slot;
  if (hasSave()) {
    continueGame();
  } else {
    goCreateNew();
  }
}

function deleteSlotConfirm(slot) {
  if (confirm('確定要刪除欄位 ' + (slot + 1) + ' 的存檔嗎？')) {
    localStorage.removeItem(getSlotKey(slot));
    renderSlotList();
  }
}

/* ---------------- 存檔匯出 / 匯入 ---------------- */
function exportSlotSave(slot) {
  const raw = localStorage.getItem(getSlotKey(slot));
  if (!raw) { showToast('⚠️ 這個欄位沒有存檔可匯出'); return; }
  let name = '角色', jobName = '';
  try {
    const s = JSON.parse(raw);
    if (s.name) name = s.name;
    const jd = JOB_TREE[s.jobId] || {};
    jobName = jd.name || s.jobId || '';
  } catch (e) { /* 用預設檔名 */ }
  const safe = (name + (jobName ? '-' + jobName : '')).replace(/[\\/:*?"<>|\s]+/g, '_') || '角色';
  const filename = `ro-idle-${safe}-slot${slot + 1}.json`;
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('📤 已匯出存檔：' + filename);
}

let _importTargetSlot = null;
let _importFileInput = null;
function ensureImportInput() {
  if (_importFileInput) return _importFileInput;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  input.addEventListener('change', onImportFileChosen);
  document.body.appendChild(input);
  _importFileInput = input;
  return input;
}
function importSlotFile(slot) {
  if (localStorage.getItem(getSlotKey(slot)) && !confirm('欄位 ' + (slot + 1) + ' 已有存檔，匯入會覆蓋它。確定嗎？')) return;
  _importTargetSlot = slot;
  const input = ensureImportInput();
  input.value = '';
  input.click();
}
function onImportFileChosen(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let obj = null;
    try { obj = JSON.parse(reader.result); } catch (e) { showToast('⚠️ 檔案不是有效的 JSON'); return; }
    const res = importSaveToSlot(_importTargetSlot, obj);
    showToast(res.ok ? '📥 匯入成功，已寫入欄位 ' + (_importTargetSlot + 1) : '⚠️ ' + res.msg);
    renderSlotList();
  };
  reader.readAsText(file);
}

function goCreateNew() {
  creationAlloc = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
  creationBudget = 15;
  renderCreationStats();
  showScreen('screen-create');
}

function continueGame() {
  if (typeof tabSessionBlocked === 'function' && tabSessionBlocked()) { showTabBlocked(); return; }
  try {
    if (loadGame()) {
      const off = computeOfflineProgress();
      enterGame();
      // 彈窗開不開看勾選，紀錄一律留（#135）
      deliverOfflineResult(off);
    } else {
      console.error('Failed to load game');
    }
  } catch (e) {
    console.error('continueGame error:', e);
  }
}

const CREATE_STAT_CAP = 9; // 創角階段單項屬性上限

function creationAdjust(key, delta) {
  if (delta > 0) {
    if (creationBudget <= 0) return;
    if (1 + creationAlloc[key] >= CREATE_STAT_CAP) return;
    creationAlloc[key]++;
    creationBudget--;
  } else {
    if (creationAlloc[key] <= 0) return;
    creationAlloc[key]--;
    creationBudget++;
  }
  renderCreationStats();
}

function renderCreationStats() {
  document.getElementById('creation-budget').textContent = creationBudget;
  STAT_KEYS.forEach(k => {
    const val = 1 + creationAlloc[k];
    document.getElementById(`create-val-${k}`).textContent = val;
    document.getElementById(`create-plus-${k}`).disabled = (creationBudget <= 0 || val >= CREATE_STAT_CAP);
    document.getElementById(`create-minus-${k}`).disabled = (creationAlloc[k] <= 0);
  });
}

function selectGender(g) {
  selectedGender = g;
  document.getElementById('btn-gender-male').classList.toggle('active', g === 'male');
  document.getElementById('btn-gender-female').classList.toggle('active', g === 'female');
}

function confirmCreate() {
  const nameInput = document.getElementById('char-name-input');
  const name = (nameInput.value || '').trim().slice(0, 12) || '無名冒險者';
  createCharacter(name, creationAlloc, selectedGender);
  enterGame();
}

function enterGame() {
  startLoop();
  activeTab = 'map';
  const cur = regionOf(state.mapId);
  selectedRegionId = cur ? cur.id : null;
  renderAll();
  renderMapBackground();
  updatePlayerSprite();
  initVolumeSliders();
  /* 進遊戲的音效（#146）。放在 initVolumeSliders 之後，音量設定已經就緒。
     新角色與讀檔走的都是這一支，所以只掛這裡就夠。 */
  playEventSfx('login');
  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) muteBtn.textContent = state.muted ? '🔇 取消靜音' : '🔊 靜音';
  /* 掛機收益面板每次進場都要收起來重置（#135）：換存檔格時面板若留在開啟狀態，
     裡面會是上一格的紀錄。勾選框則要讀這一格自己的設定。 */
  idleReportOpen = false;
  _idleReportUnseen = false;
  const rp = document.getElementById('idle-report-panel');
  if (rp) rp.classList.add('hidden');
  const optBox = document.getElementById('opt-offline-modal');
  if (optBox) optBox.checked = showOfflineReport();
  refreshIdleReportBtn();
  playMapMusic();
  showScreen('screen-game');
}

/* ---------------- 主畫面渲染 ---------------- */
function onTickUI() {
  if (document.getElementById('screen-game').classList.contains('active')) {
    /* 日誌的合併重畫（#117）。rAF 在背景分頁不會跑，所以這裡補一次——
       沒有髒資料時 renderLogNow() 直接 return，不花成本。 */
    renderLogNow();
    renderTopBar();
    // 檢測怪物列表是否變更
    const currentIds = state.monsters ? state.monsters.map(m => m.id).join(',') : '';
    if (lastMonsterDefId !== currentIds) {
      renderMonster();
    } else {
      updateMonsterHp();
    }
    updateSkillAura();
    updateBuffCountdown();
    updatePlayerSprite();   // 換武器要即時換騎乘圖；key 沒變時這個函式會直接 return
    renderGmPanel();
    applyFarmModeTheme();     // 打寶模式的介面染色（#111）
    syncForgeTabBtn();        // 轉職／學會鍛造技能後，分頁列上的「🔨 鍛造」要自己出現
    if (forgeIsOpen()) refreshForgeIfChanged();   // 掛機中材料與鋅幣會變，數字要跟著走
    syncSkillScaleSlider();   // 換職業時滑桿要跳到那個職業記住的值
    renderAllySprites();
    updateAllyPanelLive();   // 只改數字，整個重畫會把展開中的下拉選單刪掉
    if (activeTab === 'quests' && huntTabSig() !== _huntSig
        && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#tab-quests'))) {
      renderQuestsTab();
    }
    if (document.getElementById('attendance-modal') && !document.getElementById('attendance-modal').classList.contains('hidden')
        && attendanceSig() !== _attendanceSig) renderAttendanceModal();
    if (activeTab === 'pets' && petsSig() !== _petsSig
        && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#tab-pets .pet-release'))) {
      renderPetsTab();
    }
  }
}

/* GM 測試面板（v1.0 起預設關閉）。

   那幾顆鈕直接給等級、鋅幣與遺物券——正式版留著等於把遊戲的進度整段跳過。
   **不刪掉是因為測試還要用**：加上 `?gm=1` 就會開回來
   （例如 index.html?gm=1），一般玩家不會碰到。

   只在安全區顯示的規則照舊；掛在每秒的 UI 心跳上，
   換地圖就自己跟著開關，不用在 changeMap() 那邊另外埋一次呼叫。 */
function gmEnabled() {
  try { return new URLSearchParams(location.search).get('gm') === '1'; }
  catch (e) { return false; }
}
function renderGmPanel() {
  const el = document.getElementById('gm-panel');
  if (!el) return;
  el.classList.toggle('hidden', !(gmEnabled() && inSafeZone()));
}

/* ---------------- 隊友（#83）----------------

   立繪站在玩家的上下方、往後靠一些（`left` 比玩家小）。
   兩個容器是空的 <div>，有沒有人、長什麼樣都由這裡填。 */
/* 隊友立繪也要動。第一版只放 frame_000.png 的靜態 <img>，所以隊友一直站著不動
   （使用者 2026-08-15 回報）。改成跟玩家一樣輪播 frames 資料夾裡的圖：
   引擎那邊在隊友揮擊時把 `_swingAt` 蓋上時間戳，這裡看到就從第 0 格重播一輪。

   用 <img> 換 src 而不是像玩家那樣開 canvas：隊友只要看得出在動就好，
   不需要量邊界框那一套（那是為了讓施放姿勢跟基本姿勢對齊，隊友沒有施放姿勢）。 */
/* 隊友立繪用哪個資料夾。跟玩家共用同一套命名（見 updatePlayerSprite），
   查不到就退回 SVG——不能直接沿用玩家的 baseAnimKey()，那支讀的是 state。 */
function spriteFolderFor(jobId, gender) {
  const alias = (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[jobId]) || jobId;
  return alias + '_' + (gender === 'female' ? 'female' : 'male');
}

function allySpriteHtml(a) {
  const jd = JOB_TREE[a.jobId] || {};
  const parts = (typeof paperdollLookParts === 'function') ? paperdollLookParts(a) : null;
  let body;
  if (parts) body = '<canvas class="ally-paper"></canvas>';
  else {
    const key = spriteFolderFor(a.jobId, a.gender || 'male');
    if (key) loadAnimFrames(key);
    const first = key ? `images/frames/${key}/frame_000.png` : `images/player_${a.jobId}.svg`;
    body = `<img class="ally-img" data-key="${key || ''}" src="${first}" alt="${a._allyName}" onerror="this.onerror=null;this.src='${placeholderImgSrc('monster')}'">`;
  }
  return `<div class="ally-figure" data-key="${parts ? '' : (spriteFolderFor(a.jobId, a.gender || 'male') || '')}" title="${a._allyName}（${jd.name || a.jobId}）Lv.${a.baseLevel}">
    ${body}
    <div class="ally-tag"></div>
    <div class="ally-hp"><div class="ally-hp-fill"></div></div>
  </div>`;
}

/* 立繪的骨架只有在「隊友換人」時才重建；血條、名牌、動畫格每個 UI 心跳更新。
   每次都重建 innerHTML 的話 <img> 會一直換新的，反而永遠停在第一格。 */
let allySpriteSig = '';
const allyAnimIdx = [0, 0];
const allyDolls = [
  { key: '', parts: null, act: '', rest: 'idle', t0: 0, once: 0, atkFrom: 0, atkDelay: 0, swing: 0 },
  { key: '', parts: null, act: '', rest: 'idle', t0: 0, once: 0, atkFrom: 0, atkDelay: 0, swing: 0 }
];
function allyLookKey(a) {
  if (!a) return '-';
  const bits = [a._slot, a.jobId, a.gender || 'male', a.hairStyle || 9, a.hairColor != null ? a.hairColor : 5];
  const slots = ['weapon', 'head_top', 'head_mid', 'head_bottom'];
  for (let i = 0; i < slots.length; i++) bits.push(equipRefItem(a, slots[i]) || '');
  return bits.join(':');
}
function renderAllySprites() {
  const list = (state && state.allies) || [];
  const sig = [0, 1].map(i => allyLookKey(list[i])).join('|');
  if (sig !== allySpriteSig) {
    allySpriteSig = sig;
    allyDolls.forEach(d => { d.key = ''; });
    for (let i = 0; i < 2; i++) {
      const el = document.getElementById('ally-sprite-' + i);
      if (el) el.innerHTML = list[i] ? allySpriteHtml(list[i]) : '';
    }
  }
  for (let i = 0; i < 2; i++) {
    const a = list[i];
    const el = document.getElementById('ally-sprite-' + i);
    if (!a || !el) continue;
    const fig = el.querySelector('.ally-figure');
    if (!fig) continue;
    const away = !allyOnThisMap(a);
    fig.classList.toggle('away', away);
    fig.classList.toggle('downed', !!a._downed && !away);
    const tag = fig.querySelector('.ally-tag');
    const txt = (away ? '' : (a._downed ? '💀 ' : '')) + a._allyName
      + (away ? (' · ' + mapNameOf(allyHomeMap(a))) : '');
    if (tag && tag.textContent !== txt) tag.textContent = txt;
    const bar = fig.querySelector('.ally-hp-fill');
    if (bar) bar.style.width = Math.max(0, Math.min(100, (a.hp / Math.max(1, a.maxHp)) * 100)) + '%';
    if (!away && fig.querySelector('.ally-paper')) syncAllyDoll(i, a, fig);
    else if (!away) stepAllyAnim(i, a, fig);
  }
}

/* 揮擊時從第 0 格播到最後一格。UI 心跳是 100ms 一次，一輪 6~8 格約 0.6~0.8 秒，
   比大多數的攻擊間隔短，所以看起來就是「打一下、收回來」。 */
function stepAllyAnim(i, ally, fig) {
  const img = fig.querySelector('.ally-img');
  const key = fig.getAttribute('data-key');
  if (!img || !key) return;
  const frames = animFrameImages[key];
  if (!frames || frames.length < 2) return;
  if (ally._downed) { allyAnimIdx[i] = 0; img.src = frames[0].src; return; }
  if (allyAnimIdx[i] > 0) {
    // 播放中：一路播到最後一格再回待機格。**播放中不理會新的揮擊**，
    // 不然攻速快的時候每次心跳都被重設成第 0 格，看起來就是完全不動。
    allyAnimIdx[i] = (allyAnimIdx[i] + 1) % frames.length;
    ally._swingShown = ally._swingAt;
  } else if (ally._swingAt && ally._swingAt !== ally._swingShown) {
    ally._swingShown = ally._swingAt;
    allyAnimIdx[i] = 1;                     // 新的一次揮擊：起手
  }
  const f = frames[Math.min(allyAnimIdx[i], frames.length - 1)];
  if (f && img.src !== f.src) img.src = f.src;
}

const ALLY_CHAR_H = Math.round(150 * 0.75 * 0.75 * 0.82);
function syncAllyDoll(i, ally, fig) {
  const canvas = fig.querySelector('.ally-paper');
  const doll = allyDolls[i];
  if (!canvas || !doll) return;
  const parts = paperdollLookParts(ally);
  if (!parts) { canvas.style.display = 'none'; return; }
  if (doll.key !== parts.join('|')) {
    doll.key = parts.join('|');
    doll.parts = parts;
    doll.act = '';
    doll.once = 0;
    doll.t0 = Date.now();
    layoutPaperdoll(canvas, parts, ALLY_CHAR_H, 16);
    canvas.style.display = '';
    canvas._plFrame = -1;
    if (!mobAnimTimer) mobAnimTimer = setInterval(mobAnimTick, 33);
  }
  const fighting = state.monsters && state.monsters.length && !ally._downed;
  const fieldSide = typeof inSafeZone === 'function' ? !inSafeZone() : !!fighting;
  if (fieldSide && paperdollFrameCount(parts[0], 'ready_s')) doll.rest = 'ready_s';
  else if (fieldSide && paperdollFrameCount(parts[0], 'idle_s')) doll.rest = 'idle_s';
  else doll.rest = 'idle';
  if (doll.once && (Date.now() - doll.t0) < doll.once) return;
  doll.once = 0;
  doll.atkFrom = 0;
  doll.atkDelay = 0;
  if (ally._swingAt && ally._swingAt !== doll.swing && !ally._downed) {
    doll.swing = ally._swingAt;
    const act = allyAttackAct(parts);
    const n = paperdollFrameCount(parts[0], act);
    if (n) {
      const swing = paperdollSwingTiming(act, n, ally.attackInterval);
      doll.act = act;
      doll.t0 = Date.now();
      doll.atkFrom = swing.from;
      doll.atkDelay = swing.delay;
      doll.once = swing.once;
      canvas._plFrame = -1;
      return;
    }
  }
  if (doll.act !== doll.rest) {
    doll.act = doll.rest;
    doll.t0 = Date.now();
    canvas._plFrame = -1;
  }
}
function allyAttackAct(parts) {
  const weapon = parts.filter(p => p.indexOf('weapon/') === 0).pop();
  const named = weapon && window.PAPERDOLL.atk && window.PAPERDOLL.atk[weapon];
  if (named && paperdollFrameCount(parts[0], named)) return named;
  if (weapon && paperdollFrameCount(parts[0], 'slash')) return 'slash';
  return 'attack';
}
function drawAllyDolls() {
  for (let i = 0; i < allyDolls.length; i++) {
    const doll = allyDolls[i];
    const canvas = document.querySelector('#ally-sprite-' + i + ' .ally-paper');
    if (!doll || !doll.parts || !canvas || canvas.style.display === 'none') continue;
    const swinging = doll.once > 0 && doll.atkDelay > 0 && (Date.now() - doll.t0) < doll.once;
    const act = swinging ? (doll.act || 'attack') : (doll.rest || 'idle');
    const parts = doll.parts;
    const nFrames = paperdollFrameCount(parts[0], act) || 1;
    const delay = swinging ? doll.atkDelay : ((window.PAPERDOLL.delay && window.PAPERDOLL.delay[act]) || 100);
    const n0 = ((Date.now() - doll.t0) / delay) | 0;
    const from = swinging ? (doll.atkFrom || 0) : 0;
    const n = swinging ? Math.min(from + n0, nFrames - 1) : (n0 % nFrames);
    const body = paperdollFrame(parts[0], act, n);
    if (!body) continue;
    let ready = true;
    for (let p = 0; p < parts.length; p++) {
      const im = paperdollImage(parts[p]);
      if (!im.complete || !im.naturalWidth) ready = false;
    }
    if (ready && canvas._plFrame === n && canvas._plAct === act) continue;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ox = canvas._ox || 0, oy = canvas._oy || 0;
    if (!drawPaperdollLayers(ctx, parts[0], body, ox, oy)) continue;
    for (let p = 1; p < parts.length; p++) {
      const fr = paperdollFrame(parts[p], act, n);
      if (!fr) continue;
      const aligned = paperdollAlign(parts[p], body, fr);
      drawPaperdollLayers(ctx, parts[p], fr, ox + aligned[0], oy + aligned[1]);
    }
    if (ready) {
      canvas._plFrame = n;
      canvas._plAct = act;
      applyPaperTransform(canvas, facingFlip(act, true));
    }
  }
}

/* 浮動面板，不是 modal——使用者 2026-08-15 指定「到戰鬥地圖改為浮動式視窗、
   不會讓掛機停止」。原本是 modal-overlay，蓋住整個畫面看不到戰鬥。
   雇傭／更新仍然只有安全區做得到（engine 那邊擋），但喝水設定、自動購買、
   復活這些在打怪時才需要的，就得在戰鬥地圖上按得到。 */
let allyPanelOpen = false;
function toggleAllyPanel() {
  allyPanelOpen = !allyPanelOpen;
  document.getElementById('ally-panel').classList.toggle('hidden', !allyPanelOpen);
  // 兩個浮動面板釘在同一個位置，同時開會疊在一起（#135）
  if (allyPanelOpen && idleReportOpen) toggleIdleReport();
  if (allyPanelOpen) renderAllyPanel();
}
function allyAction(fn, slot) {
  fn(slot);
  renderAllyPanel();
  renderAll();
}
/* 面板分兩層：`renderAllyPanel()` 整個重畫（開啟時、按下動作時），
   `updateAllyPanelLive()` 每秒只改會變的幾個數字。

   **不能每秒整個重畫**：innerHTML 一換，正在展開的 <select> 就被刪掉重建，
   藥水選單永遠選不下去（使用者 2026-08-15 回報）。跟三個搜尋框那個注音問題
   同一個病——重畫把使用者正在互動的元素抽掉了。 */
function renderAllyPanel() {
  const el = document.getElementById('ally-panel-body');
  if (!el) return;
  const list = state.allies || [];
  const cands = allyHireCandidates();
  const leaf = ITEMS[ALLY_REVIVE_ITEM];
  const safe = inSafeZone();

  let html = `<div class="ally-note" id="ally-exp-status"></div>
    <div class="ally-note">隊伍最多 3 人（自己＋${ALLY_MAX} 名自己的角色）。組隊不扣錢。
    ${safe ? '' : '<b>組隊要回安全區</b>，同步與喝水在這裡就能改。'}</div>`;

  html += '<div class="ally-sec">目前隊伍</div>';
  if (!list.length) {
    html += '<div class="ally-empty">還沒有隊友。</div>';
  } else {
    html += list.map(a => {
      const jd = JOB_TREE[a.jobId] || {};
      const away = !allyOnThisMap(a);
      return `<div class="ally-row${away ? ' away' : ''}" data-ally="${a._slot}">
        <span class="ally-row-name">${a._allyName}</span>
        ${allyJobLvHtml(jd.name || a.jobId, a.baseLevel)}
        <span class="ally-kill-exp"></span>
        <div class="ally-row-actions">
        <button class="btn-small ally-revive" onclick="allyAction(reviveAllyBySlot,'${a._slot}')">🍃 扶起</button>
        <button class="btn-small" onclick="allyAction(refreshAlly,'${a._slot}')">同步</button>
        <button class="btn-small danger" onclick="allyAction(dismissAlly,'${a._slot}')">退隊</button>
        </div>
      </div>`;
    }).join('');
  }

  /* 「其他存檔的角色」在戰鬥地圖預設收起——那邊本來就雇不了，
     展開只是佔掉面板高度（使用者 2026-08-15 指定）。 */
  const free = cands.filter(c => !c.hired);
  const open = allyHireListOpen === null ? safe : allyHireListOpen;
  html += `<div class="ally-sec ally-sec-toggle" onclick="toggleAllyHireList()">
    <span>${open ? '▾' : '▸'} 其他存檔的角色（${free.length}）</span>
    ${safe ? '' : '<span class="codex-sec-hint">回安全區才能組隊</span>'}
  </div>`;
  if (open) {
    html += !free.length
      ? '<div class="ally-empty">沒有其他存檔的角色可以組隊。</div>'
      : free.map(c => `<div class="ally-row">
          <span class="ally-row-name">${c.jobIcon} ${c.name}</span>
          ${allyJobLvHtml(c.jobName, c.baseLevel)}
          <span class="ally-row-hp">存檔 ${Number(c.slot) + 1}</span>
          <div class="ally-row-actions">
          <button class="btn-small" ${!safe || list.length >= ALLY_MAX ? 'disabled' : ''}
            onclick="allyAction(hireAlly,'${c.slot}')">組隊</button>
          </div>
        </div>`).join('');
  }

  const cfg = state.allyPotion || {};
  const potOpts = state.inventory
    .filter(r => !r.instanceId && ITEMS[r.item] && (ITEMS[r.item].heal || ITEMS[r.item].healPct))
    .map(r => `<option value="${r.item}" ${cfg.primary === r.item ? 'selected' : ''}>${ITEMS[r.item].name}（${r.qty}）</option>`)
    .join('');
  html += `<div class="ally-sec">隊友喝水<span class="codex-sec-hint">喝的是玩家背包裡的藥水</span></div>
    <div class="ally-opt">
      <label><input type="checkbox" ${cfg.enabled ? 'checked' : ''} onchange="setAllyPotionCfg('enabled', this.checked)">
        隊友 HP 低於
        <input class="ally-num" type="number" min="10" max="95" value="${cfg.hpThreshold || 50}"
          onchange="setAllyPotionCfg('hpThreshold', Math.max(10, Math.min(95, parseInt(this.value) || 50)))">% 時自動喝</label>
      <label>優先喝
        <select class="ally-sel" onchange="setAllyPotionCfg('primary', this.value)">
          <option value="">（不指定）</option>${potOpts}
        </select>
        用完改喝 ${ITEMS[ALLY_POTION_FALLBACK].name}</label>
      <label><input type="checkbox" ${state.autoBuyAllyPotion ? 'checked' : ''} onchange="setAutoBuyAllyPotion(this.checked)">
        藥水用完自動購買</label>
    </div>`;

  /* 隊友的藍水（#105）。隊友開始自己放技能之後 SP 就是消耗品，
     結構跟上面的紅水一模一樣：玩家背包供應、門檻可調、沒了自動買。 */
  const spCfg = state.allySpPotion || {};
  const spOpts = state.inventory
    .filter(r => !r.instanceId && ITEMS[r.item] && (ITEMS[r.item].restoreSp || ITEMS[r.item].restoreSpPct))
    .map(r => `<option value="${r.item}" ${spCfg.primary === r.item ? 'selected' : ''}>${ITEMS[r.item].name}（${r.qty}）</option>`)
    .join('');
  html += `<div class="ally-sec">隊友藍水<span class="codex-sec-hint">要放技能就得有 SP</span></div>
    <div class="ally-opt">
      <label><input type="checkbox" ${spCfg.enabled ? 'checked' : ''} onchange="setAllySpPotionCfg('enabled', this.checked)">
        隊友 SP 低於
        <input class="ally-num" type="number" min="5" max="95" value="${spCfg.spThreshold || 30}"
          onchange="setAllySpPotionCfg('spThreshold', Math.max(5, Math.min(95, parseInt(this.value) || 30)))">% 時自動喝</label>
      <label>優先喝
        <select class="ally-sel" onchange="setAllySpPotionCfg('primary', this.value)">
          <option value="">（不指定）</option>${spOpts}
        </select>
        用完改喝 ${ITEMS[ALLY_SP_POTION_FALLBACK].name}</label>
      <label><input type="checkbox" ${state.autoBuyAllySpPotion ? 'checked' : ''} onchange="setAutoBuyAllySpPotion(this.checked)">
        藍水用完自動購買（一次 ${AUTO_BUY_ALLY_SP_QTY} 瓶）</label>
      <div class="ally-note-sm">隊友的 HP／SP 也會自然回復，公式跟你自己那套一樣。</div>
    </div>`;

  // 每位隊友一份自動戰鬥設定（#105）
  if (list.length) {
    html += `<div class="ally-sec">隊友的自動戰鬥<span class="codex-sec-hint">規則跟你自己那頁一樣</span></div>`;
    html += list.map(a => renderAllyAutoBattle(a)).join('');
  }

  /* 隊友的箭跟藥水同一個規則：射的是玩家背包裡的箭，錢也是玩家出（#93）。
     玩家自己那支自動補箭只在玩家拿弓時才會動，補不到隊友。 */
  html += `<div class="ally-sec">隊友箭矢<span class="codex-sec-hint">射的是玩家背包裡的箭</span></div>
    <div class="ally-opt">
      <label><input type="checkbox" ${state.autoBuyAllyArrow ? 'checked' : ''} onchange="setAutoBuyAllyArrow(this.checked)">
        箭矢少於 ${AUTO_BUY_ALLY_ARROW_THRESHOLD + 1} 支時自動購買（一次 ${AUTO_BUY_ALLY_ARROW_QTY} 支）</label>
      <div class="ally-stock" id="ally-arrow-stock"></div>
    </div>`;

  html += `<div class="ally-sec">隊友音效</div>
    <div class="ally-opt">
      <label><input type="checkbox" ${state.allySfxOff ? '' : 'checked'} onchange="setAllySfxOff(!this.checked)">
        播放隊友的攻擊／技能音效</label>
      <label>音量
        <input class="ally-range" type="range" min="0" max="100"
          value="${Math.round((state.allySfxRatio != null ? state.allySfxRatio : 0.5) * 100)}"
          oninput="setAllySfxRatio(this.value)">
        <span id="vol-ally-text">${Math.round((state.allySfxRatio != null ? state.allySfxRatio : 0.5) * 100)}%</span>
        <span class="codex-sec-hint">相對於主音效音量</span></label>
    </div>`;

  html += `<div class="ally-sec">倒地與復活</div>
    <div class="ally-opt">
      <label><input type="checkbox" ${state.autoReviveAlly ? 'checked' : ''} onchange="setAutoReviveAlly(this.checked)">
        倒地 ${ALLY_DOWN_REVIVE_CD_SEC} 秒後自動用${leaf.name}扶起</label>
      <label><input type="checkbox" ${state.autoBuyReviveLeaf ? 'checked' : ''} onchange="setAutoBuyReviveLeaf(this.checked)">
        ${leaf.name}少於 ${AUTO_BUY_LEAF_THRESHOLD + 1} 個時自動購買（${leaf.buyPrice.toLocaleString()}z／個）</label>
      <div class="ally-stock" id="ally-leaf-stock"></div>
    </div>`;
  el.innerHTML = html;
  updateAllyPanelLive();
}
/* 一位隊友的自動戰鬥設定（#105）。

   技能清單要用**隊友自己的身分**去撈（`usableSkillEntries()` 讀的是全域 state），
   所以整段包在 withAlly 裡；分類走跟自動戰鬥分頁同一組 `isAttackSkill()` /
   `isAutoSupportSkill()`，玩家看到什麼規則、隊友就是什麼規則。

   設定值存在隊友快照自己身上（`autoSkill` / `autoSkillConfig` / `autoSupportSkills`），
   那份物件住在 `state.allies` 裡，會跟著玩家的存檔一起存。
   預設值是**那個角色本人掛機時的設定**——快照是整份複製過來的，直接沿用最合理。 */
let allyAutoOpen = {};   // { slot: true } 哪幾位展開著
function toggleAllyAuto(slot) { allyAutoOpen[slot] = !allyAutoOpen[slot]; renderAllyPanel(); }

function renderAllyAutoBattle(a) {
  const open = !!allyAutoOpen[a._slot];
  const cfg = a.autoSkillConfig || { skillId: null, skillId2: null, spThreshold: 30, spThreshold2: 50, monsterCount2: 2 };
  let atk = [], sup = [];
  withAlly(a, () => {
    usableSkillEntries().forEach(({ sk, lv }) => {
      if (isAttackSkill(sk)) atk.push({ sk, lv });
      else if (isAutoSupportSkill(sk)) sup.push({ sk, lv });
    });
  });
  const on = sup.filter(e => (a.autoSupportSkills || {})[e.sk.id]).length;
  const cur = atk.find(e => e.sk.id === cfg.skillId);
  const head = `<div class="ally-sec ally-sec-toggle" onclick="toggleAllyAuto('${a._slot}')">
      <span>${open ? '▾' : '▸'} ${a._allyName}</span>
      <span class="codex-sec-hint">${cur ? cur.sk.name : '沒設攻擊技'}・輔助 ${on}</span>
    </div>`;
  if (!open) return head;

  const opt = (list, sel) => '<option value="">不使用技能</option>'
    + list.map(e => `<option value="${e.sk.id}" ${sel === e.sk.id ? 'selected' : ''}>${e.sk.name} Lv${e.lv}</option>`).join('');
  let html = head + `<div class="ally-opt">
    <label><input type="checkbox" ${a.autoSkill ? 'checked' : ''} onchange="setAllyAutoSkill('${a._slot}', this.checked)">
      自動施放攻擊技能</label>`;
  if (!atk.length) {
    html += '<div class="ally-note-sm">這位隊友沒有學任何攻擊技能。</div>';
  } else {
    html += `<label>第一招
      <select class="ally-sel" onchange="setAllyAutoCfg('${a._slot}','skillId', this.value)">${opt(atk, cfg.skillId)}</select></label>
      <label>SP 保留
        <input class="ally-num" type="number" min="5" max="90" value="${cfg.spThreshold || 30}"
          onchange="setAllyAutoCfg('${a._slot}','spThreshold', Math.max(5, Math.min(90, parseInt(this.value) || 30)))">%</label>
      <label>第二招（範圍技）
        <select class="ally-sel" onchange="setAllyAutoCfg('${a._slot}','skillId2', this.value)">${opt(atk, cfg.skillId2)}</select></label>
      <label>怪物達
        <input class="ally-num" type="number" min="1" max="${MELEE_MAX_MONSTERS}" value="${cfg.monsterCount2 || 2}"
          onchange="setAllyAutoCfg('${a._slot}','monsterCount2', Math.max(1, Math.min(MELEE_MAX_MONSTERS, parseInt(this.value) || 2)))">隻才放</label>`;
  }
  if (sup.length) {
    html += '<div class="ally-note-sm">輔助技能（勾了才會放）</div>';
    html += sup.map(e => `<label><input type="checkbox" ${(a.autoSupportSkills || {})[e.sk.id] ? 'checked' : ''}
      onchange="setAllyAutoSupport('${a._slot}','${e.sk.id}', this.checked)"> ${e.sk.name} Lv${e.lv}</label>`).join('');
  }
  html += '</div>';
  return html;
}
function allyBySlot(slot) { return (state.allies || []).find(a => a && String(a._slot) === String(slot)); }
function setAllyAutoSkill(slot, v) { const a = allyBySlot(slot); if (!a) return; a.autoSkill = !!v; saveGame(); renderAllyPanel(); }
function setAllyAutoCfg(slot, key, v) {
  const a = allyBySlot(slot);
  if (!a) return;
  if (!a.autoSkillConfig) a.autoSkillConfig = { skillId: null, skillId2: null, spThreshold: 30, spThreshold2: 50, monsterCount2: 2 };
  a.autoSkillConfig[key] = v === '' ? null : v;
  saveGame();
  renderAllyPanel();
}
function setAllyAutoSupport(slot, skillId, v) {
  const a = allyBySlot(slot);
  if (!a) return;
  if (!a.autoSupportSkills) a.autoSupportSkills = {};
  a.autoSupportSkills[skillId] = !!v;
  saveGame();
  renderAllyPanel();
}

let allyHireListOpen = null;   // null = 照地圖決定（安全區展開、戰鬥圖收起）
function toggleAllyHireList() {
  const safe = inSafeZone();
  allyHireListOpen = !(allyHireListOpen === null ? safe : allyHireListOpen);
  renderAllyPanel();
}

// 每秒只改這幾個會變的數字，不動任何 input／select
function killExpPctLabel(gained, need, capped) {
  if (capped) return '已滿';
  if (!(need > 0)) return '--';
  const pct = (gained || 0) / need * 100;
  if (pct > 0 && pct < 0.01) return '<0.01%';
  return pct.toFixed(2) + '%';
}
function allyJobLvHtml(jobName, baseLevel) {
  const nm = jobName || '—';
  const lv = Number(baseLevel) || 1;
  return `<span class="ally-row-job-lv"><span class="ally-job-name">${nm}</span><span class="ally-job-lvtxt">Lv.${lv}</span></span>`;
}
function emptyKillExpPairHtml() {
  return '<span class="exp-pair"><i>Lv\u00a0</i><b>--</b><i>Job\u00a0</i><b>--</b></span>';
}
function memberKillExpPairHtml(member, quoted) {
  if (!quoted) return emptyKillExpPairHtml();
  const bl = member.baseLevel || 1;
  const jl = member.jobLevel || 1;
  const jd = JOB_TREE[member.jobId] || {};
  const baseCap = typeof baseLevelCapOf === 'function' ? baseLevelCapOf(member.jobId) : 250;
  const lv = killExpPctLabel(quoted.base, expToNextBaseLevel(bl), bl >= baseCap);
  const job = killExpPctLabel(quoted.job, expToNextJobLevel(jl, jd.tier || 0), !!(jd.jobLevelMax && jl >= jd.jobLevelMax));
  const lvTxt = lv === '已滿' ? lv : ('+ ' + lv);
  const jobTxt = job === '已滿' ? job : ('+ ' + job);
  return `<span class="exp-pair"><i>Lv\u00a0</i><b>${lvTxt}</b><i>Job\u00a0</i><b>${jobTxt}</b></span>`;
}
let _partyExpPairHold = '';
let _partyExpHoldMap = '';
/* 城裡、沒開遇怪：固定 --。野外兩隻怪中間的空檔沿用上一隻，避免每殺一隻閃一次。 */
function killExpHtmlFor(member) {
  const mapId = (state && state.mapId) || '';
  if (_partyExpHoldMap !== mapId) {
    _partyExpHoldMap = mapId;
    _partyExpPairHold = '';
  }
  const q = previewMemberKill(member);
  if (q) {
    const html = memberKillExpPairHtml(member, q);
    _partyExpPairHold = html;
    return html;
  }
  const hunting = state && state.encounterMode !== 'off' && !(typeof isInTown === 'function' && isInTown());
  if (hunting && _partyExpPairHold) return null;
  return emptyKillExpPairHtml();
}
function writeHtml(el, html) {
  if (!el) return;
  if (html == null) html = el._html || emptyKillExpPairHtml();
  if (el._html === html) return;
  el._html = html;
  el.innerHTML = html;
}
function partyExpHeadHtml() {
  let pair = killExpHtmlFor(state);
  if (pair == null) pair = _partyExpPairHold || emptyKillExpPairHtml();
  return `<div>${partyExpStatusText()}</div>${pair}`;
}
function updateAllyPanelLive() {
  if (!allyPanelOpen) return;
  (state.allies || []).forEach(a => {
    const row = document.querySelector(`#ally-panel-body .ally-row[data-ally="${a._slot}"]`);
    if (!row) return;
    const away = !allyOnThisMap(a);
    row.classList.toggle('away', away);
    row.classList.toggle('downed', !!a._downed && !away);
    const ex = row.querySelector('.ally-kill-exp');
    if (ex && ex._map !== state.mapId) { ex._map = state.mapId; ex._html = ''; }
    const et = away
      ? `<span class="ally-away-map">${mapNameOf(allyHomeMap(a))}</span>`
      : killExpHtmlFor(a);
    writeHtml(ex, et);
    const rv = row.querySelector('.ally-revive');
    if (rv) rv.style.display = a._downed && !away ? '' : 'none';
  });
  const status = document.getElementById('ally-exp-status');
  if (status) {
    const t = partyExpHeadHtml();
    writeHtml(status, t);
  }
  const stock = document.getElementById('ally-leaf-stock');
  if (stock) {
    const t = `目前持有 ${getItemQty(ALLY_REVIVE_ITEM)} 個　·　回安全區全隊免費滿血復活`;
    if (stock.textContent !== t) stock.textContent = t;
  }
  const arrow = document.getElementById('ally-arrow-stock');
  if (arrow) {
    // 一位一行：哪位隊友在用哪種箭、玩家背包還剩幾支
    const users = allyArrowUsers();
    const t = !users.length
      ? '目前沒有需要箭矢的隊友。'
      : users.map(a => {
        const id = allyAmmoId(a);
        return `${a._allyName}：${ITEMS[id].name} ${getItemQty(id)} 支`;
      }).join('　·　');
    if (arrow.textContent !== t) arrow.textContent = t;
  }
}

const BATTLE_BUFF_NAMES = {
  aspd: '攻速', atk: '攻擊', def: '防禦', flee: '迴避', gold: '金錢', crit: '暴擊', hit: '命中',
  statpct: '素質', blessing: '祝福', flatstat: '素質', agiflat: 'AGI', lukflat: 'LUK',
  sprate: 'SP回復', poison: '毒', maxroll: '最大傷害', holyweapon: '聖屬', shield: '護盾', magnumfire: '火屬',
  block: '格擋', auraflat: '靈氣', weaponatk: '武器ATK', eledmg_poison: '毒傷',
  meltdown: '凶砍', spawnspeed: '生怪', reflect: '反射', providence: '神祐',
  perfectdodge: '閃避', critdmg: '暴傷', maxhppct: 'HP', maxsppct: 'SP',
  skillcd: '冷卻', exp: '經驗', atkflat: 'ATK', defflat: 'DEF', spcost: '耗SP',
  songelereduce: '耐性', songailresist: '抗性', gemfree: '礦石', dontforgetme: '勿忘我',
  dmgtaken: '減傷', eleweapon: '屬性', eledmg_fire: '火傷', eledmg_water: '水傷',
  eledmg_wind: '風傷', eledmg_earth: '地傷', eleresist: '抗屬'
};
function buffEffectLine(b) {
  const name = BATTLE_BUFF_NAMES[b.type] || b.type;
  let bonus = '啟動中';
  if (b.type === 'blessing') bonus = '+' + (b.strBonus || 0);
  else if (b.flatBonus) bonus = '+' + b.flatBonus;
  else if (typeof b.mult === 'number' && b.mult !== 1) bonus = '×' + b.mult.toFixed(2);
  const remain = Math.max(0, Math.ceil((b.msRemaining || 0) / 1000));
  return name + ' ' + bonus + '　' + remain + ' 秒';
}
/* 同一個技能給的多個效果收成一格。沒有 skillId 的（藥水之類）仍各佔一格。 */
function buffChipGroups(list) {
  const order = [];
  const map = new Map();
  list.forEach(b => {
    const key = b.skillId ? ('s:' + b.skillId) : ('t:' + (b.type || ''));
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key).push(b);
  });
  return order.map(k => map.get(k));
}
function buffChipKey(group) {
  const b = group[0];
  return b.skillId ? ('s:' + b.skillId) : ('t:' + (b.type || ''));
}
function buffChipRemain(group) {
  return group.reduce((m, b) => Math.max(m, Math.ceil((b.msRemaining || 0) / 1000)), 0);
}
function buffChipLabel(group) {
  const b = group[0];
  if (b.skillId && typeof buffSourceLabel === 'function') return buffSourceLabel(b);
  return BATTLE_BUFF_NAMES[b.type] || b.type || '';
}
function pdebuffChipRemain(key) {
  const b = state.pdebuff && state.pdebuff[key];
  if (!b) return 0;
  return Math.max(0, Math.ceil((b.until - Date.now()) / 1000));
}
function pdebuffChipLabel(key) {
  return (PLAYER_DEBUFF_META[key] && PLAYER_DEBUFF_META[key].name) || key;
}
function pdebuffChipTip(key) {
  const v = typeof pDebuff === 'function' ? pDebuff(key) : 0;
  const unit = key === 'fleeFlat' ? '' : '%';
  const remain = pdebuffChipRemain(key);
  return `${pdebuffChipLabel(key)} ${v > 0 ? '+' : ''}${v}${unit}\n${remain} 秒`;
}
function pdebuffChipIcon(key) {
  return (PLAYER_DEBUFF_META[key] && PLAYER_DEBUFF_META[key].icon) || '🔻';
}
function buffChipTip(group) {
  const head = (group[0].skillId && typeof buffSourceLabel === 'function') ? buffSourceLabel(group[0]) : '';
  const body = group.map(buffEffectLine).join('\n');
  return head ? head + '\n' + body : body;
}
/* 狀態圖示釘在戰鬥畫面右上，先往下排，排滿再往左開一欄。
   一欄能放幾個看戰鬥區高度，沒有寫死個數。 */
let buffTipKey = '';
let buffTipText = '';
let buffTipSticky = false;
let buffTipTimer = 0;
function paintBuffTip() {
  const host = document.getElementById('battle-buffs');
  if (!host) return;
  host.querySelectorAll('.buff-chip.on').forEach(n => n.classList.remove('on'));
  let tip = host.querySelector('.buff-tip');
  if (!buffTipText) { if (tip) tip.remove(); return; }
  const btn = buffTipKey && host.querySelector('.buff-chip[data-key="' + buffTipKey + '"]');
  if (btn) btn.classList.add('on');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'buff-tip';
    host.appendChild(tip);
  }
  tip.textContent = buffTipText;
}
function openBuffTip(btn, sticky) {
  buffTipText = btn.getAttribute('data-tip') || '';
  buffTipKey = btn.getAttribute('data-key') || '';
  if (sticky) {
    buffTipSticky = true;
    clearTimeout(buffTipTimer);
    buffTipTimer = setTimeout(() => {
      buffTipSticky = false;
      buffTipText = '';
      buffTipKey = '';
      paintBuffTip();
    }, 3200);
  }
  paintBuffTip();
}
function leaveBuffTip() {
  if (buffTipSticky) return;
  buffTipText = '';
  buffTipKey = '';
  paintBuffTip();
}
function updateBuffCountdown() {
  const el = document.getElementById('battle-buffs');
  if (!el || !state) return;
  const list = state.buffs || [];
  const debKeys = typeof pDebuffList === 'function' ? pDebuffList() : [];
  if (!list.length && !debKeys.length) {
    if (el.childElementCount) el.innerHTML = '';
    buffTipText = '';
    return;
  }
  const groups = buffChipGroups(list);
  const sig = groups.map(g => {
    const key = buffChipKey(g);
    const remain = buffChipRemain(g);
    return key + ':' + remain + ':' + g.map(b => b.type).join(',');
  }).join('|') + '|D:' + debKeys.map(k => k + ':' + pdebuffChipRemain(k)).join(',');
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  let html = groups.map(g => {
    const label = buffChipLabel(g);
    const remain = buffChipRemain(g);
    const tip = buffChipTip(g).replace(/&/g, '＆').replace(/"/g, '＂').replace(/</g, '＜').replace(/\n/g, '&#10;');
    const key = buffChipKey(g).replace(/"/g, '');
    return `<button type="button" class="buff-chip" data-key="${key}" data-tip="${tip}" onclick="openBuffTip(this, true)" onmouseenter="openBuffTip(this, false)" onmouseleave="leaveBuffTip()">${label.slice(0, 1)}<span class="buff-chip-t">${remain}</span></button>`;
  }).join('');
  html += debKeys.map(k => {
    const remain = pdebuffChipRemain(k);
    const tip = pdebuffChipTip(k).replace(/&/g, '＆').replace(/"/g, '＂').replace(/</g, '＜').replace(/\n/g, '&#10;');
    const key = ('d:' + k).replace(/"/g, '');
    return `<button type="button" class="buff-chip debuff" data-key="${key}" data-tip="${tip}" onclick="openBuffTip(this, true)" onmouseenter="openBuffTip(this, false)" onmouseleave="leaveBuffTip()">${pdebuffChipIcon(k)}<span class="buff-chip-t">${remain}</span></button>`;
  }).join('');
  el.innerHTML = html;
  paintBuffTip();
}

function renderAll() {
  renderTopBar();
  renderMonster();
  switchTab(activeTab);
  renderLog();
}

const TAB_GROUP = {
  map: 'fight', autobattle: 'fight', quests: 'fight',
  character: 'grow', skills: 'grow', jobtree: 'grow',
  inventory: 'gear', equip: 'gear',
  codex: 'social', achievements: 'social', pets: 'social'
};
const TAB_GROUP_FIRST = { fight: 'map', grow: 'character', gear: 'inventory', social: 'codex' };
function setTabGroup(g) {
  const nav = document.querySelector('.tab-nav');
  if (nav) {
    nav.classList.remove('group-fight', 'group-grow', 'group-gear', 'group-social');
    nav.classList.add('group-' + g);
  }
  document.querySelectorAll('.tab-group-btn').forEach(b => b.classList.toggle('active', b.dataset.group === g));
}
function openTabGroup(g) {
  const first = TAB_GROUP_FIRST[g];
  if (first) switchTab(first);
  else setTabGroup(g);
}
function closeHudMenu() {
  const m = document.getElementById('hud-menu');
  if (m) m.classList.add('hidden');
}
function toggleHudMenu(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('hud-menu');
  if (!m) return;
  m.classList.toggle('hidden');
}
document.addEventListener('click', closeHudMenu);
function switchTab(name) {
  activeTab = name;
  if (TAB_GROUP[name]) setTabGroup(TAB_GROUP[name]);
  bagTipPinned = false;
  hideEquipTooltip();
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'map') renderMapTab();
  if (name === 'autobattle') renderAutoBattleTab();
  if (name === 'skills') renderSkillsTab();
  if (name === 'equip') renderEquipTab();
  if (name === 'inventory') renderInventoryTab();
  if (name === 'jobtree') renderJobTree();
  if (name === 'character') renderCharacterTab();
  if (name === 'codex') renderCodexTab();
  if (name === 'achievements') renderAchievementsTab();
  if (name === 'attendance') renderAttendanceTab();
  if (name === 'quests') renderQuestsTab();
  if (name === 'pets') renderPetsTab();
}

function pct(a, b) { return Math.max(0, Math.min(100, (a / b) * 100)); }
function expPctLabel(cur, need) {
  if (!(need > 0)) return '100.00';
  const p = Math.max(0, Math.min(100, (cur || 0) / need * 100));
  return p.toFixed(2);
}

function renderTopBar() {
  const job = currentJob();
  const bCap = state.baseLevel >= baseLevelCapOf();
  const jCap = state.jobLevel >= job.jobLevelMax;
  const bPct = bCap ? '100.00' : expPctLabel(state.baseExp, expToNextBaseLevel(state.baseLevel));
  const jPct = jCap ? '100.00' : expPctLabel(state.jobExp, expToNextJobLevel(state.jobLevel, job.tier));
  document.getElementById('hud-name').textContent = state.name;
  document.getElementById('hud-job').textContent = `${job.name} Lv. ${state.baseLevel} ( ${bPct}% ) / JLv. ${state.jobLevel} (${jPct}%)`;
  document.getElementById('hud-gold').textContent = `Zeny : ${Number(state.gold || 0).toLocaleString()}`;
  paintHudBar('hud-hp-bar', 'hud-hp-text', 'hud-hp-pct', state.hp, state.maxHp);
  paintHudBar('hud-sp-bar', 'hud-sp-text', 'hud-sp-pct', state.sp, state.maxSp);

  const jobBtn = document.getElementById('btn-jobchange-alert');
  const canAny = job.next.some(canJobChange);
  jobBtn.classList.toggle('hidden', !canAny);

  // 玩家身上的異常狀態圖示：掛在 HP 條旁邊，沒有狀態時整塊不佔位
  const ailEl = document.getElementById('hud-ail');
  if (ailEl && typeof playerAilList === 'function') {
    let html = playerAilList()
      .map(t => `<span title="${PLAYER_AILMENTS[t].name}">${PLAYER_AILMENTS[t].icon}</span>`).join('');
    // 臨時減益（挑釁／緩緩移動／永恆之光）跟異常狀態同一排，但標成另一種底色
    if (typeof pDebuffList === 'function') {
      html += pDebuffList().map(k => {
        const v = pDebuff(k);
        const unit = k === 'fleeFlat' ? '' : '%';
        return `<span class="p-debuff" title="${PLAYER_DEBUFF_META[k].name} ${v > 0 ? '+' : ''}${v}${unit}">${PLAYER_DEBUFF_META[k].icon}</span>`;
      }).join('');
    }
    /* 武僧的氣球體（#70）：掛在同一排。這是玩家唯一看得到「還差幾顆」的地方——
       爆氣、金剛不壞、阿修羅霸凰拳都靠它，沒有指示器的話整套系統是黑箱。
       沒點蓄氣的職業 spiritsMax 是 0，整塊不出現。 */
    if (state.spiritsMax > 0) {
      const have = Math.min(state.spirits || 0, state.spiritsMax);
      html += `<span class="p-debuff" title="氣球體 ${have}/${state.spiritsMax}">`
        + '🔵'.repeat(have) + '⚪'.repeat(state.spiritsMax - have) + '</span>';
    }
    if (ailEl.innerHTML !== html) ailEl.innerHTML = html;
  }
}

function paintHudBar(barId, textId, pctId, val, max) {
  const m = Math.max(0, max || 0);
  const v = Math.max(0, Math.floor(val || 0));
  const p = m > 0 ? Math.max(0, Math.min(100, v / m * 100)) : 0;
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  const pctEl = document.getElementById(pctId);
  if (bar) {
    bar.style.width = p + '%';
    bar.classList.toggle('low', p < 25);
  }
  if (text) text.textContent = `${v} / ${Math.floor(m)}`;
  if (pctEl) pctEl.textContent = `${Math.round(p)}%`;
}
function setBar(barId, textId, val, max, label) {
  document.getElementById(barId).style.width = pct(val, max) + '%';
  document.getElementById(textId).textContent = `${label} ${Math.max(0, Math.floor(val))}/${Math.floor(max)}`;
}

// 根據職業+性別更新玩家圖片與攻擊動畫
let animTimer = null;
let animFrameIdx = 0;
let animFrameImages = {};   // { key: Image[] }
let animFramesLoaded = {};  // { key: boolean }
let animating = false;
let animCanvas = null;
let animCanvasCtx = null;
let currentAnimKey = null;
/* 目前這個角色「該有」的普攻動作 key。currentAnimKey 播施放姿勢時會暫時指到別組，
   所以判斷「圖需不需要換」一律看這個，不然施放到一半會被 updatePlayerSprite 打斷。 */
let baseAnimKey = null;

/* 騎乘圖（#73）：拿槍就換一組騎在坐騎上的動作。
   官方能騎大嘴鳥的本來就只有騎士線與十字軍線，所以只列這幾個職業。
   值是「去借誰的圖」——騎士與十字軍本體沒有畫騎乘圖，借騎士領主那組大嘴鳥；
   皇家禁衛隊那組騎的是獅鷲不是大嘴鳥，所以沒讓十字軍借它。
   哪天補了專屬的圖，把值改成自己的職業 id 就好，其餘不用動。 */
const MOUNT_SPRITE_JOBS = {
  knight:     'lordknight',
  crusader:   'lordknight',
  lordknight: 'lordknight',
  paladin:    'lordknight',
  runeknight: 'runeknight',
  royalguard: 'royalguard',
};
const MOUNT_WEAPON_CATS = ['spear1', 'spear2'];

/* 沒有自己的圖、直接借別人的職業。超級新手官方本來就是穿新手服的，借新手那組剛好。
   沒列在這裡又沒有圖的職業會退回 player_swordsman.svg 那張靜圖。 */
const SPRITE_ALIAS = { supernovice: 'novice' };
/* 三轉的立繪（#111 → #119）。

   #111 當時 `images/frames/` 底下一張三轉的圖都沒有，所以整批借母職的
   （不借會退回 player_swordsman.svg 那張靜圖，盧恩騎士長得像新手劍士）。
   2026-08-18 使用者把十二個三轉的圖補齊了，那條「全部借母職」的規則
   **反而會壓過新圖**——別名優先於同名資料夾。

   十三個三轉現在**全部有自己的圖**（漂流者是 wanderer_female——
   那條線官方就是女性專屬，`genderLock: 'female'`，本來就沒有男版），
   所以整條規則直接拿掉，不留白名單。

   之後若新增沒有圖的職業，在上面那張 SPRITE_ALIAS 手動補一筆就好。 */

// 現在該不該播騎乘圖？回傳要借哪個職業的圖，沒有就 null
function mountSpriteJobFor(jobId) {
  const src = MOUNT_SPRITE_JOBS[jobId];
  if (!src) return null;
  if (typeof aspdCategoryOf !== 'function') return null;
  const cat = aspdCategoryOf(getEquipBaseItemId('weapon'));
  return MOUNT_WEAPON_CATS.includes(cat) ? src : null;
}

function getAnimKey() {
  const job = currentJob();
  const gender = (state && state.gender) || 'male';
  const mount = mountSpriteJobFor(job.id);
  if (mount) return `${mount}_${gender}_mount`;
  return `${SPRITE_ALIAS[job.id] || job.id}_${gender}`;
}

function updatePlayerSprite() {
  const img = document.getElementById('player-img');
  if (!img) return;
  /* 紙娃娃在場時這張靜圖必須保持隱藏。
     載圖的 Promise 若在紙娃娃起來之後才回來，會把 display 清掉，
     player_swordsman.svg 就疊在紙娃娃後面。 */
  if (bfPaper || bfPlayerSheet) {
    img.style.display = 'none';
    if (animCanvas) animCanvas.style.display = 'none';
    return;
  }
  const key = getAnimKey();

  /* 已經在播這一組就什麼都不做。
     這個 early return 是換武器能即時換圖的前提——有了它這個函式才便宜到可以每個
     tick 呼叫（見 onTickUI），不然得在每一個會動到裝備的地方各補一次呼叫，
     而自動裝備、賣掉身上的裝備那些路徑遲早會漏掉一條。 */
  if (key === baseAnimKey && animCanvas && animCanvas.style.display !== 'none') return;
  if (bfPlayerSheet) return;

  if (animFramesLoaded[key]) {
    showAnimCanvas(key);
    return;
  }
  if (animFramesLoaded[key] === false) {
    if (animCanvas) animCanvas.style.display = 'none';
    img.style.display = '';
    img.src = 'images/player_swordsman.svg';
    return;
  }
  loadAnimFrames(key).then(() => {
    if (bfPaper || bfPlayerSheet) {
      img.style.display = 'none';
      if (animCanvas) animCanvas.style.display = 'none';
      return;
    }
    if (animFrameImages[key] && animFrameImages[key].length) {
      showAnimCanvas(key);
    } else {
      if (animCanvas) animCanvas.style.display = 'none';
      img.style.display = '';
      img.src = 'images/player_swordsman.svg';
    }
  });
  img.style.display = '';
  img.src = 'images/player_swordsman.svg';
}

/* 立繪的顯示尺寸。

   **不能照圖檔尺寸縮放**：領主騎士的 frame_000 是 175×170，_skill 只有 62×99，
   但兩張圖裡的**人**都是 91~92 px 高——差別全在留白。舊版把畫布 CSS 寫死
   120×160、兩種圖都拉去填滿，結果基本姿勢的人縮到 87px、施放姿勢卻放大到 147px，
   一放技能角色就整個大一號（使用者 2026-08-15 回報）。

   改成量**非透明像素的邊界框**，把「人」統一縮放到 SPRITE_CHAR_H 這麼高，
   再用邊界框把畫布擺成「腳底貼著框底、身體置中」。留白多少都不影響。
   一個 key 只量一次（讀一次 pixel），存進 spriteMetrics 快取。 */
/* 目標身高。舊版（沒有這套縮放）的基本姿勢實際畫出來是 87px，
   設 100 的話整體比原本大一號，使用者 2026-08-15 仍反映技能動畫太大——
   壓回 84，跟改動前的基本姿勢差不多，施放姿勢也跟著對齊。 */
const SPRITE_BOX_W = 120;
/* 立繪身高的基準值，以及玩家可調的百分比（#89）。

   「太大／太小」是主觀的，而且同一組動作裡的落差本來就大，我改了三輪都還在猜。
   拉出來變成一支滑桿，玩家自己拉到順眼為止。改動時要清掉 spriteMetrics
   讓每個 key 重新量一次，不然舊的倍率會留著。 */
const SPRITE_CHAR_H_BASE = 84;
/* 戰場上的紙娃娃。跟隊友同一身高，避免主角特別大。 */
const BATTLE_CHAR_H = Math.round(150 * 0.75 * 0.75 * 0.82);
function spriteScalePct() {
  const s = (typeof allyOwnerState === 'function') ? allyOwnerState() : state;
  return (s && s.spriteScalePct != null) ? s.spriteScalePct : 100;
}
function spriteCharH() { return SPRITE_CHAR_H_BASE; }
/* 直接縮放 `#player-sprite` 這個外框，而不是去改畫布的 CSS 尺寸。

   前一版是重新量邊界框、重算畫布尺寸——在我這邊實測有效（155px→233px），
   但使用者那邊只有隊友會動、玩家完全沒反應。隊友走的是外框的
   `transform: scale()`，那條路徑他看得到效果，所以玩家也改走同一條。
   外框縮放不管裡面是畫布還是 <img> 都會跟著縮，沒有「量不到就失效」的問題。

   **隊友維持原本大小**（使用者說 100% 剛好），這支滑桿只管玩家。 */
/* 施放姿勢另外一支倍率（#90）。

   量到的數字兩種姿勢是**一樣的**（都是 84px）：
     基本 lordknight_male       邊界框 69×92 → 倍率 0.913 → 84px
     施放 lordknight_male_skill 邊界框 54×91 → 倍率 0.923 → 84px
   但**邊界框裡裝的東西不一樣**：基本姿勢那 92px 含了垂下來的劍，身體只佔一部分；
   施放姿勢那 91px 幾乎全是身體。照邊界框對齊，施放時的「人」就會顯得比較大。
   這件事量不出來（要知道身體佔多少才行），所以拉成一支獨立的滑桿。 */
/* **每個職業各記一份**。合適的倍率跟美術怎麼畫有關，不同職業差很多——
   使用者實測：領主騎士 55% 才剛好、十字刺客要 80%。一支全域滑桿蓋不住。
   拉滑桿時存的是「目前這個職業」的值，換職業就換一組。 */
const SKILL_SPRITE_SCALE_DEFAULT = { lordknight: 55, assassincross: 80 };
const SKILL_SPRITE_SCALE_FALLBACK = 85;
function skillSpriteScalePct() {
  const s = (typeof allyOwnerState === 'function') ? allyOwnerState() : state;
  if (!s) return SKILL_SPRITE_SCALE_FALLBACK;
  const job = s.jobId || '';
  const map = s.skillSpriteScaleByJob;
  if (map && map[job] != null) return map[job];
  return SKILL_SPRITE_SCALE_DEFAULT[job] != null ? SKILL_SPRITE_SCALE_DEFAULT[job] : SKILL_SPRITE_SCALE_FALLBACK;
}
function setSkillSpriteScalePct(val) {
  const s = (typeof allyOwnerState === 'function') ? allyOwnerState() : state;
  if (!s.skillSpriteScaleByJob) s.skillSpriteScaleByJob = {};
  s.skillSpriteScaleByJob[s.jobId || ''] = Math.max(50, Math.min(150, Math.round(val)));
  const t = document.getElementById('skill-scale-text');
  if (t) t.textContent = skillSpriteScalePct() + '%';
  applySpriteScale();
  saveGame();
}
// 換職業時把滑桿撥到那個職業記住的值
function syncSkillScaleSlider() {
  const sl = document.getElementById('skill-scale');
  const t = document.getElementById('skill-scale-text');
  const v = skillSpriteScalePct();
  if (sl && sl.value !== String(v)) sl.value = v;
  if (t) t.textContent = v + '%';
}
function applySpriteScale() {
  const el = document.getElementById('player-sprite');
  if (!el) return;
  // 施放中再乘一次施放姿勢的倍率
  const r = (spriteScalePct() / 100) * (castingAnim ? skillSpriteScalePct() / 100 : 1);
  el.style.transform = 'scale(' + r.toFixed(3) + ')';
  el.style.transformOrigin = 'bottom center';
}
function setSpriteScalePct(val) {
  const s = (typeof allyOwnerState === 'function') ? allyOwnerState() : state;
  s.spriteScalePct = Math.max(50, Math.min(150, Math.round(val)));
  const t = document.getElementById('sprite-scale-text');
  if (t) t.textContent = s.spriteScalePct + '%';
  applySpriteScale();
  saveGame();
}
const spriteMetrics = {};
function frameBBox(frame) {
  const c = document.createElement('canvas');
  c.width = frame.naturalWidth; c.height = frame.naturalHeight;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(frame, 0, 0);
  let d;
  /* 讀不到像素時**退回「整張圖就是邊界框」**，不要回 null（#124）。

     `file://`（單機版雙擊 index.html 就是這個）底下，本地圖片會把 canvas 汙染，
     `getImageData` 直接丟 SecurityError。以前回 null 會一路傳到 sizeAnimCanvas，
     那邊的保底是「填滿整個框、固定 160px」——立繪會變形又對不準位置，
     使用者回報的「動畫定位不正確」就是這個。

     這些圖本來就是裁緊的（例：107×87 的圖裡人就佔 87px 高），
     拿整張圖當邊界框只會差一點邊距，比整個排版垮掉好得多。 */
  const whole = { x0: 0, y0: 0, bw: c.width, bh: c.height, cw: c.width, ch: c.height };
  try { d = cx.getImageData(0, 0, c.width, c.height).data; } catch (e) { return whole; }
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return whole;   // 整張全透明：同上，別讓它變成 null
  return { x0, y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1, cw: c.width, ch: c.height };
}
/* 倍率與對齊**整組共用一份，不逐格算**（#125）。

   同一個 key 的每一格 PNG 都是同尺寸畫布（領主騎士 9 格全是 175×170，
   祭司 9 格全是 91×100），美術已經把人在畫布裡對齊好了——
   **畫布本身就是正確的對位基準**。

   逐格量邊界框再把畫布拉回置中，等於把美術畫的位移抵銷掉，還會反過來製造抖動：
   領主騎士 frame_004 舉劍那格，邊界框中心右移 60px、框高 92→161，
   逐格算的話那一格會突然縮小 32%、左右跳 40px、上下跳 22px，下一格又跳回來。
   全庫 138 組裡有 106 組的邊界框中心位移超過 8px——所以是「每個職業都會亂動」。

   為什麼單機版看不到：`file://` 底下本地圖片會汙染 canvas，`getImageData` 丟
   SecurityError，frameBBox 直接回「整張畫布」，逐格那條路根本沒跑到。
   只有 http://（GitHub Pages）才量得到真的邊界框，也才會抖。

   邊界框留下來只做兩件事，而且**只看待機格**：
     · 把「人」統一縮到 SPRITE_CHAR_H 高（留白多少不影響）
     · 算出腳底與身體中心，把畫布擺成「腳貼框底、身體置中」
   格與格之間的位移交還給美術。 */
const SPRITE_BOX_H = 160;
function measureSprite(key, frame) {
  if (spriteMetrics[key] || !frame || !frame.naturalWidth) return spriteMetrics[key];
  const b = frameBBox(frame);
  if (!b) return null;
  // 整張畫布不超過立繪框，免得留白特別多的素材整個爆出去
  let scale = Math.min(spriteCharH() / b.bh, SPRITE_BOX_H / b.ch);
  /* 施放姿勢**直接沿用基本姿勢算出來的畫面身高**。
     各自算的話會差一截：領主騎士基本姿勢是 175×170、施放姿勢只有 62×99，
     兩張圖的留白比例不同，同一個人一放技能就大一號。 */
  const baseKey = key.endsWith('_skill') ? key.slice(0, -6) : null;
  const bm = baseKey ? spriteMetrics[baseKey] : null;
  if (bm) scale = (bm.bh * bm.scale) / b.bh;
  spriteMetrics[key] = { scale, x0: b.x0, y0: b.y0, bw: b.bw, bh: b.bh, cw: b.cw, ch: b.ch };
  return spriteMetrics[key];
}
/* 一組動作只排版一次。逐格重排的話每禎要寫四個 CSS 長度又重設 canvas.width
   （重設會清空畫布），而算出來的值完全一樣。 */
let animSizedKey = '';
function sizeAnimCanvas(key, frame) {
  if (!animCanvas || !frame) return;
  if (animCanvas.width !== frame.naturalWidth || animCanvas.height !== frame.naturalHeight) {
    animCanvas.width = frame.naturalWidth;
    animCanvas.height = frame.naturalHeight;
  }
  if (animSizedKey === key) return;
  const m = measureSprite(key, frame);
  if (!m) {   // 量不到（圖還沒載完之類）就退回填滿整個框，下一禎再試
    animCanvas.style.width = SPRITE_BOX_W + 'px';
    animCanvas.style.height = SPRITE_BOX_H + 'px';
    animCanvas.style.left = '50%'; animCanvas.style.bottom = '0';
    animCanvas.style.marginLeft = -(SPRITE_BOX_W / 2) + 'px';
    return;
  }
  animSizedKey = key;
  const sc = m.scale;
  animCanvas.style.width = Math.round(m.cw * sc) + 'px';
  animCanvas.style.height = Math.round(m.ch * sc) + 'px';
  // 待機格的人：水平中心對齊框中心、腳底對齊框底。整組沿用，格與格之間不再動
  animCanvas.style.left = '50%';
  animCanvas.style.marginLeft = -Math.round((m.x0 + m.bw / 2) * sc) + 'px';
  animCanvas.style.bottom = -Math.round((m.ch - m.y0 - m.bh) * sc) + 'px';
}

function showAnimCanvas(key) {
  const img = document.getElementById('player-img');
  if (!img) return;
  const frames = animFrameImages[key];
  if (!frames || !frames.length) return;
  img.style.display = 'none';
  if (!animCanvas) {
    animCanvas = document.createElement('canvas');
    animCanvas.className = 'player-anim-canvas';
    img.parentNode.insertBefore(animCanvas, img);
  }
  animCanvas.style.display = '';
  sizeAnimCanvas(key, frames[0]);
  animCanvasCtx = animCanvas.getContext('2d');
  stopCastAnim();               // 換職業／換武器時把播到一半的施放動作收掉
  currentAnimKey = key;
  baseAnimKey = key;
  animFrameIdx = 0;
  drawAnimFrame();
  loadAnimFrames(key + '_skill');   // 施放姿勢先預載，免得第一次放技能時來不及
}

function drawAnimFrame() {
  if (!animCanvasCtx || !currentAnimKey) return;
  const frames = animFrameImages[currentAnimKey];
  if (!frames || !frames.length) return;
  const idx = Math.min(animFrameIdx, frames.length - 1);
  // 排版整組共用，換 key 才真的重算（見 sizeAnimCanvas）
  sizeAnimCanvas(currentAnimKey, frames[idx]);
  animCanvasCtx = animCanvas.getContext('2d');
  animCanvasCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
  animCanvasCtx.drawImage(frames[idx], 0, 0);
}

async function loadAnimFrames(key) {
  if (key in animFramesLoaded) return;
  animFramesLoaded[key] = false;
  const promises = [];
  for (let i = 0; i < 20; i++) {
    const src = `images/frames/${key}/frame_${String(i).padStart(3, '0')}.png`;
    promises.push(new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    }));
  }
  const results = await Promise.all(promises);
  animFrameImages[key] = results.filter(Boolean);
  animFramesLoaded[key] = animFrameImages[key].length > 0;
}

function playAttackAnim() {
  if (castingAnim) return;
  if (playPlayerSheetAttack()) return;
  if (!currentAnimKey || !animFrameImages[currentAnimKey] || !animFrameImages[currentAnimKey].length) return;
  stopAnim();
  animating = true;
  animFrameIdx = 0;
  drawAnimFrame();
  const frames = animFrameImages[currentAnimKey];
  const interval = (state.attackInterval || 1000) / frames.length;
  animTimer = setInterval(() => {
    animFrameIdx++;
    if (animFrameIdx >= frames.length) {
      stopAnim();
      animFrameIdx = 0;
      drawAnimFrame();
      animating = false;
      return;
    }
    drawAnimFrame();
  }, interval);
}

function stopAnim() {
  if (animTimer) { clearInterval(animTimer); animTimer = null; }
}

/* ---------------- 施放姿勢動畫（#73） ----------------
   images/frames/<普攻的 key>_skill/ 底下有圖的職業，放技能時把主畫布切過去播一次，
   播完切回普攻那組的第一格。沒有圖的職業（載進來是空陣列）整段不作用，普攻照舊。
   騎乘中放技能會找 <職業>_<性別>_mount_skill，跟普攻的 key 是同一套規則接後綴。

   施放中再收到一次施放不重播：卡片與被動觸發的技能是「免費施放」，
   武僧那種連段一輪能觸發好幾次，每次都重播的話姿勢會一直卡在第一格抖動。 */
/* 施放姿勢的總播放時間。600ms 太長——攻速快的時候整段動作把普攻動畫吃光
   （playAttackAnim 遇到 castingAnim 會直接 return），看起來像卡住。
   使用者 2026-08-15 指定壓到 0.1~0.3 秒。 */
const SKILL_ANIM_MS = 250;
let castAnimTimer = null;
let castingAnim = false;

function playSkillCastAnim() {
  if (castingAnim) return;
  if (!animCanvas || !animCanvasCtx || animCanvas.style.display === 'none') return;
  const backTo = baseAnimKey;
  if (!backTo) return;
  const key = backTo + '_skill';
  const frames = animFrameImages[key];
  if (!frames || !frames.length) return;

  stopAnim();
  animating = false;
  castingAnim = true;
  currentAnimKey = key;
  sizeAnimCanvas(key, frames[0]);   // 照邊界框縮放，不要拉去填滿整個框
  animFrameIdx = 0;
  drawAnimFrame();
  applySpriteScale();               // 施放姿勢有自己的倍率

  castAnimTimer = setInterval(() => {
    animFrameIdx++;
    if (animFrameIdx >= frames.length) { restoreAfterCastAnim(backTo); return; }
    drawAnimFrame();
  }, SKILL_ANIM_MS / frames.length);
}

function restoreAfterCastAnim(backTo) {
  if (castAnimTimer) { clearInterval(castAnimTimer); castAnimTimer = null; }
  castingAnim = false;
  const frames = animFrameImages[backTo];
  if (!frames || !frames.length || !animCanvas) return;
  currentAnimKey = backTo;
  sizeAnimCanvas(backTo, frames[0]);
  animFrameIdx = 0;
  drawAnimFrame();
  applySpriteScale();               // 收掉施放姿勢的倍率
}

// 換職業／換武器時呼叫：不還原畫布（呼叫端馬上就要自己重設），只把計時器收乾淨
function stopCastAnim() {
  if (castAnimTimer) { clearInterval(castAnimTimer); castAnimTimer = null; }
  castingAnim = false;
  syncSkillScaleSlider();
  applySpriteScale();
}

/* ---------------- 技能特效 ----------------
   一招一組設定：施放瞬間疊一張詠唱姿勢的圖，效果持續中則讓角色本體發光。
   sprite 只有騎士男女兩張，所以要限定職業；別的職業學到同名技能也不會誤用。
   光芒本身跟 sprite 無關，是掛在 .player-sprite 上的 CSS class，
   讀存檔進來時 buff 還在的話也會自動亮起來（靠 onTickUI 每 tick 對齊）。
------------------------------------------------- */
const SKILL_FX = {
  twohandquicken: {
    jobs: ['knight'],
    sprite: gender => `images/effects/twohandquicken/knight_${gender}.png`,
    spriteMs: 900,
    auraClass: 'aura-quicken',
  },
};

// 先預載，免得第一次施放時圖還沒到、閃一下才出現
Object.values(SKILL_FX).forEach(fx => {
  if (!fx.sprite) return;
  ['male', 'female'].forEach(g => { const im = new Image(); im.src = fx.sprite(g); });
});

function skillFxFor(skillId) {
  const fx = SKILL_FX[skillId];
  if (!fx) return null;
  if (fx.jobs && !fx.jobs.includes(state.jobId)) return null;
  return fx;
}

/* 施放瞬間：在角色身上疊一張詠唱姿勢，播完自己移除。由 castSkill() 呼叫。 */
/* 哪些技能會擺出「施放姿勢」（#100）。

   物理傷害技能**不播** —— 那些立繪畫的是揮劍、突刺、踢擊，本來就是攻擊動作的一部分，
   再切一次施放姿勢會變成「舉手唸咒然後才砍下去」，節奏整個斷掉。
   魔法與輔助技才播：那些本來就該有一個唸咒／祈禱的動作。
   使用者 2026-08-15 指定。 */
const CAST_ANIM_SKIP_TYPES = ['damage', 'damage_multihit', 'damage_multi', 'damage_aoe',
  'field_phys_aoe', 'dot', 'poison_proc', 'special_charge', 'passive'];
function skillPlaysCastAnim(sk) {
  return !!sk && !CAST_ANIM_SKIP_TYPES.includes(sk.type);
}

function showSkillCastEffect(sk) {
  if (!sk) return;
  if (skillPlaysCastAnim(sk)) playSkillCastAnim();   // 職業共用的施放姿勢，不分技能
  const fx = skillFxFor(sk.id);
  if (!fx || !fx.sprite) return;
  const host = document.getElementById('player-sprite');
  if (!host) return;
  // 連續施放時只留最新一張，不要疊成一團
  host.querySelectorAll('.skill-cast-sprite').forEach(el => el.remove());
  const img = document.createElement('img');
  img.className = 'skill-cast-sprite';
  img.src = fx.sprite((state && state.gender) || 'male');
  img.alt = '';
  host.appendChild(img);
  setTimeout(() => img.remove(), fx.spriteMs);
}

/* 持續時間內的光芒：每個 tick 對照 buff 是否還在，決定 class 加或拿掉。
   比對 skillId 而不是 buff type——攻速藥水也是 type:'aspd'，比 type 會讓喝藥也發光。 */
function updateSkillAura() {
  const host = document.getElementById('player-sprite');
  if (!host || !state) return;
  Object.keys(SKILL_FX).forEach(skillId => {
    const fx = SKILL_FX[skillId];
    if (!fx.auraClass) return;
    const on = !!skillFxFor(skillId) && state.buffs.some(b => b.skillId === skillId);
    host.classList.toggle(fx.auraClass, on);
  });
}

/* ---------------- 音效 ----------------
   WAV/ 底下分四個資料夾：
     物理攻擊揮空 — 每次普攻都放，依裝備的武器種類挑檔
     物理攻擊命中 — 真的打中才放，同樣依武器種類
     魔法傷害     — 依技能挑；火箭術／冰箭術／雷擊術照技能等級連放同樣次數（Lv10 響 10 下）
     異常狀態     — 中毒／暈眩／沉默

   同一個音效可能連續觸發（箭術連放、AoE 一次打好幾隻），
   單一個 Audio 元素會互相打斷，所以每個檔案開一個小的輪替池。
------------------------------------------------- */
/* 資料夾名稱是中文，**路徑的每一段都要編碼**（#124）。

   以前只有 `sfxUrl()` 編了檔名、資料夾維持原文，而暴擊那條是寫死的
   `'WAV/' + encodeURIComponent('爆擊') + '/Critical.ogg'`——只有它編了資料夾。
   結果就是**只有暴擊有聲音**：http 伺服器多半會自己把原文 UTF-8 補上編碼，
   但 `file://`（單機版就是雙擊 index.html 打開的）不會，那四個資料夾整批 404。 */
const enc = seg => encodeURIComponent(seg);
const SFX_DIR_SWING = 'WAV/' + enc('物理攻擊揮空') + '/';
const SFX_DIR_HIT = 'WAV/' + enc('物理攻擊命中') + '/';
const SFX_DIR_MAGIC = 'WAV/' + enc('魔法傷害') + '/';
const SFX_DIR_STATUS = 'WAV/' + enc('異常狀態') + '/';

// 武器分類（aspdCategoryOf 的回傳值）→ 揮空／命中要放哪個檔
// 揮空 null 代表那個分類沒有對應的檔（空手、拳套、槍械），只放命中音
const SFX_WEAPON = {
  bare:       { swing: null,     hit: ['_hit_fist1', '_hit_fist2', '_hit_fist3', '_hit_fist4'] },
  knuckle:    { swing: null,     hit: ['_hit_fist1', '_hit_fist2', '_hit_fist3', '_hit_fist4'] },
  dagger:     { swing: '_attack_dagger', hit: '_hit_dagger' },
  katar:      { swing: '_attack_katar',  hit: '_hit_mace' },
  sword1:     { swing: '_attack_sword',  hit: '_hit_sword' },
  sword2:     { swing: '_attack_sword',  hit: '_hit_sword' },
  axe1:       { swing: '_attack_axe',    hit: '_hit_axe' },
  axe2:       { swing: '_attack_axe',    hit: '_hit_axe' },
  spear1:     { swing: '_attack_spear',  hit: '_hit_spear' },
  spear2:     { swing: '_attack_spear',  hit: '_hit_spear' },
  mace:       { swing: '_attack_mace',   hit: '_hit_mace' },
  rod1:       { swing: '_attack_rod',    hit: '_hit_rod' },
  rod2:       { swing: '_attack_rod',    hit: '_hit_rod' },
  book:       { swing: '_attack_book',   hit: '_hit_rod' },
  bow:        { swing: '_attack_bow',    hit: '_hit_arrow' },
  // 樂器與鞭沒有專屬音效，借用法杖那組（一樣是揮舞手持物的悶聲）
  instrument: { swing: '_attack_rod',    hit: '_hit_rod' },
  whip:       { swing: '_attack_rod',    hit: '_hit_rod' },
  // 槍械：本作目前沒有這類武器，音檔先對好，之後加槍手職業就直接有聲音
  pistol:     { swing: null, hit: '_hit_手槍' },
  rifle:      { swing: null, hit: '_hit_步槍' },
  shotgun:    { swing: null, hit: '_hit_霰彈槍' },
  gatling:    { swing: null, hit: '_hit_格林機槍單發' },
  grenade:    { swing: null, hit: '_hit_榴彈發射器' },
};

// 三系箭術有專屬音效，而且要照等級連放（官方本來就是打幾發）
const SFX_MAGIC_BOLT = { firebolt: '火箭術', coldbolt: '冰箭術', lightningbolt: '雷擊術' };
const SFX_BOLT_GAP_MS = 130;
// 其餘法術照屬性分
const SFX_MAGIC_BY_ELEMENT = { fire: '其餘火系', water: '其餘冰系', wind: '其餘雷系', earth: '石系' };
const SFX_MAGIC_TYPES = ['magic', 'magic_aoe', 'field_aoe_magic'];
const SFX_HEAL_TYPES = ['heal', 'heal_over_time', 'field_heal'];

/* 有專屬音檔的技能。放在 WAV/技能/ 底下，檔名直接寫死對應，
   跟三系箭術那組不同——這裡是一招一個檔，不照等級連放。 */
const SFX_SKILL = {
  twohandquicken: 'WAV/' + encodeURIComponent('技能') + '/knight_twohandquicken.wav',
};

const SFX_STATUS = { poison: '中毒', stun: '暈眩', silence: '沉默' };
const SFX_STATUS_GAP_MS = 300;   // AoE 一次讓好幾隻中毒/暈眩，不要疊成噪音

const SFX_POOL_SIZE = 4;
const _sfxPools = {};
const _sfxLastPlayed = {};

function sfxVolume() { return state && state.sfxVolume != null ? state.sfxVolume : 0.5; }
/* 隊友的音效走同一組音檔，但音量獨立（#87）。兩名隊友加上玩家一起打，
   全部同音量會吵到聽不出自己在做什麼；預設壓到主音量的一半，可以調也可以關。

   **設定要讀玩家那份 state**：這支是在換身期間被呼叫的，直接讀 `state`
   拿到的是隊友快照——快照裡是雇傭當下拷貝的舊音量，而且面板改的設定
   寫在玩家身上，隊友那份永遠不會變（實測不管怎麼調都固定 0.25）。 */
function allyOwner() {
  return (typeof allyOwnerState === 'function') ? allyOwnerState() : state;
}
function allySfxVolume() {
  const s = allyOwner();
  if (!s || s.allySfxOff) return 0;
  const base = s.sfxVolume != null ? s.sfxVolume : 0.5;
  const r = s.allySfxRatio != null ? s.allySfxRatio : 0.5;
  return base * r;
}
function setAllySfxRatio(val) {
  const s = allyOwner();
  s.allySfxRatio = Math.max(0, Math.min(1, val / 100));
  const t = document.getElementById('vol-ally-text');
  if (t) t.textContent = Math.round(s.allySfxRatio * 100) + '%';
  saveGame();
}
function setAllySfxOff(v) { allyOwner().allySfxOff = !!v; saveGame(); }

/* url 直接播。minGapMs 是同一個音效的最短間隔，用來擋 AoE 的連珠炮。*/
function playSfx(url, minGapMs) {
  if (!url) return;
  if (state && state.muted) return;
  if (typeof _allyActing !== 'undefined' && _allyActing && allySfxVolume() <= 0) return;
  const now = Date.now();
  if (minGapMs && now - (_sfxLastPlayed[url] || 0) < minGapMs) return;
  _sfxLastPlayed[url] = now;

  let pool = _sfxPools[url];
  if (!pool) {
    pool = _sfxPools[url] = { list: [], next: 0 };
    for (let i = 0; i < SFX_POOL_SIZE; i++) pool.list.push(new Audio(url));
  }
  const a = pool.list[pool.next];
  pool.next = (pool.next + 1) % SFX_POOL_SIZE;
  // 換身中（隊友在打）走隊友自己的音量
  a.volume = (typeof _allyActing !== 'undefined' && _allyActing) ? allySfxVolume() : sfxVolume();
  try { a.currentTime = 0; } catch (e) { /* 還沒載完就不用倒帶 */ }
  a.play().catch(() => {});
}

// 檔名有中文，路徑要編碼過再交給 Audio
function sfxUrl(dir, name) { return dir + encodeURIComponent(name) + '.wav'; }

/* ---- 事件音效（#146）----
   升級、精煉成功、打贏 MVP、進遊戲各一段。

   檔名刻意用**英文**：既有那四個資料夾是中文名，而 `file://`（單機版就是雙擊
   index.html 打開的）不會自己補 URL 編碼，當初整批 404 過一次，
   註解就寫在上面 SFX_DIR_* 那一段。英文路徑不必編碼，也就沒有那個坑。

   走 playSfx()，所以靜音開關與音效音量都是現成的。
   minGap 是為了擋連發：一次 gainExp 可能連升好幾級（離線回來尤其），
   精煉連點也一樣，不擋的話會變成一串疊在一起的爆音。 */
const SFX_EVENT = {
  levelup: { file: 'levelup.ogg', gap: 1200 },
  refine: { file: 'refine_success.ogg', gap: 400 },
  mvp: { file: 'mvp_victory.ogg', gap: 2000 },
  login: { file: 'login.ogg', gap: 0 },
};
function playEventSfx(kind) {
  const e = SFX_EVENT[kind];
  if (!e) return;
  // 隊友換身期間不播：升級的是隊友的快照，玩家沒升級卻聽到升級聲會很莫名
  if (typeof _allyActing !== 'undefined' && _allyActing) return;
  playSfx('WAV/event/' + e.file, e.gap);
}

function currentWeaponSfx() {
  const cat = typeof aspdCategoryOf === 'function' ? aspdCategoryOf(getEquipBaseItemId('weapon')) : 'bare';
  return SFX_WEAPON[cat] || SFX_WEAPON.bare;
}
function pickSfxName(v) { return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v; }

/* 揮空：被閃過去的時候放（空手／拳套／槍械沒有對應的檔，那就不出聲）。
   這兩個都不設最短間隔——二刀連擊的第二段是緊接著的，設了就會被吃掉，
   聽起來只剩一下。攻擊本身有攻速間隔擋著，不會變成連珠炮。 */
function playAttackSound() {
  const name = pickSfxName(currentWeaponSfx().swing);
  if (name) playSfx(sfxUrl(SFX_DIR_SWING, name));
}

/* 命中：真的打進去才放。暴擊時整個換成 Critical.ogg，不放武器的命中音——
   暴擊本來就該聽起來跟普通一下不一樣。 */
const SFX_CRIT_URL = 'WAV/' + encodeURIComponent('爆擊') + '/Critical.ogg';
function playHitSound(isCrit) {
  if (isCrit) { playSfx(SFX_CRIT_URL); return; }
  const name = pickSfxName(currentWeaponSfx().hit);
  if (name) playSfx(sfxUrl(SFX_DIR_HIT, name));
}

/* 技能音效。三系箭術照等級連放，其餘法術依屬性放一次，補血放治癒術。
   物理技能沒有專屬音檔，交給普攻那組處理，這裡不出聲。 */
function playSkillSound(sk, lv) {
  if (!sk) return;
  // 有專屬音檔的技能優先，不再往下走箭術／屬性那幾條規則
  if (SFX_SKILL[sk.id]) { playSfx(SFX_SKILL[sk.id]); return; }
  const bolt = SFX_MAGIC_BOLT[sk.id];
  if (bolt) {
    const url = sfxUrl(SFX_DIR_MAGIC, bolt);
    const shots = Math.max(1, lv || 1);
    for (let i = 0; i < shots; i++) {
      // 第一發立刻放，後面照間隔排隊；播放間隔不受 minGap 限制
      setTimeout(() => playSfx(url), i * SFX_BOLT_GAP_MS);
    }
    return;
  }
  if (SFX_HEAL_TYPES.includes(sk.type)) {
    playSfx(sfxUrl(SFX_DIR_MAGIC, '治癒術'), 40);
    return;
  }
  if (SFX_MAGIC_TYPES.includes(sk.type)) {
    const name = SFX_MAGIC_BY_ELEMENT[sk.element];
    if (name) playSfx(sfxUrl(SFX_DIR_MAGIC, name), 40);
  }
}

// 異常狀態：'poison' | 'stun' | 'silence'
function playStatusSound(kind) {
  const name = SFX_STATUS[kind];
  if (name) playSfx(sfxUrl(SFX_DIR_STATUS, name), SFX_STATUS_GAP_MS);
}

let lastMonsterDefId = null; // 追蹤目前顯示的怪物，避免重複渲染
function renderMonster() {
  const wrap = document.getElementById('monster-area');
  if (!wrap) return;
  const graves = takeMonsterGraves(wrap);
  if (!state.monsters || state.monsters.length === 0) {
    lastMonsterDefId = null;
    const map = currentMap();
    if (map && map.monsters.length === 0) {
      wrap.innerHTML = '';
    } else {
      wrap.innerHTML = '<div class="monster-empty">搜尋中…</div>';
    }
    putMonsterGraves(wrap, graves);
    layoutBattlefield();
    return;
  }

  let html = '<div class="monster-semi-circle">';

  state.monsters.forEach((mon, idx) => {
    const def = MONSTERS[mon.defId];
    const elemIcon = ELEMENT_ICONS[def.element] || '⚪';
    const isTarget = idx === 0;
    const big = !!(def && (def.isMvp || def.isBoss));
    const size = big ? 100 : (isTarget ? 70 : 56);

    html += `
      <div class="monster-slot ${isTarget ? 'target' : ''}" id="monster-slot-${mon.id}" style="transform:translate(-50%,-50%);">
        <img src="${monsterImgSrc(mon.defId)}" data-def="${mon.defId}" alt="${def.name}" style="width:${size}px;height:${size}px;" onerror="this.onerror=null;this.src='${placeholderImgSrc('monster')}'">
        <div class="monster-name" style="font-size:${isTarget ? '12' : '10'}px;">${def.name} Lv.${def.level} <span class="monster-element elem-${def.element}">${elemIcon}</span></div>
        <div class="monster-hp-bar" style="width:${big ? 80 : (isTarget ? 60 : 48)}px;"><div id="monster-hp-bar-${mon.id}" class="monster-hp-fill" style="width:${pct(mon.hp, mon.maxHp)}%"></div></div>
        <div id="monster-hp-text-${mon.id}" style="font-size:10px;color:var(--ink-dim);">${Math.floor(mon.hp)}/${mon.maxHp}</div>
        <div id="monster-ail-${mon.id}" class="monster-ail"></div>
      </div>`;
  });
  html += '</div>';
  wrap.innerHTML = html;
  putMonsterGraves(wrap, graves);
  wrap.querySelectorAll('.monster-slot:not(.dying) img[data-def]').forEach(img => mobAnimBind(img));
  lastMonsterDefId = state.monsters.map(m => m.id).join(',');
  layoutBattlefield();
}

// 只更新 HP 條
function updateMonsterHp() {
  if (!state.monsters || state.monsters.length === 0) return;
  state.monsters.forEach(mon => {
    const hpBar = document.getElementById(`monster-hp-bar-${mon.id}`);
    const hpText = document.getElementById(`monster-hp-text-${mon.id}`);
    if (hpBar) hpBar.style.width = pct(mon.hp, mon.maxHp) + '%';
    if (hpText) hpText.textContent = `${Math.max(0, mon.hp)}/${mon.maxHp}`;
    // 異常狀態圖示（跟著 HP 條一起刷新，不用另外開一條計時器）
    const ailEl = document.getElementById(`monster-ail-${mon.id}`);
    if (ailEl && typeof ailList === 'function') {
      const list = ailList(mon);
      let html = list.map(t => `<span title="${MON_AILMENTS[t].name}">${MON_AILMENTS[t].icon}</span>`).join('');
      // 怪物自己的增益（#36）：跟異常狀態同一排，用不同底色區分
      if (typeof monBuffList === 'function') {
        html += monBuffList(mon).map(k =>
          `<span class="mon-buff" title="${MON_BUFF_LABELS[k] || k}">${MON_BUFF_ICONS[k] || '✨'}</span>`).join('');
      }
      if (ailEl.innerHTML !== html) ailEl.innerHTML = html;
    }
  });
}

/* 怪物身上的增益（#36）在 HP 條下面的圖示。鍵對應 engine.js 的 MON_BUFF_KEYS */
const MON_BUFF_ICONS = { atkPct: '💪', aspdPct: '💨', fleeFlat: '🌀', cutPct: '🛡️', block: '🛡️', reflect: '🔁', maxRoll: '🎯' };
const MON_BUFF_LABELS = {
  atkPct: '攻擊力提升', aspdPct: '攻速提升', fleeFlat: '迴避提升',
  cutPct: '受到的傷害下降', block: '自動防禦（機率完全擋下）', reflect: '反射盾', maxRoll: '傷害固定最大值',
};

/* ---------------- 傷害飄字系統 ---------------- */
let damageFloatId = 0;
let pendingFloatTargetId = null; // showDamageFloatAt() 用來把飄字釘在指定怪物身上；只有本檔會動它
let _floatDelayMs = 0; // 累積延遲，讓連續飄字錯開

/* 把飄字打在**指定的那一隻怪**身上（範圍技、多段技用）。

   engine.js 以前是自己 `pendingFloatTargetId = mon.id`（跨檔案寫 ui.js 的變數），
   而且另外兩處乾脆自己 createElement 拼一顆飄字出來——等於同一件事有三份實作，
   偏移錯開、暴擊特效、存活時間都對不上。統一走這支。 */
function showDamageFloatAt(monsterInstanceId, dmg, type, element) {
  if (type !== 'heal' && type !== 'miss') playMonsterHit(monsterInstanceId);
  const prev = pendingFloatTargetId;
  pendingFloatTargetId = monsterInstanceId;
  try { showDamageFloat(dmg, type, element); }
  finally { pendingFloatTargetId = prev; }
}

/* ---- 武僧遺物：加特林飄字（#113）----
   「南無加特林菩薩」要看得到一排「-1」連射。傷害是一次結算的（3600 點），
   這裡純粹是特效——真的打 3600 次會把戰鬥迴圈跑爆。
   錯開時間送出，讓它們像連射而不是一次噴一坨。 */
function showGatlingFloats(monsterInstanceId, n) {
  const count = n || 12;
  const targetEl = document.getElementById('monster-slot-' + monsterInstanceId);
  if (!targetEl) return;
  if (_liveFloats >= MAX_LIVE_FLOATS) return;
  /* 一次讀座標、一次進 DOM（#117）。

     原本是 12 個 setTimeout 各自呼叫 showDamageFloatAt，等於
     **12 次強制 layout ＋ 12 次 appendChild ＋ 12 個計時器**，而加特林每秒都會放。
     改成讀一次 rect、用 CSS 的 animation-delay 錯開連射感，
     整批塞進一個 DocumentFragment 一次 append，最後只留一個清除用的計時器。 */
  const rect = targetEl.getBoundingClientRect();
  const frag = document.createDocumentFragment();
  const made = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'damage-float gatling';
    el.textContent = '-1';
    el.style.position = 'fixed';
    el.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 46) + 'px';
    el.style.top = (rect.top - 10 - Math.random() * 18) + 'px';
    el.style.animationDelay = (i * 45) + 'ms';
    frag.appendChild(el);
    made.push(el);
  }
  document.body.appendChild(frag);
  _liveFloats += count;
  setTimeout(() => { made.forEach(e => e.remove()); _liveFloats -= count; }, 1500 + count * 45);
}

/* ---- 武僧遺物：佛法無邊（#113）----
   免傷觸發時全身散發黃光一秒，頭上跳一行字。
   class 加在 player-sprite 上，一秒後自己拔掉——不用 animationend，
   連續觸發時那顆事件會被後一次的重設吃掉。 */
function showBuddhaShield() {
  const el = document.getElementById('player-sprite');
  if (el) {
    el.classList.remove('buddha-glow');
    void el.offsetWidth;                 // 強制 reflow，連續觸發才會重播動畫
    el.classList.add('buddha-glow');
    setTimeout(() => el.classList.remove('buddha-glow'), 1000);
  }
  if (typeof showPlayerFloat === 'function') showPlayerFloat('佛法無邊', 'buddha');
}

// 在玩家頭上顯示飄字
function showPlayerFloat(dmg, type) {
  const el = document.createElement('div');
  el.className = 'damage-float';
  if (type === 'crit') el.classList.add('crit');
  else if (type === 'heal') el.classList.add('heal');
  else if (type === 'miss') el.classList.add('miss');
  else if (type === 'element-good') el.classList.add('element-good');
  else if (type === 'element-bad') el.classList.add('element-bad');
  else if (type === 'buddha') el.classList.add('buddha-text');
  el.textContent = dmg;

  const playerEl = document.getElementById('player-sprite');
  if (playerEl) {
    const rect = playerEl.getBoundingClientRect();
    el.style.position = 'fixed';
    el.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 20) + 'px';
    el.style.top = (rect.top - 10) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

/* 屬性克制／被克／免疫時，在怪物頭上打一行**加大的**屬性飄字。

   顏色跟著「攻擊方的屬性」走（火紅、水藍、風綠、地土黃…），
   跟傷害數字的綠/紫是兩回事——那個只表示賺到或吃虧，這個是告訴你打的是什麼屬性。
   位置比傷害數字再高一截，免得跟它疊在一起。 */
const ELEMENT_FLOAT_LABEL = {
  none: '無', water: '水', earth: '地', fire: '火', wind: '風',
  poison: '毒', holy: '聖', shadow: '暗', ghost: '念', undead: '不死',
};
function showElementFloat(monsterInstanceId, element, mult) {
  let targetEl = monsterInstanceId != null ? document.getElementById('monster-slot-' + monsterInstanceId) : null;
  if (!targetEl) targetEl = document.querySelector('.monster-slot.target');
  if (!targetEl) return;

  const el = document.createElement('div');
  el.className = 'element-float ele-' + (element || 'none');
  if (mult === 0) el.classList.add('immune');
  else if (mult < 1) el.classList.add('weak');
  const name = ELEMENT_FLOAT_LABEL[element] || ELEMENT_FLOAT_LABEL.none;
  el.textContent = mult === 0 ? `${name} 免疫` : `${name} ×${Math.round(mult * 100)}%`;

  const rect = targetEl.getBoundingClientRect();
  el.style.position = 'fixed';
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top = (rect.top - 44) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

/* 同時存在的飄字上限（#117）。

   每顆飄字都要 `getBoundingClientRect()`（強制 layout）再 appendChild，
   成本隨畫面上已有的節點數增加。平常一秒十幾顆沒問題，但遺物的濺射
   （最多 4 顆）＋加特林（12 顆）＋追打（2 顆）疊在一起時會瞬間爆量，
   而飄字要 1.5 秒才消失——多出來的那些人眼也分不出來，直接不生成。 */
const MAX_LIVE_FLOATS = 48;
let _liveFloats = 0;

function showSkillNameFloat(name, lv) {
  if (!name) return;
  if (typeof skillDisplayName === 'function') name = skillDisplayName(name);
  const ally = (typeof _allyActing !== 'undefined') ? _allyActing : null;
  let host = null;
  if (ally) {
    const owner = (typeof _allyOwnerState !== 'undefined' && _allyOwnerState) || state;
    const list = (owner && owner.allies) || [];
    const i = list.indexOf(ally);
    if (i >= 0) host = document.getElementById('ally-sprite-' + i);
  }
  if (!host) host = document.getElementById('player-sprite');
  if (!host) return;
  const paper = host.querySelector('canvas');
  if (paper && paper.offsetWidth) host = paper;
  const rect = host.getBoundingClientRect();
  if (!rect.width && !rect.height) return;
  const el = document.createElement('div');
  el.className = 'skill-name-float';
  el.textContent = lv ? (name + ' Lv' + lv) : name;
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top = rect.top + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}
function showDamageFloat(dmg, type, element) {
  if (_liveFloats >= MAX_LIVE_FLOATS && type !== 'crit') return;
  // 找到目標怪物 DOM 元素來取得座標
  let targetEl = null;
  if (pendingFloatTargetId != null) {
    targetEl = document.getElementById('monster-slot-' + pendingFloatTargetId);
  }
  if (!targetEl) targetEl = document.querySelector('.monster-slot.target');

  // 暴擊走專屬特效：星爆圖 + 中間的黃色數字，不再另外飄一次字
  if (type === 'crit') { showCritEffect(dmg, targetEl); return; }

  const el = document.createElement('div');
  el.className = 'damage-float';
  if (type === 'crit') el.classList.add('crit');
  else if (type === 'heal') el.classList.add('heal');
  else if (type === 'miss') el.classList.add('miss');
  else if (type === 'element-good') el.classList.add('element-good');
  else if (type === 'element-bad') el.classList.add('element-bad');
  else if (type === 'element-immune') el.classList.add('element-immune');
  /* 魔法傷害的數字照施法屬性上色（火紅、水藍、風綠、地土黃…），
     跟怪物頭上那行屬性飄字同一套顏色。
     **無屬性不加 class**——依使用者要求，維持跟物理傷害一模一樣的白字。
     資料裡的無屬性有兩種寫法：`SKILLS` 用 `neutral`（57 個），`ITEMS` 用 `none`（46 件），兩個都要擋。 */
  else if (element && element !== 'none' && element !== 'neutral') el.classList.add('ele-' + element);

  el.textContent = dmg;

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    // 每次呼叫自動遞增偏移，讓連續傷害數字錯開
    const offsetX = (Math.random() - 0.5) * 8;
    el.style.position = 'fixed';
    el.style.left = (rect.left + rect.width * 0.55 + offsetX) + 'px';
    el.style.top = (rect.top + rect.height * 0.28) + 'px';
    _lastFloatAnchor = { left: parseFloat(el.style.left), top: parseFloat(el.style.top), at: Date.now() };
    el.style.animationDelay = (_floatDelayMs * 30) + 'ms';
    document.body.appendChild(el);
    _floatDelayMs++;
    // 快速重置：200ms 後歸零（一次攻擊間隔）
    clearTimeout(el._resetTimer);
    el._resetTimer = setTimeout(() => { _floatDelayMs = 0; }, 200);
  } else {
    // fallback：戰鬥區域中間
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '30%';
    const container = document.getElementById('damage-container');
    if (container) container.appendChild(el);
    else return;
  }
  _liveFloats++;
  setTimeout(() => { el.remove(); _liveFloats--; }, 1500);
}

/* 白字出生點。黃字要接在它往上淡出的那段，不另找一個位置。 */
let _lastFloatAnchor = null;

/* 畫面上同時只留一顆黃字。新的要出來時，舊的立刻拿掉。 */
let _comboTotalEl = null;
let _comboTotalTimer = 0;

/* 多段攻擊的黃字合計。停在白字淡出的高度，不淡出，時間到直接消失。 */
/* 黃字釘在那一隻怪的頭上。白字各自往右下拋，不帶著黃字一起走。 */
function pinComboTotal(el) {
  const node = el || _comboTotalEl;
  if (!node) return;
  let target = node._monId != null ? document.getElementById('monster-slot-' + node._monId) : null;
  if (!target) target = document.querySelector('.monster-slot.target');
  if (!target) return;
  const rect = target.getBoundingClientRect();
  node.style.left = (rect.left + rect.width / 2) + 'px';
  node.style.top = (rect.top - 4) + 'px';
}
function showComboTotal(monsterId, total) {
  const n = Math.round(total);
  if (!(n > 0)) return;
  clearTimeout(_comboTotalTimer);
  _comboTotalTimer = setTimeout(() => {
    if (_comboTotalEl) { _comboTotalEl.remove(); _comboTotalEl = null; }
    let targetEl = monsterId != null ? document.getElementById('monster-slot-' + monsterId) : null;
    if (!targetEl) targetEl = document.querySelector('.monster-slot.target');
    if (!targetEl) return;
    const el = document.createElement('div');
    el.className = 'damage-float combo-total';
    el.textContent = String(n);
    el._monId = monsterId;
    el.style.position = 'fixed';
    pinComboTotal(el);
    document.body.appendChild(el);
    _comboTotalEl = el;
    const mine = el;
    _comboTotalTimer = setTimeout(() => {
      if (_comboTotalEl !== mine) return;
      mine.remove();
      _comboTotalEl = null;
    }, 700);
  }, 320);
}

/* 一發技能拆成多段數字（二連矢、火箭術）。實際扣血仍是呼叫端算好的 total，這裡只拆顯示。 */
function showSkillHitNumbers(monsterId, total, hits, element, crit) {
  const sum = Math.round(total);
  let n = hits | 0;
  if (n < 1) n = 1;
  if (sum > 0 && sum < n) n = sum;
  if (n <= 1 || typeof showDamageFloatAt !== 'function') {
    if (typeof showDamageFloatAt === 'function') showDamageFloatAt(monsterId, '-' + sum, crit ? 'crit' : 'normal', element);
    return;
  }
  const each = Math.floor(sum / n);
  let rest = sum;
  for (let i = 0; i < n; i++) {
    const part = i === n - 1 ? rest : each;
    rest -= part;
    if (part > 0) showDamageFloatAt(monsterId, '-' + part, crit ? 'crit' : 'normal', element);
  }
  showComboTotal(monsterId, sum);
}

/* 怪物圖集。images/mob_anim/<imgId>.png 一格一幀，index.json 標 idle／walk／hit／die。
   沒有圖檔的怪維持原本的靜態圖。
   場上還沒有真正的位移，走路幀是上下跳的，站著播會狂跳。活著先循環待機。
   被打播一次受擊，死掉停在最後一幀。 */
const MOB_ANIM_DIR = 'images/mob_anim/';
const MOB_ANIM_BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const MOB_ANIM_ONCE = { hit: 1, die: 1 };
let MOB_ANIM = null;
let mobAnimTimer = null;
const mobAnimMiss = {};

function applyMobAnimTable(j) {
  if (!j) return;
  MOB_ANIM = j;
  document.querySelectorAll('.monster-slot:not(.dying) img[data-def]').forEach(mobAnimBind);
}
function loadMobAnim() {
  /* 直接點開 index.html 時瀏覽器不允許 fetch 讀本機 json，改吃 script 掛上的表。 */
  if (window.MOB_ANIM_TABLE) applyMobAnimTable(window.MOB_ANIM_TABLE);
  if (location.protocol === 'file:') return;
  fetch(MOB_ANIM_DIR + 'index.json').then(r => r.ok ? r.json() : null).then(j => {
    if (j) applyMobAnimTable(j);
  }).catch(() => {});
}
function mobLoopAct(d) {
  if (d.actions.idle) return 'idle';
  if (d.actions.walk) return 'walk';
  return null;
}
function mobAnimEnsureRows(d) {
  if (d._rows) return;
  let n = 0;
  Object.keys(d.actions).forEach(k => { n += d.actions[k].frames; });
  d._total = n;
  d._rows = Math.ceil(n / d.cols);
}
function mobAnimBind(img) {
  if (!MOB_ANIM || !img || img._maDef || img._maProbe) return;
  const defId = img.getAttribute('data-def');
  const mon = defId && MONSTERS[defId];
  const id = mon && mon.imgId;
  if (!id || mobAnimMiss[id]) return;
  const d = MOB_ANIM[String(id)];
  if (!d || !d.actions) return;
  img._maProbe = true;
  const im = new Image();
  im.onload = () => {
    if (!img.isConnected) return;
    mobAnimApply(img, d, id);
    const slot = img.closest('.monster-slot');
    mobAnimPlay(img, slot && slot.classList.contains('dying') ? 'die' : mobLoopAct(d), true);
  };
  im.onerror = () => { mobAnimMiss[id] = 1; };
  im.src = MOB_ANIM_DIR + id + '.png';
}
function mobAnimApply(img, d, id) {
  mobAnimEnsureRows(d);
  img._maDef = d;
  if (!img._maBox0) img._maBox0 = [img.clientWidth || 80, img.clientHeight || img.clientWidth || 80];
  const bw = img._maBox0[0], bh = img._maBox0[1];
  let k = Math.min(bw / d.fit[0], bh / d.fit[1]);
  const over = Math.max(d.cell[0] * k / (bw * 2.2), d.cell[1] * k / (bh * 2.2), 1);
  k /= over;
  img._maK = k;
  img.src = MOB_ANIM_BLANK;
  img.style.backgroundImage = 'url("' + MOB_ANIM_DIR + id + '.png")';
  img.style.backgroundRepeat = 'no-repeat';
  img.style.width = Math.round(d.cell[0] * k) + 'px';
  img.style.height = Math.round(d.cell[1] * k) + 'px';
  img.style.marginBottom = Math.round((bh - d.cell[1] * k) / 2) + 'px';
  img._maAct = '';
  img._maFrame = -1;
  if (!mobAnimTimer) mobAnimTimer = setInterval(mobAnimTick, 33);
}
function mobAnimPlay(img, act, force) {
  const d = img && img._maDef;
  if (!d || !act) return;
  let a = d.actions[act];
  if (!a) {
    act = mobLoopAct(d);
    a = act && d.actions[act];
    if (!a) return;
  }
  if (!force && img._maAct === act) return;
  img._maAct = act;
  img._maT0 = Date.now();
  img._maFrame = -1;
}
function mobAnimDraw(img, d, idx) {
  if (img._maFrame === idx) return;
  img._maFrame = idx;
  const k = img._maK || 1, cw = d.cell[0] * k, ch = d.cell[1] * k;
  const col = idx % d.cols, row = (idx / d.cols) | 0;
  img.style.backgroundSize = (d.cols * cw).toFixed(1) + 'px ' + (d._rows * ch).toFixed(1) + 'px';
  img.style.backgroundPosition = (-(col * cw)).toFixed(1) + 'px ' + (-(row * ch)).toFixed(1) + 'px';
}
function mobAnimTickSprites() {
  const now = Date.now();
  document.querySelectorAll('.monster-slot img').forEach(img => {
    const d = img._maDef;
    if (!d) return;
    const a = d.actions[img._maAct];
    if (!a) return;
    const delay = a.delay * (img._maAct === 'walk' ? 2.4 : 1);
    let n = ((now - img._maT0) / delay) | 0;
    if (n >= a.frames) {
      if (img._maAct === 'die') n = a.frames - 1;
      else if (MOB_ANIM_ONCE[img._maAct]) {
        mobAnimPlay(img, mobLoopAct(d), true);
        return;
      } else n = n % a.frames;
    }
    mobAnimDraw(img, d, a.start + n);
  });
}
function playMonsterHit(id) {
  const slot = document.getElementById('monster-slot-' + id);
  const img = slot && slot.querySelector('img');
  if (!img || !img._maDef || slot.classList.contains('dying')) return;
  mobAnimPlay(img, 'hit', true);
}
function playMonsterDie(id) {
  const slot = document.getElementById('monster-slot-' + id);
  if (!slot || slot.classList.contains('dying')) return;
  slot.classList.add('dying');
  const bar = document.getElementById('monster-hp-bar-' + id);
  const text = document.getElementById('monster-hp-text-' + id);
  if (bar) bar.style.width = '0%';
  if (text) {
    const max = String(text.textContent || '').split('/')[1];
    text.textContent = max ? ('0/' + max) : '0';
  }
  const img = slot.querySelector('img');
  const die = img && img._maDef && img._maDef.actions.die;
  const ms = die ? die.frames * die.delay : 280;
  if (img && img._maDef) mobAnimPlay(img, 'die', true);
  setTimeout(() => {
    slot.style.opacity = '0';
    setTimeout(() => slot.remove(), 280);
  }, Math.max(0, ms - 80));
}
function takeMonsterGraves(wrap) {
  const graves = [];
  wrap.querySelectorAll('.monster-slot.dying').forEach(el => {
    el.remove();
    graves.push(el);
  });
  return graves;
}
function putMonsterGraves(wrap, graves) {
  if (!graves || !graves.length) return;
  let host = wrap.querySelector('.monster-semi-circle');
  if (!host) {
    host = document.createElement('div');
    host.className = 'monster-semi-circle';
    wrap.appendChild(host);
  }
  graves.forEach(el => { if (el.isConnected === false) host.appendChild(el); });
}
loadMobAnim();

/* 戰場移動。座標是整張戰鬥場景的百分比。
   怪沿自己到玩家的方向走近，停在攻擊距離。人在怪的左邊就朝右，在右邊就朝左。
   近戰的人也朝怪走近。弓、樂器、鞭、槍、法杖、書，或正在自動放的魔法，人留在左側。
   還有距離播走路，貼近後怪播攻擊。 */
const BF_HOME = { x: 20, y: 64 };
const BF_SPEED = 20;
let bfPlayer = { x: BF_HOME.x, y: BF_HOME.y };
let bfFaceRight = true;
let bfLast = 0;
let bfTimer = null;
let bfPlayerSheet = false;
let bfPl = null;

function playerKeepsDistance() {
  try {
    const wid = getEquipBaseItemId('weapon');
    if (typeof isBowWeapon === 'function' && isBowWeapon(wid)) return true;
    const cat = typeof aspdCategoryOf === 'function' ? aspdCategoryOf(wid) : '';
    if (cat === 'rod1' || cat === 'rod2' || cat === 'book' || cat === 'pistol' || cat === 'rifle' || cat === 'shotgun' || cat === 'gatling' || cat === 'grenade') return true;
    const cfg = state.autoSkillConfig || {};
    return [cfg.skillId, cfg.skillId2].some(id => {
      const sk = id && typeof SKILLS !== 'undefined' && SKILLS[id];
      return sk && (sk.type === 'magic' || sk.type === 'magic_aoe');
    });
  } catch (e) { return false; }
}
function bfClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function sceneToLocal(parent, sx, sy) {
  const scene = document.getElementById('battle-scene');
  if (!scene || !parent) return null;
  const s = scene.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  if (!s.width || !s.height) return null;
  return {
    x: s.left + s.width * sx / 100 - p.left,
    y: s.top + s.height * sy / 100 - p.top
  };
}
function bfStep(cur, goal, dt) {
  const dx = goal.x - cur.x, dy = goal.y - cur.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.35) return { x: goal.x, y: goal.y, moved: false };
  const m = Math.min(dist, BF_SPEED * dt);
  return { x: cur.x + dx / dist * m, y: cur.y + dy / dist * m, moved: true };
}
/* 沿著自己到對方的連線走近，停在 gap 外。每次目標只取剩餘距離的一半，
   雙方同時走會在中間相遇，不會穿過去，也不會被拉到玩家的固定一側。 */
function approachPoint(self, other, gap) {
  const dx = other.x - self.x, dy = other.y - self.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= gap + 0.4) return { x: self.x, y: self.y };
  const surplus = (dist - gap) * 0.5;
  const ux = dx / dist, uy = dy / dist;
  return {
    x: bfClamp(self.x + ux * surplus, 6, 94),
    y: bfClamp(self.y + uy * surplus, 10, 90)
  };
}
function layoutBattlefield() {
  if (typeof state === 'undefined' || !state) return;
  const now = Date.now();
  const dt = bfLast ? Math.min(0.12, (now - bfLast) / 1000) : 0;
  bfLast = now;
  const ps = document.getElementById('player-sprite');
  const mons = (state && state.monsters) || [];
  let town = false;
  try { town = typeof isInTown === 'function' && isInTown(); } catch (e) { town = false; }
  const close = !town && mons.length > 0 && !playerKeepsDistance();
  const lead = mons[0];
  let goal = BF_HOME;
  if (close && lead && Number.isFinite(lead.bx) && Number.isFinite(lead.by)) {
    goal = approachPoint(bfPlayer, { x: lead.bx, y: lead.by }, 16);
  }
  const stepped = dt ? bfStep(bfPlayer, goal, dt) : { x: bfPlayer.x, y: bfPlayer.y, moved: false };
  bfPlayer = { x: stepped.x, y: stepped.y };
  if (ps && ps.offsetParent) {
    const local = sceneToLocal(ps.offsetParent, bfPlayer.x, bfPlayer.y);
    if (local) {
      ps.classList.add('bf-on');
      ps.style.position = 'absolute';
      ps.style.margin = '0';
      ps.style.left = (local.x - ps.offsetWidth / 2) + 'px';
      ps.style.top = (local.y - ps.offsetHeight) + 'px';
    }
  }
  const faceRight = !lead || !Number.isFinite(lead.bx) || lead.bx >= bfPlayer.x;
  syncPlayerBattleAnim(stepped.moved && !town);
  pinComboTotal();
  faceBattlePlayer(faceRight);
  mons.forEach((mon, i) => {
    if (!Number.isFinite(mon.bx) || !Number.isFinite(mon.by)) {
      mon.bx = 36 + Math.random() * 54;
      mon.by = 18 + Math.random() * 64;
    }
    const slot = document.getElementById('monster-slot-' + mon.id);
    if (!slot || slot.classList.contains('dying')) return;
    const gap = 16 + (i % 3) * 6;
    const meet = approachPoint({ x: mon.bx, y: mon.by }, bfPlayer, gap);
    const mv = dt ? bfStep({ x: mon.bx, y: mon.by }, meet, dt) : { x: mon.bx, y: mon.by, moved: false };
    const dx = mv.x - mon.bx;
    mon.bx = mv.x; mon.by = mv.y;
    const parent = slot.offsetParent || slot.parentElement;
    const local = sceneToLocal(parent, mon.bx, mon.by);
    if (local) {
      slot.style.transition = 'none';
      slot.style.left = local.x + 'px';
      slot.style.top = local.y + 'px';
    }
    const img = slot.querySelector('img');
    if (!img) return;
    const faceLeft = Math.abs(dx) > 0.08 ? dx < 0 : bfPlayer.x <= mon.bx;
    const nativeLeft = !!img._maDef;
    img.style.transform = (faceLeft !== nativeLeft) ? 'scaleX(-1)' : '';
    if (img._maDef && img._maAct !== 'hit' && img._maAct !== 'die') {
      const arrived = Math.hypot(bfPlayer.x - mon.bx, bfPlayer.y - mon.by) <= gap + 0.6;
      mobAnimPlay(img, mv.moved ? 'walk' : (arrived ? 'attack' : 'idle'), false);
    }
  });
}
function facingFlip(act, faceRight) {
  // 待機原圖就用，不因朝右再翻一次。
  if (act === 'idle') return false;
  const side = /_s$/.test(act || '');
  return side ? !faceRight : !!faceRight;
}
function applyPaperTransform(paper, flip) {
  const bw = paper.width || 1;
  const cssW = parseFloat(paper.style.width) || bw;
  const ax = Math.round((paper._ox || 0) * cssW / bw);
  paper.style.transformOrigin = ax + 'px 50%';
  paper.style.transform = 'translateX(' + (-ax) + 'px)' + (flip ? ' scaleX(-1)' : '');
}
function faceBattlePlayer(faceRight) {
  bfFaceRight = !!faceRight;
  if (bfPaper) {
    const paper = document.getElementById('player-paper');
    if (paper) {
      /* 用畫面上那一格的動作。攻擊剛換動作時，下一格還沒畫上去，先不要翻。 */
      const act = paper._plAct || _pd.act || '';
      applyPaperTransform(paper, facingFlip(act, bfFaceRight));
    }
    return;
  }
  const img = document.getElementById('player-img');
  if (bfPlayerSheet && img) {
    /* 側面圖（_s）朝右，正面站立朝左。翻面跟已經畫出來的那一格同一個動作。 */
    const act = img._plShown || img._plAct || '';
    const flip = facingFlip(act, bfFaceRight);
    img.style.transform = (img._bfBaseTf || '') + (flip ? ' scaleX(-1)' : '');
    return;
  }
  const canvas = (typeof animCanvas !== 'undefined') ? animCanvas : null;
  if (canvas) canvas.style.transform = faceRight ? '' : 'scaleX(-1)';
}
const PAPERDOLL_HEAD_SLOTS = ['head_bottom', 'head_mid', 'head_top'];
const _pd = { act: '', t0: 0, frame: -1, once: 0, key: '', parts: null };
const _pdImg = {};
let bfPaper = false;

function paperdollImage(id) {
  let im = _pdImg[id];
  if (im) return im;
  im = new Image();
  im.src = window.PAPERDOLL.img[id].src;
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
function paperdollJobGender() {
  const job = (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[state.jobId]) || state.jobId || 'novice';
  const gender = state.gender === 'female' ? 'female' : 'male';
  return { job: job, gender: gender };
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
function hairNow() {
  const style = (state && state.hairStyle) || 9;
  const color = (state && state.hairColor != null) ? state.hairColor : 5;
  return { style: style | 0, color: color | 0 };
}
function paperdollHeadId(gender) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip) return null;
  const h = hairNow();
  const keyed = 'head/' + gender + '/' + h.style + '/' + h.color;
  if (pd.clip[keyed]) return keyed;
  const plain = 'head/' + gender;
  return pd.clip[plain] ? plain : null;
}
function paperdollWeaponPart(job, gender) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip || typeof getEquipBaseItemId !== 'function' || typeof aspdCategoryOf !== 'function') return null;
  let itemId = null;
  try { itemId = getEquipBaseItemId('weapon'); } catch (e) { return null; }
  let cat = 'bare';
  try { cat = aspdCategoryOf(itemId) || 'bare'; } catch (e) { return null; }
  cat = visualWeaponCat(job, gender, cat);
  if (!cat || cat === 'bare') return null;
  const seen = {};
  while (job && !seen[job]) {
    seen[job] = 1;
    const id = 'weapon/' + job + '/' + gender + '/' + cat;
    if (pd.clip[id]) return id;
    const node = (typeof JOB_TREE !== 'undefined') && JOB_TREE[job];
    job = node && node.parent;
  }
  return null;
}
function equipRefItem(who, slot) {
  const ref = who && who.equip && who.equip[slot];
  if (ref && who.instances && who.instances[ref]) return who.instances[ref].item;
  return ref || null;
}
function paperdollWeaponId(job, gender, itemId) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip) return null;
  let cat = 'bare';
  try { cat = (typeof aspdCategoryOf === 'function' && aspdCategoryOf(itemId)) || 'bare'; } catch (e) { cat = 'bare'; }
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
function paperdollLookParts(who) {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.clip || !who) return null;
  const job = (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[who.jobId]) || who.jobId || 'novice';
  const gender = who.gender === 'female' ? 'female' : 'male';
  const body = 'body/' + job + '/' + gender;
  if (!pd.clip[body]) return null;
  const parts = [body];
  const style = who.hairStyle || 9;
  const color = who.hairColor != null ? who.hairColor : 5;
  const keyed = 'head/' + gender + '/' + (style | 0) + '/' + (color | 0);
  const plain = 'head/' + gender;
  if (pd.clip[keyed]) parts.push(keyed);
  else if (pd.clip[plain]) parts.push(plain);
  if (pd.view && typeof ITEMS !== 'undefined') {
    for (let s = 0; s < PAPERDOLL_HEAD_SLOTS.length; s++) {
      const itemId = equipRefItem(who, PAPERDOLL_HEAD_SLOTS[s]);
      const it = itemId && ITEMS[itemId];
      const view = it && pd.view[String(it.imgId)];
      if (!view) continue;
      const hat = 'hat/' + view + '/' + gender;
      if (pd.clip[hat]) parts.push(hat);
    }
  }
  const weapon = paperdollWeaponId(job, gender, equipRefItem(who, 'weapon'));
  if (weapon) parts.push(weapon);
  return parts;
}
function paperdollHeadViews() {
  const pd = window.PAPERDOLL;
  if (!pd || !pd.view || typeof getEquipBaseItemId !== 'function' || typeof ITEMS === 'undefined') return null;
  const views = [];
  for (let i = 0; i < PAPERDOLL_HEAD_SLOTS.length; i++) {
    let itemId = null;
    try { itemId = getEquipBaseItemId(PAPERDOLL_HEAD_SLOTS[i]); } catch (e) { itemId = null; }
    const it = itemId && ITEMS[itemId];
    const view = it && pd.view[String(it.imgId)];
    views.push(view || 0);
  }
  return views;
}
function paperdollParts() {
  const views = paperdollHeadViews();
  const pd = window.PAPERDOLL;
  if (!views || !pd || !pd.clip || !state) return null;
  const who = paperdollJobGender();
  const body = 'body/' + who.job + '/' + who.gender;
  if (!pd.clip[body]) return null;
  const parts = [body];
  const head = paperdollHeadId(who.gender);
  if (head) parts.push(head);
  for (let i = 0; i < views.length; i++) {
    if (!views[i]) continue;
    const hat = 'hat/' + views[i] + '/' + who.gender;
    if (!pd.clip[hat]) continue;
    parts.push(hat);
  }
  const weapon = paperdollWeaponPart(who.job, who.gender);
  if (weapon) parts.push(weapon);
  return parts;
}
function paperdollActName(kind) {
  if (kind !== 'attack') return kind;
  const parts = _pd.parts;
  let act = '';
  try {
    const who = paperdollJobGender();
    const weapon = paperdollWeaponPart(who.job, who.gender);
    act = weapon && window.PAPERDOLL.atk && window.PAPERDOLL.atk[weapon];
  } catch (e) {}
  if (act && parts && paperdollFrameCount(parts[0], act)) return act;
  let cat = 'bare';
  try { cat = aspdCategoryOf(getEquipBaseItemId('weapon')) || 'bare'; } catch (e) {}
  if (cat !== 'bare' && parts && paperdollFrameCount(parts[0], 'slash')) return 'slash';
  return 'attack';
}
function ensurePaperCanvas() {
  let canvas = document.getElementById('player-paper');
  if (canvas) return canvas;
  const host = document.getElementById('player-sprite');
  if (!host) return null;
  canvas = document.createElement('canvas');
  canvas.id = 'player-paper';
  canvas.style.display = 'none';
  host.appendChild(canvas);
  return canvas;
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
function layoutPaperdoll(canvas, parts, charH, footLift) {
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
        const ox = aligned[0], oy = aligned[1];
        boxes.forEach(box => paperdollExpand(parts[p], fr, ox, oy, box));
      }
    }
  });
  const pad = 2;
  const minX = Math.floor(all.minX) - pad;
  const minY = Math.floor(all.minY) - pad;
  const bw = Math.max(1, Math.ceil(all.maxX) + pad - minX);
  const bh = Math.max(1, Math.ceil(all.maxY) + pad - minY);
  const bodyH = isFinite(bodyIdle.maxY) ? (bodyIdle.maxY - bodyIdle.minY) : (idle.maxY - idle.minY);
  const idleH = Math.max(1, bodyH);
  const k = (charH || BATTLE_CHAR_H) / idleH;
  const feet = idle.maxY - minY;
  canvas.width = bw;
  canvas.height = bh;
  canvas.style.width = Math.round(bw * k) + 'px';
  canvas.style.height = Math.round(bh * k) + 'px';
  canvas.style.left = '50%';
  canvas.style.bottom = ((footLift || 0) - Math.round((bh - feet) * k)) + 'px';
  canvas._ox = -minX;
  canvas._oy = -minY;
  canvas._plFrame = -1;
  canvas._plAct = '';
}
function hidePaperdoll() {
  bfPaper = false;
  _pd.key = '';
  _pd.parts = null;
  _pd.once = 0;
  _pd.act = '';
  const canvas = document.getElementById('player-paper');
  if (canvas) canvas.style.display = 'none';
  const img = document.getElementById('player-img');
  if (img) img.style.display = '';
  bfPl = null;
  bfPlayerSheet = false;
}
function syncPaperdoll(img, parts, moving) {
  const key = parts.join('|');
  const canvas = ensurePaperCanvas();
  if (!canvas) return;
  img.style.display = 'none';
  if (typeof animCanvas !== 'undefined' && animCanvas) animCanvas.style.display = 'none';
  if (!bfPaper || _pd.key !== key) {
    bfPaper = true;
    bfPlayerSheet = true;
    _pd.key = key;
    _pd.parts = parts;
    _pd.act = '';
    _pd.once = 0;
    _pd.frame = -1;
    _pd.t0 = Date.now();
    layoutPaperdoll(canvas, parts);
    if (typeof animCanvas !== 'undefined' && animCanvas) animCanvas.style.display = 'none';
    img.style.display = 'none';
    canvas.style.display = '';
    applyPaperTransform(canvas, false);
    if (!mobAnimTimer) mobAnimTimer = setInterval(mobAnimTick, 33);
  }
  if (_pd.once && (Date.now() - _pd.t0) < _pd.once) return;
  _pd.once = 0;
  _pd.atkFrom = 0;
  _pd.atkDelay = 0;
  const fighting = state.monsters && state.monsters.length;
  const side = fighting || moving;
  let act = moving ? 'walk' : 'idle';
  if (!moving && fighting && paperdollFrameCount(parts[0], 'ready_s')) act = 'ready_s';
  else if (side && paperdollFrameCount(parts[0], act + '_s')) act += '_s';
  if (_pd.act !== act) {
    _pd.act = act;
    _pd.t0 = Date.now();
    _pd.frame = -1;
  }
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
function drawPaperdoll() {
  const canvas = document.getElementById('player-paper');
  const parts = _pd.parts;
  if (!canvas || !parts) return;
  const act = _pd.act || 'idle';
  const nFrames = paperdollFrameCount(parts[0], act) || 1;
  const swinging = _pd.once > 0 && _pd.atkDelay > 0;
  const delay = swinging ? _pd.atkDelay : ((window.PAPERDOLL.delay && window.PAPERDOLL.delay[act]) || 100);
  const n0 = ((Date.now() - _pd.t0) / delay) | 0;
  const from = swinging ? (_pd.atkFrom || 0) : 0;
  const n = _pd.once ? Math.min(from + n0, nFrames - 1) : (n0 % nFrames);
  const body = paperdollFrame(parts[0], act, n);
  if (!body) return;
  let ready = true;
  for (let p = 0; p < parts.length; p++) {
    const im = paperdollImage(parts[p]);
    if (!im.complete || !im.naturalWidth) ready = false;
  }
  if (ready && canvas._plFrame === n && canvas._plAct === act) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ox = canvas._ox || 0, oy = canvas._oy || 0;
  if (!drawPaperdollLayers(ctx, parts[0], body, ox, oy)) return;
  for (let p = 1; p < parts.length; p++) {
    const fr = paperdollFrame(parts[p], act, n);
    if (!fr) continue;
    const aligned = paperdollAlign(parts[p], body, fr);
    drawPaperdollLayers(ctx, parts[p], fr, ox + aligned[0], oy + aligned[1]);
  }
  if (ready) {
    canvas._plFrame = n;
    canvas._plAct = act;
    applyPaperTransform(canvas, facingFlip(act, bfFaceRight));
  }
}
function playerAnimKey() {
  const table = window.PLAYER_ANIM_TABLE;
  if (!table || !state) return null;
  const who = paperdollJobGender();
  const base = who.job + '_' + who.gender;
  let cat = '';
  try { cat = aspdCategoryOf(getEquipBaseItemId('weapon')); } catch (e) {}
  cat = visualWeaponCat(who.job, who.gender, cat);
  if (cat && cat !== 'bare' && table[base + '_' + cat]) return base + '_' + cat;
  if (table[base]) return base;
  return null;
}
function syncPlayerBattleAnim(moving) {
  const img = document.getElementById('player-img');
  const parts = paperdollParts();
  if (parts && img) {
    syncPaperdoll(img, parts, moving);
    return;
  }
  if (!bfPaper && !bfPlayerSheet) return;
  if (bfPaper) hidePaperdoll();
  if (bfPlayerSheet && img) {
    bfPlayerSheet = false;
    bfPl = null;
    img.style.cssText = '';
  }
  if (typeof updatePlayerSprite === 'function') updatePlayerSprite();
}
function bindPlayerSheet(img, d, key) {
  bfPlayerSheet = true;
  bfPl = { key, d };
  if (typeof animCanvas !== 'undefined' && animCanvas) animCanvas.style.display = 'none';
  img.style.display = '';
  img.src = MOB_ANIM_BLANK;
  img.style.position = 'absolute';
  img.style.left = '50%';
  img.style.bottom = '0';
  img.style.objectFit = 'none';
  img.style.margin = '0';
  img.style.backgroundImage = 'url("images/player_anim/' + key + '.png")';
  img.style.backgroundRepeat = 'no-repeat';
  img.style.imageRendering = 'pixelated';
  const boxH = BATTLE_CHAR_H;
  const k = boxH / (d.fit[1] || d.cell[1]);
  img._plK = k;
  img.style.width = Math.round(d.cell[0] * k) + 'px';
  img.style.height = Math.round(d.cell[1] * k) + 'px';
  const foot = d.anchor ? (d.cell[1] - d.anchor[1]) * k : 0;
  img.style.bottom = (-Math.round(foot)) + 'px';
  img._bfBaseTf = 'translateX(-50%)';
  let maxF = 0;
  Object.keys(d.actions).forEach(name => {
    const a = d.actions[name];
    maxF = Math.max(maxF, (a.start || 0) + (a.frames || 0));
  });
  d._rows = Math.max(1, Math.ceil(maxF / d.cols));
  img._plAct = '';
  img._plShown = '';
  img._plFrame = -1;
  img._plT0 = Date.now();
  if (!mobAnimTimer) mobAnimTimer = setInterval(mobAnimTick, 33);
}
function playPlayerSheet(img, act) {
  const d = bfPl && bfPl.d;
  if (!d) return;
  if (!d.actions[act]) act = d.actions.idle ? 'idle' : act;
  if (!d.actions[act] || img._plAct === act) return;
  img._plOnce = 0;
  img._plAct = act;
  img._plT0 = Date.now();
  img._plFrame = -1;
}
/* 攻速比整段動作快時，把揮擊壓進這一次的攻擊間隔。
   一格最快約 16ms，再短就丟掉前面的出手，只留收招那幾格。
   仍走原本 33ms 的重繪，不另開計時器。 */
function paperdollSwingTiming(act, n, intervalMs) {
  const native = (window.PAPERDOLL.delay && window.PAPERDOLL.delay[act]) || 90;
  const interval = Math.max(1, intervalMs || state.attackInterval || n * native);
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
function playPlayerSheetAttack() {
  if (bfPaper && _pd.parts) {
    const act = paperdollActName('attack');
    const n = paperdollFrameCount(_pd.parts[0], act);
    if (!n) return false;
    const swing = paperdollSwingTiming(act, n);
    _pd.act = act;
    _pd.t0 = Date.now();
    _pd.frame = -1;
    _pd.atkFrom = swing.from;
    _pd.atkDelay = swing.delay;
    _pd.once = swing.once;
    const canvas = document.getElementById('player-paper');
    if (canvas) canvas._plFrame = -1;
    return true;
  }
  const img = document.getElementById('player-img');
  const d = bfPl && bfPl.d;
  if (!bfPlayerSheet || !img || !d) return false;
  const side = state.monsters && state.monsters.length;
  const act = (side && d.actions.attack_s) ? 'attack_s' : (d.actions.attack ? 'attack' : '');
  if (!act) return false;
  const a = d.actions[act];
  img._plAct = act;
  img._plT0 = Date.now();
  img._plFrame = -1;
  img._plOnce = a.frames * (a.delay || 100);
  return true;
}
function drawPlayerSheet(img) {
  const d = bfPl && bfPl.d;
  const a = d && d.actions[img._plAct];
  if (!a) return;
  const n0 = ((Date.now() - img._plT0) / a.delay) | 0;
  const n = img._plOnce ? Math.min(n0, a.frames - 1) : (n0 % a.frames);
  const idx = a.start + n;
  if (img._plFrame === idx) return;
  img._plFrame = idx;
  img._plShown = img._plAct;
  const flip = facingFlip(img._plAct, bfFaceRight);
  img.style.transform = (img._bfBaseTf || '') + (flip ? ' scaleX(-1)' : '');
  const k = img._plK || 1, cw = d.cell[0] * k, ch = d.cell[1] * k;
  const col = idx % d.cols, row = (idx / d.cols) | 0;
  img.style.backgroundSize = (d.cols * cw).toFixed(1) + 'px ' + (d._rows * ch).toFixed(1) + 'px';
  img.style.backgroundPosition = (-(col * cw)).toFixed(1) + 'px ' + (-(row * ch)).toFixed(1) + 'px';
}
function mobAnimTick() {
  mobAnimTickSprites();
  if (bfPaper) drawPaperdoll();
  else {
    const img = document.getElementById('player-img');
    if (img && bfPlayerSheet) drawPlayerSheet(img);
  }
  drawAllyDolls();
}

if (!bfTimer) bfTimer = setInterval(layoutBattlefield, 50);

function triggerMonsterHit(isCrit) {
  const slot = document.querySelector('.monster-slot.target:not(.dying)');
  const img = slot && slot.querySelector('img');
  if (img && img._maDef) {
    mobAnimPlay(img, 'hit', true);
    return;
  }
  const icon = img || document.getElementById('monster-icon');
  if (!icon) return;
  icon.classList.remove('monster-hit', 'crit-flash');
  void icon.offsetWidth;
  icon.classList.add('monster-hit');
  if (isCrit) icon.classList.add('crit-flash');
}

/* ---------------- 暴擊特效 ----------------
   images/effects/crit/ 底下是 15 張 96×66 的星爆圖，照順序播完一輪，
   傷害數字用黃色壓在圖的正中央（暴擊就不再另外飄一次白字了）。
------------------------------------------------- */
const CRIT_FRAME_COUNT = 15;
const CRIT_FRAME_MS = 50;
const CRIT_FLOAT_MS = 950;   // 要跟 CSS 的 critBurstArc 對齊
const CRIT_JITTER_X = 28;    // 起始位置的左右亂數範圍
/* 觸發點跟一般傷害數字一樣在怪物頭上。一般飄字是以左上角定位、字級 22px，
   星爆這組是以中心定位、字級 26px，所以要往下補半個字高，
   黃色數字才會落在跟白色飄字同一條線上。 */
const CRIT_HEAD_OFFSET_Y = -10;
const CRIT_NUM_HALF_H = 13;
/* 星爆圖高 66。疊太近會糊成一團，56 又拉得太開，取中間。 */
const CRIT_STACK_Y = 44;
const CRIT_FRAMES = Array.from({ length: CRIT_FRAME_COUNT },
  (_, i) => `images/effects/crit/msg_frame_${String(i).padStart(3, '0')}.png`);
// 先預載，否則第一次暴擊會因為還在下載而閃一下空白
CRIT_FRAMES.forEach(src => { const im = new Image(); im.src = src; });

function showCritEffect(dmgText, targetEl) {
  const host = targetEl || document.querySelector('.monster-slot.target');
  let cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.4;
  if (host) {
    const rect = host.getBoundingClientRect();
    cx = rect.left + rect.width / 2;
    cy = rect.top + CRIT_HEAD_OFFSET_Y + CRIT_NUM_HALF_H;
  }

  const wrap = document.createElement('div');
  wrap.className = 'crit-burst';
  /* 二刀連擊兩段同一個 tick 送出。一般傷害用 _floatDelayMs 把第二顆往上挪，
     暴擊以前固定在同一點，看起來像只打一下。 */
  const step = _floatDelayMs % 5;
  wrap.style.left = (cx + (Math.random() - 0.5) * CRIT_JITTER_X) + 'px';
  wrap.style.top = (cy - step * CRIT_STACK_Y) + 'px';
  _lastFloatAnchor = { left: parseFloat(wrap.style.left), top: parseFloat(wrap.style.top), at: Date.now() };
  if (step) wrap.style.animationDelay = (step * 30) + 'ms';
  _floatDelayMs++;
  wrap._resetTimer = setTimeout(() => { _floatDelayMs = 0; }, 200);

  const img = document.createElement('img');
  img.className = 'crit-burst-img';
  img.src = CRIT_FRAMES[0];
  img.alt = '';

  const num = document.createElement('span');
  num.className = 'crit-burst-num';
  num.textContent = dmgText;

  wrap.appendChild(img);
  wrap.appendChild(num);
  document.body.appendChild(wrap);

  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    // 播完就停在最後一格（星芒已經散開），剩下的交給外層的淡出
    if (frame >= CRIT_FRAME_COUNT) { clearInterval(timer); return; }
    img.src = CRIT_FRAMES[frame];
  }, CRIT_FRAME_MS);
  setTimeout(() => wrap.remove(), CRIT_FLOAT_MS + 100);
}

function triggerMonsterDie() {
  const card = document.getElementById('monster-card');
  if (!card) return;
  card.classList.add('monster-dying');
}

/* ---------------- 戰鬥日誌增強 ---------------- */
// 傷害飄字邏輯已移至 engine.js 的 logMsg 函式中處理

/* 三塊資訊欄各自畫自己的那條分流（分流規則見 engine.js 的 pushCombatLog）。
   一律只取最後 30 則，畫完捲到底。 */
const LOG_PANES = { main: 'log-main', skill: 'log-skill', ally: 'log-ally' };
/* ---------------- 戰鬥日誌（#117 效能）----------------
   以前 `logMsg()` 每寫一行就整個重畫三格日誌：3 格 × 30 列的 innerHTML
   再加一次 `scrollHeight`（強制 layout）＝**每則訊息 1.87ms**。

   一次普攻本來就會寫好幾行（傷害、屬性、被動追擊…），穿上遺物之後
   還會多出濺射、黑暗、加特林、追打——攻速 193 時每秒二三十則，
   光是重畫日誌就吃掉十幾毫秒，畫面就是這樣頓的。

   改成**合併重畫**：logMsg 只標記「髒了」，真正的 DOM 更新一個影格做一次。
   訊息本身照舊即時寫進 combatLogLanes，所以不會漏也不會亂序。 */
let _logDirty = false;
let _logRafId = 0;
function renderLog() {
  _logDirty = true;
  if (_logRafId) return;
  _logRafId = requestAnimationFrame(() => { _logRafId = 0; renderLogNow(); });
}
/* 往上捲離開底部就暫停這一欄：訊息照樣進緩衝，畫面凍住，避免正在看的行被沖掉。
   捲回底部或點提示列才補上最新並繼續跟著跑。 */
const LOG_BOTTOM_SLACK = 24;
const _logStuck = Object.create(null);
function _logAtBottom(el) {
  return (el.scrollHeight - el.scrollTop - el.clientHeight) <= LOG_BOTTOM_SLACK;
}
function syncLogPauseBar(lane) {
  const bar = document.getElementById('log-paused-' + lane);
  if (bar) bar.classList.toggle('hidden', _logStuck[lane] !== false);
}
function switchLogTab(lane) {
  if (lane !== 'world' && !LOG_PANES[lane]) return;
  document.querySelectorAll('.log-tab').forEach(b => b.classList.toggle('active', b.dataset.lane === lane));
  document.querySelectorAll('.log-pane-stack .log-pane, .combat-log .log-pane').forEach(p => {
    p.classList.toggle('active', p.dataset.lane === lane);
  });
  const paneId = LOG_PANES[lane];
  if (paneId) {
    const el = document.getElementById(paneId);
    if (el && _logStuck[lane] !== false) el.scrollTop = el.scrollHeight;
  }
  if (lane === 'world' && typeof window._worldChatOnTabShown === 'function') window._worldChatOnTabShown();
}
function resumeLogLane(lane) {
  const el = document.getElementById(LOG_PANES[lane]);
  _logStuck[lane] = true;
  _logDirty = true;
  renderLogNow();
  if (el) el.scrollTop = el.scrollHeight;
  syncLogPauseBar(lane);
}
function _ensureLogScrollWatch(lane, el) {
  if (el._roLogWatch) return;
  el._roLogWatch = true;
  el.addEventListener('scroll', () => {
    const atBottom = _logAtBottom(el);
    const was = _logStuck[lane] !== false;
    _logStuck[lane] = atBottom;
    if (atBottom && !was) { _logDirty = true; renderLogNow(); }
    syncLogPauseBar(lane);
  }, { passive: true });
}
/* 真正動 DOM 的那半。分頁在背景時 rAF 不會跑，所以 onTickUI 也會來敲一次 */
function renderLogNow() {
  if (!_logDirty) return;
  _logDirty = false;
  Object.keys(LOG_PANES).forEach(lane => {
    const el = document.getElementById(LOG_PANES[lane]);
    if (!el) return;
    _ensureLogScrollWatch(lane, el);
    if (_logStuck[lane] === false) return;
    const rows = (combatLogLanes[lane] || []).slice(-30);
    el.innerHTML = rows.map(m => `<div class="log-line">${m}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  });
}

/* ---------------- 地圖分頁 ---------------- */
let selectedRegionId = null; // 目前下拉選單一選中的地區
let selectedKingdomId = null; // 目前選中的王國

/* 地圖產出面板：左邊是拿目前素質推算這張圖的產出（不用先去打），
   右邊是從上次重置到現在的實測值。兩者算法不同，數字不會完全一致是正常的。 */
function fmtNum(n) {
  if (!isFinite(n)) return '—';
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '億';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '萬';
  if (n >= 100) return Math.round(n).toLocaleString();
  return (Math.round(n * 10) / 10).toString();
}
function fmtDur(sec) {
  const s = Math.floor(sec);
  if (s < 60) return s + ' 秒';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' 分 ' + (s % 60) + ' 秒';
  return Math.floor(m / 60) + ' 小時 ' + (m % 60) + ' 分';
}

function renderMapYieldBox(mapObj) {
  const est = typeof estimateMapYield === 'function' ? estimateMapYield(mapObj) : null;
  const act = typeof dpsStats === 'function' ? dpsStats() : null;
  const isHere = mapObj.id === state.mapId;
  // 樣本太少時比值會亂跳，滿 10 秒才顯示，否則寫「統計中」

  const estRows = est ? `
    <div class="yield-row"><span>DPS</span><b>${fmtNum(est.dps)}</b></div>
    <div class="yield-row"><span>擊殺／10分</span><b>${fmtNum(est.killsPer10m)}${est.spawnCapped ? ' <small style="color:var(--ink-dim)" title="殺得比補怪快，每隻之間會多等一次生怪的時間">(含等怪時間)</small>' : ''}</b></div>
    <div class="yield-row"><span>經驗／10分</span><b>${fmtNum(est.expPer10m)}</b></div>
    <div class="yield-row"><span>職業經驗／10分</span><b>${fmtNum(est.jobExpPer10m)}</b></div>
    <div class="yield-row"><span>金錢／10分</span><b>${fmtNum(est.goldPer10m)}z</b></div>`
    : '<div class="yield-empty">無法估算</div>';

  const actRows = (act && act.sec >= 10) ? `
    <div class="yield-row"><span>DPS</span><b>${fmtNum(act.dps)}</b></div>
    <div class="yield-row"><span>擊殺數</span><b>${fmtNum(act.kills)}</b></div>
    <div class="yield-row"><span>經驗／10分</span><b>${fmtNum(act.expPer10m)}</b></div>
    <div class="yield-row"><span>職業經驗／10分</span><b>${fmtNum(act.jobExpPer10m)}</b></div>
    <div class="yield-row"><span>金錢／10分</span><b>${fmtNum(act.goldPer10m)}z</b></div>`
    : '<div class="yield-empty">統計中…（滿 10 秒後顯示）</div>';

  return `
  <div class="map-yield-box">
    <div class="map-yield-head">
      <span class="map-yield-title">📊 產出估算</span>
      <button class="yield-reset-btn" onclick="resetDpsTracker();renderMapTab();">↺ 重置統計</button>
    </div>
    <div class="map-yield-cols">
      <div class="yield-col">
        <div class="yield-col-title">預估${isHere ? '' : '（此圖）'}</div>
        ${estRows}
      </div>
      <div class="yield-col">
        <div class="yield-col-title">實測 · ${act ? fmtDur(act.sec) : '—'}</div>
        ${actRows}
      </div>
    </div>
    <div class="map-yield-hint">預估以普通攻擊推算，已計入命中率、暴擊、屬性／體型、防禦與等級差。同圖可均分時含自己的那一份。技能傷害未計入。</div>
  </div>`;
}

function mapLvRangeText(m) {
  if (!m || !m.monsters || !m.monsters.length) return '';
  let lo = Infinity, hi = -Infinity;
  m.monsters.forEach(o => {
    const md = MONSTERS[o.id];
    if (md && md.level) { lo = Math.min(lo, md.level); hi = Math.max(hi, md.level); }
  });
  if (!isFinite(lo)) return '';
  return lo === hi ? `(Lv.${lo})` : `(Lv.${lo}~${hi})`;
}
function monTagText(m) {
  if (!m) return '';
  const el = m.element || 'neutral';
  const parts = [(ELEMENT_ICONS[el] || '') + (ELEMENT_NAMES[el] || el)];
  if (m.race && RACE_LABELS[m.race]) parts.push(RACE_LABELS[m.race]);
  else if (m.race) parts.push(m.race);
  else parts.push('種族未設定');
  if (m.size && SIZE_LABELS[m.size]) parts.push(SIZE_LABELS[m.size]);
  else parts.push('體型未設定');
  return parts.join('・');
}
function mapMonsterChip(id, extra) {
  const m = MONSTERS[id];
  if (!m) return `<span class="monster-preview-chip">[${shopEsc(id)}]</span>`;
  return `<span class="monster-preview-chip"><img class="mon-chip-img" src="${monsterImgSrc(id)}" alt="" onerror="this.onerror=null;this.src='${placeholderImgSrc('monster')}'"><span class="mon-chip-text"><b>${shopEsc(m.name)} Lv.${m.level || '?'}</b><small>${monTagText(m)}</small></span>${extra || ''}</span>`;
}
function renderMapMonsterChips(mapObj) {
  const chips = [...mapObj.monsters].sort((a, b) => b.weight - a.weight).map(o => {
    const m = MONSTERS[o.id];
    const boss = m && m.isMvp ? '<b class="mon-chip-boss mvp">👑 MVP</b>'
      : (m && m.isBoss ? '<b class="mon-chip-boss mini">迷你王</b>' : '');
    return mapMonsterChip(o.id, boss);
  }).join('');
  let bosses = '';
  if (typeof bossListOf === 'function') {
    bosses = bossListOf(mapObj.id, 'mvp').map(id => mapMonsterChip(id, '<b class="mon-chip-boss mvp">👑 MVP</b>')).join('')
      + bossListOf(mapObj.id, 'mini').map(id => mapMonsterChip(id, '<b class="mon-chip-boss mini">迷你王</b>')).join('');
  }
  const bossRow = bosses
    ? `<div class="map-boss-preview"><span class="map-boss-preview-hint">這張圖的王（要勾選下方模式才會出現）</span>${bosses}</div>`
    : '';
  return chips + bossRow;
}
function mapPetCatchLine(mapObj) {
  if (typeof PETS === 'undefined' || !mapObj || !mapObj.monsters) return '';
  const norm = id => String(id || '').replace(/_+$/, '');
  const here = {};
  mapObj.monsters.forEach(m => { here[norm(m.id)] = 1; });
  const rows = PETS.filter(p => p.tame && ITEMS[p.tame] && here[norm(p.id)]);
  if (!rows.length) return '';
  const ps = (typeof ensurePets === 'function') ? ensurePets() : (state.pets || { list: [] });
  const owned = {};
  ((ps && ps.list) || []).forEach(p => { owned[p.id] = 1; });
  const body = rows.map(p => {
    if (owned[p.id]) return `<span class="pet-catch-chip owned">${shopEsc(p.name)}（已擁有）</span>`;
    const have = getItemQty(p.tame);
    const tameName = (ITEMS[p.tame] || {}).name || p.tame;
    return `<span class="pet-catch-chip${have > 0 ? ' ready' : ''}">${shopEsc(p.name)}　需要 ${shopEsc(tameName)}${have > 0 ? `（有 ${have}）` : '（沒帶）'}</span>`;
  }).join('');
  return `<div class="map-pet-catch"><b>🐾 這張地圖可捕捉</b>${body}</div>`;
}
function huntGotoMonsterMap(monId) {
  const norm = id => String(id || '').replace(/_+$/, '');
  const want = norm(monId);
  let cands = MAPS.filter(m => (m.monsters || []).some(x => norm(x.id) === want));
  let bossOnly = false;
  if (!cands.length && typeof MVP_MAP_DATA !== 'undefined') {
    cands = MAPS.filter(m => (MVP_MAP_DATA[m.id] || []).some(id => norm(id) === want));
    bossOnly = cands.length > 0;
  }
  if (!cands.length) { showToast('查不到這隻魔物的出沒地圖'); return; }
  if (bossOnly) showToast('這是王怪：先打開迷你王或 MVP 模式，牠才會出現');
  const wOf = m => ((m.monsters || []).find(x => norm(x.id) === want) || {}).weight || 0;
  const target = cands.slice().sort((a, b) => wOf(b) - wOf(a))[0];
  const rg = regionOf(target.id);
  if (rg) {
    selectedRegionId = rg.id;
    const kd = KINGDOMS.find(k => k.regions.indexOf(rg.id) >= 0);
    if (kd) selectedKingdomId = kd.id;
  }
  selectMap(target.id);
  switchTab('map');
}

let huntBand = null;
let _huntSig = '';
let _attendanceSig = '';
let _petsSig = '';
function setHuntBand(v) { huntBand = v; renderQuestsTab(); }
function huntTabSig() {
  const hb = state && state.huntBoard;
  if (!hb || !hb.q) return '';
  return hb.q.map(e => {
    const p = (typeof huntProgress === 'function' && huntProgress(e)) || [];
    return e.id + ':' + p.map(x => x.have).join(',');
  }).join('|') + '#' + (hb.noAuto || 0);
}
function attendanceSig() {
  const at = (state && state.attendance) || { day: 0, n: 0 };
  return at.day + ':' + at.n;
}
function petsSig() {
  const ps = (state && state.pets) || { list: [] };
  const foodId = ps.active && typeof PETS_BY_ID !== 'undefined' && PETS_BY_ID[ps.active] && PETS_BY_ID[ps.active].food;
  const food = foodId ? getItemQty(foodId) : 0;
  return (ps.active || '') + ':' + food + '|' + (ps.list || []).map(p => p.id + ':' + p.intim).join(',');
}
function petBonusText(def, tier) {
  const b = (def && def[tier]) || {};
  const bits = Object.keys(b).map(k => formatCardBonus(k, b[k], b)).filter(Boolean);
  return bits.length ? bits.join('、') : '—';
}
function petReleaseClick(btn, id) {
  if (!btn) return;
  if (btn.dataset.armed === '1') {
    clearTimeout(Number(btn.dataset.armTimer) || 0);
    releasePet(id, true);
    setTimeout(renderPetsTab, 350);
    renderTopBar();
    return;
  }
  btn.dataset.armed = '1';
  btn.classList.add('danger');
  btn.textContent = '⚠ 再按一次確定';
  const t = setTimeout(() => {
    if (!btn.isConnected) return;
    btn.dataset.armed = '';
    btn.classList.remove('danger');
    btn.textContent = '放生';
    logMsg('ℹ️ 放生取消了（超過 12 秒沒有再按一次）。');
  }, 12000);
  btn.dataset.armTimer = String(t);
}
function doEvolvePet(id) {
  const ps = state.pets || { list: [] };
  const rec = (ps.list || []).find(x => x.id === id);
  const def = rec && PETS_BY_ID[id];
  if (!rec || !def || !def.evo) return;
  const to = (PETS_BY_ID[def.evo.to] || { name: def.evo.to }).name;
  const mats = def.evo.items.map(([i, n]) => `${(ITEMS[i] || { name: i }).name}×${n}`).join('、');
  let msg = `要把${def.name}進化成「${to}」嗎？\n\n消耗：${mats}\n\n⚠ 進化後親密度會從 ${rec.intim} 回到 750。\n`;
  if (petTier(rec) === 'loyal') msg += '⚠ 你現在是「忠誠」，進化後會變回「親密」。\n';
  msg += '\n這個動作沒辦法還原。';
  if (!confirm(msg)) return;
  evolvePet(id);
  setTimeout(renderPetsTab, 350);
}
function renderPetsTab() {
  const el = document.getElementById('tab-pets');
  if (!el || !state) return;
  const ps = ensurePets();
  const tierLabel = t => t === 'loyal' ? '💖 忠誠' : t === 'cordial' ? '💕 親密' : '🤍 生疏';
  let html = `<h3 class="panel-title">🐾 寵物</h3>
    <div class="empty-hint">在寵物出沒的地圖使用捕捉道具。帶著的寵物每 5 分鐘自動吃 1 個飼料，親密度 750／910 解鎖兩段加成。寵物只給素質，不上場打。</div>`;
  const eggs = (state.inventory || []).filter(r => ITEMS[r.item] && isHatchableEgg(r.item) && !r.instanceId);
  if (eggs.length) {
    const hasInc = getItemQty('pet_incubator') > 0;
    html += `<div class="empty-hint">🥚 <b>孵化寵物蛋</b>${hasInc ? '' : '（需背包放一個攜帶用孵蛋器，孵化不消耗它）'}</div><div class="acv-list">`;
    eggs.forEach(r => {
      const pd = PETS_BY_ID[petIdForEgg(r.item)] || { name: r.item };
      html += `<div class="acv-row"><div class="acv-body"><div class="acv-name">${shopEsc(pd.name)} 蛋 ×${r.qty.toLocaleString()}</div></div>
        <div class="acv-side"><button class="btn-small${hasInc ? ' active' : ''}" ${hasInc ? '' : 'disabled'} onclick="useItem('${r.item}');setTimeout(renderPetsTab,350);">孵化</button></div></div>`;
    });
    html += '</div>';
  }
  if (!ps.list.length) {
    html += '<div class="empty-hint">還沒有寵物。下面是可捕捉一覽，捕捉道具在城鎮的寵物商人。</div>';
  } else {
    html += '<div class="acv-list">';
    ps.list.forEach(rec => {
      const def = PETS_BY_ID[rec.id];
      if (!def) return;
      const mdef = MONSTERS[rec.id] || {};
      const tier = petTier(rec);
      const isOn = ps.active === rec.id;
      const pc = Math.min(100, rec.intim / 1000 * 100);
      const evoName = def.evo ? (PETS_BY_ID[def.evo.to] || { name: def.evo.to }).name : '';
      const evoShort = String(evoName).replace(/（[^）]*）\s*$/, '');
      const evoTxt = def.evo
        ? `<button class="btn-small" onclick="doEvolvePet('${rec.id}')" title="進化成「${shopEsc(evoName)}」。親密度會回到 750">進化 → ${shopEsc(evoShort)}</button>` : '';
      html += `<div class="acv-row pet-row ${isOn ? 'done' : ''}">
        <div class="acv-icon">${mdef.icon || '🐾'}</div>
        <div class="acv-body">
          <div class="acv-name">${shopEsc(def.name)}${isOn ? ' <span class="acv-check">跟隨中</span>' : ''}　<span class="acv-desc">${tierLabel(tier)}</span></div>
          <div class="acv-desc">親密度 ${rec.intim} / 1000　飼料：${shopEsc((ITEMS[def.food] || { name: def.food }).name)}（背包 ${getItemQty(def.food)}）</div>
          <div class="acv-bar"><div class="acv-bar-fill" style="width:${pc}%"></div></div>
          <div class="acv-desc">親密：${petBonusText(def, 'cordial')}　|　忠誠：${petBonusText(def, 'loyal')}</div>
        </div>
        <div class="acv-side">
          ${isOn
            ? `<button class="btn-small" onclick="setActivePet('');setTimeout(renderPetsTab,350);">收回</button>`
            : `<button class="btn-small active" onclick="setActivePet('${rec.id}');setTimeout(renderPetsTab,350);">帶上</button>`}
          ${evoTxt}
          <button class="btn-small pet-release" onclick="petReleaseClick(this,'${rec.id}')">放生</button>
        </div>
      </div>`;
    });
    html += '</div>';
  }
  if (typeof PETS !== 'undefined') {
    const owned = new Set(ps.list.map(x => x.id));
    const mvp = (typeof MVP_MAP_DATA !== 'undefined' && MVP_MAP_DATA) || {};
    const hasSpot = id => MAPS.some(m => (m.monsters || []).some(x => x.id === id))
      || MAPS.some(m => (mvp[m.id] || []).indexOf(id) >= 0);
    let nTame = 0, nEvo = 0, nOwnedTame = 0, nOwnedEvo = 0, nReady = 0;
    PETS.forEach(def => {
      const isOwned = owned.has(def.id);
      if (def.tame) {
        nTame++; if (isOwned) nOwnedTame++;
        if (!isOwned && getItemQty(def.tame) > 0 && hasSpot(def.id)) nReady++;
      } else {
        nEvo++; if (isOwned) nOwnedEvo++;
      }
    });
    const nAll = PETS.length;
    const pcAll = nAll ? Math.round(owned.size / nAll * 100) : 0;
    html += `<h3 class="panel-title">📖 收集進度</h3>
      <div class="pet-progress">
        <div class="pet-progress-top"><b>${owned.size}</b> / ${nAll} 種　<span>${pcAll}%</span></div>
        <div class="acv-bar"><div class="acv-bar-fill" style="width:${pcAll}%"></div></div>
        <div class="pet-progress-sub">可直接捕捉 ${nOwnedTame}/${nTame}　·　只能靠進化 ${nOwnedEvo}/${nEvo}${nReady > 0 ? `　·　<b class="pet-ready">現在就抓得到 ${nReady} 隻</b>` : ''}</div>
      </div>
      <h3 class="panel-title">📖 可捕捉一覽（${nAll} 種）</h3><div class="acv-list">`;
    PETS.forEach(def => {
      const mdef = MONSTERS[def.id] || {};
      const normalMaps = MAPS.filter(m => (m.monsters || []).some(x => x.id === def.id));
      const bossMaps = MAPS.filter(m => (mvp[m.id] || []).indexOf(def.id) >= 0);
      const spots = normalMaps.length
        ? normalMaps.slice(0, 2).map(m => m.name).join('、')
        : (bossMaps.length ? bossMaps.slice(0, 2).map(m => m.name).join('、') + '（要開迷你王／MVP 模式）' : '尚無已知出沒地');
      const tameQty = def.tame ? getItemQty(def.tame) : 0;
      const canGo = !owned.has(def.id) && def.tame && (normalMaps.length || bossMaps.length);
      const catchTxt = def.tame
        ? `捕捉道具：${shopEsc((ITEMS[def.tame] || { name: def.tame }).name)}（背包 ${tameQty}）　成功率 ${(def.cap / 100).toFixed(1)}%　出沒：${shopEsc(spots)}`
        : '無法直接捕捉，由前一階段進化取得';
      const goBtn = canGo
        ? `<button class="btn-small${tameQty > 0 ? ' active' : ''}" onclick="huntGotoMonsterMap('${def.id}')" title="${tameQty > 0 ? '跳到牠出沒的地圖' : '背包還沒有捕捉道具，可先找寵物商人'}">前往${tameQty > 0 ? '' : '（缺道具）'}</button>`
        : '';
      const evoLine = def.evo && PETS_BY_ID[def.evo.to]
        ? `<div class="acv-desc">可進化成 ${shopEsc(PETS_BY_ID[def.evo.to].name)}</div>` : '';
      html += `<div class="acv-row ${owned.has(def.id) ? 'done' : ''}">
        <div class="acv-icon">${mdef.icon || '🐾'}</div>
        <div class="acv-body">
          <div class="acv-name">${shopEsc(def.name)}${owned.has(def.id) ? ' <span class="acv-check">✔ 已收服</span>' : (tameQty > 0 ? ' <span class="acv-check">道具已備妥</span>' : '')}</div>
          <div class="acv-desc">${catchTxt}</div>
          <div class="acv-desc">親密：${petBonusText(def, 'cordial')}</div>
          <div class="acv-desc">忠誠：${petBonusText(def, 'loyal')}</div>
          ${evoLine}
        </div>
        <div class="acv-side">${goBtn}</div>
      </div>`;
    });
    html += '</div>';
  }
  el.innerHTML = html;
  _petsSig = petsSig();
}
function renderAttendanceCard() {
  if (typeof ATTENDANCE_REWARDS === 'undefined' || !ATTENDANCE_REWARDS.length || !state) return '';
  const day = Math.floor((Date.now() + 8 * 3600 * 1000) / 86400000);
  const at = state.attendance || { day: 0, n: 0 };
  const len = ATTENDANCE_REWARDS.length;
  const nextIdx = at.n % len;
  const claimedToday = at.day === day;
  const cells = ATTENDANCE_REWARDS.map((r, i) => {
    const def = ITEMS[r[0]] || {};
    const got = i < nextIdx;
    const isNext = i === nextIdx;
    const nm = def.name || r[0];
    const tag = got ? '✔ 已領' : (isNext ? (claimedToday ? '明日' : '今日') : '');
    return `<div class="att-cell ${got ? 'got' : ''} ${isNext ? 'next' : ''}"
        onmouseenter="showShopItemTooltip(event,'${r[0]}')" onmouseleave="hideEquipTooltip()"
        onclick="showShopItemTooltip(event,'${r[0]}')">
        <div class="att-day">第${i + 1}天</div>
        <img src="${itemImgSrc(r[0])}" alt="${shopEsc(nm)}" onerror="this.onerror=null;this.src='${placeholderImgSrc('item')}'">
        <div class="att-name">${shopEsc(nm)}</div>
        <div>×${r[1]}</div>
        <div class="att-tag">${tag || '　'}</div>
      </div>`;
  }).join('');
  const status = claimedToday
    ? `今日已簽到。累計 <b>${at.n}</b> 天，明日上線自動領下一份。`
    : `今日還沒簽到。累計 <b>${at.n}</b> 天。掛機後自動發進背包。`;
  return `<div class="empty-hint">${status} ${len} 天一輪，不用按領取。點格子可看道具說明。</div>
    <div class="att-grid">${cells}</div>`;
}
function openAttendanceModal() {
  const m = document.getElementById('attendance-modal');
  if (!m) return;
  renderAttendanceModal();
  m.classList.remove('hidden');
}
function closeAttendanceModal() {
  const m = document.getElementById('attendance-modal');
  if (m) m.classList.add('hidden');
}
function renderAttendanceModal() {
  const el = document.getElementById('attendance-modal-body');
  if (!el || !state) return;
  el.innerHTML = renderAttendanceCard();
  _attendanceSig = attendanceSig();
}
function renderAttendanceTab() {
  renderAttendanceModal();
}
function renderQuestsTab() {
  const el = document.getElementById('tab-quests');
  if (!el || !state) return;
  const hb = ensureHuntBoard();
  let html = `<h3 class="panel-title">📜 討伐佈告欄</h3>
    <div class="empty-hint">接下之後，擊殺目標會自動計數。完成後回來領。不想做可以放棄換一張。</div>`;
  if (!hb.q.length) html += '<div class="empty-hint">佈告欄是空的，稍等幾秒會貼上新的。</div>';
  html += '<div class="acv-list">';
  hb.q.forEach((entry, i) => {
    const q = huntQuestById(entry.id);
    if (!q) return;
    const prog = huntProgress(entry) || [];
    const doneAll = prog.length && prog.every(p => p.have >= p.need);
    const r = huntQuestReward(q);
    const rows = prog.map(p => {
      const d = MONSTERS[p.mon] || {};
      const pc = Math.min(100, p.have / p.need * 100);
      const go = p.have >= p.need ? '' : `<button class="btn-small" onclick="huntGotoMonsterMap('${p.mon}')">前往</button>`;
      return `<div class="acv-desc">${d.icon || '👾'} ${shopEsc(d.name || p.mon)}　${p.have} / ${p.need} ${go}</div>
        <div class="acv-bar"><div class="acv-bar-fill" style="width:${pc}%"></div></div>`;
    }).join('');
    html += `<div class="acv-row ${doneAll ? 'done' : ''}">
      <div class="acv-icon">📜</div>
      <div class="acv-body">
        <div class="acv-name">${shopEsc(q.n)}${doneAll ? ' <span class="acv-check">✔</span>' : ''}　<span class="acv-desc">建議 Lv.${q.lv}</span></div>
        ${rows}
        <div class="acv-desc">獎勵：EXP ${r.exp.toLocaleString()}　JOB ${r.jexp.toLocaleString()}　${r.zeny.toLocaleString()} 鋅幣</div>
      </div>
      <div class="acv-side">
        ${doneAll
          ? `<button class="btn-small active" onclick="huntClaim(${i});renderQuestsTab();renderTopBar();">領取獎勵</button><button class="btn-small" onclick="huntClaimRepeat(${i});renderQuestsTab();renderTopBar();">領取並再刷</button>`
          : `<button class="btn-small" onclick="huntAbandon(${i});renderQuestsTab();">放棄</button>`}
      </div>
    </div>`;
  });
  html += '</div>';
  const pool = huntEligiblePool(true).slice().sort((a, b) => a.lv - b.lv);
  const full = hb.q.length >= HUNT_BOARD_SLOTS;
  const BAND = 10;
  const bandOf = lv => Math.floor(lv / BAND) * BAND;
  const bandCount = {};
  pool.forEach(q2 => { const b = bandOf(q2.lv); bandCount[b] = (bandCount[b] || 0) + 1; });
  const bands = Object.keys(bandCount).map(Number).sort((a, b) => a - b);
  const myBand = bandOf(state.baseLevel || 1);
  let band = huntBand;
  if (band === null || (band !== 'all' && !bandCount[band])) {
    if (bandCount[myBand]) band = myBand;
    else if (bands.length) band = bands.reduce((best, b) => Math.abs(b - myBand) < Math.abs(best - myBand) ? b : best, bands[0]);
    else band = 'all';
  }
  const shown = band === 'all' ? pool : pool.filter(q2 => bandOf(q2.lv) === band);
  const bandLabel = b => `Lv.${b || 1}～${b + BAND - 1}`;
  html += `<div class="acv-row">
    <div class="acv-icon">📋</div>
    <div class="acv-body">
      <div class="acv-name">自選討伐令</div>
      <div class="acv-desc">放棄後 30 秒內不會自動補單。</div>
      <div class="hunt-pick-row">
        <select class="ab-select" onchange="setHuntBand(this.value === 'all' ? 'all' : +this.value)">
          <option value="all" ${band === 'all' ? 'selected' : ''}>全部等級（${pool.length}）</option>
          ${bands.map(b => `<option value="${b}" ${band === b ? 'selected' : ''}>${bandLabel(b)}（${bandCount[b]}）${b === myBand ? '　目前' : ''}</option>`).join('')}
        </select>
        <select id="hunt-pick-sel" class="ab-select">
          ${shown.map(q2 => `<option value="${q2.id}">Lv.${q2.lv}　${shopEsc(q2.n)}</option>`).join('')}
        </select>
        <button class="btn-small" ${full || !shown.length ? 'disabled' : ''} onclick="huntPick(+document.getElementById('hunt-pick-sel').value);renderQuestsTab();">接取</button>
      </div>
      ${full ? '<div class="empty-hint">佈告欄已滿，先放棄一張才能自選。</div>' : ''}
    </div>
  </div>`;
  el.innerHTML = html;
  _huntSig = huntTabSig();
}

function renderMapTab() {
  const el = document.getElementById('tab-map');
  if (!selectedRegionId) {
    const cur = regionOf(state.mapId);
    selectedRegionId = cur ? cur.id : REGIONS[0].id;
  }
  // 自動選取所屬王國
  if (!selectedKingdomId) {
    const k = KINGDOMS.find(k => k.regions.includes(selectedRegionId));
    selectedKingdomId = k ? k.id : KINGDOMS[0].id;
  }
  const kingdom = KINGDOMS.find(k => k.id === selectedKingdomId) || KINGDOMS[0];
  // 篩選屬於該王國的區域
  const filteredRegions = REGIONS.filter(r => kingdom.regions.includes(r.id));
  const region = filteredRegions.find(r => r.id === selectedRegionId) || filteredRegions[0] || REGIONS[0];

  const kingdomOptions = KINGDOMS.map(k =>
    `<option value="${k.id}" ${k.id === kingdom.id ? 'selected' : ''}>${k.icon} ${k.name}</option>`
  ).join('');

  const regionOptions = filteredRegions.map(r =>
    `<option value="${r.id}" ${r.id === region.id ? 'selected' : ''}>${r.icon} ${r.name}</option>`
  ).join('');

  const mapIds = typeof regionMapIds === 'function' ? regionMapIds(region) : region.maps;
  const mapOptions = mapIds.map(mapId => {
    const m = MAPS.find(x => x.id === mapId);
    if (!m) return '';
    const isCity = m.monsters.length === 0;
    const lv = isCity ? '' : (' ' + mapLvRangeText(m));
    return `<option value="${m.id}" ${state.mapId === m.id ? 'selected' : ''}>${m.name}${isCity ? '（安全區）' : lv}</option>`;
  }).join('');

  const currentMapObj = MAPS.find(x => x.id === state.mapId) || MAPS.find(x => x.id === mapIds[0]);
  if (!currentMapObj) { el.innerHTML = '<div class="empty-hint">地圖資料錯誤</div>'; return; }
  const isCity = currentMapObj.monsters.length === 0;
  const monsterPreview = isCity ? '' : renderMapMonsterChips(currentMapObj);

  el.innerHTML = `
    <h3 class="panel-title">選擇地區
      <button class="btn-small map-home-btn" onclick="goNearestSafeZone()"
        title="回到本區的安全區；這一區沒有的話回普隆德拉">🏠 回安全區</button>
    </h3>
    <div class="map-select-group">
      <label class="map-select-label">王國/大陸</label>
      <select class="map-select" onchange="onKingdomSelectChange(this.value)">${kingdomOptions}</select>
    </div>
    <div class="map-select-group">
      <label class="map-select-label">地區</label>
      <select class="map-select" onchange="onRegionSelectChange(this.value)">${regionOptions}</select>
    </div>
    <div class="map-select-group">
      <label class="map-select-label">地點</label>
      <select class="map-select" onchange="selectMap(this.value)">${mapOptions}</select>
    </div>
    <div class="region-subtitle-detail">${region.subtitle}</div>
    ${isCity ? '' : `<div class="map-preview-box">
      <div class="map-preview-title">⚔️ 遇怪列表：${currentMapObj.name} ${mapLvRangeText(currentMapObj)}</div>
      <div class="map-preview-body">${monsterPreview}</div>
      ${!isCity ? mapPetCatchLine(currentMapObj) : ''}
      <div class="map-preview-hint">怪物強度不設限，越級挑戰有風險，也可能有意外的收穫——探索本身就是樂趣！</div>
    </div>`}
    ${!isCity ? renderMapYieldBox(currentMapObj) : ''}
    ${!isCity ? bossModeBox(currentMapObj) : ''}
    ${/* 轉生祭壇只開在安全區。放在這裡而不是轉職樹，是因為轉生是「回到城裡辦一件大事」，
          跟商店同一個場景；而且要先擋在安全區，玩家就不會在野外打到一半按下去 */
      isCity ? renderRebirthPanel() : ''}
    ${isCity ? `
    <div class="town-npcs">
      <h4 class="town-npc-title">🏪 城鎮 NPC</h4>
      <div class="town-npc-list">
        ${/* 直接由 NPC_SHOPS 產生，之後新增商店不用再回來改這裡 */
          Object.keys(NPC_SHOPS).map(id => {
            const shop = NPC_SHOPS[id];
            return `<div class="town-npc-card" onclick="openNpcShop('${id}');">
              <div class="town-npc-icon">${shop.icon}</div>
              <div class="town-npc-name">${shop.name}</div>
              <div class="town-npc-hint">${shop.getItems().length} 項商品</div>
            </div>`;
          }).join('')}
      </div>
    </div>
    ` : ''}`;
}

function onKingdomSelectChange(kingdomId) {
  selectedKingdomId = kingdomId;
  const kingdom = KINGDOMS.find(k => k.id === kingdomId);
  if (kingdom && kingdom.regions.length > 0) {
    selectedRegionId = kingdom.regions[0];
    const region = REGIONS.find(r => r.id === selectedRegionId);
    if (region) selectMap(typeof regionDefaultMapId === 'function' ? regionDefaultMapId(region) : region.maps[0]);
  }
  renderMapTab();
}

function onRegionSelectChange(regionId) {
  selectedRegionId = regionId;
  // 自動更新所屬王國
  const k = KINGDOMS.find(k => k.regions.includes(regionId));
  if (k) selectedKingdomId = k.id;
  const region = REGIONS.find(r => r.id === regionId);
  selectMap(typeof regionDefaultMapId === 'function' ? regionDefaultMapId(region) : region.maps[0]);
}

/* 打寶模式（#110）。放在自動戰鬥分頁而不是地圖分頁——它是全域的模式，
   跟地圖無關（BOSS 模式綁在有 MVP 的圖，那個才該留在地圖頁）。

   三顆按鈕互斥。沒到進階二轉的話整區還是畫出來，但按鈕鎖住並寫出理由——
   直接不顯示的話玩家不會知道有這個東西，也不知道要怎麼開（#61 那個教訓）。 */
function renderFarmModeSection() {
  const cur = farmMode();
  const ok = farmModeUnlocked();
  const btn = (m, label) => `<button class="btn-small ${cur === m ? 'active' : ''}"
    ${ok || m === FARM_MODE_OFF ? '' : 'disabled'}
    onclick="doSetFarmMode(${m})">${label}</button>`;
  const mult = FARM_MODE_MULT[cur];
  return `<div class="ab-section">
    <h4 class="ab-section-title">🔥 打寶模式</h4>
    <div class="ab-mode-btns">
      ${btn(FARM_MODE_OFF, '關閉')}
      ${btn(FARM_MODE_NORMAL, '一般')}
      ${btn(FARM_MODE_MAD, '瘋狂')}
    </div>
    ${ok ? '' : '<div class="ab-info-text">要轉到<b>進階二轉</b>才開得了——99 級之後的每一級都靠它。</div>'}
    <div class="ab-info-text">${mult
      ? `怪物 HP ×${mult.hp}、傷害 ×${mult.atk}、防禦 ×${mult.def}、命中 +${mult.hitFlat}（你的迴避率 −${mult.hitFlat}%）；
         經驗與金錢 ×${mult.exp}、掉落率 ×${mult.drop}、補怪快 ${Math.round((1 - mult.spawn) * 100)}%。`
      : '怪物維持原本強度。開啟後怪會變硬，但經驗與掉落大幅提高。'}</div>
    <div class="ab-info-text dim">切換模式會清掉場上的怪重生（血量是生怪當下算的）。</div>
  </div>`;
}
function doSetFarmMode(m) {
  setFarmMode(m);
  applyFarmModeTheme();
  renderAutoBattleTab();
  renderTopBar();
}
/* 介面染色（#111）。掛在 body 上覆寫 CSS 變數，所以整個畫面（面板、分頁、
   浮動視窗）一起換色，不必逐一改樣式。也在每秒的 UI 心跳裡對一次——
   讀檔、轉職被降階那類路徑不必各自記得呼叫。 */
function applyFarmModeTheme() {
  const m = typeof farmMode === 'function' ? farmMode() : 0;
  document.body.classList.toggle('farm-normal', m === FARM_MODE_NORMAL);
  document.body.classList.toggle('farm-mad', m === FARM_MODE_MAD);
}

/* ---------------- 自動戰鬥分頁 ---------------- */
function renderAutoBattleTab() {
  const el = document.getElementById('tab-autobattle');
  if (!el) return;

  const job = currentJob();
  const config = state.autoSkillConfig || { skillId: null, mode: 'once', spThreshold: 30 };

  /* 收集現在能用的主動技能。走 usableSkillEntries()，所以卡片賦予的技能
     也設得成自動施放（來源標成「卡片」）。
     不排除 isQuest：任務技能只是「不能加點」，主動攻擊技能（衝鋒箭、手推車攻擊）
     一樣該能設成自動施放；被動的任務技能本來就會被 type 過濾掉。 */
  const allJobs = getAllLearnedJobs();
  const jobNameOf = id => {
    for (const jid of allJobs) {
      const jd = JOB_TREE[jid];
      if (jd && jd.skills.some(s => s.id === id)) return jd.name;
    }
    return '卡片';
  };
  /* 分類走引擎的 isAttackSkill()／isAutoSupportSkill()（#101）。
     這裡本來自己抄了一份類型白名單，跟引擎那份各走各的——
     結果新職業的技能類型沒補進來就整組勾不到：鍊金術士 8 個、
     吟遊詩人與舞孃的歌謠、賢者的屬性附加與元素領域、教授、聖殿十字軍…
     現在只維護「攻擊」那份，其餘非被動一律進輔助區。 */
  const attackSkills = [], supportSkills = [];
  usableSkillEntries().forEach(({ sk, lv }) => {
    const row = { ...sk, lv, jobName: jobNameOf(sk.id) };
    if (isAttackSkill(sk)) attackSkills.push(row);
    else if (isAutoSupportSkill(sk)) supportSkills.push(row);
  });

  // 藥水設定 - 兩個下拉選單
  const hpThreshold = state.autoPotion.hpThreshold || 50;
  const currentPrimary = state.autoPotion.primary || '';
  const currentFallback = state.autoPotion.fallback || 'red_potion';

  /* 下拉1：背包回復道具。只認結構化欄位——以前還會用 desc 有沒有「恢復」字樣補一票進來，
     但 useItem() 已經不再從 desc 猜回復量了，那種道具選進來只會每次都用失敗。 */
  const invHealItems = state.inventory.filter(row => {
    if (row.instanceId) return false;
    const d = ITEMS[row.item];
    return !!d && !!(d.heal || d.restoreSp || d.healPct || d.restoreSpPct);
  });
  const invOptions = invHealItems.map(row => {
    const def = ITEMS[row.item];
    const bits = [];
    if (def.heal) bits.push(`恢復${def.heal}HP`);
    if (def.healPct) bits.push(`恢復${def.healPct}%HP`);
    if (def.restoreSp) bits.push(`恢復${def.restoreSp}SP`);
    if (def.restoreSpPct) bits.push(`恢復${def.restoreSpPct}%SP`);
    return `<option value="${row.item}" ${currentPrimary === row.item ? 'selected' : ''}>${def.name} (${bits.join('、')}) x${row.qty}</option>`;
  }).join('');

  // 下拉2：4種固定藥水
  const potionOptions = POTION_TIERS.map(tier => {
    const def = ITEMS[tier];
    const effect = def.heal ? `恢復${def.heal}HP` : `恢復${def.restoreSp}SP`;
    const qty = getItemQty(tier);
    return `<option value="${tier}" ${currentFallback === tier ? 'selected' : ''}>${def.name} (${effect}) 持有${qty}</option>`;
  }).join('');

  // ---- SP 藥水設定（結構比照 HP：第一格背包任選、第二格藍水）----
  const spCfg = state.autoSpPotion || { enabled: false, primary: '', fallback: 'blue_potion', spThreshold: 30 };
  const spThreshold = spCfg.spThreshold || 30;
  const invSpItems = state.inventory.filter(row => {
    if (row.instanceId) return false;
    const d = ITEMS[row.item];
    return !!d && (d.restoreSp > 0 || d.restoreSpPct > 0);
  });
  const invSpOptions = invSpItems.map(row => {
    const def = ITEMS[row.item];
    const eff = def.restoreSp ? `恢復${def.restoreSp}SP` : `恢復${def.restoreSpPct}%SP`;
    return `<option value="${row.item}" ${spCfg.primary === row.item ? 'selected' : ''}>${def.name} (${eff}) x${row.qty}</option>`;
  }).join('');
  const aspdCfg = state.autoAspdPotion || { enabled: false, items: [] };
  const spFallbackDef = ITEMS['blue_potion'];
  const spFallbackOption = spFallbackDef
    ? `<option value="blue_potion" selected>${spFallbackDef.name} (恢復${spFallbackDef.restoreSp}SP) 持有${getItemQty('blue_potion')}</option>`
    : '';

  // 攻擊技能下拉選項
  const attackOptions = attackSkills.map(sk =>
    `<option value="${sk.id}" ${config.skillId === sk.id ? 'selected' : ''}>[${sk.jobName}] ${sk.name} Lv${sk.lv}</option>`
  ).join('');
  const attackOptions2 = attackSkills.map(sk =>
    `<option value="${sk.id}" ${config.skillId2 === sk.id ? 'selected' : ''}>[${sk.jobName}] ${sk.name} Lv${sk.lv}</option>`
  ).join('');

  // 輔助技能勾選
  const supportRows = supportSkills.map(sk => {
    const enabled = state.autoSupportSkills && state.autoSupportSkills[sk.id];
    const spCost = Array.isArray(sk.spCost) ? sk.spCost[sk.lv - 1] : sk.spCost;
    // 顯示卡片修正後的冷卻（#55），不然畫面數字跟實際等待時間對不上
    const cd = effectiveCooldownMs(sk.id, Array.isArray(sk.cooldown) ? sk.cooldown[sk.lv - 1] : sk.cooldown) / 1000;
    let healCfgHtml = '';
    if (sk.type === 'heal') {
      const healCfg = (state.autoHealConfig && state.autoHealConfig[sk.id]) || { hpThreshold: 70, spThreshold: 0 };
      healCfgHtml = `<span class="support-skill-heal-cfg">
        HP% ≤ <input type="number" min="1" max="99" value="${healCfg.hpThreshold}" style="width:3.5em" onchange="setAutoHealHpThreshold('${sk.id}', this.value)">才施放
        ・ SP% ≥ <input type="number" min="0" max="100" value="${healCfg.spThreshold}" style="width:3.5em" onchange="setAutoHealSpThreshold('${sk.id}', this.value)">才施放
      </span>`;
    }
    return `<div class="support-skill-row ${enabled ? 'enabled' : ''}">
      <label class="support-skill-toggle">
        <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleAutoSupportSkill('${sk.id}', this.checked);">
        <span class="support-skill-info">
          <span class="support-skill-name">${typeof skillDisplayName === 'function' ? skillDisplayName(sk) : sk.name} Lv${sk.lv}</span>
          <span class="support-skill-desc">${sk.desc}</span>
          <span class="support-skill-cost">SP ${spCost} ・ 冷卻 ${cd}s</span>
          ${healCfgHtml}
        </span>
      </label>
    </div>`;
  }).join('');

  el.innerHTML = `
    <h3 class="panel-title">⚔️ 自動戰鬥設定</h3>

    <!-- 狀態概覽 -->
    <div class="ab-status">
      <div class="ab-hp">
        <div class="ab-bar-label">HP ${Math.floor(state.hp)}/${state.maxHp}</div>
        <div class="bar-track"><div class="bar-fill hp-fill" style="width:${pct(state.hp, state.maxHp)}%"></div></div>
      </div>
      <div class="ab-sp">
        <div class="ab-bar-label">SP ${Math.floor(state.sp)}/${state.maxSp}</div>
        <div class="bar-track"><div class="bar-fill sp-fill" style="width:${pct(state.sp, state.maxSp)}%"></div></div>
      </div>
      <div class="ab-info-row">
        <span>ATK ${state.atk}</span>
        <span>MATK ${state.matkMin}~${state.matkMax}</span>
        <span>DEF ${state.def}</span>
        <span>ASPD ${state.aspd}</span>
      </div>
    </div>

    <!-- 遇怪模式 -->
    <div class="ab-section">
      <h4 class="ab-section-title">⚔️ 遇怪模式</h4>
      <div class="ab-mode-btns">
        <button class="btn-small ${(state.encounterMode || 'melee') === 'melee' ? 'active' : ''}" onclick="setEncounterMode('melee')">近戰模式（最多5隻）</button>
        <button class="btn-small ${state.encounterMode === 'ranged' ? 'active' : ''}" onclick="setEncounterMode('ranged')">遠攻模式（1隻）</button>
        <button class="btn-small ${state.encounterMode === 'off' ? 'active' : ''}" onclick="setEncounterMode('off')">不遇怪(無離線收益)</button>
      </div>
      <div class="ab-info-text">
        ${state.encounterMode === 'off'
          ? '不遇怪：不會生成怪物，場上的也會清掉。'
          : state.encounterMode === 'ranged'
            ? '遠攻：怪物死後才會再生下一隻。'
            : '近戰：0隻時0.5秒補一批、1隻以上時3秒補一批，每批隨機 1~3 隻，場上最多5隻。'}
      </div>
    </div>

    ${renderFarmModeSection()}

    ${sageConverterHtml()}

    <!-- 攻擊技能設定 -->
    <div class="ab-section">
      <h4 class="ab-section-title">🗡️ 攻擊技能</h4>
      <label class="auto-toggle"><input type="checkbox" ${state.autoSkill ? 'checked' : ''} onchange="state.autoSkill=this.checked;saveGame();"> 自動施放技能</label>
      <div class="ab-attack-config">
        <!-- 第一招 -->
        <div class="ab-skill-slot">
          <div class="ab-skill-slot-label">第一招</div>
          <div class="ab-config-row">
            <label class="ab-config-label">選擇技能</label>
            <select class="ab-select" onchange="setAutoSkillConfig('skillId', this.value)">
              <option value="">不使用技能</option>
              ${attackOptions}
            </select>
          </div>
          ${config.skillId ? `
          <div class="ab-config-row">
            <label class="ab-config-label">SP 保留 %</label>
            <input type="range" class="ab-slider" min="5" max="90" value="${config.spThreshold}"
              oninput="setAutoSkillConfig('spThreshold', parseInt(this.value));document.getElementById('sp-threshold-val').textContent=this.value+'%'">
            <span id="sp-threshold-val" class="ab-slider-val">${config.spThreshold}%</span>
          </div>
          ` : ''}
        </div>
        <!-- 第二招 -->
        <div class="ab-skill-slot">
          <div class="ab-skill-slot-label">第二招（範圍技推薦）</div>
          <div class="ab-config-row">
            <label class="ab-config-label">選擇技能</label>
            <select class="ab-select" onchange="setAutoSkillConfig('skillId2', this.value)">
              <option value="">不使用技能</option>
              ${attackOptions2}
            </select>
          </div>
          <div class="ab-config-row">
            <label class="ab-config-label">SP 保留 %</label>
            <input type="range" class="ab-slider" min="5" max="90" value="${config.spThreshold2}"
              oninput="setAutoSkillConfig('spThreshold2', parseInt(this.value));document.getElementById('sp-threshold2-val').textContent=this.value+'%'">
            <span id="sp-threshold2-val" class="ab-slider-val">${config.spThreshold2}%</span>
          </div>
          <div class="ab-config-row">
            <label class="ab-config-label">怪物數量門檻</label>
            <input type="range" class="ab-slider" min="1" max="5" value="${config.monsterCount2}"
              oninput="setAutoSkillConfig('monsterCount2', parseInt(this.value));document.getElementById('monster-count2-val').textContent=this.value+'隻'">
            <span id="monster-count2-val" class="ab-slider-val">${config.monsterCount2}隻</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 能量外套 -->
    ${state.hasEnergyCoatUnlock ? `
    <div class="ab-section">
      <h4 class="ab-section-title">🛡️ 能量外套</h4>
      <label class="auto-toggle"><input type="checkbox" ${state.energyCoatEnabled ? 'checked' : ''} onchange="setEnergyCoatEnabled(this.checked);"> 啟動（減傷${state.energyCoatDmgReductionPct}%，每次受擊消耗${state.energyCoatSpCostPct}%最大SP）</label>
      <div class="ab-config-row">
        <label class="ab-config-label">SP 低於</label>
        <input type="range" class="ab-slider" min="0" max="90" value="${state.energyCoatSpFloorPct}"
          oninput="setEnergyCoatSpFloor(this.value);document.getElementById('energycoat-floor-val').textContent=this.value+'%'">
        <span id="energycoat-floor-val" class="ab-slider-val">${state.energyCoatSpFloorPct}%</span>
        <span class="ab-config-hint">時暫停生效</span>
      </div>
    </div>
    ` : ''}

    <!-- 輔助技能設定 -->
    ${supportSkills.length > 0 ? `
    <div class="ab-section">
      <h4 class="ab-section-title">💚 輔助技能</h4>
      <div class="support-skill-list">${supportRows}</div>
    </div>
    ` : ''}

    <!-- 藥水設定 -->
    <div class="ab-section">
      <h4 class="ab-section-title">🧪 藥水設定</h4>
      <div class="potion-toggles">
        <label class="auto-toggle"><input type="checkbox" ${state.autoPotion.enabled ? 'checked' : ''} onchange="setAutoPotionEnabled(this.checked);"> 自動使用回復道具</label>
        <label class="auto-toggle"><input type="checkbox" ${state.autoBuyPotion ? 'checked' : ''} onchange="setAutoBuyPotion(this.checked);"> 藥水不足時自動購買${AUTO_BUY_QTY}瓶</label>
      </div>
      <div class="ab-config-row">
        <label class="ab-config-label">HP 低於</label>
        <input type="range" class="ab-slider" min="10" max="90" value="${hpThreshold}"
          oninput="setAutoPotionThreshold(this.value);document.getElementById('hp-threshold-val').textContent=this.value+'%'">
        <span id="hp-threshold-val" class="ab-slider-val">${hpThreshold}%</span>
        <span class="ab-config-hint">時使用</span>
      </div>
      <div class="ab-config-row">
        <label class="ab-config-label">首先使用</label>
        <select class="ab-select" onchange="setAutoPotionTier(this.value);renderAutoBattleTab();">
          <option value="">不使用背包道具</option>
          ${invOptions}
        </select>
      </div>
      <div class="ab-config-row">
        <label class="ab-config-label">用完後使用</label>
        <select class="ab-select" onchange="setAutoPotionFallback(this.value);renderAutoBattleTab();">
          ${potionOptions}
        </select>
      </div>
    </div>

    <div class="ab-section">
      <h4 class="ab-section-title">💧 SP 藥水設定</h4>
      <div class="potion-toggles">
        <label class="auto-toggle"><input type="checkbox" ${spCfg.enabled ? 'checked' : ''} onchange="setAutoSpPotionEnabled(this.checked);"> 自動使用回復SP道具</label>
        <label class="auto-toggle"><input type="checkbox" ${state.autoBuySpPotion ? 'checked' : ''} onchange="setAutoBuySpPotion(this.checked);"> 藍水不足時自動購買${AUTO_BUY_SP_QTY}瓶</label>
      </div>
      <div class="ab-config-row">
        <label class="ab-config-label">SP 低於</label>
        <!-- id 不能叫 sp-threshold-val：攻擊技能第一招的「SP 保留 %」已經佔了那個 id，
             getElementById 只回傳第一個，拉這條滑桿會去改上面那格的數字（#102） -->
        <input type="range" class="ab-slider" min="10" max="90" value="${spThreshold}"
          oninput="setAutoSpPotionThreshold(this.value);document.getElementById('sp-potion-threshold-val').textContent=this.value+'%'">
        <span id="sp-potion-threshold-val" class="ab-slider-val">${spThreshold}%</span>
        <span class="ab-config-hint">時使用</span>
      </div>
      <div class="ab-config-row">
        <label class="ab-config-label">首先使用</label>
        <select class="ab-select" onchange="setAutoSpPotionPrimary(this.value);renderAutoBattleTab();">
          <option value="">不使用背包道具</option>
          ${invSpOptions}
        </select>
      </div>
      <div class="ab-config-row">
        <label class="ab-config-label">用完後使用</label>
        <select class="ab-select" onchange="setAutoSpPotionFallback(this.value);renderAutoBattleTab();">
          ${spFallbackOption}
        </select>
      </div>
      <div class="ab-config-hint" style="margin-top:4px">商店只賣藍色藥水（${(ITEMS['blue_potion']||{}).buyPrice || 1000}z），其他回SP道具要打怪取得。</div>
    </div>

    <div class="ab-section">
      <h4 class="ab-section-title">⚡ 攻速藥水</h4>
      <div class="potion-toggles">
        <label class="auto-toggle"><input type="checkbox" ${aspdCfg.enabled ? 'checked' : ''} onchange="setAutoAspdPotionEnabled(this.checked);renderAutoBattleTab();"> 效果結束後自動補喝</label>
        <label class="auto-toggle"><input type="checkbox" ${state.autoBuyAspdPotion ? 'checked' : ''} onchange="setAutoBuyAspdPotion(this.checked);"> 沒了自動購買${AUTO_BUY_ASPD_QTY}瓶</label>
      </div>
      ${Object.keys(ASPD_POTIONS).map(id => {
        const d = ITEMS[id];
        if (!d) return '';
        const block = aspdPotionBlockReason(id);
        const checked = (aspdCfg.items || []).includes(id);
        return `<label class="auto-toggle aspd-potion-row${block ? ' disabled' : ''}" title="${block || '可使用'}">
          <input type="checkbox" ${checked ? 'checked' : ''} ${block ? 'disabled' : ''}
            onchange="toggleAutoAspdPotion('${id}',this.checked);renderAutoBattleTab();">
          ${d.name}　<span class="ab-config-hint">攻速+${d.aspdPct}%　持有 ${getItemQty(id)}</span>
          ${block ? `<span class="aspd-potion-block">${block}</span>` : ''}
        </label>`;
      }).join('')}
      <div class="ab-config-hint" style="margin-top:4px">效果較高的優先使用。限制依道具敘述：覺醒需 40 級且服事／祭司不可，菠色克需 85 級且限法師系／劍士系／商人系。</div>
    </div>
  `;
}

// 自動戰鬥配置設定
function setAutoSkillConfig(key, value) {
  if (!state.autoSkillConfig) state.autoSkillConfig = { skillId: null, mode: 'once', spThreshold: 30 };
  state.autoSkillConfig[key] = value;
  saveGame();
  renderAutoBattleTab();
}

// 輔助技能開關
function toggleAutoSupportSkill(skillId, enabled) {
  if (!state.autoSupportSkills) state.autoSupportSkills = {};
  state.autoSupportSkills[skillId] = enabled;
  // 隱匿（盜賊）與偽裝（刺客）效果重疊，自動施放只能二選一
  const fleeExclusivePair = ['hiding', 'cloaking'];
  if (enabled && fleeExclusivePair.includes(skillId)) {
    const other = fleeExclusivePair.find(id => id !== skillId);
    state.autoSupportSkills[other] = false;
  }
  saveGame();
  renderAutoBattleTab();
}

// 遇怪模式切換
// BOSS 模式的勾選：擋下時要把畫面上的勾勾撥回去，否則畫面與 state 會不一致
/* MVP 與迷你王各一個勾選框（#147）。

   以前是一個「BOSS 模式」同時管兩種，玩家想單刷 MVP 只能連迷你王一起吃。
   拆開之後兩邊各自 20%、各自檢查「同類還活著沒」。

   **只有 MVP 需要近戰模式**：牠出場會召喚小弟把場子填滿，遠攻模式
   `maxMonsters` 是 1，一隻小弟都放不下。迷你王不帶小弟，所以不擋。
   被擋住時一定要把理由寫在旁邊——不然又是「勾了沒反應」（#61 同一類問題）。 */
function bossModeRow(kind, list) {
  if (!list.length) return '';
  const melee = (state.encounterMode || 'melee') === 'melee';
  const isMvp = kind === 'mvp';
  const blocked = isMvp && !melee;
  const on = isMvp ? state.mvpMode : state.miniMode;
  const label = isMvp
    ? `🎯 MVP 模式（20% 機率降臨，並帶著手下一起出現）`
    : `👺 迷你王模式（20% 機率出現，不帶手下）`;
  const names = list.map(id => MONSTERS[id])
    .map(m => `${m.icon}${m.name}`).join('、');
  return `
    <label style="display:flex;align-items:center;gap:8px;margin:10px 0 2px;font-size:14px;${
      blocked ? 'cursor:not-allowed;opacity:.55;' : 'cursor:pointer;'}">
      <input type="checkbox" ${on ? 'checked' : ''} ${blocked ? 'disabled' : ''}
        onchange="${isMvp ? 'doToggleMvpMode' : 'doToggleMiniMode'}(this.checked)" style="width:18px;height:18px;">
      <span>${label}　<span style="opacity:.7">${list.length} 種</span></span>
    </label>
    ${blocked ? '<div style="font-size:11px;color:var(--ink-dim);margin:0 0 6px;">遠攻模式場上只有 1 隻，放不下 MVP 的手下——要開請先切回近戰模式。</div>' : ''}
    <div style="font-size:11px;color:var(--ink-dim);margin:0 0 8px;">${names}</div>`;
}
function bossModeBox(map) {
  const mvp = bossListOf(map.id, 'mvp');
  const mini = bossListOf(map.id, 'mini');
  if (!mvp.length && !mini.length) return '';
  return bossModeRow('mvp', mvp) + bossModeRow('mini', mini);
}
function doToggleMiniMode(checked) {
  toggleMiniMode(checked);
  if (typeof renderMapTab === 'function') renderMapTab();
}
function doToggleMvpMode(checked) {
  toggleMvpMode(checked);
  if (typeof renderMapTab === 'function') renderMapTab();
}

function setEncounterMode(mode) {
  state.encounterMode = mode;
  state.lastSpawnTime = 0; // 重置生怪計時
  if (mode === 'off') {
    state.monsters = [];
    state.monster = null;
  }
  /* 切離近戰就把 MVP 模式關掉：遠攻場上只有 1 隻，不遇怪則完全沒有位置，
     MVP 的手下一隻都放不下。迷你王不帶小弟，遠攻放得下，但沒有怪可出時也沒意義。 */
  if (mode !== 'melee' && state.mvpMode) {
    state.mvpMode = false;
    logMsg(mode === 'off'
      ? '🎯 停止遇怪，MVP 模式已自動關閉。'
      : '🎯 切換到遠攻模式，MVP 模式已自動關閉。');
  }
  recomputeDerived(false);  // maxMonsters 由遇怪模式推導，改完要重算
  saveGame();
  renderAutoBattleTab();
  if (typeof renderMonster === 'function') renderMonster();
  if (typeof renderMapTab === 'function') renderMapTab();
}
/* ---------------- 技能分頁（可縮放、按職業分組） ---------------- */
let expandedJobs = {}; // { jobId: true/false }

function renderSkillsTab() {
  const el = document.getElementById('tab-skills');
  const allJobs = getAllLearnedJobs();

  // 預設展開目前職業
  allJobs.forEach(jid => {
    if (expandedJobs[jid] === undefined) {
      expandedJobs[jid] = (jid === state.jobId);
    }
  });

  if (!state.jobSkillPoints) state.jobSkillPoints = {};

  let html = `<div class="skills-header">
    <h3 class="panel-title">技能點：${state.skillPoints}</h3>
    <button class="btn-small btn-respec" onclick="if(confirm('確定要重置所有技能嗎？')){resetSkills();renderSkillsTab();}">重置技能</button>
  </div>`;

  for (const jobId of allJobs) {
    const job = JOB_TREE[jobId];
    if (!job || !job.skills.length) continue;

    /* 借來的技能不在借用者底下再畫一次（#99）。武僧與祭司整份借了服事的技能，
       而玩家本來就走過服事那一站——同一批技能會在兩個區塊各出現一次，
       借用者那份還全部顯示 MAX，看起來像「一轉職就自動點滿」。

       **來源職業沒有列在畫面上時要留著**：超級新手借的那六個一轉他一個都沒當過，
       濾掉的話他的技能會整個消失。 */
    const shown = job.skills.filter(sk => {
      const src = job.borrowedFrom && job.borrowedFrom[sk.id];
      return !(src && allJobs.includes(src));
    });
    if (!shown.length) continue;

    const isCurrentJob = jobId === state.jobId;
    const isExpanded = expandedJobs[jobId];
    /* 顯示的是**實際花得動的點數**，不是這個職業自己那格（#101）。
       二轉與進階二轉共用一個池子，兩格各印各的話會出現
       「武僧 技能點 0 ／ 武術宗師 技能點 18」——看起來像武僧的招點不動了，
       但按下去其實扣的是共用池。 */
    const poolJobs = typeof skillPointPoolJobs === 'function' ? skillPointPoolJobs(jobId) : [jobId];
    const jobPoints = typeof skillPointsAvailable === 'function'
      ? skillPointsAvailable(jobId) : (state.jobSkillPoints[jobId] || 0);
    const sharedWith = poolJobs.filter(j => j !== jobId).map(j => (JOB_TREE[j] || {}).name).filter(Boolean);

    // 計算該職業已投入的技能點數
    let spentPoints = 0;
    shown.forEach(sk => {
      const lv = state.learnedSkills[sk.id] || 0;
      // autoGrant 跟 isQuest 一樣是轉職白送的，沒花到點數就不該算進「已投入」
      if (!sk.isQuest && !sk.autoGrant && lv > 0) spentPoints += lv;
    });

    html += `<div class="skill-job-section ${isCurrentJob ? 'current-job' : ''} ${isExpanded ? 'expanded' : 'collapsed'}">
      <div class="skill-job-header" onclick="toggleJobSection('${jobId}')">
        <span class="skill-job-toggle">${isExpanded ? '▼' : '▶'}</span>
        ${job.icon} ${job.name}
        <span class="skill-job-tier">Tier ${job.tier}</span>
        ${isCurrentJob ? '<span class="skill-job-current">目前</span>' : ''}
        <span class="skill-job-points">技能點 ${jobPoints}${sharedWith.length ? `<span class="skill-job-shared">與${sharedWith.join('、')}共用</span>` : ''}</span>
        <span class="skill-job-spent">已投入 ${spentPoints}</span>
      </div>`;

    if (isExpanded) {
      html += '<div class="skill-list">';
      shown.forEach(sk => {
        const lv = state.learnedSkills[sk.id] || 0;
        const isQuest = sk.isQuest;
        const isMaxed = lv >= sk.maxLv;
        /* 加點按鈕要看**實際會被扣的那個池子**（#121 真主優先，源池 0 時回退現職）。
            借來的技能只畫在來源職業底下（例如服事的治癒術），重置後一轉池 49 應能點動；
            若源池已空（轉職後未重置），回退到現職共用池，武僧/賢者照樣點得動。 */
         let payJob = (typeof findSkillJob === 'function' && findSkillJob(sk.id)) || jobId;
         let payPoints = typeof skillPointsAvailable === 'function'
           ? skillPointsAvailable(payJob) : (state.jobSkillPoints[payJob] || 0);
         if (payPoints <= 0 && payJob !== state.jobId) {
           const cur = JOB_TREE[state.jobId];
           if (cur && cur.borrowedFrom && cur.borrowedFrom[sk.id]) {
             const alt = typeof skillPointsAvailable === 'function' ? skillPointsAvailable(state.jobId) : (state.jobSkillPoints[state.jobId] || 0);
             if (alt > 0) { payJob = state.jobId; payPoints = alt; }
           }
         }
         const canLevelUp = !isQuest && !isMaxed && payPoints > 0;

        const spCost = Array.isArray(sk.spCost) ? sk.spCost[Math.max(0, lv - 1)] || sk.spCost[0] : sk.spCost;
        const cd = effectiveCooldownMs(sk.id, Array.isArray(sk.cooldown) ? sk.cooldown[Math.max(0, lv - 1)] || sk.cooldown[0] : sk.cooldown) / 1000;

        /* 等級一律印成「目前/上限」（#102）。以前「未習得」與「MAX」都只有字、
           沒有數字，玩家看不出這招總共幾級——要點的時候得先點下去才知道還有幾格。 */
        let statusTag = '';
        if (isQuest) {
          statusTag = `<span class="skill-tag quest">任務技能</span> <span class="skill-tag">Lv${lv}/${sk.maxLv}</span>`;
        } else if (isMaxed) {
          statusTag = `<span class="skill-tag maxed">MAX</span> <span class="skill-tag">Lv${lv}/${sk.maxLv}</span>`;
        } else if (lv > 0) {
          statusTag = `<span class="skill-tag">Lv${lv}/${sk.maxLv}</span>`;
        } else {
          statusTag = `<span class="skill-tag unlearned">未習得</span> <span class="skill-tag">Lv0/${sk.maxLv}</span>`;
        }

        let typeTag = '';
        if (sk.type === 'passive') typeTag = '<span class="skill-type passive">被動</span>';
        else if (['damage', 'magic'].includes(sk.type)) typeTag = '<span class="skill-type attack">攻擊</span>';
        else if (sk.type === 'heal' || sk.type === 'heal_over_time') typeTag = '<span class="skill-type heal">治療</span>';
        else if (sk.type === 'dot') typeTag = '<span class="skill-type dot">持續</span>';
        else if (sk.type.includes('buff')) typeTag = '<span class="skill-type buff">輔助</span>';
        else if (sk.type.includes('debuff')) typeTag = '<span class="skill-type debuff">減益</span>';

        /* 無屬性在資料裡有兩種寫法：SKILLS 用 'neutral'（60 個）、ITEMS 用 'none'。
           以前只擋了 'none'，所以那 60 個技能全都印出 `undefined` 當圖示。 */
        const elemTag = sk.element && sk.element !== 'none' && sk.element !== 'neutral'
          ? `<span class="skill-element elem-${sk.element}">${ELEMENT_ICONS[sk.element] || '⚪'}</span>` : '';

        html += `<div class="skill-row ${lv > 0 ? 'learned' : ''}">
          <div class="skill-info">
            <div class="skill-name">${typeof skillDisplayName === 'function' ? skillDisplayName(sk) : sk.name} ${statusTag} ${typeTag} ${elemTag}</div>
            <div class="skill-desc">${sk.desc}</div>
            <div class="skill-cost">SP ${spCost} ・ 冷卻 ${cd}s</div>
          </div>
          ${isQuest ? '' : `<div class="skill-actions">
            <button class="btn-small btn-levelup" ${canLevelUp ? '' : 'disabled'}
              onclick="levelUpSkill('${sk.id}');renderSkillsTab();renderAutoBattleTab();">+</button>
          </div>`}
        </div>`;
      });
      html += '</div>';
    }

    html += '</div>';
  }

  /* 卡片賦予的技能（#17）：獨立一區，不混進職業區塊——它們不吃技能點、
     不能加點、脫下裝備就沒有，跟職業技能是兩回事。
     只列職業技能表裡沒有的那些；重複的（例如牧師本來就有治癒術）已經
     在職業區塊顯示過，那邊的等級已經是取高的結果。 */
  const cardOnly = Object.keys(state.cardSkills || {})
    .filter(id => !getAllLearnedJobs().some(j => (JOB_TREE[j] || { skills: [] }).skills.some(s => s.id === id)))
    .map(id => ({ sk: findSkillAnywhere(id), lv: state.cardSkills[id] }))
    .filter(e => e.sk);
  if (cardOnly.length) {
    html += `<div class="skill-job-section expanded">
      <div class="skill-job-header">🃏 卡片賦予的技能<span class="skill-job-tier">脫下裝備即消失</span></div>
      <div class="skill-list">`;
    cardOnly.forEach(({ sk, lv }) => {
      const spCost = Array.isArray(sk.spCost) ? sk.spCost[Math.max(0, lv - 1)] || sk.spCost[0] : sk.spCost;
      const cd = effectiveCooldownMs(sk.id, Array.isArray(sk.cooldown) ? sk.cooldown[Math.max(0, lv - 1)] || sk.cooldown[0] : sk.cooldown) / 1000;
      const typeTag = sk.type === 'passive' ? '<span class="skill-type passive">被動</span>' : '';
      html += `<div class="skill-row learned">
        <div class="skill-info">
          <div class="skill-name">${typeof skillDisplayName === 'function' ? skillDisplayName(sk) : sk.name} <span class="skill-tag">Lv${lv}</span> ${typeTag}</div>
          <div class="skill-desc">${sk.desc}</div>
          <div class="skill-cost">SP ${spCost} ・ 冷卻 ${cd}s</div>
        </div>
      </div>`;
    });
    html += '</div></div>';
  }

  /* 抄襲（#69）：官方是「記住最後一個打到你的技能」，使用者 2026-08-10 改成自己挑。
     沒有這個選單的話技能點下去完全沒有出口——被動只記了等級上限，
     真正決定抄哪一個的是這裡。 */
  if (state.plagiarismLv > 0) {
    /* 選單照職業主系分組（#79，使用者 2026-08-15 指定）——
       候選有上百個，攤成一長串平的清單根本挑不到東西。
       分組表由 plagiarismGroups() 從 JOB_TREE 的 parent 鏈推出來，不另外維護。 */
    const groups = (typeof plagiarismGroups === 'function') ? plagiarismGroups() : [];
    const cur = state.plagiarismSkillId || '';
    const curSk = cur ? SKILLS[cur] : null;
    const total = groups.reduce((n, g) => n + g.skills.length, 0);
    const opt = s => `<option value="${s.id}"${s.id === cur ? ' selected' : ''}>`
      + `${s.name}（上限 Lv${Math.min(state.plagiarismLv, s.maxLv || 1)}）</option>`;
    html += `<div class="skill-job-section expanded">
      <div class="skill-job-header">📖 抄襲<span class="skill-job-tier">可用到 Lv${state.plagiarismLv}</span></div>
      <div class="skill-list">
        <div class="skill-row learned">
          <div class="skill-info">
            <div class="skill-name">記住一個攻擊技能</div>
            <div class="skill-desc">依職業主系分類，共 ${total} 個可選；能用的等級不會超過抄襲本身的等級。
              ${state.preserveOn ? '（自由保護已生效：被動攻擊技也在名單裡）' : ''}</div>
            <div class="skill-cost">
              <select onchange="doSetPlagiarism(this.value)">
                <option value=""${cur ? '' : ' selected'}>（沒有記住任何技能）</option>
                ${groups.map(g => `<optgroup label="${g.label}">${g.skills.map(opt).join('')}</optgroup>`).join('')}
              </select>
              ${curSk ? `　目前：<b>${curSk.name}</b> Lv${skillLv(cur)}` : ''}
            </div>
          </div>
        </div>
      </div></div>`;
  }

  /* 自動念咒（#71）：官方是「選擇特定已學到的魔法」，所以一樣需要一個選單。
     發動等級上限是本技能等級的一半（官方規則），選單裡直接把上限標出來。 */
  if (state.sageAutoSpell) {
    const picks = (typeof sageAutoSpellChoices === 'function' ? sageAutoSpellChoices() : [])
      .slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
    const cur = state.sageAutoSpellId || '';
    const curSk = cur ? SKILLS[cur] : null;
    html += `<div class="skill-job-section expanded">
      <div class="skill-job-header">📘 自動念咒<span class="skill-job-tier">可用到 Lv${Math.max(1, Math.floor(state.sageAutoSpell.lv / 2))}</span></div>
      <div class="skill-list">
        <div class="skill-row learned">
          <div class="skill-info">
            <div class="skill-name">選一個要自動施放的魔法</div>
            <div class="skill-desc">從已學會的魔法裡挑一個，發動等級不會超過自動念咒等級的一半。</div>
            <div class="skill-cost">
              <select onchange="doSetSageAutoSpell(this.value)">
                <option value=""${cur ? '' : ' selected'}>（沒有選擇魔法）</option>
                ${picks.map(sk => `<option value="${sk.id}"${sk.id === cur ? ' selected' : ''}>${sk.name}（發動 Lv${sk.maxLv}）</option>`).join('')}
              </select>
              ${curSk ? `　目前：<b>${curSk.name}</b> Lv${sageAutoSpellLv(cur)}` : ''}
            </div>
          </div>
        </div>
      </div></div>`;
  }

  html += '</div>';
  el.innerHTML = html;
}

/* 賢者的兩個面板控制（#71）。官方這兩個都是「消耗道具的主動技」，
   使用者 2026-08-10 指定改成自動戰鬥分頁上的設定，選了就自動維持／自動觸發。
   兩個都是轉職自動獲得，所以沒學過的職業整塊不出現。 */
const SAGE_ELEMENTS = [['fire', '火'], ['water', '水'], ['wind', '風'], ['earth', '地']];
function sageConverterHtml() {
  const hasConverter = !!state.elementConverter;
  const hasChange = state.elementChanges && Object.keys(state.elementChanges).length > 0;
  if (!hasConverter && !hasChange) return '';
  const opt = (cur, val, label) => `<option value="${val}"${cur === val ? ' selected' : ''}>${label}</option>`;
  let html = '<div class="ab-section"><h4 class="ab-section-title">🔮 賢者的元素操作</h4>';
  if (hasConverter) {
    const cur = state.converterElement || '';
    html += `<div class="ab-config-row">
      <label class="ab-config-label">肯貝特武器附魔</label>
      <select class="ab-select" onchange="setSageConverter(this.value)">
        ${opt(cur, '', '不使用')}
        ${SAGE_ELEMENTS.map(([k, n]) => opt(cur, k, `${n}屬性（消耗對應靈礦石，不足則付 1000z）`)).join('')}
      </select>
    </div>
    <div class="ab-info-text">選定後會自動維持 20 分鐘的武器屬性。自己放屬性附加時不會被搶走。</div>`;
  }
  if (hasChange) {
    const cur = state.elementChangePick || '';
    html += `<div class="ab-config-row">
      <label class="ab-config-label">元素更換</label>
      <select class="ab-select" onchange="setSageElementChange(this.value)">
        ${opt(cur, '', '不使用')}
        ${SAGE_ELEMENTS.map(([k, n]) => opt(cur, k, `把敵人變成${n}屬性`)).join('')}
      </select>
    </div>
    <div class="ab-info-text">普通攻擊 20% 機率把目標變成該屬性 10 秒（首領階級也有效），消耗對應靈礦石，不足則付 1000z。</div>`;
  }
  return html + '</div>';
}
function setSageConverter(el) {
  state.converterElement = el || null;
  state._converterWarned = false;
  saveGame();
  renderAutoBattleTab();
}
function setSageElementChange(el) {
  state.elementChangePick = el || null;
  saveGame();
  renderAutoBattleTab();
}
function doSetSageAutoSpell(skillId) {
  if (typeof setSageAutoSpell !== 'function') return;
  setSageAutoSpell(skillId || null);
  renderSkillsTab();
  if (typeof renderAll === 'function') renderAll();
}

function doSetPlagiarism(skillId) {
  if (typeof setPlagiarismSkill !== 'function') return;
  setPlagiarismSkill(skillId || null);
  renderSkillsTab();
  if (typeof renderAll === 'function') renderAll();
}

// 切換職業技能區塊的展開/收合
function toggleJobSection(jobId) {
  expandedJobs[jobId] = !expandedJobs[jobId];
  renderSkillsTab();
}

/* 畫面上的技能按鈕列已移除（#101，使用者 2026-08-15 指定
   「將畫面上的各種技能取消 只在自動戰鬥畫面設定就好」）。
   技能全部改由自動戰鬥分頁設定：攻擊技能兩個下拉、輔助技能各自的勾選框。
   castSkill() 本身沒有動，卡片自動念咒、技能連段那些內部呼叫照舊。 */

/* ---------------- 成就分頁 ---------------- */
let acvCat = 'all';
let acvHideDone = false;

function setAcvCat(c) { acvCat = c; renderAchievementsTab(); }
function setAcvHideDone(v) { acvHideDone = v; renderAchievementsTab(); }

// 由 checkAchievements() 解鎖時回呼
function onAchievementUnlocked(list) {
  const first = list[0];
  const extra = list.length > 1 ? `（+${list.length - 1}）` : '';
  showToast(`🏆 達成成就「${first.name}」${extra}`);
  const btn = document.querySelector('.tab-btn[data-tab="achievements"]');
  if (btn && activeTab !== 'achievements') btn.classList.add('has-new');
  if (activeTab === 'achievements') renderAchievementsTab();
  renderTopBar();
}

function renderAchievementsTab() {
  const el = document.getElementById('tab-achievements');
  if (!el || !state) return;

  const btn = document.querySelector('.tab-btn[data-tab="achievements"]');
  if (btn) btn.classList.remove('has-new');

  const sum = getAchievementSummary();
  const done = ensureAchievements().done;

  let list = ACHIEVEMENTS.filter(a => acvCat === 'all' || a.cat === acvCat);
  if (acvHideDone) list = list.filter(a => !done[a.id]);

  // 未完成的排前面，並且「差最少就達成」的排最前——玩家一打開就看到下一個目標
  const rows = list.map(a => {
    const cur = achievementProgress(a);
    return { a, cur, done: !!done[a.id], ratio: Math.min(1, cur / a.goal) };
  });
  rows.sort((x, y) => {
    if (x.done !== y.done) return x.done ? 1 : -1;
    if (x.done) return (done[y.a.id] || 0) - (done[x.a.id] || 0); // 已完成：最近解鎖的在前
    return y.ratio - x.ratio;
  });

  const catBtns = ['all'].concat(Object.keys(ACHIEVEMENT_CATEGORIES)).map(c => {
    const label = c === 'all' ? '全部' : `${ACHIEVEMENT_CATEGORIES[c].icon} ${ACHIEVEMENT_CATEGORIES[c].name}`;
    const n = c === 'all' ? `${sum.done}/${sum.total}` : `${sum.byCat[c].done}/${sum.byCat[c].total}`;
    return `<button class="btn-small ${acvCat === c ? 'active' : ''}" onclick="setAcvCat('${c}')">${label} <span class="acv-cat-n">${n}</span></button>`;
  }).join('');

  const pctDone = sum.total ? (sum.done / sum.total * 100) : 0;

  let html = `<h3 class="panel-title">🏆 成就</h3>
    <div class="acv-summary">
      <div class="acv-points"><span class="acv-points-num">${sum.points}</span><span class="acv-points-label">成就點數</span></div>
      <div class="acv-summary-bar">
        <div class="codex-prog-head"><span>總進度</span><span>${sum.done} / ${sum.total}　${pctDone.toFixed(1)}%</span></div>
        <div class="bar-track"><div class="bar-fill acv-prog-fill" style="width:${pctDone}%"></div></div>
      </div>
    </div>
    <div class="acv-cats">${catBtns}</div>
    <label class="auto-toggle acv-hide"><input type="checkbox" ${acvHideDone ? 'checked' : ''} onchange="setAcvHideDone(this.checked)"> 隱藏已完成</label>`;

  if (!rows.length) {
    html += '<div class="empty-hint">這個分類已經全部完成了！</div>';
  } else {
    html += '<div class="acv-list">';
    rows.forEach(r => {
      const a = r.a;
      const p = r.ratio * 100;
      const goalTxt = a.goal.toLocaleString();
      const curTxt = Math.min(r.cur, a.goal).toLocaleString();
      const rewardTxt = `${a.reward.gold ? `💰 ${a.reward.gold.toLocaleString()}　` : ''}🏆 ${a.reward.point}`;
      html += `<div class="acv-row ${r.done ? 'done' : ''} tier-${Math.min(a.tier || 1, 5)}">
        <div class="acv-icon">${a.icon}</div>
        <div class="acv-body">
          <div class="acv-name">${a.name}${r.done ? ' <span class="acv-check">✔</span>' : ''}</div>
          <div class="acv-desc">${a.desc}</div>
          <div class="acv-bar"><div class="acv-bar-fill" style="width:${p}%"></div></div>
        </div>
        <div class="acv-side">
          <div class="acv-count">${curTxt} / ${goalTxt}</div>
          <div class="acv-reward">${rewardTxt}</div>
        </div>
      </div>`;
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

/* ---------------- 圖鑑分頁 ---------------- */
const CODEX_PAGE_SIZE = 60;
const RACE_LABELS = {
  plant: '植物', insect: '昆蟲', brute: '動物', formless: '無形', fish: '魚貝',
  undead: '不死', humanoid: '人型', demon: '惡魔', dragon: '龍族', angel: '天使'
};
const SIZE_LABELS = { small: '小型', medium: '中型', large: '大型' };
const ITEM_TYPE_LABELS = {
  weapon: '武器', armor: '防具', consumable: '消耗品', ammo: '箭矢',
  material: '素材', etc: '雜物', card: '卡片', relic: '遺物'
};
let codexView = 'mon';      // mon | card | item
let codexFilter = 'all';    // all | found | missing
let codexSearch = '';
let codexSearchRaw = '';
let codexPage = 0;
let codexOpenId = null;
let codexJobFilter = false;  // 只顯示本職業裝得上的裝備

/* 分類篩選（#138）。圖鑑一頁 60 格、道具有一千四百多筆，只有「已發現／未發現」
   根本翻不完——使用者要的是按類別收斂。三個分頁各有自己的一組分類，
   所以 `codexCat` 也是**每個分頁各記一份**，切回來還在原來的分類上。

   `test` 收的是那一列的 id，回傳真假。寫成函式而不是欄位比對，是因為三種分頁
   要看的欄位根本不同（怪看 isBoss、卡看 slot、道具看 type + armorType）。 */
const CODEX_CATS = {
  mon: [
    { k: 'all', label: '全部' },
    { k: 'normal', label: '普通怪', test: id => !MONSTERS[id].isBoss },
    /* MVP 與迷你王分開列（#147）：兩者在遊戲裡已經是兩個獨立的勾選模式，
       圖鑑再混成一格「BOSS」的話，玩家查「這張圖有什麼迷你王」還是得自己認。 */
    { k: 'mvp', label: 'MVP', test: id => !!MONSTERS[id].isMvp },
    { k: 'mini', label: '迷你王', test: id => !!MONSTERS[id].isBoss && !MONSTERS[id].isMvp },
  ],
  card: [
    { k: 'all', label: '全部' },
    { k: 'weapon', label: '武器', test: id => (CARDS[id] || {}).slot === 'weapon' },
    { k: 'armor', label: '鎧甲', test: id => (CARDS[id] || {}).slot === 'armor' },
    { k: 'shield', label: '盾牌', test: id => (CARDS[id] || {}).slot === 'shield' },
    { k: 'headgear', label: '頭飾', test: id => (CARDS[id] || {}).slot === 'headgear' },
    { k: 'garment', label: '肩披', test: id => (CARDS[id] || {}).slot === 'garment' },
    { k: 'footgear', label: '鞋子', test: id => (CARDS[id] || {}).slot === 'footgear' },
    { k: 'accessory', label: '飾品', test: id => (CARDS[id] || {}).slot === 'accessory' },
  ],
  item: [
    { k: 'all', label: '全部' },
    { k: 'weapon', label: '武器', test: id => ITEMS[id].type === 'weapon' },
    // 飾品在資料上是 armor 底下的一種 armorType，要先從防具裡挑出來
    { k: 'armor', label: '防具', test: id => ITEMS[id].type === 'armor' && ITEMS[id].armorType !== 'accessory' },
    { k: 'accessory', label: '飾品', test: id => ITEMS[id].type === 'armor' && ITEMS[id].armorType === 'accessory' },
    // 箭矢歸消耗品：它會被打完，玩家找它的心情跟找藥水一樣
    { k: 'consumable', label: '消耗品', test: id => ITEMS[id].type === 'consumable' || ITEMS[id].type === 'ammo' },
    { k: 'relic', label: '遺物', test: id => ITEMS[id].type === 'relic' || id === (typeof RELIC_TICKET_ID !== 'undefined' ? RELIC_TICKET_ID : '') },
    // 其餘一律算素材（含少數 type 沒歸類乾淨的）
    { k: 'material', label: '素材', test: id => !['weapon', 'armor', 'consumable', 'ammo', 'relic'].includes(ITEMS[id].type)
      && id !== (typeof RELIC_TICKET_ID !== 'undefined' ? RELIC_TICKET_ID : '') },
  ],
  /* 隱藏圖鑑（神秘箱挑戰）：池子已排除卡片與箱子本身，照道具類型分類。
     另收「卡冊限定卡」——來源怪沒實裝、只能靠卡冊開出來的 7 張。 */
  hidden: [
    { k: 'all', label: '全部' },
    { k: 'weapon', label: '武器', test: id => ITEMS[id].type === 'weapon' },
    { k: 'armor', label: '防具', test: id => ITEMS[id].type === 'armor' && ITEMS[id].armorType !== 'accessory' },
    { k: 'accessory', label: '飾品', test: id => ITEMS[id].type === 'armor' && ITEMS[id].armorType === 'accessory' },
    { k: 'consumable', label: '消耗品', test: id => ITEMS[id].type === 'consumable' || ITEMS[id].type === 'ammo' },
    { k: 'albumcard', label: '卡冊限定卡', test: id => !!(CARDS[id] && typeof getAlbumOnlyCards === 'function' && getAlbumOnlyCards().includes(id)) },
    { k: 'material', label: '素材', test: id => !['weapon', 'armor', 'consumable', 'ammo'].includes(ITEMS[id].type) && !(CARDS[id] && typeof getAlbumOnlyCards === 'function' && getAlbumOnlyCards().includes(id)) },
  ],
};
let codexCat = { mon: 'all', card: 'all', item: 'all', hidden: 'all' };
function setCodexView(v) {
  codexView = v; codexPage = 0; codexOpenId = null;
  /* 進隱藏圖鑑時重置篩選，避免殘留的「已發現」把未開出的卡藏起來 */
  if (v === 'hidden') { codexFilter = 'all'; codexSearch = ''; codexSearchRaw = ''; }
  renderCodexTab();
}
function setCodexFilter(f) { codexFilter = f; codexPage = 0; renderCodexTab(); }
function setCodexJobFilter(v) { codexJobFilter = v; codexPage = 0; renderCodexTab(); }
function setCodexCat(k) { codexCat[codexView] = k; codexPage = 0; renderCodexTab(); }
// 目前分頁的分類列，順便標出每一類有幾筆（0 筆的直接讓玩家看得出來，不必點進去）
function codexCatBar(ids) {
  const cats = CODEX_CATS[codexView] || [];
  const cur = codexCat[codexView] || 'all';
  return '<div class="codex-cats">' + cats.map(c => {
    const n = c.test ? ids.filter(c.test).length : ids.length;
    return `<button class="btn-small ${c.k === cur ? 'active' : ''} ${n ? '' : 'empty'}"
      onclick="setCodexCat('${c.k}')">${c.label} <span class="codex-cat-n">${n}</span></button>`;
  }).join('') + '</div>';
}
function codexCatFilter(ids) {
  const cur = codexCat[codexView] || 'all';
  const c = (CODEX_CATS[codexView] || []).find(x => x.k === cur);
  return (!c || !c.test) ? ids : ids.filter(c.test);
}
// ── 武器/防具 細分勾選 ──
const WEAPON_SUBS = [
  {k:'sword', label:'單手劍'}, {k:'tsword', label:'雙手劍'}, {k:'dagger', label:'短劍'},
  {k:'katar', label:'拳刃'}, {k:'axe1', label:'單手斧'}, {k:'axe2', label:'雙手斧'},
  {k:'mace', label:'鈍器'}, {k:'spear', label:'長矛'}, {k:'bow', label:'弓'},
  {k:'book', label:'書'}, {k:'rod', label:'法杖'}, {k:'knuckle', label:'拳套'},
  {k:'whip', label:'鞭'}, {k:'instrument', label:'樂器'},
  {k:'pistol', label:'手槍'}, {k:'rifle', label:'步槍'}, {k:'shotgun', label:'霰彈槍'},
  {k:'gatling', label:'機關槍'}, {k:'grenade', label:'榴彈砲'},
];
const ARMOR_SUBS = [
  {k:'headgear', label:'頭飾'}, {k:'garment', label:'披肩'}, {k:'footgear', label:'鞋子'},
  {k:'shield', label:'盾牌'}, {k:'leather', label:'鎧甲'},
];
let codexWeaponSubs = new Set();
let codexArmorSubs = new Set();
function toggleCodexWeaponSub(k){ if(codexWeaponSubs.has(k)) codexWeaponSubs.delete(k); else codexWeaponSubs.add(k); codexPage=0; renderCodexTab(); }
function toggleCodexArmorSub(k){ if(codexArmorSubs.has(k)) codexArmorSubs.delete(k); else codexArmorSubs.add(k); codexPage=0; renderCodexTab(); }
function clearCodexSubFilter(){ codexWeaponSubs.clear(); codexArmorSubs.clear(); codexPage=0; renderCodexTab(); }
function codexSubBar(ids){
  const curCat = codexCat[codexView] || 'all';
  if(curCat==='weapon'){
    return '<div class="codex-cats codex-sub">'
      + WEAPON_SUBS.map(s=>{
        const n = ids.filter(id=> (ITEMS[id].weaponCat||ITEMS[id].weaponType)===s.k).length;
        const ck = codexWeaponSubs.has(s.k);
        return `<label class="codex-sub-check ${n?'':'empty'}" title="${n} 件"><input type="checkbox" ${ck?'checked':''} onchange="toggleCodexWeaponSub('${s.k}')"> ${s.label} <span class="codex-cat-n">${n}</span></label>`;
      }).join('') + (codexWeaponSubs.size? `<button class="btn-small ghost" onclick="clearCodexSubFilter()">清除</button>`:'') + '</div>';
  }
  if(curCat==='armor'){
    return '<div class="codex-cats codex-sub">'
      + ARMOR_SUBS.map(s=>{
        const n = ids.filter(id=> ITEMS[id].armorType===s.k).length;
        const ck = codexArmorSubs.has(s.k);
        return `<label class="codex-sub-check ${n?'':'empty'}" title="${n} 件"><input type="checkbox" ${ck?'checked':''} onchange="toggleCodexArmorSub('${s.k}')"> ${s.label} <span class="codex-cat-n">${n}</span></label>`;
      }).join('') + (codexArmorSubs.size? `<button class="btn-small ghost" onclick="clearCodexSubFilter()">清除</button>`:'') + '</div>';
  }
  return '';
}
function codexSubFilter(ids){
  const curCat = codexCat[codexView] || 'all';
  if(curCat==='weapon' && codexWeaponSubs.size){
    return ids.filter(id=> codexWeaponSubs.has(ITEMS[id].weaponCat||ITEMS[id].weaponType));
  }
  if(curCat==='armor' && codexArmorSubs.size){
    return ids.filter(id=> codexArmorSubs.has(ITEMS[id].armorType));
  }
  return ids;
}
function setCodexPage(p) { codexPage = p; renderCodexTab(); }
/* ---------------- 搜尋框與注音輸入 ----------------

   三個搜尋框（圖鑑／背包／倉庫）都是「打一個字 → 整個分頁 innerHTML 重畫」，
   而重畫會把 <input> 本身換成新的元素。**中文輸入法組字到一半被換掉就會斷**：
   打「ㄨㄛˇ」時每按一鍵都觸發 input 事件，輸入框被換掉，組字狀態跟著沒了，
   畫面上只留下已經送出的注音符號（使用者回報的「只能出現 ㄨㄧㄛㄟ」）。

   解法是組字期間不重畫：input 事件帶 `isComposing`，為 true 就直接跳過；
   等 compositionend（選完字送出）再重畫一次。英數輸入不受影響——那條路
   從頭到尾 isComposing 都是 false。 */
function imeComposing(ev) {
  return !!(ev && (ev.isComposing || (ev.nativeEvent && ev.nativeEvent.isComposing)));
}
// 重畫之後把游標接回輸入框，不然每打一個字都要重點一次
function refocusSearch(id) {
  const box = document.getElementById(id);
  if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

function onCodexSearch(v, ev) {
  if (imeComposing(ev)) return;
  /* 畫面留玩家打的大小寫；比對才轉小寫。以前直接把小寫寫回輸入框，英文大寫一打就消失。 */
  codexSearchRaw = String(v || '');
  codexSearch = codexSearchRaw.trim().toLowerCase();
  codexPage = 0;
  renderCodexTab();
  refocusSearch('codex-search');
}
function toggleCodexDetail(id) {
  const opening = codexOpenId !== id;
  codexOpenId = opening ? id : null;
  renderCodexTab();
  /* 詳情面板插在格子牆的**上方**，所以在清單下半部點一個道具，
     展開的內容會落在畫面外，要自己往上捲才看得到。點完直接帶過去。

     **不用 scrollIntoView()**：捲動容器是 .tab-content，實測那支在這個版面上
     不會動（詳情停在容器上方 1,075px），改成直接算位移設 scrollTop。 */
  if (opening) {
    const pane = document.querySelector('.tab-content');
    const el = document.querySelector('#tab-codex .codex-detail');
    // 直接指定 scrollTop，不用 scrollTo({behavior:'smooth'})——那支在這個版面上同樣不動
    if (pane && el) pane.scrollTop = Math.max(0, el.offsetTop - pane.offsetTop);
  }
}

function codexBar(label, found, total) {
  const p = total ? (found / total * 100) : 0;
  return `<div class="codex-prog">
    <div class="codex-prog-head"><span>${label}</span><span>${found} / ${total}　${p.toFixed(1)}%</span></div>
    <div class="bar-track"><div class="bar-fill codex-prog-fill" style="width:${p}%"></div></div>
  </div>`;
}

function renderCodexTab() {
  const el = document.getElementById('tab-codex');
  if (!el || !state) return;

  const pool = getCodexPool();
  const book = ensureCodex();
  const prog = getCodexProgress();

  /* 隱藏圖鑑：三大收集全滿之後解鎖（神秘箱挑戰）。沒解鎖就強制回道具分頁。 */
  const boxUnlocked = prog.monsters.total > 0 && prog.cards.total > 0 && prog.items.total > 0
    && prog.monsters.found >= prog.monsters.total
    && prog.cards.found >= prog.cards.total
    && prog.items.found >= prog.items.total;
  if (codexView === 'hidden' && !boxUnlocked) codexView = 'item';

  // 依目前分頁組出清單，並套用搜尋/篩選
  let rows;
  // 分類列要顯示**各類的總數**，所以算數量用的是還沒篩過的全表
  const allIds = codexView === 'mon' ? pool.monsters
    : codexView === 'card' ? pool.cards
    /* 卡冊限定卡排最前面：7 張混在 1.2 萬件後面永遠翻不到 */
    : codexView === 'hidden' ? getAlbumOnlyCards().concat(getBoxCodexPool())
    : pool.items;
  const catBar = codexCatBar(allIds);
  let ids = codexCatFilter(allIds);
  const subBar = codexSubBar(ids);
  ids = codexSubFilter(ids);
  if (codexView === 'mon') {
    rows = ids.map(id => ({ id, name: MONSTERS[id].name, found: !!book.seen[id] }));
  } else if (codexView === 'card') {
    rows = ids.map(id => ({ id, name: (CARDS[id] || ITEMS[id]).name, found: !!book.item[id] }));
  } else if (codexView === 'hidden') {
    rows = ids.map(id => ({ id, name: ITEMS[id].name, found: !!(book.box && book.box[id]) }));
  } else {
    rows = ids.map(id => ({ id, name: ITEMS[id].name, found: !!book.item[id] }));
  }
  if (codexFilter === 'found') rows = rows.filter(r => r.found);
  else if (codexFilter === 'missing') rows = rows.filter(r => !r.found);
  /* 搜尋不再限制「已發現」（使用者 2026-08-15 指定全開放）。
     舊規則是為了不讓玩家用搜尋框偷看還沒遇到的內容，但圖鑑的定位已經
     從「收集紀錄」改成「查東西在哪打」——查不到還沒發現的東西就等於沒用。 */
  if (codexSearch) rows = rows.filter(r => (r.name || '').toLowerCase().includes(codexSearch));

  /* 職業篩選（使用者 2026-08-22 指定）：武器/防具分頁可只顯示本職業裝得上的裝備 */
  if (codexView === 'item' && codexJobFilter) {
    rows = rows.filter(r => {
      const d = ITEMS[r.id];
      if (!d) return false;
      if (d.type !== 'weapon' && d.type !== 'armor') return true;
      return !equipBlockReason(r.id);
    });
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / CODEX_PAGE_SIZE));
  if (codexPage >= totalPages) codexPage = totalPages - 1;
  const pageRows = rows.slice(codexPage * CODEX_PAGE_SIZE, (codexPage + 1) * CODEX_PAGE_SIZE);

  /* 箱子限定裝（例如英雄魔杖-LT）沒有怪掉、商店也不賣，不進收集進度的分母。
     有打搜尋字時才另外列出，最多 240 筆，避免把兩萬件雜物算進進度條。 */
  let outRows = [];
  if (codexSearch && (codexView === 'card' || codexView === 'item')) {
    const inPool = new Set(allIds);
    for (const id in ITEMS) {
      if (inPool.has(id)) continue;
      const isCard = !!CARDS[id];
      if (codexView === 'card' ? !isCard : isCard) continue;
      if (!(ITEMS[id].name || '').toLowerCase().includes(codexSearch)) continue;
      const f = !!book.item[id];
      if (codexFilter === 'found' && !f) continue;
      if (codexFilter === 'missing' && f) continue;
      outRows.push({ id: id, name: ITEMS[id].name, found: f });
    }
    outRows.sort((a, b) => {
      const aLt = /-lt/i.test(a.name || '') ? 0 : 1;
      const bLt = /-lt/i.test(b.name || '') ? 0 : 1;
      if (aLt !== bLt) return aLt - bLt;
      return (a.name || '').localeCompare(b.name || '', 'zh-Hant');
    });
    if (outRows.length > 240) outRows.length = 240;
  }

  let html = `<h3 class="panel-title">📕 圖鑑</h3>
    <div class="codex-progress">
      ${codexBar('👾 怪物', prog.monsters.found, prog.monsters.total)}
      ${codexBar('🃏 卡片', prog.cards.found, prog.cards.total)}
      ${codexBar('🎒 道具', prog.items.found, prog.items.total)}
      ${boxUnlocked ? codexBoxBar(book) : ''}
    </div>
    <div class="codex-tabs">
      <button class="btn-small ${codexView === 'mon' ? 'active' : ''}" onclick="setCodexView('mon')">👾 怪物</button>
      <button class="btn-small ${codexView === 'card' ? 'active' : ''}" onclick="setCodexView('card')">🃏 卡片</button>
      <button class="btn-small ${codexView === 'item' ? 'active' : ''}" onclick="setCodexView('item')">🎒 道具</button>
      ${boxUnlocked ? `<button class="btn-small ${codexView === 'hidden' ? 'active' : ''}" onclick="setCodexView('hidden')">🎁 隱藏</button>` : ''}
    </div>` +
    (!boxUnlocked ? `<div class="empty-hint">🔒 三大收集（怪物／卡片／道具）全滿後，解鎖「隱藏圖鑑」——神秘箱挑戰。</div>`
      : ``) + `
    <div class="codex-controls">
      <input id="codex-search" class="codex-search" type="text" placeholder="搜尋名稱，找到就能看到去哪裡打…"
        value="${codexSearchRaw.replace(/"/g, '&quot;')}" oninput="onCodexSearch(this.value, event)">
      ${codexView === 'item' ? `<label style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;cursor:pointer;">
        <input type="checkbox" ${codexJobFilter ? 'checked' : ''} onchange="setCodexJobFilter(this.checked);" style="accent-color:var(--gold);">
        只顯示本職業
      </label>` : ''}
      <div class="codex-filters">
        <button class="btn-small ${codexFilter === 'all' ? 'active' : ''}" onclick="setCodexFilter('all')">全部</button>
        <button class="btn-small ${codexFilter === 'found' ? 'active' : ''}" onclick="setCodexFilter('found')">已發現</button>
        <button class="btn-small ${codexFilter === 'missing' ? 'active' : ''}" onclick="setCodexFilter('missing')">未發現</button>
      </div>
    </div>
    ${catBar}${subBar}`;

  if (codexOpenId) html += renderCodexDetail(codexOpenId);

  if (!pageRows.length && !outRows.length) {
    html += '<div class="empty-hint">沒有符合條件的項目。</div>';
  } else if (pageRows.length) {
    html += '<div class="codex-grid">';
    pageRows.forEach(r => {
      html += (codexView === 'mon') ? codexMonCell(r, book)
        : (codexView === 'hidden') ? codexBoxCell(r, book)
        : codexItemCell(r, book);
    });
    html += '</div>';
  }

  if (outRows.length) {
    html += `<div class="codex-detail-sec">🔍 圖鑑收集範圍外 ${outRows.length >= 240 ? '240+' : outRows.length} 件`
      + `<span class="codex-sec-hint">沒有怪會掉、商店也沒賣，只能開箱子；不列入上面的收集進度</span></div>`;
    const shown = outRows.length <= 120 ? outRows : outRows.slice(0, 60);
    html += '<div class="codex-grid">';
    shown.forEach(r => { html += codexItemCell(r, book); });
    html += '</div>';
    if (shown.length < outRows.length) html += '<div class="empty-hint">只列出前 60 件，再打細一點可以縮小範圍。</div>';
  }

  if (totalPages > 1) {
    html += '<div class="codex-pager">';
    html += `<button class="btn-small" ${codexPage === 0 ? 'disabled' : ''} onclick="setCodexPage(${codexPage - 1})">‹ 上一頁</button>`;
    html += `<span class="codex-pager-info">${codexPage + 1} / ${totalPages}　（共 ${rows.length} 筆）</span>`;
    html += `<button class="btn-small" ${codexPage >= totalPages - 1 ? 'disabled' : ''} onclick="setCodexPage(${codexPage + 1})">下一頁 ›</button>`;
    html += '</div>';
  }

  el.innerHTML = html;
}

/* 圖鑑全開放（使用者 2026-08-15 指定）：樣子、出沒地、掉寶一律看得到，
   `found` 只剩下「已收藏」的標記與進度條的分子，不再遮蔽任何內容。
   舊版沒發現的格子是剪影 + ？？？，那讓圖鑑沒辦法拿來找東西。 */
function codexMonCell(r, book) {
  const d = MONSTERS[r.id];
  const kills = book.mon[r.id] || 0;
  const elemIcon = ELEMENT_ICONS[d.element] || '⚪';
  return `<div class="codex-cell ${codexOpenId === r.id ? 'open' : ''} ${r.found ? '' : 'unfound'}" onclick="toggleCodexDetail('${r.id}')">
    <img class="codex-icon" src="${monsterImgSrc(r.id)}" alt="${d.name}" onerror="this.onerror=null;this.src='${placeholderImgSrc('monster')}'">
    <div class="codex-cell-name">${d.name}</div>
    <div class="codex-cell-sub">Lv.${d.level || '?'} ${elemIcon}</div>
    <div class="codex-cell-count ${kills ? '' : 'zero'}">${kills ? '☠ ' + kills : '未遇過'}</div>
  </div>`;
}

function codexItemCell(r, book) {
  const d = ITEMS[r.id];
  const got = book.item[r.id] || 0;
  const sub = CARDS[r.id] ? (CARDS[r.id].slot === 'weapon' ? '武器卡' : CARDS[r.id].slot === 'armor' ? '防具卡' : '卡片')
                          : (ITEM_TYPE_LABELS[d.type] || d.type || '');
  return `<div class="codex-cell ${codexOpenId === r.id ? 'open' : ''} ${got ? '' : 'unfound'}" onclick="toggleCodexDetail('${r.id}')">
    <img class="codex-icon" src="${itemImgSrc(r.id)}" alt="${d.name}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(d))}'">
    <div class="codex-cell-name">${getItemDisplayName(r.id)}</div>
    <div class="codex-cell-sub">${sub}</div>
    <div class="codex-cell-count ${got ? '' : 'zero'}">${got ? '×' + got : '未取得'}</div>
  </div>`;
}

/* 隱藏圖鑑格子：只看「有沒有從神秘箱/卡冊開出來」，不看持有數。 */
function codexBoxCell(r, book) {
  const isCard = !!CARDS[r.id];
  const d = ITEMS[r.id] || {};
  const got = !!(book.box && book.box[r.id]);
  const sub = isCard ? '卡片（卡冊限定）' : (ITEM_TYPE_LABELS[d.type] || d.type || '');
  const img = isCard ? cardArtSrc(r.id) : itemImgSrc(r.id);
  return `<div class="codex-cell ${codexOpenId === r.id ? 'open' : ''} ${got ? '' : 'unfound'}" onclick="toggleCodexDetail('${r.id}')">
    <img class="codex-icon" src="${img}" alt="${isCard ? (CARDS[r.id].name || '') : d.name}" onerror="this.onerror=null;this.src='${placeholderImgSrc(isCard ? 'card' : itemPlaceholderKind(d))}'">
    <div class="codex-cell-name">${isCard ? (CARDS[r.id].name || r.id) : getItemDisplayName(r.id)}</div>
    <div class="codex-cell-sub">${sub}</div>
    <div class="codex-cell-count ${got ? '' : 'zero'}">${got ? '✔ 已開出' : '未開出'}</div>
  </div>`;
}

/* 隱藏圖鑑進度條（解鎖後才會出現）：神秘箱池＋卡冊限定卡 */
function codexBoxBar(book) {
  const ids = getBoxCodexPool().concat(getAlbumOnlyCards());
  const found = ids.reduce((n, id) => n + ((book.box && book.box[id]) ? 1 : 0), 0);
  const p = ids.length ? Math.min(100, found / ids.length * 100) : 0;
  return `<div class="codex-prog">
    <div class="codex-prog-head"><span>🎁 神秘箱挑戰</span><span>${found} / ${ids.length}　${p.toFixed(1)}%</span></div>
    <div class="bar-track"><div class="bar-fill codex-prog-fill" style="width:${p}%"></div></div>
  </div>`;
}

/* 圖鑑上點「前往」直接換圖並切到地圖分頁——這是整個改造的重點，
   不然玩家查到「這東西在比芙羅斯特原野」還得自己回地圖分頁翻王國→區域→地圖三層下拉。 */
function codexGoToMap(mapId) {
  const m = MAPS.find(x => x.id === mapId);
  if (!m) return;
  changeMap(mapId);
  // 地圖分頁的三層下拉要跟著跳到正確的王國／區域，不然畫面停在原本那一區
  const region = (typeof regionOf === 'function') ? regionOf(mapId) : null;
  if (region) {
    selectedRegionId = region.id;
    const k = KINGDOMS.find(x => x.regions.includes(region.id));
    if (k) selectedKingdomId = k.id;
  }
  switchTab('map');
  renderAll();
}

// 一行「哪張圖、出現率多少、可以直接去」
/* 「12 分 34 秒」。頭目的擊殺耗時動輒幾十分鐘，秒數直接印出來看不出量級 */
function formatKillTime(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' 秒';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} 分 ${r} 秒` : `${m} 分`;
}
/* 頭目的最佳擊殺速度（#137）。

   這個數字不只是紀錄——**離線結算就是靠它決定打不打得動**（用的是最近一次，
   顯示的是歷史最快）。所以要讓玩家看得到：沒打過就沒有離線收益，
   畫面上不講的話那條規則等於是隱形的。

   分三種模式各記一份：打寶把怪的血量拉到 ×3、瘋狂 ×5，同一隻頭目的耗時
   差三到五倍。這裡給三個切換鈕，預設看**現在這個模式**——那才是離線會用到的那份。 */
const BOSS_TIME_MODES = [
  { m: 0, label: '普通' },
  { m: 1, label: '打寶' },
  { m: 2, label: '瘋狂' },
];
let codexBossMode = null;          // null = 跟著目前的打寶模式走
function setCodexBossMode(m) { codexBossMode = m; renderCodexTab(); }
function bossTimeHtml(id, def) {
  if (!def || !def.isBoss) return '';
  const cur = codexBossMode == null
    ? (typeof farmMode === 'function' ? farmMode() : 0) : codexBossMode;
  const rec = (typeof bossKillRecord === 'function') ? bossKillRecord(id, cur) : null;
  const tabs = BOSS_TIME_MODES.map(o => {
    const has = (typeof bossKillRecord === 'function') && bossKillRecord(id, o.m);
    return `<button class="codex-bt-mode ${o.m === cur ? 'active' : ''} ${has ? 'has' : ''}"
      onclick="event.stopPropagation();setCodexBossMode(${o.m})"
      title="${o.label}模式的擊殺紀錄${has ? '' : '（尚未擊敗）'}">${o.label}</button>`;
  }).join('');
  const body = (!rec || !(rec.bestMs > 0))
    ? `<span class="codex-bt-none" title="離線掛機只會遇到你在這個模式下實際擊敗過的頭目">尚未擊敗（此模式離線不會遇到）</span>`
    : `最佳 <b>${formatKillTime(rec.bestMs)}</b>　最近 ${formatKillTime(rec.lastMs)}`;
  return `<div class="codex-boss-time" title="最佳＝歷史最快；離線結算用的是「最近一次」，換裝變強後線上再打一隻就會更新">
    <span class="codex-bt-modes">${tabs}</span>⏱️ ${body}</div>`;
}

/* 遺物與遺物券的取得方式。兩者的來源不同，分開寫：
     遺物券 → 打頭目掉（等級越高機率越高，一般怪也有極小機率）
     遺物   → 拿券去安全區的遺物商人換指定套裝的隨機一件 */
function relicSourceHtml(id, def) {
  const isTicket = typeof RELIC_TICKET_ID !== 'undefined' && id === RELIC_TICKET_ID;
  const isRelic = def && def.type === 'relic';
  if (!isTicket && !isRelic) return '';
  if (isTicket) {
    const tiers = (typeof RELIC_DROP_BOSS_TIERS !== 'undefined' ? RELIC_DROP_BOSS_TIERS : [])
      .slice().sort((a, b) => a.minLevel - b.minLevel)
      .map(t => `Lv${t.minLevel}+ ${t.pct}%`).join('　');
    const normal = typeof RELIC_DROP_PCT_NORMAL !== 'undefined' ? RELIC_DROP_PCT_NORMAL : 0;
    return `<div class="codex-spot shop"><span class="codex-spot-mon">👑 擊敗頭目</span>
        <span class="codex-spot-name">${tiers || '頭目掉落'}</span></div>
      <div class="codex-spot shop"><span class="codex-spot-mon">👾 一般魔物</span>
        <span class="codex-spot-name">${normal}%</span></div>`;
  }
  const cost = typeof RELIC_TICKET_COST !== 'undefined' ? RELIC_TICKET_COST : 10;
  const setName = (typeof RELIC_SETS !== 'undefined' && def.relicSet && RELIC_SETS[def.relicSet])
    ? RELIC_SETS[def.relicSet].name : '';
  return `<div class="codex-spot shop"><span class="codex-spot-mon">🎫 遺物商人</span>
    <span class="codex-spot-name">遺物券 ×${cost} 換${setName ? `「${setName}」` : ''}隨機一件（安全區）</span></div>`;
}

function codexMapRow(m, extra) {
  /* MVP 那幾筆要標出來（#108）：牠們只在 BOSS 模式開著的時候才會出現，
     沒標的話玩家會以為前往之後站著就會遇到。 */
  const mvpTag = m.mvp ? '<span class="codex-spot-mvp" title="要在自動戰鬥頁面開啟 BOSS 模式才會出現">BOSS 模式</span>' : '';
  const pctTitle = m.mvp ? '開啟 BOSS 模式後，這張圖每次補怪抽到牠的機率' : '這張圖抽到牠的機率';
  return `<div class="codex-spot">
    <span class="codex-spot-name">${m.name}</span>
    <span class="codex-spot-pct" title="${pctTitle}">${m.pct < 1 ? m.pct.toFixed(1) : m.pct.toFixed(0)}%</span>
    ${mvpTag}
    ${extra || ''}
    <button class="codex-go" onclick="event.stopPropagation();codexGoToMap('${m.id}')">前往</button>
  </div>`;
}

function renderCodexDetail(id) {
  const book = ensureCodex();
  if (codexView === 'mon') {
    const d = MONSTERS[id];
    if (!d) return '';
    const kills = book.mon[id] || 0;
    const maps = getMonsterMaps(id);
    const drops = (d.drops || []).slice().sort((a, b) => b.chance - a.chance);
    const cd = (typeof MONSTER_CARD_DROPS !== 'undefined') ? MONSTER_CARD_DROPS[id] : null;
    const dropRows = drops.map(x => {
      const it = ITEMS[x.item];
      if (!it) return '';
      const got = book.item[x.item] || 0;
      return `<div class="codex-drop ${got ? 'got' : ''}">
        <img src="${itemImgSrc(x.item)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(it))}'">
        <span class="codex-drop-name">${it.name}</span>
        <span class="codex-drop-rate">${(x.chance * 100).toFixed(2)}%</span>
        <span class="codex-drop-got">${got ? '✔ ×' + got : '—'}</span>
      </div>`;
    }).join('');
    let cardRow = '';
    if (cd && (CARDS[cd.card] || ITEMS[cd.card])) {
      const cname = (CARDS[cd.card] || ITEMS[cd.card]).name;
      const got = book.item[cd.card] || 0;
      cardRow = `<div class="codex-drop card ${got ? 'got' : ''}">
        <img src="${itemImgSrc(cd.card)}" onerror="this.onerror=null;this.src='${placeholderImgSrc('item')}'">
        <span class="codex-drop-name">🃏 ${cname}</span>
        <span class="codex-drop-rate">${(cd.chance * 100).toFixed(2)}%</span>
        <span class="codex-drop-got">${got ? '✔ ×' + got : '—'}</span>
      </div>`;
    }
    return `<div class="codex-detail">
      <button class="codex-detail-close" onclick="toggleCodexDetail('${id}')">✕</button>
      <div class="codex-detail-head">
        <img class="codex-detail-icon" src="${monsterImgSrc(id)}" onerror="this.onerror=null;this.src='${placeholderImgSrc('monster')}'">
        <div>
          <div class="codex-detail-name">${d.name} <span class="codex-detail-lv">Lv.${d.level || '?'}</span></div>
          <div class="codex-detail-tags">
            <span>${ELEMENT_ICONS[d.element] || '⚪'} ${ELEMENT_NAMES[d.element] || d.element || '無'}</span>
            ${d.race ? `<span>${RACE_LABELS[d.race] || d.race}</span>` : ''}
            ${d.size ? `<span>${SIZE_LABELS[d.size] || d.size}</span>` : ''}
            ${d.isMvp ? '<span class="codex-mvp">MVP</span>'
              : (d.isBoss ? '<span class="codex-miniboss">迷你王</span>' : '')}
          </div>
          <div class="codex-detail-kills">累計擊殺 <b>${kills}</b>${bossTimeHtml(id, d)}</div>
        </div>
      </div>
      <div class="codex-detail-stats">
        <span>HP ${d.hp}</span><span title="官方 renewal：傷害 = ATK×(0.8~1.2) + STR + 等級">ATK ${Math.round(d.atk * 0.8 + (d.mobStr || 0) + (d.level || 0))}~${Math.round(d.atk * 1.2 + (d.mobStr || 0) + (d.level || 0))}</span><span title="硬防（比例減傷）＋軟防（固定扣血）">DEF ${d.def}${d.defSoft ? '+' + d.defSoft : ''}</span><span title="魔防：魔法傷害看的是這個，硬魔防比例減傷、軟魔防固定扣血">MDEF ${d.mdef || 0}${d.mdefSoft ? '+' + d.mdefSoft : ''}</span>
        <span>EXP ${d.exp}</span><span>JOB ${d.jobExp}</span>
      </div>
      <div class="codex-detail-sec">出沒地圖<span class="codex-sec-hint">照出現率排序，點「前往」直接過去</span></div>
      ${maps.some(m => m.mvp) ? '<div class="codex-sec-hint codex-mvp-note">標「BOSS 模式」的要先在自動戰鬥頁面開啟 BOSS 模式才會出現。</div>' : ''}
      <div class="codex-spots">${maps.length
        ? maps.map(m => codexMapRow(m)).join('')
        : '<div class="dim">目前無地圖配置</div>'}</div>
      <div class="codex-detail-sec">掉落物</div>
      <div class="codex-drops">${cardRow}${dropRows || (cardRow ? '' : '<div class="dim">沒有掉落物</div>')}</div>
    </div>`;
  }

  // 道具 / 卡片
  const d = ITEMS[id];
  if (!d) return '';
  const card = CARDS[id];
  const got = book.item[id] || 0;
  /* 來源改成「一行一個去處」：哪隻怪掉、掉落率多少、在哪張圖、出現率多少、直接去。
     以前只列到怪物就停了，玩家還得自己再查那隻怪在哪——而一隻怪平均出現在 3.4 張圖。 */
  const spots = getItemFarmSpots(id).slice(0, 15);
  const srcRows = spots.map(s => {
    const m = MONSTERS[s.mon];
    if (!m) return '';
    return `<div class="codex-spot ${s.mvp ? 'mvp' : ''}">
      <img class="codex-spot-icon" src="${monsterImgSrc(s.mon)}" onerror="this.onerror=null;this.src='${placeholderImgSrc('monster')}'">
      <span class="codex-spot-mon">${s.mvp ? '👑' : ''}${m.name}<span class="codex-src-lv">Lv.${m.level || '?'}</span></span>
      <span class="codex-drop-rate" title="掉落率">${(s.dropChance * 100).toFixed(2)}%</span>
      <span class="codex-spot-name">${s.mapName}</span>
      <span class="codex-spot-pct" title="${s.mvp ? '需開啟 MVP 模式，開著時 20% 從該圖的 MVP 名單裡抽' : '這張圖抽到牠的機率'}">${s.spawnPct < 1 ? s.spawnPct.toFixed(1) : s.spawnPct.toFixed(0)}%</span>
      <button class="codex-go" onclick="event.stopPropagation();codexGoToMap('${s.mapId}')">前往</button>
    </div>`;
  }).join('');
  const shopRows = Object.values(NPC_SHOPS)
    .filter(sh => (sh.items || []).includes(id))
    .map(sh => `<div class="codex-spot shop"><span class="codex-spot-mon">🏪 ${sh.name || '商店'}</span>
      <span class="codex-spot-name">${d.buyPrice ? d.buyPrice.toLocaleString() + ' 鋅幣' : '商店販售'}</span></div>`).join('');
  /* 遺物的取得方式（#138）。它們不從掉落表來，所以 getItemFarmSpots() 是空的——
     不補這一段，圖鑑會對 49 件遺物說「沒有怪物會掉」，那是錯的。
     實際規則：頭目掉遺物券（等級越高機率越高），券再拿去跟遺物商人換。 */
  const relicRows = relicSourceHtml(id, d);
  const statBits = [];
  ['atk', 'matk', 'def', 'hp', 'sp', 'str', 'agi', 'vit', 'int', 'dex', 'luk', 'hit', 'flee', 'critRate'].forEach(k => {
    if (typeof d[k] === 'number' && d[k] !== 0) statBits.push(`${k.toUpperCase()} ${d[k] > 0 ? '+' : ''}${d[k]}`);
  });
  if (d.heal) statBits.push(`回復 ${d.heal} HP`);
  if (d.healPct) statBits.push(`回復 ${d.healPct}% HP`);
  if (d.restoreSp) statBits.push(`回復 ${d.restoreSp} SP`);
  if (d.restoreSpPct) statBits.push(`回復 ${d.restoreSpPct}% SP`);

  // 卡片插圖：只在詳情展開時才出現在 DOM，等同延遲載入，一次也只會抓一張
  const illustration = card
    ? `<div class="codex-card-art">
         <img src="${cardArtSrc(id)}" alt="${d.name}" loading="lazy"
              onerror="this.closest('.codex-card-art').style.display='none'">
       </div>`
    : '';
  // 解析不出來的原始效果文字：老實標成未實裝，不讓玩家誤以為有作用
  const unimpl = (card && card.unimplemented && card.unimplemented.length)
    ? `<div class="codex-detail-sec">尚未實裝的效果</div>
       <div class="codex-unimpl">${card.unimplemented.map(u => `<div>• ${u}</div>`).join('')}</div>`
    : '';

  // 卡片的機制效果直接從 bonus 欄位列出，才是引擎真正吃到的數值
  const bonusBits = card ? describeCardBonus(card) : [];

  return `<div class="codex-detail">
    <button class="codex-detail-close" onclick="toggleCodexDetail('${id}')">✕</button>
    <div class="codex-detail-head">
      <img class="codex-detail-icon" src="${itemImgSrc(id)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(d))}'">
      <div>
        <div class="codex-detail-name">${getItemDisplayName(id)}</div>
        <div class="codex-detail-tags">
          <span>${card ? '卡片' : (ITEM_TYPE_LABELS[d.type] || d.type || '')}</span>
          ${card ? `<span>${CARD_SLOT_LABELS[card.slot] || card.slot}</span>` : ''}
          ${d.sell ? `<span>售價 ${d.sell}</span>` : ''}
        </div>
        <div class="codex-detail-kills">累計取得 <b>${got}</b></div>
      </div>
    </div>
    ${illustration}
    ${bonusBits.length ? `<div class="codex-detail-stats">${bonusBits.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
    ${!card && statBits.length ? `<div class="codex-detail-stats">${statBits.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
    ${(card && card.desc) || d.desc ? `<div class="codex-detail-desc">${(card && card.desc) || d.desc}</div>` : ''}
    ${unimpl}
    <div class="codex-detail-sec">去哪裡打<span class="codex-sec-hint">照出現率排序，點「前往」直接過去</span></div>
    <div class="codex-spots">${relicRows}${shopRows}${srcRows || (relicRows || shopRows ? '' : (
      (typeof boxEligible === 'function' && boxEligible(id))
        ? '<div class="dim">沒有怪物會掉、商店也沒賣。神秘箱子與神秘紫箱有機會開到。</div>'
        : '<div class="dim">沒有怪物會掉，也不在商店販售</div>'
    ))}</div>
  </div>`;
}

const CARD_SLOT_LABELS = {
  weapon: '武器插槽', armor: '鎧甲插槽', shield: '盾牌插槽', headgear: '頭飾插槽',
  garment: '披風插槽', footgear: '鞋子插槽', accessory: '飾品插槽', any: '任意插槽'
};
const CARD_BONUS_LABELS = {
  str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK',
  atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', hit: 'HIT', flee: 'FLEE',
  critRate: '暴擊率', perfectDodge: '完全迴避', hp: 'MaxHP', sp: 'MaxSP',
  hpPct: 'MaxHP', spPct: 'MaxSP', matkPct: 'MATK', hpRegenPct: 'HP恢復力', spRegenPct: 'SP恢復力',
  allStat: '全素質', aspdPct: '攻擊速度', aspdFlat: 'ASPD', critDmgPct: '暴擊傷害',
  bossDmgPct: '對首領類傷害', allTargetDmgPct: '物理傷害', rangedDmgPct: '遠距離傷害',
  rangedDmgTakenPct: '受遠距離傷害', bossDmgTakenPct: '受首領類傷害',
  normalDmgTakenPct: '受一般魔物傷害', spCostPct: '技能SP消耗', defPct: 'DEF',
  rangedCritRate: '遠距離攻擊暴擊率',
  expAllPct: '經驗值', dropPct: '掉寶率'
};
function cardArtSrc(cardId) {
  const it = ITEMS[cardId];
  return `images/cards/${it ? it.imgId : cardId}.jpg`;
}
/* 百分比型的加成鍵，顯示時要帶 % */
const CARD_PCT_KEYS = [
  'hpPct', 'spPct', 'hpRegenPct', 'spRegenPct', 'aspdPct', 'critDmgPct',
  'bossDmgPct', 'allTargetDmgPct', 'rangedDmgPct', 'rangedDmgTakenPct',
  'bossDmgTakenPct', 'normalDmgTakenPct', 'spCostPct', 'defPct', 'matkPct',
  'expAllPct', 'dropPct'
];
/* 數值一律帶正負號，減益卡片才不會顯示成「MaxHP +-25%」 */
function signed(v, pct) { return (v > 0 ? '+' : '') + v + (pct ? '%' : ''); }

/* 條件式加成的前綴文字，例如「+9以上時：」「盜賊系列時：」「與大嘴鳥卡片同時裝備時：」 */
function describeCondition(when) {
  if (!when) return '';
  const bits = [];
  if (when.refineMin != null) bits.push(`+${when.refineMin} 以上`);
  if (when.refineMax != null) bits.push(`+${when.refineMax} 以下`);
  if (when.jobLine) bits.push(`${(JOB_TREE[when.jobLine] || {}).name || when.jobLine}系列`);
  if (when.weaponReq) bits.push(`裝備${(typeof weaponReqName === 'function' && weaponReqName(when.weaponReq)) || when.weaponReq}`);
  if (when.withCards) bits.push(when.withCards.map(c => (CARDS[c] || {}).name || c).join('、') + ' 同時裝備');
  if (when.withItems) bits.push(when.withItems.map(i => (ITEMS[i] || {}).name || i).join('、') + ' 同時裝備');
  if (when.statMin) bits.push(Object.entries(when.statMin).map(([k, v]) => `${k.toUpperCase()} ${v} 以上`).join('、'));
  if (when.statMax) bits.push(Object.entries(when.statMax).map(([k, v]) => `${k.toUpperCase()} ${v} 以下`).join('、'));
  if (when.jobIs) bits.push((Array.isArray(when.jobIs) ? when.jobIs : [when.jobIs])
    .map(j => (JOB_TREE[j] || {}).name || j).join('或'));
  return bits.join('且') + '時';
}

/* 一張卡片的完整效果字串陣列：無條件 → 依精煉 → 條件式 */
function describeCardBonus(card) {
  const out = [];
  if (card.bonus) {
    for (const [k, v] of Object.entries(card.bonus)) {
      const s = formatCardBonus(k, v, card.bonus);
      if (s) out.push(s);
    }
  }
  if (card.perRefine) {
    for (const [k, v] of Object.entries(card.perRefine)) {
      out.push(`每精煉 1 階：${formatCardBonus(k, v, card.perRefine)}`);
    }
  }
  // melee：官方寫「近距離」的那幾張，只有手上不是弓的時候才會觸發
  const meleeTag = e => (e.melee ? '近戰' : '');
  (card.autoSpell || []).forEach(a => {
    const sk = (typeof findSkillAnywhere === 'function') ? findSkillAnywhere(a.skill) : null;
    const when = a.on === 'hit' ? '受擊時' : '攻擊時';
    const cond = a.when ? describeCondition(a.when) + '，' : '';
    out.push(`${cond}${meleeTag(a)}${when} ${a.chance}% 自動念咒：${sk ? sk.name.split(' ')[0] : a.skill} Lv${a.lv}`);
  });
  (card.ailment || []).forEach(a => {
    const when = a.on === 'hit' ? '受擊時' : (a.on === 'magic' ? '魔法命中時' : '攻擊時');
    const cond = a.when ? describeCondition(a.when) + '，' : '';
    const names = String(a.type).split('+').map(t => (typeof MON_AILMENTS !== 'undefined' && MON_AILMENTS[t]) ? MON_AILMENTS[t].icon + MON_AILMENTS[t].name : t);
    const what = names.length > 1 ? `${names.join('／')} 隨機一種` : names[0];
    // target：官方「對敵人和自身」那批，代價要跟效果一起寫出來，玩家才看得到取捨
    const who = { self: '使自己', both: '使敵人與自己' }[a.target] || '使敵人';
    out.push(`${cond}${meleeTag(a)}${when} ${a.chance}% ${who}${what}`);
  });
  (card.killDrop || []).forEach(d => {
    const RACE = { insect: '昆蟲', brute: '動物', humanoid: '人型', demon: '惡魔', undead: '不死', plant: '植物', fish: '魚貝', formless: '無形', angel: '天使', dragon: '龍族' };
    const who = d.race ? `擊殺${RACE[d.race] || d.race}系` : '擊殺任何魔物';
    const POOL = { food: '食品類道具', elementResist: '屬性抵抗藥水' };
    const what = d.zeny ? `${d.zeny}z`
      : (d.pool ? POOL[d.pool] || d.pool : (d.items || []).map(i => (ITEMS[i] || {}).name || i).join('／'));
    // 條件（套卡湊齊才掉那一批，#134）跟 autoSpell／ailment 一樣要寫出來，
    // 不然單張卡的說明會宣稱一個要湊齊五張才有的效果
    const cond = d.when ? describeCondition(d.when) + '，' : '';
    out.push(`${cond}${who}時 ${d.chance}% 額外${d.zeny ? '獲得' : '掉落'}：${what}`);
  });
  (card.grantSkill || []).forEach(g => {
    const sk = (typeof findSkillAnywhere === 'function') ? findSkillAnywhere(g.id) : null;
    out.push(`🃏 可使用技能：${sk ? sk.name.split(' ')[0] : g.id} Lv${g.lv}`);
  });
  (card.condBonus || []).forEach(cb => {
    const inner = [];
    for (const [k, v] of Object.entries(cb.bonus || {})) {
      const s = formatCardBonus(k, v, cb.bonus);
      if (s) inner.push(s);
    }
    if (inner.length) out.push(`${describeCondition(cb.when)}：${inner.join('、')}`);
  });
  return out;
}

/* 已插上的卡片。名字下面接跟背包同一套效果字：引擎吃到的加成，沒有就退回敘述。 */
function socketedCardsHtml(cardIds) {
  return (cardIds || []).map(id => {
    const c = CARDS[id];
    if (!c) return `<div class="socket-card"><div class="socket-card-name">🃏 ${id}</div></div>`;
    const bits = describeCardBonus(c);
    const fx = bits.length ? bits.join('、') : (c.desc || '');
    return `<div class="socket-card"><div class="socket-card-name">🃏 ${c.name}</div>${fx ? `<div class="socket-card-fx">${fx}</div>` : ''}</div>`;
  }).join('');
}
function formatCardBonus(k, v, all) {
  if (CARD_BONUS_LABELS[k]) return `${CARD_BONUS_LABELS[k]} ${signed(v, CARD_PCT_KEYS.includes(k))}`;
  if (k === 'ignoreSizePenalty') return '無視體型修正（一律100%傷害）';
  if (k === 'splashAttack') return '普通攻擊改為打擊場上全部敵人（不含技能）';
  if (k.startsWith('itemHeal_')) {
    const it = k.slice(9);
    return `使用${(ITEMS[it] || {}).name || it}時回復量 ${signed(v, 1)}`;
  }
  if (k.startsWith('perStat_')) {
    const p = k.split('_');   // perStat, from, per, to
    return `每 ${p[2]} 點基礎${(p[1] || '').toUpperCase()} → ${(p[3] || '').toUpperCase()} +${v}`;
  }
  if (k.startsWith('eleDmg_')) return `對${ELEMENT_NAMES[k.slice(7)] || k.slice(7)}屬性傷害 ${signed(v, 1)}`;
  if (k.startsWith('eleReduce_')) return `受${ELEMENT_NAMES[k.slice(10)] || k.slice(10)}屬性傷害 ${signed(-v, 1)}`;
  if (k.startsWith('raceDmgReduce_')) return `受${RACE_LABELS[k.slice(14)] || k.slice(14)}傷害 ${signed(-v, 1)}`;
  if (k.startsWith('raceDmg_')) return `對${RACE_LABELS[k.slice(8)] || k.slice(8)}傷害 ${signed(v, 1)}`;
  if (k.startsWith('raceCrit_')) return `對${RACE_LABELS[k.slice(9)] || k.slice(9)}暴擊率 ${signed(v)}`;
  if (k.startsWith('expRace_')) return `擊殺${RACE_LABELS[k.slice(8)] || k.slice(8)}經驗 ${signed(v, 1)}`;
  if (k.startsWith('spOnKillRace_')) return `近戰擊殺${RACE_LABELS[k.slice(13)] || k.slice(13)}回復 ${v} SP`;
  if (k.startsWith('skillDmg_')) {
    const sk = (typeof findSkillAnywhere === 'function') ? findSkillAnywhere(k.slice(9)) : null;
    return `${sk ? sk.name.split(' ')[0] : k.slice(9)} 傷害 ${signed(v, 1)}`;
  }
  // 吸血／吸SP 的機率與比例是一組，機率那個鍵不單獨成句
  if (k === 'lifeStealChance' || k === 'spStealChance') return '';
  if (k === 'lifeStealPct') return `${(all && all.lifeStealChance) || 0}% 機率吸取傷害的 ${v}% 成HP`;
  if (k === 'spStealPct') return `${(all && all.spStealChance) || 0}% 機率吸取傷害的 ${v}% 成SP`;
  if (k.startsWith('sizeDmgReduce_')) return `受${SIZE_LABELS[k.slice(14)] || k.slice(14)}傷害 ${signed(-v, 1)}`;
  if (k.startsWith('sizeDmg_')) return `對${SIZE_LABELS[k.slice(8)] || k.slice(8)}傷害 ${signed(v, 1)}`;
  // 魔物家族／指名單一隻怪的增傷（哥布靈首領、獸人女戰士、熔岩巨石那幾張）
  if (k === 'reflectPct') return `受到近距離物理攻擊時反射 ${v}% 傷害`;
  if (k === 'hpOnMeleeKill') return `近距離物理擊殺時回復 ${v} HP`;
  if (k === 'regenTickHp') return `每 10 秒回復 ${v} HP`;
  if (k === 'regenTickSp') return `每 10 秒回復 ${v} SP`;
  if (k.startsWith('magicEleDmg_')) return `${ELEMENT_NAMES[k.slice(12)] || k.slice(12)}屬性魔法傷害 ${signed(v, 1)}`;
  // 這一條必須排在 familyDmg_ 前面比對，否則前綴會被前者先吃掉
  if (k.startsWith('raceDmgTaken_')) {
    const r = k.slice(14);
    return `受${RACE_LABELS[r] || r}系傷害 ${signed(v, 1)}`;
  }
  if (k.startsWith('familyDmgTaken_')) {
    const f = typeof MONSTER_FAMILIES !== 'undefined' ? MONSTER_FAMILIES[k.slice(15)] : null;
    return `受${f ? f.name + '族' : k.slice(15)}傷害 ${signed(v, 1)}`;
  }
  if (k.startsWith('familyDmg_')) {
    const f = typeof MONSTER_FAMILIES !== 'undefined' ? MONSTER_FAMILIES[k.slice(10)] : null;
    return `對${f ? f.name + '族' : k.slice(10)}傷害 ${signed(v, 1)}`;
  }
  // 異常狀態抗性（#30 做的，但一直沒有對應的文案，畫面上直接露出 ailResist_stone 這種原始鍵）
  if (k.startsWith('ailResist_')) {
    const t = k.slice(10);
    const a = (typeof MON_AILMENTS !== 'undefined' && MON_AILMENTS[t]) ? MON_AILMENTS[t].icon + MON_AILMENTS[t].name : t;
    return v >= 100 ? `免疫${a}` : `${a}抗性 +${v}%`;
  }
  // #17 第五批：官方的「變動施法時間 ±N%」魔改成冷卻秒數（本作技能瞬發）
  // 詠唱／後搖／單技冷卻（與 #17 skillCdFlat 魔改分軌後）
  if (k === 'vctPct' || k.startsWith('vctPct_')) {
    const sk = k.startsWith('vctPct_') && typeof findSkillAnywhere === 'function'
      ? findSkillAnywhere(k.slice(7)) : null;
    const who = sk ? sk.name : '全技能';
    return `${who} 變動詠唱 ${v > 0 ? '−' : '+'}${Math.abs(v)}%`;
  }
  if (k === 'fctFlatSec' || k.startsWith('fctFlatSec_')) return `固定詠唱 −${v} 秒`;
  if (k === 'globalDelayPct') return `技能後延遲 −${v}%`;
  if (k === 'skillDelayFlat' || k.startsWith('skillDelayFlat_')) {
    return `技能冷卻 ${v > 0 ? '+' : ''}${v} 秒`;
  }
  if (k === 'skillCdFlat') return `全技能冷卻 ${v > 0 ? '+' : ''}${v} 秒（舊欄位）`;
  if (k.startsWith('skillCdFlat_')) {
    const sk = (typeof findSkillAnywhere === 'function') ? findSkillAnywhere(k.slice(12)) : null;
    return `${sk ? sk.name.split(' ')[0] : k.slice(12)} 冷卻 ${v > 0 ? '+' : ''}${v} 秒`;
  }
  if (k === 'spawnSpeedPct') return `生怪速度 ${signed(v, 1)}`;
  // #17 第四批
  if (k.startsWith('armorEle_')) {
    const e = k.slice(9);
    return `鎧甲屬性轉為${ELEMENT_ICONS[e] || ''}${ELEMENT_NAMES[e] || e}屬性`;
  }
  if (k === 'magicReflectChance') return `${v}% 機率反射魔法攻擊`;
  // #17 第三批
  // 物防這格以前沒有標籤，畫面上會直接印出 `defIgnorePct +100` 這種 key 名（#136）
  if (k === 'defIgnorePct') return `無視物理防禦力 ${v}%`;
  if (k.startsWith('defIgnoreRace_')) {
    const r = k.slice(14);
    return `無視${(RACE_LABELS && RACE_LABELS[r]) || r}系的物理防禦力 ${v}%`;
  }
  if (k === 'mdefIgnorePct') return `無視魔法防禦力 ${v}%`;
  if (k === 'bossMdefIgnorePct') return `無視 BOSS 魔法防禦力 ${v}%`;
  if (k === 'spOnAttack') return v < 0 ? `每次攻擊消耗 ${-v} SP` : `每次攻擊回復 ${v} SP`;
  if (k === 'reviveFullRestore') return '原地復活時 HP、SP 全部恢復';
  if (k.startsWith('perJobLv10_')) {
    const t = { atk: 'ATK', hit: '命中', critRate: '暴擊率' }[k.slice(11)] || k.slice(11);
    return `每 10 點職業等級 ${t} +${v}`;
  }
  if (k.startsWith('monDmg_')) {
    const m = MONSTERS[k.slice(7)];
    return `對${m ? m.name : k.slice(7)}傷害 ${signed(v, 1)}`;
  }
  return `${k} ${signed(v)}`;
}

/* 商店圖檔載不到時，把 <img> 換成原本的符號，不要留一張破圖。 */
function shopEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function shopIconFallback(img) {
  const s = document.createElement('span');
  s.className = 'shop-item-icon';
  s.textContent = img.getAttribute('data-fb') || '📦';
  img.replaceWith(s);
}
/* 敘述尾巴的「系列／重量／裝備」跟前面的句子拆開，跟裝備說明同一種排法。 */
function itemDescParts(desc) {
  const s = String(desc || '').trim();
  if (!s) return { flavor: '', meta: '' };
  const idx = s.indexOf('系列:');
  if (idx >= 0) return { flavor: s.slice(0, idx).trim(), meta: s.slice(idx).trim() };
  const u = s.indexOf('_');
  if (u >= 0) {
    const tail = s.slice(u + 1).trim();
    if (/^(重量|系列|裝備|攻擊|防禦|武器等級)/.test(tail)) {
      return { flavor: s.slice(0, u).trim(), meta: tail };
    }
  }
  return { flavor: s, meta: '' };
}
/* 浮層敘述：一句一行；不顯示資料檔注入的本服實作／🧩 註記。 */
function scrubMetaNotesFromDesc(desc) {
  let t = String(desc || '');
  for (let i = 0; i < 8; i++) {
    const before = t;
    t = t.replace(/（[^）]*🧩[^）]*）/g, '');
    t = t.replace(/（[^）]*本服(?:實作|未實作|更新)[^）]*）/g, '');
    t = t.replace(/（⚠[^）]*）/g, '');
    if (t === before) break;
  }
  return t.trim();
}
function tooltipDescHtml(desc) {
  let t = scrubMetaNotesFromDesc(desc).replace(/<\/?(?:ITEM|URL|TIPBOX|ele|a)>/gi, '').trim();
  if (!t) return '';
  let spec = '';
  const si = t.search(/系列[:：]/);
  if (si >= 0) { spec = t.slice(si).trim(); t = t.slice(0, si).trim(); }
  const lines = t.split(/(?<=。)/).map(s => s.trim()).filter(Boolean);
  let html = '';
  if (lines.length) html += `<div class="tt-desc">${lines.map(shopEsc).join('<br>')}</div>`;
  if (spec) html += `<div class="tt-meta">${shopEsc(spec)}</div>`;
  return html;
}
/* 裝備欄與商店共用這一塊。opts.cards／refine 只有身上那件帶得走；
   opts.compare 是商店在看「換上去差多少」。 */
function itemTooltipHtml(itemId, opts) {
  opts = opts || {};
  const item = ITEMS[itemId];
  if (!item) return '';
  const refLevel = opts.refine || 0;
  let html = `<div class="tt-name">${shopEsc(getItemDisplayName(itemId))}${refLevel > 0 ? ` <span class="tt-refine">+${refLevel}</span>` : ''}</div>`;
  let type = ITEM_TYPE_LABELS[item.type] || '道具';
  if (item.element && item.element !== 'none' && ELEMENT_NAMES[item.element]) {
    type += ' · ' + (ELEMENT_ICONS[item.element] || '') + ELEMENT_NAMES[item.element];
  }
  html += `<div class="tt-type">${type}</div>`;
  html += opts.descHtml != null ? opts.descHtml : tooltipDescHtml(item.desc);
  const stats = [];
  const atk = statWithRefine(itemId, 'atk', refLevel);
  const def = statWithRefine(itemId, 'def', refLevel);
  if (atk) stats.push(`<span>ATK +${atk}</span>`);
  if (def) stats.push(`<span>DEF +${def}</span>`);
  if (item.matk) stats.push(`<span>MATK +${item.matk}</span>`);
  if (item.mdef) stats.push(`<span>MDEF +${item.mdef}</span>`);
  if (item.hit) stats.push(`<span>HIT +${item.hit}</span>`);
  if (item.flee) stats.push(`<span>FLEE +${item.flee}</span>`);
  if (item.aspd) stats.push(`<span>ASPD +${item.aspd}</span>`);
  if (item.crit) stats.push(`<span>CRIT +${item.crit}</span>`);
  if (item.hp) stats.push(`<span>HP +${item.hp}</span>`);
  if (item.sp) stats.push(`<span>SP +${item.sp}</span>`);
  if (item.str) stats.push(`<span>STR +${item.str}</span>`);
  if (item.agi) stats.push(`<span>AGI +${item.agi}</span>`);
  if (item.vit) stats.push(`<span>VIT +${item.vit}</span>`);
  if (item.int) stats.push(`<span>INT +${item.int}</span>`);
  if (item.dex) stats.push(`<span>DEX +${item.dex}</span>`);
  if (item.luk) stats.push(`<span>LUK +${item.luk}</span>`);
  if (item.heal) stats.push(`<span>回復 ${item.heal} HP</span>`);
  if (item.healPct) stats.push(`<span>回復 ${item.healPct}% HP</span>`);
  if (item.restoreSp) stats.push(`<span>回復 ${item.restoreSp} SP</span>`);
  if (item.restoreSpPct) stats.push(`<span>回復 ${item.restoreSpPct}% SP</span>`);
  if (item.aspdPct) stats.push(`<span>攻擊速度 ${item.aspdPct > 0 ? '+' : ''}${item.aspdPct}%</span>`);
  if (stats.length) html += `<div class="tt-stats">${stats.join('')}</div>`;
  if (typeof getItemEffectPanelRows === 'function') {
    const panel = getItemEffectPanelRows(itemId);
    if (panel.length) {
      html += '<div class="tt-condbonus"><div class="tt-condbonus-title">條件加成（此件）</div>';
      panel.forEach(r => {
        const scale = r.scale != null ? r.scale : 1;
        const bits = Object.entries(r.bonus || {})
          .map(([k, v]) => (typeof formatCardBonus === 'function'
            ? formatCardBonus(k, typeof v === 'number' ? v * scale : v, r.bonus)
            : (k + '+' + v)))
          .filter(Boolean).join('、');
        const sub = r.detail ? ` <span class="tt-condbonus-sub">${shopEsc(r.detail)}</span>` : '';
        html += `<div class="tt-condbonus-row ${r.active ? 'on' : 'off'}">${r.active ? '✅' : '⬜'} ${shopEsc(r.label)}${sub}${bits ? '：' + shopEsc(bits) : ''}</div>`;
      });
      html += '</div>';
    }
  }
  const maxSlots = opts.maxSlots || 0;
  const cards = opts.cards || [];
  if (maxSlots > 0) {
    html += `<div class="tt-slots">插槽 ${cards.length}/${maxSlots}</div>`;
    if (cards.length && typeof socketedCardsHtml === 'function') html += socketedCardsHtml(cards);
  }
  if (opts.compare) html += renderCompareBadge(itemId, refLevel);
  if (opts.hint) html += `<div class="tt-hint">${shopEsc(opts.hint)}</div>`;
  return html;
}
function placeEquipTooltip(tt, anchor) {
  tt.classList.add('show');
  const rect = anchor && anchor.getBoundingClientRect
    ? anchor.getBoundingClientRect()
    : { right: 0, left: 0, top: 0 };
  const tipW = tt.offsetWidth || 280;
  const tipH = tt.offsetHeight || 200;
  let left = rect.right + 8;
  let top = rect.top;
  if (left + tipW > window.innerWidth) left = rect.left - tipW - 8;
  if (left < 4) left = 4;
  if (top + tipH > window.innerHeight - 4) top = Math.max(4, window.innerHeight - tipH - 4);
  if (top < 4) top = 4;
  tt.style.left = left + 'px';
  tt.style.top = top + 'px';
}
function showShopItemTooltip(event, itemId) {
  const item = ITEMS[itemId];
  const tt = document.getElementById('ro-equip-tooltip');
  if (!item || !tt) return;
  const gear = item.type === 'weapon' || item.type === 'armor';
  tt.innerHTML = itemTooltipHtml(itemId, { maxSlots: item.slots || 0, compare: gear });
  placeEquipTooltip(tt, event.currentTarget || event.target);
}
/* 背包列只留一行縮寫，完整說明跟裝備欄共用同一顆浮層。
   ⓘ 點開的要釘住：手機沒有懸停，點一下還會補送 mouseleave，不釘住說明會瞬間關掉。 */
let bagTipPinned = false;
function showBagInfo(event, itemId, instanceId) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  bagTipPinned = true;
  showBagTooltip(event, itemId, instanceId);
}
function showBagTooltip(event, itemId, instanceId) {
  if (bagTipPinned && (!event || event.type !== 'click')) return;
  const item = ITEMS[itemId];
  const tt = document.getElementById('ro-equip-tooltip');
  if (!item || !tt) return;
  const inst = instanceId && state.instances ? state.instances[instanceId] : null;
  const card = typeof CARDS !== 'undefined' ? CARDS[itemId] : null;
  const opts = {
    refine: inst ? (inst.refine || 0) : 0,
    cards: inst && inst.cards ? inst.cards : [],
    maxSlots: item.slots || 0,
    compare: item.type === 'weapon' || item.type === 'armor',
  };
  if (card) {
    const bits = describeCardBonus(card);
    const line = bits.length ? bits.join('、') : (card.desc || '');
    opts.descHtml = `<div class="tt-desc">${shopEsc(line)}</div>`
      + `<div class="tt-meta">插槽：${shopEsc(cardSlotLabel(card))}</div>`;
  }
  tt.innerHTML = itemTooltipHtml(itemId, opts);
  const row = (event.currentTarget && event.currentTarget.classList && event.currentTarget.classList.contains('inv-row'))
    ? event.currentTarget
    : (event.target && event.target.closest ? event.target.closest('.inv-row') : null);
  placeEquipTooltip(tt, row || event.currentTarget);
}
function hideBagTooltip() {
  if (bagTipPinned) return;
  hideEquipTooltip();
}
function dismissBagTip(ev) {
  const t = ev && ev.target;
  if (!t || !t.closest) return;
  if (t.closest('.wh-info-btn')) return;
  if (t.closest('#ro-equip-tooltip')) return;
  const slot = t.closest('.equipwin-slot');
  if (slot && !t.closest('button, a, input, select')) return;
  bagTipPinned = false;
  equipSlotTipPinned = false;
  const tt = document.getElementById('ro-equip-tooltip');
  if (tt) tt.classList.remove('show', 'interactive');
}
if (typeof document !== 'undefined' && !window.__bagTipDismiss) {
  window.__bagTipDismiss = true;
  document.addEventListener('touchstart', dismissBagTip, { passive: true });
  document.addEventListener('mousedown', dismissBagTip);
}

/* ---------------- 背包分頁 ----------------
   背包分成 武器／防具／卡片／道具 四類。卡片獨立成一類是因為它在資料上
   type 是 material，跟 900 多個素材混在一起會完全找不到。
   分類與子分類全部讀既有欄位（type / weaponType / armorType / CARDS.slot），不需要改資料。
------------------------------------------------- */
const INV_CATEGORIES = [
  { key: 'weapon', name: '武器', icon: '⚔️' },
  { key: 'armor',  name: '防具', icon: '🛡️' },
  { key: 'card',   name: '卡片', icon: '🃏' },
  /* 遺物自成一類（#115）：48 件混在「道具」裡跟藥水、素材擠在一起找不到，
     而倉庫是玩家保護遺物不被換券吃掉的唯一手段，得先找得到才行 */
  { key: 'relic',  name: '遺物', icon: '🏺' },
  { key: 'item',   name: '道具', icon: '🎒' }
];
const WEAPON_TYPE_LABELS = {
  // knuckle 原本被標成「拳刃」——拳刃是 katar，knuckle 是拳套，兩種不同武器
  dagger: '匕首', sword: '單手劍', tsword: '雙手劍', spear: '矛',
  mace: '鈍器', bow: '弓', knuckle: '拳套', katar: '拳刃', rod: '法杖',
  // 少了這兩個，94 本書與 142 把槍會全部掉進背包的「其他」分類裡
  book: '書', gun: '槍'
};
const ARMOR_TYPE_LABELS = {
  headgear: '頭飾', leather: '鎧甲', shield: '盾牌',
  garment: '披風', footgear: '鞋子', accessory: '飾品'
};
const ITEM_SUBTYPE_LABELS = { consumable: '消耗品', material: '素材', ammo: '箭矢', etc: '雜物' };

let invCategory = 'weapon';
let invSub = 'all';
let invSearch = '';        // 四個分類共用同一個搜尋字串
let invSort = 'name';      // name | qty | value

function invCategoryOf(itemId) {
  if (CARDS[itemId]) return 'card';
  const d = ITEMS[itemId];
  if (!d) return 'item';
  if (d.type === 'weapon') return 'weapon';
  if (d.type === 'armor') return 'armor';
  if (d.type === 'relic') return 'relic';
  return 'item';
}
// 子分類的值與顯示名稱
function invSubOf(itemId) {
  const cat = invCategoryOf(itemId);
  const d = ITEMS[itemId];
  if (cat === 'weapon') return d.weaponType || 'other';
  if (cat === 'armor') return d.armorType || 'other';
  if (cat === 'card') return (CARDS[itemId].slot || 'any');
  if (cat === 'relic') return d.relicSet || 'other';   // 遺物照套裝分（#115）
  return d.type || 'etc';
}
function invSubLabel(cat, sub) {
  if (cat === 'weapon') return WEAPON_TYPE_LABELS[sub] || '其他';
  if (cat === 'armor') return ARMOR_TYPE_LABELS[sub] || '其他';
  if (cat === 'card') return CARD_SLOT_LABELS[sub] || sub;
  if (cat === 'relic') return (RELIC_SETS[sub] && RELIC_SETS[sub].name) || sub;
  return ITEM_SUBTYPE_LABELS[sub] || sub;
}

/* 裝備比較：算出「換上這件」相對於「目前穿的那件」的數值差。
   只比裝備本身的欄位（含精煉加成），不含卡片——卡片是插在裝備上的，
   換裝時不會跟著走，把它算進去會讓比較結果誤導。 */
const COMPARE_STATS = [
  ['atk', 'ATK'], ['matk', 'MATK'], ['def', 'DEF'], ['mdef', 'MDEF'],
  ['hit', 'HIT'], ['flee', 'FLEE'], ['critRate', '暴擊'], ['perfectDodge', '完全迴避'],
  ['hp', 'MaxHP'], ['sp', 'MaxSP'],
  ['str', 'STR'], ['agi', 'AGI'], ['vit', 'VIT'], ['int', 'INT'], ['dex', 'DEX'], ['luk', 'LUK']
];
// 這件裝備會佔用哪個欄位（用來決定跟誰比）
/* 直接沿用引擎決定「這件會裝到哪一格」的同一套邏輯。
   自己寫一份簡化版會出錯：頭飾一律當成「頭上」，害頭中／頭下的裝備
   （例：金屬口罩是頭下）跑去跟頭上那件比；飾品也一律比飾品1。 */
function targetSlotOf(itemId) {
  const d = ITEMS[itemId];
  if (!d) return null;
  if (d.type !== 'weapon' && d.type !== 'armor') return null;
  return resolveEquipSlotFor(itemId);
}
// 精煉度現在是跟著「那一件」走，不能從 itemId 反查，必須由呼叫端傳進來
function statWithRefine(itemId, key, ref) {
  const d = ITEMS[itemId];
  if (!d) return 0;
  let v = typeof d[key] === 'number' ? d[key] : 0;
  // 精煉只加成武器 ATK 與防具 DEF，跟 equippedAtk()/equippedDef() 的算法一致
  ref = ref || 0;
  if (ref > 0 && key === 'atk' && d.type === 'weapon') v += getRefinementAtkBonus(ref, getRefineWeaponLv(d));
  if (ref > 0 && key === 'def' && d.type === 'armor') v += ref;
  return v;
}
function compareEquip(itemId, newRefine) {
  const slot = targetSlotOf(itemId);
  if (!slot) return null;
  const curId = getEquipBaseItemId(slot);
  const curRef = getRefinementLevel(slot);
  const rows = [];
  COMPARE_STATS.forEach(([key, label]) => {
    const nv = statWithRefine(itemId, key, newRefine);
    const cv = curId ? statWithRefine(curId, key, curRef) : 0;
    if (nv === 0 && cv === 0) return;
    rows.push({ label, cur: cv, next: nv, diff: nv - cv });
  });
  return { slot, curId, curRef, rows };
}
/* 換裝比較：優先顯示**角色實際數值**會怎麼變（ATK/DEF/最大HP/命中…）。

   以前只比「裝備欄位上寫的數字」，那跟真正打出來的傷害是兩回事：
   武器 ATK 要經過精煉曲線、卡片與條件式加成（#19）、素質衍生的 ATK 也會跟著動。
   現在走 engine.js 的 previewEquipDelta()——暫時穿上去重算一次再還原，數字保證跟實戰一致。
   穿不上的（職業／等級擋住）沒辦法模擬，退回舊的「只比裝備本身數值」並標明原因。 */
function renderCompareBadge(itemId, newRefine, instanceId) {
  const slot = targetSlotOf(itemId);
  if (!slot) return '';
  const curId = getEquipBaseItemId(slot);
  const curRef = getRefinementLevel(slot);
  const curName = curId ? `${curRef > 0 ? '+' + curRef + ' ' : ''}${getItemDisplayName(curId)}` : '（空欄位）';

  const prev = typeof previewEquipDelta === 'function' ? previewEquipDelta(itemId, instanceId) : null;
  if (prev) {
    if (!prev.changes.length) return `<div class="inv-compare same">對比 ${curName}：角色數值沒有變化</div>`;
    const parts = prev.changes.map(c =>
      `<span class="cmp-${c.delta > 0 ? 'up' : 'down'}">${c.label} ${c.delta > 0 ? '▲+' : '▼'}${c.delta}</span>`
    );
    return `<div class="inv-compare">對比 ${curName}：${parts.join('')}</div>`;
  }

  const cmp = compareEquip(itemId, newRefine);
  if (!cmp || !cmp.rows.length) return '';
  const parts = cmp.rows.filter(r => r.diff !== 0).map(r =>
    `<span class="cmp-${r.diff > 0 ? 'up' : 'down'}">${r.label} ${r.diff > 0 ? '▲+' : '▼'}${r.diff}</span>`
  );
  if (!parts.length) return `<div class="inv-compare same">與目前裝備數值相同</div>`;
  return `<div class="inv-compare">（穿不上，只比裝備數值）對比 ${curName}：${parts.join('')}</div>`;
}

// 不認識的分類就退回第一類：下面 renderInventoryTab() 有一處 INV_CATEGORIES.find(...).name，
// 傳進沒有的 key 會直接讓整個背包分頁掛掉
function setInvCategory(c) {
  invCategory = INV_CATEGORIES.some(x => x.key === c) ? c : INV_CATEGORIES[0].key;
  invSub = 'all';
  renderInventoryTab();
}
function setInvSub(s) { invSub = s; renderInventoryTab(); }
function setInvSort(s) { invSort = s; renderInventoryTab(); }
function onInvSearch(v, ev) {
  if (imeComposing(ev)) return;          // 注音組字中不重畫，見 imeComposing()
  invSearch = (v || '').trim().toLowerCase();
  renderInventoryTab();
  refocusSearch('inv-search');
}

/* 裝備視窗：RO 原版底圖（深色反轉），10 格座標見 EQUIPWIN_POS */
const EQUIPWIN_POS = {
  head_top:    { x: 6.1,  y: 13.1, name: '頭上' },
  head_bottom: { x: 6.1,  y: 32.3, name: '頭下' },
  weapon:      { x: 6.1,  y: 52.3, name: '武器' },
  garment:     { x: 6.1,  y: 72.3, name: '披風' },
  accessory1:  { x: 6.1,  y: 92.3, name: '飾品1' },
  head_mid:    { x: 93.6, y: 13.1, name: '頭中' },
  armor:       { x: 93.6, y: 32.3, name: '身體' },
  shield:      { x: 93.6, y: 52.3, name: '左手' },
  footgear:    { x: 93.6, y: 72.3, name: '鞋子' },
  accessory2:  { x: 93.6, y: 92.3, name: '飾品2' },
  ammo:        { x: 50.4, y: 88.5, name: '箭矢' },   // 中間那顆大橢圓（原本是角色影子）
};
/* 裝備欄摺疊：釘住的區塊（裝備欄 286px + 切換鈕 46px）在 1280×720 會吃掉分頁高度的 65%，
   下面的清單只剩兩列。摺起來就只剩標題列，換裝備時再展開。預設展開，狀態寫進存檔。 */
function getEquipPanelCollapsed() { return !!(state && state.equipPanelCollapsed); }
function toggleEquipPanel() { state.equipPanelCollapsed = !state.equipPanelCollapsed; saveGame(); renderEquipTab(); }

function buildEquipPanelHtml() {
  return buildEquipWinHtml();
}
/* 裝備欄正中畫一幀待機紙娃娃。跟戰場同一套圖層，不另外做靜圖。 */
function paintEquipDoll() {
  const host = document.getElementById('equipwin-doll');
  if (!host || !window.PAPERDOLL || typeof paperdollParts !== 'function') return;
  const parts = paperdollParts();
  if (!parts) { host.replaceChildren(); return; }
  /* 裝備欄用正面站姿（idle），不用備戰側面圖。 */
  let act = 'idle';
  if (!paperdollFrameCount(parts[0], act)) act = 'idle_s';
  const body = paperdollFrame(parts[0], act, 0);
  if (!body) return;
  let canvas = host.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
  }
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  paperdollExpand(parts[0], body, 0, 0, box);
  const layers = [];
  for (let p = 1; p < parts.length; p++) {
    const fr = paperdollFrame(parts[p], act, 0);
    if (!fr) continue;
    const al = paperdollAlign(parts[p], body, fr);
    layers.push([parts[p], fr, al[0], al[1]]);
    paperdollExpand(parts[p], fr, al[0], al[1], box);
  }
  if (!isFinite(box.minX)) return;
  const pad = 2;
  const minX = Math.floor(box.minX) - pad;
  const minY = Math.floor(box.minY) - pad;
  canvas.width = Math.max(1, Math.ceil(box.maxX) + pad - minX);
  canvas.height = Math.max(1, Math.ceil(box.maxY) + pad - minY);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ox = -minX, oy = -minY;
  let pending = !drawPaperdollLayers(ctx, parts[0], body, ox, oy);
  layers.forEach(layer => {
    if (!drawPaperdollLayers(ctx, layer[0], layer[1], ox + layer[2], oy + layer[3])) pending = true;
  });
  if (pending) {
    parts.forEach(part => {
      const im = paperdollImage(part);
      if (im && !im.complete) im.addEventListener('load', paintEquipDoll, { once: true });
    });
  }
}
function equipWinLabel(itemId) {
  return String(getItemDisplayName(itemId) || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// RO 底圖版：把 10 格（＋箭矢格）用百分比疊在底圖上
function buildEquipWinHtmlInner() {
  const weaponId = getEquipBaseItemId('weapon');
  const twoHanded = isTwoHanded(weaponId);

  let html = `<div class="equipwin">
    <img class="equipwin-bg" src="images/ui/equipwin_bg.png" alt="">
    <div class="equipwin-doll" id="equipwin-doll"></div>`;

  Object.keys(EQUIPWIN_POS).forEach(key => {
    const p = EQUIPWIN_POS[key];
    // 左手被雙手武器佔住時，顯示同一把武器
    const shadow = (key === 'shield' && twoHanded);
    const srcSlot = shadow ? 'weapon' : key;
    const itemId = key === 'ammo' ? getEquippedAmmoId() : getEquipBaseItemId(srcSlot);
    const ref = key === 'ammo' ? 0 : getRefinementLevel(srcSlot);
    const cards = key === 'ammo' ? [] : getEquippedCards(srcSlot);
    const style = `left:${p.x}%;top:${p.y}%`;

    if (!itemId) {
      html += `<div class="equipwin-slot is-empty" style="${style}" title="${p.name}"></div>`;
      return;
    }
    const qtyTag = key === 'ammo' ? `<span class="equipwin-qty">${getItemQty(itemId)}</span>` : '';
    html += `<div class="equipwin-slot${shadow ? ' two-hand-shadow' : ''}" style="${style}"
      title="${p.name}"
      onmouseenter="showEquipTooltip(event,'${srcSlot}')" onmouseleave="hideEquipTooltip()"
      onclick="openEquipSlotPanel(event,'${srcSlot}')">
      <img src="${itemImgSrc(itemId)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(key === 'ammo' ? 'item' : 'armor')}'">
      ${cards.length ? `<span class="equipwin-card">🃏</span>` : ''}
      ${qtyTag}
    </div>`;
    if (key !== 'ammo') {
      const side = p.x < 50 ? 'left' : 'right';
      const plus = ref > 0 ? `+${ref} ` : '';
      html += `<div class="equipwin-name ${side}" style="top:${p.y}%"><span>${plus}${equipWinLabel(itemId)}</span></div>`;
    }
  });

  html += `</div>`;
  return html;
}
// 底圖版也要有箭矢的操作入口（中間那顆橢圓只是顯示，按鈕仍放在下方一列）
function buildEquipWinHtml() {
  return buildEquipWinHtmlInner() + buildAmmoRowHtml();
}

/* 點裝備格：浮層顯示完整說明與卸下／插卡／精煉，不切換分頁。 */
let equipSlotTipPinned = false;

function equipSlotActionsHtml(slotKey) {
  const cards = getEquippedCards(slotKey);
  const maxSlots = getEquipCardSlots(slotKey);
  return `<div class="tt-actions">
    <button type="button" class="btn-small" onclick="equipSlotActionUnequip('${slotKey}')">卸下</button>
    ${maxSlots > cards.length ? `<button type="button" class="btn-small ghost" onclick="equipSlotActionCards('${slotKey}')">插卡</button>` : ''}
    ${cards.length ? `<button type="button" class="btn-small ghost danger" onclick="equipSlotActionRemoveCard('${slotKey}')">取出卡片</button>` : ''}
    <button type="button" class="btn-small ghost" onclick="equipSlotActionRefine('${slotKey}')">精煉</button>
  </div>`;
}

function openEquipSlotPanel(event, slotKey) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const itemId = getEquipBaseItemId(slotKey);
  if (!itemId) return;
  const item = ITEMS[itemId];
  const tt = document.getElementById('ro-equip-tooltip');
  if (!item || !tt) return;
  equipSlotTipPinned = true;
  bagTipPinned = false;
  const refLevel = getRefinementLevel(slotKey);
  const slotCards = getEquippedCards(slotKey);
  const maxSlots = getEquipCardSlots(slotKey);
  tt.innerHTML = itemTooltipHtml(itemId, {
    refine: refLevel,
    cards: slotCards,
    maxSlots: maxSlots,
  }) + equipSlotActionsHtml(slotKey);
  const slotEl = event && event.target && event.target.closest
    ? event.target.closest('.equipwin-slot')
    : null;
  placeEquipTooltip(tt, slotEl || (event && event.currentTarget));
  tt.classList.add('interactive');
}

function closeEquipSlotPanel() {
  equipSlotTipPinned = false;
  const tt = document.getElementById('ro-equip-tooltip');
  if (tt) {
    tt.classList.remove('show', 'interactive');
  }
}

function equipSlotActionUnequip(slotKey) {
  closeEquipSlotPanel();
  unequipItem(slotKey);
  refreshEquipViews();
  renderTopBar();
}
function equipSlotActionCards(slotKey) {
  closeEquipSlotPanel();
  showCardSelect(slotKey);
}
function equipSlotActionRemoveCard(slotKey) {
  closeEquipSlotPanel();
  doRemoveCard(slotKey);
}
function equipSlotActionRefine(slotKey) {
  closeEquipSlotPanel();
  showRefinePanel(slotKey);
}

/* 箭矢狀態列：裝了哪種箭、剩幾支；拿弓卻沒箭時給明顯警告 */
function buildAmmoRowHtml() {
  const ammoId = getEquippedAmmoId();
  const bow = needsAmmo();
  if (!ammoId && !bow) return '';
  const d = ammoId ? ITEMS[ammoId] : null;
  const qty = getAmmoCount();
  const warn = bow && qty <= 0;
  return `<div class="ammo-row${warn ? ' warn' : ''}">
    <span class="ammo-label">🏹 箭矢</span>
    ${d
      ? `<img class="ammo-icon" src="${itemImgSrc(ammoId)}" onerror="this.onerror=null;this.src='${placeholderImgSrc('item')}'">
         <span class="ammo-name">${d.name}${d.element && d.element !== 'none' ? ` ${ELEMENT_ICONS[d.element]}` : ''}　ATK+${d.atk || 0}</span>
         <span class="ammo-qty${qty <= 0 ? ' zero' : ''}">×${qty}</span>
         <button class="btn-small ghost" onclick="unequipAmmo();renderEquipTab();renderTopBar();">卸下</button>`
      : `<span class="ammo-name">未裝備</span>`}
    <button class="btn-small" onclick="showAmmoSelect()">選擇箭矢</button>
    ${warn ? `<span class="ammo-warn">沒箭矢，弓無法攻擊！</span>` : ''}
  </div>`;
}

// 選箭矢：只列背包裡真的有的箭
function showAmmoSelect() {
  const el = document.getElementById('tab-equip');
  if (!el) return;
  const rows = state.inventory.filter(r => !r.instanceId && isAmmoItem(r.item) && r.qty > 0);
  let html = `<h3 class="panel-title">🏹 選擇箭矢</h3>`;
  html += `<button class="btn-small" onclick="renderEquipTab()">← 返回裝備欄</button>`;
  if (!rows.length) {
    html += `<div class="equip-pick-empty">背包裡沒有箭矢。弓箭手可以在城鎮的武器商人買到。</div>`;
  } else {
    html += rows.map(r => {
      const d = ITEMS[r.item];
      const on = getEquippedAmmoId() === r.item;
      return `<div class="equip-pick-row${on ? ' equipped' : ''}">
        <img src="${itemImgSrc(r.item)}" onerror="this.onerror=null;this.src='${placeholderImgSrc('item')}'">
        <div class="equip-pick-info">
          <div class="equip-pick-name">${d.name}　<span class="ammo-qty">×${r.qty}</span></div>
          <div class="equip-pick-stats">ATK +${d.atk || 0}${d.element && d.element !== 'none' ? `　${ELEMENT_ICONS[d.element]}${ELEMENT_NAMES[d.element]}屬性` : '　無屬性'}</div>
        </div>
        ${on ? `<span class="equip-pick-stats">使用中</span>`
             : `<button class="btn-small" onclick="equipAmmo('${r.item}');renderEquipTab();renderTopBar();">裝備</button>`}
      </div>`;
    }).join('');
  }
  el.innerHTML = html;
}

/* ---------------- 裝備分頁 ----------------
   上半是裝備欄（sticky 釘住不動），下半列出背包裡「本職業穿得上」的武器／防具，
   直接點就換裝。個體裝備（精煉／插卡過的）跟普通那疊分開列，各自是一件。
------------------------------------------------- */
let equipPickCat = 'weapon';   // 'weapon' | 'armor' | 'relic'
function setEquipPickCat(c) { equipPickCat = c; renderEquipTab(); }
/* 三顆分頁鈕。一般裝備與遺物兩條路都會用到，抽出來免得改一邊漏另一邊 */
function equipPickTabsHtml() {
  const btn = (key, label) => `<button class="btn-small ${equipPickCat === key ? 'active' : 'ghost'}"
    onclick="setEquipPickCat('${key}')">${label}</button>`;
  return btn('weapon', '⚔️ 武器') + btn('armor', '🛡️ 防具') + btn('relic', '🏺 遺物');
}

/* ---------------- 遺物頁（#113／#115 改版）----------------
   版面：上面八格遺物欄**釘住不捲**，下面是背包清單（依套裝分組）。

   套裝效果不再列成一大塊——那四百字佔掉整個畫面，而且穿好之後就不必再看。
   改成滑過欄位才浮出來（沿用一般裝備的 #ro-equip-tooltip），
   同時把「這套穿了幾件、哪幾段生效了」一起顯示。
------------------------------------------------- */

/* 生效段數 → 發光顏色。2 件綠、3 件黃、5 件紅（使用者指定）。
   只看**件數**不看有沒有 proc：玩家要的是「一眼看出這套湊到哪」。 */
function relicGlowClass(count) {
  if (count >= 5) return 'glow5';
  if (count >= 3) return 'glow3';
  if (count >= 2) return 'glow2';
  return '';
}

function relicSlotCellHtml(slot, counts) {
  const worn = (state.relics || {})[slot];
  const d = worn ? RELIC_ITEMS[worn] : null;
  const label = RELIC_SLOT_NAMES[slot];
  if (!d) {
    return `<div class="relic-cell empty" title="${label}">
      <div class="relic-cell-icon">${RELIC_SLOT_ICONS[slot]}</div>
      <div class="relic-cell-name">${label}</div></div>`;
  }
  const set = RELIC_SETS[d.relicSet];
  const glow = relicGlowClass(counts[d.relicSet] || 0);
  return `<div class="relic-cell filled ${glow}"
      onmouseenter="showRelicTooltip(event,'${slot}')" onmouseleave="hideEquipTooltip()"
      onclick="doUnequipRelic('${slot}')">
    <div class="relic-cell-icon">${set.icon}</div>
    <div class="relic-cell-name">${set.pieceNames[slot]}</div>
    <div class="relic-cell-set">${set.name.replace('的遺物', '')}</div></div>`;
}

/* 遺物的浮動說明。共用一般裝備那顆 #ro-equip-tooltip，
   免得同時有兩個浮動視窗要各自處理定位與關閉。

   **背包裡的遺物也吃同一支**（#118）：要先穿上去才知道加什麼，
   等於逼玩家把身上的拆掉試——尤其八格全滿時還得先卸一件。 */
function relicTooltipHtml(itemId, hint) {
  const d = RELIC_ITEMS[itemId];
  if (!d) return '';
  const set = RELIC_SETS[d.relicSet];
  const n = relicSetCounts()[set.id] || 0;
  let html = `<div class="tt-name">${set.icon} ${d.name}</div>`;
  html += `<div class="tt-type">${RELIC_SLOT_NAMES[d.relicSlot]}　<b class="tt-relic-count ${relicGlowClass(n)}">身上 ${n} / ${RELIC_SLOTS.length} 件</b></div>`;
  html += `<div class="tt-desc">${set.desc}</div>`;
  set.tiers.forEach(tier => {
    const on = n >= tier.need;
    html += `<div class="tt-relic-tier ${on ? 'on' : 'off'}">
      <span class="tt-relic-need">${on ? '✔' : '　'} ${tier.need} 件</span>
      <span>${tier.text}</span></div>`;
  });
  if (hint) html += `<div class="tt-hint">${hint}</div>`;
  return html;
}
/* 定位。anchor 是被指到的那一格／那一列 */
function placeRelicTooltip(tt, anchor) {
  tt.classList.add('show');
  const rect = anchor.getBoundingClientRect();
  const h = tt.offsetHeight || 260;
  let left = rect.right + 8;
  let top = rect.top;
  if (left + 300 > window.innerWidth) left = rect.left - 308;
  if (left < 4) left = 4;
  // 遺物的說明比一般裝備長（三段效果），所以底部保留多一點
  if (top + h + 10 > window.innerHeight) top = Math.max(4, window.innerHeight - h - 10);
  if (top < 4) top = 4;
  tt.style.left = left + 'px';
  tt.style.top = top + 'px';
}
function showRelicTooltip(event, slot) {
  const worn = (state.relics || {})[slot];
  const tt = document.getElementById('ro-equip-tooltip');
  if (!worn || !tt) return;
  tt.innerHTML = relicTooltipHtml(worn, '點一下卸下');
  placeRelicTooltip(tt, event.currentTarget);
}
/* 背包那一列：多告訴玩家「穿上去會換掉誰」，那是這裡才有的資訊 */
function showRelicItemTooltip(event, itemId) {
  const tt = document.getElementById('ro-equip-tooltip');
  if (!tt || !RELIC_ITEMS[itemId]) return;
  const worn = (state.relics || {})[RELIC_ITEMS[itemId].relicSlot];
  const hint = !worn ? '這一格空著，可直接穿'
    : (worn === itemId ? '這一件已經穿在身上'
      : `穿上去會換下 ${RELIC_ITEMS[worn].name}`);
  tt.innerHTML = relicTooltipHtml(itemId, hint);
  placeRelicTooltip(tt, event.currentTarget);
}

/* 背包清單改成**分頁**（#116）。六套 48 種列成一長串要捲很久，
   而玩家一次只在湊一套——切到那一套就好。

   分頁選擇記在模組變數，不進存檔：這是「現在在看哪一頁」，
   不是玩家的設定，重開遊戲回到預設反而正確。 */
let relicBagSet = null;

function setRelicBagSet(id) { relicBagSet = id; renderEquipTab(); }

/* 這一格現在被誰佔著。用來回答「這件我能不能直接穿」——
   空著＝直接穿、同款＝已經穿了、別套＝穿上去會把那件換下來。
   沒有這行的話，畫面上只寫「帽子」，玩家得自己記八格分別是誰。 */
function relicSlotOccupantHtml(itemId) {
  const d = RELIC_ITEMS[itemId];
  const worn = (state.relics || {})[d.relicSlot];
  if (!worn) return '<span class="relic-occ free">空著，可直接穿</span>';
  if (worn === itemId) return '<span class="relic-occ same">已裝備</span>';
  const od = RELIC_ITEMS[worn];
  const oset = RELIC_SETS[od.relicSet];
  return `<span class="relic-occ swap">換下 ${oset.icon} ${oset.name.replace('的遺物', '')}・${oset.pieceNames[od.relicSlot]}</span>`;
}

function relicBagHtml() {
  const rows = state.inventory.filter(r => {
    const d = RELIC_ITEMS[r.item];
    return d && d.type === 'relic' && !r.instanceId && r.qty > 0;
  });
  if (!rows.length) {
    return '<div class="equip-pick-empty">背包裡沒有遺物。遺物只在打寶模式掉落。</div>';
  }
  const counts = relicSetCounts();
  const bySet = {};
  rows.forEach(r => { (bySet[RELIC_ITEMS[r.item].relicSet] = bySet[RELIC_ITEMS[r.item].relicSet] || []).push(r); });

  /* 分頁順序照 RELIC_SETS，不是照背包順序——每次撿到東西都重排會找不到東西。
     只列**背包裡有的**那幾套：空分頁點進去是空的，等於一顆廢按鈕。 */
  const avail = Object.values(RELIC_SETS).filter(set => bySet[set.id]);
  // 記著的那一套已經被換券換光時，退回第一套，不然會停在空白頁
  const cur = avail.find(s => s.id === relicBagSet) || avail[0];

  const tabs = avail.map(set => {
    const n = counts[set.id] || 0;
    const bag = bySet[set.id].reduce((a, r) => a + r.qty, 0);
    return `<button class="btn-small relic-tab ${set.id === cur.id ? 'active' : 'ghost'} ${relicGlowClass(n)}"
      onclick="setRelicBagSet('${set.id}')" title="${set.name}：身上 ${n} 件、背包 ${bag} 件">
      ${set.icon} ${set.name.replace('的遺物', '')} <span class="relic-tab-n">${n}/${RELIC_SLOTS.length}</span></button>`;
  }).join('');

  const list = bySet[cur.id]
    .sort((a, b) => RELIC_SLOTS.indexOf(RELIC_ITEMS[a.item].relicSlot) - RELIC_SLOTS.indexOf(RELIC_ITEMS[b.item].relicSlot))
    .map(r => {
      const d = RELIC_ITEMS[r.item];
      return `<div class="equip-pick-row"
          onmouseenter="showRelicItemTooltip(event,'${r.item}')" onmouseleave="hideEquipTooltip()">
        <div class="relic-row-icon">${cur.icon}</div>
        <div class="equip-pick-info">
          <div class="equip-pick-name">${cur.pieceNames[d.relicSlot]}${r.qty > 1 ? ` <span class="inv-slots">×${r.qty}</span>` : ''}</div>
          <div class="equip-pick-stats">${RELIC_SLOT_NAMES[d.relicSlot]}　${relicSlotOccupantHtml(r.item)}</div>
        </div>
        <button class="btn-small" onclick="doEquipRelic('${r.item}')">裝備</button>
      </div>`;
    }).join('');

  const n = counts[cur.id] || 0;
  // 缺哪幾個部位：湊套裝時最常問的問題，列出來省得自己對照上面八格
  const missing = RELIC_SLOTS.filter(s => {
    const worn = (state.relics || {})[s];
    return !worn || RELIC_ITEMS[worn].relicSet !== cur.id;
  }).map(s => RELIC_SLOT_NAMES[s]);

  return `<div class="relic-bag-tabs">${tabs}</div>
    <div class="relic-bag-head ${relicGlowClass(n)}">${cur.icon} ${cur.name}
      <span class="relic-bag-count">身上 ${n} / ${RELIC_SLOTS.length}</span></div>
    ${n >= 5 ? '' : `<div class="relic-bag-missing">還沒穿上：${missing.join('、')}</div>`}
    ${list}`;
}

function relicMerchantHtml() {
  const tickets = getItemQty(RELIC_TICKET_ID);
  const spare = relicSpareTotal();
  const canExchange = spare >= RELIC_TICKET_COST;
  const inTown = isInTown();
  const buttons = Object.values(RELIC_SETS).map(set =>
    `<button class="btn-small ${tickets > 0 && inTown ? '' : 'ghost'}" ${tickets > 0 && inTown ? '' : 'disabled'}
      onclick="doRedeemRelicTicket('${set.id}')">${set.icon} 換 ${set.name}</button>`).join('');
  return `<div class="relic-merchant">
    <div class="relic-merchant-head">🎫 遺物商人　<span class="relic-merchant-sub">遺物券 ${tickets} 張・背包遺物 ${spare} 件</span></div>
    <div class="relic-merchant-row">
      <button class="btn-small ${canExchange ? '' : 'ghost'}" ${canExchange ? '' : 'disabled'}
        onclick="doExchangeRelicTicket()">遺物 ${RELIC_TICKET_COST} 件 → 遺物券 1 張</button>
      <span class="relic-merchant-note">只吃背包，倉庫裡的不算。要留的先存倉庫。</span>
    </div>
    <div class="relic-merchant-row">${buttons}</div>
    ${inTown ? '' : '<div class="relic-merchant-note">遺物商人只在安全區做生意。</div>'}
  </div>`;
}

/* 釘在頂端的那一塊：分頁鈕 + 八格遺物欄。捲動時不會跑掉 */
function relicStickyHtml() {
  const counts = relicSetCounts();
  return `<div class="equip-sticky">
    <div class="equip-pick-head">${equipPickTabsHtml()}</div>
    <div class="relic-grid">${RELIC_SLOTS.map(s => relicSlotCellHtml(s, counts)).join('')}</div>
  </div>`;
}

function renderRelicPageHtml() {
  return relicStickyHtml()
    + relicMerchantHtml()
    + relicBagHtml();
}
function doEquipRelic(itemId) { equipRelic(itemId); renderEquipTab(); renderTopBar(); }
function doUnequipRelic(slot) { unequipRelic(slot); renderEquipTab(); renderTopBar(); }
function doExchangeRelicTicket() { exchangeRelicTicket(); renderEquipTab(); }
function doRedeemRelicTicket(setId) { redeemRelicTicket(setId); renderEquipTab(); }

/* 裝備欄現在住在「裝備」分頁，但背包分頁也會顯示個體裝備列，
   兩邊都可能因為換裝／精煉／插卡而需要重畫——重畫目前看得到的那個就好 */
function refreshEquipViews() {
  if (activeTab === 'inventory') renderInventoryTab();
  else renderEquipTab();
}

/* 這件裝備目前這個職業穿不穿得上。
   reqJob 寫的是「本職」名稱（例：日本刀是 swordsman/merchant/thief），
   而二轉職業穿得下一轉的裝備，所以要比對整條職業鏈（騎士＝novice→swordsman→knight）。
   沒寫 reqJob 的視為全職業通用。

   武器還要多過一關**武器分類**：官方有些武器沒寫職業限制，靠的是「這個職業能不能用書／槍」
   這條規則擋（預言錄就是這種，reqJob 空白但騎士拿不動書）。
   只看 reqJob 的話，清單會列出按下去才被 equipBlockReason() 打回票的東西。 */
function canJobEquip(def) {
  if (!def) return false;
  if (def.reqJob && def.reqJob.length && !getAllLearnedJobs().some(j => def.reqJob.includes(j))) return false;
  if (def.type === 'weapon' && typeof jobCanUseWeapon === 'function' && !jobCanUseWeapon(state.jobId, def.id)) return false;
  return true;
}

function renderEquipTab() {
  const el = document.getElementById('tab-equip');
  if (!el) return;
  hideEquipTooltip();

  /* 遺物頁走完全獨立的一條路：它沒有精煉、沒有卡片、沒有職業限制，
     跟下面那段（比較徽章、孔數、個體裝備）沒有一行是共用的。 */
  if (equipPickCat === 'relic') {
    try {
      el.innerHTML = renderRelicPageHtml();
    } catch (e) {
      el.innerHTML = `<div class="empty-hint">遺物頁載入錯誤：${e.message}</div>`;
      console.error('renderEquipTab(relic) error:', e);
    }
    return;
  }

  try {
    const rows = state.inventory.filter(r => {
      const d = ITEMS[r.item];
      return d && d.type === equipPickCat && canJobEquip(d);
    }).sort((a, b) => {
      // 個體（精煉/插卡）排前面，其次照名稱
      const ai = a.instanceId ? 0 : 1, bi = b.instanceId ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return (ITEMS[a.item].name || '').localeCompare(ITEMS[b.item].name || '', 'zh-Hant');
    });

    const listHtml = rows.length ? rows.map(r => {
      const d = ITEMS[r.item];
      const inst = r.instanceId ? (state.instances || {})[r.instanceId] : null;
      if (r.instanceId && !inst) return '';
      const refine = inst ? (inst.refine || 0) : 0;
      const cards = inst ? (inst.cards || []) : [];

      const bits = [];
      if (d.atk) bits.push(`ATK ${statWithRefine(r.item, 'atk', refine)}`);
      if (d.def) bits.push(`DEF ${statWithRefine(r.item, 'def', refine)}`);
      if (d.matk) bits.push(`MATK ${d.matk}`);
      if (d.element) bits.push(`${ELEMENT_ICONS[d.element]}${ELEMENT_NAMES[d.element]}`);
      if (!r.instanceId && r.qty > 1) bits.push(`×${r.qty}`);

      // 這份清單來源是背包，穿在身上的裝備不在裡面，所以一律是「裝備」；
      // 要卸下請點上方裝備欄那一格（連點兩下）
      const action = r.instanceId ? `equipInstance('${r.instanceId}')` : `equipItem('${r.item}')`;
      return `<div class="equip-pick-row">
        <img src="${itemImgSrc(r.item)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(d))}'">
        <div class="equip-pick-info">
          <div class="equip-pick-name"><button type="button" class="wh-info-btn" aria-label="看完整說明" onclick="showBagInfo(event,'${r.item}','${r.instanceId || ''}')">ⓘ</button>${refine > 0 ? `<span class="slot-refine">+${refine}</span> ` : ''}${getItemDisplayName(r.item)}${d.slots ? ` <span class="inv-slots">[${d.slots}]</span>` : ''}</div>
          <div class="equip-pick-stats">${bits.join('　')}</div>
          ${cards.length ? `<div class="equip-pick-cards">${socketedCardsHtml(cards)}</div>` : ''}
          ${renderCompareBadge(r.item, refine, r.instanceId)}
        </div>
        <button class="btn-small" onclick="${action};renderEquipTab();renderTopBar();">裝備</button>
      </div>`;
    }).join('') : `<div class="equip-pick-empty">背包裡沒有${currentJob().name}穿得上的${equipPickCat === 'weapon' ? '武器' : '防具'}。</div>`;

    /* 裝備欄與「武器／防具」切換鈕包在同一個 sticky 容器裡。
       以前只有 .equip-fixed 是 sticky，切換鈕會跟著清單一起捲走——
       清單一長就得先捲回最上面才能換分類。 */
    el.innerHTML = `
      <div class="equip-sticky">
        <div class="equip-fixed">
          ${buildEquipPanelHtml()}
        </div>
        <div class="equip-pick-head">
          ${equipPickTabsHtml()}
          <span class="equip-pick-stats">${currentJob().name}可裝備 ${rows.length} 件</span>
        </div>
      </div>
      ${listHtml}`;
    paintEquipDoll();
  } catch (e) {
    el.innerHTML = `<div class="empty-hint">裝備分頁載入錯誤：${e.message}</div>`;
    console.error('renderEquipTab error:', e);
  }
}


/* 商店購買（含數量選擇）：讀下拉選單的數量，一次買 N 個。
   錢不夠買 N 個就買買得起的最多數量，買 0 個就提示。 */
function buyItemFromShop(itemId, shopId) {
  const sel = document.getElementById('shop-qty-' + itemId);
  const qty = sel ? Math.max(1, parseInt(sel.value) || 1) : 1;
  buyItem(itemId, qty);
  openNpcShop(shopId);
  renderTopBar();
}

function renderInventoryTab() {
  const el = document.getElementById('tab-inventory');
  if (!el) return;

  hideEquipTooltip();

  try {
    // ---- 背包：四分類 ----
    const known = state.inventory.filter(r => ITEMS[r.item]);
    const catCount = {};
    INV_CATEGORIES.forEach(c => { catCount[c.key] = 0; });
    known.forEach(r => { catCount[invCategoryOf(r.item)]++; });

    // 目前分類底下的子分類清單（只列真的持有的）
    const inCat = known.filter(r => invCategoryOf(r.item) === invCategory);
    const subCount = {};
    inCat.forEach(r => { const s = invSubOf(r.item); subCount[s] = (subCount[s] || 0) + 1; });
    const subKeys = Object.keys(subCount).sort((a, b) => subCount[b] - subCount[a]);

    let rows = inCat;
    if (invSub !== 'all') rows = rows.filter(r => invSubOf(r.item) === invSub);
    if (invSearch) rows = rows.filter(r => (ITEMS[r.item].name || '').toLowerCase().includes(invSearch));

    rows = rows.slice().sort((a, b) => {
      if (invSort === 'qty') return b.qty - a.qty;
      if (invSort === 'value') return (ITEMS[b.item].sell || 0) * b.qty - (ITEMS[a.item].sell || 0) * a.qty;
      // 同名時把個體裝備（精煉/插卡過的）排在普通那疊前面，比較顯眼
      const nameCmp = (ITEMS[a.item].name || '').localeCompare(ITEMS[b.item].name || '', 'zh-Hant');
      if (nameCmp !== 0) return nameCmp;
      return (b.instanceId ? 1 : 0) - (a.instanceId ? 1 : 0);
    });

    const catTabs = INV_CATEGORIES.map(c =>
      `<button class="btn-small ${invCategory === c.key ? 'active' : ''}" onclick="setInvCategory('${c.key}')">${c.icon} ${c.name} <span class="inv-cat-n">${catCount[c.key]}</span></button>`
    ).join('');

    const subChips = subKeys.length > 1
      ? `<div class="inv-subs">
           <button class="btn-chip ${invSub === 'all' ? 'active' : ''}" onclick="setInvSub('all')">全部 ${inCat.length}</button>
           ${subKeys.map(s => `<button class="btn-chip ${invSub === s ? 'active' : ''}" onclick="setInvSub('${s}')">${invSubLabel(invCategory, s)} ${subCount[s]}</button>`).join('')}
         </div>`
      : '';

    const items = rows.map(row => {
      const def = ITEMS[row.item];
      const displayName = getItemDisplayName(row.item);
      const isCard = !!CARDS[row.item];
      // 消耗品要真的有效果才給「使用」鈕——沒有效果的按下去只會得到一句警告
      const usableConsumable = def.type === 'consumable' &&
        !!(def.heal || def.restoreSp || def.healPct || def.restoreSpPct || def.boxOpen || def.aspdPct || def.hairPick || def.reviveAlly);
      const effectUse = (typeof TAME_TO_PET !== 'undefined' && TAME_TO_PET[row.item])
        || (typeof EXP_DROP_CANDY !== 'undefined' && EXP_DROP_CANDY[row.item]);
      const canUse = usableConsumable || effectUse || def.type === 'weapon' || def.type === 'armor';
      const elemTag = def.element ? ` ${ELEMENT_ICONS[def.element]}${ELEMENT_NAMES[def.element]}` : '';

      // ---- 個體裝備（精煉過或插過卡）：獨立一行，狀態跟著這一件走 ----
      if (row.instanceId) {
        const inst = state.instances ? state.instances[row.instanceId] : null;
        if (!inst) return '';
        const iLocked = isItemLocked(row.item);
        const refTag = inst.refine > 0 ? `<span class="slot-refine">+${inst.refine}</span> ` : '';
        const iCards = inst.cards || [];
        const maxSlots = def.slots || 0;
        const cardsHtml = iCards.length
          ? `<div class="inv-cardslot"><div class="socket-card-count">插槽 ${iCards.length}/${maxSlots}</div>${socketedCardsHtml(iCards)}</div>`
          : '';
        return `<div class="inv-row${iLocked ? ' locked' : ''}" onmouseenter="showBagTooltip(event,'${row.item}','${row.instanceId}')" onmouseleave="hideBagTooltip()">
          <div class="inv-row-main">
            <div class="inv-icon"><img src="${itemImgSrc(row.item)}" alt="${displayName}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(def))}'"></div>
            <div class="inv-info">
              <div class="inv-name"><button type="button" class="wh-info-btn" aria-label="看完整說明" onclick="showBagInfo(event,'${row.item}','${row.instanceId}')">ⓘ</button>${iLocked ? '<span class="inv-lock-tag">🔒</span> ' : ''}${refTag}${displayName}${def.slots ? ` <span class="inv-slots">[${def.slots}]</span>` : ''}${elemTag}</div>
              <div class="inv-desc">${shopEsc(def.desc || '')}</div>
              ${cardsHtml}
              ${renderCompareBadge(row.item, inst.refine, row.instanceId)}
            </div>
          </div>
          <div class="inv-actions">
            <button class="btn-small ${iLocked ? '' : 'ghost'}" title="${iLocked ? '解除鎖定' : '鎖定後不會被賣出／自動販賣'}"
              onclick="toggleItemLock('${row.item}');renderInventoryTab();">${iLocked ? '🔒' : '🔓'}</button>
            <button class="btn-small" onclick="equipInstance('${row.instanceId}');renderInventoryTab();renderTopBar();">裝備</button>
            ${iLocked ? '' : `<button class="btn-small ghost" onclick="sellItemInstance('${row.instanceId}');renderInventoryTab();renderTopBar();">賣出(${def.sell})</button>`}
            <button class="btn-small ghost" onclick="depositInstanceToWarehouse('${row.instanceId}');renderInventoryTab();renderTopBar();">存倉庫</button>
            ${iCards.length ? `<button class="btn-small ghost danger" onclick="doDestroyInstance('${row.instanceId}')">拆卸取回卡片</button>` : ''}
          </div>
        </div>`;
      }

      // 卡片優先列出引擎真的吃到的加成；沒有可實裝加成時退回卡片自己的敘述，
      // 而不是 ITEMS 的敘述——後者尾巴帶著「系列: 卡片 装备: 武器 重量: 1」這類匯入殘留
      let cardBonus = '';
      if (isCard) {
        const cd = CARDS[row.item];
        const bits = describeCardBonus(cd);
        cardBonus = bits.length ? bits.join('、') : (cd.desc || '');
      }
      const slotTag = def.slots ? ` <span class="inv-slots">[${def.slots}]</span>` : '';
      const locked = isItemLocked(row.item);
      // 只有能穿的裝備才做比較，素材消耗品沒有比較的意義
      const compareHtml = (def.type === 'weapon' || def.type === 'armor') ? renderCompareBadge(row.item) : '';
      return `<div class="inv-row${locked ? ' locked' : ''}" onmouseenter="showBagTooltip(event,'${row.item}')" onmouseleave="hideBagTooltip()">
        <div class="inv-row-main">
          <div class="inv-icon"><img src="${itemImgSrc(row.item)}" alt="${displayName}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(def))}'"></div>
          <div class="inv-info">
            <div class="inv-name"><button type="button" class="wh-info-btn" aria-label="看完整說明" onclick="showBagInfo(event,'${row.item}')">ⓘ</button>${locked ? '<span class="inv-lock-tag">🔒</span> ' : ''}${displayName} x${row.qty}${slotTag}${elemTag}</div>
            <div class="inv-desc">${shopEsc(cardBonus || def.desc || '')}</div>
            ${isCard ? `<div class="inv-cardslot">插槽：${cardSlotLabel(CARDS[row.item])}</div>` : ''}
            ${compareHtml}
          </div>
        </div>
        <div class="inv-actions">
          <button class="btn-small ${locked ? '' : 'ghost'}" title="${locked ? '解除鎖定' : '鎖定後不會被賣出／自動販賣'}"
            onclick="toggleItemLock('${row.item}');renderInventoryTab();">${locked ? '🔒' : '🔓'}</button>
          ${def.ammo ? `<button class="btn-small" onclick="equipAmmo('${row.item}');renderInventoryTab();renderTopBar();">裝備箭矢</button>` : ''}
          ${(() => {
            // 原石：湊滿 5 個就能合成
            const k = Object.keys(ORE_SYNTHESIS).find(x => ORE_SYNTHESIS[x].from === row.item);
            if (!k) return '';
            const r = ORE_SYNTHESIS[k];
            const times = Math.floor(row.qty / r.need);
            return `<button class="btn-small" ${row.qty >= r.need ? '' : 'disabled'}
              onclick="synthesizeOre('${k}');renderInventoryTab();renderTopBar();"
              title="${r.need} 個合成 1 個${ITEMS[r.to].name}">合成(${row.qty}/${r.need})</button>`
              + (times > 1 ? `<button class="btn-small" onclick="synthesizeOreAll('${k}');renderInventoryTab();renderTopBar();"
                title="湊得滿的 ${times} 份一次合成完，除不盡的留在背包">全部合成(${times})</button>` : '');
          })()}
          ${canUse ? `<button class="btn-small" onclick="useItem('${row.item}');renderInventoryTab();">${(def.type === 'weapon' || def.type === 'armor') ? '裝備' : '使用'}</button>` : ''}
          ${def.boxOpen && row.qty > 1 ? `<button class="btn-small" onclick="openAllBoxesAsync('${row.item}', function(){renderInventoryTab();renderTopBar();});" title="手上這 ${row.qty} 個一次開完（每 100 個一批，不卡畫面）">全部開啟(${row.qty})</button>` : ''}
          ${locked || def.type === 'relic' ? '' : `<button class="btn-small ghost" onclick="sellItem('${row.item}',1);renderInventoryTab();renderTopBar();">賣出(${def.sell})</button>`}
          ${!locked && def.type !== 'relic' && row.qty > 1 ? `<button class="btn-small ghost" onclick="sellItemAll('${row.item}');renderInventoryTab();renderTopBar();">全部賣出</button>` : ''}
          <button class="btn-small ghost" onclick="depositToWarehouse('${row.item}',1);renderInventoryTab();renderTopBar();">存倉庫</button>
          ${row.qty > 1 ? `<button class="btn-small ghost" onclick="depositToWarehouseAll('${row.item}');renderInventoryTab();renderTopBar();">全部存倉</button>` : ''}
        </div>
      </div>`;
    }).join('');

    const emptyMsg = invSearch
      ? '沒有符合搜尋的道具。'
      : (inCat.length === 0 ? `背包裡還沒有${INV_CATEGORIES.find(c => c.key === invCategory).name}。` : '這個子分類沒有東西。');

    const invHtml = `
      <div class="inv-cats">${catTabs}</div>
      <div class="inv-toolbar">
        <input id="inv-search" class="codex-search" type="text" placeholder="🔍 搜尋名稱…（四類共用）"
          value="${invSearch.replace(/"/g, '&quot;')}" oninput="onInvSearch(this.value, event)">
        <select class="ab-select inv-sort" onchange="setInvSort(this.value)">
          <option value="name" ${invSort === 'name' ? 'selected' : ''}>依名稱</option>
          <option value="qty" ${invSort === 'qty' ? 'selected' : ''}>依數量</option>
          <option value="value" ${invSort === 'value' ? 'selected' : ''}>依總價值</option>
        </select>
      </div>
      ${subChips}
      <div class="inv-list">${items || `<div class="empty-hint">${emptyMsg}</div>`}</div>`;

    // 露天商店（僅商人職業且已學會露天商店技能時顯示）
    let vendingHtml = '';
    // 職業鏈判定（#149）：轉去鐵匠／神匠／鍊金／創造者之後 jobId 就不是 merchant 了，
    // 只認 'merchant' 的話這個入口會整個消失——玩家回報「找不到露天商店」時人在神匠
    if (jobLineHas(state.jobId, 'merchant') && state.learnedSkills && state.learnedSkills['vending']) {
      const cfg = state.vendingConfig || { items: [] };
      const itemNames = cfg.items.length
        ? cfg.items.map(id => ITEMS[id] ? ITEMS[id].name : id).join('、')
        : '尚未選擇';
      const readyIn = Math.max(0, Math.ceil(((state.vendingReadyAt || 0) - Date.now()) / 1000));
      vendingHtml = `<div class="vending-panel">
        <h3 class="panel-title">🏪 露天商店</h3>
        <div class="vending-info">已選擇：${itemNames}${readyIn > 0 ? `（下次販售倒數 ${readyIn}s）` : ''}</div>
        <button class="btn-small" onclick="showVendingWindow()">設定販售道具</button>
      </div>`;
    }

    /* 鍛造的入口搬到分頁列上那顆「🔨 鍛造」（#103），這裡不再放一份。
       舊版還把入口鎖在 `state.jobId === 'blacksmith'`——轉成神匠之後 jobId 就變了，
       同一個角色會突然找不到鍛造；現在走 `isBlacksmithLine()`，整條鐵匠線都留得住。 */
    const craftingHtml = '';

    // 跨角色倉庫（任何職業都可使用）
    const warehouseHtml = `<div class="warehouse-panel">
      <h3 class="panel-title">📦 倉庫</h3>
      <button class="btn-small" onclick="showWarehousePanel()">開啟倉庫</button>
    </div>`;

    // 自動販賣（任何職業都可使用）
    const autoSellCfg = state.autoSellConfig || { enabled: false, items: [] };
    const autoSellHtml = `<div class="autosell-panel">
      <h3 class="panel-title">🏷️ 自動販賣</h3>
      <div class="empty-hint">${autoSellCfg.enabled ? `已啟用，已選 ${autoSellCfg.items.length} 種道具，每30秒自動賣出` : '尚未啟用'}</div>
      <button class="btn-small" onclick="showAutoSellWindow()">設定自動販賣</button>
    </div>`;

    el.innerHTML = `${vendingHtml}${craftingHtml}${warehouseHtml}${autoSellHtml}`
      + `<h3 class="panel-title">背包（${known.length}）</h3>${invHtml}`;
  } catch (e) {
    el.innerHTML = `<div class="empty-hint">背包載入錯誤：${e.message}</div>`;
    console.error('renderInventoryTab error:', e);
  }
}

/* ---- 裝備視窗：hover 提示 ---- */
const _equipClickTimers = {};

function showEquipTooltip(event, slotKey) {
  if (equipSlotTipPinned) return;
  const itemId = getEquipBaseItemId(slotKey);
  if (!itemId) return;
  const item = ITEMS[itemId];
  if (!item) return;
  const tt = document.getElementById('ro-equip-tooltip');
  if (!tt) return;

  const refLevel = getRefinementLevel(slotKey);
  const slotCards = getEquippedCards(slotKey);
  const maxSlots = getEquipCardSlots(slotKey);

  tt.innerHTML = itemTooltipHtml(itemId, {
    refine: refLevel,
    cards: slotCards,
    maxSlots: maxSlots,
    hint: '點一下看操作'
  });
  const slotEl = event.target.closest('.equipwin-slot');
  placeEquipTooltip(tt, slotEl || event.currentTarget);
}

function hideEquipTooltip() {
  if (equipSlotTipPinned || bagTipPinned) return;
  const tt = document.getElementById('ro-equip-tooltip');
  if (tt) tt.classList.remove('show', 'interactive');
}

function onEquipSlotClick(slotKey) {
  const sel = document.querySelector('.equipwin-slot[onclick*="\'' + slotKey + '\'"]');
  openEquipSlotPanel({
    target: sel,
    currentTarget: sel,
    preventDefault() {},
    stopPropagation() {},
  }, slotKey);
}

/* ---------------- 角色分頁 ---------------- */
/* 素質加成的來源明細（給 title 用，滑過去就看得到是哪件裝備／哪張卡給的）。
   走訪所有裝備欄與已插的卡片，把有貢獻這項素質的列出來。 */
function statGearSources(stat) {
  const out = [];
  EQUIP_SLOTS_ALL.forEach(slot => {
    const id = getEquipBaseItemId(slot);
    const d = id ? ITEMS[id] : null;
    if (d && typeof d[stat] === 'number' && d[stat] !== 0) {
      out.push({ name: getItemDisplayName(id), v: d[stat] });
    }
  });
  allEquippedCards().forEach(cid => {
    const c = CARDS[cid];
    if (c && c.bonus && c.bonus[stat]) out.push({ name: c.name, v: c.bonus[stat] });
  });
  return out;
}
// title 屬性不能直接放引號/HTML，統一轉成純文字多行
function statGearSourceTitle(stat) {
  const src = statGearSources(stat);
  if (!src.length) return '裝備／卡片加成';
  const total = src.reduce((a, b) => a + b.v, 0);
  return ['裝備／卡片加成　合計 ' + (total > 0 ? '+' : '') + total]
    .concat(src.map(s => `・${s.name}　${s.v > 0 ? '+' : ''}${s.v}`))
    .join('\n').replace(/"/g, '＂');
}
function statJobSourceTitle(stat, bonus) {
  // 職業加成是跨職業累計繼承的，把整條職業鏈列出來比較好懂
  const chain = (typeof getAllLearnedJobs === 'function' ? getAllLearnedJobs() : [state.jobId])
    .map(j => (JOB_TREE[j] && JOB_TREE[j].name) || j);
  return `職業加成　+${bonus}\n來自：${chain.join(' → ')}`.replace(/"/g, '＂');
}
// 技能／buff 的素質加成來源（鶚梟之眼、物品鑑定、天使之賜福…）
function statListTitle(head, list) {
  if (!list || !list.length) return head;
  return [head].concat(list.map(x => `・${x.name}　${x.v > 0 ? '+' : ''}${x.v}`))
    .join('\n').replace(/"/g, '＂');
}
function statPctTitle(pctSrc, added) {
  const head = `百分比加成　實際 +${added}`;
  if (!pctSrc || !pctSrc.length) return head;
  return [head].concat(pctSrc.map(x => `・${x.name}　+${Math.round(x.v * 100)}%`))
    .join('\n').replace(/"/g, '＂');
}

let charSheetOpen = true;
function toggleCharSheet() {
  charSheetOpen = !charSheetOpen;
  const body = document.getElementById('char-sheet-body');
  const btn = document.getElementById('char-sheet-toggle');
  if (body) body.classList.toggle('hidden', !charSheetOpen);
  if (btn) btn.textContent = charSheetOpen ? '▼ 收起' : '▶ 展開';
}
const STAT_HELP = {
  str: ['ATK：一般武器以 STR 為主，STR+(STR/10)²', '弓、樂器、鞭改看 DEX，STR 只進副屬性 STR/5', '武器傷害浮動看 STR'],
  agi: ['迴避 FLEE = 100 + 等級 + AGI', 'ASPD、攻擊間隔'],
  vit: ['最大 HP：基礎 HP × (1 + VIT%)', '軟防：DEF 後面那個數字，(等級+VIT)/2', 'HP 回復'],
  int: ['最大 SP：基礎 SP × (1 + INT%)', 'MATK：INT+(INT/7)² 到 INT+(INT/5)²，另加 DEX/5', '軟魔防：MDEF 後面那個數字，INT/2', 'SP 回復'],
  dex: ['命中 HIT = 175 + 等級 + DEX', 'ASPD、攻擊間隔', '弓、樂器、鞭的 ATK 主屬性', 'MATK 固定加 DEX/5'],
  luk: ['暴擊率 = 4 + LUK/3，基礎上限 50（拳刃再加倍）', '完全迴避 = LUK/10', 'ATK 加 LUK/5，MATK 上限加 LUK/3']
};
function openStatInfo(k) {
  const title = document.getElementById('stat-modal-title');
  const body = document.getElementById('stat-modal-body');
  const m = document.getElementById('stat-modal');
  if (!title || !body || !m) return;
  const bd = (state._statBreakdown && state._statBreakdown[k]) || { base: 0, job: 0, gear: 0, skill: 0, buff: 0, total: 0 };
  const rows = [
    ['基礎', bd.base, '已分配的能力點'],
    ['職業', bd.job, ''],
    ['裝備', bd.gear, ''],
    ['技能', bd.skill, ''],
    ['增益', bd.buff, '']
  ];
  title.textContent = (STAT_NAMES[k] || k) + ' 說明';
  body.innerHTML = `<div class="stat-src-head">來源明細　合計 ${bd.total}</div>
    <div class="stat-src-table">${rows.map(r =>
      `<div class="stat-src-row"><span>${r[0]}</span><b>${r[1] > 0 ? '+' : ''}${r[1]}</b><span class="dim">${r[2]}</span></div>`
    ).join('')}</div>
    <ul class="stat-help">${(STAT_HELP[k] || []).map(t => `<li>${t}</li>`).join('')}</ul>`;
  m.classList.remove('hidden');
}
function closeStatInfo() {
  const m = document.getElementById('stat-modal');
  if (m) m.classList.add('hidden');
}
let hairPickItem = null;
function openHairPick(itemId) {
  const def = ITEMS[itemId];
  const m = document.getElementById('hair-modal');
  const title = document.getElementById('hair-modal-title');
  const body = document.getElementById('hair-modal-body');
  if (!def || !def.hairPick || !m || !title || !body) return;
  hairPickItem = itemId;
  const gender = (state && state.gender) || 'male';
  const now = hairNow();
  const clip = (window.PAPERDOLL && window.PAPERDOLL.clip) || {};
  if (def.hairPick === 'color') {
    title.textContent = '選擇髮色';
    body.innerHTML = `<div class="hair-grid">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(c => {
      const has = clip['head/' + gender + '/' + now.style + '/' + c];
      return `<button type="button" class="hair-cell${c === now.color ? ' on' : ''}" ${has ? '' : 'disabled'} onclick="confirmHairPick(${c})">髮色 ${c}</button>`;
    }).join('')}</div><p class="empty-hint">目前髮型 ${now.style}。確認後消耗一瓶染髮劑，取消不消耗。</p>`;
  } else {
    const styles = [];
    for (let s = 1; s <= 42; s++) {
      if (clip['head/' + gender + '/' + s + '/' + now.color]) styles.push(s);
    }
    title.textContent = '選擇髮型';
    body.innerHTML = styles.length
      ? `<div class="hair-grid">${styles.map(s =>
          `<button type="button" class="hair-cell${s === now.style ? ' on' : ''}" onclick="confirmHairPick(${s})">髮型 ${s}</button>`
        ).join('')}</div><p class="empty-hint">目前髮色 ${now.color}。確認後消耗一張美容券，取消不消耗。</p>`
      : '<p class="empty-hint">這組髮型圖還沒準備好。</p>';
  }
  m.classList.remove('hidden');
}
function closeHairPick() {
  hairPickItem = null;
  const m = document.getElementById('hair-modal');
  if (m) m.classList.add('hidden');
}
function confirmHairPick(n) {
  const id = hairPickItem;
  const def = id && ITEMS[id];
  const row = def && state.inventory.find(r => r.item === id && !r.instanceId && r.qty > 0);
  if (!row) { closeHairPick(); return; }
  if (def.hairPick === 'color') state.hairColor = n;
  else state.hairStyle = n;
  removeItem(id, 1);
  saveGame();
  logMsg(`✂️ 使用了 ${def.name}：${def.hairPick === 'color' ? '髮色 ' + n : '髮型 ' + n}`);
  closeHairPick();
  const inv = document.getElementById('tab-inventory');
  if (inv && inv.classList.contains('active')) renderInventoryTab();
  const img = document.getElementById('player-img');
  if (img && typeof paperdollParts === 'function') syncPaperdoll(img, paperdollParts(), false);
  if (typeof paintEquipDoll === 'function') paintEquipDoll();
}
function renderCharacterTab() {
  const job = currentJob();
  const el = document.getElementById('tab-character');

  // 計算 buff 加成後的實際數值
  const critBuff = buffMult('crit');
  const hitBuff = buffMult('hit');
  const effectiveCritRate = Math.min(100, Math.round(state.critRate * critBuff.mult + critBuff.flatBonus));
  const effectiveHit = Math.round(state.hit * hitBuff.mult + hitBuff.flatBonus);

  /* 生效中的套裝（卡片 setName、EQUIP_SETS、遺物套）。裝備 condBonus 改看各件「條件加成」區塊。 */
  let setListHtml = '';
  if (typeof activeEquipSets === 'function') {
    const sets = activeEquipSets() || [];
    if (sets.length) {
      setListHtml = '<div class="active-sets">' + sets.map(s => {
        const bits = Object.entries(s.bonus || {})
          .map(([k, v]) => formatCardBonus(k, v, s.bonus)).filter(Boolean).join('、');
        return `<span class="set-tag" title="${bits || '依精煉階數加成'}">✅ ${s.name}${bits ? '：' + bits : ''}</span>`;
      }).join('') + '</div>';
    }
  }

  const jobBonus = computeJobBonuses();
  el.innerHTML = `
    <h3 class="panel-title" ondblclick="openRenameWindow()" title="雙擊修改名稱" style="cursor:pointer;">${job.icon} ${state.name}　<span class="job-name">${job.name}</span> <span style="font-size:11px;opacity:0.6;">✎</span></h3>
    <div class="stat-grid">
      ${STAT_KEYS.map(k => {
        const cost = statPointCost(state.stats[k]);
        // 點到上限時「-成本」要換成 MAX，不然玩家看到的是一個永遠按不下去的按鈕（#112）
        const atCap = state.stats[k] >= (typeof statCapOf === 'function' ? statCapOf() : 99);
        const canAfford = !atCap && state.statPoints >= cost;
        const bonus = jobBonus[k];
        // 裝備與卡片的素質加成本來就有算進戰鬥數值，只是這裡沒顯示，
        // 看起來就像「魔術師帽的 AGI+1 沒效果」——補上金色那段
        const gear = equippedStatBonus(k) + getCardBonus(k);
        // 技能／buff 那兩段同理：鶚梟之眼的 DEX+10、心神凝聚的 DEX/AGI% 本來也算進去了，
        // 只是畫面上完全沒有數字，看起來就像技能沒效果
        const bd = (state._statBreakdown && state._statBreakdown[k]) || null;
        const skillV = bd ? bd.skill : 0;
        const buffV = bd ? bd.buff : 0;
        const pctV = bd ? bd.pct : 0;
        return `
        <div class="stat-row">
          <div class="stat-label">${STAT_NAMES[k]} <button type="button" class="wh-info-btn" aria-label="看素質說明" onclick="openStatInfo('${k}')">ⓘ</button></div>
          <div class="stat-value"><span class="stat-seg" title="基礎值（已分配的屬性點）">${state.stats[k]}</span>${
            bonus > 0 ? `<span class="stat-seg" style="color:#4fc3f7" title="${statJobSourceTitle(k, bonus)}">+${bonus}</span>` : ''}${
            gear !== 0 ? `<span class="stat-seg" style="color:var(--gold-soft)" title="${statGearSourceTitle(k)}">${gear > 0 ? '+' : ''}${gear}</span>` : ''}${
            skillV !== 0 ? `<span class="stat-seg" style="color:#a5d6a7" title="${statListTitle('技能加成　合計 ' + (skillV > 0 ? '+' : '') + skillV, bd.skillSrc)}">${skillV > 0 ? '+' : ''}${skillV}</span>` : ''}${
            buffV !== 0 ? `<span class="stat-seg" style="color:#ffb74d" title="${statListTitle('BUFF 加成　合計 ' + (buffV > 0 ? '+' : '') + buffV, bd.buffSrc)}">${buffV > 0 ? '+' : ''}${buffV}</span>` : ''}${
            pctV !== 0 ? `<span class="stat-seg" style="color:#ce93d8" title="${statPctTitle(bd.pctSrc, pctV)}">${pctV > 0 ? '+' : ''}${pctV}</span>` : ''}</div>
          <div class="stat-cost" title="${atCap ? '已達上限' : `再加 1 點要花 ${cost} 點素質點`}">${atCap ? 'MAX' : '-' + cost}</div>
          <button class="btn-tiny" ${canAfford ? '' : 'disabled'} onclick="allocateStat('${k}');renderCharacterTab();renderTopBar();">+</button>
        </div>`;
      }).join('')}
    </div>
    <div class="stat-points-left">可分配屬性點：${state.statPoints}
      ${(() => {
        const why = statResetBlockReason();
        return `<button class="btn-small ${why ? 'ghost' : ''}" ${why ? 'disabled' : ''}
          onclick="confirmStatReset()"
          title="${why || `退回所有已加的素質點，花費 ${STAT_RESET_COST_ZENY.toLocaleString()}z`}"
          >🔄 洗點 ${STAT_RESET_COST_ZENY.toLocaleString()}z</button>`;
      })()}
    </div>
    <div class="char-sheet">
      <div class="char-sheet-head">
        <span>人物數值</span>
        <button type="button" class="btn-small" id="char-sheet-toggle" onclick="toggleCharSheet()">${charSheetOpen ? '▼ 收起' : '▶ 展開'}</button>
      </div>
      <div id="char-sheet-body" class="${charSheetOpen ? '' : 'hidden'}">
    <div class="char-sec-title">攻擊</div>
    <div class="char-grid">
      <div><span>ATK</span><b>${state.atk}${(() => { const r = getRefinementLevel('weapon'); const wId = getEquipBaseItemId('weapon'); const wLv = wId ? getRefineWeaponLv(ITEMS[wId]) : 1; return r > 0 ? ` (+${getRefinementAtkBonus(r, wLv)}精煉)` : ''; })()}</b></div>
      <div><span>MATK</span><b>${state.matkMin}～${state.matkMax}</b></div>
      <div><span>ASPD</span><b>${state.aspd}${state.buffs.some(b => b.type === 'aspd') ? ' <span class="buff-active">BUFF</span>' : ''}</b></div>
      <div><span>攻擊間隔</span><b>${(state.attackInterval / 1000).toFixed(2)} 秒</b></div>
      <div><span>HIT</span><b>${effectiveHit}${effectiveHit > state.hit ? ` <span class="buff-active">(+${effectiveHit - state.hit})</span>` : ''}</b></div>
      <div><span>暴擊</span><b>${effectiveCritRate}%${effectiveCritRate > state.critRate ? ` <span class="buff-active">(+${effectiveCritRate - state.critRate})</span>` : ''}</b></div>
      <div><span>武器屬性</span><b>${(() => { const wId = getEquipBaseItemId('weapon'); const w = wId ? ITEMS[wId] : null; const el = w && w.element ? w.element : 'none'; return ELEMENT_ICONS[el] + ' ' + ELEMENT_NAMES[el]; })()}</b></div>
    </div>
    <div class="char-sec-title">防禦</div>
    <div class="char-grid">
      <div title="硬防（裝備）走比例減傷、軟防（等級+VIT）每一擊固定扣血"><span>DEF</span><b>${state.defHard || 0}+${state.defSoft || 0}${(() => { let refBonus = 0; ['head_top','head_mid','head_bottom','armor','shield','garment','footgear','accessory1','accessory2'].forEach(s => { const lv = getRefinementLevel(s); if (lv > 0) refBonus += getRefinementDefBonus(lv); }); return refBonus > 0 ? ` (+${refBonus}精煉)` : ''; })()}</b><span class="dim">硬防減傷 ${Math.round((1 - (4000 + (state.defHard||0)) / (4000 + 10 * (state.defHard||0))) * 100)}%</span></div>
      <div title="怪物的魔法技能看魔防。硬魔防走比例減傷、軟魔防（INT/2）每一發固定扣血"><span>MDEF</span><b>${state.mdefHard || 0}+${state.mdefSoft || 0}</b><span class="dim">硬魔防減傷 ${Math.round((1 - (4000 + Math.max(0, state.mdefHard || 0)) / (4000 + 10 * Math.max(0, state.mdefHard || 0))) * 100)}%</span></div>
      ${state.playerElement && state.playerElement !== 'none'
        ? `<div title="被攻擊時吃屬性相剋"><span>鎧甲屬性</span><b><span class="set-tag">${ELEMENT_ICONS[state.playerElement] || ''}${ELEMENT_NAMES[state.playerElement] || state.playerElement}</span></b></div>` : ''}
      ${state.cardMagicReflectChance ? `<div title="成功時完全不受傷，法術原樣彈回施法者"><span>魔法反射</span><b>${state.cardMagicReflectChance}%</b></div>` : ''}
      <div title="場上怪愈多，迴避上限愈低：1隻95%／2隻90%／3隻85%／4隻80%／5隻75%"><span>FLEE</span><b>${state.flee}</b>${typeof fleeCapPct === 'function'
        ? `<span class="dim">上限 ${fleeCapPct()}%（場上 ${Math.max(1, (state.monsters || []).length)} 隻）</span>` : ''}</div>
      <div><span>完全迴避</span><b>${state.perfectDodge}%</b></div>
    </div>
    <div class="char-sec-title">生存</div>
    <div class="char-grid">
      ${(() => {
        /* 自然回復（#102）。禪心／快速恢復／運氣調息／聖母之頌歌只動這個數字，
           不動 HP/SP 上限——畫面上沒有這一行的話，點下去看起來就像沒有效果。
           數字直接跟 passiveRegen() 讀同一支 regenPerSecond()。 */
        if (typeof regenPerSecond !== 'function') return '';
        const r = regenPerSecond();
        const noRegen = typeof playerNoRegen === 'function' && playerNoRegen();
        const tag = noRegen ? ' <span class="dim">（出血中，暫停回復）</span>'
          : (state.buffs.some(b => b.type === 'sprate') ? ' <span class="buff-active">BUFF</span>' : '');
        /* 禪心那兩項拆開寫進 tooltip（#103）。使用者實測「830 SP 點到 5 級沒有增加 SP」——
           官方那張表的 `+15 +1.0%` 是**每次恢復的量**，不是 SP 上限，
           但畫面上只看得到一個總數的話，這件事沒辦法自己驗證。 */
        let zen = '';
        if (state.zenSpFlatBonus || state.zenSpPctBonus) {
          const pctAmt = Math.round(state.maxSp * (state.zenSpPctBonus || 0) / 100 * 10) / 10;
          zen = `\n禪心：每次恢復 +${state.zenSpFlatBonus} 與 +${state.zenSpPctBonus}% 最大SP（${pctAmt} 點）`;
        }
        return `<div title="每秒回復量。禪心、快速恢復、運氣調息等被動加的是這個，不是 HP/SP 上限。${zen}"><span>自然回復</span><b>${r.hp} HP／${r.sp} SP 每秒</b>${tag}</div>`;
      })()}
      ${/* 生怪速度（#146）。本作沒有「移動」，官方所有「移動速度上升」的效果
           一律換算成生怪加速——但畫面上以前沒有任何地方看得到，
           玩家點了騎乘術／裝了月夜貓卡也不知道到底有沒有生效。
           數字跟 spawnMonster() 走同一支 spawnDelayMs()，不會各算各的。 */''}
      ${(() => {
        if (typeof spawnDelayMs !== 'function') return '';
        const src = typeof spawnSpeedSources === 'function' ? spawnSpeedSources() : [];
        const gap = spawnDelayMs(false), first = spawnDelayMs(true);
        const tag = src.length
          ? ` <span class="buff-active">快 ${Math.round((3000 / gap - 1) * 100)}%</span>`
          : '';
        const list = src.length
          ? `　<span class="dim">${src.map(x => x.name + ' +' + x.pct + '%').join('、')}</span>`
          : '　<span class="dim">目前沒有加速來源</span>';
        return `<div title="本作沒有移動，所以官方「移動速度上升」的效果一律換算成生怪加速。場上清空時補第一批比較快。">`
          + `<span>生怪間隔</span><b>${(gap / 1000).toFixed(2)} 秒</b><span class="dim">清場後 ${(first / 1000).toFixed(2)} 秒</span>${tag}${list}</div>`;
      })()}
      <div><span>套裝</span><b>${setListHtml || '—'}</b></div>
    </div>
      </div>
    </div>
    <p class="stat-formula-hint">數值公式參考 RO 正式版邏輯調整：ATK=${state._atkUsesDex ? 'DEX+(DEX/10)²+STR/5+LUK/5（弓／樂器／鞭以 DEX 為主屬性）' : 'STR+(STR/10)²+DEX/5+LUK/5'}；HIT=175+等級+DEX；FLEE=100+等級+AGI；DEF 採比例減傷而非直接相減。屬性點數規則對齊官方對照表：每級獲得 floor((等級-1)/5)+3 點；加點消耗隨數值升高而增加（1~10 花2點、11~20花3點...以此類推）。</p>`;
}

/* ---------------- 轉職樹（簽名視覺元素） ---------------- */
/* 轉職樹的職業圖示：站立格 frame_000，不播普攻、也不換成騎乘。
   性別先看 genderLock（詩人只有男版、舞孃只有女版）。
   載不到就換另一個性別，再不行才退回 emoji。 */
function jobTreeIconHtml(jobId, jd) {
  const key = (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[jobId]) || jobId;
  const g = jd.genderLock || ((state && state.gender === 'female') ? 'female' : 'male');
  const alt = g === 'female' ? 'male' : 'female';
  return `<span class="tree-icon">
        <img class="tree-icon-img" alt="${jd.name}"
             src="images/frames/${key}_${g}/frame_000.png"
             data-fb="images/frames/${key}_${alt}/frame_000.png"
             onerror="jobTreeIconErr(this)">
        <span class="tree-icon-emoji" hidden>${jd.icon}</span>
      </span>`;
}
function jobTreeIconErr(img) {
  const fb = img.getAttribute('data-fb');
  if (fb) { img.removeAttribute('data-fb'); img.src = fb; return; }
  img.style.display = 'none';
  const em = img.parentNode && img.parentNode.querySelector('.tree-icon-emoji');
  if (em) em.hidden = false;
}
function jobTreeAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderJobTree() {
  const el = document.getElementById('tab-jobtree');
  /* 第四層是進階二轉（轉生後才走得到）。**沒轉生過的角色不畫這一層**——
     那是轉生的獎勵，提早攤開來只會讓還在練一轉的玩家看不懂。 */
  let tiers = [
    ['novice'],
    ['swordsman', 'mage', 'archer', 'merchant', 'thief', 'acolyte'],
    ['knight', 'crusader', 'wizard', 'sage', 'hunter', 'bard', 'dancer', 'blacksmith', 'alchemist', 'assassin', 'rogue', 'priest', 'monk'],
  ];
  const rebirthed = (state.rebirthCount || 0) > 0;
  /* 轉生後只畫**自己那一條線**（使用者 2026-08-09 指定）。

     路線已經鎖死了，另外五條一輩子都走不到——攤在畫面上只會讓人以為還有得選。
     而且進階二轉是「取代」二轉不是接在後面，所以二轉那一層直接換成進階二轉，
     畫出來就是玩家真正會走的三格：新手 → 劍士 → 領主騎士。 */
  if (rebirthed) {
    const line = typeof rebirthLine === 'function' ? rebirthLine() : null;
    if (line && line.length) {
      /* 三轉要接在進階二轉後面（#120）。

         `rebirthLine()` 只算到進階二轉為止——它是把 `rebirthPath` 裡的二轉
         換成 `nextLocked[0]`，沒有再往上找一層。所以樹畫出來是
         新手 → 劍士 → 領主騎士 就停了，**盧恩騎士那一格從來沒被畫出來**，
         玩家看不到三轉的入口（引擎其實早就放行了，canJobChange 回 true）。

         而且轉成三轉之後 `line` 裡也沒有 runeknight，
         下面那段 `tiers.some(row => row.includes(state.jobId))` 會落空，
         連「自己現在是誰」都畫不出來。 */
      const ext = line.slice();
      const last = JOB_TREE[ext[ext.length - 1]];
      const t3 = last && (last.nextLocked || [])[0];
      if (t3 && JOB_TREE[t3]) ext.push(t3);
      tiers = ext.map(j => [j]);
    } else {
      tiers.push(['lordknight', 'paladin', 'highwizard', 'professor', 'sniper', 'clown', 'gypsy',
                  'whitesmith', 'creator', 'assassincross', 'stalker', 'highpriest', 'champion']);
    }
  }
  /* 選定一轉之後，另外五條線就永遠走不到了——`canJobChange()` 只放行 `job.next`，
     而 `pruneOtherJobLines()` 轉職當下就把別條線的技能清掉了。
     還把它們攤在畫面上只會讓人以為有得選（使用者 2026-08-15 指定拿掉）。

     以前只有**轉生後**才收（走 `rebirthLine()`），所以一轉完的角色照樣看到整棵樹；
     而且 `rebirthLine()` 要有 `rebirthPath` 才回得出東西，舊存檔沒有那個欄位的話
     轉生完也還是整棵樹。改成一律照現在這條線過濾，兩種情況一起收掉。
     還在新手時 `jobLineRoot()` 回 null，整棵樹照舊全開。 */
  /* 還在新手時只畫到一轉那一列（#97）。二轉還隔著一次轉職與 30 級，
     現在攤開來是 20 格，玩家要在裡面找那六個點得動的格子。 */
  if (state.jobId === 'novice') tiers = tiers.slice(0, 2);

  const lineRoot = typeof jobLineRoot === 'function' ? jobLineRoot(state.jobId) : null;
  /* 只在**現在這個職業畫得出來**的時候才收。上面那三列是寫死的名單，
     漏掉的職業（目前是超級新手，它不在任何一列裡）收完會只剩「新手」一格，
     等於整頁空白。名單以後補了新職業忘記加進來時，這條保險絲會讓它退回全開。 */
  if (lineRoot && tiers.some(row => row.includes(state.jobId))) {
    tiers = tiers
      .map(row => row.filter(j => j === 'novice' || jobLineHas(j, lineRoot)))
      .filter(row => row.length);
  }

  let rows = '';
  tiers.forEach((tier, tIdx) => {
    let cards = '';
    tier.forEach(jobId => {
      const jd = JOB_TREE[jobId];
      if (!jd) return;
      const isCurrent = state.jobId === jobId;
      const unlocked = isCurrent || isJobUnlocked(jobId);
      const canChange = tIdx > 0 && canJobChange(jobId);
      /* 格子上只留兩種狀態。具體差在哪（等級、技能點）放 title。 */
      let foot = '';
      let full = jd.name;
      if (tIdx > 0 && !isCurrent) {
        if (canChange) {
          foot = '可轉職';
          full = '可轉職';
        } else {
          foot = '未達轉職條件';
          full = (typeof jobChangeBlockReason === 'function' ? jobChangeBlockReason(jobId) : '') || foot;
        }
      }
      cards += `<button type="button" class="tree-card ${isCurrent ? 'tree-node-current' : ''} ${unlocked ? 'tree-node-unlocked' : 'tree-node-locked'}" ${canChange ? `onclick="confirmJobChange('${jobId}')"` : 'disabled'} title="${jobTreeAttr(full || jd.name)}">
          ${jobTreeIconHtml(jobId, jd)}
          <span class="tree-label">${jd.name}</span>
          ${foot ? `<span class="${canChange ? 'tree-cta' : 'tree-wip'}">${foot}</span>` : '<span class="tree-wip">&nbsp;</span>'}
        </button>`;
    });
    rows += `<div class="job-tree-tier ${tIdx ? 'job-tree-tier-linked' : ''}" style="--tier-count:${tier.length}">${cards}</div>`;
  });

  el.innerHTML = `<h3 class="panel-title">轉職之路</h3>
    <div class="job-tree-wrap">
      <div class="job-tree-board">${rows}</div>
    </div>
    <p class="tree-hint">金色代表你已走過或正在的道路。二轉需職業等級滿級並達到基礎等級門檻。
      <b>職業一旦選定就走到底</b>，轉職只保留本系路線，其他路線的技能會被清除。</p>
    ${/* 轉生面板搬到地圖分頁的安全區了，這裡只留指路 */
      (state.rebirthCount || 0) >= REBIRTH_MAX ? renderRebirthPanel()
        : `<div class="rebirth-pointer">🌟 轉生要到<b>安全區（城鎮）</b>的轉生祭壇辦理——請切到地圖分頁。</div>`}`;
}

/* 轉職前的確認：**這個動作會刪東西**，所以一定要先把刪什麼列出來。
   沒有東西要刪（正常的一路往下轉）就不打擾，直接轉。 */
function confirmJobChange(jobId) {
  const jd = JOB_TREE[jobId];
  const p = jobPrunePreview(jobId);
  const noSkills = jd.tier === 2.5 && (jd.skills || []).length === 0;
  if (p.skills.length || p.points || p.jobs.length || noSkills) {
    const names = p.skills.map(id => { const sk = SKILLS[id]; return sk ? sk.name.split(' ')[0] : id; });
    const shown = names.slice(0, 12).join('、') + (names.length > 12 ? ` …等 ${names.length} 個` : '');
    const bits = [`轉職成「${jd.name}」之後只會保留這條路線。`, ''];
    if (names.length) bits.push(`會被清除的技能（${names.length} 個）：${shown}`);
    if (p.points) bits.push(`會被清除的未使用技能點：${p.points} 點`);
    /* 框架先上、技能分批補，所以有可能轉過去時專屬技能還是空的。
       這不是死路：原本學過的技能全部留著、HP/SP 也立刻變強，技能點會存著等技能開放。
       但要先講清楚，不然玩家轉完打開技能分頁會以為壞了。 */
    if (noSkills) {
      bits.push('', `⚠️ ${jd.name} 的專屬技能還在製作中，目前是空的。`,
        `　・原本學過的技能全部保留，體質（HP/SP）立刻提升`,
        `　・職業等級上限 ${jd.jobLevelMax}，技能點會先存著，技能開放後就能點`);
    }
    bits.push('', '這個動作無法復原，確定要轉職嗎？');
    if (!confirm(bits.join('\n'))) return;
  }
  doJobChange(jobId);
  renderJobTree();
  renderAll();
}

/* 轉生面板：條件沒到就把還差什麼寫清楚，不要只給一顆灰掉的按鈕。
   轉生完之後改成顯示「你被鎖在哪條路上、下一站是誰」。 */
function renderRebirthPanel() {
  const done = (state.rebirthCount || 0) >= REBIRTH_MAX;
  if (done) {
    const line = ['novice', ...(state.rebirthPath || [])]
      .map(j => (JOB_TREE[j] || {}).name || j).join(' → ');
    const nxt = rebirthPathNext();
    const nxtName = nxt ? ((JOB_TREE[nxt] || {}).name || nxt) : null;
    return `<div class="rebirth-panel rebirth-done">
      <h4>🌟 已轉生</h4>
      <div class="rebirth-req">鎖定路線：${line}</div>
      <div class="rebirth-gain">轉生是為了把本職練得更強，所以路線鎖死，只能照原路重走一次。<br>
        ${nxt && JOB_TREE[nxt] ? `下一站：<b>${nxtName}</b>`
          : nxt ? `<span class="dim">終點的進階二轉（${nxt}）尚未實作。</span>`
                : `<span class="dim">已走到目前資料的終點。</span>`}</div>
    </div>`;
  }
  const reason = rebirthBlockReason();
  const ok = reason === null;
  const nextAdv = (currentJob().nextLocked || [])[0];
  const worn = EQUIP_SLOTS_ALL.filter(s => state.equip[s]).length;
  return `<div class="rebirth-panel${ok ? ' rebirth-ready' : ''}">
    <h4>🌟 轉生祭壇　<span class="dim">每隻角色只能一次</span></h4>
    <div class="rebirth-req">條件：基礎等級 ${REBIRTH_REQ.baseLevel}　職業等級 ${REBIRTH_REQ.jobLevel}　${REBIRTH_REQ.zeny.toLocaleString()}z</div>
    <div class="rebirth-gain">回到新手，素質歸零並獲得 <b>${REBIRTH_STAT_POINTS}</b> 點素質點、<b>${rebirthSkillPoints()}</b> 點新手技能點（滿級時剛好點滿新手全部技能）。<br>
      <b>路線會被鎖死</b>——轉生後只能重走你現在這條路，走完再接進階二轉${nextAdv && JOB_TREE[nextAdv] ? `「${JOB_TREE[nextAdv].name}」` : ''}。<br>
      <span class="dim">裝備、道具、卡片、圖鑑都會保留；目前職業的技能會全部清除。
      ${worn ? `身上的 <b>${worn}</b> 件裝備會自動卸下放回背包（轉生後等級與職業都穿不上）。` : ''}</span></div>
    ${ok ? `<button class="btn-primary" onclick="confirmRebirth()">進行轉生</button>`
         : `<div class="rebirth-block">尚未符合條件：${reason}</div>`}
  </div>`;
}

/* 洗點要二次確認：花 10 萬且素質全歸 1，手滑的代價不小（#120）*/
function confirmStatReset() {
  const why = statResetBlockReason();
  if (why) { logMsg('⚠️ ' + why); return; }
  const refund = statResetRefund();
  const msg = [
    `素質洗點：`,
    `　・六項素質全部歸 1`,
    `　・退回 ${refund} 點素質點（照當初實際花掉的算，不會少退）`,
    `　・扣除 ${STAT_RESET_COST_ZENY.toLocaleString()}z`,
    ``,
    `確定要洗點嗎？`,
  ].join('\n');
  if (!confirm(msg)) return;
  resetStats();
  renderCharacterTab();
  renderTopBar();
}

function confirmRebirth() {
  if (!canRebirth()) { renderJobTree(); return; }
  const p = jobPrunePreview('novice');
  const path = getAllLearnedJobs().filter(j => j !== 'novice')
    .map(j => (JOB_TREE[j] || {}).name || j).join(' → ');
  const worn = EQUIP_SLOTS_ALL.filter(s => state.equip[s]).length;
  const msg = [
    `轉生會把你變回新手：`,
    `　・基礎等級與職業等級歸 1`,
    `　・素質全部歸 1，改發 ${REBIRTH_STAT_POINTS} 點素質點`,
    `　・清除 ${p.skills.length} 個技能，改發 ${rebirthSkillPoints()} 點新手技能點`,
    ...(worn ? [`　・卸下身上 ${worn} 件裝備放回背包（轉生後等級與職業都穿不上）`] : []),
    `　・扣除 ${REBIRTH_REQ.zeny.toLocaleString()}z`,
    ``,
    `【每隻角色只能轉生一次】`,
    `【路線會被鎖死】轉生後只能重走「${path}」，不能改走其他職業。`,
    ``,
    `裝備、道具、卡片、圖鑑、成就都會保留。`,
    `這個動作無法復原，確定要轉生嗎？`,
  ].join('\n');
  if (!confirm(msg)) return;
  doRebirth();
  renderJobTree();
  renderMapTab();   // 面板本體在地圖分頁，轉生後要立刻換成「已轉生」的樣子
  renderAll();
}

/* ---------------- 地圖背景圖 ---------------- */
function renderMapBackground() {
  const img = document.getElementById('map-bg-img');
  if (!img) return;
  img.src = mapImgSrc(state.mapId);
}

/* ---------------- 背景音樂 ----------------
   規則：依序嘗試 music/maps/{地圖編號}.mp3 / .ogg / .wav，
   全部都找不到就安靜不播放（不會報錯、不會卡住遊戲）。
------------------------------------------------- */
let bgmAudio = null;
let bgmToken = 0;

function playMapMusic() {
  bgmToken++;
  const myToken = bgmToken;
  stopMusic();
  if (state.muted) return;
  tryMusicExt(state.mapId, 0, myToken);
}

function tryMusicExt(mapId, extIdx, token) {
  if (extIdx >= MUSIC_EXTS.length) return;
  const ext = MUSIC_EXTS[extIdx];
  const audio = new Audio();
  audio.loop = true;
  audio.volume = (state.bgmVolume != null ? state.bgmVolume : 0.5);
  audio.addEventListener('error', () => {
    if (bgmToken === token) tryMusicExt(mapId, extIdx + 1, token);
  }, { once: true });
  audio.addEventListener('canplaythrough', () => {
    if (bgmToken !== token) return;
    bgmAudio = audio;
    audio.play().catch(() => {});
  }, { once: true });
  audio.src = mapMusicUrl(mapId, ext);
  audio.load();
}

function stopMusic() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.src = '';
    bgmAudio = null;
  }
}

function toggleMute() {
  state.muted = !state.muted;
  const btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = state.muted ? '🔇 取消靜音' : '🔊 靜音';
  if (state.muted) stopMusic(); else playMapMusic();
  saveGame();
}

/* ---------------- 音量控制 ---------------- */
function setBgmVolume(val) {
  state.bgmVolume = val / 100;
  document.getElementById('vol-bgm-text').textContent = val + '%';
  if (bgmAudio) bgmAudio.volume = state.bgmVolume;
  saveGame();
}

function setSfxVolume(val) {
  state.sfxVolume = val / 100;
  document.getElementById('vol-sfx-text').textContent = val + '%';
  saveGame();
}

function initVolumeSliders() {
  const bgmVal = state.bgmVolume != null ? Math.round(state.bgmVolume * 100) : 50;
  const sfxVal = state.sfxVolume != null ? Math.round(state.sfxVolume * 100) : 50;
  const bgmSlider = document.getElementById('vol-bgm');
  const sfxSlider = document.getElementById('vol-sfx');
  if (bgmSlider) { bgmSlider.value = bgmVal; document.getElementById('vol-bgm-text').textContent = bgmVal + '%'; }
  if (sfxSlider) { sfxSlider.value = sfxVal; document.getElementById('vol-sfx-text').textContent = sfxVal + '%'; }
  const spr = document.getElementById('sprite-scale');
  if (spr) { spr.value = spriteScalePct(); document.getElementById('sprite-scale-text').textContent = spriteScalePct() + '%'; }
  applySpriteScale();
}

/* ---------------- 選擇地圖（含背景圖/音樂切換） ---------------- */
function selectMap(mapId) {
  if (changeMap(mapId)) {
    renderMapBackground();
    playMapMusic();
    renderMapTab();
  }
}

/* ---------------- 離線掛機結算彈窗 ---------------- */
function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} 小時 ${m} 分鐘`;
  return `${m} 分鐘`;
}

function showOfflineModal(off) {
  if (off.safeTown) {
    document.getElementById('offline-modal-body').innerHTML = `
      <p class="offline-duration">離開了 <strong>${formatDuration(off.elapsedMs)}</strong>。你的角色待在城鎮裡安穩地休息，沒有遭遇戰鬥，也沒有任何收穫——想練功記得前往原野喔！</p>`;
    document.getElementById('offline-modal').classList.remove('hidden');
    return;
  }
  // 貴重的排前面（#135）：掛一整晚有上百種掉落，卡片不該被藥草擠到最下面
  const spoils = sortSpoilsByValue(off.itemsGained);
  const itemsHtml = spoils.length
    ? spoils.map(r => `<span class="offline-item">${ITEMS[r.item].icon} ${ITEMS[r.item].name} x${r.qty}</span>`).join('')
    : '<span class="offline-item-empty">（沒有掉落物）</span>';

  const levelUpHtml = (off.baseLevelUps > 0 || off.jobLevelUps > 0)
    ? `<div class="offline-levelup">🎉 基礎等級 +${off.baseLevelUps}　職業等級 +${off.jobLevelUps}</div>`
    : '';
  const prepaid = off.expPrepaid;
  const prepaidHtml = (prepaid && ((prepaid.base || 0) > 0 || (prepaid.job || 0) > 0))
    ? `<p class="offline-duration">隊友回到這張地圖時，已先結算經驗 ${(prepaid.base || 0).toLocaleString()}、職業經驗 ${(prepaid.job || 0).toLocaleString()}。</p>`
    : '';
  // 隊友有出力的話寫出來——#135 之前隊友的傷害根本沒算進離線收益
  const partyHtml = off.allyCount
    ? `<p class="offline-duration">🤝 ${off.allyCount} 位隊友一起參戰。</p>` : '';
  // 頭目那份單獨寫一行（#137）：這是玩家最想知道的一件事
  const bossHtml = (off.bossList || []).length
    ? `<p class="offline-duration">👑 擊敗頭目：${off.bossList.map(b => `${b.name} ×${b.kills}`).join('、')}</p>` : '';

  document.getElementById('offline-modal-body').innerHTML = `
    <p class="offline-duration">離開了 <strong>${formatDuration(off.elapsedMs)}</strong>，你的角色在原地持續戰鬥了 ${off.kills} 場戰鬥：</p>
    ${prepaidHtml}
    ${partyHtml}
    ${bossHtml}
    ${levelUpHtml}
    <div class="offline-stats-grid">
      <div>經驗值 +${off.expGained}</div>
      <div>職業經驗 +${off.jobExpGained}</div>
      <div>鋅幣 +${off.goldGained}</div>
    </div>
    <div class="offline-items">${itemsHtml}</div>`;
  document.getElementById('offline-modal').classList.remove('hidden');
}

function closeOfflineModal() {
  document.getElementById('offline-modal').classList.add('hidden');
}

/* ---------------- 掛機收益：切分頁即離線（#135）----------------

   使用者回報：掛單隻時切走再回來畫面會爆衝，組隊時反而完全沒有收益。
   成因是背景分頁的計時器被瀏覽器降頻，而 gameTick 的兩半對降頻反應不同
   （玩家的攻擊會補、慢心跳裡的隊友一次都不補，詳見 engine.js 的 stopLoop）。

   解法是承認「分頁切走就是離線」：隱藏時停掉主迴圈並蓋上時間戳，
   回來時交給 computeOfflineProgress() 結算再重啟。這樣：
     · 不會爆衝——回來時累積器是歸零的（結算尾端會重設）
     · 組隊算得到——離線結算現在會把隊友的傷害一起抽樣
     · 那段時間不會兩頭落空（以前降頻的 tick 還在存檔，把 lastActiveAt 一直往前推，
       等於既沒真的打也不算離線）
------------------------------------------------- */
function showOfflineReport() {
  // 預設顯示：舊存檔沒有這個欄位時維持原本的行為
  return !(state && state.showOfflineModal === false);
}
function setShowOfflineModal(on) {
  if (!state) return;
  state.showOfflineModal = !!on;
  saveGame();
}
/* 結算結果的統一出口：不管是開遊戲讀檔還是切分頁回來，都走這裡。
   紀錄一律留（見 engine.js 的 pushOfflineLog 說明），彈窗才看勾選。 */
const IDLE_SETTLE_MIN_MS = 5000;    // 切分頁：超過 5 秒就結算，收益不蒸發
function deliverOfflineResult(off) {
  if (!off) return;
  if (typeof takeExpPrepaidNote === 'function') {
    const n = takeExpPrepaidNote();
    if (n) off.expPrepaid = n;
  }
  /* 收益已經在 computeOfflineProgress() 裡發出去了，這裡只決定「要不要留痕跡」。
     太短的（快速切一下分頁）不記也不彈：不然頻繁切換的人三筆紀錄全是
     「離開 0 分鐘」，那顆按鈕就變成裝飾品，剛好跟使用者要的相反。 */
  if (off.elapsedMs < OFFLINE_MIN_MS && !off.expPrepaid) { saveGame(); return; }
  pushOfflineLog(off);
  if (showOfflineReport()) showOfflineModal(off);
  else {
    _idleReportUnseen = true;
    const extra = off.expPrepaid ? `（已先結算經驗 ${(off.expPrepaid.base || 0).toLocaleString()}）` : '';
    showToast(`📈 掛機收益已記錄：經驗 +${(off.expGained || 0).toLocaleString()}${extra}`);
  }
  refreshIdleReportBtn();
  if (idleReportOpen) renderIdleReport();
  saveGame();
}

let _idleReportUnseen = false;
let idleReportOpen = false;

function toggleIdleReport() {
  idleReportOpen = !idleReportOpen;
  const el = document.getElementById('idle-report-panel');
  if (el) el.classList.toggle('hidden', !idleReportOpen);
  if (idleReportOpen) {
    // 兩個浮動面板釘在同一個位置，同時開會疊在一起
    if (typeof allyPanelOpen !== 'undefined' && allyPanelOpen) toggleAllyPanel();
    _idleReportUnseen = false;
    const cb = document.getElementById('opt-offline-modal');
    if (cb) cb.checked = showOfflineReport();
    renderIdleReport();
  }
  refreshIdleReportBtn();
}
function refreshIdleReportBtn() {
  const on = _idleReportUnseen && !idleReportOpen;
  const btn = document.getElementById('btn-idle-report');
  if (btn) btn.classList.toggle('has-new', on);
  const menu = document.getElementById('btn-menu');
  if (menu) menu.classList.toggle('has-new', on);
}
function formatStamp(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function renderIdleReport() {
  const el = document.getElementById('idle-report-body');
  if (!el) return;
  const list = (typeof offlineLogList === 'function' ? offlineLogList() : []) || [];
  if (!list.length) {
    el.innerHTML = `<div class="idle-rec-empty">還沒有紀錄。<br>切到別的分頁或關掉遊戲，回來就會結算一次。</div>`;
    return;
  }
  el.innerHTML = list.map(r => {
    if (r.safeTown) {
      return `<div class="idle-rec">
        <div class="idle-rec-when">${formatStamp(r.at)}</div>
        <div class="idle-rec-head">離開 ${formatDuration(r.elapsedMs)}　🏘️ 待在安全區</div>
        <div class="idle-rec-grid"><div>沒有戰鬥收穫</div></div>
      </div>`;
    }
    const items = (r.itemsGained || []).length
      ? (r.itemsGained || []).map(x => ITEMS[x.item]
          ? `<span class="offline-item">${ITEMS[x.item].icon} ${ITEMS[x.item].name} x${x.qty}</span>` : '').join('')
        + (r.itemsMore ? `<span class="offline-item">…還有 ${r.itemsMore} 種</span>` : '')
      : '<span class="offline-item-empty">（沒有掉落物）</span>';
    const prepaid = (r.expPrepaid && ((r.expPrepaid.base || 0) > 0 || (r.expPrepaid.job || 0) > 0))
      ? `<div class="idle-rec-lv">隊友回到地圖時已先結算經驗 ${(r.expPrepaid.base || 0).toLocaleString()}、職業 ${(r.expPrepaid.job || 0).toLocaleString()}</div>`
      : '';
    const lv = (r.baseLevelUps > 0 || r.jobLevelUps > 0)
      ? `<div class="idle-rec-lv">🎉 等級 +${r.baseLevelUps}　職業 +${r.jobLevelUps}</div>` : '';
    const party = r.allyCount ? `　🤝 ${r.allyCount} 位隊友` : '';
    const boss = (r.bossList || []).length
      ? `<div class="idle-rec-lv">👑 ${r.bossList.map(b => `${b.name} ×${b.kills}`).join('、')}</div>` : '';
    return `<div class="idle-rec">
      <div class="idle-rec-when">${formatStamp(r.at)}</div>
      <div class="idle-rec-head">離開 ${formatDuration(r.elapsedMs)}　${r.mapName || ''}${party}</div>
      <div class="idle-rec-grid">
        <div>擊殺 ${(r.kills || 0).toLocaleString()}</div>
        <div>鋅幣 +${(r.goldGained || 0).toLocaleString()}</div>
        <div>經驗 +${(r.expGained || 0).toLocaleString()}</div>
        <div>職業 +${(r.jobExpGained || 0).toLocaleString()}</div>
      </div>
      ${boss}
      ${prepaid}
      ${lv}
      <div class="idle-rec-items">${items}</div>
    </div>`;
  }).join('');
}

/* 分頁可見度。**只有真的在遊戲畫面裡才處理**：還在標題／創角畫面時
   state 是 null 或還沒進場，停迴圈與結算都沒有意義。 */
document.addEventListener('visibilitychange', () => {
  if (typeof tabSessionBlocked === 'function' && tabSessionBlocked()) return;
  if (!state || typeof stopLoop !== 'function') return;
  const inGame = document.getElementById('screen-game').classList.contains('active');
  if (!inGame) return;
  if (document.hidden) {
    stopLoop();
    if (typeof stampPlayedClocks === 'function') stampPlayedClocks();
    else state.lastActiveAt = Date.now();
    saveGame();
  } else if (!loopRunning()) {
    let off = null;
    try { off = computeOfflineProgress(IDLE_SETTLE_MIN_MS); }
    catch (e) { console.error('切回分頁結算失敗', e); }
    /* 沒結算（離開不到 5 秒）時**也要把時間錨點推回現在**。
       結算那條路的尾端本來就會重設這三格，但 return null 那條不會——
       不重設的話 gameTick 會看到「距離上次攻擊 4.9 秒」，一口氣把那些刀補完，
       正是要修掉的爆衝畫面。 */
    if (!off) {
      state.lastAttackTime = Date.now();
      state.attackAccumulator = 0;
      state.lastMonsterAttackTime = Date.now();
      (state.monsters || []).forEach(m => { m.lastAttackTime = Date.now(); });
      state._lastSlowTick = Date.now();
    }
    startLoop();
    deliverOfflineResult(off);
    renderAll();
  }
});

window.addEventListener('focus', () => {
  if (!state || (typeof tabSessionBlocked === 'function' && tabSessionBlocked())) return;
  const screen = document.getElementById('screen-game');
  if (!screen || !screen.classList.contains('active')) return;
  if (typeof resyncPartyAllies === 'function') resyncPartyAllies();
  if (allyPanelOpen) renderAllyPanel();
});

/* ---------------- 手動存檔 ---------------- */
function manualSave() {
  saveGame();
  showToast('💾 已儲存進度');
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

function isJobUnlocked(jobId) {
  // 沿著 parent 鏈往回追，看是否是目前職業的祖先或本身
  let cur = state.jobId;
  while (cur) {
    if (cur === jobId) return true;
    cur = JOB_TREE[cur].parent;
  }
  return false;
}

/* ---------------- 裝備精煉 UI ----------------
   原本是 confirm() 彈窗，每敲一次 +1 就要被打斷一次，連續精煉很難用。
   改成畫在裝備分頁下方的常駐面板：材料自己選，按鈕可以一直按，結果直接寫在面板上。
------------------------------------------------- */
let _refineMatChoice = {};   // slotKey → 選定的材料 key（換裝備時會自動失效）
let _refineLog = [];         // 最近幾次的結果，畫在面板底下
let _refineLogFor = null;    // 這份紀錄是哪一件裝備的，換一件就清掉免得看混

function refineContext(slotKey) {
  const itemId = getEquipBaseItemId(slotKey);
  if (!itemId) return null;
  const item = ITEMS[itemId];
  const isArmor = item.type === 'armor';
  const weaponLv = isArmor ? 0 : getRefineWeaponLv(item);
  const level = getRefinementLevel(slotKey);
  // 這件裝備「用得上」的材料（不管身上有沒有），讓玩家知道該去湊什麼
  const mats = Object.entries(REFINEMENT_MATERIALS)
    .filter(([, m]) => (isArmor ? m.usableArmor : m.usableWeaponLv.includes(weaponLv)))
    .map(([key, m]) => {
      const invRow = state.inventory.find(r => r.item === m.id && !r.instanceId);
      return { key, mat: m, qty: invRow ? invRow.qty : 0 };
    });
  return {
    itemId, item, isArmor, weaponLv, level, mats,
    maxed: level >= REFINEMENT_MAX,
    cost: getRefinementCost(level),
    safe: getRefinementSafeLevel(weaponLv, isArmor),
    lvTag: isArmor ? '防具' : `Lv${weaponLv} 武器`
  };
}

// 選定的材料：玩家選過就用玩家選的（前提是還有庫存），否則挑第一個有庫存的
function currentRefineMat(slotKey, ctx) {
  const picked = _refineMatChoice[slotKey];
  const hit = ctx.mats.find(m => m.key === picked && m.qty > 0);
  if (hit) return hit;
  return ctx.mats.find(m => m.qty > 0) || null;
}

function setRefineMat(slotKey, key) {
  _refineMatChoice[slotKey] = key;
  showRefinePanel(slotKey);
}

function showRefinePanel(slotKey) {
  const el = document.getElementById('tab-equip');
  if (!el) return;
  hideEquipTooltip();
  const ctx = refineContext(slotKey);
  if (!ctx) { renderEquipTab(); return; }

  // 用「基底道具」當 key，不能用 state.equip[slotKey]——第一次精煉成功時
  // 那件裝備會從 itemId 變成 instanceId，key 一變紀錄就當場被清掉
  const logKey = slotKey + ':' + ctx.itemId;
  if (_refineLogFor !== logKey) { _refineLog = []; _refineLogFor = logKey; }

  const sel = currentRefineMat(slotKey, ctx);
  const rate = ctx.maxed ? 0 : getRefinementSuccessRate(ctx.level, ctx.weaponLv, sel ? sel.key : null);
  const canPay = state.gold >= ctx.cost;
  const canRefine = !ctx.maxed && !!sel && canPay;

  const matBtns = ctx.mats.length
    ? ctx.mats.map(m => {
        const on = sel && sel.key === m.key;
        const penalty = m.mat.failPenalty === 'none'
          ? '失敗無懲罰'
          : (ctx.level >= ctx.safe ? '失敗降3級或損壞' : '失敗不降級');
        const r = getRefinementSuccessRate(ctx.level, ctx.weaponLv, m.key);
        return `<button class="refine-mat${on ? ' active' : ''}${m.qty <= 0 ? ' out' : ''}"
          ${m.qty <= 0 ? 'disabled' : ''} onclick="setRefineMat('${slotKey}','${m.key}')">
          <span class="refine-mat-name">${m.mat.name}</span>
          <span class="refine-mat-qty${m.qty <= 0 ? ' zero' : ''}">×${m.qty}</span>
          <span class="refine-mat-note">成功率 ${r}%・${penalty}</span>
        </button>`;
      }).join('')
    : `<div class="equip-pick-empty">這件裝備沒有對應的精煉材料。</div>`;

  let hint = '';
  if (ctx.maxed) hint = `已達最大精煉 +${REFINEMENT_MAX}。`;
  else if (!sel) hint = `身上沒有可用的材料。${ctx.lvTag}要用：${ctx.mats.map(m => m.mat.name).join('、') || '（無）'}`;
  else if (!canPay) hint = `鋅幣不足，需要 ${ctx.cost.toLocaleString()} z。`;

  el.innerHTML = `
    <h3 class="panel-title">🔨 精煉　${ctx.level > 0 ? `+${ctx.level} ` : ''}${getItemDisplayName(ctx.itemId)}</h3>
    <button class="btn-small" onclick="renderEquipTab()">← 返回裝備欄</button>
    <div class="refine-panel">
      <div class="refine-head">
        <span class="refine-step">${ctx.maxed ? `<b>+${ctx.level}</b>（已達上限）` : `+${ctx.level} → <b>+${ctx.level + 1}</b>`}</span>
        <span class="refine-meta">${ctx.lvTag}・安全等級 +${ctx.safe}</span>
        <span class="refine-meta">費用 ${ctx.cost.toLocaleString()} z（持有 ${state.gold.toLocaleString()} z）</span>
      </div>
      <div class="refine-mats">${matBtns}</div>
      <div class="refine-actions">
        <button class="btn-small" ${canRefine ? '' : 'disabled'} onclick="doRefineSlot('${slotKey}')">
          精煉（成功率 ${rate}%）
        </button>
        ${!ctx.maxed && ctx.mats.length ? `<select id="refine-bulk-target" class="refine-bulk-select">
          ${Array.from({length: REFINEMENT_MAX - ctx.level}, (_, i) => ctx.level + i + 1).map(lv => `<option value="${lv}">強化到 +${lv}</option>`).join('')}
          <option value="break">強化到爆掉／材料用完</option>
        </select>
        <button class="btn-small" ${canRefine ? '' : 'disabled'} onclick="doRefineBulk('${slotKey}')">一鍵強化</button>` : ''}
        ${hint ? `<span class="refine-hint">${hint}</span>` : ''}
      </div>
      ${_refineLog.length ? `<div class="refine-log">${_refineLog.map(l => `<div>${l}</div>`).join('')}</div>` : ''}
    </div>`;
}

/* 一鍵強化（使用者 2026-08-22 指定）：下拉選目標 +N 或「到爆掉／材料用完」，
   每 1 秒精煉一次，成功時播音效。中途爆掉／沒材料／沒錢／達標就停。
   走非同步 setTimeout，畫面不會被連續精煉卡死。 */
let _refineBulkRunning = false;
function doRefineBulk(slotKey) {
  if (_refineBulkRunning) return;
  const selEl = document.getElementById('refine-bulk-target');
  const target = selEl ? selEl.value : 'break';
  _refineBulkRunning = true;
  const step = () => {
    const ctx = refineContext(slotKey);
    if (!ctx) { _refineBulkRunning = false; return; }
    // 停止條件：已達指定目標／已爆（等級下降或歸零且低於原本）／已達上限
    const lv = getRefinementLevel(slotKey);
    if (target !== 'break' && lv >= parseInt(target, 10)) {
      logMsg(`🔨 一鍵強化完成：${ctx.item.name} +${lv}。`);
      _refineBulkRunning = false;
      showRefinePanel(slotKey); renderTopBar();
      return;
    }
    if (ctx.maxed) {
      logMsg(`🔨 ${ctx.item.name} 已達最大精煉 +${REFINEMENT_MAX}。`);
      _refineBulkRunning = false;
      showRefinePanel(slotKey); renderTopBar();
      return;
    }
    const sel = currentRefineMat(slotKey, ctx);
    if (!sel || state.gold < ctx.cost) {
      logMsg(`🔨 一鍵強化停止：${!sel ? '材料用完' : '鋅幣不足'}（目前 +${lv}）。`);
      _refineBulkRunning = false;
      showRefinePanel(slotKey); renderTopBar();
      return;
    }
    const before = lv;
    const success = refineItem(slotKey, sel.key);
    const after = getRefinementLevel(slotKey);
    _refineLog.unshift(success
      ? `🔨 成功　${ctx.item.name} +${before} → +${after}（${sel.mat.name}）`
      : `💥 失敗　${ctx.item.name} +${before} → +${after}（${sel.mat.name}）`);
    _refineLog = _refineLog.slice(0, 8);
    if (success && typeof playEventSfx === 'function') playEventSfx('refine');
    // 爆掉判定：等級比這次成功應有的還低（降3級或損壞歸零）→ 停
    if (after < before && after <= ctx.safe) {
      logMsg(`💥 ${ctx.item.name} 精煉失敗受損（+${after}），一鍵強化停止。`);
      _refineBulkRunning = false;
      showRefinePanel(slotKey); renderTopBar();
      return;
    }
    showRefinePanel(slotKey);
    renderTopBar();
    setTimeout(step, 1000);   // 每 1 秒一次
  };
  step();
}

function doRefineSlot(slotKey) {
  const ctx = refineContext(slotKey);
  if (!ctx) return;
  // 從別處（舊入口）直接呼叫時，先把面板打開再說
  if (ctx.maxed) { showToast(`${ctx.item.name} 已達最大精煉 +${REFINEMENT_MAX}！`); showRefinePanel(slotKey); return; }
  const sel = currentRefineMat(slotKey, ctx);
  if (!sel || state.gold < ctx.cost) { showRefinePanel(slotKey); return; }

  const before = ctx.level;
  const success = refineItem(slotKey, sel.key);
  const after = getRefinementLevel(slotKey);
  const name = ctx.item.name;
  _refineLog.unshift(success
    ? `🔨 成功　${name} +${before} → +${after}（${sel.mat.name}）`
    : `💥 失敗　${name} +${before} → +${after}（${sel.mat.name}）`);
  _refineLog = _refineLog.slice(0, 8);

  showRefinePanel(slotKey);   // 停在面板上，才能連續按
  renderTopBar();
}

/* ---------------- 露天商店 UI ---------------- */
/* ---------------- 露天商店 UI（#148）----------------

   舊版是把 `#tab-inventory` 的內容整個換掉：開著就看不到背包，要按「← 返回」
   才回得去，而且每點一次道具整頁重畫、捲動歸零。跟鍛造與倉庫當初的問題一樣。

   改成跟自動販賣同一套**非阻斷浮動視窗**：左邊背包、右邊要賣的（最多 3 樣），
   點一下就搬過去，立刻生效不必再按確認。CSS 直接共用 `.wh-*`，
   捲動位置與「剛移過去的排最上面」也共用 keepListScroll / sortRowsWithRecent。 */
const VENDING_MAX = 3;
let vdCategory = 'all';
let vdSearch = '';
function setVdCategory(c) { vdCategory = c; renderVendingWindow(); }
function onVdSearch(v, ev) {
  if (imeComposing(ev)) return;
  vdSearch = (v || '').trim().toLowerCase();
  renderVendingWindow();
  refocusSearch('vd-search');
}
function vendingList() {
  if (!state.vendingConfig) state.vendingConfig = { items: [] };
  return state.vendingConfig.items;
}
function vdAdd(itemId) {
  const list = vendingList();
  if (list.includes(itemId)) return;
  if (isItemLocked(itemId)) { showToast('🔒 已鎖定，無法放上露天商店。'); return; }
  if (list.length >= VENDING_MAX) { showToast(`最多只能擺 ${VENDING_MAX} 樣`); return; }
  setVendingItems(list.concat(itemId));
  markListRecent('right', itemId);
  renderVendingWindow();
  renderInventoryTab();
}
function vdRemove(itemId) {
  setVendingItems(vendingList().filter(i => i !== itemId));
  markListRecent('left', itemId);
  renderVendingWindow();
  renderInventoryTab();
}
function vdAddAll() {
  const picked = vendingList();
  const canAdd = VENDING_MAX - picked.length;
  if (canAdd <= 0) { showToast(`已滿 ${VENDING_MAX} 樣`); return; }
  const all = state.inventory.filter(r => !r.instanceId && ITEMS[r.item] && (ITEMS[r.item].sell || 0) > 0);
  let left = all.filter(r => !picked.includes(r.item) && !isItemLocked(r.item));
  if (vdCategory !== 'all') left = left.filter(r => invCategoryOf(r.item) === vdCategory);
  if (vdSearch) left = left.filter(r => (ITEMS[r.item].name || '').toLowerCase().includes(vdSearch));
  left = sortRowsWithRecent(left, 'left');
  const toAdd = left.slice(0, canAdd).map(r => r.item);
  if (!toAdd.length) { showToast('沒有可上架的道具'); return; }
  setVendingItems(picked.concat(toAdd));
  toAdd.forEach(id => markListRecent('right', id));
  renderVendingWindow();
  renderInventoryTab();
  showToast(`已上架 ${toAdd.length} 樣`);
}

function showVendingWindow() {
  let win = document.getElementById('vending-window');
  if (!win) {
    win = document.createElement('div');
    win.id = 'vending-window';
    win.className = 'wh-window';
    win.innerHTML = `<div id="vending-frame" class="wh-frame">
        <header id="vending-drag" class="wh-header">
          <div><h3>🏪 露天商店</h3><span class="wh-sub">左邊背包，點一下移右邊＝擺上架（最多 ${VENDING_MAX} 樣）</span></div>
          <div class="wh-header-btns">
            <button class="btn-small ghost" onclick="closeVendingWindow()">✕ 關閉</button>
          </div>
        </header>
        <div id="vending-body" class="wh-body"></div>
      </div>`;
    document.body.appendChild(win);
    makeDraggable(document.getElementById('vending-drag'), document.getElementById('vending-frame'));
  }
  win.classList.remove('hidden');
  renderVendingWindow();
}
function closeVendingWindow() {
  const win = document.getElementById('vending-window');
  if (win) win.classList.add('hidden');
}
function renderVendingWindow() {
  keepListScroll('vending-body', renderVendingWindowInner);
}
function renderVendingWindowInner() {
  const body = document.getElementById('vending-body');
  if (!body || !state) return;
  const sk = findSkillById('vending');
  const sellMult = (sk && sk.sellMultiplier) || 10;
  const cdSec = (sk && sk.internalCooldown) || 60;
  const picked = vendingList();
  const readyIn = Math.max(0, Math.ceil(((state.vendingReadyAt || 0) - Date.now()) / 1000));

  /* 左邊：背包裡賣得掉、而且還沒上架的。
     個體裝備（精煉過／插過卡）一律不列——那一件被賣掉等於連卡帶精煉一起消失。 */
  const all = state.inventory.filter(r => !r.instanceId && ITEMS[r.item] && (ITEMS[r.item].sell || 0) > 0);
  const left = all.filter(r => !picked.includes(r.item));
  /* 右邊是「上架紀錄」：背包暫時沒貨也照樣列著，之後打到就會被賣。
     跟自動販賣同一個道理。 */
  const right = picked
    .map(id => ({ item: id, qty: (state.inventory.find(r => r.item === id && !r.instanceId) || {}).qty || 0 }))
    .filter(r => ITEMS[r.item]);

  const inCat = list => vdCategory === 'all' ? list : list.filter(r => invCategoryOf(r.item) === vdCategory);
  const apply = (list, side) => {
    let out = inCat(list);
    if (vdSearch) out = out.filter(r => (ITEMS[r.item].name || '').toLowerCase().includes(vdSearch));
    return sortRowsWithRecent(out, side);
  };
  const listHtml = (rows, side) => rows.length
    ? rows.map(r => {
        const d = ITEMS[r.item];
        const locked = side === 'left' && isItemLocked(r.item);
        const full = side === 'left' && picked.length >= VENDING_MAX;
        const action = side === 'left' ? `vdAdd('${r.item}')` : `vdRemove('${r.item}')`;
        const price = Math.round((d.sell || 0) * sellMult);
        const hint = side === 'left' ? (locked ? '（已鎖定）' : full ? '（已滿）' : '＋') : '✕';
        return `<div class="wh-row" onclick="${action}" title="${side === 'left'
          ? `點一下＝上架，每 ${cdSec} 秒以 ${sellMult} 倍價（${price}z）賣出 1 個`
          : '點一下＝下架'}">
          <img src="${itemImgSrc(r.item)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(d))}'">
          <span class="wh-row-name">${locked ? '🔒 ' : ''}${getItemDisplayName(r.item)}</span>
          <span class="wh-row-qty">×${r.qty}　<span style="color:var(--gold-soft)">${price}z</span>　<span style="color:var(--ink-dim)">${hint}</span></span>
        </div>`;
      }).join('')
    : `<div class="empty-hint">${side === 'left' ? '背包裡沒有賣得掉的道具。' : '還沒擺任何東西上架。'}</div>`;

  const catCount = {};
  INV_CATEGORIES.forEach(c => { catCount[c.key] = 0; });
  all.forEach(r => { catCount[invCategoryOf(r.item)]++; });

  body.innerHTML = `
    <div class="wh-hint">每 <b>${cdSec}</b> 秒自動以 <b>${sellMult} 倍</b>原價各賣出 1 個，最多擺 <b>${VENDING_MAX}</b> 樣。
      ${readyIn > 0 ? `下次販售倒數 <b>${readyIn}s</b>。` : ''}<br>
      已鎖定的道具不會上架；精煉過或插過卡的裝備不列入（賣掉等於連卡帶精煉一起消失）。</div>

    <div class="inv-cats">
      <button class="btn-small ${vdCategory === 'all' ? 'active' : ''}" onclick="setVdCategory('all')">全部 <span class="inv-cat-n">${all.length}</span></button>
      ${INV_CATEGORIES.filter(c => catCount[c.key] > 0).map(c =>
        `<button class="btn-small ${vdCategory === c.key ? 'active' : ''}" onclick="setVdCategory('${c.key}')">${c.icon} ${c.name} <span class="inv-cat-n">${catCount[c.key]}</span></button>`
      ).join('')}
    </div>

    <div class="wh-toolbar">
      <input id="vd-search" class="codex-search" type="text" placeholder="🔍 搜尋名稱…"
        value="${vdSearch.replace(/"/g, '&quot;')}" oninput="onVdSearch(this.value, event)">
    </div>

    <div class="wh-cols">
      <div class="wh-col">
        <div class="wh-col-head">背包（點一下上架 ▶）　${left.length} ${apply(left,'left').length && picked.length < VENDING_MAX ? `<button class="btn-small ghost" style="float:right" onclick="vdAddAll()">一鍵上架</button>` : ''}</div>
        <div class="wh-list">${listHtml(apply(left, 'left'), 'left')}</div>
      </div>
      <div class="wh-col">
        <div class="wh-col-head">上架中（點一下下架 ✕）　${right.length}/${VENDING_MAX}</div>
        <div class="wh-list">${listHtml(apply(right, 'right'), 'right')}</div>
      </div>
    </div>
  `;
}

/* ---------------- 鐵匠鍛造 UI（#103）----------------

   使用者 2026-08-16：「鐵匠的鍛造頁面 新增在裝備分頁右邊 點開跳出不影響掛機的視窗」。

   以前鍛造是把 `#tab-inventory` 的內容整個換掉：入口埋在背包裡、開著就看不到背包，
   而且要按「← 返回」才回得去。改成跟倉庫同一套**非阻斷浮動視窗**——
   外層鋪滿畫面但 `pointer-events:none`，只有中間的 frame 收事件，
   所以打怪照跑、旁邊的分頁照樣點得到，標題列可拖走。CSS 直接共用 `.wh-*`。 */
function forgeAvailable() {
  const hasMat = (state.unlockedMaterialCrafts || []).length > 0;
  const hasCraft = (state.unlockedCraftCategories || []).length > 0;
  if (!hasMat && !hasCraft) return false;
  // 原料鍛造共用（毒藥瓶給十字刺客），武器鍛造限鐵匠系
  if (hasMat) return true;
  return typeof isBlacksmithLine === 'function' && isBlacksmithLine(state.jobId);
}

// 分頁列上那顆「🔨 鍛造」一直占著格子。沒學會相關技能就停用，不能點開。
function syncForgeTabBtn() {
  const btn = document.getElementById('tab-btn-forge');
  if (!btn) return;
  const ok = forgeAvailable();
  btn.disabled = !ok;
  btn.title = ok ? '開啟鍛造' : '需先學會鍛造相關技能';
  if (!ok && forgeIsOpen()) closeForge();
}

function openForge() {
  if (!forgeAvailable()) return;
  let win = document.getElementById('forge-window');
  if (!win) {
    win = document.createElement('div');
    win.id = 'forge-window';
    win.className = 'wh-window';
    win.innerHTML = `<div id="forge-frame" class="wh-frame">
        <header id="forge-drag" class="wh-header">
          <div><h3>🔨 鍛造</h3><span class="wh-sub">開著也不影響掛機，標題列可拖曳</span></div>
          <button class="btn-small ghost" onclick="closeForge()">✕ 關閉</button>
        </header>
        <div id="forge-body" class="wh-body"></div>
      </div>`;
    document.body.appendChild(win);
    makeDraggable(document.getElementById('forge-drag'), document.getElementById('forge-frame'));
  }
  win.classList.remove('hidden');
  _forgeSig = '';
  showCraftingPanel();
}
function closeForge() {
  const win = document.getElementById('forge-window');
  if (win) win.classList.add('hidden');
}
function forgeIsOpen() {
  const win = document.getElementById('forge-window');
  return !!win && !win.classList.contains('hidden');
}

/* 開著的時候材料與鋅幣會一直變（掛機照跑），數字不能停在打開的那一刻。
   但每秒無條件重畫會把捲動位置洗掉，所以先比一個簽章：**只有真的變了才重畫**。
   簽章收的就是面板上會印出來的那幾個數字。 */
let _forgeSig = '';
function refreshForgeIfChanged() {
  const parts = [state.gold, getItemQty('iron'), getItemQty('steel')];
  Object.values(CRAFT_ELEMENT_STONE).forEach(id => parts.push(getItemQty(id)));
  Object.values(MATERIAL_CRAFT_RECIPES).forEach(r => r.consume.forEach(c => parts.push(getItemQty(c.item))));
  const sig = parts.join(',');
  if (sig === _forgeSig) return;
  _forgeSig = sig;
  showCraftingPanel();
}

function showCraftingPanel() {
  const el = document.getElementById('forge-body');
  if (!el) return;
  const chance = getCraftingSuccessChance();
  const ironQty = getItemQty('iron');
  const steelQty = getItemQty('steel');

  let html = `<div class="wh-hint">成功率 ${chance.toFixed(1)}%（失敗材料照樣消耗）。目前持有：鐵x${ironQty}、鋼鐵x${steelQty}、鋅幣${state.gold.toLocaleString()}</div>`;

  if (state.unlockedMaterialCrafts && state.unlockedMaterialCrafts.length > 0) {
    html += `<h3 class="panel-title">原料鍛造</h3>`;
    html += `<div class="empty-hint">失敗時材料照樣消耗。成功率與花費逐項標示。</div>`;
    html += '<div class="card-list">';
    Object.keys(MATERIAL_CRAFT_RECIPES).forEach(kind => {
      const recipe = MATERIAL_CRAFT_RECIPES[kind];
      if (!state.unlockedMaterialCrafts.includes(recipe.unlockCategory)) return;
      const resultDef = ITEMS[recipe.result];
      // 成功率與花費改成逐道配方（毒藥瓶是 25%，其餘沿用通用值）
      const rate = materialCraftChance(recipe);
      const cost = materialCraftCost(recipe);
      const matText = recipe.consume.map(c => `${ITEMS[c.item] ? ITEMS[c.item].name : c.item}x${c.qty}（持有${getItemQty(c.item)}）`).join('、');
      const canCraft = recipe.consume.every(c => getItemQty(c.item) >= c.qty) && state.gold >= cost;
      html += `<div class="card-row${canCraft ? ' enabled' : ''}">
        <div class="card-info">
          <span class="card-icon">${resultDef ? resultDef.icon : '📦'}</span>
          <div class="card-details">
            <span class="card-name">${resultDef ? resultDef.name : recipe.result}　<span class="card-desc">成功率 ${rate}%</span></span>
            <span class="card-desc">需要：${matText}、鋅幣${cost}</span>
          </div>
        </div>
        <button class="btn-small" ${canCraft ? '' : 'disabled'} onclick="doCraftMaterial('${kind}')">鍛造</button>
      </div>`;
    });
    html += '</div>';
  }

  // 武器鍛造要學會對應的鍛造技能才有東西可列；只點了原料鍛造時不要留一個空標題
  if (!(state.unlockedCraftCategories || []).length) {
    if (!(state.unlockedMaterialCrafts || []).length) {
      html += '<div class="empty-hint">還沒學會任何鍛造技能。到技能分頁點鐵匠的鍛造系技能就會出現在這裡。</div>';
    }
    el.innerHTML = html;
    return;
  }

  html += `<h3 class="panel-title">武器鍛造</h3>`;
  html += '<div class="card-list">';

  state.unlockedCraftCategories.forEach(cat => {
    const subtypes = Object.keys(CRAFT_SUBTYPE_CATEGORY).filter(st => CRAFT_SUBTYPE_CATEGORY[st] === cat);
    subtypes.forEach(subtype => {
      const mat = CRAFT_SUBTYPE_MATERIALS[subtype];
      const subtypeName = CRAFT_SUBTYPE_NAMES[subtype] || subtype;
      Object.keys(CRAFT_ELEMENT_STONE).forEach(element => {
        const stoneId = CRAFT_ELEMENT_STONE[element];
        const stoneQty = getItemQty(stoneId);
        const elementName = CRAFT_ELEMENT_NAMES[element];
        const stoneDef = ITEMS[stoneId];
        const canCraft = ironQty >= mat.iron && steelQty >= mat.steel && stoneQty >= 1 && state.gold >= CRAFT_ZENY_COST;
        html += `<div class="card-row${canCraft ? ' enabled' : ''}">
          <div class="card-info">
            <span class="card-icon">⚔️</span>
            <div class="card-details">
              <span class="card-name">${subtypeName}（${elementName}屬性）</span>
              <span class="card-desc">需要：鐵x${mat.iron}、鋼鐵x${mat.steel}、${stoneDef ? stoneDef.name : stoneId}x1（持有${stoneQty}）、鋅幣${CRAFT_ZENY_COST}</span>
            </div>
          </div>
          <button class="btn-small" ${canCraft ? '' : 'disabled'} onclick="doCraftWeapon('${subtype}','${element}')">鍛造</button>
        </div>`;
      });
    });
  });
  html += '</div>';
  el.innerHTML = html;
}
function doCraftWeapon(subtype, element) {
  craftWeapon(subtype, element);
  showCraftingPanel();
  renderTopBar();
}
function doCraftMaterial(kind) {
  craftMaterial(kind);
  showCraftingPanel();
  renderTopBar();
}

function openRenameWindow() {
  let win = document.getElementById('rename-window');
  if (!win) {
    win = document.createElement('div');
    win.id = 'rename-window';
    win.innerHTML = `<div id="rename-frame" class="wh-frame" style="max-width:340px;">
        <header id="rename-drag" class="wh-header">
          <div><h3>✎ 修改名稱</h3><span class="wh-sub">雙擊名稱可再次開啟</span></div>
          <button class="btn-small ghost" onclick="closeRenameWindow()">✕ 關閉</button>
        </header>
        <div class="wh-body" style="display:flex;flex-direction:column;gap:10px;">
          <input id="rename-window-input" type="text" maxlength="12" placeholder="新名稱(最多12字)" style="padding:6px 8px;width:100%;box-sizing:border-box;">
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-small ghost" onclick="closeRenameWindow()">取消</button>
            <button class="btn-small" onclick="confirmRename()">確認</button>
          </div>
        </div>
      </div>`;
    win.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);z-index:1200;';
    win.addEventListener('click', e => { if (e.target === win) closeRenameWindow(); });
    document.body.appendChild(win);
    makeDraggable(document.getElementById('rename-drag'), document.getElementById('rename-frame'));
  }
  win.classList.remove('hidden');
  win.style.display = 'flex';
  const inp = document.getElementById('rename-window-input');
  if (inp) { inp.value = state.name; setTimeout(() => { inp.focus(); inp.select(); }, 30); inp.onkeydown = e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') closeRenameWindow(); }; }
}
function closeRenameWindow() {
  const win = document.getElementById('rename-window');
  if (win) { win.classList.add('hidden'); win.style.display = 'none'; }
}
function confirmRename() {
  const inp = document.getElementById('rename-window-input');
  if (!inp) return;
  if (renameCharacter(inp.value)) { renderTopBar(); renderCharacterTab(); closeRenameWindow(); }
}

/* ---------------- 雙欄清單的兩個體感修正（#139）----------------

   倉庫與自動販賣是同一個形狀：左右兩欄，點一下就把東西搬到對面。
   兩邊都是「每點一次就 `body.innerHTML = …` 整塊重畫」，於是：

     1. 重畫會把 `.wh-list` 整個換掉，捲動位置歸零 —— 剛捲到一半點一樣東西，
        清單就彈回最上面，要再捲一次才能點下一樣。
     2. 搬過去的東西照筆劃排在對面清單的**中間**，看不到它跑哪去了，
        想反悔還得先找。

   東西一多就變成「點一下、捲半天」（使用者回報）。兩個都修：
     · 重畫前後把每一欄的 scrollTop 記下來再放回去
     · 剛搬過去的東西排到**對面那一欄**的最上面

   `_listRecent` 只記在記憶體裡、關掉視窗就算了——這是操作動線的輔助，
   不是玩家的設定，沒有必要進存檔。
   **只標對面那一欄**：兩欄都標的話，來源欄剩下的那疊也會跳到頂端，
   游標底下的那一列會換人，反而容易點錯。 */
const _listRecent = { bag: {}, wh: {}, left: {}, right: {} };
let _listRecentSeq = 0;
function markListRecent(side, itemId) {
  if (_listRecent[side]) _listRecent[side][itemId] = ++_listRecentSeq;
}
// 剛搬過來的排最前面，其餘照筆劃
function sortRowsWithRecent(rows, side) {
  const recent = _listRecent[side] || {};
  return rows.sort((a, b) => {
    const ra = recent[a.item] || 0, rb = recent[b.item] || 0;
    if (ra !== rb) return rb - ra;
    return (ITEMS[a.item].name || '').localeCompare(ITEMS[b.item].name || '', 'zh-Hant');
  });
}
/* 重畫期間保住每一欄的捲動位置。依**出現順序**配對兩欄，
   欄數不變（永遠是左右各一），所以用索引對就夠了。 */
function keepListScroll(rootId, redraw) {
  const root = document.getElementById(rootId);
  const before = root ? Array.from(root.querySelectorAll('.wh-list')).map(el => el.scrollTop) : [];
  redraw();
  if (!root) return;
  Array.from(root.querySelectorAll('.wh-list')).forEach((el, i) => {
    if (before[i]) el.scrollTop = before[i];
  });
}

/* ---------------- 跨角色倉庫 UI ---------------- */
/* 倉庫做成「非阻斷浮動視窗」：外層鋪滿畫面但 pointer-events:none，
   只有中間的 frame 收事件。這樣戰鬥照跑、旁邊的分頁也照樣點得到，
   不像一般 modal 會把整個畫面鎖住。標題列可拖曳。 */
let whCategory = 'weapon';
let whSub = 'all';
let whSearch = '';
let whQty = '';          // 空字串＝整疊

function setWhCategory(c) { whCategory = c; whSub = 'all'; renderWarehouse(); }
function setWhSub(s) { whSub = s; renderWarehouse(); }
function setWhQty(v) { whQty = (v || '').trim(); }
function onWhSearch(v, ev) {
  if (imeComposing(ev)) return;          // 注音組字中不重畫，見 imeComposing()
  whSearch = (v || '').trim().toLowerCase();
  renderWarehouse();
  refocusSearch('wh-search');
}
// 數量欄留空＝整疊，否則取指定數量（夾在 1~持有數之間）
function whAmount(have) {
  const n = parseInt(whQty, 10);
  if (!whQty || isNaN(n) || n < 1) return have;
  return Math.min(n, have);
}
// 搬完把東西標在**對面那一欄**，重畫時它會排到最上面（#139）
function whDeposit(itemId, have) { depositToWarehouse(itemId, whAmount(have)); markListRecent('wh', itemId); renderWarehouse(); renderTopBar(); }
function whWithdraw(itemId, have) { withdrawFromWarehouse(itemId, whAmount(have)); markListRecent('bag', itemId); renderWarehouse(); renderTopBar(); }
// 個體裝備一次就是一件，沒有數量的問題
function whDepositInstance(instanceId) {
  const row = (state.inventory || []).find(r => r.instanceId === instanceId);
  depositInstanceToWarehouse(instanceId);
  if (row) markListRecent('wh', row.item);
  renderWarehouse(); renderTopBar();
}
function whWithdrawInstance(whInstanceId) {
  const row = (loadWarehouse().items || []).find(r => r.instanceId === whInstanceId);
  withdrawInstanceFromWarehouse(whInstanceId);
  if (row) markListRecent('bag', row.item);
  renderWarehouse(); renderTopBar();
}

function showWarehousePanel() { openWarehouse(); }

function openWarehouse() {
  let win = document.getElementById('warehouse-window');
  if (!win) {
    win = document.createElement('div');
    win.id = 'warehouse-window';
    win.className = 'wh-window';
    win.innerHTML = `<div id="warehouse-frame" class="wh-frame">
        <header id="warehouse-drag" class="wh-header">
          <div><h3>📦 倉庫</h3><span class="wh-sub">跨角色共用，所有存檔通用</span></div>
          <div class="wh-header-btns">
            <button class="btn-small ghost" onclick="exportWarehouse()" title="把倉庫匯出成 JSON 檔">匯出</button>
            <button class="btn-small ghost" onclick="importWarehouseFile()" title="從 JSON 檔匯入倉庫（會覆蓋目前倉庫）">匯入</button>
            <button class="btn-small ghost" onclick="closeWarehouse()">✕ 關閉</button>
          </div>
        </header>
        <div id="warehouse-body" class="wh-body"></div>
      </div>`;
    document.body.appendChild(win);
    makeDraggable(document.getElementById('warehouse-drag'), document.getElementById('warehouse-frame'));
  }
  win.classList.remove('hidden');
  renderWarehouse();
}
function closeWarehouse() {
  const win = document.getElementById('warehouse-window');
  if (win) win.classList.add('hidden');
}

/* ---------------- 倉庫匯出 / 匯入 ---------------- */
function exportWarehouse() {
  const raw = localStorage.getItem(WAREHOUSE_KEY);
  if (!raw) { showToast('⚠️ 倉庫是空的，沒有東西可匯出'); return; }
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const filename = `ro-idle-warehouse-${stamp}.json`;
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('📤 已匯出倉庫：' + filename);
}

let _whImportFileInput = null;
function importWarehouseFile() {
  const wh = loadWarehouse();
  if ((wh.items && wh.items.length) || (wh.gold || 0) > 0) {
    if (!confirm('目前倉庫裡有物品或鋅幣，匯入會覆蓋掉。確定嗎？')) return;
  }
  if (!_whImportFileInput) {
    _whImportFileInput = document.createElement('input');
    _whImportFileInput.type = 'file';
    _whImportFileInput.accept = '.json,application/json';
    _whImportFileInput.style.display = 'none';
    _whImportFileInput.addEventListener('change', onWarehouseImportChosen);
    document.body.appendChild(_whImportFileInput);
  }
  _whImportFileInput.value = '';
  _whImportFileInput.click();
}
function onWarehouseImportChosen(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let obj = null;
    try { obj = JSON.parse(reader.result); } catch (e) { showToast('⚠️ 檔案不是有效的 JSON'); return; }
    const res = importWarehouse(obj);
    showToast(res.ok ? '📥 倉庫匯入成功' : '⚠️ ' + res.msg);
    if (res.ok) renderWarehouse();
  };
  reader.readAsText(file);
}

/* ---------------- 全體備份（含倉庫）匯出 / 匯入 ---------------- */
function exportFullBackupFile() {
  const raw = JSON.stringify(buildFullBackup(), null, 2);
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const filename = `ro-idle-backup-${stamp}.json`;
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('📤 已匯出全體備份（含倉庫）：' + filename);
}

let _backupImportInput = null;
function importFullBackupFile() {
  if (!confirm('匯入會覆蓋所有存檔欄位與倉庫，確定嗎？')) return;
  if (!_backupImportInput) {
    _backupImportInput = document.createElement('input');
    _backupImportInput.type = 'file';
    _backupImportInput.accept = '.json,application/json';
    _backupImportInput.style.display = 'none';
    _backupImportInput.addEventListener('change', onBackupImportChosen);
    document.body.appendChild(_backupImportInput);
  }
  _backupImportInput.value = '';
  _backupImportInput.click();
}
function onBackupImportChosen(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let obj = null;
    try { obj = JSON.parse(reader.result); } catch (e) { showToast('⚠️ 檔案不是有效的 JSON'); return; }
    const res = importFullBackup(obj);
    showToast(res.ok
      ? `📥 全體備份匯入成功，寫入 ${res.wrote} 個欄位＋倉庫`
      : '⚠️ ' + res.msg);
    if (res.ok) renderSlotList();
  };
  reader.readAsText(file);
}

// 讓 handle 可以拖曳 frame；拖曳後改用 left/top 定位，所以要先解掉置中的 transform
function makeDraggable(handle, frame) {
  if (!handle || !frame) return;
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
  handle.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    const r = frame.getBoundingClientRect();
    frame.style.transform = 'none';
    frame.style.left = r.left + 'px';
    frame.style.top = r.top + 'px';
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const nx = Math.max(0, Math.min(window.innerWidth - 80, ox + e.clientX - sx));
    const ny = Math.max(0, Math.min(window.innerHeight - 40, oy + e.clientY - sy));
    frame.style.left = nx + 'px';
    frame.style.top = ny + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });
}

function renderWarehouse() {
  // 重畫會把 .wh-list 整塊換掉，捲動位置得自己接回來（#139）
  keepListScroll('warehouse-body', renderWarehouseInner);
}
function renderWarehouseInner() {
  const body = document.getElementById('warehouse-body');
  if (!body || !state) return;
  const wh = loadWarehouse();

  // 背包與倉庫共用同一套四分類與篩選
  const bagAll = state.inventory.filter(r => ITEMS[r.item]);
  const whAll = (wh.items || []).filter(r => ITEMS[r.item]);
  const inCat = list => list.filter(r => invCategoryOf(r.item) === whCategory);
  const applyFilters = (list, side) => {
    let out = inCat(list);
    if (whSub !== 'all') out = out.filter(r => invSubOf(r.item) === whSub);
    if (whSearch) out = out.filter(r => (ITEMS[r.item].name || '').toLowerCase().includes(whSearch));
    return sortRowsWithRecent(out, side);
  };
  const bagRows = applyFilters(bagAll, 'bag');
  const whRows = applyFilters(whAll, 'wh');

  const catCount = {};
  INV_CATEGORIES.forEach(c => { catCount[c.key] = 0; });
  bagAll.concat(whAll).forEach(r => { catCount[invCategoryOf(r.item)]++; });

  const subCount = {};
  inCat(bagAll).concat(inCat(whAll)).forEach(r => { const s = invSubOf(r.item); subCount[s] = (subCount[s] || 0) + 1; });
  const subKeys = Object.keys(subCount).sort((a, b) => subCount[b] - subCount[a]);

  const listHtml = (rows, side) => rows.length
    ? rows.map(r => {
        const d = ITEMS[r.item];
        const locked = side === 'bag' && isItemLocked(r.item);
        // 個體裝備：精煉度與卡片跟著這一件進出倉庫，不能走一般堆疊那條路
        if (r.instanceId) {
          const inst = side === 'bag' ? (state.instances || {})[r.instanceId] : r;
          if (!inst) return '';
          const refine = inst.refine || 0;
          const cards = inst.cards || [];
          const action = side === 'bag'
            ? `whDepositInstance('${r.instanceId}')`
            : `whWithdrawInstance('${r.instanceId}')`;
          return `<div class="wh-row" onclick="${action}">
            <img src="${itemImgSrc(r.item)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(d))}'">
            <span class="wh-row-name">${locked ? '🔒 ' : ''}${refine > 0 ? `+${refine} ` : ''}${getItemDisplayName(r.item)}${cards.length ? `　🃏${cards.length}` : ''}</span>
            <span class="wh-row-qty">×1</span>
          </div>`;
        }
        return `<div class="wh-row" onclick="${side === 'bag' ? `whDeposit('${r.item}',${r.qty})` : `whWithdraw('${r.item}',${r.qty})`}">
          <img src="${itemImgSrc(r.item)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(d))}'">
          <span class="wh-row-name">${locked ? '🔒 ' : ''}${getItemDisplayName(r.item)}</span>
          <span class="wh-row-qty">×${r.qty}</span>
        </div>`;
      }).join('')
    : `<div class="empty-hint">這個分類${side === 'bag' ? '背包' : '倉庫'}沒有東西。</div>`;

  body.innerHTML = `
    <div class="wh-hint">點背包物品＝存入　▶　　◀　點倉庫物品＝取出。數量欄留空＝整疊全部。</div>

    <div class="wh-gold">
      <span>鋅幣　背包 <b>${state.gold.toLocaleString()}</b>　倉庫 <b>${(wh.gold || 0).toLocaleString()}</b></span>
      <input type="number" id="wh-gold-amount" min="1" placeholder="金額" class="wh-gold-input">
      <button class="btn-small" onclick="depositGoldToWarehouse(document.getElementById('wh-gold-amount').value);renderWarehouse();renderTopBar();">存入 ▶</button>
      <button class="btn-small" onclick="withdrawGoldFromWarehouse(document.getElementById('wh-gold-amount').value);renderWarehouse();renderTopBar();">◀ 取出</button>
      <button class="btn-small ghost" onclick="depositGoldToWarehouse(state.gold);renderWarehouse();renderTopBar();">📥 全部</button>
      <button class="btn-small ghost" onclick="withdrawGoldFromWarehouse(loadWarehouse().gold||0);renderWarehouse();renderTopBar();">📤 全部</button>
    </div>

    <div class="inv-cats">${INV_CATEGORIES.map(c =>
      `<button class="btn-small ${whCategory === c.key ? 'active' : ''}" onclick="setWhCategory('${c.key}')">${c.icon} ${c.name} <span class="inv-cat-n">${catCount[c.key]}</span></button>`
    ).join('')}</div>

    <div class="wh-toolbar">
      <input id="wh-search" class="codex-search" type="text" placeholder="🔍 搜尋名稱…（存入取出共用）"
        value="${whSearch.replace(/"/g, '&quot;')}" oninput="onWhSearch(this.value, event)">
      <label class="wh-qty-label">數量 <input type="number" min="1" class="wh-qty" value="${whQty}" placeholder="全部" oninput="setWhQty(this.value)"></label>
    </div>

    ${subKeys.length > 1 ? `<div class="inv-subs">
      <button class="btn-chip ${whSub === 'all' ? 'active' : ''}" onclick="setWhSub('all')">全部</button>
      ${subKeys.map(s => `<button class="btn-chip ${whSub === s ? 'active' : ''}" onclick="setWhSub('${s}')">${invSubLabel(whCategory, s)} ${subCount[s]}</button>`).join('')}
    </div>` : ''}

    <div class="wh-cols">
      <div class="wh-col">
        <div class="wh-col-head">背包（點擊存入 ▶）</div>
        <div class="wh-list">${listHtml(bagRows, 'bag')}</div>
      </div>
      <div class="wh-col">
        <div class="wh-col-head">倉庫（點擊取出 ◀）　${whAll.length} 種</div>
        <div class="wh-list">${listHtml(whRows, 'wh')}</div>
      </div>
    </div>`;
}

/* ---------------- 自動販賣 UI ---------------- */
/* 跟倉庫同一套「非阻斷浮動視窗」：外層 pointer-events:none、中間 frame 收事件，
   掛機照跑、分頁照點。左邊＝不會被自動賣的道具，右邊＝要自動賣的道具。
   點左邊 → 移去右邊（開始自動賣）；點右邊 → 移回左邊（不再自動賣）。 */
let asCategory = 'all';
let asSearch = '';
function setAsCategory(c) { asCategory = c; renderAutoSellWindow(); }
function onAsSearch(v, ev) {
  if (imeComposing(ev)) return;
  asSearch = (v || '').trim().toLowerCase();
  renderAutoSellWindow();
  refocusSearch('as-search');
}
// 把道具移進「要自動賣」（點左邊那格）
function asAdd(itemId) {
  if (isItemLocked(itemId)) { showToast('🔒 已鎖定，無法加入自動販賣。'); return; }
  toggleAutoSellItem(itemId);
  markListRecent('right', itemId);      // 剛移過去的排到右欄最上面（#139）
  renderAutoSellWindow();
}
// 把道具移出「要自動賣」（點右邊那格）
function asRemove(itemId) { toggleAutoSellItem(itemId); markListRecent('left', itemId); renderAutoSellWindow(); }
// 取消全部自動賣：清空清單
function asClearAll() {
  if (!state.autoSellConfig) state.autoSellConfig = { enabled: false, items: [] };
  state.autoSellConfig.items = [];
  saveGame();
  renderAutoSellWindow();
}
// 一鍵全加入：把當前篩選的左邊全部移去右邊
function asAddAll() {
  if (!state.autoSellConfig) state.autoSellConfig = { enabled: false, items: [] };
  const cfg = state.autoSellConfig;
  const all = state.inventory.filter(r => !r.instanceId && ITEMS[r.item] && (ITEMS[r.item].sell || 0) > 0);
  let left = all.filter(r => !cfg.items.includes(r.item) && !isItemLocked(r.item));
  if (asCategory !== 'all') left = left.filter(r => invCategoryOf(r.item) === asCategory);
  if (asSearch) left = left.filter(r => (ITEMS[r.item].name || '').toLowerCase().includes(asSearch));
  if (!left.length) { showToast('沒有可加入的道具'); return; }
  left.forEach(r => { if (!cfg.items.includes(r.item)) cfg.items.push(r.item); });
  saveGame();
  renderAutoSellWindow();
  showToast(`已加入 ${left.length} 樣到自動販賣`);
}

function showAutoSellWindow() {
  let win = document.getElementById('autosell-window');
  if (!win) {
    win = document.createElement('div');
    win.id = 'autosell-window';
    win.className = 'wh-window';
    win.innerHTML = `<div id="autosell-frame" class="wh-frame">
        <header id="autosell-drag" class="wh-header">
          <div><h3>🏷️ 自動販賣</h3><span class="wh-sub">左邊不會賣，點一下移右邊＝開始自動賣（每30秒）</span></div>
          <div class="wh-header-btns">
            <button class="btn-small ghost" onclick="showAutoSellSyncWindow()" title="從別的存檔抄一份清單過來">⇄ 同步清單</button>
            <button class="btn-small ghost" onclick="runAutoSellNow();renderAutoSellWindow();renderTopBar();" title="立即賣出右邊選定道具">立即賣出</button>
            <button class="btn-small ghost" onclick="closeAutoSellWindow()">✕ 關閉</button>
          </div>
        </header>
        <div id="autosell-body" class="wh-body"></div>
      </div>`;
    document.body.appendChild(win);
    makeDraggable(document.getElementById('autosell-drag'), document.getElementById('autosell-frame'));
  }
  win.classList.remove('hidden');
  renderAutoSellWindow();
}
function closeAutoSellWindow() {
  const win = document.getElementById('autosell-window');
  if (win) win.classList.add('hidden');
  closeAutoSellSyncWindow();          // 子視窗不能留在畫面上（#140）
}

/* ---- 同步別的存檔的清單（#140）----
   做成**獨立的小浮動視窗**，而不是塞進自動販賣的 body：
   body 每點一次道具就整塊重畫，塞進去的話點一下道具選單就消失了。 */
function showAutoSellSyncWindow() {
  let win = document.getElementById('assync-window');
  if (!win) {
    win = document.createElement('div');
    win.id = 'assync-window';
    win.className = 'wh-window assync-window';
    win.innerHTML = `<div id="assync-frame" class="wh-frame assync-frame">
        <header id="assync-drag" class="wh-header">
          <div><h3>⇄ 同步自動販賣清單</h3><span class="wh-sub">從別的存檔抄一份過來</span></div>
          <div class="wh-header-btns">
            <button class="btn-small ghost" onclick="closeAutoSellSyncWindow()">✕ 關閉</button>
          </div>
        </header>
        <div id="assync-body" class="wh-body"></div>
      </div>`;
    document.body.appendChild(win);
    makeDraggable(document.getElementById('assync-drag'), document.getElementById('assync-frame'));
  }
  win.classList.remove('hidden');
  renderAutoSellSyncWindow();
}
function closeAutoSellSyncWindow() {
  const win = document.getElementById('assync-window');
  if (win) win.classList.add('hidden');
}
function renderAutoSellSyncWindow() {
  const body = document.getElementById('assync-body');
  if (!body || !state) return;
  const list = autoSellSyncCandidates();
  const cur = (state.autoSellConfig && state.autoSellConfig.items) ? state.autoSellConfig.items.length : 0;
  const rows = list.map(c => `
      <div class="assync-row">
        <span class="assync-who">${c.jobIcon} ${c.name}
          <span class="assync-sub">${c.jobName}・Lv${c.baseLevel}</span></span>
        <span class="assync-n">${c.count} 種</span>
        <span class="assync-btns">
          <button class="btn-small" ${c.count ? '' : 'disabled'}
            onclick="doAutoSellSync('${c.slot}','merge')" title="保留目前選好的，只補上他有你沒有的">合併</button>
          <button class="btn-small ghost" ${c.count ? '' : 'disabled'}
            onclick="doAutoSellSync('${c.slot}','replace')" title="整份換成他的">覆蓋</button>
        </span>
      </div>`).join('');
  body.innerHTML = `
    <div class="wh-hint">自動販賣清單<b>每個角色各一份</b>（補師要留的紅水，打手只是負重）。
      這裡可以把別的存檔那份抄過來。<br>
      目前這個角色選了 <b>${cur}</b> 種；<b>已鎖定的道具不會被抄進來</b>。</div>
    ${list.length ? `<div class="assync-list">${rows}</div>`
      : '<div class="empty-hint">其他存檔格裡沒有角色。</div>'}`;
}
function doAutoSellSync(slot, mode) {
  if (mode === 'replace') {
    const c = autoSellSyncCandidates().find(x => x.slot === String(slot));
    const cur = (state.autoSellConfig && state.autoSellConfig.items) ? state.autoSellConfig.items.length : 0;
    if (!confirm(`要用「${c ? c.name : '存檔' + slot}」的清單覆蓋嗎？

`
      + `⚠️ 目前選好的 ${cur} 種會被整份換掉（無法復原）。`)) return;
  }
  if (!syncAutoSellFrom(String(slot), mode)) return;
  closeAutoSellSyncWindow();
  renderAutoSellWindow();
  renderTopBar();
}

function renderAutoSellWindow() {
  keepListScroll('autosell-body', renderAutoSellWindowInner);   // 同倉庫（#139）
}
function renderAutoSellWindowInner() {
  const body = document.getElementById('autosell-body');
  if (!body || !state) return;
  if (!state.autoSellConfig) state.autoSellConfig = { enabled: false, items: [] };
  const cfg = state.autoSellConfig;
  const readyIn = Math.max(0, Math.ceil(((state.autoSellReadyAt || 0) - Date.now()) / 1000));

  // 左邊：背包裡可賣、而且**不在**自動賣清單的道具（還留著）
  const all = state.inventory.filter(r => !r.instanceId && ITEMS[r.item] && (ITEMS[r.item].sell || 0) > 0);
  const left = all.filter(r => !cfg.items.includes(r.item));
  /* 右邊＝自動賣清單的「紀錄」：就算已經賣光、背包暫時沒有，也照樣列著，
     之後再打到就會被自動賣掉。點一下才移回左邊（取消自動賣）。 */
  const right = cfg.items
    .map(id => ({ item: id, qty: (state.inventory.find(r => r.item === id && !r.instanceId) || {}).qty || 0 }))
    .filter(r => ITEMS[r.item] && (ITEMS[r.item].sell || 0) > 0);
  const inCat = list => asCategory === 'all' ? list
    : list.filter(r => invCategoryOf(r.item) === asCategory);
  const apply = (list, side) => {
    let out = inCat(list);
    if (asSearch) out = out.filter(r => (ITEMS[r.item].name || '').toLowerCase().includes(asSearch));
    return sortRowsWithRecent(out, side);
  };

  const listHtml = (rows, side) => rows.length
    ? rows.map(r => {
        const d = ITEMS[r.item];
        const locked = side === 'left' && isItemLocked(r.item);
        const action = side === 'left' ? `asAdd('${r.item}')` : `asRemove('${r.item}')`;
        const hint = side === 'left' ? (locked ? '（已鎖定）' : '＋') : '✕';
        const qtyText = side === 'right' && r.qty <= 0 ? '已售完' : `×${r.qty}`;
        return `<div class="wh-row" onclick="${action}" title="${side === 'left' ? '點一下＝移去右邊開始自動賣' : '點一下＝移回左邊不再自動賣'}">
          <img src="${itemImgSrc(r.item)}" onerror="this.onerror=null;this.src='${placeholderImgSrc(itemPlaceholderKind(d))}'">
          <span class="wh-row-name">${locked ? '🔒 ' : ''}${getItemDisplayName(r.item)}</span>
          <span class="wh-row-qty">${qtyText}　<span style="color:var(--ink-dim)">${hint}</span></span>
        </div>`;
      }).join('')
    : `<div class="empty-hint">${side === 'left' ? '左邊沒有可留的道具。' : '右邊沒有要自動賣的道具。'}</div>`;

  const catCount = {};
  INV_CATEGORIES.forEach(c => { catCount[c.key] = 0; });
  all.forEach(r => { catCount[invCategoryOf(r.item)]++; });

  body.innerHTML = `
    <div class="card-row" style="margin-bottom:8px">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink)">
        <input type="checkbox" ${cfg.enabled ? 'checked' : ''} onchange="setAutoSellEnabled(this.checked);renderAutoSellWindow();">
        啟用自動販賣 ${cfg.enabled ? `（下次 ${readyIn}s）` : '（尚未啟用）'}
      </label>
    </div>

    <div class="inv-cats">
      <button class="btn-small ${asCategory === 'all' ? 'active' : ''}" onclick="setAsCategory('all')">全部 <span class="inv-cat-n">${all.length}</span></button>
      ${INV_CATEGORIES.filter(c => catCount[c.key] > 0).map(c =>
        `<button class="btn-small ${asCategory === c.key ? 'active' : ''}" onclick="setAsCategory('${c.key}')">${c.icon} ${c.name} <span class="inv-cat-n">${catCount[c.key]}</span></button>`
      ).join('')}
    </div>

    <div class="wh-toolbar">
      <input id="as-search" class="codex-search" type="text" placeholder="🔍 搜尋名稱…"
        value="${asSearch.replace(/"/g, '&quot;')}" oninput="onAsSearch(this.value, event)">
    </div>

    <div class="wh-cols">
      <div class="wh-col">
        <div class="wh-col-head">不會自動賣（點一下移右邊 ▶）　${left.length} ${apply(left,'left').length ? `<button class="btn-small ghost" style="float:right" onclick="asAddAll()">一鍵全加入</button>` : ''}</div>
        <div class="wh-list">${listHtml(apply(left, 'left'), 'left')}</div>
      </div>
      <div class="wh-col">
        <div class="wh-col-head">要自動賣（點一下移回左邊 ✕）
          ${right.length ? `<button class="btn-small ghost" style="float:right" onclick="asClearAll()">取消全部</button>` : ''}　${right.length} 種</div>
        <div class="wh-list">${listHtml(apply(right, 'right'), 'right')}</div>
      </div>
    </div>
  `;
}

/* ---------------- 卡片系統 UI ---------------- */
// 拔卡會毀掉裝備，所以確認訊息要把代價講清楚，不能只問「確定移除嗎」
function doRemoveCard(slotKey) {
  const cards = getEquippedCards(slotKey);
  if (!cards.length) return;
  const equipId = getEquipBaseItemId(slotKey);
  const equipName = equipId && ITEMS[equipId] ? getItemDisplayName(equipId) : '裝備';
  const cardNames = cards.map(id => CARDS[id] ? CARDS[id].name : id).join('、');
  const msg = `要從「${equipName}」取出卡片嗎？\n\n`
    + `✅ 取回：${cardNames}\n`
    + `❌ 損毀：${equipName}（含精煉度，無法復原）`;
  if (confirm(msg)) {
    removeCard(slotKey);
    refreshEquipViews();
    renderTopBar();
  }
}

// 背包裡那件個體裝備的拆卸，代價跟身上那件一樣：裝備銷毀換回卡片
function doDestroyInstance(instanceId) {
  const inst = state.instances ? state.instances[instanceId] : null;
  if (!inst || !inst.cards || !inst.cards.length) return;
  const equipName = ITEMS[inst.item] ? getItemDisplayName(inst.item) : '裝備';
  const cardNames = inst.cards.map(id => CARDS[id] ? CARDS[id].name : id).join('、');
  const msg = `要拆卸「${inst.refine > 0 ? '+' + inst.refine + ' ' : ''}${equipName}」取回卡片嗎？\n\n`
    + `✅ 取回：${cardNames}\n`
    + `❌ 損毀：${equipName}（含精煉度，無法復原）`;
  if (confirm(msg)) {
    destroyInstanceForCards(instanceId);
    refreshEquipViews();
    renderTopBar();
  }
}

// 插卡入口在裝備欄上，而裝備欄住在「裝備」分頁，所以這個選單也畫在那裡
function showCardSelect(slotKey) {
  const el = document.getElementById('tab-equip');
  if (!el) return;
  hideEquipTooltip();

  const equipId = getEquipBaseItemId(slotKey);
  const equipName = equipId && ITEMS[equipId] ? getItemDisplayName(equipId) : '（無裝備）';
  const maxSlots = getEquipCardSlots(slotKey);
  const used = getEquippedCards(slotKey);

  // 只列出這個部位真的插得進去的卡片
  const availableCards = state.inventory
    .filter(row => !row.instanceId && CARDS[row.item] && row.qty > 0)
    .map(row => ({ cardId: row.item, qty: row.qty, card: CARDS[row.item] }))
    .filter(c => cardFitsSlot(c.card, slotKey));

  let html = `<h3 class="panel-title">🃏 ${equipName}　插槽 ${used.length}/${maxSlots}</h3>`;
  html += `<button class="btn-small" onclick="renderEquipTab()">← 返回裝備欄</button>`;

  if (used.length) {
    html += '<div class="codex-detail-sec">已插入</div><div class="card-list">';
    used.forEach(id => {
      const c = CARDS[id];
      html += `<div class="card-row inserted">
        <div class="card-info">
          <span class="card-icon">${c.icon}</span>
          <div class="card-details">
            <span class="card-name">${c.name}</span>
            <span class="card-desc">${c.desc}</span>
          </div>
        </div>
      </div>`;
    });
    html += '</div>';
    html += `<div class="card-warn">⚠️ 取出卡片會讓 ${equipName} 損毀。要取出請回上一頁點「取出卡片」。</div>`;
  }

  if (used.length >= maxSlots) {
    html += `<div class="empty-hint">插槽已滿（${maxSlots}/${maxSlots}）。</div>`;
  } else if (availableCards.length === 0) {
    html += `<div class="empty-hint">背包裡沒有能插在這個部位的卡片。</div>`;
  } else {
    html += '<div class="codex-detail-sec">可插入</div><div class="card-list">';
    availableCards.forEach(c => {
      html += `<div class="card-row">
        <div class="card-info">
          <span class="card-icon">${c.card.icon}</span>
          <div class="card-details">
            <span class="card-name">${c.card.name} x${c.qty}</span>
            <span class="card-desc">${c.card.desc}</span>
          </div>
        </div>
        <button class="btn-small" onclick="insertCard('${slotKey}','${c.cardId}');showCardSelect('${slotKey}');">插卡</button>
      </div>`;
    });
    html += '</div>';
  }

  el.innerHTML = html;
}
