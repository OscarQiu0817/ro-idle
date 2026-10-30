// World Chat client：遊戲端串接用的協議邏輯（不碰畫面）。
//
// 用法：
//   import { createWorldChat } from "./world-chat.js";
//   const chat = createWorldChat({ baseUrl, turnstileSiteKey, turnstileContainer });
//   chat.on("messages", (list) => 重畫訊息列表);
//   chat.start("角色名稱");     // 玩家第一次打開聊天視窗時呼叫（新玩家才會跑 Turnstile）
//   chat.send("Hello");
//
// 協議規則（心跳、重連、背景斷線、去重排序、session 續期、熔斷）都處理好了，
// 細節見 docs/API.md。畫面完全交給呼叫端（或用 world-chat-ui.js）。

const PING_INTERVAL = 50_000;         // 每 50 秒送一次心跳
const PONG_TIMEOUT = 10_000;          // 送出心跳 10 秒內沒回應就當作斷線
const HIDDEN_TIMEOUT = 180_000;       // 分頁在背景超過 3 分鐘就主動斷線
const FULL_RETRY_DELAY = 60_000;      // 客滿或 IP 連線太頻繁時，60 秒後再試
const SESSION_REFRESH_MARGIN = 60_000; // session 剩不到 1 分鐘就先換新的
const MAX_MESSAGES = 200;             // 畫面上最多保留幾則
const IDENTITY_KEY = "worldchat.identity";

// 預設的提示文字（遊戲端可以用 notice 事件的 code 自己換掉）
const NOTICE_TEXT = {
  INVALID_INPUT: "訊息無法送出",
  RATE_LIMITED: "發送太頻繁，請稍後再試",
  SERVER_FULL: "聊天室已滿，稍後自動重試",
  CHALLENGE_FAILED: "人機驗證失敗，請再試一次",
  BANNED: "你已被禁止使用聊天室",
  NAME_INVALID: "角色名稱無法用於聊天室",
  KICKED: "連線已中斷，請重新進入聊天室",
};

/**
 * @param {object} options
 * @param {string} options.baseUrl            聊天 server，例如 "https://world-chat.xxx.workers.dev"
 * @param {string} options.turnstileSiteKey  Turnstile 的 site key（公開值）
 * @param {string|HTMLElement} [options.turnstileContainer]  需要人機驗證時放 widget 的位置（通常在聊天面板裡；
 *        用 world-chat-ui.js 的話會自動設定）
 * @param {{load(): string|null, save(value: string|null): void}} [options.identityStore]
 *        identity 的存放方式。預設 localStorage；建議同時存進遊戲存檔，玩家匯出匯入存檔時才不會變成新玩家
 */
