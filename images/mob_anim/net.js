/* ============================================================
   諸神放置錄 — 線上模式接線層
   ------------------------------------------------------------
   這一層讓遊戲從「單機 + localStorage」變成「帳號 + 伺服器權威」。
   刻意獨立成一個檔案、不改 ui.js 與 engine.js 的任何一行,
   介面那邊怎麼改都不會跟這裡衝突。

   它做四件事:
     1. 蓋一層登入／註冊／選角畫面在遊戲上面
     2. 停掉本地的戰鬥迴圈 —— 遊戲改由伺服器推進,前端只負責畫
     3. 把玩家動作轉送 /api/act,拿伺服器回來的權威快照覆蓋本地 state
     4. 把 saveGame 變成空操作 —— 存檔只有伺服器寫得動

   為什麼能這樣接:
     ・engine.js 的 `let state` 與各個 function 都在 classic script 的
       global scope,本檔同樣是 classic script,所以直接 `state = 快照`
       就能寫進去(function 宣告掛 global object,可以覆寫;
       const/let 不掛 global object 但共用同一個 global lexical scope)。
     ・單機版的所有數值本來就都算在 engine.js 裡,伺服器跑的是同一份檔案,
       所以伺服器算出來的 state 前端能直接吃。
   ============================================================ */
