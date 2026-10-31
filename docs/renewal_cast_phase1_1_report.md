# Renewal 詠唱 Phase 1.1 — 資料報告

自動產生：`node tools/build_skill_cast_data.js`（2026-10-31T09:58:52.370Z）

## 技能映射

| 項目 | 數量 |
|------|------|
| 遊戲技能總數 | 327 |
| 對上 RO id | **322（98.5%）** |
| 作者自創（不映射 RO） | 5：novice_firstaid, novice_basicskill, novice_hpboost, novice_flee, swordcraft |
| 映射失敗 | 0 |

被動技能仍保留 RO 對照（含 FCT/VCT 若 RO 有）：**181** 筆被動有 roId。

## 詠唱資料（SKILL_CAST）

| 項目 | 數量 |
|------|------|
| 有 FCT/VCT 條目 | 140 |
| 匯入 `SKILL_CAST` | 140 |

## 中斷規則（僅 damage / none）

| interrupt | 有詠唱技能數 |
|-----------|--------------|
| damage | 139 |
| none | 1 |
| 非法值 | 0 |

## 驗證

```bash
node tools/test_skill_cast.js
```
