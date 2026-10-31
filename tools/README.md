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

**`tools/reports/`** — 腳本跑完產生的 CSV／JSON，**用完可整包刪**；需要時再跑腳本重產。不要當長期資料存。

### 之後「全庫裝備／分類」可能還會用到的腳本

| 腳本 | 用途 |
|---|---|
| `audit_typefix_remain.js` | yaml 裝備 vs `ITEMS.type` 仍錯分清單 |
| `reclassify_item_types.js` | 依官方 item_db 預覽／寫回 type |
| `item_type_fixup_lib.js`、`restore_equip_filters.js` | 共用：官方對照、還原池過濾 |
| `sync_restore_equip_from_official.js` | itemInfo + equip.yml + Script 同步一般裝 |
| `yaml_equip_script.js`、`equip_script_supplements.js` | Script 解析（被 sync 引用） |
| `classify_item_desc_mismatch.js`、`compare_item_desc_to_iteminfo.js` | 敘述 vs itemInfo |
| `list_box_only_misc.js` | 重產 `box_only_misc.csv`（雜物池起點） |
| `list_implemented_equip_sets.js`、`survey_*.js` | 盤點用調查 |

### 已完成批次的 prune（207／117／16 等）

`prune_*.js`、`restore_typefix_false_positives.js`、`reclassify_box_usables.js` — 結果已進 `js/data.js`，**平常不必留對應 CSV**；只有要重跑或還原資料時才再執行。
