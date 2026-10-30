// 世界頻道：掛在戰鬥訊息欄「世界」分頁，協議見 client/world-chat.js
import { createWorldChat } from './client/world-chat.js';

const WORLD_CHAT_BASE = 'https://world-chat.oq-ro-idle.workers.dev';
const TURNSTILE_SITE_KEY = '0x4AAAAAAFqwdmZg7-wjGQnZ';
const LOG_BOTTOM_SLACK = 24;

const STATUS_TEXT = {
  idle: '未進入',
  connecting: '連線中…',
  connected: '已連線',
  reconnecting: '重新連線中…',
  paused: '背景暫停',
  stopped: '已中斷',
  'closed-today': '今日已關閉',
};

function phaseOverlayText(st, hint) {
  if (hint) return hint;
  return STATUS_TEXT[st] || st || '';
}

function isChatPending(st) {
  return st === 'connecting' || st === 'reconnecting' || st === 'paused' || st === 'closed-today';
}

function getPlayerName() {
  if (typeof state !== 'undefined' && state && state.name) return state.name;
  return '冒險者';
}

function chatIdentityStore() {
  return {
    load() {
      try {
        if (typeof state !== 'undefined' && state && state.chatIdentity) return state.chatIdentity;
        return localStorage.getItem('worldchat.identity');
      } catch {
        return null;
      }
    },
    save(value) {
      try {
        if (typeof state !== 'undefined' && state) {
          if (value) state.chatIdentity = value;
          else delete state.chatIdentity;
          if (typeof saveGameThrottled === 'function') saveGameThrottled();
        }
        if (value) localStorage.setItem('worldchat.identity', value);
        else localStorage.removeItem('worldchat.identity');
      } catch { /* ignore */ }
    },
  };
}

function formatChatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderChatLine(m) {
  const row = document.createElement('div');
  row.className = 'log-line world-chat-line';

  const prefix = document.createElement('span');
  prefix.className = 'world-chat-time';
  prefix.textContent = `[${formatChatTime(m.timestamp)}] `;

  const name = document.createElement('span');
  name.className = 'world-chat-name';
  name.textContent = m.playerName;
  if (m.playerId) name.title = `#${m.playerId.slice(0, 4).toUpperCase()}`;

  const body = document.createElement('span');
  body.className = 'world-chat-text';
  body.textContent = `：${m.message}`;

  row.append(prefix, name, body);
  return row;
}

function updateHudWorldOnline(chat) {
  const el = document.getElementById('hud-world-online');
  if (!el) return;
  const st = chat.status;
  if (st === 'connected' && chat.online != null) {
    el.hidden = false;
    el.textContent = `線上 ${chat.online} 人`;
    el.dataset.status = 'connected';
    return;
  }
  if (st === 'connecting' || st === 'reconnecting' || st === 'paused') {
    el.hidden = false;
    el.textContent = STATUS_TEXT[st] || st;
    el.dataset.status = st;
    return;
  }
  el.hidden = true;
  el.textContent = '';
  el.dataset.status = '';
}