export function createWorldChat(options) {
  const { baseUrl, turnstileSiteKey } = options;
  let turnstileContainer = options.turnstileContainer; // 也可以之後再設定（例如由 UI 面板指定）
  const identityStore = options.identityStore ?? localStorageStore(IDENTITY_KEY);
  const wsBase = baseUrl.replace(/^http/, "ws");

  const listeners = {};
  const emit = (type, payload) => (listeners[type] ?? []).forEach((fn) => fn(payload));

  let ws = null;
  let session = null;          // { token, expiresAt, playerId, playerName }
  let playerName = null;
  let active = false;          // 玩家想保持連線嗎（被踢、手動離開後為 false）
  let connectGen = 0;          // 每次 connect / disconnect 加 1，非同步回來時判斷是否已過時
  let retryDelay = 1000;
  let retryTimer = null;
  let hiddenTimer = null;
  let pausedInBackground = false;
  let lastTimestamp = null;    // 收到的最新訊息時間，重連時帶 ?since= 只補漏掉的
  let reopenAt = null;         // 今日額度用完時的重新開放時間
  let status = "idle";
  let online = null;
  const seenIds = new Set();
  const messages = [];         // 依 timestamp 排序、已去重

  function setStatus(next) {
    if (status === next) return;
    status = next;
    emit("status", status);
  }

  function notice(code, text) {
    emit("notice", { code, text: text ?? NOTICE_TEXT[code] ?? "發生錯誤" });
  }

  // 去重、依時間插入正確位置（歷史紀錄可能比即時訊息晚到）
  function addMessages(list) {
    let changed = false;
    for (const m of list) {
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);
      if (lastTimestamp === null || m.timestamp > lastTimestamp) lastTimestamp = m.timestamp;
      let i = messages.length;
      while (i > 0 && messages[i - 1].timestamp > m.timestamp) i--;
      messages.splice(i, 0, m);
      changed = true;
    }
    if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
    if (changed) emit("messages", messages);
  }

  async function requestSession() {
    const identity = identityStore.load();
    const body = identity
      ? { name: playerName, identity }
      : { name: playerName, turnstile: await getTurnstileToken(turnstileSiteKey, turnstileContainer) };
    const res = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ error: "NETWORK" }));
    if (data.error === "INVALID_IDENTITY") {
      identityStore.save(null); // identity 失效：改以新玩家身份申請
      return requestSession();
    }
    if (!res.ok) throw new Error(data.error ?? "NETWORK");
    identityStore.save(data.identity);
    return data;
  }

  function scheduleRetry(delay) {
    setStatus("reconnecting");
    retryTimer = setTimeout(connect, delay);
  }

  async function connect() {
    clearTimeout(retryTimer);
    retryTimer = null;
    if (!active) return;
    const gen = ++connectGen;
    setStatus("connecting");

    if (!session || Date.now() > session.expiresAt - SESSION_REFRESH_MARGIN) {
      try {
        session = await requestSession();
      } catch (err) {
        if (gen !== connectGen) return;
        const code = err.message === "INVALID_INPUT" ? "NAME_INVALID" : err.message;
        if (["NAME_INVALID", "CHALLENGE_FAILED", "BANNED"].includes(code)) {
          // 重試也不會成功：停下來，等玩家處理
          active = false;
          setStatus("stopped");
          notice(code);
          return;
        }
        scheduleRetry(retryDelay); // RATE_LIMITED 或網路錯誤：退避重試
        retryDelay = Math.min(retryDelay * 2, 30_000);
        return;
      }
      if (gen !== connectGen) return;
    }

    let url = `${wsBase}/chat?token=${encodeURIComponent(session.token)}`;
    if (lastTimestamp !== null) url += `&since=${lastTimestamp}`;
    const socket = new WebSocket(url);
    ws = socket;
    let pingTimer = null;
    let pongTimer = null; // 計時器跟著這條連線走，舊連線關閉時不會清到新連線的

    socket.onopen = () => {
      pingTimer = setInterval(() => {
        socket.send("ping");
        pongTimer = setTimeout(() => socket.close(), PONG_TIMEOUT);
      }, PING_INTERVAL);
    };

    socket.onmessage = (ev) => {
      if (ev.data === "pong") return clearTimeout(pongTimer);
      const data = JSON.parse(ev.data);
      switch (data.type) {
        case "welcome":
          retryDelay = 1000;
          online = data.online;
          setStatus("connected");
          emit("welcome", data); // { playerId, playerName, online }
          break;
        case "chat":
          addMessages([data]);
          break;
        case "history":
          addMessages(data.messages);
          break;
        case "presence":
          online = data.online;
          emit("presence", online);
          break;
        case "error":
          notice(data.code);
          break;
        case "system":
          if (data.code === "CHAT_DAILY_LIMIT") reopenAt = data.resetAt;
          notice(data.code, data.message);
          break;
        // 不認得的 type 忽略
      }
    };

    socket.onclose = (ev) => {
      clearInterval(pingTimer);
      clearTimeout(pongTimer);
      if (ws !== socket) return; // 已被換掉的舊連線
      ws = null;

      if (ev.code === 1008) {
        active = false; // 被踢或 token 無效：不自動重連
        setStatus("stopped");
        notice("KICKED");
      } else if (ev.code === 4001) {
        session = null; // session 過期：換新的立刻重連
        connect();
      } else if (ev.code === 4002) {
        // 今日額度用完：等到重新開放時間，加 0–60 秒隨機延遲避免大家同時湧入
        const wait = Math.max(0, (reopenAt ?? Date.now() + 3_600_000) - Date.now()) + Math.random() * 60_000;
        setStatus("closed-today");
        retryTimer = setTimeout(connect, wait);
      } else if (ev.code === 1013) {
        scheduleRetry(FULL_RETRY_DELAY);
      } else {
        scheduleRetry(retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      }
    };
  }

  function disconnect() {
    clearTimeout(retryTimer);
    retryTimer = null;
    active = false;
    connectGen++;
    const old = ws;
    ws = null;
    if (old) old.close(1000);
  }

  // 分頁切到背景 3 分鐘就斷線、切回來再連
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenTimer = setTimeout(() => {
        if (!active) return;
        disconnect();
        pausedInBackground = true;
        setStatus("paused");
      }, HIDDEN_TIMEOUT);
    } else {
      clearTimeout(hiddenTimer);
      if (pausedInBackground) {
        pausedInBackground = false;
        active = true;
        retryDelay = 1000;
        connect();
      }
    }
  });

  return {
    /** 訂閱事件：messages / status / notice / welcome / presence（線上人數）。回傳取消訂閱的函式 */
    on(type, fn) {
      (listeners[type] ??= []).push(fn);
      return () => (listeners[type] = listeners[type].filter((f) => f !== fn));
    },
    /** 進入聊天室（或角色改名後重新進入）。新玩家第一次會跑 Turnstile */
    start(name) {
      disconnect();
      pausedInBackground = false;
      if (name !== playerName) session = null; // 改名要重新申請 session（playerId 不變）
      playerName = name;
      active = true;
      retryDelay = 1000;
      connect();
    },
    /** 離開聊天室 */
    stop() {
      disconnect();
      pausedInBackground = false;
      setStatus("idle");
    },
    /** 發送訊息。沒有連線時回傳 false。訊息不要自己先顯示，等 server 廣播回來 */
    send(text) {
      if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) return false;
      ws.send(JSON.stringify({ type: "chat", message: text }));
      return true;
    },
    set turnstileContainer(el) { turnstileContainer = el; },
    get messages() { return messages; },
    get status() { return status; },
    get online() { return online; },
    get me() { return session && { playerId: session.playerId, playerName: session.playerName }; },
  };
}

// ---- Turnstile（只在新玩家第一次進入時才會載入和執行） ----

let turnstileReady = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  turnstileReady ??= new Promise((resolve, reject) => {
    window.__worldChatTurnstileLoaded = resolve;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__worldChatTurnstileLoaded";
    script.async = true;
    script.onerror = () => {
      turnstileReady = null;
      reject(new Error("CHALLENGE_FAILED"));
    };
    document.head.appendChild(script);
  });
  return turnstileReady;
}

async function getTurnstileToken(sitekey, container) {
  await loadTurnstile();
  return new Promise((resolve, reject) => {
    const widgetId = window.turnstile.render(container, {
      sitekey,
      appearance: "interaction-only", // 大多數玩家完全看不到，可疑時才出現勾選框
      callback: (token) => { window.turnstile.remove(widgetId); resolve(token); },
      "error-callback": () => { window.turnstile.remove(widgetId); reject(new Error("CHALLENGE_FAILED")); },
    });
  });
}

function localStorageStore(key) {
  return {
    load() {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    save(value) {
      try { value ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch { /* 被停用就算了 */ }
    },
  };
}
