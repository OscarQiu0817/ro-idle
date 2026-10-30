# tools/

**GitHub 上只留這份說明。** 底下腳本都在根目錄 `.gitignore` 的 `tools/*` 裡，本機開發用、不進版控。

| 檔案 | 用途 |
|---|---|
| `harness.js`、`test.js`、`test_*.js` | Node 機制回歸測試 |
| `check_syntax.js` | 改 `js/data.js` 後查語法 |
| `pack_release.js` | 打包單機 zip |
| `exp_simlib.js`、`measure_exp_*.js`、`tune_exp_100_200.js` | 經驗曲線量測／校準 |

```bash
node tools/test.js
node tools/check_syntax.js
node tools/pack_release.js v1.1
```

一次性資料匯入腳本已刪；遊戲資料在 `js/` 裡，不必再跑舊工具。