function mountWorldChatLog(root, chat) {
  let msgStuck = true;
  let lastMessages = [];

  const syncPauseBar = () => {
    const bar = document.getElementById('log-paused-world');
    if (bar) bar.classList.toggle('hidden', msgStuck !== false);
  };

  const paintMessages = (messages, scrollBottom) => {
    lastMessages = messages;
    const list = root.querySelector('.world-chat-msg-list');
    const scroller = root.querySelector('.world-chat-msgs');
    if (!list || !scroller) return;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= LOG_BOTTOM_SLACK;
    list.replaceChildren(...messages.map(renderChatLine));
    if (scrollBottom && (msgStuck !== false || nearBottom)) scroller.scrollTop = scroller.scrollHeight;
  };

  root.innerHTML = `
    <div class="world-chat-msgs-wrap">
      <div class="world-chat-msgs log-pane-body">
        <div class="world-chat-msg-list"></div>
      </div>
      <div class="world-chat-join-overlay" hidden>
        <button type="button" class="btn-small world-chat-join">進入聊天室</button>
        <p class="world-chat-phase-status" hidden></p>
      </div>
    </div>
    <div class="world-chat-turnstile"></div>
    <div class="world-chat-notice log-line" hidden></div>
    <form class="world-chat-form chat-input-row" hidden>
      <input type="text" class="world-chat-input" maxlength="200" placeholder="輸入訊息…" autocomplete="off">
      <button type="submit" class="btn-small">送出</button>
    </form>
  `;

  const scroller = root.querySelector('.world-chat-msgs');
  const joinOverlay = root.querySelector('.world-chat-join-overlay');
  const joinBtn = root.querySelector('.world-chat-join');
  const phaseStatusEl = root.querySelector('.world-chat-phase-status');
  const noticeEl = root.querySelector('.world-chat-notice');
  const form = root.querySelector('.world-chat-form');
  const input = root.querySelector('.world-chat-input');

  let phaseHint = '';

  chat.turnstileContainer = root.querySelector('.world-chat-turnstile');

  scroller.addEventListener('scroll', () => {
    const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= LOG_BOTTOM_SLACK;
    msgStuck = atBottom;
    syncPauseBar();
  }, { passive: true });

  joinBtn.onclick = () => {
    noticeEl.hidden = true;
    phaseHint = '';
    chat.start(getPlayerName());
    syncPhaseOverlay(chat.status);
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    if (chat.send(input.value)) input.value = '';
  };

  chat.on('messages', (messages) => {
    if (msgStuck === false) {
      lastMessages = messages;
      return;
    }
    paintMessages(messages, true);
  });

  const syncPhaseOverlay = (st) => {
    const connected = st === 'connected';
    const showJoin = st === 'idle' || st === 'stopped';
    const pending = isChatPending(st);

    form.hidden = !connected;

    if (connected) {
      joinOverlay.hidden = true;
      joinBtn.hidden = true;
      phaseStatusEl.hidden = true;
      return;
    }

    if (showJoin) {
      joinOverlay.hidden = false;
      joinBtn.hidden = false;
      phaseStatusEl.hidden = true;
      phaseStatusEl.textContent = '';
      phaseStatusEl.dataset.status = '';
      return;
    }

    joinOverlay.hidden = false;
    joinBtn.hidden = true;
    const msg = phaseOverlayText(st, phaseHint);
    phaseStatusEl.textContent = msg;
    phaseStatusEl.dataset.status = pending ? st : '';
    phaseStatusEl.hidden = !msg;
  };

  chat.on('status', (st) => {
    if (st === 'connected' || st === 'idle') phaseHint = '';
    syncPhaseOverlay(st);
    updateHudWorldOnline(chat);
  });

  chat.on('presence', () => updateHudWorldOnline(chat));

  chat.on('notice', ({ text }) => {
    noticeEl.textContent = text;
    noticeEl.hidden = false;
    clearTimeout(noticeEl._timer);
    noticeEl._timer = setTimeout(() => { noticeEl.hidden = true; }, 6000);
    if (chat.status !== 'connected' && chat.status !== 'idle') {
      phaseHint = text;
      syncPhaseOverlay(chat.status);
    }
  });

  syncPhaseOverlay(chat.status);
  updateHudWorldOnline(chat);

  window._worldChatOnTabShown = () => {};

  window.resumeWorldChatLog = () => {
    msgStuck = true;
    syncPauseBar();
    paintMessages(lastMessages.length ? lastMessages : chat.messages, true);
  };
}

/** 換存檔欄或更名後：若仍在聊天中，用目前 state 重連（仍只會有一條 WebSocket） */
export function syncWorldChatPlayer() {
  const chat = window._worldChat;
  if (!chat) return;
  const st = chat.status;
  if (st === 'idle' || st === 'stopped') return;
  chat.start(getPlayerName());
}

export function initWorldChatLog() {
  const root = document.getElementById('world-chat-root');
  if (!root || location.protocol === 'file:') return;

  const chat = createWorldChat({
    baseUrl: WORLD_CHAT_BASE,
    turnstileSiteKey: TURNSTILE_SITE_KEY,
    identityStore: chatIdentityStore(),
  });
  mountWorldChatLog(root, chat);
  window._worldChat = chat;
  window.syncWorldChatPlayer = syncWorldChatPlayer;
}
