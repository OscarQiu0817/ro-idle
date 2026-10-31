# Renewal 詠唱系統 — Phase 1 完成報告

**狀態：僅資料／計算器／盤點，未接入 `castSkill`、戰鬥、UI。**

## 修改檔案

| 檔案 | 用途 |
|------|------|
| `js/skill_cast.js` | `getSkillCastTime()`、Renewal 公式、modifier 介面 |
| `js/skill_cast_data.js` | 自動產生之 `SKILL_CAST`（FCT/VCT 陣列） |
| `index.html` | 載入上述兩檔（在 `skills.js` 之後） |
| `tools/skill_cast_lib.js` | 解析 `ro_skill_data`、映射、匯出 |
| `tools/build_skill_cast_data.js` | 產生 data + 盤點 CSV |
| `tools/audit_cast_legacy_effects.js` | 舊效果分類盤點 |
| `tools/test_skill_cast.js` | Phase 1 測試 |
| `tools/test.js` | 註冊新測試 |
| `tools/reports/skill_cast_inventory.csv` | 全技能映射表（交付用） |
| `tools/reports/cast_legacy_effects.csv` | 裝備／卡片舊欄位分類 |

## 原始資料欄位（ntome `sk_*.js`）

| 欄位 | 意義 | 本階段用法 |
|------|------|------------|
| **detail「固詠」列** | 各等級 **Fixed Cast Time（秒）** | 匯入 `cast.fixed[]` |
| **detail「變詠」列** | 各等級 **Variable Cast Time（秒）** | 匯入 `cast.variable[]` |
| **data.FC** | 固定詠唱（秒），常見於物理技能 | 無 detail 詠唱列時補 `fixed[]` |
| **data.VC** | 變動詠唱（秒） | 無 detail 時補 `variable[]` |
| **data.GD** | **After Cast Delay（全局後延遲）** | **僅記錄，不當冷卻／不當詠唱** |
| **data.SD** | **Skill Delay（獨立技能延遲）** | **僅記錄，不當冷卻／不當詠唱** |
| **data.R** | 射程 | 不用于詠唱 |
| **all_skills.json** | 官方 id／中文名／樹狀 UI | 輔助對照；詠唱秒數以 `sk_*.js` 為準 |

未在 RO 匯出中出現詠唱列且無 FC/VC → **視為瞬發（0ms）**，維持現有行為。

## 技能映射

- 遊戲技能總數：**328**
- 對上 RO id：**320（97.6%）**（剝英文尾 + `_suffix` 猜 RO id）
- 有 FCT/VCT 匯入 `SKILL_CAST`：**140**
- **未映射 8**：見下表（非英文問題，為 id／中文名與 RO 不一致或本服專用）

| gameId | 原因 |
|--------|------|
| novice_* ×4 | 本服 novice id，RO 為 NV_/其它樹 |
| swordmastery / twoswordmastery | 中文名與 RO「單手劍**使用**熟練度」不完全相同 |
| swordcraft | 本服鍛造合併，不映射 RO |

**中斷**：Phase 1 定案 **`interrupt: none`**（Idle 不做詠唱中斷；存檔也不存詠唱中狀態）。

## Renewal 計算公式（依 rAthena `RENEWAL_CAST`）

1. 基底：`FCT_ms = fixed[lv]×1000`，`VCT_ms = variable[lv]×1000`
2. **VCT × 素質**（不影響 FCT）：  
   `VCT_ms × (1 − sqrt((DEX×2 + INT) / 530))`，stat ≥ 530 → VCT 段為 0  
   依據：`renewal.hpp` 註解、`battle_config.vcast_stat_scale = 530`
3. **VCT −%**（裝備／技能，Phase 1 介面預留）：各來源 `(1 − p/100)` **相乘**（非加總）
4. **FCT −%** 再 **−秒**（Phase 1 介面預留）：`FCT × (1 − p/100) − flatSec×1000`
5. **總詠唱** = `max(0, FCT_ms) + max(0, VCT_ms)`（分轨計算後相加）

**刻意未做**：把 `skillCdFlat`／`skillCdFlat_<id>` 接入詠唱（現仍只影響 `effectiveCooldownMs`）。

## 舊系統盤點（`cast_legacy_effects.csv`）

| 分類 | 筆數 | 說明 |
|------|------|------|
| `after_cast_delay` | 148 | 文案「技能後延遲」／`afterCastPct` 等 |
| `vct_desc_unwired` | 125 | 文案「變動詠唱」但未接 cast 計算 |
| `fixed_cast` | 45 | 固定詠唱文案或 `buffType: fixedcast` |
| `legacy_mixed_global` | 39 | `skillCdFlat`（現=冷卻秒） |
| `legacy_mixed_per_skill` | 16 | `skillCdFlat_<skill>` |
| `cooldown_pct` | 1+ | `buffMult('skillcd')` |
| `uncertain` | 15 | 需人工對照 |

`engine.js` 註解（#17/#55）已說明：詠唱被 **魔改成冷卻秒**；`data.js` 的 `CASTNOTE2`／`CASTCDNOTE` 標註玩家可見差異。

## 測試

```bash
node tools/build_skill_cast_data.js   # 改 RO 資料後重產
node tools/test_skill_cast.js
node tools/audit_cast_legacy_effects.js
```

**結果：`test_skill_cast.js` 10/10 通過**（含無資料→0、DEX 只縮 VCT、`effectiveCooldownMs` 不變）。

## Phase 2 定案／待做

| 項目 | 狀態 |
|------|------|
| 中斷 | **none**（已定） |
| 存檔 | **不存**詠唱中（已定） |
| GD / SD | **GD=公共後搖，SD=單技 CD**（已定義；Phase 2 從 RO `data.GD`/`data.SD` + `cooldown[]` 分軌） |
| skillCdFlat | Phase 2 **自 `effectiveCooldownMs` 拆出**，依文案歸 **GD（後延遲）／SD／VCT**，不再當詠唱 |
| 未映射 8 筆 | 要手建對照或維持瞬發（待你點名） |
| 140 有詠唱技能 | 是否全接進 `castSkill`（待 Phase 2） |
| 20% FCT 預設 | 僅 official `-1` 列時是否補（待查） |

---

**請確認後再進 Phase 2（詠唱引擎 + UI）。**
