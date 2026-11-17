# 音樂資料夾

## 地圖背景音樂（`music/bgm/`）
照官方 `data\mp3nametable.txt` 的「地圖 → BGM 編號」，由 `scripts/gen_bgm.py` 產生：

```
python scripts/gen_bgm.py          只做城鎮（預設）
python scripts/gen_bgm.py --all    遊戲裡全部地圖
```

- 來源：`grf_ex/BGM/<編號>.mp3`（客戶端 BGM 資料夾）＋ `grf_ex/mp3nametable.txt`（grf 的 data\）；grf_ex 不進版控
- 輸出：`music/bgm/<編號>.ogg`（Vorbis q0）、`js/bgm_table.js`（`MAP_BGM`：地圖 id → 編號）
- 同一首曲目的地圖共用一個檔案；換到同曲目的地圖會接著播
- 沒在對照表的地圖（或曲目沒轉）就安靜

## 標題畫面
`music/maps/0000.mp3`（`playTitleMusic`）。
