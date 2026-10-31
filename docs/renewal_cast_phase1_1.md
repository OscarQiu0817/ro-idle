# Renewal 詠唱 Phase 1.1 — 完成摘要

**範圍：** 資料／計算器／報告／測試。未接 `castSkill`、未改技能平衡。

## 修改檔案

| 檔案 | 修正 |
|------|------|
| `js/skill_cast.js` | 中斷僅 `damage`/`none`；`readEffectiveDexIntFromState()`；無資料預設 `none` |
| `js/skill_cast_data.js` | 重產（`SKILL_CAST_META` phase 1.1） |
| `js/engine.js` | `effectiveCooldownMs` 註解：VCT/FCT vs Skill CD vs After Cast Delay |
| `tools/skill_cast_lib.js` | 中斷規則、5 自創 `author_custom`、被動仍映射 RO、`summarizeCastRows` |
| `tools/build_skill_cast_data.js` | 統一報告數字 + `docs/renewal_cast_phase1_1_report.md` |
| `tools/test_skill_cast.js` | Phase 1.1 斷言（15 項） |
| `docs/renewal_cast_phase1_1_report.md` | 自動報告（與 META 同源） |

`tools/reports/skill_cast_inventory.csv` 本機重產（gitignore）。

## 各項對照規格

1. **中斷：** 主動＋有詠唱→`damage`；敘述免中斷→`none`；其餘→`none`。執行期無 `unknown`。
2. **被動仍映射：** 181 被動有 `roId`（例：`swordmastery`→`SM_SWORD`）；`SKILL_CAST` 僅 140 筆有 FCT/VCT，不改 `skills.js` 的 type。
3. **DEX/INT（VCT 縮減）：** 用 `recomputeDerived` 後的**最終值**（`_statBreakdown.*.total`＝基礎＋職業＋裝備／卡／被動／BUFF）。`getSkillCastTime(state, …)` 或 `readEffectiveDexIntFromState(state)`。
4. **冷卻相容：** `skillCdFlat*` 與 `skillDelayFlat*` 同桶（Skill Cooldown ±秒），加總後乘 `skillcd`%；與詠唱分軌。`data.js` 已遷移為新欄，舊 key 仍可读。`globalDelayPct`（After Cast Delay）尚未接入戰鬥。
5. **自創 5 筆：** `mapStatus=author_custom`，不算映射失敗。

## 測試

```bash
node tools/build_skill_cast_data.js
node tools/test_skill_cast.js
```

**結果：Renewal 詠唱 Phase1.1 — 15/15 通過**

## 最終數字（同源：`SKILL_CAST_META` / `renewal_cast_phase1_1_report.md`）

| 項目 | 值 |
|------|-----|
| 遊戲技能 | **327**（已刪 `cartrevo`） |
| RO 映射 | **322（98.5%）** |
| 作者自創 | **5** |
| 映射失敗 | **0** |
| `SKILL_CAST` | **140** |
| 中斷 damage / none | **139 / 1**（`grandcross`＝敘述免中斷） |

## 仍待確認

- **Phase 2** 接入 GD（`globalDelayPct`）與詠唱流程時再定。
