# 地板素材：生圖 prompt

## 現況（2026-11-17，v2 已接入）

- 原圖：`images/maps/ro_idle_floor_atlas_v2_no_text/<key>.png`（不進 git，只當轉換來源）
- 產出：`python scripts/gen_floor_tiles.py` → `images/maps/floor/<key>.jpg`（進 git，約 1MB 共 45 張）
- 分類：`js/data.js` 的 `MAP_FLOOR_TOWN`（城鎮）／`MAP_FLOOR_RULES`（地圖名稱比對）
- pale_stone 共用：169 → 102 張

| 問題 | 說明 |
|---|---|
| 解析度低 | 每格 256×205，拉到戰鬥畫面偏糊（地下水道最明顯） |
| 7 組內容重複 | 見下方「待重產」，實際只有 21 種 |
| 中心圖樣 | 吉芬符文圓、地下水道排水口、礦坑鐵軌、高塔放射紋，平鋪會重複出現 |
| gefenia | 偏熔岩色，不像封印遺跡 |

## 下一版怎麼產

- **一次一張**，不要拼成圖集：圖會大很多、不會裁錯格
- 檔名 = key + `.png`，直接覆蓋 v2 資料夾同名檔，再跑 `python scripts/gen_floor_tiles.py`
- 尺寸 512×512 以上即可；不需要 1024（輸出會縮小，原圖不進 git）
- 避免單一中心圖案（圓陣、排水口）；要的話改成「小而重複」的紋樣

## 共用規格（每個 prompt 前面接這段）

```
Seamless tileable ground texture for a 2D game battle background, top-down view with a slight
isometric feel, hand-painted style like Ragnarok Online (2002 MMORPG), soft painterly shading,
muted colors, low contrast so characters stay readable, no objects, no characters, no text,
no strong shadows, no perspective horizon, evenly lit, uniform pattern with no single focal
point in the center, fills the whole frame edge to edge. Single texture only, not a sheet.
```

## 待重產（優先）

每組左邊保留、右邊重產（右邊目前與左邊同一張圖）。

| 重產 key | 目前跟誰重複 | 用在 | 主體描述 |
|---|---|---|---|
| town_lasagna | town_hugel | 羅札納 | cozy cat-folk port village, soft green grass with round cream stepping stones |
| town_louyang | town_ayothaya | 龍之城 | ancient Chinese city, dark grey square stone tiles with red-brown brick borders |
| town_umbala | town_aldebaran | 烏巴拉 | jungle tribal village floor, dark earth with roots, woven bamboo mats and moss |
| town_lighthalzen | glast_heim | 里希塔樂 | modern corporate city, neat light grey paving blocks in a herringbone pattern |
| town_einbroch | mine | 艾音布羅克、艾音貝赫 | industrial steel city, dark riveted metal plates and soot-stained concrete |
| town_gonryun | town_yuno | 崑崙 | mystical floating island, pale white jade stone tiles with soft wisps of cloud |
| clock_tower | indoor_wood | 艾爾帕蘭鐘塔 ×8 | clock tower interior, dark wooden floorboards with small repeating brass gear inlays |

## 其次：修正

| key | 用在 | 問題 | 主體描述 |
|---|---|---|---|
| gefenia | 葛帔尼亞、地下神舍 | 偏熔岩 | ancient sealed magic ruin floor, black stone tiles with faint thin violet rune lines |
| sewer | 普隆德拉地下水道 | 排水口重複 | old sewer floor, wet dark green-grey stone bricks with thin streams of murky water |
| tower_tile | 高塔、吉芬中央塔 | 放射紋重複 | magic tower floor, pale grey square stone tiles with small engraved star marks |

## 已可用（不急）

town_payon、town_alberta、town_hugel、town_amatsu、town_ayothaya、town_tropical、town_brasilis、
town_geffen、town_yuno、town_rachel、town_aldebaran、town_dimension、cave_rock、mine、pirate_cave、
glast_heim、nightmare、indoor_wood、indoor_tatami

想提高解析度時，可用原 prompt 一張張重產：

| key | 主體描述 |
|---|---|
| town_payon | traditional Korean village ground, packed light-brown earth with scattered flat stepping stones and wooden plank edges, a few fallen leaves |
| town_alberta | harbor town docks, weathered wooden boardwalk planks mixed with red brick paving, salty worn look |
| town_hugel | rural countryside village path, light dirt road with tufts of grass and small pebbles |
| town_amatsu | Japanese town street, light grey flagstones with cherry blossom petals scattered |
| town_ayothaya | Thai temple town, warm sandstone tiles with golden ornamental lines |
| town_tropical | tropical village, light sand with irregular grey stepping stones and palm leaf litter |
| town_brasilis | Brazilian promenade, black and white wave-pattern mosaic cobblestone |
| town_geffen | magic city, blue-grey flagstones with faint glowing arcane rune engravings |
| town_yuno | elegant floating city, clean cream marble tiles with thin gold inlay lines |
| town_rachel | holy desert capital, pale sand-colored limestone tiles, sun-bleached |
| town_aldebaran | canal town, mossy grey stone pavement with thin water channels between stones |
| town_dimension | otherworldly elf frontier, pale lavender stone with glowing crystal veins |
| cave_rock | dark natural cave floor, uneven brown-grey rock with small puddles and gravel |
| mine | abandoned mine tunnel floor, dusty dark earth with scattered ore chips and wooden planks |
| pirate_cave | sea cave floor, wet dark rock with shallow tide pools and barnacles |
| glast_heim | haunted gothic castle floor, cracked dark stone tiles with faded red carpet remnants |
| nightmare | eerie abandoned hospital floor, stained white tiles with cracks and dark smudges |
| indoor_wood | warm interior wooden floor planks, polished light oak |
| indoor_tatami | Japanese tatami mat floor, light straw color with dark green borders |