(function () {
  'use strict';

  /* 這段要在 script 解析當下就跑,不能等 load —— 單機版的 initApp 綁在 load,
     等到那時候標題畫面早就畫出來了,玩家會看到它閃一下才被登入框蓋掉。
     先把三個畫面壓住,登入流程結束後再由 releaseScreens() 放行。 */
  if (location.protocol !== 'file:') {
    var pre = document.createElement('style');
    pre.id = 'ro-net-preclose';
    pre.textContent = '.screen{visibility:hidden !important}'
      /* 伺服器權威之下沒有本機存檔,這些入口一律不露出。
         ⚠ 倉庫那兩顆是後來才加的,當時**漏了加進這份清單**——玩家 acc145 #1575
           因此看到「匯入倉庫(會覆蓋)」按鈕,合理地以為可以自己編 JSON 塞裝備。
           實際上塞不進去(伺服器的倉庫只從 DB 讀,/api/act 也沒有這個動作),
           但按下去會先改到本機鏡像、下次同步才被蓋回來,畫面等於騙人一次。
           新增本機存檔類的入口時,記得一起加進這裡。 */
      + '#slot-backup-btns,.slot-actions,'
      + '[onclick="manualSave()"],[onclick^="exportSlotSave"],[onclick^="exportFullBackupFile"],'
      + '[onclick^="importFullBackupFile"],[onclick^="importSaveToSlot"],[onclick^="deleteSlot"],'
      + '[onclick^="exportWarehouse"],[onclick^="importWarehouseFile"]'
      + '{display:none !important}';
    (document.head || document.documentElement).appendChild(pre);
  }

  var API = '/api';
  var TICK_INTERVAL_MS = 3500;      // 向伺服器要快照的間隔(2026-08-25 69人在線 CPU 滿載,2000→3500 降 43% 請求量)
  var LS_TOKEN = 'ro_online_token';
  var LS_SLOT  = 'ro_online_slot';

  var NET = window.RO_NET = {
    token: null,
    slot: null,
    online: false,
    _timer: null,
    _busy: false,
    _pendingOpt: 0,      // 設定類請求在途數(見 sendOption):>0 時不吃 tick 快照
    _pendingOptAt: 0,    // 最早那一筆的送出時間,用來做逾時保險

  };

  // ---------------- HTTP ----------------
  function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (NET.token) headers.Authorization = 'Bearer ' + NET.token;
    return fetch(API + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) {
          var err = new Error(j.error || ('伺服器回應 ' + res.status));
          err.code = res.status;
          throw err;
        }
        return j;
      });
    });
  }

  // ---------------- 樣式 ----------------
  function injectStyle() {
    if (document.getElementById('ro-net-style')) return;
    /* 視覺比照紅獅登入頁:整面背景圖壓漸層、毛玻璃卡片、大圓角輸入框、
       漸層主按鈕帶光暈。配色改用遊戲本身的金色,不套紅獅的藍。 */
    var css = [
      '.ronet-mask{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;',
      'justify-content:center;padding:20px;overflow:auto;color:#e8edf5;',
      'font-family:"Noto Sans TC",system-ui,-apple-system,sans-serif;',
      'background:#0a0d14 url(images/maps/field.jpg) center/cover no-repeat}',
      '.ronet-mask::before{content:"";position:fixed;inset:0;pointer-events:none;',
      'background:linear-gradient(180deg,rgba(8,11,20,.62) 0%,rgba(8,11,20,.42) 38%,rgba(8,11,20,.9) 100%)}',
      '.ronet-box{position:relative;z-index:1;width:340px;max-width:92vw;text-align:center;',
      'background:linear-gradient(160deg,rgba(26,24,18,.92),rgba(12,13,18,.96));',
      '-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);',
      'border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:30px 30px 26px;',
      'box-shadow:0 22px 60px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.09)}',
      '.ronet-box h1{margin:0 0 6px;font-family:"Noto Serif TC",serif;font-size:26px;font-weight:900;',
      'color:#f0d9a0;letter-spacing:3px;text-shadow:0 1px 4px #000,0 0 18px rgba(232,177,76,.3)}',
      '.ronet-box .sub{margin:0 0 20px;font-size:12.5px;color:#c3cbd8;opacity:.92;line-height:1.75}',
      '.ronet-tabs{display:flex;gap:8px;margin-bottom:18px}',
      '.ronet-tabs button{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);',
      'color:#9fb0c6;border-radius:11px;padding:9px 0;font-size:13.5px;cursor:pointer;font-weight:700;',
      'transition:all .15s}',
      '.ronet-tabs button:hover{color:#fff;border-color:rgba(255,255,255,.32)}',
      '.ronet-tabs button.on{background:rgba(232,177,76,.16);border-color:rgba(232,177,76,.6);color:#f0d9a0}',
      '.ronet-f{margin-bottom:12px;text-align:left}',
      '.ronet-f label{display:block;font-size:11.5px;color:#93a1b5;margin-bottom:6px;letter-spacing:.06em}',
      '.ronet-f input,.ronet-f select{width:100%;box-sizing:border-box;background:rgba(8,12,20,.74);',
      'color:#eef;border:1px solid rgba(255,255,255,.13);border-radius:11px;padding:13px 15px;font-size:16px;',
      'transition:border-color .15s,box-shadow .15s}',
      '.ronet-f input::placeholder{color:#8794a8}',
      '.ronet-f input:focus,.ronet-f select:focus{outline:none;border-color:#d0a94e;',
      'box-shadow:0 0 0 3px rgba(208,169,78,.22)}',
      '.ronet-go{width:100%;border:none;border-radius:12px;padding:14px;font-size:17px;font-weight:800;',
      'letter-spacing:4px;cursor:pointer;color:#2b1d00;margin-top:6px;',
      'background:linear-gradient(180deg,#f2ce7e,#e0ad46 55%,#bd8a26);',
      'box-shadow:0 6px 22px rgba(200,150,50,.42),inset 0 1px 0 rgba(255,255,255,.42);',
      'transition:transform .08s,box-shadow .15s}',
      '.ronet-go:hover{box-shadow:0 8px 30px rgba(232,177,76,.6),inset 0 1px 0 rgba(255,255,255,.5)}',
      '.ronet-go:active{transform:translateY(1px)}',
      '.ronet-go:disabled{opacity:.55;cursor:default;box-shadow:none}',
      '.ronet-msg{margin-top:12px;font-size:12.5px;line-height:1.7;min-height:18px}',
      '.ronet-msg.err{color:#ff9a9a}.ronet-msg.ok{color:#8fe0ab}',
      '.ronet-slots{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:4px 0 14px;',
      /* 15 格排兩欄要 8 列、約 500px 高,筆電和手機都會超出畫面把登出鈕頂掉。
         給格子區一個最高高度讓它自己捲,外框永遠留在畫面內。 */
      'max-height:56vh;overflow-y:auto;overscroll-behavior:contain;padding-right:2px}',
      '.ronet-box.wide{width:560px}',
      '.ronet-box.wide .ronet-slots{grid-template-columns:1fr 1fr 1fr}',
      '@media(max-width:600px){.ronet-box.wide{width:340px}',
      '.ronet-box.wide .ronet-slots{grid-template-columns:1fr 1fr}}',
      '.ronet-slot{background:rgba(8,12,20,.6);border:1px solid rgba(255,255,255,.13);border-radius:12px;',
      'padding:12px 13px;cursor:pointer;transition:all .15s;text-align:left}',
      '.ronet-slot:hover{border-color:rgba(232,177,76,.6);background:rgba(232,177,76,.1)}',
      '.ronet-slot .nm{font-size:14.5px;color:#eef3fa;font-weight:700;margin-bottom:3px}',
      '.ronet-slot .mt{font-size:11px;color:#8794a8}',
      /* 離線時間排在職業/等級那行下面，顏色再暗一階，不要跟名字搶視線 */
      '.ronet-slot .mt.off{margin-top:2px;color:#6b7a90}',
      '.ronet-slot{position:relative}',
      '.ronet-del{position:absolute;top:6px;right:6px;width:22px;height:22px;line-height:20px;',
      'padding:0;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);',
      'color:#9aa7b8;font-size:12px;cursor:pointer;opacity:.55}',
      '.ronet-del:hover{opacity:1;color:#ff9a9a;border-color:rgba(255,120,120,.6);background:rgba(120,20,20,.4)}',
      '.ronet-slot.empty{border-style:dashed;color:#7c8798;text-align:center;font-size:12.5px;',
      'display:flex;align-items:center;justify-content:center;min-height:60px}',
      '.ronet-slot.empty:hover{border-color:rgba(232,177,76,.6);color:#f0d9a0}',
      '.ronet-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:10px 0 6px}',
      '.ronet-stats div{text-align:center}',
      '.ronet-stats label{font-size:11px;color:#93a1b5;display:block;margin-bottom:4px}',
      '.ronet-stats input{width:100%;box-sizing:border-box;background:rgba(8,12,20,.74);',
      'border:1px solid rgba(255,255,255,.13);color:#eef;border-radius:9px;padding:8px;font-size:14px;text-align:center}',
      '.ronet-back{background:transparent;border:none;color:#9fb0c6;font-size:12.5px;cursor:pointer;',
      'margin-top:12px;text-decoration:underline}',
      '.ronet-back:hover{color:#fff}',
      /* 「線上/登出」這條狀態列原本釘在右下角 —— 那裡正好是右側分頁面板的底部,
         討伐自選、圖鑑翻頁、插卡的按鈕都在那一帶,整條蓋上去就按不到
         (玩家 #67)。搬到左下角:聊天窗是 bottom:56px,下面那條空白帶沒有任何按鈕。
         再加一道保險 —— 整條不吃點擊,只有「登出」那顆吃,
         這樣就算之後有東西搬到左下角也不會被它擋住。 */
      '.ronet-bar{position:fixed;left:10px;right:auto;bottom:10px;z-index:9998;',
      'pointer-events:none;background:rgba(12,17,25,.94);',
      'border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:6px 11px;font-size:11.5px;',
      'color:#9fb0c6;font-family:"Noto Sans TC",system-ui,sans-serif;display:flex;align-items:center;gap:8px}',
      '.ronet-dot{width:7px;height:7px;border-radius:50%;background:#6fcf9b;box-shadow:0 0 6px rgba(111,207,155,.8)}',
      '.ronet-bar.bad .ronet-dot{background:#f08272;box-shadow:0 0 6px rgba(240,130,114,.8)}',
      '.ronet-bar button{pointer-events:auto;background:none;border:0;color:#9fb0c6;cursor:pointer;font-size:11.5px;',
      'text-decoration:underline;padding:0}',
      '.ronet-bar button:hover{color:#fff}',

      /* 地圖背景原本 opacity .4 再乘 brightness .75,疊起來幾乎看不見,
         戰鬥區看起來就是一片純色。調亮到看得出地形但不搶角色。 */
      '.map-bg-layer img{opacity:.72 !important;filter:saturate(.95) brightness(.92) !important}',

      /* ---- 戰場座標層 ----
         player-area 原本是 flex 0 0 33% 的欄位,改成覆蓋全場的絕對定位層,
         玩家與隊友才能用 left 百分比在整張地圖上走。
         怪物容器維持在右側 67%,renderMonster 算出來的站位就不會跑掉。 */
      '.battle-scene{position:relative;overflow:hidden}',
      '.player-area{position:absolute !important;left:0;top:0;width:100%;height:100%;',
      'flex:none !important;display:block !important}',
      /* top:50% 是把元素「頂端」放在中線,所以要往上拉半個身高才是真的置中。
         用 margin 而不是 transform:translateY —— transform 要留給攻擊動作用,
         兩邊搶同一個屬性會互相蓋掉。 */
      /* 🔴 過渡時間一定要 <= 更新間隔(BF.tick 260ms),而且要 linear。
         .45s 的話,舊過渡還沒走完就被下一個目標覆蓋,
         位移在畫面上會累積成瞬移彈射(實測飆到 1850px/秒)——
         也就是「玩家用飛的」。等於更新間隔才會是等速前進。 */
      /* 🔴 對齊的是「看得到的那張圖」,不是容器。
         容器 120x160,canvas 114x93 卻落在容器內的 (21,71) ——
         用容器中心對齊座標,canvas 中心會比座標點低 37px、右 18px。
         怪那邊的 img 又比它的容器中心高 25px,兩邊垂直錯開 63px,
         算好的 143px 貼身距離在畫面上就完全不是那麼回事。
         這裡直接把 canvas 中心推到座標點上。 */
      /* 🔴 過渡時間 = 座標更新間隔(TICK_INTERVAL_MS 2000ms)。
         伺服器 2 秒才送一次新座標,過渡只有 .26s 的話,
         玩家會在 0.26 秒內衝完 2 秒份的位移(約 840px)然後站著不動 1.74 秒 ——
         看起來既像用飛的又像一格一格跳。
         讓過渡佔滿整個間隔,兩次快照之間就是連續的走路(等於用 CSS 做插值)。 */
      '#player-sprite{position:absolute !important;margin-top:-117px;margin-left:-78px;',
      'transition:left 2s linear,top 2s linear,transform .12s ease-out;',
      'will-change:left,top;z-index:3}',
      '.ally-sprite{position:absolute !important;margin-top:-40px;',
      'transition:left 2s linear,top 2s linear;z-index:2}',
      /* 改成滿版:伺服器給的 bx 是「整個戰場的百分比」,
         容器只佔 67% 的話還要換算,多一層換算就多一個算錯的地方。 */
      /* 戰場內的東西一律不准頂出捲軸:
         怪走到 maxX、負的 margin-left、攻擊時的 translateX 疊起來
         會在動作的某一瞬間把頁面撐寬,畫面底部就突然冒出左右捲動條。 */
      '#battle-scene{overflow:hidden !important}',
      '.monster-area-right{position:absolute !important;left:0;top:0;width:100%;height:100%;overflow:hidden;',
      'flex:none !important;display:block !important}',
      '.monster-semi-circle{position:absolute !important;left:0;top:0;width:100%;height:100%}',
      /* left 與 top 的時間一定要一樣,不然斜向移動會走出弧線 */
      /* 🔴 定位基準必須跟玩家一致。
         #player-sprite 用負 margin 把容器中心對到座標點,
         而 .monster-slot 是「容器左上角」對到座標點 ——
         整隻怪因此往右下偏了半個容器(約 87x71px),
         算好的 143px 中心距實際只剩 -37px,人跟怪就疊在一起。
         容器寬度會隨怪名長度變動,所以用 translate(-50%,-50%) 而不是固定 margin。 */
      /* img 貼齊 slot 左上、下方還接著名字與血條,
         所以容器中心比 img 中心低 —— 用 -50px 把 img 中心(高 100 的一半)
         推到座標點上,不能用 -50%(那是含名字血條的整個容器高)。 */
      '.monster-slot{transform:translate(-50%,-50px);',
      // 同理:怪的移動也要佔滿整個更新間隔才會連續
      'transition:left 2s linear,top 2s linear,opacity .25s linear !important}',
      /* ================= 背包:改成紅獅那套圖示格 =================
         原本是每列 432x127 的清單,一屏只看得到 3 件。
         紅獅 items-grid.js 的做法是 6 欄正方格 + 點格子浮出選單,
         一屏看得到 30+ 件。這裡沿用它的視覺語言:
         深底 #0c1119 / 邊框 #2a3242 / hover 藍框 / 已裝備綠框 + ON 徽章 /
         右上金色強化數 / 右下數量。

         ⚠️ 不改 ui.js 的 HTML —— renderInventoryTab() 每次動作後都會重繪,
         而且 CODEX 會覆蓋 ui.js。這裡只用 CSS 重排既有節點,
         再加最少量的 JS 處理「點格子浮出選單」(純 CSS 做不出浮層,
         因為 .inv-info 與 .inv-actions 是兄弟節點,絕對定位會疊在一起)。 */
      '#tab-inventory .inv-list{display:grid !important;grid-template-columns:repeat(6,1fr);',
      'gap:6px;align-content:start}',
      '@media(max-width:520px){#tab-inventory .inv-list{grid-template-columns:repeat(5,1fr)}}',
      '#tab-inventory .inv-row{position:relative;aspect-ratio:1/1;height:auto !important;',
      'min-height:0 !important;padding:0 !important;margin:0 !important;display:block !important;',
      'background:#0c1119;border:1px solid #2a3242;border-radius:6px;overflow:visible;',
      'transition:border-color .12s,box-shadow .12s}',
      '#tab-inventory .inv-row:hover{border-color:#4a90d9;box-shadow:0 0 0 1px #4a90d9 inset;z-index:5}',
      '#tab-inventory .inv-row.ro-eq{border-color:#3a7d3a}',
      '#tab-inventory .inv-row-main{width:100%;height:100%;display:block !important;padding:0;margin:0;gap:0}',
      '#tab-inventory .inv-icon{width:100%;height:100%;display:grid;place-items:center;padding:0;margin:0}',
      /* ⚠️ 原本是 max-width:82% + width:auto ——「只會縮小不會放大」。
         道具圖是 RO 的背包圖示,原尺寸只有 24x24,
         擺在 66px 的格子裡就是中間一小點,四周全是空的。
         改成明確給寬高讓它填滿格子;像素圖放大要用 pixelated,
         否則瀏覽器會做平滑內插,放大後糊成一團。 */
      '#tab-inventory .inv-icon img{width:82% !important;height:82% !important;',
      'object-fit:contain;image-rendering:pixelated}',
      // 徽章:已裝備 ON(左下)、數量(右下)、強化(右上) —— 值由 JS 從既有文字抽出來寫進 data-*
      '#tab-inventory .inv-row[data-ro-on]::before{content:"ON";position:absolute;left:2px;bottom:2px;',
      'background:#2f8f2f;color:#eafbe5;font-size:9px;line-height:1;font-weight:700;',
      'padding:1px 3px;border-radius:3px;letter-spacing:.5px;pointer-events:none;z-index:2}',
      '#tab-inventory .inv-row[data-ro-cnt]::after{content:attr(data-ro-cnt);position:absolute;',
      'right:3px;bottom:2px;color:#fff;font-size:11px;font-weight:700;',
      'text-shadow:0 1px 2px #000,0 0 2px #000;pointer-events:none;z-index:2}',
      // 收起明細與按鈕,點格子才浮出
      '#tab-inventory .inv-info,#tab-inventory .inv-actions{display:none}',
      '#tab-inventory .inv-row.ro-pop .inv-info,#tab-inventory .inv-row.ro-pop .inv-actions{',
      'display:block;position:fixed;left:var(--rp-x);transform:translateX(-50%);',
      'width:280px;box-sizing:border-box;background:#0f1520;border:1px solid #4a90d9;',
      'padding:8px 10px;z-index:100003;box-shadow:0 10px 28px rgba(0,0,0,.75)}',
      '#tab-inventory .inv-row.ro-pop .inv-info{top:var(--rp-y);border-radius:8px 8px 0 0;border-bottom:0}',
      '#tab-inventory .inv-row.ro-pop .inv-actions{top:var(--rp-y2);border-radius:0 0 8px 8px;',
      'display:flex !important;flex-wrap:wrap;gap:4px}',
      '#tab-inventory .inv-row.ro-pop{border-color:#4a90d9;box-shadow:0 0 0 1px #4a90d9 inset}',

      /* ================= 清單模式(B1,玩家 #26 #36 #44 要的「文字清單」)=================
         上面那整套圖示格是用 `#tab-inventory .inv-list` + !important 寫的,
         我第一版把清單模式寫在 style.css,權重整個輸掉 ——
         玩家 #62 回報「有圖片跟清單的按鍵,但點了清單沒作用,依舊是圖片」。
         寫在這裡(同一個樣式區塊、同一個主人),選擇器多帶一個 class
         (`#id .a.b` 比 `#id .a` 特異度高)才蓋得過去。
         切回「圖片」時 .inv-view-list 不在,這整段自動失效,不影響原本的格子。 */
      '#tab-inventory .inv-list.inv-view-list{display:flex !important;flex-direction:column;gap:4px}',
      '#tab-inventory .inv-view-list .inv-row{aspect-ratio:auto !important;height:auto !important;',
      'display:flex !important;flex-direction:row;align-items:center;gap:10px;flex-wrap:wrap;',
      /* 玩家 #86「文字大小與按鈕可以修正一下」:第一版把列壓太扁、
         按鈕縮到 11px/2px,一排小字很難按。放回接近原本的尺寸,
         一列還是只佔一行,只是不再擠。 */
      'padding:7px 10px !important;overflow:hidden}',
      '#tab-inventory .inv-view-list .inv-row-main{display:flex !important;flex:1 1 220px;min-width:0;',
      'align-items:center;gap:8px;width:auto;height:auto}',
      '#tab-inventory .inv-view-list .inv-icon{width:30px !important;height:30px !important;flex:none}',
      '#tab-inventory .inv-view-list .inv-icon img{width:100% !important;height:100% !important}',
      /* 圖示格把明細與按鈕藏起來(點格子才浮出),清單模式要放回來 */
      '#tab-inventory .inv-view-list .inv-info{display:flex !important;flex:1;min-width:0;',
      'align-items:baseline;gap:8px;position:static !important;width:auto !important;',
      'background:none !important;border:0 !important;padding:0 !important;box-shadow:none !important}',
      '#tab-inventory .inv-view-list .inv-name{flex:0 1 auto;min-width:0;white-space:nowrap;',
      'overflow:hidden;text-overflow:ellipsis}',
      '#tab-inventory .inv-view-list .inv-desc{flex:1;min-width:0;white-space:nowrap;',
      'overflow:hidden;text-overflow:ellipsis}',
      '#tab-inventory .inv-view-list .inv-actions{display:flex !important;flex:0 1 auto;flex-wrap:wrap;',
      'margin-left:auto;justify-content:flex-end;',
      'position:static !important;width:auto !important;background:none !important;border:0 !important;',
      'padding:0 !important;box-shadow:none !important;gap:4px}',
      /* 裝備比較區塊(.inv-compare)在清單模式會撐到 108px,一列變 130px —— 
         那是玩家 #86 說「文字大小與按鈕」怪怪的真正原因(列太高、東西擠在一起)。
         清單模式把它壓成一行,完整內容看滑鼠提示;圖片模式不受影響。 */
      '#tab-inventory .inv-view-list .inv-compare{max-height:20px;overflow:hidden;',
      'white-space:nowrap;text-overflow:ellipsis;flex:0 200 auto;max-width:38%;font-size:11.5px}',
      '#tab-inventory .inv-view-list .inv-name{font-size:13.5px}',
      '#tab-inventory .inv-view-list .inv-desc{font-size:12px}',
      '#tab-inventory .inv-view-list .inv-actions .btn-small{padding:5px 10px;font-size:12px}',
      /* 清單模式不需要格子上的徽章(數量與裝備狀態文字裡就有) */
      '#tab-inventory .inv-view-list .inv-row::before,#tab-inventory .inv-view-list .inv-row::after{display:none}',
      '@media(max-width:640px){#tab-inventory .inv-view-list .inv-row{flex-wrap:wrap}',
      '#tab-inventory .inv-view-list .inv-actions{width:100% !important;flex-wrap:wrap}',
      '#tab-inventory .inv-view-list .inv-desc{flex-basis:100%}}',

      /* ================= 掉落一覽(照紅獅 rt-combat.js 的 showDrops) =================
         戰場右上一顆 📖 鈕,點開列出本圖每隻怪掉什麼、機率多少。 */
      '.ro-drops-btn{position:absolute;right:58px;top:14px;z-index:8;width:34px;height:34px;'  /* right:58=讓開 right:12 的靜音鈕(2026-08-25 老闆:兩顆鈕重疊) */,
      'border-radius:8px;border:1px solid #2a3242;background:rgba(12,17,25,.86);color:#cfe6ff;',
      'font-size:17px;line-height:1;cursor:pointer;display:grid;place-items:center;',
      'box-shadow:0 2px 8px rgba(0,0,0,.5);transition:border-color .12s,background .12s}',
      '.ro-drops-btn:hover{border-color:#4a90d9;background:rgba(18,26,38,.95)}',
      '.ro-drop-panel{position:fixed;inset:0;z-index:100004;background:rgba(0,0,0,.62);',
      'display:flex;align-items:center;justify-content:center;padding:20px}',
      '.ro-drop-box{width:min(680px,94vw);max-height:82vh;display:flex;flex-direction:column;',
      'background:#0f1520;border:1px solid #33414f;border-radius:10px;overflow:hidden;',
      'box-shadow:0 18px 48px rgba(0,0,0,.7)}',
      '.ro-drop-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;',
      'padding:10px 14px;border-bottom:1px solid #222c38;background:#141a24}',
      '.ro-drop-hd b{color:#ffe6a8;font-size:14px}',
      '.ro-drop-x{background:#22303f;color:#d7dde7;border:1px solid #33414f;border-radius:7px;',
      'padding:5px 12px;cursor:pointer;font-size:12px}',
      '.ro-drop-x:hover{background:#2b3d50}',
      '.ro-drop-body{overflow-y:auto;padding:10px 12px 14px}',
      '.ro-drop-mob{border:1px solid #222c38;border-radius:8px;padding:8px 10px;margin-bottom:8px;background:#0c1119}',
      '.ro-drop-mh{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
      '.ro-drop-mh img{width:34px;height:34px;object-fit:contain;image-rendering:pixelated}',
      '.ro-drop-mh span{color:#e8eef7;font-weight:700;font-size:13px}',
      '.ro-drop-mh i{color:#8b94a3;font-size:11px;font-style:normal}',
      '.ro-drop-mult{color:#9fd8b4;background:#0f1a14;border-top:1px solid #24402f;',
      'border-radius:6px;margin-bottom:6px}',
      '.ro-drop-ele{font-size:11px;margin:0 0 5px;letter-spacing:.2px}',
      '.ro-ele-good{color:#7fe0a0;font-weight:700;margin-right:2px}',
      '.ro-ele-bad{color:#ff9a9a;font-weight:700}',
      '.ro-ele-flat{color:#8b94a3;font-weight:400}',
      '.ro-drop-meta{flex:none;font-size:10.5px;font-style:normal;color:#8fb4d8;',
      'background:#131c28;border:1px solid #24354a;border-radius:4px;padding:1px 6px}',
      '.ro-drop-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:4px}',
      '.ro-drop-it{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:5px;',
      'background:#121a26;font-size:12px;color:#c8d3e0}',
      '.ro-drop-it img{width:20px;height:20px;object-fit:contain;image-rendering:pixelated;flex:none}',
      '.ro-drop-it .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ro-drop-it .pc{color:#7fe0a0;font-weight:700;flex:none}',
      /* 稀有的用顏色分級,一眼看得出哪些難掉 */
      '.ro-drop-it.rare .pc{color:#ffcf4a}',
      '.ro-drop-it.vrare .pc{color:#ff9ad2}',
      '.ro-drop-it.card{background:#1b1533;border:1px solid #4a2a8a}',
      '.ro-drop-it.card .pc{color:#c9a6ff}',
      '.ro-drop-empty{color:#6b7484;font-size:12px;text-align:center;padding:16px}',
      /* BOSS 區塊：跟一般怪明顯分開，不然玩家分不出哪隻是王 */
      '.ro-drop-sep{margin:12px 0 8px;padding:5px 10px;border-radius:6px;font-weight:700;',
      'font-size:12px;color:#ffd98a;background:#241c0d;border:1px solid #6b4f18}',
      '.ro-drop-mob.boss{border-color:#6b4f18;background:#141008}',
      '.ro-drop-tag{flex:none;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;',
      'background:#6b4f18;color:#ffe6ad}',
      '.ro-drop-note{margin-top:6px;padding:8px 10px;border-top:1px solid #222c38;',
      'font-size:11px;color:#8b94a3;line-height:1.7}',

      /* ================= 紙娃娃(照紅獅 ui.js 的 .paperdoll) =================
         左排格子 + 中間大立繪 + 右排格子,下面另開一排飾品。
         有裝備金框、hover 藍框,跟背包的圖示格是同一套視覺語言。
         RO 原本的 .equipwin 立繪只有 68px、格子是陽春的橢圓,整個換掉。 */
      '.ro-doll-wrap{padding:2px 0 6px}',
      '.ro-doll-sub{color:#8b94a3;font-size:12px;margin:2px 2px 6px;letter-spacing:.5px}',
      '.ro-doll{display:flex;align-items:stretch;justify-content:center;gap:8px}',
      '.ro-doll-col{display:flex;flex-direction:column;gap:6px}',
      '.ro-doll-hero{flex:1;min-width:0;display:flex;align-items:flex-end;justify-content:center;',
      'background:linear-gradient(180deg,rgba(24,32,45,.55),rgba(12,17,25,.9));',
      'border:1px solid #2a3242;border-radius:8px;padding:6px 4px 12px;position:relative}',
      /* ⚠️ 原圖只有 107x87(像素風小圖),max-height 對比它小的圖不會放大 ——
         要指定 height 才撐得起來。image-rendering:pixelated 讓放大後保持銳利。 */
      '.ro-doll-hero img{width:auto;height:168px;max-width:100%;object-fit:contain;image-rendering:pixelated;',
      'filter:drop-shadow(0 4px 8px rgba(0,0,0,.6));position:relative;z-index:1}',
      /* 腳下的影子,讓立繪站得住 */
      '.ro-doll-fig{display:block;position:relative;z-index:1}',
      '.ro-doll-hero::after{content:"";position:absolute;left:50%;bottom:10px;transform:translateX(-50%);',
      'width:50%;height:10px;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.55),transparent 70%)}',
      '.ro-doll-acc{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px}',
      '.pdx{position:relative;width:62px;height:62px;background:#0c1119;border:1px solid #2a3242;',
      'border-radius:6px;display:grid;place-items:center;cursor:pointer;overflow:hidden;',
      'transition:border-color .12s,box-shadow .12s}',
      '.ro-doll-acc .pdx{width:auto;height:auto;aspect-ratio:1/1}',
      '.pdx:hover{border-color:#4a90d9;box-shadow:0 0 0 1px #4a90d9 inset}',
      /* 有裝備:金框(紅獅 .pd-slot.has 的作法) */
      '.pdx.has{border-color:#d9a441;box-shadow:0 0 0 1px rgba(217,164,65,.35) inset}',
      /* ⚠️ 跟背包同一個坑:只寫 max-width 等於「只會縮小不會放大」,
         道具圖原生只有 24x24,擺在 62px 的格子裡就是中間一小點。
         要明確給寬高才會放大;像素圖放大一定要配 pixelated。 */
      '.pdx img{width:80%;height:80%;object-fit:contain;image-rendering:pixelated;',
      'pointer-events:none}',
      '.pdx .pdx-lbl{color:#5d6675;font-size:11px;line-height:1.25;text-align:center;pointer-events:none;padding:0 2px}',
      '.pdx .pdx-en{position:absolute;right:3px;top:1px;color:#ffcf4a;font-size:11px;font-weight:700;',
      'text-shadow:0 1px 2px #000,0 0 2px #000;pointer-events:none}',
      /* 雙手武器佔住左手:淡一點表示是被佔用,不是另一件裝備 */
      '.pdx.two-hand img{opacity:.42}',
      '.ro-doll-hint{color:#6b7484;font-size:11px;text-align:center;margin-top:8px}',

      /* ---- 裝備格:跟背包同一套視覺(紅獅 items-grid 的語言) ---- */
      '.equipwin-slot{background:#0c1119 !important;border:1px solid #2a3242 !important;',
      'border-radius:5px !important;transition:border-color .12s,box-shadow .12s}',
      '.equipwin-slot:hover{border-color:#4a90d9 !important;box-shadow:0 0 0 1px #4a90d9 inset}',
      // 有裝備的格子:綠框(跟背包的 .ro-eq 一致)
      '.equipwin-slot:not(.is-empty){border-color:#3a7d3a !important}',
      '.equipwin-slot img{width:84% !important;height:84% !important;',
      'object-fit:contain;image-rendering:pixelated}',
      // 空格子的部位名稱淡一點,不要跟道具圖示搶
      '.equipwin-slot.is-empty{opacity:.62}',

      /* ---- 紙娃娃:RO 裝備視窗中央的角色 ----
         ui.js 的 EQUIPWIN_POS 註解寫著中間那顆大橢圓「原本是角色影子」,
         左右各五格本來就是圍繞式佈局 —— 缺的只是中間的人。
         用 CSS 變數帶圖,不注入 DOM:renderEquipTab 每次重繪都會清掉子節點,
         而且這樣完全不必改 ui.js(被 CODEX 覆蓋也不影響)。 */
      '.equipwin{position:relative}',
      '.equipwin::before{content:"";position:absolute;left:50%;top:46%;',
      'transform:translate(-50%,-50%);width:19%;height:62%;',
      'background:var(--ro-doll,none) center bottom/contain no-repeat;',
      'image-rendering:pixelated;pointer-events:none;z-index:1;',
      'filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}',
      /* 沒有立繪可用時(職業沒有對應素材)整段不作用,版面維持原樣 */
      '.equipwin[data-nodoll]::before{display:none}',

      /* 同房間的其他玩家 */
      '.ro-remote{position:absolute;width:120px;height:160px;margin-left:-60px;margin-top:-80px;',
      'z-index:2;pointer-events:none;transition:left .5s linear,top .5s linear;',
      'filter:drop-shadow(0 6px 10px rgba(0,0,0,.55))}',
      '.ro-remote img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated;opacity:.92}',
      '.ro-remote .nm{position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);white-space:nowrap;',
      'font-size:11px;color:#cfe6ff;text-shadow:0 1px 3px #000,0 0 6px rgba(0,0,0,.9);',
      'background:rgba(10,16,26,.55);padding:1px 6px;border-radius:8px}',
      '.ro-remote .hp{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);',
      'width:46px;height:3px;background:rgba(0,0,0,.6);border-radius:2px;overflow:hidden}',
      '.ro-remote .hp i{display:block;height:100%;background:#5fbf6a}',

      /* 發現玩家的驚嘆號 */
      '.ro-alert{position:absolute;left:50%;top:-16px;transform:translateX(-50%);',
      'font-size:20px;font-weight:900;color:#ffd34d;text-shadow:0 2px 4px #000,0 0 8px rgba(255,200,60,.9);',
      'pointer-events:none;animation:ro-alert-pop .32s cubic-bezier(.2,1.6,.4,1);z-index:5}',
      '@keyframes ro-alert-pop{0%{transform:translateX(-50%) scale(.3) translateY(6px);opacity:0}',
      '60%{transform:translateX(-50%) scale(1.25) translateY(-2px);opacity:1}',
      '100%{transform:translateX(-50%) scale(1) translateY(0);opacity:1}}',

      /* ---- 玩家攻擊動作 ----
         engine.js 打中怪時會對 #player-sprite 加 attacking class,
         但遊戲的 CSS 從來沒定義過它。這裡補上:
         後拉蓄力 → 前衝揮出 → 回位,用的是現有角色圖,不改素材。
         加在容器上,裡面的 canvas(逐幀動畫)與 img 會一起動。 */
      '@keyframes ro-atk-swing{',
      '0%{transform:translateX(0) rotate(0deg)}',
      '18%{transform:translateX(-5px) rotate(-3deg)}',
      '46%{transform:translateX(13px) rotate(4deg)}',
      '68%{transform:translateX(7px) rotate(2deg)}',
      '100%{transform:translateX(0) rotate(0deg)}}',
      '#player-sprite.attacking{animation:ro-atk-swing .26s cubic-bezier(.2,.85,.3,1)}',
      /* 受擊時往後縮一下,跟揮擊區分開來 */
      '@keyframes ro-hurt-recoil{',
      '0%{transform:translateX(0)}35%{transform:translateX(-9px)}100%{transform:translateX(0)}}',
      '#player-sprite.hurting{animation:ro-hurt-recoil .22s ease-out}',
      '@media (prefers-reduced-motion:reduce){',
      '#player-sprite.attacking,#player-sprite.hurting{animation:none}}',
    ].join('');
    var s = document.createElement('style');
    s.id = 'ro-net-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------------- 畫面 ----------------
  /* boxClass:選角畫面格子變多之後要用寬版(三欄),登入／建角維持原本的窄版。 */
  function mask(html, boxClass) {
    releaseScreens();
    var m = document.getElementById('ronet-mask');
    if (!m) {
      m = document.createElement('div');
      m.id = 'ronet-mask';
      m.className = 'ronet-mask';
      document.body.appendChild(m);
    }
    m.innerHTML = '<div class="ronet-box' + (boxClass ? ' ' + boxClass : '') + '">' + html + '</div>';
    m.style.display = 'flex';
    return m;
  }
  function unmask() {
    var m = document.getElementById('ronet-mask');
    if (m) m.style.display = 'none';
  }
  function msg(text, kind) {
    var el = document.getElementById('ronet-msg');
    if (el) { el.textContent = text || ''; el.className = 'ronet-msg ' + (kind || ''); }
  }

  var authMode = 'login';
  function showAuth() {
    injectStyle();
    mask(
      '<h1>諸神放置錄</h1>' +
      '<p class="sub">線上版。角色存在伺服器上,換裝置也帶得走,<br>不會因為清瀏覽器資料就不見。</p>' +
      '<div class="ronet-tabs">' +
        '<button id="ronet-t-login" class="' + (authMode === 'login' ? 'on' : '') + '">登入</button>' +
        '<button id="ronet-t-reg" class="' + (authMode === 'reg' ? 'on' : '') + '">註冊</button>' +
      '</div>' +
      '<div class="ronet-f"><label>帳號</label><input id="ronet-u" autocomplete="username" maxlength="64"></div>' +
      '<div class="ronet-f"><label>密碼' + (authMode === 'reg' ? '(至少 6 個字)' : '') + '</label>' +
        '<input id="ronet-p" type="password" autocomplete="' + (authMode === 'reg' ? 'new-password' : 'current-password') + '"></div>' +
      '<button class="ronet-go" id="ronet-go">' + (authMode === 'login' ? '登入' : '建立帳號') + '</button>' +
      '<div class="ronet-msg" id="ronet-msg"></div>' +
      /* 「登不進去？」（feedback #306/#307/#308）。
         同一位玩家換電腦後忘記密碼，連送三則回報都沒得到回應 ——
         因為他登不進去，站內信到不了他手上，而登入畫面上
         **完全沒有任何地方告訴他該去哪**，他只能一直重送。
         ⚠ 這裡只給路，不承諾重設密碼：帳號歸屬要人工驗證。 */
      (authMode === 'login'
        ? '<p class="sub" style="margin-top:10px;font-size:12px">'
          + '登不進去？<a href="/site/feedback.html" target="_blank" style="color:#f5c542">從這裡回報</a>'
          + '（記得附上角色名稱與等級，才有辦法確認是本人）</p>'
        : '') +
      '<p class="sub" style="margin-top:14px">' +
        '<a href="/site/" target="_blank" style="color:#f5c542">官方網站</a>　' +
        '<a href="/site/guide.html" target="_blank" style="color:#f5c542">新手指南</a>　' +
        '<a href="/site/db.html" target="_blank" style="color:#f5c542">裝備查詢</a>' +
      '</p>' +
      /* 強制更新（玩家 acc227 #1008）。本站的 js/css/圖片是 `expires 7d; immutable` 發的，
         瀏覽器快取到舊版就要等七天，而手機沒有 Ctrl+F5。 */
      '<p class="sub" style="margin-top:6px">' +
        '<button id="ronet-fresh" style="background:none;border:1px solid rgba(245,197,66,.5);' +
        'color:#f5c542;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px">' +
        '\uD83D\uDD04 強制更新</button>' +
        '<span style="display:block;margin-top:4px;opacity:.7;font-size:12px">' +
        '清除快取並重新載入圖片與程式。<b>不會影響你的角色與倉庫。</b></span>' +
        /* 版本號顯示出來（acc806 #3164）。原本沒有任何地方看得到自己跑的是哪一版，
           玩家說「我更新過了」時無法判斷 —— 只能一直猜。
           報修時附上這一串，就能立刻分辨是快取還是真的有 bug。 */
        '<span style="display:block;margin-top:6px;opacity:.55;font-size:11px">' +
        '版本 ' + (currentBuild() || '(未知)') + '</span>' +
      '</p>'
    );
    /* 兩段式確認：第一下換文字，第二下才執行，5 秒沒按就還原。
       跟寵物放生同一個做法——不可逆的操作要擋手滑，但不用彈窗打斷。 */
    var _fb = document.getElementById('ronet-fresh');
    if (_fb) _fb.onclick = function () {
      if (_fb.dataset.armed !== '1') {
        _fb.dataset.armed = '1';
        _fb.textContent = '\u26A0 確定清除快取並重載？';
        setTimeout(function () {
          if (!_fb.isConnected) return;
          _fb.dataset.armed = ''; _fb.textContent = '\uD83D\uDD04 強制更新';
        }, 5000);
        return;
      }
      _fb.textContent = '清除中\u2026';
      forceFreshReload();
    };
    document.getElementById('ronet-t-login').onclick = function () { authMode = 'login'; showAuth(); };
    document.getElementById('ronet-t-reg').onclick = function () { authMode = 'reg'; showAuth(); };
    document.getElementById('ronet-go').onclick = doAuth;
    document.getElementById('ronet-p').onkeydown = function (e) { if (e.key === 'Enter') doAuth(); };
    document.getElementById('ronet-u').focus();
  }

  /* 清快取並重新載入（玩家 acc227 #1008）。

     ⚠ **絕對不碰 localStorage** —— 存檔、倉庫、傭兵帳本全在那裡，清掉等於刪角色。
        只清 Cache Storage 與 Service Worker，那兩個裝的才是靜態檔。

     ⚠ `location.reload(true)` 的「強制」參數現代瀏覽器**已經忽略**，
        所以最後一定要換 URL（帶時間戳）才會真的重抓 index.html；
        index.html 一新，裡面的 `?v=<hash>` 就會指向最新的 js/css。
        這也是手機唯一可靠的作法。 */
  function forceFreshReload() {
    var done = function () {
      try {
        var u = new URL(location.href);
        u.searchParams.set('_fresh', String(Date.now()));
        location.replace(u.toString());
      } catch (e) {
        location.href = location.pathname + '?_fresh=' + Date.now();
      }
    };
    var jobs = [];
    try {
      if (window.caches && caches.keys) {
        jobs.push(caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }));
      }
    } catch (e) { /* 不支援就跳過，換 URL 那步還是有效 */ }
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }));
      }
    } catch (e) { /* 同上 */ }
    /* 清不掉也要重載——換 URL 本身就能繞過大部分快取，不能卡在這一步 */
    if (!jobs.length) return done();
    Promise.all(jobs).then(done, done);
    setTimeout(done, 2500);   // 保險：清除卡住就直接走
  }

  function doAuth() {
    /* ⚠️ 帳號一律送完整字串,絕不截斷。
       截斷過的帳號在「查不到就建立」的系統裡會生出第二個帳號,
       玩家的角色等同蒸發 —— 這個坑別再踩一次。 */
    var u = document.getElementById('ronet-u').value.trim();
    var p = document.getElementById('ronet-p').value;
    if (!u || !p) return msg('帳號和密碼都要填', 'err');
    var btn = document.getElementById('ronet-go');
    btn.disabled = true;
    msg(authMode === 'login' ? '登入中…' : '建立帳號中…');
    api('POST', authMode === 'login' ? '/login' : '/register', { username: u, password: p })
      .then(function (r) {
        NET.token = r.token;
        try { localStorage.setItem(LS_TOKEN, r.token); } catch (e) {}
        showChars();
      })
      .catch(function (e) { btn.disabled = false; msg(e.message, 'err'); });
  }

  // ---------------- 選角 ----------------
  function showChars() {
    injectStyle();
    msg('');
    api('GET', '/chars').then(function (r) {
      NET._charsCache = r.chars;   // 線上雇傭候選名單用(瀏覽器沒有其他存檔位)
      var used = {};
      r.chars.forEach(function (c) { used[c.slot] = c; });
      var cells = '';
      /* 存檔格數以前寫死上限 8,但伺服器本來就給 15 —— 少的那 7 格是被前端擋掉的,
         而且實測已經有 8 個帳號剛好塞滿 8 格,再也開不了新角色(玩家 #31 回報)。
         直接照伺服器給的數字開,格子多的時候排三欄、超出畫面就讓它捲。 */
      /* 離線多久（玩家 acc201 #1061 建議）。
         `updated_at` 是最後存檔時間，listChars() 本來就有回傳，前端沒用而已。
         只講有意義的精度：不到一分鐘就說「剛剛還在線上」，
         超過一天就用「N天M小時」，中間用「N小時M分」。
         沒有時間戳就整行不顯示——寧可不講，也不要掰一個數字出來。 */
      function offlineText(ts) {
        var t = Number(ts);
        if (!t || !isFinite(t)) return '';
        var s = Math.floor((Date.now() - t) / 1000);
        if (s < 0) s = 0;                       // 伺服器與本機時鐘有落差時不要顯示負數
        if (s < 60) return '剛剛還在線上';
        var m = Math.floor(s / 60);
        if (m < 60) return '離線 ' + m + ' 分鐘';
        var h = Math.floor(m / 60);
        if (h < 24) return '離線 ' + h + ' 小時' + (m % 60 ? ' ' + (m % 60) + ' 分' : '');
        var d = Math.floor(h / 24);
        return '離線 ' + d + ' 天' + (h % 24 ? ' ' + (h % 24) + ' 小時' : '');
      }
      /* 掛機時到底有沒有在打王(acc145 #1863)。
         玩家看不到這件事,只能等進遊戲結算完才知道,而結算又只講「打死幾隻」,
         沒打到的時候分不出「是沒開」還是「開了但沒遇到」。
         這裡顯示的是**離開時的設定**,不是結果 —— 標題也照實寫,不要讓人以為是戰績。
         ⚠ 那張圖有沒有頭目也一起看:開了模式但圖上沒王,一樣打不到。 */
      function bossText(c) {
        var on = Number(c.mvpMode) ? 'MVP' : (Number(c.miniMode) ? '迷你王' : '');
        if (!on) return '<div class="mt boss-off" title="離開時沒有開啟 BOSS 模式,掛機期間不會打到頭目">👑 BOSS模式 關</div>';
        var hasBoss = true;
        try {
          if (c.mapId && typeof bossListOf === 'function') {
            hasBoss = (bossListOf(c.mapId, Number(c.mvpMode) ? 'mvp' : 'mini') || []).length > 0;
          }
        } catch (e) {}
        if (!hasBoss) {
          return '<div class="mt boss-warn" title="開著 BOSS 模式,但離開時所在的地圖沒有這種頭目,掛機期間一樣打不到">'
            + '⚠ ' + on + '模式 開（這張圖沒有頭目）</div>';
        }
        return '<div class="mt boss-on" title="離開時是開著的,掛機期間會有機率遇到頭目">👑 ' + on + '模式 開</div>';
      }
      /* CHARMAP-ROW 這隻角色在哪張圖（acc658 #3400）。
         玩家原話：「能不能將選擇腳色頁面時 顯示該腳色當下再哪張地圖」。
         ⚠ 停在城鎮時只印城鎮名等於沒講（一排角色全是普隆德拉），
           所以城鎮要順便帶出「上次打怪」的圖。城鎮的判斷跟引擎一致：
           monsters.length === 0（見 engine.js isInTown）。
         ⚠ 這個畫面在進遊戲前就會顯示，MAPS 不一定載得到，
           照 bossText() 的作法整段包 try，查不到就整行不印，不要顯示 id。 */
      function findMap(id) {
        if (!id || typeof MAPS === 'undefined') return null;
        try { return MAPS.find(function (m) { return m && m.id === id; }) || null; } catch (e) { return null; }
      }
      function mapText(c) {
        var m = findMap(c.mapId);
        if (!m) return '';
        var inTown = !(m.monsters && m.monsters.length);
        if (!inTown) return '<div class="mt">\ud83d\udccd ' + esc(m.name) + '</div>';
        var lf = findMap(c.lastFarmMapId);
        return '<div class="mt" title="\u9019\u96bb\u505c\u5728\u57ce\u93ae\uff0c\u57ce\u93ae\u4e0d\u6703\u9047\u5230\u602a">'
          + '\ud83c\udfd8\ufe0f ' + esc(m.name)
          + (lf ? '<span class="off">\uff08\u4e0a\u6b21\u6253\u602a\uff1a' + esc(lf.name) + '\uff09</span>' : '')
          + '</div>';
      }
      var show = r.maxSlots;
      for (var i = 0; i < show; i++) {
        var c = used[i];
        cells += c
          ? '<div class="ronet-slot" data-slot="' + i + '"><div class="nm">' + esc(c.name) + '</div>' +
            '<div class="mt">存檔格 ' + (i + 1) +
            ((c.jobId && typeof JOB_TREE !== 'undefined' && JOB_TREE[c.jobId]) ? '・' + JOB_TREE[c.jobId].name : '') +
            (c.baseLevel ? '・Lv.' + c.baseLevel : '') + '</div>' +
            (offlineText(c.updated_at) ? '<div class="mt off">' + offlineText(c.updated_at) + '</div>' : '') +
            mapText(c) +
            bossText(c) +
            '<button class="ronet-del" data-del="' + i + '" data-nm="' + esc(c.name) + '" title="刪除這個角色">✕</button>' +
            '</div>'
          : '<div class="ronet-slot empty" data-new="' + i + '">＋ 建立角色</div>';
      }
      mask(
        '<h1>選擇角色</h1>' +
        '<p class="sub">點角色進入遊戲。角色與進度都存在伺服器。</p>' +
        '<div class="ronet-slots">' + cells + '</div>' +
        '<button class="ronet-back" id="ronet-pw">修改密碼</button>' +
        '<button class="ronet-back" id="ronet-logout">登出</button>' +
        '<div class="ronet-msg" id="ronet-msg"></div>',
        show > 8 ? 'wide' : ''
      );
      Array.prototype.forEach.call(document.querySelectorAll('.ronet-slot[data-slot]'), function (el) {
        el.onclick = function () { enterGame(+el.getAttribute('data-slot')); };
      });
      Array.prototype.forEach.call(document.querySelectorAll('.ronet-slot[data-new]'), function (el) {
        el.onclick = function () { showCreate(+el.getAttribute('data-new')); };
      });
      /* 刪除角色(玩家 #58 / #59:「人物無法刪除」)。
         以前這個畫面根本沒有刪除入口 —— 玩家看到的是單機版那顆,
         它刪的是瀏覽器本機存檔,對伺服器上的角色沒有作用。
         伺服器端是軟刪除,誤刪可以找 GM 還原。 */
      Array.prototype.forEach.call(document.querySelectorAll('.ronet-del'), function (el) {
        el.onclick = function (ev) {
          ev.stopPropagation();
          var slot = +el.getAttribute('data-del');
          var nm = el.getAttribute('data-nm') || '這個角色';
          if (!window.confirm('確定要刪除角色「' + nm + '」嗎?\n\n刪除後這個存檔格會空出來。\n如果是誤刪,可以聯絡 GM 還原。')) return;
          el.disabled = true;
          api('POST', '/char/delete', { slot: slot })
            .then(function () { msg('已刪除「' + nm + '」', 'ok'); NET._charsCache = null; showChars(); })
            .catch(function (e) { el.disabled = false; msg(e.message, 'err'); });
        };
      });
      document.getElementById('ronet-logout').onclick = logout;
      document.getElementById('ronet-pw').onclick = showChangePw;
    }).catch(function (e) {
      if (e.code === 401) { NET.token = null; try { localStorage.removeItem(LS_TOKEN); } catch (x) {} return showAuth(); }
      msg(e.message, 'err');
    });
  }

  /* RO 風味的隨機角色名(建角畫面的 🎲):跟著性別選單給男名/女名 */
  function randCharName(gender) {
    var M = {
      A: ['凱', '雷', '萊', '賽', '洛', '艾', '齊', '德', '卡', '歐', '法', '羅', '托', '布', '蓋', '威', '戴', '亞'],
      B: ['恩', '爾', '德', '克', '斯', '特', '文', '奧', '頓', '丹', '格', '森', '倫', '狄', '汀'],
      C: ['', '', '', '斯', '德', '特', '森', '托', '克'],
    };
    var F = {
      A: ['艾', '莉', '菈', '米', '蕾', '薇', '妮', '瑟', '芙', '露', '安', '伊', '歐', '娜', '珂', '賽', '梅', '緹'],
      B: ['莉', '婭', '拉', '娜', '絲', '薇', '妮', '雅', '兒', '琳', '蒂', '菲', '奧', '瑞'],
      C: ['', '', '', '婭', '絲', '雅', '娜', '兒', '汀', '琳', '蒂'],
    };
    var P = gender === 'F' ? F : M;
    var r = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    return r(P.A) + r(P.B) + r(P.C);
  }

  /* 自助修改密碼（玩家 acc516 / #1216）。本服原本完全沒有密碼管理。
     ⚠ 要輸入**目前的密碼**才能改 —— 光是「已經登入」不夠，
       別人借用你沒登出的裝置就能把你鎖在門外。
     ⚠ 改完伺服器會清掉所有 session 並發一張新 token 回來，
       這裡要把新 token 存起來，否則自己也會被踢出去。 */
  function showChangePw() {
    mask(
      '<h1>修改密碼</h1>' +
      '<p class="sub">改完之後，<b>其他裝置上的登入會全部失效</b>，這一台會留著。</p>' +
      '<div class="ronet-f"><label>目前的密碼</label>' +
        '<input id="ronet-pw-old" type="password" autocomplete="current-password"></div>' +
      '<div class="ronet-f"><label>新密碼（至少 6 個字）</label>' +
        '<input id="ronet-pw-new" type="password" autocomplete="new-password"></div>' +
      '<div class="ronet-f"><label>再輸入一次新密碼</label>' +
        '<input id="ronet-pw-new2" type="password" autocomplete="new-password"></div>' +
      '<button class="ronet-go" id="ronet-pw-go">確定修改</button>' +
      '<button class="ronet-back" id="ronet-pw-cancel">回上一步</button>' +
      '<div class="ronet-msg" id="ronet-msg"></div>'
    );
    document.getElementById('ronet-pw-cancel').onclick = showChars;
    document.getElementById('ronet-pw-go').onclick = function () {
      var o = document.getElementById('ronet-pw-old').value || '';
      var n = document.getElementById('ronet-pw-new').value || '';
      var n2 = document.getElementById('ronet-pw-new2').value || '';
      if (n.length < 6) { msg('新密碼至少 6 個字', 'err'); return; }
      if (n !== n2) { msg('兩次輸入的新密碼不一樣', 'err'); return; }
      var btn = this; btn.disabled = true;
      msg('修改中…');
      api('POST', '/account/password', { oldPassword: o, newPassword: n }).then(function (r) {
        /* 伺服器已經把舊 session 全部作廢，換上它剛發的這張，否則自己也會被登出 */
        if (r && r.token) {
          NET.token = r.token;
          try { localStorage.setItem(LS_TOKEN, r.token); } catch (e) {}
        }
        msg('密碼已修改，其他裝置已登出', 'ok');
        setTimeout(showChars, 900);
      }).catch(function (e) {
        msg(e && e.message ? e.message : '修改失敗', 'err');
      }).then(function () { btn.disabled = false; });
    };
  }

  function showCreate(slot) {
    var keys = [['str', '力量'], ['agi', '敏捷'], ['vit', '體力'], ['int', '智力'], ['dex', '靈巧'], ['luk', '幸運']];
    var stepBtn = 'style="width:30px;height:38px;flex:none;background:#1a2333;border:1px solid #334155;color:#eef;border-radius:6px;font-size:16px;cursor:pointer;line-height:1"';
    var fields = keys.map(function (k) {
      // 滑鼠移上去顯示這個屬性的作用(STAT_DESC 是遊戲本體的說明,跟角色頁一致)
      var d = (typeof STAT_DESC !== 'undefined' && STAT_DESC[k[0]]) ? STAT_DESC[k[0]] : '';
      return '<div style="min-width:0" title="' + k[1] + ':' + d + '">'
        + '<label style="display:block;margin-bottom:3px;cursor:help">' + k[1] + ' <span style="opacity:.45;font-size:11px">ⓘ</span></label>'
        + '<div style="display:flex;gap:4px;align-items:stretch">'
        + '<button type="button" class="ronet-step" data-k="' + k[0] + '" data-d="-1" ' + stepBtn + '>−</button>'
        + '<input id="ronet-s-' + k[0] + '" type="text" value="5" readonly style="flex:1 1 auto;min-width:34px;width:34px;text-align:center;font-size:16px;font-weight:700;color:#f5c542;background:#0c1119;border:1px solid #334155;border-radius:6px;padding:0">'
        + '<button type="button" class="ronet-step" data-k="' + k[0] + '" data-d="1" ' + stepBtn + '>＋</button>'
        + '</div></div>';
    }).join('');
    mask(
      '<h1>建立角色</h1>' +
      '<p class="sub">存檔格 ' + (slot + 1) + '。共 <b style="color:#f5c542">30 點</b>自由分配,每項 1～9。</p>' +
      '<div class="ronet-f"><label>角色名稱</label>' +
        '<div style="display:flex;gap:6px">' +
        '<input id="ronet-cn" maxlength="16" style="flex:1;min-width:0">' +
        '<button type="button" id="ronet-dice" title="隨機取名" style="width:44px;flex:none;background:#1a2333;border:1px solid #334155;border-radius:6px;font-size:18px;cursor:pointer">🎲</button>' +
        '</div></div>' +
      '<div class="ronet-f"><label>性別</label>' +
        '<select id="ronet-cg" style="width:100%;box-sizing:border-box;background:#0c1119;border:1px solid #334155;color:#eef;border-radius:6px;padding:9px">' +
        '<option value="M">男</option><option value="F">女</option></select></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin:6px 0">' + fields + '</div>' +
      '<div id="ronet-sum" style="margin:8px 0 0;text-align:center;font-size:15px"></div>' +
      '<button class="ronet-go" id="ronet-create">建立</button>' +
      '<button class="ronet-back" id="ronet-cancel">回上一步</button>' +
      '<div class="ronet-msg" id="ronet-msg"></div>'
    );
    document.getElementById('ronet-cancel').onclick = showChars;
    document.getElementById('ronet-dice').onclick = function () {
      document.getElementById('ronet-cn').value = randCharName(document.getElementById('ronet-cg').value);
    };
    /* 點數池制(老闆指定):共 30 點自由分配,每項 1~9,加減全由玩家自己點 */
    var POOL = 30;
    function statSum() {
      var t = 0;
      for (var i2 = 0; i2 < keys.length; i2++) t += (parseInt(document.getElementById('ronet-s-' + keys[i2][0]).value, 10) || 0);
      return t;
    }
    function paintSum() {
      var left = POOL - statSum();
      var el = document.getElementById('ronet-sum');
      el.innerHTML = left > 0
        ? '剩餘點數:<b style="color:#f5c542;font-size:18px">' + left + '</b> / ' + POOL
        : left === 0
          ? '<span style="color:#7dd87d">✔ 30 點已全部分配</span>'
          : '<span style="color:#e0443a">⚠️ 超出 ' + (-left) + ' 點</span>';
    }
    Array.prototype.forEach.call(document.querySelectorAll('.ronet-step'), function (b) {
      b.onclick = function () {
        var d = parseInt(b.getAttribute('data-d'), 10);
        var me = document.getElementById('ronet-s-' + b.getAttribute('data-k'));
        var v = (parseInt(me.value, 10) || 5) + d;
        if (v < 1 || v > 9) return;                       // 單項 1~9
        if (d > 0 && POOL - statSum() <= 0) { paintSum(); return; }   // 沒剩餘點數就加不了
        me.value = v;
        paintSum();
      };
    });
    paintSum();
    document.getElementById('ronet-cn').focus();
    document.getElementById('ronet-create').onclick = function () {
      var name = document.getElementById('ronet-cn').value.trim();
      if (!name) return msg('請輸入角色名稱', 'err');
      if (POOL - statSum() < 0) return msg('能力值總和超過 ' + POOL + ' 點,請先扣回來', 'err');
      var stats = {};
      for (var i = 0; i < keys.length; i++) {
        stats[keys[i][0]] = +document.getElementById('ronet-s-' + keys[i][0]).value;
      }
      var btn = document.getElementById('ronet-create');
      btn.disabled = true;
      msg('建立中…');
      api('POST', '/char/create', { slot: slot, name: name, gender: document.getElementById('ronet-cg').value, stats: stats })
        .then(function () { enterGame(slot); })
        .catch(function (e) { btn.disabled = false; msg(e.message, 'err'); });
    };
  }

  function logout() {
    api('POST', '/logout').catch(function () {});
    NET.token = null; NET.slot = null; NET.online = false;
    stopSync();
    stopBattlefield();
    try { localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_SLOT); } catch (e) {}
    showAuth();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------------- 進入遊戲 ----------------
  function enterGame(slot) {
    msg('載入中…');
    clearCombatLog();   // 換角色時不要把上一隻的戰鬥訊息播出來
    api('POST', '/enter', { slot: slot }).then(function (r) {
      NET.slot = slot;
      NET.online = true;
      try { localStorage.setItem(LS_SLOT, String(slot)); } catch (e) {}
      _lastRev = 0;                       // 換角色時版本重新起算
      /* 自動登入不會經過選角畫面 → 雇傭候選名單的快取要在這裡補抓 */
      if (!NET._charsCache) {
        api('GET', '/chars').then(function (r2) { NET._charsCache = r2.chars; }).catch(function () {});
      }
      applySnapshot(r.snapshot, r.rev, r.slot);
      neutralizeLocal();
      unmask();
      showBar();
      bootUI();
      if (r.offline && r.offline.elapsedMs) reportOffline(r.offline);
      startSync();
    }).catch(function (e) {
      if (e.code === 401) { NET.token = null; return showAuth(); }
      msg(e.message, 'err');
    });
  }

  /* 把伺服器的權威快照寫進引擎的 state。
     engine.js 的 `let state` 與本檔共用同一個 global lexical scope,
     所以這行是真的寫進去,不是另外做一個同名變數。 */
  var _lastRev = 0;
  /* 丟棄過期的回應。
     tick 每 2 秒發一次,玩家改設定時的 act/option 可能比它晚送早回 ——
     若不比對版本,一個在切換前就已經在飛的 tick 回來後會用舊快照
     把新設定蓋掉,玩家看到的就是「改了又自己跳回去」。
     rev 由伺服器單調遞增,比它舊的一律不採用。 */
  function applySnapshot(snap, rev, slot) {
    if (!snap) return;
    /* ⚠ 先確認這份快照是**現在這隻角色**的（feedback #254）。

       `rev` 是每隻角色各自的計數器，跨角色完全不可比。
       切角色時 _lastRev 歸零、套上新角色的快照（rev 可能只有 3），
       這時舊角色還在飛的 tick 回來、rev 16005 > 3 就會通過下面的檢查，
       把 state 換成上一隻角色的 —— 玩家看到的就是「別隻角色的技能與設定」，
       自動戰鬥頁也會因為職業對不上而渲染成空白。

       所以身分檢查要排在版本檢查**前面**：不是我這隻的，整份丟掉，
       連 _lastRev 都不能動（否則會把舊角色的高 rev 記進來，
       之後自己這隻的正常回應反而全被擋掉）。 */
    if (slot != null && NET.slot != null && String(slot) !== String(NET.slot)) return;
    if (rev != null) {
      if (rev < _lastRev) return;
      _lastRev = rev;
    }
    state = snap;
    try { if (typeof recomputeDerived === 'function') recomputeDerived(); } catch (e) {}
  }

  /* 關掉單機版的兩個本地權威來源:本地戰鬥迴圈、以及寫 localStorage 的存檔。
     不這樣做的話,前端會自己算一套數值,跟伺服器打架。 */
  function neutralizeLocal() {
    try { if (typeof stopLoop === 'function') stopLoop(); } catch (e) {}
    // 存檔只有伺服器寫得動;前端呼叫 saveGame 一律當作沒發生
    window.saveGame = function () {};
    window.saveGameThrottled = function () {};
    // 本地迴圈若被別處重新啟動,這裡讓它啟不起來
    window.startLoop = function () {};

    /* HUD 上三顆單機專用按鈕:接到線上模式該有的行為。
       用覆寫函式而不是藏 DOM —— HUD 每次重繪都會重建,藏了還會再冒出來。 */
    /* 存檔不在玩家手上,這些一律停用(按鈕已用 CSS 藏起來,
       這裡再擋一層,避免從 console 或殘留的 onclick 呼叫到)。 */
    ['exportSlotSave', 'exportFullBackupFile', 'importFullBackupFile',
     'importSaveToSlot', 'importWarehouse', 'deleteSlot'].forEach(function (fn) {
      if (typeof window[fn] === 'function') {
        window[fn] = function () {
          try {
            if (typeof logMsg === 'function') logMsg('☁️ 線上模式:角色存在伺服器上,不需要匯出匯入。');
            if (typeof renderLog === 'function') renderLog();
          } catch (e) {}
          return false;
        };
      }
    });

    window.manualSave = function () {
      // 玩家按「儲存」時給個明確回覆,而不是讓按鈕看起來壞掉
      /* logMsg 只把訊息推進緩衝區,要 renderLog 才會畫出來 —— 少了這步,
         玩家按下去會覺得按鈕沒反應。 */
      try {
        if (typeof logMsg === 'function') logMsg('☁️ 線上模式:進度由伺服器即時保存,不需要手動存檔。');
        if (typeof renderLog === 'function') renderLog();
      } catch (e) {}
      pull();
      return true;
    };
    window.backToTitle = function () {
      // 回選角而不是回單機的標題畫面
      stopSync();
      stopBattlefield();
      NET.online = false;
      showChars();
      return true;
    };
    /* exportSlotSave / exportFullBackupFile 刻意保留:
       玩家想把自己的存檔另存一份是合理的,而且匯出的就是伺服器給的快照。 */
  }

  /* 遊戲用 .screen / .screen.active 管理三個畫面
     (#screen-title 標題、#screen-create 建角、#screen-game 遊戲本體)。
     線上模式的登入、選角、建角都由本層接手,所以直接切到遊戲畫面,
     不走單機版的標題→建角流程。 */
  /* 放行被壓住的畫面。只留 display 那條(隱藏本機存檔入口),
     visibility 那條要拿掉,否則遊戲畫面也跟著看不見。 */
  function releaseScreens() {
    var pre = document.getElementById('ro-net-preclose');
    if (pre) pre.textContent = pre.textContent.replace('.screen{visibility:hidden !important}', '');
  }

  function bootUI() {
    /* 先藏住 <img>,再做任何渲染。
       renderAll() 會呼叫 updatePlayerSprite,而它在幀還沒載完時會把
       player_swordsman.png 頂上去 —— 晚一步藏,那張藍披風立繪就會露臉半秒。 */
    try {
      var pimg0 = document.getElementById('player-img');
      if (pimg0) pimg0.style.visibility = 'hidden';
    } catch (e) {}
    releaseScreens();
    // 清掉舊版本可能卡住的動畫 class
    try {
      var ps0 = document.getElementById('player-sprite');
      if (ps0) ps0.classList.remove('attacking', 'hurting');
    } catch (e) {}
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var g = document.getElementById('screen-game');
    if (g) g.classList.add('active');
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    try { if (typeof switchTab === 'function') switchTab('map'); } catch (e) {}
    try { if (typeof renderTopBar === 'function') renderTopBar(); } catch (e) {}
    reloadPlayerFrames();
    /* 地圖背景:單機版是 initApp 時呼叫,線上模式進遊戲的路徑不同,
       不補這一行 #map-bg-img 的 src 會是空的,整個戰鬥區就是一片純色。 */
    try { if (typeof renderMapBackground === 'function') renderMapBackground(); } catch (e) {}
    startBattlefield();
    hookChatInput();
    wsConnect();
  }

  /* 角色的逐幀動畫(images/frames/<職業>_<性別>/)。
     ui.js 的 loadAnimFrames 有一行 `if (key in animFramesLoaded) return`——
     只要在頁面初始化的早期時機失敗過一次,就永久記住失敗、再也不重試,
     角色從此退回 player_swordsman.png 那張靜態立繪。
     線上模式的 state 是登入後才拿到的,正好會撞上這個時機,
     所以進遊戲時把該職業的快取清掉、重載一次。 */
  function reloadPlayerFrames() {
    try {
      if (typeof getAnimKey !== 'function' || typeof loadAnimFrames !== 'function') return;
      var k = getAnimKey();
      if (typeof animFramesLoaded !== 'undefined') delete animFramesLoaded[k];
      if (typeof animFrameImages !== 'undefined') delete animFrameImages[k];
      /* 載入期間先藏住 <img>:updatePlayerSprite 會拿 player_swordsman.png
         當 fallback,不藏的話進遊戲會先閃一下那張藍披風立繪才切成逐幀角色。
         用 visibility 而不是 display,才不會讓版面跳動。 */
      var pimg = document.getElementById('player-img');
      if (pimg) pimg.style.visibility = 'hidden';
      loadAnimFrames(k).then(function () {
        try {
          baseAnimKey = null;                 // 逼 updatePlayerSprite 重新切換,別吃 early return
          if (typeof updatePlayerSprite === 'function') updatePlayerSprite();
        } catch (e) {}
        /* 載完才放行:有幀就顯示 canvas、img 本來就被 updatePlayerSprite 設成
           display:none;沒幀(該職業沒有素材)才會露出立繪,那是正確的 fallback。 */
        if (pimg) pimg.style.visibility = '';
      }).catch(function () { if (pimg) pimg.style.visibility = ''; });
    } catch (e) {}
  }

  /* 畫面更新一律走遊戲自己的 onTickUI() —— 它本來就是單機版每個 tick 在用的:
     只改數值、怪物 id 沒變就只跑 updateMonsterHp(),不重建 DOM。

     ⚠️ 千萬不要在這裡呼叫 renderAll():它會 renderMonster() + switchTab() 把整片
     重畫,傷害飄字與怪物受擊動畫剛掛上去就被清掉 —— 畫面看起來就完全不會動,
     即使數值一直在漲。完整重建只在進遊戲那一次(bootUI)做。 */
  function repaint() {
    try {
      if (typeof onTickUI === 'function') onTickUI();
      else {
        if (typeof renderTopBar === 'function') renderTopBar();
        if (typeof updateMonsterHp === 'function') updateMonsterHp();
      }
    } catch (e) {}
    /* ⚠️ 一定要在重繪「之後」才套座標。
       onTickUI 在怪的 id 清單一變時會整個 renderMonster() 重建,
       重建出來的是預設站位 —— 先套再重繪等於白套,
       畫面上就是「砍死一隻怪,其他怪全部彈回出生點」。 */
    try { applyBattlefield(); } catch (e) {}
    try { faceTarget(); } catch (e) {}
    try { updateEquipDoll(); } catch (e) {}
    try { hookEquipSkin(); } catch (e) {}
    try { decorateBag(); bindBagPop(); watchBag(); } catch (e) {}
    try { watchEquipTab(); } catch (e) {}
    try { ensureDropsBtn(); } catch (e) {}
    try { ensureHidePlayersBtn(); } catch (e) {}
    try { hookSkillCastAnim(); } catch (e) {}
  }

  function reportOffline(off) {
    /* 以前這裡只印一行「已結算完成」,玩家完全看不到賺了多少 ——
       多位玩家回報「回來沒有顯示離線收益」(#42)。
       伺服器算出來的 off 跟單機版是同一支 computeOfflineProgress() 的產物,
       所以直接走單機版那個統一出口:依玩家設定跳收益彈窗或 toast,
       並把這一筆記進掛機報告。 */
    try {
      if (off && typeof deliverOfflineResult === 'function') { deliverOfflineResult(off); return; }
    } catch (e) {}
    try {
      if (typeof logMsg === 'function') {
        logMsg('🌙 離線期間的收益已由伺服器結算完成。');
      }
    } catch (e) {}
  }

  // ---------------- 戰鬥日誌回放 ----------------
  /* 伺服器每次同步會回一批戰鬥訊息。直接全部丟給 logMsg 的話,
     兩秒內的二十幾則會同時觸發動畫,看起來像閃屏 ——
     所以進佇列、固定節奏一則一則播,畫面才有在打的感覺。
     logMsg 本身就會處理傷害飄字、揮劍動作、怪物死亡與畫面日誌。 */
  var logQueue = [];
  var logTimer = null;
  /* 揮刀動畫全長約 620ms(衝出 .16s + 停頓 + 收回 .22s + 復位 .24s)。
     播放間隔比動畫短的話,動畫會不斷被下一則打斷重播,
     但傷害數字每則都跳 —— 畫面上就是「刀揮一次、數字跳四下」。 */
  /* 連擊感(2026-08-26 老闆指定,玩家 #71 要的「傷害數字疊加、爆擊連連」)。
     以前一則攻擊訊息要 200ms 才播一則 —— 每秒最多 5 個數字,
     而且飄字的錯開計數也是每 200ms 歸零,連續攻擊的數字根本疊不起來,
     看起來就是「一下一下、鈍鈍的」。
     縮短到 90ms,並把「積壓就快轉」的門檻一起降低,讓連打時數字連成一串。 */
  /* 悠閒時的播放間隔(上限)。實際間隔由 pacedDelay() 依佇列長度往下調。 */
  var LOG_PLAY_MS = 200;
  var LOG_PLAY_MIN_MS = 45;      // 再快人眼也分不出來,而且會把動畫打斷
  var HIT_DELAY = 160;      // 揮刀起手到命中的間隔,讓刀先出去再掉血

  /* 玩家精靈的動作。attacking 與 hurting 必須互斥 ——
     兩個 class 特異性一樣,同時掛著時後定義的那個會贏,
     而 engine.js 的 logMsg 只會 remove('attacking'),不會管 hurting。
     第一次挨打之後 hurting 就永遠黏著,攻擊動畫從此再也播不出來。
     所以這裡統一:播之前先兩個都清掉,播完再清一次。 */
  /* 玩家精靈的動作。
     繞了兩條死路才用這個寫法,記錄下來免得有人again去「改良」它:
       ① CSS class(.attacking/.hurting):engine.js 的 logMsg 只 remove/add
          'attacking' 卻不碰 'hurting',而兩條規則特異性相同、後定義的 hurting 勝出
          → hurting 一旦掛上,瀏覽器就再也看不到變化,動畫不重播、animationend
          不觸發、class 永遠清不掉。連手動 remove+offsetWidth+add 都叫不動。
       ② Web Animations API:animate() 跑完 computed transform 仍是 identity,
          在這個元素上沒有實際套用。
     inline style + transition 是最原始的做法,但它就是會動。 */
  /* 近戰要衝到怪身邊再砍。距離實際量玩家與目標怪的水平間距後取六成,
     怪站得遠就衝得遠;遠攻模式與弓箭手不衝,只做原地的小幅前傾。 */
  /* 有了戰場座標之後,人平時就已經走到目標旁邊,
     攻擊只需要小幅前傾,不必再從老家衝過去。 */
  function attackDash() { return isRangedNow() ? 8 : 16; }

  /* 玩家精靈的動作。
     繞了兩條死路才用這個寫法,記錄下來免得有人又去「改良」它:
       ① CSS class(.attacking/.hurting):engine.js 的 logMsg 只 remove/add
          'attacking' 卻不碰 'hurting',而兩條規則特異性相同、後定義的 hurting 勝出
          → hurting 一旦掛上,瀏覽器就再也看不到變化,動畫不重播、animationend
          不觸發、class 永遠清不掉。連手動 remove+offsetWidth+add 都叫不動。
       ② Web Animations API:animate() 跑完 computed transform 仍是 identity,
          在這個元素上沒有實際套用。
     inline style + transition 是最原始的做法,但它就是會動。 */
  /* ⚠️ transition 是整個屬性,只寫 transform 會把 CSS 裡 left/top 的
     2 秒過渡一併清掉 —— 揮刀期間收到新座標就會瞬移(實測單格 207px)。
     所以動畫期間必須把位移的過渡一起帶著寫。 */
  var MOVE_TR = 'left 2s linear,top 2s linear,';

  function playSpriteAnim(kind) {
    var ps = document.getElementById('player-sprite');
    if (!ps) return;
    // 有 RO 素材時,除了位移特效再播真正的動作。
    // 攻擊:上一刀的刀鋒還沒掃過去就讓它演完,不要重新起手。
    try {
      if (kind === 'hurting') plPlay('hit', true);
      else if (!plAttackBusy()) plPlay('attack', true);
    } catch (e) {}
    if (ps._roT1) clearTimeout(ps._roT1);
    if (ps._roT2) clearTimeout(ps._roT2);
    /* 玩家設定的「人物大小」也是掛在同一個 transform 上(ui.js applySpriteScale)。
       這裡直接覆寫、最後清成 '' 會把縮放弄丟 —— 攻擊完人變回原始大小、
       走路時才是設定的大小,看起來就是「忽大忽小」。
       所以每次寫都把縮放帶上,收尾交還給 applySpriteScale()。 */
    var SC = '';
    try {
      var _r = (spriteScalePct() / 100) * ((typeof castingAnim !== 'undefined' && castingAnim) ? skillSpriteScalePct() / 100 : 1);
      SC = 'scale(' + _r.toFixed(3) + ') ';
    } catch (e) { SC = ''; }
    var restoreScale = function () {
      try { applySpriteScale(); } catch (e) { ps.style.transform = ''; }
    };
    if (kind === 'hurting') {
      ps.style.transition = MOVE_TR + 'transform .1s ease-out';
      ps.style.transform = SC + 'translateX(-10px)';
      ps._roT1 = setTimeout(function () {
        ps.style.transform = SC + 'translateX(0px)';
        ps._roT2 = setTimeout(function () { ps.style.transition = ''; restoreScale(); }, 130);
      }, 110);
      return;
    }
    var d = attackDash();
    var dashing = d > 20;
    // 衝出去(近戰帶點前傾),停一下揮刀,再退回原位
    ps.style.transition = MOVE_TR + 'transform ' + (dashing ? '.16s cubic-bezier(.25,.9,.3,1)' : '.1s ease-out');
    ps.style.transform = SC + 'translateX(' + Math.round(d) + 'px) rotate(' + (dashing ? 6 : 4) + 'deg)';
    ps._roT1 = setTimeout(function () {
      ps.style.transition = MOVE_TR + 'transform ' + (dashing ? '.22s ease-in-out' : '.14s ease-out');
      ps.style.transform = SC + 'translateX(0px) rotate(0deg)';
      ps._roT2 = setTimeout(function () { ps.style.transition = ''; restoreScale(); }, dashing ? 240 : 150);
    }, dashing ? 240 : 120);
  }

  /* 掛在 document 上而不是元素上:animationend 會冒泡,
     這樣就算精靈之後被重建也不必重綁。 */
  if (!window.__roAnimCleanup) {
    window.__roAnimCleanup = true;
    document.addEventListener('animationend', function (e) {
      if (!e.target || e.target.id !== 'player-sprite') return;
      if (e.animationName === 'ro-atk-swing') e.target.classList.remove('attacking');
      if (e.animationName === 'ro-hurt-recoil') e.target.classList.remove('hurting');
    }, true);
  }

  function feedCombatLog(list) {
    if (!list || !list.length) return;
    logQueue = logQueue.concat(list);
    if (logQueue.length > 90) logQueue = logQueue.slice(-90);
    if (!logTimer) {
      /* 自適應節奏(2026-08-26):這一批有幾則,就分配在同步間隔內播完。
         固定 200ms 的話一批最多播 17 則,攻速一高就永遠追不上,
         只能靠「整批快轉」補償 —— 動作互相打斷,那就是玩家說的「鈍、飄」。
         原版是單機、打了就馬上跳數字,這裡等於把那個節奏還原回來。 */
      function pacedDelay() {
        var n = logQueue.length;
        if (n <= 1) return LOG_PLAY_MS;
        var d = Math.floor(TICK_INTERVAL_MS / n);
        return Math.max(LOG_PLAY_MIN_MS, Math.min(LOG_PLAY_MS, d));
      }
      var tickLog = function () {
        if (!logQueue.length) { logTimer = null; return; }
        /* 節奏已經自適應,不再需要「積壓就一次演好幾則」的快轉。
           只在極端積壓(超過一個同步週期的量)時才併發,當保險用。 */
        var burst = logQueue.length > 60 ? 3 : 1;
        /* 人還沒跑到就先押住攻擊訊息不播:logMsg 內部會畫傷害飄字,
           照舊播的話「文字不演動作」其實還是會在怪頭上蹦數字。
           保險絲 2.6 秒(略大於一個座標過渡),積壓快轉時不押(怪早死了,演完要緊)。 */
        /* 自適應保險(玩家 #52「角色常常站在原地沒有一直在攻擊」、
           #61「看不到打怪的數字,就只會走來走去」):
           距離判斷是量畫面上的實際像素,只要有一種情況讓它永遠不成立
           (立繪縮放、地圖寬度、目標挑錯…),每一則攻擊訊息都要等滿 2.6 秒才播,
           玩家看到的就是「走來走去、偶爾才打一下」。
           連續被保險絲強制放行三次 = 這個閘對這位玩家沒在正常運作,
           先關掉 30 秒讓戰鬥看起來正常;30 秒後再自己試一次,
           真的好了就會恢復押住(不會永久放棄「跑到才揮刀」的效果)。 */
        /* 關閘期滿之後留在「差一次就再關」的狀態:這位玩家的距離判斷已經被證實不可靠,
           每 30 秒重新累積三次(每次 2.6 秒)等於固定要卡 8 秒,體感還是不順。
           留 2 表示再失敗一次就立刻關回去;真的恢復正常了,計數會被正常播出清成 0。 */
        if (logGateOffUntil && Date.now() > logGateOffUntil) { logGateOffUntil = 0; logForcedReleases = 2; }
        if (!logGateOffUntil
            && logQueue.length <= 24 && ATK_RE.test(logQueue[0]) && targetSlot() && !inAttackRange()) {
          if (!logHoldSince) logHoldSince = Date.now();
          if (Date.now() - logHoldSince < 2600) { logTimer = setTimeout(tickLog, LOG_PLAY_MS); return; }
          if (++logForcedReleases >= 3) logGateOffUntil = Date.now() + 30000;
        } else if (!logHoldSince) {
          logForcedReleases = 0;      // 正常播出過就重新計數
        }
        logHoldSince = 0;
        /* 快轉時「文字全印、動作只演一次」。
           一次揮刀就該對應一個傷害數字 —— 一批演四次動作是不可能的
           (動畫互相打斷,最後只看得到一次),但數字會跳四下。 */
        var actedAtk = false;
        while (burst-- > 0 && logQueue.length) {
          var line = logQueue.shift();
          var atk = ATK_RE.test(line);
          playOneLog(line, atk && actedAtk);
          if (atk) actedAtk = true;
        }
        logTimer = setTimeout(tickLog, pacedDelay());
      };
      logTimer = setTimeout(tickLog, pacedDelay());
    }
  }

  var ATK_RE = /^你.{0,20}造成 \d+ 點傷害/;
  /* 隊友那一刀的訊息開頭是隊友的名字,不是「你」(engine.js 把「你」換成隊友名),
     所以 ATK_RE 永遠不匹配 —— 攻擊分支整段沒被執行過,隊友當然沒有動作。
     捕獲組順便把名字抓出來給 allyAttackAnim 用。 */
  var ALLY_ATK_RE = /^(.{1,16}?)對 .{0,20}造成 \d+ 點傷害/;
  var logHoldSince = 0;   // 攻擊訊息因「人還沒到位」被押住的起點(保險絲用)
  var logForcedReleases = 0;  // 連續被保險絲強制放行的次數
  var logGateOffUntil = 0;    // 這個時間之前不押住(自適應保險,見上面的說明)

  /* 小人到得了怪身邊了嗎?
     引擎的戰鬥完全不看座標,所以人還在半路時傷害就已經在結算。
     沒貼到之前只印文字不揮刀,免得看到「隔著半張地圖空揮」。 */
  function inAttackRange() {
    try {
      /* 🔴 不可用伺服器座標(state.bfx vs m.bx)判斷 ——
         伺服器的小人 45%/秒,一個 tick 內就已經站到怪旁邊,
         這個閘等於永遠開著;畫面上的人卻還在 2 秒 CSS 過渡的半路,
         結果就是「隔半張圖,數字照樣跳」(玩家回報三次的那個)。
         跟朝向同一個教訓:凡是「玩家看得到的判斷」一律量 getBoundingClientRect。 */
      var ps = document.getElementById('player-sprite');
      var c = ps && ps.querySelector('canvas');
      var slot = targetSlot();
      var img = slot && slot.querySelector('img');
      if (!c || !img) return true;
      var pr = c.getBoundingClientRect(), mr = img.getBoundingClientRect();
      if (!pr.width || !mr.width) return true;
      var d = Math.hypot((mr.left + mr.width / 2) - (pr.left + pr.width / 2),
                         (mr.top + mr.height / 2) - (pr.top + pr.height / 2));
      // 門檻照戰場實寬換算(meleeGap 6.8% + 容差;遠攻本來就該遠遠打)
      var scene = document.getElementById('battle-scene');
      var w = (scene && scene.clientWidth) || 1400;
      return d <= w * (isRangedNow() ? 0.5 : 0.11);
    } catch (e) { return true; }
  }

  /* 有新版本就在底部跳一顆按鈕(2026-08-26 老闆:學紅獅)。
     部署時 stamp.js 會重寫 version.txt,這裡每分鐘比一次;
     玩家點一下就重新載入,不必再教他按 Ctrl+F5 —— 之前修好的東西
     玩家常常因為吃舊快取而完全看不到。 */
  /* 這份頁面是哪一版（stamp.js 部署時寫進 index.html 的 meta）。 */
  function currentBuild() {
    try {
      var m = document.querySelector('meta[name="ro-build"]');
      var v = m && m.getAttribute('content');
      return v ? String(v).trim() : null;
    } catch (e) { return null; }
  }
  /* 🔴 基準要取自「**我這份頁面是哪一版**」，不是第一次輪詢的結果。

     原本寫 `var _verSeen = null;` 再由第一次輪詢填進去 —— 那等於把伺服器的
     現況當成自己的版本，於是**吃到舊快取的玩家永遠不會被提示**：
     他載入舊 JS，第一次輪詢拿到新版號存成基準，之後每次都相等。
     提示只有在「他掛著的時候我們又部署一次」才會跳。

     acc806 因此連報四次「法老王卡片插不上」（伺服器早就改好了），
     feedback #311 也是同一件。改成讀 index.html 裡的 <meta name="ro-build">，
     那是 stamp.js 部署時寫進去的，跟這份頁面載入的 js 是同一版。
     ⚠ 舊分頁沒有這個 meta → 回傳 null → 維持原本行為，不會更糟。 */
  var _verSeen = currentBuild();
  /* @param ver 這次偵測到的新版號 —— 按「稍後」時要記起來,
     否則 checkVersion() 每分鐘會再彈一次（acc201 #1410:「一直跳出更新」）。 */
  function showUpdateBar(ver) {
    if (document.getElementById('ro-update-bar')) return;
    var d = document.createElement('div');
    d.id = 'ro-update-bar';
    d.innerHTML = '<span id="ro-update-what">🆕 有新版本了！</span>' +
      '<button type="button">立即更新</button>' +
      '<button type="button" class="later">稍後</button>';
    try {
      /* ⚠ whatsnew.txt 要帶 `#ver=<版本>` 標明它是寫給哪一版的。
         對不上就**維持預設的「有新版本了！」** —— 那份說明是舊的，
         照著顯示等於每次部署都告訴玩家同一件早就上線的事
         （acc683 #1504：「為什麼一直跳出『離線打頭目恢復掉落』」）。
         不知道這一版改了什麼，就不要亂講。 */
      fetch('whatsnew.txt?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) {
          t = (t || '').trim();
          var el = document.getElementById('ro-update-what');
          if (!el || !t) return;
          var m = /#ver=([A-Za-z0-9._-]+)/.exec(t);
          if (!m || !ver || m[1] !== String(ver)) return;      // 說明過期就不顯示標題
          var _h = t.split(String.fromCharCode(10))
            .map(function (x) { return x.trim(); })
            .filter(function (x) { return x && x.indexOf('#ver=') !== 0; })[0] || '';
          if (!_h) return;
          if (_h.length > 22) _h = _h.slice(0, 22) + '…';
          el.textContent = (_h.indexOf('🆕') === 0 ? _h : '🆕 ' + _h);
        })
        .catch(function () {});
    } catch (e) {}
    var bs = d.querySelectorAll('button');
    /* ⚠ 不要另寫一份「清快取重載」—— 登入畫面那顆「強制更新」已經有 forceFreshReload()，
       它做的事一模一樣（清 CacheStorage、註銷 SW、換帶時間戳的 URL）。
       我一度在這裡加了第二份 hardReload()，那正是這個檔案的註解一再警告的
       「兩邊各寫一份遲早分岔」。改成共用同一支。 */
    bs[0].onclick = function () { forceFreshReload(); };
    /* 「稍後」＝這個版本不要再吵我。
       ⚠ 一定要更新 _verSeen —— 只 remove() 的話 checkVersion() 每分鐘
         會發現 `v !== _verSeen` 仍然成立,一分鐘後又彈一次,永遠不停。
       ⚠ 只記在記憶體:重新整理本來就會拿到新版本,那時再提示是對的。
       ⚠ 之後真的又有**更新的**版本時照樣會提示（版號不同就會再進來）。 */
    bs[1].onclick = function () {
      if (ver) _verSeen = ver;
      try { d.remove(); } catch (e) {}
    };
    document.body.appendChild(d);
  }
  function checkVersion() {
    try {
      fetch('version.txt?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (v) {
          if (!v) return;
          v = String(v).trim();
          if (!_verSeen) { _verSeen = v; return; }
          if (v === _verSeen) return;
          /* 🔴 版本不符，而且我這份頁面是有 meta 的（＝新的 stamp 產出）——
             那就是「舊 index.html + 被 immutable 鎖住的舊 js」那個狀況。
             這種情況顯示更新列往往沒用：玩家按了重整，還是回到同一份被快取的
             index.html，於是永遠拿不到新的 ?v=。
             所以自動做一次 forceFreshReload()（換成帶時間戳的網址，繞開快取）。
             一個分頁只自動救一次，救完仍不符就退回原本讓玩家自己決定的行為。 */
          try {
            if (currentBuild() && !sessionStorage.getItem('ro_autofresh')) {
              sessionStorage.setItem('ro_autofresh', String(Date.now()));
              forceFreshReload();
              return;
            }
          } catch (e) { /* sessionStorage 不可用就走原本的路 */ }
          showUpdateBar(v);
        })
        .catch(function () {});
    } catch (e) {}
  }
  /* 更新內容彈窗(老闆:玩家點更新後要看得到改了什麼)。以 whatsnew.txt 內容為 key,
     沒看過這一則就彈一次,按「知道了」記進 localStorage。每次部署更新 whatsnew.txt 就會再彈。 */
  function maybeShowWhatsnew() {
    try {
      fetch('whatsnew.txt?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) {
          t = (t || '').trim();
          if (!t) return;
          var seen = ''; try { seen = localStorage.getItem('ro_seen_whatsnew') || ''; } catch (e) {}
          if (seen === t) return;
          if (document.getElementById('ro-whatsnew-pop')) return;
          var ov = document.createElement('div'); ov.id = 'ro-whatsnew-pop';
          var box = document.createElement('div'); box.className = 'wn-box';
          var ti = document.createElement('div'); ti.className = 'wn-title'; ti.textContent = '🆕 更新內容';
          /* `#ver=` 是給程式看的版本標記，不要印給玩家（上面讀版本那段本來就有濾）。
             ⚠ 「看過沒」的 key 仍然用原始全文 t —— 換成濾過的會讓所有人再被彈一次。 */
          var wnBody = t.split(/\r?\n/).filter(function (x) { return x.indexOf('#ver=') !== 0; })
            .join('\n').replace(/\n{3,}/g, '\n\n').trim();
          /* WN-DIVIDER-START 各篇之間加分隔線（acc227 #4232：篇數多、字又長，看不出一篇在哪裡結束）。
             一篇＝空行後面接「【」開頭的標題行；第一篇前面不加。只改顯示，上面的 key 仍是原始全文 t。 */
          wnBody = (function (body) {
            var L = body.split('\n'), out = [], heads = 0;
            for (var i = 0; i < L.length; i++) {
              var isHead = L[i].indexOf('\u3010') === 0 && (i === 0 || L[i - 1].trim() === '');
              if (isHead) { heads++; if (heads > 1) out.push('\u2501'.repeat(20), ''); }
              out.push(L[i]);
            }
            return out.join('\n');
          })(wnBody);
          /* WN-DIVIDER-END */
          var bd = document.createElement('div'); bd.className = 'wn-body'; bd.textContent = wnBody || t;
          var bt = document.createElement('button'); bt.className = 'wn-close'; bt.textContent = '知道了';
          bt.onclick = function () { try { localStorage.setItem('ro_seen_whatsnew', t); } catch (e) {} ov.remove(); };
          box.appendChild(ti); box.appendChild(bd); box.appendChild(bt); ov.appendChild(box);
          ov.onclick = function (e) { if (e.target === ov) bt.onclick(); };
          document.body.appendChild(ov);
          // store-on-show:一顯示就記住,不管玩家怎麼關(點知道了/重載/關分頁),同一則只彈一次
          try { localStorage.setItem('ro_seen_whatsnew', t); } catch (e) {}
        }).catch(function () {});
    } catch (e) {}
  }
  setTimeout(maybeShowWhatsnew, 2500);
  /* 玩家信箱(老闆:玩家有事可寄信給 GM,GM 可回覆個別玩家)。用同一支帶 token 的 api()。 */
  function ensureMailBtn() {
    if (document.getElementById('ro-mail-btn')) return;
    var b = document.createElement('div'); b.id = 'ro-mail-btn'; b.title = '信箱 / 聯絡 GM';
    b.innerHTML = '📬<span id="ro-mail-badge"></span>';
    b.onclick = openMailbox;
    document.body.appendChild(b);
  }
  function refreshMailBadge() {
    if (!NET.token) return;
    api('POST', '/mail/unread', {}).then(function (j) {
      var el = document.getElementById('ro-mail-badge'); if (!el) return;
      if (j && j.unread > 0) { el.textContent = j.unread > 9 ? '9+' : j.unread; el.style.display = 'block'; }
      else el.style.display = 'none';
    }).catch(function () {});
  }
  function loadMailThread() {
    api('POST', '/mail/mine', {}).then(function (j) {
      var el = document.getElementById('ro-mail-thread'); if (!el) return;
      var rows = (j && j.rows) || [];
      if (!rows.length) { el.innerHTML = '<div class="mail-empty">還沒有信件。有問題想跟 GM 說,在下面寫給我們吧!</div>'; }
      else {
        el.innerHTML = rows.map(function (m) {
          var gm = m.dir === 1;
          /* 附件（老闆 2026-09-01:補償走信箱）。只有 GM 信會有。
             WARN 道具名稱用 textContent 塞,不進 innerHTML —— 名稱是資料不是版面。 */
          var att = '';
          if (gm && m.attach) {
            att = '<div class="mail-attach" data-mid="' + m.id + '">'
              + '<span class="mail-attach-list"></span>'
              + (m.claimed
                  ? '<span class="mail-attach-done">✅ 已領取</span>'
                  : '<button type="button" class="mail-attach-btn">📥 領取</button>')
              + '</div>';
          }
          return '<div class="mail-msg ' + (gm ? 'from-gm' : 'from-me') + '"><div class="mail-who">'
            + (gm ? '🛡️ GM' : '你') + '</div><div class="mail-c"></div>' + att + '</div>';
        }).join('');
        var nodes = el.querySelectorAll('.mail-c');
        rows.forEach(function (m, i) { if (nodes[i]) nodes[i].textContent = m.content; });
        rows.forEach(function (m) {
          if (!(m.dir === 1 && m.attach)) return;
          var box = el.querySelector('.mail-attach[data-mid="' + m.id + '"]');
          if (!box) return;
          var list; try { list = JSON.parse(m.attach); } catch (e) { list = []; }
          var span = box.querySelector('.mail-attach-list');
          if (span) {
            span.textContent = '📦 附件：' + list.map(function (x) {
              var d = (typeof ITEMS !== 'undefined') && ITEMS[x.item];
              return ((d && d.name) || x.item) + ' ×' + x.qty;
            }).join('、');
          }
          var btn = box.querySelector('.mail-attach-btn');
          if (btn) btn.onclick = function () {
            btn.disabled = true; btn.textContent = '領取中…';
            api('POST', '/mail/claim', { id: m.id, slot: NET.slot }).then(function (r) {
              applySnapshot(r.snapshot, r.rev, r.slot);
              try { if (typeof logMsg === 'function') logMsg('📥 已領取信件附件。'); } catch (e) {}
              loadMailThread();
            }).catch(function (e) {
              btn.disabled = false; btn.textContent = '📥 領取';
              alert((e && e.message) || '領取失敗');
            });
          };
        });
        el.scrollTop = el.scrollHeight;
      }
      refreshMailBadge();
    }).catch(function (e) {
      /* ⚠ 這裡原本是 `.catch(function () {})`，把錯誤整個吞掉。
         載入失敗時畫面完全沒反應，跟「沒有信件」長得一模一樣——
         玩家只會覺得「信箱壞了」，而我們這邊什麼線索都沒有。
         #1122 那個 bug 難查就是因為這行。至少要讓玩家看得到出事了。 */
      var el = document.getElementById('ro-mail-thread');
      if (el) el.innerHTML = '<div class="mail-empty">信件載入失敗,請稍後再試。'
        + '(' + ((e && e.message) || e || '未知錯誤') + ')</div>';
    });
  }
  function openMailbox() {
    if (document.getElementById('ro-mail-modal')) return;
    var ov = document.createElement('div'); ov.id = 'ro-mail-modal';
    ov.innerHTML = '<div class="mail-box"><header><b>📬 信箱</b><button class="mail-x">✕</button></header>' +
      /* 巴哈討論串(老闆指定):放在信箱最上面,一打開就看得到。
         會寄信給 GM 的人正是最想討論的人,擺在這裡比擺在首頁被看到的機會高。
         target=_blank + rel=noopener —— 不要把玩家的遊戲分頁帶走,他掛機中。
         網址裡的 & 要寫 &amp;:這段是丟進 innerHTML 的,原樣的 & 在 HTML 裡不合法。 */
      '<div class="mail-bhnote">📣 巴哈討論串已開:'
        + '<a href="https://forum.gamer.com.tw/C.php?bsn=60603&amp;snA=495&amp;tnum=1"'
        + ' target="_blank" rel="noopener">【情報】接續開發 RO 放置遊戲 V1.14</a>'
        + '<span>（獨立遊戲 Indie Game 哈啦板）想跟其他玩家討論或給建議，歡迎過去留言</span></div>' +
      '<div class="mail-thread" id="ro-mail-thread">載入中…</div>' +
      '<div class="mail-compose"><textarea id="ro-mail-text" maxlength="1000" placeholder="有問題想跟 GM 說?寫在這裡,GM 會在信箱回覆你…"></textarea>' +
      '<button class="mail-send" id="ro-mail-send">寄給 GM</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.mail-x').onclick = function () { ov.remove(); };
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    document.getElementById('ro-mail-send').onclick = function () {
      var ta = document.getElementById('ro-mail-text'); var t = (ta.value || '').trim();
      if (t.length < 2) return;
      var btn = this; btn.disabled = true;
      var nm = ''; try { nm = (window.state && state.name) || ''; } catch (e) {}
      api('POST', '/mail/send', { content: t, name: nm }).then(function () {
        ta.value = ''; loadMailThread();
      }).catch(function (e2) { alert('寄信失敗:' + (e2 && e2.message || e2)); }).then(function () { btn.disabled = false; });
    };
    loadMailThread();
  }
  window.openMailbox = openMailbox;
  setInterval(function () { if (NET.token) { ensureMailBtn(); refreshMailBadge(); } }, 60000);
  setTimeout(function () { if (NET.token) { ensureMailBtn(); refreshMailBadge(); } }, 4000);
  setTimeout(checkVersion, 3000);
  setInterval(checkVersion, 60000);

  /* 讓某個隊友的立繪做一次突刺。名字從戰鬥訊息開頭取(引擎把「你」換成隊友名)。 */
  function allyAttackAnim(name) {
    if (!name) return;
    try {
      var figs = document.querySelectorAll('.ally-figure');
      for (var i = 0; i < figs.length; i++) {
        var ti = figs[i].getAttribute('title') || '';
        if (ti.indexOf(name) !== 0) continue;
        (function (el) {
          el.classList.remove('atk');
          void el.offsetWidth;                       // 重設動畫,連續攻擊每刀都看得到
          el.classList.add('atk');
          setTimeout(function () { el.classList.remove('atk'); }, 340);
        })(figs[i]);
        return;
      }
    } catch (e) {}
  }

  function playOneLog(t, quiet) {
    /* 伺服器把 lane 用 lane 前綴打在文字上(engine.js pushCombatLog),
       這裡解回來讓技能/隊友行進自己的視窗——不解的話全部掉進戰鬥欄。 */
    var lane = null;
    if (t && t.charCodeAt(0) === 1) {
      var pe = t.indexOf('', 1);
      if (pe > 0) { lane = t.slice(1, pe); t = t.slice(pe + 1); }
    }
    var isAtk = ATK_RE.test(t);
    var allyName = null;
    if (!isAtk && lane === 'ally') {
      var _m = t.match(ALLY_ATK_RE);
      if (_m) { isAtk = true; allyName = _m[1]; }
    }
    /* 距離檢查是「主角有沒有衝到怪面前」。隊友站的位置跟主角不同,
       拿主角的距離去擋會讓隊友的動作整批不演(隊友看起來都不攻擊)。 */
    if (isAtk && (!targetSlot() || (lane !== 'ally' && !inAttackRange()))) {
      /* 沒有活怪(還沒播完的舊帳),或人還沒衝到 —— 只留文字不演動作 */
      try { if (typeof logMsg === 'function') logMsg(t, lane); } catch (e) {}
      return;
    }
    if (isAtk) {
      if (quiet) {
        try { if (typeof logMsg === 'function') logMsg(t, lane); } catch (e) {}
        return;
      }
      if (lane === 'ally') {
        /* 隊友打的那一刀,本來是「主角替它揮」(engine.js 6868 明確跳過隊友動畫,
           前端這裡卻照播主角動作)——所以玩家看到隊友站著不動。改成讓隊友自己動。 */
        allyAttackAnim(allyName || t.split(/對|使用|施放/)[0].trim());
      } else {
        playSpriteAnim('attacking');
        try { if (typeof playAttackAnim === 'function') playAttackAnim(); } catch (e) {}
      }
      var crit = /暴擊/.test(t);
      setTimeout(function () {
        try { if (typeof logMsg === 'function') logMsg(t, lane); } catch (e) {}
        hitMonster(crit);
      }, plHitDelay());
      return;
    }
    try { if (typeof logMsg === 'function') logMsg(t, lane); } catch (e) {}
    /* 資訊欄預設收合後,操作類回饋(⚠️失敗/🤝雇傭/🔄更新)若只進日誌等於沒講——
       同步跳 toast 讓玩家當下看到。戰鬥類訊息不跳,不然會洗版。 */
    try {
      if (typeof showToast === 'function' && /^(⚠️|🤐|🤝|🔄|📛)/.test(t)) showToast(t);
    } catch (e) {}
    try {
      var m = /^(.+?) 對你造成 \d+ 點傷害/.exec(t);
      if (m) { playSpriteAnim('hurting'); markMobAttacking(m[1].trim()); }
      else if (/擊敗了/.test(t)) killMonsterFx(t);
    } catch (e) {}
  }

  /* 播放伺服器送來的技能施放事件。
     引擎跑在伺服器,前端的 castSkill 永遠不會執行(實測 gameTick 12 秒 0 次),
     所以 ui.js 的施放姿勢與技能特效在線上模式從來沒播過 ——
     44 組 _skill 素材等於閒置。這裡把它接回來。

     不解析中文日誌:showSkillCastEffect 要靠 sk.type 決定該不該擺施放姿勢
     (物理傷害技不擺,否則變成「舉手唸咒然後才砍下去」),
     光看日誌文字拿不到 type。 */
  function playCastEvents(ids) {
    if (!ids || !ids.length) return;
    if (typeof showSkillCastEffect !== 'function') return;
    /* 一輪可能施放好幾個(武僧連段、卡片的免費施放)。
       施放姿勢是職業共用的、播一次就夠(playSkillCastAnim 自己有 castingAnim 擋重播),
       特效 sprite 則只留最新一張 —— 所以取最後幾個就好,不必全播。 */
    var take = ids.slice(-3);
    for (var i = 0; i < take.length; i++) {
      try {
        var sk = (typeof findSkillById === 'function') ? findSkillById(take[i]) : null;
        if (sk) showSkillCastEffect(sk);
      } catch (e) {}
    }
  }

  /* 裝備視窗中央的角色立繪。
     跟遠端玩家用同一組素材(images/frames/<職業>_<性別>/frame_000.png),
     不跑逐幀 —— 這是靜態面板,沒必要為它多開一組動畫迴圈。 */
  var _dollKey = null;
  function updateEquipDoll() {
    if (!state) return;
    var job = state.jobId || 'novice';
    var g = (state.gender === 'female') ? 'female' : 'male';
    var alias = job;
    try { if (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[alias]) alias = SPRITE_ALIAS[alias]; } catch (e) {}
    var key = alias + '_' + g;
    if (key === _dollKey) return;              // 職業/性別沒變就不必重設
    _dollKey = key;
    var url = framesSrc(key + '/frame_000.png');
    /* 先確認圖真的載得到再套上去 —— 直接寫進 CSS 變數的話,
       圖不存在會變成一塊空白,反而比沒有紙娃娃更難看。 */
    var probe = new Image();
    probe.onload = function () {
      document.documentElement.style.setProperty('--ro-doll', 'url("' + url + '")');
      document.querySelectorAll('.equipwin').forEach(function (el) { el.removeAttribute('data-nodoll'); });
    };
    probe.onerror = function () {
      document.documentElement.style.removeProperty('--ro-doll');
      document.querySelectorAll('.equipwin').forEach(function (el) { el.setAttribute('data-nodoll', '1'); });
    };
    probe.src = url;
  }

  /* 設定類動作(自動販賣、自動戰鬥、隊友設定…)是「先改前端、再送伺服器」。
     這中間有一段空窗:週期性的 /tick 如果剛好在路上,它回來的快照是**改動之前**的,
     而 applySnapshot 的版本保護是 `rev < _lastRev` —— 沒有寫入的 tick 回傳同一個 rev,
     `<` 不成立就照樣套用,把玩家剛勾的設定蓋回去。
     玩家 #29 說的「設定到右邊後打到道具就跳回左邊,要按好幾次才會過去」就是這個。
     用一個在途計數擋住:設定還沒落地前不吃 tick 的快照(動作自己的回應照舊)。 */
  function sendOption(key, value) {
    if (!NET.online) return;
    if (!NET._pendingOpt) NET._pendingOptAt = Date.now();
    NET._pendingOpt = (NET._pendingOpt || 0) + 1;
    api('POST', '/option', { slot: NET.slot, key: key, value: value })
      .then(function (r) { applySnapshot(r.snapshot, r.rev, r.slot); repaint(); })
      .catch(function (e) {
        try { if (typeof logMsg === 'function') logMsg('⚠️ 設定沒存成功(' + key + '):' + e.message); } catch (x) {}
      })
      .then(function () { NET._pendingOpt = Math.max(0, (NET._pendingOpt || 1) - 1); });
  }

  /* ui.js 的設定函式全都是「改前端 state 再 saveGame()」,
     而線上模式 saveGame 不回寫伺服器 —— 兩秒後的快照就把設定蓋回去。
     這裡逐一包起來:先讓前端立刻反應(不然畫面會延遲兩秒),再送伺服器落地。
     ⚠️ autoSkillConfig 與 autoSupportSkills 不接的話,
     玩家設了自動施放技能等於沒設,戰鬥時根本不會照著跑。 */
  /* 每一項:[函式名, 自己的實作, 改完要呼叫的重繪函式]
     ⚠️ 不能「先跑自己的再呼叫原函式」——
     toggleEquipPanel 這種切換型的會被原函式再切一次,等於沒動。
     所以整支換掉,重繪自己叫。 */
  /* ---- 自動戰鬥/隊友/自動販賣 setter:全走 abSet 通道(#玩家回報:打勾切分頁就消失、
     自動買藥水永遠不會買)。這些全是 engine.js 的「改 state + saveGame」函式,
     伺服器 VM 裡有同名函式 —— 直接在伺服器上重放同一個呼叫。
     包法=先跑原函式(畫面立即反應)再送伺服器;都是帶明確參數的設定型,重放安全。 */
  var AB_PROXY = [
    'setAutoBuyPotion', 'setAutoBuySpPotion', 'setAutoBuyAspdPotion', 'setAutoBuyArrow', 'setAutoPotionEnabled', 'setAutoPotionTier', 'setAutoPotionFallback', 'setAutoPotionThreshold', 'setAutoSpPotionEnabled', 'setAutoSpPotionPrimary', 'setAutoSpPotionFallback', 'setAutoSpPotionThreshold', 'setAutoAspdPotionEnabled', 'toggleAutoAspdPotion', 'setAutoSkillMaster', 'setAutoHealHpThreshold', 'setAutoHealSpThreshold', 'setEnergyCoatEnabled', 'setEnergyCoatSpFloor', 'setFarmMode', 'toggleMvpMode', 'toggleMiniMode', 'setAutoSellEnabled', 'toggleAutoSellItem', 'autoSellAddMany', 'autoSellRemoveMany', 'autoSellClearAll', 'setVendingItems',   /* 露天商店(反饋#10) */ 'setAllyPotionCfg', 'setAllySpPotionCfg', 'setAutoBuyAllyPotion', 'setAutoBuyAllySpPotion', 'setAutoBuyAllyArrow', 'setAllyAmmo', 'setAutoBuyReviveLeaf', 'setAutoReviveAlly',
  ];

  var OPT_HOOKS = [
    /* 遇怪模式(近戰/遠攻):不接的話玩家切遠攻兩秒後就被快照蓋回近戰
       (巴哈玩家在上游版回報同款問題,我們這邊也中)。伺服器 OPTIONS 早就有
       encounterMode 的 apply(會同步 maxMonsters),缺的就是這條前端 hook。 */
    ['setEncounterMode', function (mode) {
      if (state) {
        state.encounterMode = mode;
        state.lastSpawnTime = 0;
        try { if (typeof recomputeDerived === 'function') recomputeDerived(false); } catch (e) {}
      }
      sendOption('encounterMode', mode);
    }, 'renderAutoBattleTab'],
    ['setShowOfflineModal', function (on) { if (state) state.showOfflineModal = !!on; sendOption('showOfflineModal', !!on); }, null],
    ['toggleEquipPanel', function () {
      var nv = !(state && state.equipPanelCollapsed);
      if (state) state.equipPanelCollapsed = nv;
      sendOption('equipPanelCollapsed', nv);
    }, 'renderEquipTab'],
    /* 戰鬥區喇叭靜音鈕（acc4289 #4272 MUTE-SYNC）。ui.js 的 toggleMute 只改前端 state.muted，
       applySnapshot 是 state = snap 整份換掉 ⇒ 下一次伺服器回應就蓋回、音樂又開始播。
       這裡照 toggleEquipPanel 的寫法整支接管：切旗標、更新按鈕、停／播音樂、再送伺服器（server OPTIONS.muted）。 */
    ['toggleMute', function () {
      var nv = !(state && state.muted);
      if (state) state.muted = nv;
      var btn = document.getElementById('btn-mute');
      if (btn) { btn.classList.toggle('is-muted', nv); btn.title = nv ? '取消靜音' : '靜音'; }
      try { if (nv) { if (typeof stopMusic === 'function') stopMusic(); } else if (typeof playMapMusic === 'function') { playMapMusic(); } } catch (e) {}
      sendOption('muted', nv);
    }, null],
    ['setSpriteScalePct', function (v) {
      var n = Math.max(50, Math.min(150, Math.round(v)));
      if (state) state.spriteScalePct = n;
      var t = document.getElementById('sprite-scale-text');
      if (t) t.textContent = n + '%';
      try { if (typeof applySpriteScale === 'function') applySpriteScale(); } catch (e) {}
      sendOption('spriteScalePct', n);
    }, null],
    ['setAutoSkillConfig', function (key, value) {
      if (state) { if (!state.autoSkillConfig) state.autoSkillConfig = {}; state.autoSkillConfig[key] = value; }
      sendOption('autoSkillConfig', { key: key, value: value === undefined ? null : value });
    }, 'renderAutoBattleTab'],
    ['toggleAutoSupportSkill', function (skillId, enabled) {
      if (state) {
        if (!state.autoSupportSkills) state.autoSupportSkills = {};
        state.autoSupportSkills[skillId] = !!enabled;
        /* 🔴 同一個名額只能開一個(規則同 ui.js 的 toggleAutoSupportSkill)。
           ⚠ 被關掉的那幾個**也要各送一則給伺服器** —— 只改前端的話,
             伺服器那邊還留著開啟狀態,下一個快照就把畫面蓋回去。 */
        if (enabled && typeof supportSlotConflicts === 'function') {
          supportSlotConflicts(state.autoSupportSkills, skillId).forEach(function (id) {
            state.autoSupportSkills[id] = false;
            sendOption('autoSupportSkills', { skillId: id, enabled: false });
          });
        }
        // 隱匿與偽裝互斥(規則同 ui.js:2393),前端也要跟著關,不然畫面跟伺服器不一致
        if (enabled && (skillId === 'hiding' || skillId === 'cloaking')) {
          state.autoSupportSkills[skillId === 'hiding' ? 'cloaking' : 'hiding'] = false;
        }
      }
      sendOption('autoSupportSkills', { skillId: skillId, enabled: !!enabled });
    }, 'renderAutoBattleTab'],
    ['setSageConverter', function (el) { if (state) state.converterElement = el || null; sendOption('converterElement', el || null); }, 'renderAutoBattleTab'],
    ['setSageElementChange', function (el) { if (state) state.elementChangePick = el || null; sendOption('elementChangePick', el || null); }, 'renderAutoBattleTab'],

    /* ---- 音效與縮放 ----
       ui.js 走 allyOwner() = allyOwnerState() = _allyOwnerState || state,
       而 _allyOwnerState 只在「傭兵換身行動中」才有值 ——
       玩家在面板上操作時它是 null,所以這些都是寫進本尊的 state。 */
    ['setAllySfxRatio', function (val) {
      var r = Math.max(0, Math.min(1, val / 100));
      if (state) state.allySfxRatio = r;
      var t = document.getElementById('vol-ally-text');
      if (t) t.textContent = Math.round(r * 100) + '%';
      sendOption('allySfxRatio', r);
    }, null],
    ['setAllySfxOff', function (v) { if (state) state.allySfxOff = !!v; sendOption('allySfxOff', !!v); }, null],
    ['setSkillSpriteScalePct', function (val) {
      var n = Math.max(50, Math.min(150, Math.round(val)));
      if (state) {
        if (!state.skillSpriteScaleByJob) state.skillSpriteScaleByJob = {};
        state.skillSpriteScaleByJob[state.jobId || ''] = n;
      }
      var t = document.getElementById('skill-scale-text');
      if (t) t.textContent = n + '%';
      try { if (typeof applySpriteScale === 'function') applySpriteScale(); } catch (e) {}
      sendOption('skillSpriteScalePct', n);
    }, null],

    /* ---- 傭兵設定:住在 state.allies[] 裡的物件,不是 state 頂層 ---- */
    ['setAllyAutoSkill', function (slot, v) {
      var a = allyOf(slot); if (a) a.autoSkill = !!v;
      sendOption('allyAutoSkill', { slot: String(slot), value: !!v });
    }, 'renderAllyPanel'],
    ['setAllyAutoCfg', function (slot, key, v) {
      var a = allyOf(slot);
      if (a) {
        if (!a.autoSkillConfig) a.autoSkillConfig = { skillId: null, skillId2: null, spThreshold: 30, spThreshold2: 50, monsterCount2: 2 };
        a.autoSkillConfig[key] = (v === '' ? null : v);
      }
      sendOption('allyAutoCfg', { slot: String(slot), key: key, value: (v === '' || v === undefined) ? null : v });
    }, 'renderAllyPanel'],
    ['setAllyAutoSupport', function (slot, skillId, v) {
      var a = allyOf(slot);
      if (a) { if (!a.autoSupportSkills) a.autoSupportSkills = {}; a.autoSupportSkills[skillId] = !!v; }
      /* 同一個名額只能開一個(acc516 #2111),理由同上 —— 隊友這一份也要送。 */
      if (a && v && typeof supportSlotConflicts === 'function') {
        supportSlotConflicts(a.autoSupportSkills, skillId).forEach(function (id) {
          a.autoSupportSkills[id] = false;
          sendOption('allyAutoSupport', { slot: String(slot), skillId: id, enabled: false });
        });
      }
      sendOption('allyAutoSupport', { slot: String(slot), skillId: skillId, enabled: !!v });
    }, 'renderAllyPanel'],
  ];

  // 傭兵用 _slot 識別(字串比對 —— slot 有時是數字有時是字串)
  function allyOf(slot) {
    if (!state || !state.allies) return null;
    for (var i = 0; i < state.allies.length; i++) {
      var a = state.allies[i];
      if (a && String(a._slot) === String(slot)) return a;
    }
    return null;
  }

  function hookEquipSkin() {
    for (var i = 0; i < OPT_HOOKS.length; i++) {
      (function (name, mine, rerender) {
        var fn = window[name];
        if (typeof fn !== 'function' || fn.__net) return;
        var wrapped = function () {
          try { mine.apply(null, arguments); } catch (e) {}
          if (rerender) { try { if (typeof window[rerender] === 'function') window[rerender](); } catch (e) {} }
        };
        wrapped.__net = true;
        window[name] = wrapped;
      })(OPT_HOOKS[i][0], OPT_HOOKS[i][1], OPT_HOOKS[i][2]);
    }
    /* 音量兩支跟上面不同:原函式要動 ui.js 閉包裡的 bgmAudio,無法整支重寫 ——
       改用「先跑原函式、再送伺服器」的包法(設定型函式重跑無副作用,切換型才不行)。 */
    [['setBgmVolume', 'bgmVolume'], ['setSfxVolume', 'sfxVolume']].forEach(function (pair) {
      var fn = window[pair[0]];
      if (typeof fn !== 'function' || fn.__net) return;
      var wrapped = function (v) {
        try { fn(v); } catch (e) {}
        var stored = state && state[pair[1]] != null ? state[pair[1]] : (v / 100);
        sendOption(pair[1], stored);
      };
      wrapped.__net = true;
      window[pair[0]] = wrapped;
    });
    /* 兩個畫面開關(戰鬥特效、傷害飄字)。跟音量同樣用「先跑原函式、再送伺服器」的包法:
       原函式要更新標籤文字、清掉畫面上殘留的特效,整支重寫會漏掉那些。
       ⚠ 沒接之前它們只改前端,幾秒後被快照蓋回去(實測全服 0 人存到 battleFxOff)。 */
    [['setBattleFxOff', 'battleFxOff'], ['setDmgNumOff', 'dmgNumOff'],
     ['setAllyDmgNumOff', 'allyDmgNumOff']].forEach(function (pair) {
      var fn = window[pair[0]];
      if (typeof fn !== 'function' || fn.__net) return;
      var wrapped = function (v) {
        try { fn(v); } catch (e) {}
        sendOption(pair[1], !!v);
      };
      wrapped.__net = true;
      window[pair[0]] = wrapped;
    });
    AB_PROXY.forEach(function (name) {
      var fn = window[name];
      if (typeof fn !== 'function' || fn.__net) return;
      var wrapped = function () {
        var args = Array.prototype.slice.call(arguments).map(function (a) { return a === undefined ? null : a; });
        try { fn.apply(null, arguments); } catch (e) {}
        sendOption('abSet', { fn: name, args: args });
      };
      wrapped.__net = true;
      window[name] = wrapped;
    });
  }

  /* 背包格子:抽出數量與裝備狀態寫進 data-*,再處理「點格子浮出選單」。
     不搬 DOM、不改 innerHTML —— renderInventoryTab() 每次動作後都會整個重繪,
     搬過的節點會不見。只加 class 與 CSS 變數,重繪後由這支重跑一次即可。 */
  function decorateBag() {
    var list = document.querySelector('#tab-inventory .inv-list');
    if (!list) return;
    var rows = list.querySelectorAll('.inv-row');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row._roDone) continue;
      row._roDone = true;
      var nameEl = row.querySelector('.inv-name');
      var txt = nameEl ? (nameEl.textContent || '') : '';
      // 「木錘 [3] x12 [3]」→ 數量取 x 後面那個數字
      var m = txt.match(/[x×]\s*(\d+)/);
      if (m && +m[1] > 1) row.setAttribute('data-ro-cnt', m[1]);
      // 已裝備:那一列的主要按鈕會變成「卸下」
      var btns = row.querySelectorAll('.inv-actions button');
      for (var b = 0; b < btns.length; b++) {
        if (/卸下|脫下/.test(btns[b].textContent || '')) { row.setAttribute('data-ro-on', '1'); row.classList.add('ro-eq'); break; }
      }
      // 滑鼠移上去用原生 title 看名字(輕量,不必另外做 tooltip)
      /* ui.js 渲染時已經掛上「名稱+數值+說明」的完整 title,
         這裡不能再用只有名稱的版本蓋掉(老闆 2026-08-26 回報說明不見了)。 */
      if (txt && !row.getAttribute('title')) row.title = txt.trim();
    }
  }

  /* 點格子浮出選單。.inv-info 與 .inv-actions 是兄弟節點,
     純 CSS 絕對定位會疊在一起,所以這裡量出 info 的高度再排 actions。 */
  function closeBagPop() {
    var open = document.querySelector('#tab-inventory .inv-row.ro-pop');
    if (open) open.classList.remove('ro-pop');
  }

  /* 背包重繪偵測:切分類、裝備、賣出都會讓 renderInventoryTab() 重建整個清單。
     只靠 repaint()(2 秒一次)的話,徽章會慢半拍才出現。
     用 MutationObserver 盯著容器,一重建就立刻重跑 decorateBag()。 */
  function watchBag() {
    /* 🔴 要盯的是 #tab-inventory,不是 .inv-list ——
       renderInventoryTab() 把 .inv-list 整個換掉,
       掛在舊 list 上的 observer 等於觀察一個已經被丟棄的節點,
       切分類後徽章完全不會更新(實測 0/2)。
       #tab-inventory 本身不會被重建,盯它的 subtree 才追得到。 */
    var host = document.getElementById('tab-inventory');
    if (!host || host._roWatched) return;
    host._roWatched = true;
    var pending = false;
    var mo = new MutationObserver(function () {
      // subtree 觀察會被自己的 data-* 寫入再次觸發,用 microtask 收斂成一次
      if (pending) return;
      pending = true;
      Promise.resolve().then(function () {
        pending = false;
        try { closeBagPop(); decorateBag(); } catch (e) {}
      });
    });
    mo.observe(host, { childList: true, subtree: true });
  }

  function bindBagPop() {
    if (document._roBagBound) return;
    document._roBagBound = true;
    document.addEventListener('click', function (ev) {
      var row = ev.target.closest ? ev.target.closest('#tab-inventory .inv-row') : null;
      if (!row) { closeBagPop(); return; }
      // 點在浮層裡的按鈕:讓它照常執行,不要把選單關掉再重開
      if (ev.target.closest('.inv-actions') || ev.target.closest('.inv-info')) return;
      var wasOpen = row.classList.contains('ro-pop');
      closeBagPop();
      if (wasOpen) return;
      var r = row.getBoundingClientRect();
      /* 水平夾取(2026-08-25 玩家+老闆:手機第一格的「使用」點不到):
         浮層寬 280 置中,最左/最右欄的格子中心離邊不到 140px 時,半個選單在畫面外。
         夾在 [148, vw-148] 讓整個選單永遠留在螢幕內。 */
      var cx = Math.max(148, Math.min(window.innerWidth - 148, r.left + r.width / 2));
      row.style.setProperty('--rp-x', cx + 'px');
      row.style.setProperty('--rp-y', (r.bottom + 6) + 'px');
      row.classList.add('ro-pop');
      // 量出 info 實際高度,把 actions 接在它正下方
      var info = row.querySelector('.inv-info');
      var h = info ? info.getBoundingClientRect().height : 0;
      row.style.setProperty('--rp-y2', (r.bottom + 6 + h) + 'px');
      /* 浮層可能超出視窗底部 —— 改成往上開 */
      var actions = row.querySelector('.inv-actions');
      var ah = actions ? actions.getBoundingClientRect().height : 0;
      if (r.bottom + 6 + h + ah > window.innerHeight - 8) {
        row.style.setProperty('--rp-y', (r.top - 6 - h - ah) + 'px');
        row.style.setProperty('--rp-y2', (r.top - 6 - ah) + 'px');
      }
    }, true);
  }

  /* 播放伺服器送來的音效事件。
     ui.js 沒有載進 VM,所以 playHitSound / playEventSfx 這些在引擎眼裡不存在,
     被 typeof 保護整批跳過 —— 實測 14 秒戰鬥 playSfx 呼叫 0 次,
     線上模式連升級音、精煉成功音、MVP 音、中毒暈眩音都沒有。

     ⚠️ 音效要跟著動作的節奏走,不能收到就一次全放:
     一次同步可能累積好幾下攻擊(日誌播放器也是照 LOG_PLAY_MS 一則一則演),
     全部擠在同一瞬間會變成雜音。這裡照日誌的節奏排開。 */
  function playFxEvents(list) {
    if (!list || !list.length) return;
    var i = 0;
    function step() {
      if (i >= list.length) return;
      var ev = list[i++];
      try {
        var name = ev && ev[0], args = (ev && ev[1]) || [];
        /* 重繪類要立刻做,不排進節奏佇列 ——
           它們是「畫面該更新了」而不是「演一個效果」,延遲重繪會讓
           打寶模式切換之後畫面慢半拍。 */
        if (name === 'renderAll' || name === 'renderMapTab') {
          if (typeof window[name] === 'function') window[name]();
        } else if (name === 'playSkillSound') {
          var sk = (typeof findSkillById === 'function' && args[0]) ? findSkillById(args[0]) : null;
          if (sk && typeof playSkillSound === 'function') playSkillSound(sk, args[1]);
        } else if (typeof window[name] === 'function') {
          window[name].apply(null, args);
        }
      } catch (e) {}
      if (i < list.length) setTimeout(step, LOG_PLAY_MS);
    }
    step();
  }

  /* ---------- 紙娃娃 ----------
     照紅獅 ui.js 的 .paperdoll:左排 + 中間立繪 + 右排,飾品另開一排。
     互動全部接 RO 既有的函式(onEquipSlotClick / showEquipTooltip),
     卸下、更換、屬性提示都照原本的走,不必自己重做一套。 */
  var DOLL_LEFT  = [['head_top','頭上'],['head_mid','頭中'],['head_bottom','頭下'],['armor','身體'],['garment','披風']];
  var DOLL_RIGHT = [['weapon','武器'],['shield','左手'],['footgear','鞋子'],['accessory1','飾品1'],['accessory2','飾品2']];
  var DOLL_ACC   = [['ammo','箭矢']];

  function dollCell(slot, label, twoHandWeaponId) {
    var itemId = null, ref = 0, twoHand = false;
    try {
      itemId = getEquipBaseItemId(slot);
      /* 雙手武器會佔住左手:左手格顯示同一把武器但淡化 ——
         這是 ui.js 既有的規則,不照做的話明明拿著雙手武器、
         左手格卻是空的,看起來像還能再穿一件。 */
      if (!itemId && slot === 'shield' && twoHandWeaponId) { itemId = twoHandWeaponId; twoHand = true; }
      ref = getRefinementLevel(twoHand ? 'weapon' : slot) || 0;
    } catch (e) {}
    var cls = 'pdx' + (itemId ? ' has' : '') + (twoHand ? ' two-hand' : '');
    var inner;
    if (itemId) {
      var src = '', ph = '';
      try { src = itemImgSrc(itemId); ph = placeholderImgSrc(slot === 'weapon' ? 'weapon' : 'armor'); } catch (e) {}
      inner = '<img src="' + src + '" onerror="this.onerror=null;this.src=\'' + ph + '\'">' +
              (ref > 0 ? '<span class="pdx-en">+' + ref + '</span>' : '');
    } else {
      inner = '<span class="pdx-lbl">' + label + '</span>';
    }
    var real = twoHand ? 'weapon' : slot;
    return '<div class="' + cls + '" data-ro-slot="' + real + '" title="' + label + '">' + inner + '</div>';
  }

  function buildPaperdoll() {
    var twoHandId = null;
    try {
      var wid = getEquipBaseItemId('weapon');
      if (wid && typeof isTwoHanded === 'function' && isTwoHanded(wid)) twoHandId = wid;
    } catch (e) {}
    var job = (state && state.jobId) || 'novice';
    var g = (state && state.gender === 'female') ? 'female' : 'male';
    var alias = job;
    try { if (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[alias]) alias = SPRITE_ALIAS[alias]; } catch (e) {}
    /* 立繪優先用新的角色圖集(images/player_anim):
       ① 舊的 frame_000.png 四周有大片留白,撐到 168px 高之後人還是很小
       ② 圖集有 fit(待機時人有多大),照它縮才會真的填滿
       ③ 順便會顯示手上實際裝備的武器
       沒有圖集就退回舊圖,不會變空白。 */
    var fig = framesSrc(alias + '_' + g + '/frame_000.png');
    var pdBg = '';
    try {
      var pk = plKey(), pd = PL_ANIM && PL_ANIM[pk];
      // 裝備畫面用正面站姿(側面是戰鬥用的),對不到才退回側面
      var ia = pd && (pd.actions.idle || pd.actions.idle_s);
      if (ia) {
        var H = 200;                                   // 立繪區的目標人高
        var kk = H / pd.fit[1];
        var cw = pd.cell[0] * kk, ch = pd.cell[1] * kk;
        var cc = ia.start % pd.cols, rr = (ia.start / pd.cols) | 0;
        var nrow = Math.ceil(pd.total / pd.cols);
        pdBg = 'width:' + Math.round(cw) + 'px;height:' + Math.round(ch) + 'px;' +
          'background-image:url(&quot;' + PL_DIR + pk + '.png' + (pd.v ? '?v=' + pd.v : '') + '&quot;);' +
          'background-repeat:no-repeat;image-rendering:pixelated;' +
          'background-size:' + (pd.cols * cw).toFixed(1) + 'px ' + (nrow * ch).toFixed(1) + 'px;' +
          'background-position:' + (-(cc * cw)).toFixed(1) + 'px ' + (-(rr * ch)).toFixed(1) + 'px;' +
          'filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))';
      }
    } catch (e) {}
    var col = function (list) {
      return '<div class="ro-doll-col">' +
        list.map(function (x) { return dollCell(x[0], x[1], twoHandId); }).join('') + '</div>';
    };
    return '<div class="ro-doll-sub">裝備 · 紙娃娃</div>' +
      '<div class="ro-doll">' + col(DOLL_LEFT) +
        '<div class="ro-doll-hero">' + (pdBg
          ? '<i class="ro-doll-fig" style="' + pdBg + '"></i>'
          : '<img src="' + fig + '" onerror="this.style.display=\'none\'">') + '</div>' +
        col(DOLL_RIGHT) + '</div>' +
      '<div class="ro-doll-sub" style="margin-top:10px">其他</div>' +
      '<div class="ro-doll-acc">' +
        DOLL_ACC.map(function (x) { return dollCell(x[0], x[1], null); }).join('') + '</div>' +
      '<div class="ro-doll-hint">點任一部位可挑選 / 更換該部位裝備</div>';
  }

  /* 把 RO 原本的 .equipwin 換成紙娃娃。
     ⚠️ renderEquipTab() 每次重繪都會把 .equipwin 建回來 ——
     所以這支要能重複執行,並由 observer 在重繪後再叫一次。 */
  function upgradeEquipWin() {
    var win = document.querySelector('.equipwin');
    if (!win || !win.parentNode) return;
    var wrap = document.createElement('div');
    wrap.className = 'ro-doll-wrap';
    wrap.innerHTML = buildPaperdoll();
    win.parentNode.replaceChild(wrap, win);
    wrap.querySelectorAll('[data-ro-slot]').forEach(function (c) {
      var slot = c.getAttribute('data-ro-slot');
      c.addEventListener('click', function () {
        try { if (typeof onEquipSlotClick === 'function') onEquipSlotClick(slot); } catch (e) {}
      });
      /* 屬性提示走 ui.js 既有的那一套,不自己重做 */
      c.addEventListener('mouseenter', function (ev) {
        try { if (typeof showEquipTooltip === 'function') showEquipTooltip(ev, slot); } catch (e) {}
      });
      c.addEventListener('mouseleave', function () {
        try { if (typeof hideEquipTooltip === 'function') hideEquipTooltip(); } catch (e) {}
      });
    });
  }

  function watchEquipTab() {
    var host = document.getElementById('tab-equip');
    if (!host || host._roDollWatched) return;
    host._roDollWatched = true;
    var pending = false;
    var mo = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      Promise.resolve().then(function () {
        pending = false;
        try { upgradeEquipWin(); } catch (e) {}
      });
    });
    mo.observe(host, { childList: true, subtree: true });
    try { upgradeEquipWin(); } catch (e) {}
  }

  /* 帳號層資料(倉庫、傭兵帳本)寫回瀏覽器的 localStorage。
     ui.js 的 loadWarehouse() 讀的就是這裡 —— 這樣不必改 ui.js,
     它照原本的方式就讀得到伺服器上的倉庫。
     ⚠️ 只寫這兩個鍵。存檔那個鍵(ro_idle_save_slot_N)不可以碰:
     線上模式的存檔在伺服器,寫進瀏覽器只會養出一份會誤導人的舊資料。 */
  function applyAcctStore(m) {
    if (!m) return;
    ['ro_idle_warehouse', 'ro_idle_merc_ledger_v1'].forEach(function (k) {
      try {
        if (k in m) {
          if (m[k] == null) localStorage.removeItem(k);
          else localStorage.setItem(k, m[k]);
        }
      } catch (e) {}
    });
  }

  /* 動作完成後重繪「當前那一個分頁」。

     單機版的按鈕是 onclick="useItem('club');renderInventoryTab();" ——
     重繪直接串在動作後面。但線上模式把 useItem 代理成非同步(送伺服器),
     renderInventoryTab() 在同一瞬間就跑掉了,那時伺服器還沒回應,
     重繪的是舊資料 —— 玩家點了裝備,道具還留在背包裡,
     要切到別的分頁再切回來才看得到它消失。

     ⚠️ 不呼叫 switchTab():它會把分頁按鈕的 active 狀態一起重設,
     而且 ui.js 註解寫著「整個重畫會把展開中的下拉選單刪掉」。
     這裡只重繪內容本身。 */
  var TAB_RENDER = { quests: 'renderQuestsTab', pets: 'renderPetsTab',
    inventory: 'renderInventoryTab', equip: 'renderEquipTab', skills: 'renderSkillsTab',
    map: 'renderMapTab', autobattle: 'renderAutoBattleTab', character: 'renderCharacterTab',
    jobtree: 'renderJobTree', codex: 'renderCodexTab', achievements: 'renderAchievementsTab',
  };
  /* 浮動視窗不是分頁,activeTab 涵蓋不到 —— 開著倉庫存道具、
     開著販賣視窗賣東西,畫面一樣會停在舊資料。
     這幾支內部都是 `const body = getElementById(...); if (!body) return;`,
     沒開的時候是 no-op,直接呼叫是安全的。
     ⚠️ 鍛造不必放進來:onTickUI 已經有 `if (forgeIsOpen()) refreshForgeIfChanged()`。 */
  var FLOATING_RENDER = ['renderWarehouse', 'renderAutoSellWindow', 'renderVendingWindow', 'renderAllyPanel', 'renderAutoSellSyncWindow'];

  function repaintActiveTab() {
    try {
      if (typeof activeTab !== 'undefined') {
        var fn = TAB_RENDER[activeTab];
        if (fn && typeof window[fn] === 'function') window[fn]();
      }
    } catch (e) {}
    for (var i = 0; i < FLOATING_RENDER.length; i++) {
      try {
        var g = window[FLOATING_RENDER[i]];
        if (typeof g === 'function') g();
      } catch (e) {}
    }
  }

  /* ---------- 掉落一覽 ----------
     照紅獅 rt-combat.js 的 showDrops:每隻怪一列,道具按機率由高到低排。
     ⚠️ MAPS 是**陣列**不是物件(實測 437 筆),要用 find 不能用 MAPS[id]。 */
  function curMapDef() {
    try {
      if (typeof MAPS === 'undefined' || !state) return null;
      var id = state.mapId;
      if (Array.isArray(MAPS)) {
        for (var i = 0; i < MAPS.length; i++) if (MAPS[i] && MAPS[i].id === id) return MAPS[i];
        return null;
      }
      return MAPS[id] || null;
    } catch (e) { return null; }
  }

  function fmtPct(v) {
    var p = v * 100;
    if (p >= 10) return p.toFixed(0) + '%';
    if (p >= 1) return p.toFixed(1) + '%';
    if (p >= 0.1) return p.toFixed(2) + '%';
    return p.toFixed(3) + '%';
  }

  /* 目前實際生效的掉落倍率（玩家 acc145 #1464／#1468）。
     ⚠ 一定要跟 killMonster() 那條**同一條算式**，自己重算一份遲早會不一樣：
         farmMult('drop') × (1 + cardDropRatePct/100) × 掉寶糖 buff
     ⚠ 卡片走 MONSTER_CARD_DROPS 的那一份**不吃**這個倍率；
       但寫在怪物 drops 裡的卡片會吃 —— 這個面板列的正是 drops，所以一致。 */
  function dropMultNow() {
    try {
      var m = (typeof farmMult === 'function') ? farmMult('drop') : 1;
      m *= 1 + ((state && state.cardDropRatePct) || 0) / 100;
      var db = state && state.buffs && state.buffs.find
        ? state.buffs.find(function (b) { return b.type === 'dropboost'; }) : null;
      if (db && db.mult) m *= db.mult;
      return (isFinite(m) && m > 0) ? m : 1;
    } catch (e) { return 1; }
  }
  /* 倍率的組成，用來寫成一句話給玩家看 */
  function dropMultParts() {
    var p = [];
    try {
      var f = (typeof farmMult === 'function') ? farmMult('drop') : 1;
      if (f !== 1) p.push((typeof FARM_MODE_NAMES !== 'undefined' && typeof farmMode === 'function'
        && FARM_MODE_NAMES[farmMode()] ? FARM_MODE_NAMES[farmMode()] : '打寶模式') + ' ×' + f);
      var c = (state && state.cardDropRatePct) || 0;
      if (c) p.push('裝備／卡片 +' + c + '%');
      var db = state && state.buffs && state.buffs.find
        ? state.buffs.find(function (b) { return b.type === 'dropboost'; }) : null;
      if (db && db.mult) p.push('掉寶糖 ×' + db.mult);
    } catch (e) {}
    return p;
  }

  function dropRow(d, mult) {
    var id = d.item;
    var it = (typeof ITEMS !== 'undefined') ? ITEMS[id] : null;
    var nm = it ? (it.name || id) : id;
    var img = '';
    try { if (typeof itemImgSrc === 'function') img = itemImgSrc(id); } catch (e) {}
    /* 實際機率 = 原始 × 倍率，夾在 100% 以下（跟 killMonster 同一條）。 */
    var m = mult || 1;
    var eff = Math.min(1, d.chance * m);
    var cls = 'ro-drop-it';
    /* 稀有度照**實際**機率分級 —— 開著打寶時原本的「極稀有」已經沒那麼稀有了 */
    if (/_card$/.test(String(id))) cls += ' card';
    else if (eff < 0.005) cls += ' vrare';
    else if (eff < 0.05) cls += ' rare';
    var tip = nm + (m !== 1 ? '\n原始 ' + fmtPct(d.chance) + ' × ' + (Math.round(m * 100) / 100)
      + ' = ' + fmtPct(eff) : '')
      + (it && it.desc ? ' — ' + String(it.desc).slice(0, 200) : '');
    return '<div class="' + cls + '" title="' + esc(tip) + '">' +
      (img ? '<img src="' + img + '" onerror="this.style.display=\'none\'">' : '') +
      '<span class="nm">' + esc(nm) + '</span><span class="pc">' + fmtPct(eff) + '</span></div>';
  }

  /* 屬性／種族／體型：卡片的增傷十之八九綁在這三個維度上
     （對中型 +15%、對不死 +20%…）。魔物圖鑑裡有，但打怪當下要開圖鑑太遠。
     ⚠ 這三張表在 ui.js，載入順序在前，呼叫時一定拿得到；仍加 typeof 保險。 */
  /* 這隻怪「怕什麼／不怕什麼」（玩家 acc498 #1534）。
     ELEMENT_CHART[攻擊屬性][守方屬性] 是百分比：>100 有效、<100 被減傷。
     只列最有效的兩個與最無效的兩個，全部列出來會變成一面數字牆。
     ⚠ 直接查實戰用的那張表，不另外抄一份。 */
  function eleWeakHtml(md) {
    if (!md || typeof ELEMENT_CHART === 'undefined') return '';
    var def = md.element || 'none';
    var rows = [];
    /* 🔴 一定要用**戰鬥實際在用的那支** getElementMultiplierVsMonster()。
       以前這裡直接查 ELEMENT_CHART[攻擊屬性][怪物屬性]，但那張通用表只是
       「怪物沒有自己的抗性表時」的退路；有 elementResistance 的怪（絕大多數）
       實戰吃的是牠自己那張（編碼了屬性等級 1~4）。
       實測 598 隻會出現的怪裡有 538 隻（90%）兩邊對不上，有些完全相反：
         蠍子（火屬）畫面寫「水 200% 剋」，實際只有 100%。
       玩家是照這份在選攻擊屬性的，錯了等於白打。 */
    var ATK_ELES = ['none', 'water', 'earth', 'fire', 'wind',
                    'poison', 'holy', 'shadow', 'ghost', 'undead'];
    ATK_ELES.forEach(function (atk) {
      var v;
      if (typeof getElementMultiplierVsMonster === 'function') {
        v = Math.round(getElementMultiplierVsMonster(atk, md) * 100);
      } else {
        v = ELEMENT_CHART[atk] && ELEMENT_CHART[atk][def];   // 退路：舊行為
      }
      if (typeof v !== 'number' || !isFinite(v)) return;
      rows.push({ atk: atk, v: v });
    });
    if (!rows.length) return '';
    rows.sort(function (a, b) { return b.v - a.v; });
    var nm = function (e) {
      var i = (typeof ELEMENT_ICONS !== 'undefined' && ELEMENT_ICONS[e]) || '';
      var n = (typeof ELEMENT_NAMES !== 'undefined' && ELEMENT_NAMES[e]) || e;
      return i + n;
    };
    /* **非 100% 的全部列出來**（玩家 acc498 #1537）。
       我原本切「各 3 個」是多餘的保守：實際查 ELEMENT_CHART，
       每個守方屬性的非 100% 項目最多只有 6 個（念），多數是 3~5 個，
       根本不會變成數字牆；切 3 個反而會藏掉真的有意義的資訊。
       ⚠ +25% 跟 +200% 對玩家都是資訊，只要不是 100% 就該讓他看見。 */
    var good = rows.filter(function (r) { return r.v > 100; });          // 由大到小
    var bad = rows.filter(function (r) { return r.v < 100; })
      .sort(function (a, b) { return a.v - b.v; });                      // 最慘的排前面
    var parts = [];
    if (good.length) parts.push('<b class="ro-ele-good">剋 ' +
      good.map(function (r) { return nm(r.atk) + ' ' + r.v + '%'; }).join('、') + '</b>');
    /* 抗性表裡有負值（例如蜂后被風屬打是 −50%）。實際傷害會被
       mitigateDamage() 的 Math.max(1, …) 接住，等同無效 —— 直接印負數會讓人看不懂。 */
    if (bad.length) parts.push('<b class="ro-ele-bad">弱 ' +
      bad.map(function (r) {
        return nm(r.atk) + ' ' + (r.v <= 0 ? '0%（無效）' : r.v + '%');
      }).join('、') + '</b>');
    /* 無屬性的怪：十種屬性全是 100%。什麼都不顯示的話，
       跟「這一項還沒做」長得一模一樣 —— 直接講明白換屬性沒有用。 */
    if (!parts.length) {
      return '<div class="ro-drop-ele"><b class="ro-ele-flat">'
        + '所有屬性都是 100%（換屬性打牠沒有差別）</b></div>';
    }
    return '<div class="ro-drop-ele">' + parts.join('　') + '</div>';
  }

  function mobMetaHtml(md) {
    if (!md) return '';
    var p = [];
    try {
      if (md.element) {
        var ei = (typeof ELEMENT_ICONS !== 'undefined' && ELEMENT_ICONS[md.element]) || '';
        var en = (typeof ELEMENT_NAMES !== 'undefined' && ELEMENT_NAMES[md.element]) || md.element;
        p.push(ei + en);
      }
      if (md.race && typeof RACE_LABELS !== 'undefined') p.push(RACE_LABELS[md.race] || md.race);
      if (md.size && typeof SIZE_LABELS !== 'undefined') p.push(SIZE_LABELS[md.size] || md.size);
    } catch (e) { return ''; }
    if (!p.length) return '';
    return '<em class="ro-drop-meta">' + esc(p.join('・')) + '</em>';
  }

  /* BOSS 不在 mp.monsters 裡 —— 牠們走 MVP_MAP_DATA[mapId] 這份獨立名單
     （engine.js 的 bossListOf 也是讀同一份）。只列一般怪的話，
     玩家會以為這張圖沒有王，或是不知道王會掉什麼。 */
  function bossIdsOf(mapId, kind) {
    try {
      var list = (typeof MVP_MAP_DATA !== 'undefined' && MVP_MAP_DATA[mapId]) || [];
      return list.filter(function (id) {
        var m = (typeof MONSTERS !== 'undefined') ? MONSTERS[id] : null;
        if (!m) return false;
        return kind === 'mvp' ? !!m.isMvp : !m.isMvp;
      });
    } catch (e) { return []; }
  }

  /* 一般刷怪名單裡本身就是王的那幾隻（acc227 #2960/#2961 的勾稽結果：全庫 14 隻）。
     牠們不在 MVP_MAP_DATA 裡，所以上面的「👑 本圖 BOSS」區塊看不到牠們，
     但牠們**正常刷怪就會出現**、也有出現率 —— 所以不另外列一區（會重複、也會失去出現率），
     改成在原本那一列掛標記。 */
  function residentBossTag(md) {
    if (!md) return '';
    if (md.isMvp) return '<b class="ro-drop-bosstag mvp" title="這張圖的 MVP，正常刷怪就會出現，不用開啟首領模式">👑 MVP</b>';
    if (md.isBoss) return '<b class="ro-drop-bosstag mini" title="這張圖的迷你王，正常刷怪就會出現，不用開啟首領模式">迷你王</b>';
    return '';
  }

  function bossMobHtml(id, tag, per, on) {
    var md = (typeof MONSTERS !== 'undefined') ? MONSTERS[id] : null;
    if (!md) return '';
    var mimg = '';
    try { if (typeof monsterImgSrc === 'function') mimg = monsterImgSrc(md.imgId || id); } catch (e) {}
    if (!mimg && md.imgId) mimg = 'images/monsters/' + md.imgId + '.png';
    var drops = (md.drops || []).slice().sort(function (a, b) { return b.chance - a.chance; });
    var _m = dropMultNow();
    var items = drops.map(function (d) { return dropRow(d, _m); }).join('');
    /* 沒開對應開關就是真的不會出現，要講明白，
       不然玩家會守著一隻永遠不來的王。 */
    var rate = on ? ('每次補怪 ' + (Math.round(per * 10) / 10) + '%')
                  : '未開啟・不會出現';
    return '<div class="ro-drop-mob boss">' +
      '<div class="ro-drop-mh">' +
        (mimg ? '<img src="' + mimg + '" onerror="this.style.display=\'none\'">' : '') +
        '<span>' + esc(md.name || id) + '</span>' +
        '<b class="ro-drop-tag">' + tag + '</b>' +
        mobMetaHtml(md) +
        '<i>Lv.' + (md.level || '?') + '　' + rate + '</i>' +
      '</div>' +
      eleWeakHtml(md) +
      '<div class="ro-drop-items">' + (items || '<div class="ro-drop-empty">這隻王沒有掉落</div>') + '</div>' +
    '</div>';
  }

  function buildBossHtml(mp) {
    if (!mp) return '';
    var mvp = bossIdsOf(mp.id, 'mvp');
    var mini = bossIdsOf(mp.id, 'mini');
    if (!mvp.length && !mini.length) return '';
    var CH = (typeof MVP_SPAWN_CHANCE_PCT !== 'undefined') ? MVP_SPAWN_CHANCE_PCT : 20;
    var mvpOn = !!(state && state.mvpMode), miniOn = !!(state && state.miniMode);
    var html = '<div class="ro-drop-sep">👑 本圖 BOSS</div>';
    mvp.forEach(function (id) { html += bossMobHtml(id, 'MVP', CH / mvp.length, mvpOn); });
    mini.forEach(function (id) { html += bossMobHtml(id, '迷你王', CH / mini.length, miniOn); });
    if ((mvp.length && !mvpOn) || (mini.length && !miniOn)) {
      html += '<div class="ro-drop-note">灰底的那幾隻要到<b>設定</b>裡把對應的' +
        '「MVP／迷你王」開關打開才會出現。</div>';
    }
    return html;
  }

  function buildDropsHtml() {
    var mp = curMapDef();
    var bossHtml = buildBossHtml(mp);
    if (!mp || !mp.monsters || !mp.monsters.length) {
      return bossHtml || '<div class="ro-drop-empty">這張地圖沒有怪物資料</div>';
    }
    var mult = dropMultNow();
    var total = 0;
    mp.monsters.forEach(function (x) { total += (x.weight || 0); });
    var html = '';
    mp.monsters.forEach(function (x) {
      var md = (typeof MONSTERS !== 'undefined') ? MONSTERS[x.id] : null;
      if (!md) return;
      var mimg = '';
      try { if (typeof monsterImgSrc === 'function') mimg = monsterImgSrc(md.imgId || x.id); } catch (e) {}
      if (!mimg && md.imgId) mimg = 'images/monsters/' + md.imgId + '.png';
      /* 出現率:weight 佔全圖的比例。玩家最想知道的其實是
         「這張圖打得到什麼」,所以順便標出這隻怪多常出現。 */
      var appear = total ? Math.round((x.weight || 0) / total * 100) : 0;
      var drops = (md.drops || []).slice().sort(function (a, b) { return b.chance - a.chance; });
      var items = drops.map(function (d) { return dropRow(d, mult); }).join('');
      html += '<div class="ro-drop-mob">' +
        '<div class="ro-drop-mh">' +
          (mimg ? '<img src="' + mimg + '" onerror="this.style.display=\'none\'">' : '') +
          '<span>' + esc(md.name || x.id) + '</span>' +
          residentBossTag(md) +
          mobMetaHtml(md) +
          '<i>Lv.' + (md.level || '?') + '　出現率 ' + appear + '%</i>' +
        '</div>' +
        eleWeakHtml(md) +
        '<div class="ro-drop-items">' + (items || '<div class="ro-drop-empty">這隻怪沒有掉落</div>') + '</div>' +
      '</div>';
    });
    html += bossHtml;
    return html || '<div class="ro-drop-empty">這張地圖沒有掉落資料</div>';
  }

  function closeDrops() {
    var w = document.querySelector('.ro-drop-panel');
    if (w && w.parentNode) w.parentNode.removeChild(w);
  }

  function openDrops() {
    closeDrops();
    var mp = curMapDef();
    var wrap = document.createElement('div');
    wrap.className = 'ro-drop-panel';
    wrap.innerHTML = '<div class="ro-drop-box">' +
      '<div class="ro-drop-hd"><b>📖 ' + esc((mp && mp.name) || '本圖') + '・掉落一覽</b>' +
        '<button class="ro-drop-x">關閉</button></div>' +
      '<div class="ro-drop-body">' + buildDropsHtml() +
        (function () {
          /* 顯示的是**目前實際**的機率，不是資料表上的原始值 —— 不講清楚，
             玩家會拿它去跟官方資料對，然後以為我們改了掉落率。 */
          var p = dropMultParts();
          if (!p.length) return '<div class="ro-drop-note">下面是<b>目前實際</b>的掉落率。' +
            '你現在沒有任何掉落加成，所以等於原始值。</div>';
          var m = dropMultNow();
          return '<div class="ro-drop-note ro-drop-mult">📈 下面是<b>目前實際</b>的掉落率，' +
            '已經把你身上的加成算進去：<b>×' + (Math.round(m * 100) / 100) + '</b>' +
            '（' + esc(p.join('、')) + '）。滑鼠移到道具上可以看原始機率。<br>' +
            '⚠ 卡片另有一份走獨立判定、<b>不吃</b>這個倍率，所以卡片的實際機率會比這裡低。</div>';
        })() +
        '<div class="ro-drop-note">機率是每次擊殺的獨立判定;' +
        '<span style="color:#ffcf4a">金色</span>=稀有(低於 5%)、' +
        '<span style="color:#ff9ad2">粉色</span>=極稀有(低於 0.5%)、' +
        '<span style="color:#c9a6ff">紫框</span>=卡片。</div>' +
      '</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('.ro-drop-x').onclick = closeDrops;
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeDrops(); });
  }

  /* 戰場右上的 📖 鈕。每次重繪都要確認它還在 —— 戰場容器會被 renderMonster 動到。 */
  function ensureDropsBtn() {
    var sc = sceneEl();
    if (!sc || sc.querySelector('.ro-drops-btn')) return;
    var b = document.createElement('button');
    b.className = 'ro-drops-btn';
    b.type = 'button';
    b.title = '本圖掉落一覽';
    b.textContent = '📖';
    b.onclick = function (e) { e.stopPropagation(); openDrops(); };
    sc.appendChild(b);
  }

  /* 屏蔽其他玩家(2026-08-25 老闆指定):同圖人多時把遠端玩家全部隱藏,
     純顯示偏好存 localStorage;.ro-remote 用 CSS 蓋掉,之後新加入的人也自動隱藏。 */
  function applyHideRemotes(on) {
    document.body.classList.toggle('hide-remotes', !!on);
    var b = document.querySelector('.ro-hideplayers-btn');
    if (b) { b.textContent = on ? '🙈' : '👥'; b.title = on ? '目前已隱藏其他玩家,點一下恢復顯示' : '隱藏其他玩家(太熱鬧看不清楚時用)'; }
  }
  function ensureHidePlayersBtn() {
    var sc = sceneEl();
    if (!sc || sc.querySelector('.ro-hideplayers-btn')) return;
    var b = document.createElement('button');
    b.className = 'ro-hideplayers-btn';
    b.type = 'button';
    var saved = false;
    try { saved = localStorage.getItem('ro_hide_remotes') === '1'; } catch (e) {}
    b.onclick = function (e) {
      e.stopPropagation();
      var on = !document.body.classList.contains('hide-remotes');
      applyHideRemotes(on);
      try { localStorage.setItem('ro_hide_remotes', on ? '1' : '0'); } catch (e2) {}
    };
    sc.appendChild(b);
    applyHideRemotes(saved);
  }

  /* 施放姿勢的替代效果。
     images/frames/<職業>_<性別>_skill/ 只有 44 個目錄,而且全是二轉/三轉高階職業;
     基礎與一轉職業(新手/劍士/弓箭手/騎士/僧侶…)通通沒有 ——
     ui.js 的 playSkillCastAnim 找不到幀就整段 return,施放技能完全沒有視覺回饋。

     生成幾十個職業的施放姿勢是另一件工程,在那之前先讓每個職業都有反應:
     短暫發光 + 微幅放大。⚠️ 用 inline style 而不是 CSS class ——
     這個專案的 class + reflow 叫不動動畫(玩家精靈那次已經證明過)。 */
  function castFallbackFx() {
    var ps = document.getElementById('player-sprite');
    var c = ps && ps.querySelector('canvas');
    if (!c) return;
    if (c._castT1) clearTimeout(c._castT1);
    if (c._castT2) clearTimeout(c._castT2);
    /* 朝向是寫在 canvas 的 transform 上的,要接在後面不能整個蓋掉,
       否則施放的瞬間角色會轉回預設方向。 */
    var face = (c._face === -1) ? 'scaleX(-1) ' : '';
    c.style.transition = 'transform .12s ease-out, filter .12s ease-out';
    c.style.transform = face + 'scale(1.12)';
    c.style.filter = 'brightness(1.7) drop-shadow(0 0 10px rgba(140,200,255,.95))';
    c._castT1 = setTimeout(function () {
      c.style.transition = 'transform .18s ease-in, filter .22s ease-in';
      c.style.transform = face + 'scale(1)';
      c.style.filter = '';
      c._castT2 = setTimeout(function () {
        c.style.transition = '';
        c.style.filter = '';
        /* 交還給 faceTarget:清掉 _face 逼它重寫,免得朝向卡在這裡的值 */
        c._face = null;
        try { faceTarget(); } catch (e) {}
      }, 220);
    }, 130);
  }

  /* 有素材就走 ui.js 原本那套逐幀施放姿勢;沒有才用替代效果。
     判斷依據是「這個職業的 _skill 幀有沒有載進來」,不是猜職業名單 ——
     素材補上之後不必改程式,自動就會用真正的姿勢。 */
  function hookSkillCastAnim() {
    var f = window.playSkillCastAnim;
    if (typeof f !== 'function' || f.__net) return;
    var wrapped = function () {
      var has = false;
      try {
        var key = (typeof baseAnimKey !== 'undefined' && baseAnimKey) ? (baseAnimKey + '_skill') : null;
        var fr = key && (typeof animFrameImages !== 'undefined') ? animFrameImages[key] : null;
        has = !!(fr && fr.length);
      } catch (e) {}
      if (has) { try { return f.apply(this, arguments); } catch (e) {} }
      castFallbackFx();
      try { plPlay('cast', true); } catch (e) {}
    };
    wrapped.__net = true;
    window.playSkillCastAnim = wrapped;
  }

  function clearCombatLog() {
    logQueue = [];
    // 播放器改成 setTimeout 自我排程(自適應節奏),清除也要跟著換
    if (logTimer) { clearTimeout(logTimer); logTimer = null; }
  }

  // ---------------- 戰場:行為狀態機 ----------------
  /* 命中與傷害都是伺服器算的,這裡只負責「誰站在哪、在做什麼」。
     跨容器的距離一律用 getBoundingClientRect 換算成整個戰場的百分比,
     不去推算巢狀容器的相對百分比 —— 那是最容易算錯的地方。 */
  var BF = {
    playerX: 12, playerY: 50,
    homeX: 12, homeY: 50,
    meleeGap: 6.5,      // 近戰貼身間距
    rangedGap: 30,      // 遠程想保持的距離
    minX: 5, maxX: 93,
    minY: 12, maxY: 88,
    detect: 26,         // 怪的偵測範圍(2D 距離)
    tick: 260,
    timer: null,
  };

  function sceneEl() { return document.getElementById('battle-scene'); }

  /* 把元素中心換算成整個戰場的百分比座標。
     跨容器一律走 getBoundingClientRect,不去推算巢狀容器的相對百分比。 */
  function centerOf(el) {
    var sc = sceneEl(); if (!sc || !el) return null;
    var s = sc.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (!s.width || !s.height || !r.width) return null;
    return {
      x: ((r.left + r.width / 2) - s.left) / s.width * 100,
      y: ((r.top + r.height / 2) - s.top) / s.height * 100,
    };
  }

  function isRangedNow() {
    try {
      if (state && (state.encounterMode || 'melee') === 'ranged') return true;
      if (typeof isBowWeapon === 'function' && typeof getEquipBaseItemId === 'function') {
        if (isBowWeapon(getEquipBaseItemId('weapon'))) return true;
      }
    } catch (e) {}
    return false;
  }

  /* 移動中循環播放角色的動畫幀,停下來回到站姿。
     ⚠️ images/frames/ 是「一個完整動作」的 9 張,不是專門的走路姿勢
     (紅獅那邊才有 walk1/walk2)。拿它循環播比靜止滑行像樣得多。
     攻擊時不搶:playAttackAnim 會自己 stopAnim 再播,兩邊搶同一個 canvas 會互相蓋掉。 */
  var _walkTimer = null, _walkStopAt = 0;
  function setWalking(on) {
    if (on) {
      /* 伺服器每 2 秒送一次座標、CSS 也用 2 秒把人移過去,
         所以走路要撐滿整個間隔;用舊的 480ms 會走一下就站著滑過去。 */
      try { _plWalkUntil = Date.now() + 2000; } catch (e) {}
      _walkStopAt = Date.now() + 480;
      if (_walkTimer) return;
      _walkTimer = setInterval(function () {
        if (Date.now() > _walkStopAt) { setWalking(false); return; }
        try {
          if (typeof animFrameImages === 'undefined' || typeof currentAnimKey === 'undefined') return;
          var fr = animFrameImages[currentAnimKey];
          if (!fr || !fr.length) return;
          if (typeof animating !== 'undefined' && animating) return;
          animFrameIdx = (animFrameIdx + 1) % fr.length;
          if (typeof drawAnimFrame === 'function') drawAnimFrame();
        } catch (e) {}
      }, 110);
    } else if (_walkTimer) {
      clearInterval(_walkTimer); _walkTimer = null;
      try {
        if (typeof animating === 'undefined' || !animating) {
          animFrameIdx = 0;
          if (typeof drawAnimFrame === 'function') drawAnimFrame();
        }
      } catch (e) {}
    }
  }

  function setPlayerPos(x, y) {
    x = Math.max(BF.minX, Math.min(BF.maxX, x));
    y = Math.max(BF.minY, Math.min(BF.maxY, y));
    var moved = Math.hypot(x - BF.playerX, y - BF.playerY) > 0.5;
    BF.playerX = x; BF.playerY = y;
    var ps = document.getElementById('player-sprite');
    if (ps) { ps.style.left = x + '%'; ps.style.top = y + '%'; }
    syncPlayerAnchor();
    faceTarget();
    // 隊友跟在後方,一上一下錯開
    var offs = [[-7, -9], [-7, 9]];
    for (var i = 0; i < 2; i++) {
      var al = document.getElementById('ally-sprite-' + i);
      if (!al) continue;
      al.style.left = Math.max(2, x + offs[i][0]) + '%';
      al.style.top = Math.max(6, Math.min(94, y + offs[i][1])) + '%';
      al.style.transform = 'translate(-50%,-50%)';
    }
    if (moved) {
      setWalking(true);
      // 位置同步給同房間的其他玩家
      try { if (NET.sendPos) NET.sendPos(x, y); } catch (e) {}
    }
  }

  /* 讓角色與怪面對面。
     素材只有一個朝向,靠 scaleX(-1) 水平翻轉。
     ⚠️ 玩家翻轉套在 canvas 上,不能套在 #player-sprite ——
     容器的 transform 是揮刀動畫(translateX + rotate)在用的,會互相覆蓋。
     怪則翻轉在 img 上,所以 hitMonster 的受擊位移也必須帶著朝向一起寫。 */
  var FACE_RIGHT = 1;      // 靜態圖(images/monsters/)的原生朝向:朝右

  /* 🔴 原生朝向要看「這個元素現在用的是哪種素材」,不能寫死。
     images/monsters/ 的靜態圖朝**右**,但 images/mob_anim/ 的動畫圖集朝**左**
     (實測 1029 蛇女伊絲、1030 毒蛇兩隻都是,靜態頭在右、動畫頭在左)。
     mob_anim 接手渲染之後還照 FACE_RIGHT 翻,等於把本來就朝左的圖翻成朝右
     —— 玩家看到的就是「所有怪都背對我」(老闆 2026-09-10 連續兩次截圖回報)。
     mobAnimBind() 綁定成功會在 img 上留 _maDef,用它判斷。 */
  function nativeFace(el) {
    return (el && el._maDef) ? -FACE_RIGHT : FACE_RIGHT;
  }

  function setFace(el, dir) {
    if (!el || el._face === dir) return;
    el._face = dir;
    el.style.transform = (dir === nativeFace(el)) ? '' : 'scaleX(-1)';
  }

  /* 🔴 朝向必須跟「畫面上看到的位置」一致,不能用伺服器座標。
     位移過渡佔滿整個 2 秒的更新間隔(等於用 CSS 做插值),
     畫面位置因此落後伺服器最多 2 秒 —— 拿伺服器座標決定朝向的話,
     人還沒走到就先轉身,而且愈是正在移動愈明顯。
     這裡一律讀 getBoundingClientRect,兩邊都取畫面當下的狀態。 */
  /* 🔴 對齊基準不能寫死。
     原本 margin-top:-117px 是照「canvas 高 93」算出來的,
     但角色升級/轉職/換裝會換成不同尺寸的動畫圖(實測從 114x93 變成 115x130),
     圖一換尺寸,座標點就不再落在角色身上 ——
     伺服器算的 143px 貼身距離,畫面上量起來只剩 56px。
     每次定位時量一次 canvas 在容器內的實際中心,成本只有一次 rect。 */
  function syncPlayerAnchor() {
    var ps = document.getElementById('player-sprite');
    var c = ps && ps.querySelector('canvas');
    if (!ps || !c) return;
    /* ⚠️ 一律用 offsetLeft/offsetWidth,不可用 getBoundingClientRect ——
       rect 會被 transform 影響:施放特效的 scale(1.12) 一放,
       尺寸就變了、key 跟著變、margin 重算,結果每 100ms 跳一次
       (實測 3.3 秒重算 12 次、位移 220px 的規律跳動)。
       offset 系列量的是版面尺寸,transform 動不到它。 */
    var cw = c.offsetWidth, ch = c.offsetHeight;
    if (!cw || !ch) return;
    var key = cw + 'x' + ch;
    if (ps._anchorKey === key) return;        // 尺寸沒變就不必重算
    /* ⚠️ 這裡算的是「canvas 相對容器」的偏移,跟容器自己的 margin 無關 ——
       margin 移動的是整個容器,canvas 跟著一起移。
       把 margin 加回去會變成每次都累加,愈算愈偏。 */
    var ox = c.offsetLeft + cw / 2;
    var oy = c.offsetTop + ch / 2;
    ps.style.marginLeft = (-ox).toFixed(1) + 'px';
    ps.style.marginTop = (-oy).toFixed(1) + 'px';
    ps._anchorKey = key;
  }

  function faceTarget() {
    if (!state) return;
    var mons = state.monsters || [];
    var ps = document.getElementById('player-sprite');
    var canv = ps && ps.querySelector('canvas');
    if (!canv) return;
    var pr = canv.getBoundingClientRect();
    if (!pr.width) return;
    var pcx = pr.left + pr.width / 2;
    var pcy = pr.top + pr.height / 2;

    // 玩家面向「畫面上離自己最近的怪」= 引擎正在打的那一隻
    var bestCx = null, bd = Infinity;
    for (var i = 0; i < mons.length; i++) {
      var m = mons[i];
      if (!m) continue;
      var el = document.getElementById('monster-slot-' + m.id);
      var img = el && el.querySelector('img');
      if (!img || el._dying) continue;
      var r = img.getBoundingClientRect();
      if (!r.width) continue;
      var mcx = r.left + r.width / 2;
      /* ⚠️ 要用 2D 距離挑「最近的怪」。
         只比水平距離的話,會挑到跟自己同一條垂直線、但其實很遠的那隻,
         朝向就永遠對著錯的目標(實測 0/42 全反)。 */
      var d = Math.hypot(mcx - pcx, (r.top + r.height / 2) - pcy);
      if (d < bd) { bd = d; bestCx = mcx; }
      // 每隻怪都面向玩家
      img._faceDir = (pcx >= mcx) ? FACE_RIGHT : -FACE_RIGHT;
      if (!img._hitting) setFace(img, img._faceDir);
    }
    if (bestCx !== null) setFace(canv, (bestCx >= pcx) ? FACE_RIGHT : -FACE_RIGHT);
  }

  function aliveSlots() {
    var all = document.querySelectorAll('.monster-slot'), out = [];
    for (var i = 0; i < all.length; i++) if (!all[i]._dying) out.push(all[i]);
    return out;
  }
  function targetSlot() {
    var t = document.querySelector('.monster-slot.target');
    if (t && !t._dying) return t;
    var alive = aliveSlots();
    return alive.length ? alive[0] : null;
  }
  function targetMobEl() { return targetSlot(); }

  function popAlert(el) {
    if (!el || el._alertShown) return;
    el._alertShown = true;
    var m = document.createElement('div');
    m.className = 'ro-alert';
    m.textContent = '!';
    el.appendChild(m);
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 1000);
  }

  /* 怪的容器只有全場的 67% 寬(高度是滿版),所以 x 要換算、y 不用 */
  var MOB_XSCALE = 0.67;
  function moveMob(el, dx, dy) {
    var cx = parseFloat(el.style.left), cy = parseFloat(el.style.top);
    if (!isFinite(cx)) cx = 50;
    if (!isFinite(cy)) cy = 50;
    el.style.left = Math.max(3, Math.min(97, cx + dx / MOB_XSCALE)) + '%';
    el.style.top = Math.max(8, Math.min(92, cy + dy)) + '%';
  }

  /* 怪的位置與狀態要記在「怪的 id」上,不能只掛在 DOM 元素。
     onTickUI 的規則是「monsters 的 id 清單一變就 renderMonster() 整個重建」,
     所以只要有怪死掉或新怪生成,整批 DOM 都會重畫 ——
     掛在元素上的座標與狀態會全部消失,畫面上就是走到一半瞬移回出生點。
     用 id 當 key 記住,重建後接回來,只有真正沒見過的怪才用出生站位。 */

  /* 把伺服器算好的座標套到 DOM 上。
     怪的容器已經改成滿版(見 CSS),所以 bx/by 可以直接當百分比用。 */
  function applyBattlefield() {
    if (!state) return;
    if (typeof state.bfx === 'number' && isFinite(state.bfx)) {
      setPlayerPos(state.bfx, typeof state.bfy === 'number' ? state.bfy : 50);
    }
    var mons = state.monsters || [];
    for (var i = 0; i < mons.length; i++) {
      var m = mons[i];
      if (!m || typeof m.bx !== 'number') continue;
      var el = document.getElementById('monster-slot-' + m.id);
      if (!el) continue;
      /* 🔴 _dying 是前端「猜」出來的:killMonsterFx() 只能從日誌看到「擊敗了」,
         卻不知道死的是哪一隻,只好標記當前目標 —— 而 targetSlot() 會
         fallback 到「第一個活著的」,連續幾則就把全場的怪都標成死亡。
         被誤標的怪會被這個迴圈跳過,從此不再更新座標、卡在原地不動。
         伺服器才是唯一的真理:它還把這隻怪送回來,就代表牠沒死。
         留 700ms 給死亡動畫演完,超過還在的就把誤標清掉。 */
      if (el._dying) {
        if (Date.now() - (el._dyingAt || 0) < 700) continue;
        el._dying = false;
        el.style.transition = ''; el.style.opacity = '';
        el.style.transform = 'translate(-50%,-50px)';   // 還原成置中,不是清空
      }
      var L = m.bx.toFixed(1) + '%', T = m.by.toFixed(1) + '%';
      /* 🔴 這一隻怪的 DOM 是新的(第一次定位)→ 絕對不能走 CSS 過渡。
         onTickUI 在怪的 id 清單一變時會整批 renderMonster() 重建,
         新元素先落在 renderMonster 的預設站位,我們再套真座標;
         .monster-slot 帶著 transition:left .28s,top .45s 的話,
         就會看到一群怪從預設站位「滑」過整個地圖 ——
         也就是「砍死一隻怪,其他怪全部亂飛」的真正原因。
         ⚠️ 那條 transition 是 !important,一般的 inline style 蓋不過,
         關過渡一定要用 setProperty(...,'important')。 */
      /* 🔴 對齊基準也要在這裡重設。
         ui.js:1530 把 transform:translate(-50%,-50%) 直接寫死在 HTML 的
         inline style 裡,inline 蓋得過我們注入的 CSS ——
         而 -50% 是「含名字與血條的整個容器高」的一半,
         容器高度會隨怪的體型變動(實測 114 vs 151),
         同一份設定在不同怪身上換算出來的偏移就不一樣,位置全對不上。
         用 -50px 把「圖的中心」(img 高 100 的一半)推到座標點上,
         每隻怪才有相同的基準。inline 對 inline,後寫的贏。 */
      /* 同理:-50px 是照「img 高 100」算的,但場上同時有 100 與 65 兩種尺寸
         (目標怪會被放大)。依實際高度取一半才對得準。 */
      var mi = el.querySelector('img');
      var ih = (mi && mi.getBoundingClientRect().height) || 100;
      var TR = 'translate(-50%,-' + Math.round(ih / 2) + 'px)';
      if (!el._posInit) {
        el._posInit = true;
        el.style.setProperty('transition', 'none', 'important');
        el.style.left = L; el.style.top = T; el.style.marginLeft = ''; el.style.transform = TR; el._roTr = TR;
        void el.offsetWidth;                       // 強制 reflow,讓無過渡的定位先落地
        el.style.removeProperty('transition');     // 之後的移動才走過渡
      } else {
        el.style.left = L;
        el.style.top = T;
        el.style.marginLeft = '';
        /* ⚠️ 不能拿字串比對:瀏覽器會把它正規化成 "translate(-50%, -50px)"
           (逗號後有空格),跟我們寫進去的字串永遠不相等,等於每一幀都重寫。
           用旗標判斷;ui.js 重建 DOM 後是新節點,旗標自然不在,會重設。 */
        if (el._roTr !== TR) { el._roTr = TR; el.style.transform = TR; }
      }
      mobAnimSync(el, m);
      // 剛發現玩家的那一刻跳驚嘆號(同一隻只跳一次)
      if (m.bst === 'alert') popAlert(el);
      else if (m.bst === 'idle') el._alertShown = false;
    }
  }

  /* 怪物的受擊與死亡反應。
     ui.js 的 triggerMonsterHit/Die 找的是 #monster-icon 與 #monster-card,
     那是單怪時代的 id,多怪站位之後永遠找不到元素 → 怪被打完全沒反應。
     這裡改對「當前目標」作用,並用 inline style 而不是 class
     (class + offsetWidth reflow 在這個專案叫不動動畫,玩家精靈那次已經證明過)。 */
  function hitMonster(isCrit) {
    var slot = targetSlot();
    if (!slot) return;
    var img = slot.querySelector('img');
    if (!img) return;
    mobAnimPlay(img, 'hit', true);      // 有動畫素材時演真的受擊動作
    if (img._mobT1) clearTimeout(img._mobT1);
    if (img._mobT2) clearTimeout(img._mobT2);
    var push = isCrit ? 10 : 6;
    // 受擊位移要接在朝向後面,不然被打的瞬間怪會轉回預設方向
    /* 跟 setFace 用同一套判斷:動畫素材的原生朝向是相反的 */
    var face = (img._faceDir === nativeFace(img)) ? '' : 'scaleX(-1) ';
    img._hitting = true;
    img.style.transition = 'transform .07s ease-out, filter .07s ease-out';
    img.style.transform = face + 'translateX(' + push + 'px) scale(' + (isCrit ? 1.12 : 1.06) + ')';
    img.style.filter = isCrit
      ? 'brightness(2.4) drop-shadow(0 0 6px rgba(255,220,120,.9))'
      : 'brightness(1.8)';
    img._mobT1 = setTimeout(function () {
      img.style.transform = face + 'translateX(-2px) scale(1)';
      img.style.filter = '';
      img._mobT2 = setTimeout(function () {
        img.style.transition = '';
        img._hitting = false;
        img._face = null;                       // 逼 setFace 重寫,回到純朝向
        setFace(img, img._faceDir || FACE_RIGHT);
      }, 90);
    }, 70);
  }

  /* 🔴 acc819 #3546「打王/MVP 時，王會一直從畫面上消失再出現」的真正原因。
     原本無條件用 targetSlot() 挑「誰死了」——而 targetSlot() 找不到 .target 時
     會退回「第一個活著的」，.target 又永遠是引擎正在打的 monsters[0]。
     打王時旁邊的雜魚（多半是隊友清掉的）一死，就把**王**標成 _dying、
     淡出到 opacity:0；700ms 後 applyBattlefield 發現伺服器還在送這隻怪、
     判定為誤標又把牠救回來 —— 畫面上就是王一直消失又出現。
     雜魚秒死所以沒人發現標錯，只有活得夠久的王會反覆閃。
     日誌本來就帶著死者的名字（engine.js:9036「擊敗了 X！」），照名字挑。
     ⚠ 解析得出名字卻對不到任何一隻時，寧可不播死亡動畫，也不要標錯人。 */
  function killMonsterFx(text) {
    var slot = null;
    var mm = text && /擊敗了\s*(.+?)[！!]/.exec(text);
    var name = mm && mm[1].trim();
    if (name) {
      /* 伺服器最新快照裡還在的怪 = 沒死。同名的怪場上可能有好幾隻，
         優先挑「快照裡已經不見了」的那一隻，才是真正死掉的那個個體。 */
      var live = {}, ms = (state && state.monsters) || [];
      for (var k = 0; k < ms.length; k++) if (ms[k]) live['monster-slot-' + ms[k].id] = 1;
      var alive = aliveSlots(), fb = null;
      for (var i = 0; i < alive.length; i++) {
        var nmEl = alive[i].querySelector('.monster-name');
        if (!nmEl || nmEl.textContent.indexOf(name) < 0) continue;
        if (!live[alive[i].id]) { slot = alive[i]; break; }
        if (!fb) fb = alive[i];
      }
      if (!slot) slot = fb;
      if (!slot) return;                       // 對不到就不要亂標
    } else {
      slot = targetSlot();                      // 解析不出名字才退回舊行為
    }
    if (!slot) return;
    slot._dying = true;      // 立刻退出目標選擇,後續攻擊不會打在屍體上
    slot._dyingAt = Date.now();   // 給 applyBattlefield 判斷「誤標」用
    /* 有 RO 的真死亡動畫(碎裂/倒地)就播它,不要再疊倒下旋轉 ——
       兩個一起做會變成「一邊碎裂一邊翻倒」。淡出留著,讓屍體收乾淨。 */
    var dimg = slot.querySelector('img');
    if (dimg && dimg._maDef && dimg._maDef.actions.die) {
      mobAnimPlay(dimg, 'die', true);
      var da = dimg._maDef.actions.die, ddur = da.frames * da.delay;
      slot.style.transition = 'opacity .25s linear ' + Math.max(0, ddur - 200) + 'ms';
      slot.style.opacity = '0';
      return;
    }
    slot.style.transition = 'transform .45s ease-out, opacity .45s ease-out';
    slot.style.transformOrigin = 'center bottom';
    // 保留置中的 translate,不然屍體會在倒下的瞬間往右下跳半個容器
    slot.style.transform = 'translate(-50%,-50px) rotate(72deg) translateY(6px)';
    slot.style.opacity = '0';
  }

  function markMobAttacking(name) {
    var slots = aliveSlots();
    for (var i = 0; i < slots.length; i++) {
      var nm = slots[i].querySelector('.monster-name');
      if (name && nm && nm.textContent.indexOf(name) >= 0) {
        slots[i]._st = 'attack'; slots[i]._forceAttackUntil = Date.now() + 1200; return;
      }
    }
    if (slots[0]) { slots[0]._st = 'attack'; slots[0]._forceAttackUntil = Date.now() + 1200; }
  }

  function startBattlefield() {
    stopBattlefield();
    setPlayerPos(BF.homeX, BF.homeY);
    /* 這條迴圈現在只做渲染:把伺服器最新的座標套到 DOM。
       真正的移動與 AI 都在伺服器,前端不再自己算。 */
    BF.timer = setInterval(applyBattlefield, BF.tick);
    /* 位置是 CSS 在插值,所以朝向也得跟著每一幀重算 ——
       只在收到快照時算一次的話,整整 2 秒都用著舊的朝向。 */
    if (BF.faceRaf) cancelAnimationFrame(BF.faceRaf);
    (function loop() {
      BF.faceRaf = requestAnimationFrame(loop);
      var _t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (_t - (BF._lastFace || 0) < 150) return;   // #168 朝向每~150ms算一次就夠,砍掉每幀對6個元素getBoundingClientRect的強制reflow(卡頓主嫌)
      BF._lastFace = _t;
      try { faceTarget(); } catch (e) {}
    })();
  }
  function stopBattlefield() {
    if (BF.timer) { clearInterval(BF.timer); BF.timer = null; }
    if (BF.faceRaf) { cancelAnimationFrame(BF.faceRaf); BF.faceRaf = null; }
    setWalking(false);
    wsClose();
  }

  // ---------------- 與伺服器同步 ----------------
  function startSync() {
    stopSync();
    NET._timer = setInterval(pull, TICK_INTERVAL_MS);
    /* 分頁切到背景時瀏覽器會把 setInterval 壓到一分鐘一次(遊戲原本那個
       「切回來畫面突然衝一波」就是這件事)。伺服器才是權威,資料不會掉,
       但畫面會停在舊快照 —— 所以回到前台立刻補一次。 */
    if (!NET._visBound) {
      NET._visBound = true;
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && NET.online) pull();
      });
    }
  }
  /* ⚠️ 只清同步相關的東西。startSync() 開頭會呼叫這支來清理舊計時器,
     如果把 stopBattlefield() 放進來,戰場迴圈會在 bootUI 剛啟動後
     馬上被 startSync 關掉 —— 人就永遠站在原地不動。
     戰場的關閉交給 logout / backToTitle。 */
  function stopSync() {
    if (NET._timer) { clearInterval(NET._timer); NET._timer = null; }
    clearCombatLog();
  }
  var _lastAnimKey = null;
  var _lastMapId = null;
  function pull() {
    /* _pendingOpt > 0 = 有設定正在送伺服器。這時候拉回來的快照必定是舊的,
       套上去等於把玩家剛改的設定蓋掉(見 sendOption 的說明)。等它落地再拉。 */
    /* 逾時保險:請求萬一卡住(網路斷、伺服器沒回應),不能讓遊戲永遠不拉快照。
       超過 5 秒就當它不算數,照常拉。 */
    if (NET._pendingOpt && Date.now() - NET._pendingOptAt > 5000) NET._pendingOpt = 0;
    if (NET._pendingAct && Date.now() - NET._pendingActAt > 5000) NET._pendingAct = 0;
    if (!NET.online || NET._busy || (NET._pendingOpt || 0) > 0 || (NET._pendingAct || 0) > 0) return;
    NET._busy = true;
    api('POST', '/tick', { slot: NET.slot })
      .then(function (r) {
        /* 這一趟出發之後玩家又改了設定(樂觀更新已寫進本地 state,伺服器還沒落地)——
           這份快照是改動之前的,套下去就是「勾了又跳回來」。整份丟掉,
           戰鬥日誌與音效照收(那些跟設定無關,漏掉玩家會覺得畫面卡住)。 */
        if ((NET._pendingOpt || 0) > 0 || (NET._pendingAct || 0) > 0) {
          feedCombatLog(r.combatLog); playCastEvents(r.castEvents); playFxEvents(r.fxEvents); bar(true);
          return;
        }
        applyAcctStore(r.acctStore);
        applySnapshot(r.snapshot, r.rev, r.slot); repaint(); feedCombatLog(r.combatLog); playCastEvents(r.castEvents); playFxEvents(r.fxEvents); bar(true);
        // 轉職／換性別之後動畫組會變,偵測到就重載
        try {
          var k = (typeof getAnimKey === 'function') ? getAnimKey() : null;
          if (k && _lastAnimKey && k !== _lastAnimKey) reloadPlayerFrames();
          _lastAnimKey = k;
        } catch (e) {}
        // 換地圖要換背景
        try {
          if (state && state.mapId !== _lastMapId) {
            _lastMapId = state.mapId;
            if (typeof renderMapBackground === 'function') renderMapBackground();
            wsSyncMap();
          }
        } catch (e) {}
      })
      .catch(function (e) { bar(false, e.message); if (e.code === 401) { NET.online = false; stopSync(); showAuth(); } })
      .then(function () { NET._busy = false; });
  }

  /* 玩家動作:一律送伺服器,拿回來的快照才算數。
     這是「伺服器權威」真正落地的地方 —— 前端不再自己改 state。 */
  /* 這些動作玩家點下去就期待有結果,引擎回 false 代表沒生效。
     ⚠️ 不可以對「所有 false」都報錯:runAutoSellNow 正常執行但沒東西可賣時
     也回 false,changeMap 到同一張圖同理 —— 那樣會變成一直跳假警告。 */
  var EXPECT_RESULT = ['equipItem', 'unequipItem', 'useItem', 'buyItem', 'sellItem', 'sellItemAll',
    'sellItemInstance', 'sellVisible', 'insertCard', 'removeCard', 'refineItem', 'learnSkill',
    'allocateStat', 'allocateStatN', 'levelUpSkill', 'resetStats', 'resetSkills', 'doJobChange', 'doRebirth',
    'depositGoldToWarehouse', 'withdrawGoldFromWarehouse', 'depositToWarehouse',
    'depositToWarehouseAll', 'depositInstanceToWarehouse', 'withdrawFromWarehouse', 'depositAllToWarehouse', 'depositAllCategoriesToWarehouse', 'depositAllCategoriesIncludingLocked', 'withdrawAllFromWarehouse',
    'equipAmmo', 'equipInstance', 'openAllBoxes', 'synthesizeOre', 'synthesizeOreAll', 'huntClaim', 'huntClaimRepeat', 'huntPick', 'craftOfficial',
    'hireAlly', 'refreshAlly', 'dismissAlly', 'syncAutoSellFrom', 'equipRelic', 'unequipRelic', 'craftMaterial',
    /* 遺物券兌換(玩家 #53/#54:兌換完遺物會「回溯」不見)——
       原本只改前端,3.5 秒後被伺服器快照蓋回去,券扣了東西沒拿到。 */
    'exchangeRelicTicket', 'redeemRelicTicket',
    /* 抄襲選技能(玩家 #56「抄襲沒效果」)——選完只改前端,快照一來就被蓋回去 */
    'setPlagiarismSkill',
    /* 2026-08-26 主動掃出來的同類漏網(掃描法:會寫 state + UI 會呼叫 + 沒代理):
       改名字(玩家 #46「改了跳回原本」)、打造武器、拆裝備取卡、
       從倉庫取出裝備、賢者自動施法 —— 全部只改前端,快照一來就被蓋回去。 */
    'renameCharacter', 'craftWeapon', 'destroyInstanceForCards',
    'withdrawInstanceFromWarehouse', 'setSageAutoSpell'];

  NET.act = function (action, args) {
    if (!NET.online) return Promise.reject(new Error('尚未連線'));
    /* 動作在途保護(比照 _pendingOpt):送出到回應之間擋掉 tick 快照,
       否則背景 tick 會用舊狀態把剛賣/存/取的結果蓋回去(acc77 #358「全部移去賣一直失敗」、acc361「賣掉又跑回來」)。 */
    if (!NET._pendingAct) NET._pendingActAt = Date.now();
    NET._pendingAct = (NET._pendingAct || 0) + 1;
    return api('POST', '/act', { slot: NET.slot, action: action, args: args || [] })
      .then(function (r) {
        NET._pendingAct = Math.max(0, (NET._pendingAct || 1) - 1);
        applyAcctStore(r.acctStore);
        applySnapshot(r.snapshot, r.rev, r.slot);
        repaint();
        repaintActiveTab();   // 背包/裝備要立刻反映結果,不能等玩家切分頁
        feedCombatLog(r.combatLog); playCastEvents(r.castEvents); playFxEvents(r.fxEvents);
        /* 引擎回 false = 這次沒生效。線上模式特有的風險是「快照過期」——
           玩家看到的還是舊清單,點下去伺服器那邊條件已經變了,
           不講的話玩家會以為成功了。
           ⚠️ 引擎自己已經說明原因時就不再補一句,免得同一件事跳兩條。 */
        try {
          if (r.actionResult === false && EXPECT_RESULT.indexOf(action) >= 0) {
            var explained = (r.combatLog || []).some(function (t) {
              return /⚠️|🤐|無法|不足|不夠|沒有|失敗/.test(String(t));
            });
            if (!explained && typeof logMsg === 'function') {
              logMsg('⚠️ 這個操作沒有生效,畫面已更新為最新狀態。');
              if (typeof renderLog === 'function') renderLog();
            }
          }
        } catch (e) {}
        return r;
      })
      .catch(function (e) {
        NET._pendingAct = Math.max(0, (NET._pendingAct || 1) - 1);
        try { if (typeof logMsg === 'function') logMsg('⚠️ ' + e.message); } catch (x) {}
        throw e;
      });
  };

  /* 把引擎的動作函式換成「送伺服器」。
     UI 那邊照樣呼叫 equipItem('xxx'),差別只在於真正動到存檔的是伺服器。 */
  var PROXY = ['changeMap', 'equipItem', 'unequipItem', 'useItem', 'buyItem', 'sellItem',
    'sellItemAll', 'sellItemInstance', 'insertCard', 'removeCard', 'refineItem', 'refineItemBulk', 'castSkill', 'learnSkill',
    /* 核心成長:加點 / 升技能 / 洗點 / 轉職 / 轉生。
       沒接的話點了只改前端 state,兩秒後的快照就蓋回去 ——
       玩家回報的「加點了,再點下一排又重置」就是這個。 */
    'allocateStat', 'allocateStatN', 'levelUpSkill', 'resetStats', 'resetSkills', 'doJobChange', 'doRebirth',
    /* 倉庫 / 箭矢 / 裝備實例 / 鎖定 / 開箱 / 合成 / 自動販賣 / 傳送 —— 同一個病 */
    'depositGoldToWarehouse', 'withdrawGoldFromWarehouse', 'depositToWarehouse',
    'depositToWarehouseAll', 'depositInstanceToWarehouse', 'withdrawFromWarehouse', 'depositAllToWarehouse', 'depositAllCategoriesToWarehouse', 'depositAllCategoriesIncludingLocked', 'withdrawAllFromWarehouse',
    'equipAmmo', 'unequipAmmo', 'equipInstance', 'toggleItemLock',
    'openAllBoxes', 'synthesizeOre', 'synthesizeOreAll', 'runAutoSellNow', 'resetDpsTracker', 'goNearestSafeZone', 'returnToFarmMap',
    'sellVisible',            /* 一鍵販售（acc598 #1657）：不接的話賣完會被快照蓋回來 */
    'huntClaim', 'huntClaimRepeat', 'huntPick', 'huntAbandon', 'setTitle', 'setActivePet', 'evolvePet', 'craftOfficial',
    /* 🔴 放生（acc565 #3474「還是無法放生，你沒修好」）。
       同一個病：不接的話只改前端，兩秒後的快照就把寵物蓋回來。
       上一輪只改了介面的確認秒數，沒發現動作根本沒送到伺服器。 */
    'releasePet',
    /* 🔴 裝備套組（修放生時用 testactionproxy 掃出來的同類）。
       三支都沒接，所以線上模式「存了方案、切個分頁就不見了」。 */
    'saveEquipPreset', 'deleteEquipPreset', 'applyEquipPreset',
    /* 隊友四件套:不接的話雇傭只改前端,兩秒被快照蓋掉=「隊友不會攻擊」(玩家 B1 回報) */
    'hireAlly', 'refreshAlly', 'dismissAlly', 'reviveAllyBySlot', 'syncAutoSellFrom', 'equipRelic', 'unequipRelic', 'craftMaterial',
    'exchangeRelicTicket', 'redeemRelicTicket',
    /* 抄襲選技能(玩家 #56「抄襲沒效果」)——選完只改前端,快照一來就被蓋回去 */
    'setPlagiarismSkill',
    /* 2026-08-26 主動掃出來的同類漏網(掃描法:會寫 state + UI 會呼叫 + 沒代理):
       改名字(玩家 #46「改了跳回原本」)、打造武器、拆裝備取卡、
       從倉庫取出裝備、賢者自動施法 —— 全部只改前端,快照一來就被蓋回去。 */
    'renameCharacter', 'craftWeapon', 'destroyInstanceForCards',
    'withdrawInstanceFromWarehouse', 'setSageAutoSpell'];
  /* 🔴 白名單 id 一次最多 3000 筆(server/index.js 的 idlist)。

     超過的話整個動作在**參數驗證**就被擋掉,一筆都沒做,
     玩家只看到「⚠️ 第 1 個參數格式不對」——
     feedback #276(卡冊啦):背包 4,848 筆按一鍵販售,怎麼按都沒反應。
     用他 5,079 列的快照實測:引擎端 sellVisible(5069 筆) 只要 0 ms、全部賣掉,
     問題純粹是被擋在門口。

     ⚠ 上限**不動** —— 它的用意是「超過就報錯,不要退回整個分類」,
       失敗要往安全方向倒(feedback #256 默默多領 47,732 張就是反例)。
       這裡改成前端分批送,每一批依然是明確白名單,語意完全一樣。
     ⚠ 必須**前一批回來了才送下一批**:並送的話後面幾批帶的是過期快照。 */
  var ID_CHUNK_MAX = 3000;
  var IDLIST_ARG = { sellVisible: 0, depositAllToWarehouse: 1, withdrawAllFromWarehouse: 1 };
  function actChunked(name, idx, args) {
    var ids = args[idx];
    if (!Array.isArray(ids) || ids.length <= ID_CHUNK_MAX) {
      NET.act(name, args).catch(function () {});
      return true;
    }
    var chunks = [];
    for (var i = 0; i < ids.length; i += ID_CHUNK_MAX) chunks.push(ids.slice(i, i + ID_CHUNK_MAX));
    try {
      if (typeof logMsg === 'function') {
        logMsg('⏳ 共 ' + ids.length.toLocaleString() + ' 筆,超過一次能送的 '
          + ID_CHUNK_MAX.toLocaleString() + ' 筆,分成 ' + chunks.length + ' 批處理…');
        if (typeof renderLog === 'function') renderLog();
      }
    } catch (e) {}
    var p = Promise.resolve();
    chunks.forEach(function (c) {
      p = p.then(function () {
        var a = args.slice();
        a[idx] = c;
        return NET.act(name, a);
      });
    });
    p.catch(function () {});
    return true;
  }

  function proxyActions() {
    PROXY.forEach(function (name) {
      window[name] = function () {
        var args = Array.prototype.slice.call(arguments);
        var _idx = IDLIST_ARG[name];
        if (_idx !== undefined) return actChunked(name, _idx, args);
        NET.act(name, args).catch(function () {});
        return true;   // UI 多半只看有沒有被拒絕,真正的結果由稍後的快照決定
      };
    });
    /* 線上模式:候選隊友從伺服器角色清單來——瀏覽器沒有其他存檔位的存檔,
       原函式讀 localStorage 會回空陣列,雇傭面板永遠是「沒有其他存檔的角色」。 */
    var origCands = window.allyHireCandidates;
    if (typeof origCands === 'function' && !origCands.__net) {
      var wrapped = function () {
        if (!NET.online || !NET._charsCache) { try { return origCands(); } catch (e) { return []; } }
        var out = [];
        NET._charsCache.forEach(function (c) {
          if (String(c.slot) === String(NET.slot)) return;
          var lv = c.baseLevel || 1;
          var jd = (typeof JOB_TREE !== 'undefined' && JOB_TREE[c.jobId]) || null;
          out.push({ slot: String(c.slot), name: c.name, jobId: c.jobId,
            jobName: jd ? jd.name : (c.jobId || '?'), jobIcon: jd ? jd.icon : '❓',
            baseLevel: lv, jobLevel: 1,
            price: (typeof allyHirePrice === 'function') ? allyHirePrice(lv) : lv * 1000,
            hired: ((typeof state !== 'undefined' && state && state.allies) || []).some(function (a) { return a && a._slot === String(c.slot); }) });
        });
        return out;
      };
      wrapped.__net = true;
      window.allyHireCandidates = wrapped;
    }
    /* 自動販賣「同步清單」的候選名單(#140):engine 讀 localStorage 的兄弟存檔,
       線上模式一律空 → 玩家看不到任何可抄的角色(托特森回報)。改吃 /chars 快取;
       清單長度伺服器上才知道,顯示「?」。實際抄的動作 syncAutoSellFrom 走伺服器重放。 */
    var origAsc = window.autoSellSyncCandidates;
    if (typeof origAsc === 'function' && !origAsc.__net) {
      var wrappedAsc = function () {
        if (!NET.online || !NET._charsCache) { try { return origAsc(); } catch (e) { return []; } }
        var out = [];
        NET._charsCache.forEach(function (c) {
          if (String(c.slot) === String(NET.slot)) return;
          var jd = (typeof JOB_TREE !== 'undefined' && JOB_TREE[c.jobId]) || null;
          out.push({ slot: String(c.slot), name: c.name, jobId: c.jobId,
            jobName: jd ? jd.name : (c.jobId || '?'), jobIcon: jd ? jd.icon : '❓',
            baseLevel: c.baseLevel || 1, count: '?' });
        });
        return out;
      };
      wrappedAsc.__net = true;
      window.autoSellSyncCandidates = wrappedAsc;
    }
  }

  // ---------------- 多人:WebSocket ----------------
  /* 同房間(同一張地圖)的其他玩家。
     位置由各自的前端上報、伺服器廣播;戰鬥數值一律還是伺服器算的,
     所以就算有人改自己的座標,也只是讓自己的小人站錯地方,動不到任何數值。 */
  /* ---------------- 世界聊天室 ----------------
     訊息由伺服器廣播(全服單一頻道),這裡只負責畫與送。
     跳脫在渲染端做;自己的名字上金色。捲軸貼底時才自動捲,翻舊訊息不打擾。 */
  function chatEsc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c2) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c2];
    });
  }
  /* 頭頂聊天泡泡(2026-08-25 老闆指定):訊息廣播進來時,說話的人若在同一張圖上
     (自己或遠端玩家),頭上冒一顆白色對話泡泡,6 秒後淡出。歷史回放(chatlog)不冒。 */
  function showChatBubble(m) {
    if (!m || !m.x) return;
    var host = null;
    if (state && m.n === state.name) host = document.getElementById('player-sprite');
    else {
      for (var k in RO_WS.remotes) {
        if (RO_WS.remotes[k].name === m.n) { host = RO_WS.remotes[k].el; break; }
      }
    }
    if (!host) return;
    var old = host.querySelector('.ro-chat-bubble');
    if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'ro-chat-bubble';
    d.textContent = String(m.x).slice(0, 60);
    host.appendChild(d);
    setTimeout(function () { d.classList.add('fade'); }, 5000);
    setTimeout(function () { try { d.remove(); } catch (e) {} }, 6000);
  }

  /* 全服跑馬燈(GM 後台發公告時廣播):畫面上方跑兩輪,自己收掉 */
  function showMarquee(text) {
    if (!text) return;
    var old = document.getElementById('ro-marquee');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'ro-marquee'; wrap.className = 'ro-marquee';
    var span = document.createElement('span');
    span.textContent = '📢 ' + text;
    wrap.appendChild(span);
    document.body.appendChild(wrap);
    span.addEventListener('animationend', function () { try { wrap.remove(); } catch (e) {} });
    setTimeout(function () { try { wrap.remove(); } catch (e) {} }, 40000);
  }

  function chatAppend(m) {
    var body = document.getElementById('chat-body');
    if (!body || !m) return;
    var nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
    var mine = state && m.n === state.name;
    var d = new Date(m.ts || Date.now());
    var hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var div = document.createElement('div');
    div.className = 'chat-line';
    div.innerHTML = '<span class="chat-time">' + hh + '</span><span class="chat-name' + (mine ? ' me' : '') + '">' + chatEsc(m.n) + '</span>：' + chatEsc(m.x);
    body.appendChild(div);
    while (body.childNodes.length > 100) body.removeChild(body.firstChild);
    if (nearBottom || mine) body.scrollTop = body.scrollHeight;
  }
  function chatReplay(list) {
    var body = document.getElementById('chat-body');
    if (!body) return;
    body.innerHTML = '';
    list.forEach(chatAppend);
    body.scrollTop = body.scrollHeight;
  }
  function chatSend() {
    var input = document.getElementById('chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    if (!RO_WS.ready || !RO_WS.sock) {
      chatAppend({ n: '系統', x: '連線中,稍等一下再送…', ts: Date.now() });
      return;
    }
    try { RO_WS.sock.send(JSON.stringify({ t: 'chat', text: text })); input.value = ''; } catch (e) {}
  }
  function hookChatInput() {
    var input = document.getElementById('chat-input');
    var btn = document.getElementById('chat-send');
    if (input && !input.__hooked) {
      input.__hooked = true;
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') chatSend(); });
    }
    if (btn && !btn.__hooked) { btn.__hooked = true; btn.onclick = chatSend; }
  }

  var RO_WS = {
    sock: null,
    ready: false,
    retry: 0,
    remotes: Object.create(null),     // charId -> {el, x, y}
    lastSent: 0,
    lastMap: null,
  };

  function wsUrl() {
    var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    return proto + location.host + '/api/ws';
  }

  function wsConnect() {
    if (!NET.token || NET.slot == null) return;
    wsClose();
    var sock;
    try { sock = new WebSocket(wsUrl()); } catch (e) { return; }
    RO_WS.sock = sock;

    sock.onopen = function () {
      RO_WS.retry = 0;
      try { sock.send(JSON.stringify({ t: 'auth', token: NET.token, slot: NET.slot })); } catch (e) {}
    };
    sock.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || !m.t) return;
      if (m.t === 'welcome') {
        RO_WS.ready = true;
        RO_WS.lastMap = m.map;
        clearRemotes();
        (m.members || []).forEach(addRemote);
      } else if (m.t === 'join') {
        addRemote(m.p);
      } else if (m.t === 'leave') {
        removeRemote(m.id);
      } else if (m.t === 'pos') {
        moveRemote(m.id, m.x, m.y);
      } else if (m.t === 'stat') {
        addRemote(m.p);                    // 同一個 id 會就地更新
      } else if (m.t === 'chat') {
        chatAppend(m.m);
        try { showChatBubble(m.m); } catch (e) {}
      } else if (m.t === 'marquee') {
        try { showMarquee(m.x); } catch (e) {}
        /* 公告同時留一行在聊天記錄裡（acc145 #1836）。
           以前只有跑馬燈：畫面上方跑兩輪、40 秒後自己收掉，**不進聊天記錄**，
           人不在畫面前就永遠錯過（他就錯過了離線機制那則）。
           ⚠ 只在收到當下寫入，之後才上線的人還是看不到 ——
             要完全補起來得讓伺服器把公告也寫進 chat_log，那是後端的事，另外回報。 */
        try { chatAppend({ n: '📢 系統公告', x: String(m.x || ''), ts: Date.now() }); } catch (e) {}
      } else if (m.t === 'chatlog') {
        chatReplay(m.list || []);
      } else if (m.t === 'kicked') {
        /* 被踢(帳號他處登入/同角色開第二個視窗):這個視窗必須完全停用——
           不停 tick 的話兩份畫面搶同一份存檔,就是刷寶洞(2026-08-25 老闆抓到)。 */
        RO_WS.ready = false;
        NET.online = false;
        try { stopSync(); } catch (e) {}
        try { sock.onclose = null; sock.close(); } catch (e) {}
        mask('<h1>⚠️ 已離線</h1><p class="sub">' + esc(m.why || '帳號在其他地方登入') + '</p>' +
          '<button class="ronet-back" onclick="location.reload()">重新連線</button>');
      }
    };
    sock.onclose = function () {
      RO_WS.ready = false;
      clearRemotes();
      if (!NET.online) return;
      // 退避重連:伺服器重啟時不要所有人同時湧上來
      RO_WS.retry = Math.min(RO_WS.retry + 1, 6);
      setTimeout(function () { if (NET.online) wsConnect(); }, 800 * RO_WS.retry);
    };
    sock.onerror = function () { try { sock.close(); } catch (e) {} };
  }

  function wsClose() {
    if (RO_WS.sock) { try { RO_WS.sock.onclose = null; RO_WS.sock.close(); } catch (e) {} }
    RO_WS.sock = null; RO_WS.ready = false;
    clearRemotes();
  }

  /* 位置上報要節流:移動是每 260ms 一次 tick,不節流會把連線灌滿 */
  NET.sendPos = function (x, y) {
    if (!RO_WS.ready || !RO_WS.sock || RO_WS.sock.readyState !== 1) return;
    var now = Date.now();
    if (now - RO_WS.lastSent < 220) return;
    RO_WS.lastSent = now;
    try { RO_WS.sock.send(JSON.stringify({ t: 'pos', x: x, y: y })); } catch (e) {}
  };

  /* 換地圖 → 換房間。不做的話會留在舊圖的房間,看到不該看到的人 */
  function wsSyncMap() {
    if (!RO_WS.ready || !RO_WS.sock || RO_WS.sock.readyState !== 1) return;
    if (!state || state.mapId === RO_WS.lastMap) return;
    RO_WS.lastMap = state.mapId;
    try { RO_WS.sock.send(JSON.stringify({ t: 'map' })); } catch (e) {}
  }

  /* 遠端玩家的立繪:用該職業動畫的第一幀。
     不跑逐幀 —— 一張圖上十幾個人各跑一組 canvas 會直接吃掉幀率。 */
  function remoteImg(job, gender) {
    var alias = job || 'novice';
    try { if (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[alias]) alias = SPRITE_ALIAS[alias]; } catch (e) {}
    var g = (gender === 'female') ? 'female' : 'male';
    return framesSrc(alias + '_' + g + '/frame_000.png');
  }

  function addRemote(p) {
    if (!p || !p.id) return;
    var sc = sceneEl(); if (!sc) return;
    var r = RO_WS.remotes[p.id];
    if (!r) {
      var el = document.createElement('div');
      el.className = 'ro-remote';
      el.id = 'ro-remote-' + p.id;
      el.innerHTML =
        '<img onerror="this.onerror=null;this.src=\'images/player_swordsman.png\'">' +
        '<div class="hp"><i></i></div><div class="nm"></div>';
      sc.appendChild(el);
      r = RO_WS.remotes[p.id] = { el: el };
    }
    r.name = p.name || r.name;   // 聊天氣泡用名字找人
    var img = r.el.querySelector('img');
    var src = remoteImg(p.job, p.gender);
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    r.el.querySelector('.nm').textContent = (p.name || '') + (p.lv ? ' Lv.' + p.lv : '');
    var pctHp = (p.maxHp > 0) ? Math.max(0, Math.min(100, p.hp / p.maxHp * 100)) : 100;
    r.el.querySelector('.hp i').style.width = pctHp + '%';
    moveRemote(p.id, p.x, p.y);
  }

  function moveRemote(id, x, y) {
    var r = RO_WS.remotes[id];
    if (!r) return;
    if (typeof x === 'number') { r.x = x; r.el.style.left = x + '%'; }
    if (typeof y === 'number') { r.y = y; r.el.style.top = y + '%'; }
  }

  function removeRemote(id) {
    var r = RO_WS.remotes[id];
    if (!r) return;
    try { r.el.remove(); } catch (e) {}
    delete RO_WS.remotes[id];
  }

  function clearRemotes() {
    for (var k in RO_WS.remotes) { try { RO_WS.remotes[k].el.remove(); } catch (e) {} }
    RO_WS.remotes = Object.create(null);
  }

  function onlineCount() { return 1 + Object.keys(RO_WS.remotes).length; }

  // ---------------- 連線狀態列 ----------------
  function showBar() {
    if (document.getElementById('ronet-bar')) return;
    var d = document.createElement('div');
    d.id = 'ronet-bar';
    d.className = 'ronet-bar';
    d.innerHTML = '<span class="ronet-dot"></span><span id="ronet-bar-t">線上</span>' +
      '<button id="ronet-bar-x">登出</button>';
    document.body.appendChild(d);
    document.getElementById('ronet-bar-x').onclick = logout;
  }
  function bar(ok, text) {
    var d = document.getElementById('ronet-bar');
    var t = document.getElementById('ronet-bar-t');
    if (!d || !t) return;
    d.className = 'ronet-bar' + (ok ? '' : ' bad');
    var n = onlineCount();
    t.textContent = ok ? ('線上' + (n > 1 ? ' · 同圖 ' + n + ' 人' : '')) : ('連線異常:' + (text || ''));
  }

  /* ================= 怪物動畫(RO 客戶端素材) =================
     images/mob_anim/<imgId>.png 是一張圖集,一格一幀、由左而右由上而下連續排,
     index.json 說明每個動作從第幾格開始、幾幀、每幀幾毫秒。

     為什麼用 background-position 而不是每幀換 img.src:
     換 src 每幀都要走一次資源查找,第一輪還會閃;
     背景圖只解碼一次,之後每幀只是搬位置,幾乎不花錢。

     ⚠️ 驅動用 setInterval 不用 requestAnimationFrame ——
     分頁切到背景時 rAF 會被節流到 0(養成 v2 踩過),動畫整個停住;
     setInterval 只是變慢,回到前景會自己追上。

     ⚠️ 播哪個動作是照伺服器送的 m.bst(idle/alert/chase/attack),
     不是前端自己猜位置有沒有變 —— 猜的話怪在原地攻擊時會被判成待機。 */

  var MOB_ANIM = null;                       // imgId -> {cell,anchor,cols,actions}
  var MOB_ANIM_DIR = 'images/mob_anim/';
  var mobAnimTimer = null;
  var BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  // 一次性動作:演完回待機(死亡例外,停在最後一幀)
  var MA_ONCE = { hit: 1, attack: 1, die: 1 };
  // 伺服器狀態 -> 動作名
  var MA_BY_BST = { idle: 'idle', alert: 'idle', chase: 'walk', attack: 'attack' };

  function loadMobAnim() {
    fetch(MOB_ANIM_DIR + 'index.json').then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (j) {
      if (!j) return;
      MOB_ANIM = j;
      if (!mobAnimTimer) mobAnimTimer = setInterval(mobAnimTick, 33);
      console.log('[RO_NET] 怪物動畫已載入 ' + Object.keys(j).length + ' 種');
    }).catch(function () {
      /* 沒有動畫檔就維持原本的靜態圖,這不是錯誤,不要吵玩家 */
    });
  }

  function mobAnimDef(m) {
    if (!MOB_ANIM || !m) return null;
    var id;
    try { id = MONSTERS[m.defId] && MONSTERS[m.defId].imgId; } catch (e) { return null; }
    if (!id) return null;
    var d = MOB_ANIM[String(id)];
    if (!d) return null;
    if (!d._rows) {                      // 圖集有幾列,算一次存起來
      var n = 0;
      for (var k in d.actions) n += d.actions[k].frames;
      d._total = n;
      d._rows = Math.ceil(n / d.cols);
      d._id = id;
    }
    return d;
  }

  /* 保留原本的 <img> 元素:朝向(scaleX)、受擊位移、CSS 尺寸全掛在它身上,
     換成 div 的話那些全要重做。這裡只把圖片內容換成透明點,改由背景圖畫。 */
  function mobAnimBind(el, m) {
    var img = el.querySelector('img');
    if (!img) return null;
    var d = mobAnimDef(m);
    if (!d) return null;
    if (img._maDef !== d) {
      img._maDef = d;
      /* 原生朝向跟著素材變了 —— 一定要清掉 _face,
         否則 setFace 的「跟上次一樣就不用寫」會擋住重算,朝向卡在舊基準。 */
      img._face = null;
      img.src = BLANK_GIF;
      /* 帶內容雜湊:nginx 對圖片設了 immutable 鎖七天,
         沒版本號的話以後修了圖,玩家一週內都看不到新的。
         index.json 本身沒有快取標頭,所以版本號一定是最新的。 */
      img.style.backgroundImage = 'url("' + MOB_ANIM_DIR + d._id + '.png' +
        (d.v ? '?v=' + d.v : '') + '")';
      img.style.backgroundRepeat = 'no-repeat';
      img._maAct = ''; img._maFrame = -1;
      /* 縮放基準是「待機姿勢」不是「整個格子」。
         格子必須容納揮擊時甩得最開的那一幀(波利待機 41x39、格子 65x50),
         直接把格子縮進 ui.js 給的框裡,怪會比原本的靜態圖小三成 ——
         因為原本的靜態圖就是「只有待機那一格」的緊裁圖。
         所以:讓待機填滿原框,再把 <img> 元素放大到裝得下整格。
         元素放大不會讓怪跑位 —— applyBattlefield 是拿 img 的實際高度
         算 translate(-50%,-h/2),照樣把元素中心對在座標上。
         ⚠️ 原框要記下來:重綁時 clientWidth 已經是放大後的值,
            拿它再算一次會愈放愈大。 */
      if (!img._maBox0) {
        img._maBox0 = [img.clientWidth || 80, img.clientHeight || img.clientWidth || 80];
      }
      var bw = img._maBox0[0], bh = img._maBox0[1];
      var k = Math.min(bw / d.fit[0], bh / d.fit[1]);
      // 別放大到誇張:元素最多是原框的 2.2 倍
      var over = Math.max(d.cell[0] * k / (bw * 2.2), d.cell[1] * k / (bh * 2.2), 1);
      k /= over;
      img._maK = k;
      img.style.width = Math.round(d.cell[0] * k) + 'px';
      img.style.height = Math.round(d.cell[1] * k) + 'px';
      /* 元素變高會把名字血條往下推,用負的下邊距拉回來。
         ⚠️ 只能拉「一半」:看得見的身體是置中的,
            身體下面只多出 (元素高-原框高)/2 的空白。
            拉整個高度差的話名字會被壓在怪身上。 */
      img.style.marginBottom = Math.round((bh - d.cell[1] * k) / 2) + 'px';
      mobAnimPlay(img, 'idle', true);
    }
    return img;
  }

  function mobAnimPlay(img, act, force) {
    var d = img && img._maDef;
    if (!d) return;
    var a = d.actions[act];
    if (!a) {                              // 缺這個動作就退回待機
      if (act === 'idle') return;
      act = 'idle'; a = d.actions.idle;
      if (!a) return;
    }
    if (!force && img._maAct === act) return;
    img._maAct = act;
    img._maT0 = Date.now();
    img._maFrame = -1;
    img._maOnceUntil = MA_ONCE[act] ? (Date.now() + a.frames * a.delay) : 0;
  }

  function mobAnimDraw(img, d, idx) {
    if (img._maFrame === idx) return;
    img._maFrame = idx;
    // 元素尺寸就是一個格子,所以格子左上角對元素左上角,不用再置中
    var k = img._maK || 1, cw = d.cell[0] * k, ch = d.cell[1] * k;
    var col = idx % d.cols, row = (idx / d.cols) | 0;
    img.style.backgroundSize = (d.cols * cw).toFixed(1) + 'px ' +
                               (d._rows * ch).toFixed(1) + 'px';
    img.style.backgroundPosition =
      (-(col * cw)).toFixed(1) + 'px ' + (-(row * ch)).toFixed(1) + 'px';
  }

  function mobAnimTick() {
    var imgs = document.querySelectorAll('.monster-slot img');
    var now = Date.now();
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i], d = img._maDef;
      if (!d) continue;
      var a = d.actions[img._maAct];
      if (!a) continue;
      var n = ((now - img._maT0) / a.delay) | 0;
      if (n >= a.frames) {
        if (img._maAct === 'die') {
          n = a.frames - 1;               // 死亡停在最後一幀,不要跳回第一幀
        } else if (MA_ONCE[img._maAct]) {
          mobAnimPlay(img, 'idle', true);
          a = d.actions[img._maAct]; n = 0;
          if (!a) continue;
        } else {
          n = n % a.frames;
        }
      }
      mobAnimDraw(img, d, a.start + n);
    }
  }

  /* 伺服器每 tick 送 bst,照它切動作。
     一次性動作(受擊/攻擊/死亡)演完之前不覆蓋,不然剛被打就被 idle 蓋掉。 */
  function mobAnimSync(el, m) {
    var img = mobAnimBind(el, m);
    if (!img) return;
    if (img._maOnceUntil && Date.now() < img._maOnceUntil) return;
    mobAnimPlay(img, MA_BY_BST[m.bst] || 'idle', false);
  }

  /* ================= 玩家角色動畫(RO 客戶端素材) =================
     images/player_anim/<職業>_<male|female>.png 是圖集,
     index.json 說明 idle/walk/attack/hit/die/cast 各從第幾格起、幾幀、幾毫秒。

     跟怪物那套的差別:玩家用 canvas 不用背景圖 ——
     ui.js 的 syncPlayerAnchor()/faceTarget() 都是抓
     `#player-sprite` 底下的第一個 canvas 來量位置,
     我們把自己的 canvas 插在最前面,那兩個函式就自動量到對的東西,
     一行都不用改 ui.js(前端 UI 是老闆自己維護的)。

     舊的那張 canvas 與 <img> 用 inline !important 藏起來 ——
     沒有對應素材的職業(royalguard 本體在加密的 grf 裡)整段不作用,
     照樣顯示原本的立繪,不會變成空白。

     ⚠️ 驅動一樣用 setInterval 不用 rAF:分頁切到背景 rAF 會被節流到 0。 */

  var PL_ANIM = null;
  var PL_DIR = 'images/player_anim/';
  var plTimer = null;
  var _plWalkUntil = 0;
  var PL_ONCE = { attack: 1, hit: 1, cast: 1, die: 1 };
  var PL_BOX_H = 160;            // 跟 ui.js 的 SPRITE_BOX_H 一致
  var PL_CHAR_H = 92;            // 人在畫面上的目標身高,跟現有立繪一致

  function loadPlayerAnim() {
    fetch(PL_DIR + 'index.json').then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (j) {
      if (!j) return;
      PL_ANIM = j;
      if (!plTimer) plTimer = setInterval(plTick, 33);
      console.log('[RO_NET] 角色動畫已載入 ' + Object.keys(j).length + ' 種');
    }).catch(function () { /* 沒素材就照舊,不是錯誤 */ });
  }

  function plKey() {
    var job = (state && state.jobId) || 'novice';
    try { if (typeof SPRITE_ALIAS !== 'undefined' && SPRITE_ALIAS[job]) job = SPRITE_ALIAS[job]; } catch (e) {}
    var base = job + '_' + ((state && state.gender === 'female') ? 'female' : 'male');
    /* 手上拿什麼就畫什麼。分類用遊戲自己的 aspdCategoryOf() ——
       它分得出斧/鈍器/拳刃/書/杖/雙手,而 weaponType 分不出來
       (engine.js 的註解寫過:「weaponType 分不出斧與鈍器」)。
       attack 動作是照「該武器素材真的有畫東西的那一組」挑的,
       所以弓是拉弓、拳刃是拳刃的揮法,不會一律揮刀。 */
    try {
      if (typeof aspdCategoryOf === 'function' && typeof getEquipBaseItemId === 'function') {
        var cat = aspdCategoryOf(getEquipBaseItemId('weapon'));
        /* 雙持(玩家 #51「拿雙刀時角色模組只拿一把短劍」):
           左手那格(欄位名還是 shield)裝的如果是武器,先試「主手_副手」的組合圖。
           RO 客戶端本來就有這些合成素材,只有刺客線有(canDualWield 那三個職業)。
           ⚠️ 素材只有一種排列:有 단검_검、沒有 검_단검。所以查之前要照
              同一個固定順序正規化,不然拿劍+短劍的人會查不到而退回單持。 */
        var offId = getEquipBaseItemId('shield');
        var offDef = offId && typeof ITEMS !== 'undefined' ? ITEMS[offId] : null;
        if (offDef && offDef.type === 'weapon' && cat && cat !== 'bare') {
          var off = aspdCategoryOf(offId);
          if (off && off !== 'bare') {
            var ORD = { dagger: 0, sword1: 1, axe1: 2 };
            var w1 = cat, w2 = off;
            if ((ORD[w1] == null ? 9 : ORD[w1]) > (ORD[w2] == null ? 9 : ORD[w2])) {
              var tmp = w1; w1 = w2; w2 = tmp;
            }
            var ck = base + '_' + w1 + '_' + w2;
            if (PL_ANIM && PL_ANIM[ck]) return ck;
          }
        }
        if (cat && cat !== 'bare' && PL_ANIM && PL_ANIM[base + '_' + cat]) {
          return base + '_' + cat;
        }
      }
    } catch (e) {}
    return base;      // 沒有那個種類的素材就退回該職業的預設武器
  }

  function plSetup() {
    var ps = document.getElementById('player-sprite');
    if (!ps || !PL_ANIM || !state) return null;

    /* 🔴 騎乘時把畫面讓回 images/frames/ 那一層（acc124 #1925／#1941、acc431 #1887）。

       圖集**完全沒有騎乘素材** —— index.json 656 個條目裡 mount 相關的 key 是 0 個，
       plKey() 也只組 <職業>_<性別>[_<武器類>]，沒有騎乘這個維度。
       而騎士線配矛的組合圖集全都有（dragonknight_male_spear2…），
       所以圖集一定接手 → ui.js 的 MOUNT_SPRITE_JOBS 永遠不會被畫出來。
       玩家看到的就是「拿矛卻用走的」。

       frames/ 那層有六組騎乘素材（lordknight／runeknight／royalguard × 男女，各 8 張），
       ui.js 的 getAnimKey() 本來就會挑對，只是被這裡壓掉了。

       ⚠ 代價：騎乘中改用 frames 素材，**手上的武器不會照實際裝備變化**
         （圖集的優點之一）。騎乘外觀是玩家指名要的，這個取捨往騎乘倒。
       ⚠ 一定要在下面「壓掉舊 canvas」之前 return，而且要主動解除先前壓的 display——
         從劍換成矛時舊 canvas 還留著 display:none !important，不解除會變成一片空白。 */
    var _mounted = false;
    try {
      _mounted = (typeof mountSpriteJobFor === 'function')
        && !!mountSpriteJobFor(state.jobId);
    } catch (e) { _mounted = false; }
    if (_mounted) {
      var mc = ps.querySelector('canvas.ro-pl');
      if (mc) mc.style.setProperty('display', 'none', 'important');
      var mold = ps.querySelector('canvas.player-anim-canvas');
      if (mold) mold.style.removeProperty('display');
      /* ⚠ 這裡**不可以**用 removeProperty 把 #player-img 放出來（acc124 #1961）。
         它的內容是 images/player_swordsman.png 那張男性劍士靜圖，
         放出來就會疊在騎乘圖上面變成兩層人。
         而且 ui.js 的 updatePlayerSprite() 開頭有早退
         （key 沒變且畫布已顯示就 return），不會再走到 showAnimCanvas()
         裡那行 img.style.display='none' —— 所以它會一直留在畫面上。

         用**普通的** display:none，不加 !important：
         萬一 frames 載入失敗、ui.js 要退回靜圖時，
         它的 img.style.display='' 仍然蓋得過去，不會變成一片空白。 */
      var mimg = document.getElementById('player-img');
      if (mimg) mimg.style.display = 'none';
      return null;
    }
    /* 不是騎乘狀態：把上面那段藏起來的圖集畫布放回來，
       不然從矛換回劍之後圖集就再也不顯示了。 */
    var _back = ps.querySelector('canvas.ro-pl');
    if (_back && _back.style.display === 'none') _back.style.removeProperty('display');

    var key = plKey();
    var d = PL_ANIM[key];
    if (!d) return null;                     // 這個職業沒素材 -> 維持原本的立繪

    var c = ps.querySelector('canvas.ro-pl');
    if (!c) {
      c = document.createElement('canvas');
      c.className = 'ro-pl';
      c.style.position = 'absolute';
      c.style.imageRendering = 'pixelated';
      c.style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,.4))';
      // 插在最前面:ui.js 的 querySelector('canvas') 會拿到它
      ps.insertBefore(c, ps.firstChild);
    }
    // 舊的畫布與 img 每次職業變動都會被 ui.js 重新顯示,所以每次都重新壓下去
    var old = ps.querySelector('canvas.player-anim-canvas');
    if (old && old.style.display !== 'none') old.style.setProperty('display', 'none', 'important');
    var oimg = document.getElementById('player-img');
    if (oimg && oimg.style.display !== 'none') oimg.style.setProperty('display', 'none', 'important');

    if (c._plKey !== key) {
      c._plKey = key; c._plDef = d; c._plImg = null; c._plFrame = -1;
      var im = new Image();
      im.onload = function () { c._plImg = im; c._plFrame = -1; };
      im.src = PL_DIR + key + '.png' + (d.v ? '?v=' + d.v : '');
      /* 縮放:讓「待機時的人」維持跟原本立繪一樣的身高。
         不能拿整格去縮 —— 格子要容納揮擊甩最開的那一幀,
         直接縮整格的話人會小一號(怪物那邊踩過同一個坑)。 */
      /* ⚠️ 只看「待機時的人有多高」,不要再拿格子高度去卡。
         格子要容納揮刀甩最開的那一幀,而各職業甩的方向不同
         (女劍士橫著甩、男劍士斜著甩),拿格子去卡會讓不同職業的人
         大小不一致。格子大只是四周留白多,不影響人的大小。 */
      var k = PL_CHAR_H / d.fit[1];
      k = Math.max(0.5, Math.min(2.5, k));
      c.width = d.cell[0]; c.height = d.cell[1];      // 內部解析度=一格,不縮放繪製
      c.style.width = Math.round(d.cell[0] * k) + 'px';
      c.style.height = Math.round(d.cell[1] * k) + 'px';
      /* 錨點是腳底中心:把它對到容器的「底部中心」,
         跟 ui.js 原本的排版規則一致(水平置中、腳底貼底)。 */
      c.style.left = '50%';
      c.style.marginLeft = (-Math.round(d.anchor[0] * k)) + 'px';
      c.style.bottom = (-Math.round((d.cell[1] - d.anchor[1]) * k)) + 'px';
      c._plAct = ''; plPlay('idle', true);
      try { syncPlayerAnchor(); } catch (e) {}
    }
    return c;
  }

  /* 正面還是側面。
     玩家會朝著怪走過去、朝著怪揮刀,所以只要場上有活怪或正在移動就用側面;
     完全沒怪時才用正面站姿。左右由既有的 faceTarget() 翻轉,
     所以素材只需要一個側向。 */
  function plSuffix() {
    if (Date.now() < _plWalkUntil) return '_s';
    try {
      var m = (state && state.monsters) || [];
      for (var i = 0; i < m.length; i++) if (m[i] && m[i].hp > 0) return '_s';
    } catch (e) {}
    return '';
  }

  /* 還沒走到怪旁邊就不要揮刀。
     引擎的戰鬥完全不看戰場座標(battlefield.js 的註解也寫了),
     怪一出現就開打,但人要跑過去 —— 畫面上就是隔半個地圖在空揮。
     ⚠️ 要量「畫面上的」距離不是伺服器座標:伺服器說到位了,
        前端還在用 2 秒的 CSS 過渡把人移過去,那段期間人其實還在半路。 */
  var MELEE_VIS_MAX = 2.2;      // 容許到貼身距離的幾倍
  function tooFarToSwing() {
    try {
      var ps = document.getElementById('player-sprite');
      var c = ps && ps.querySelector('canvas.ro-pl');
      var t = document.querySelector('.monster-slot.target img') ||
              document.querySelector('.monster-slot img');
      if (!c || !t) return false;
      var a = c.getBoundingClientRect(), b = t.getBoundingClientRect();
      if (!a.width || !b.width) return false;
      var sc = document.getElementById('battle-scene');
      var sw = (sc && sc.getBoundingClientRect().width) || 0;
      if (!sw) return false;
      var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
      var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      // meleeGap 是 6.8% 的戰場寬,換算成像素當基準
      var gap = sw * 0.068;
      return Math.hypot(dx, dy) > gap * MELEE_VIS_MAX;
    } catch (e) { return false; }
  }

  function plPlay(act, force) {
    var ps = document.getElementById('player-sprite');
    var c = ps && ps.querySelector('canvas.ro-pl');
    var d = c && c._plDef;
    if (!d) return;
    if (act === 'attack' && tooFarToSwing()) return;   // 還在跑過去,先別揮
    var want = act + plSuffix();
    var a = d.actions[want];
    if (!a) { want = act; a = d.actions[want]; }
    if (!a) {
      if (act === 'idle') return;
      want = 'idle' + plSuffix(); a = d.actions[want];
      if (!a) { want = 'idle'; a = d.actions.idle; }
      if (!a) return;
    }
    if (!force && c._plAct === want) return;
    c._plAct = want;
    c._plT0 = Date.now();
    c._plFrame = -1;
    /* 攻擊動作要塞進一次攻擊的間隔裡。
       RO 的揮刀是 800~900ms,攻速一快就會被下一次攻擊打斷、只播到一半。
       只縮不放:間隔比動畫長時照原速播完再待機。 */
    c._plSpd = 1;
    if (act === 'attack') {
      var iv = 1000;
      try { if (state && state.attackInterval) iv = state.attackInterval; } catch (e) {}
      c._plSpd = Math.max(0.3, Math.min(1, iv / (a.frames * a.delay)));
    }
    c._plOnceUntil = PL_ONCE[act] ? (Date.now() + a.frames * a.delay * c._plSpd) : 0;
  }

  /* 從揮刀起手到「刀真的掃過去」要多久。
     圖集的 attack.hit 是拖尾第一次出現的那一幀 —— 那就是命中的瞬間。
     ⚠️ 原本寫死 160ms 是照舊的 CSS 前傾動畫調的,
        換成 RO 的真動畫(800~900ms)之後血會比刀早三四百毫秒掉。 */
  function plHitDelay() {
    try {
      var ps = document.getElementById('player-sprite');
      var c = ps && ps.querySelector('canvas.ro-pl');
      var d = c && c._plDef;
      if (!d) return HIT_DELAY;
      var a = d.actions['attack' + plSuffix()] || d.actions.attack;
      if (!a || typeof a.hit !== 'number') return HIT_DELAY;
      var iv = 1000;
      try { if (state && state.attackInterval) iv = state.attackInterval; } catch (e) {}
      var spd = Math.max(0.3, Math.min(1, iv / (a.frames * a.delay)));
      var full = a.hit * a.delay * spd;
      /* 已經在揮的那一刀,刀鋒還沒掃過去 -> 傷害排在它的刀鋒上,
         不要另外算一輪。戰鬥日誌每 200ms 播一則、比一次揮刀還快,
         各自從頭算的話傷害會落在任意一幀上(實測偏差 ±4 幀)。 */
      if (c._plAct && c._plAct.slice(0, 6) === 'attack' && c._plT0) {
        var left = full - (Date.now() - c._plT0);
        if (left > 0) return Math.max(0, Math.round(left));
      }
      return Math.max(60, Math.min(700, Math.round(full)));
    } catch (e) { return HIT_DELAY; }
  }

  /* 刀鋒還沒掃過去就不要重新起手 —— 重新起手會把揮到一半的刀砍掉,
     看起來就是「一直在起手、刀never落下」。 */
  function plAttackBusy() {
    try {
      var ps = document.getElementById('player-sprite');
      var c = ps && ps.querySelector('canvas.ro-pl');
      var d = c && c._plDef;
      if (!d || !c._plT0) return false;
      if (!c._plAct || c._plAct.slice(0, 6) !== 'attack') return false;
      var a = d.actions[c._plAct];
      if (!a || typeof a.hit !== 'number') return false;
      return (Date.now() - c._plT0) < a.hit * a.delay * (c._plSpd || 1);
    } catch (e) { return false; }
  }

  function plDrawFrame(c, idx) {
    if (!c._plImg || c._plFrame === idx) return;
    c._plFrame = idx;
    var d = c._plDef, cw = d.cell[0], ch = d.cell[1];
    var col = idx % d.cols, row = (idx / d.cols) | 0;
    var g = c.getContext('2d');
    g.clearRect(0, 0, cw, ch);
    g.drawImage(c._plImg, col * cw, row * ch, cw, ch, 0, 0, cw, ch);
  }

  var _faceAt = 0, _chipAt = 0, _shopAt = 0;
  function plTick() {
    var c = plSetup();
    if (!c || !c._plDef) return;
    var d = c._plDef, now = Date.now();
    /* 朝向要跟著重算。faceTarget() 原本只在每 2 秒收到新座標時跑一次,
       但怪在這 2 秒之間還在用 CSS 過渡移動、目標也可能換人 ——
       實測有 14% 的時間角色是背對著正在打的那隻怪。 */
    if (now - _faceAt > 200) { _faceAt = now; try { faceTarget(); } catch (e) {} }
    if (now - _chipAt > 500) { _chipAt = now; try { upgradeMobChips(); } catch (e) {} }
    if (now - _shopAt > 500) { _shopAt = now; try { upgradeShopIcons(); } catch (e) {} }
    // 一次性動作(揮擊/受擊/施法)演完之前不被走路或待機蓋掉
    if (!(c._plOnceUntil && now < c._plOnceUntil)) {
      plPlay(now < _plWalkUntil ? 'walk' : 'idle', false);
    }
    var a = d.actions[c._plAct];
    if (!a) return;
    var n = ((now - c._plT0) / (a.delay * (c._plSpd || 1))) | 0;
    if (n >= a.frames) {
      if (PL_ONCE[c._plAct]) {
        plPlay(now < _plWalkUntil ? 'walk' : 'idle', true);
        a = d.actions[c._plAct]; n = 0;
        if (!a) return;
      } else {
        n = n % a.frames;
      }
    }
    plDrawFrame(c, a.start + n);
  }


  /* ================= 遇怪列表:把通用圖示換成怪物縮圖 =================
     ui.js 的 .monster-preview-chip 用 <span class="ui-icon icon-battle">,
     三隻怪長得一模一樣(都是交叉的劍)。這裡事後替換成真的怪物圖。
     ⚠️ 不改 ui.js —— 那邊每次重繪都會蓋回來,而且不是我維護的檔案。
        改成每次重繪後再跑一次(掛在動畫迴圈上,節流)。 */
  var _mobByName = null;
  function mobByName(nm) {
    if (!_mobByName) {
      _mobByName = {};
      try {
        for (var k in MONSTERS) {
          var m = MONSTERS[k];
          if (m && m.name && !_mobByName[m.name]) _mobByName[m.name] = m;
        }
      } catch (e) { return null; }
    }
    return _mobByName[nm] || null;
  }

  function chipIconStyle(md) {
    var id = md && md.imgId;
    if (!id) return null;
    var d = MOB_ANIM && MOB_ANIM[String(id)];
    if (d) {
      if (!d._rows) {
        var n = 0;
        for (var k in d.actions) n += d.actions[k].frames;
        d._total = n; d._rows = Math.ceil(n / d.cols); d._id = id;
      }
      var ia = d.actions.idle || d.actions.walk;
      if (ia) {
        /* 照 fit(待機時怪佔多大)縮,不是照整格 ——
           格子要容納揮擊甩最開的那一幀,拿整格縮的話怪會小一號。 */
        /* ⚠️ 元素固定 22x22,不能用整格的尺寸當寬高 ——
           格子比怪本身大(要容納揮擊甩最開的那一幀),
           直接拿來當元素大小會把晶片撐開、整排換行。
           改成把「格子置中在 22x22 的框裡」,超出的部分裁掉。 */
        var box = 22;
        var kk = Math.min(box / d.fit[0], box / d.fit[1]);
        var cw = d.cell[0] * kk, ch = d.cell[1] * kk;
        var col = ia.start % d.cols, row = (ia.start / d.cols) | 0;
        return 'width:' + box + 'px;height:' + box + 'px;overflow:hidden;' +
          'background-image:url(' + MOB_ANIM_DIR + id + '.png' + (d.v ? '?v=' + d.v : '') + ');' +
          'background-repeat:no-repeat;image-rendering:pixelated;' +
          'background-size:' + (d.cols * cw).toFixed(1) + 'px ' + (d._rows * ch).toFixed(1) + 'px;' +
          'background-position:' + (-(col * cw) - (cw - box) / 2).toFixed(1) + 'px ' +
                                   (-(row * ch) - (ch - box) / 2).toFixed(1) + 'px;';
      }
    }
    return 'IMG:images/monsters/' + id + '.png';   // 沒有動畫圖集就用靜態圖
  }

  function upgradeMobChips() {
    var chips = document.querySelectorAll('.monster-preview-chip');
    for (var i = 0; i < chips.length; i++) {
      var chip = chips[i];
      var old = chip.querySelector('.ui-icon');
      if (!old || chip._roChip) continue;
      var nmEl = chip.querySelector('span:not(.ui-icon)');
      var md = nmEl && mobByName(nmEl.textContent.trim());
      var st = md && chipIconStyle(md);
      if (!st) continue;
      chip._roChip = true;
      if (st.indexOf('IMG:') === 0) {
        var im = document.createElement('img');
        im.src = st.slice(4);
        im.style.cssText = 'width:22px;height:22px;object-fit:contain;image-rendering:pixelated;' +
          'vertical-align:middle;flex:none';
        im.onerror = function () { this.style.display = 'none'; };
        old.parentNode.replaceChild(im, old);
      } else {
        var el = document.createElement('i');
        el.style.cssText = st + 'display:inline-block;vertical-align:middle;flex:none';
        old.parentNode.replaceChild(el, old);
      }
    }
  }


  /* ================= 商店:把符號字元換成真的道具圖 ================= */
  function upgradeShopIcons() {
    var rows = document.querySelectorAll('.shop-row');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row._roShop) continue;
      var ic = row.querySelector('.shop-item-icon');
      if (!ic) continue;
      /* 優先讀 data-item(engine.js 產生商店列時就寫好了)。
         讀不到才退回解析 onclick —— 那是舊寫法,而且會被按鈕改名弄壞
         (2026-08-26 加購買數量時就中過一次,整個商店退回 emoji)。
         `buyItem` 與 `buyItemFromShop` 兩種都認。 */
      var itemId = row.getAttribute('data-item');
      if (!itemId) {
        var btn = row.querySelector('button[onclick]');
        var m = btn && /buyItem(?:FromShop)?\(\s*'([^']+)'/.exec(btn.getAttribute('onclick') || '');
        if (!m) continue;
        itemId = m[1];
      }
      var src = null;
      try { if (typeof itemImgSrc === 'function') src = itemImgSrc(itemId); } catch (e) {}
      if (!src) continue;
      row._roShop = true;
      var im = document.createElement('img');
      im.src = src;
      /* 道具圖原生只有 24x24,一定要明確給寬高才會放大;
         像素圖放大要配 pixelated,不然瀏覽器平滑內插會糊。 */
      /* 40px 對 24px 原圖不是整數倍,像素會忽粗忽細;48 = 剛好 2 倍最乾淨 */
      im.style.cssText = 'width:48px;height:48px;object-fit:contain;image-rendering:pixelated;' +
        'vertical-align:middle;flex:none';
      // 圖不存在就把原本的符號字元放回去,不要變成破圖
      var keep = ic.innerHTML;
      im.onerror = function () {
        var sp = document.createElement('span');
        sp.className = 'shop-item-icon';
        sp.innerHTML = keep;
        if (this.parentNode) this.parentNode.replaceChild(sp, this);
      };
      ic.innerHTML = '';
      ic.appendChild(im);
    }
  }

  // ---------------- 啟動 ----------------
  function boot() {
    /* 用 file:// 直接開的單機版連不到 /api(沒有 origin),
       這時完全不啟動線上模式,讓遊戲照原本的單機流程跑。
       部署到有後端的網站上才會進線上模式。 */
    if (location.protocol === 'file:') {
      console.log('[RO_NET] 單機模式(file:// 開啟,未連線伺服器)');
      return;
    }
    injectStyle();
    proxyActions();
    loadMobAnim();
    loadPlayerAnim();
    try { NET.token = localStorage.getItem(LS_TOKEN); } catch (e) {}
    if (!NET.token) return showAuth();
    // 有 token:直接回到選角(token 失效會被 401 導回登入)
    showChars();
  }

  /* 蓋在遊戲自己的 initApp 之後跑。單機版的 initApp 會去讀 localStorage 存檔、
     啟動本地迴圈,我們接手之後會用 neutralizeLocal() 把那些關掉。 */
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    window.addEventListener('load', function () { setTimeout(boot, 0); });
  }
})();
