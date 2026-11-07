# 地板素材清單

**現況（2026-11-07）**：已接上 `images/maps/ro_idle_terrain_atlas_v1` 的 16 張素材。
`scripts/gen_floor_tiles.py` 切邊＋漸層疊接成可平鋪圖 → `images/maps/floor/<key>.jpg`；
`mapFloorOf`（js/data.js）照下面分類選圖：城鎮查 `MAP_FLOOR_TOWN`，野外依地名查 `MAP_FLOOR_RULES`。
洞窟／地下水道／礦坑沒有對應素材，仍用 `images/maps/cave.jpg`。

| key | 來源 | 用在 |
|---|---|---|
| stone_plaza | 01_02 | 普隆德拉、依斯魯得 |
| grey_cobble | 01_01 | 吉芬、朱諾等石城；城堡／工廠／研究所 |
| warm_cobble | 01_03 | 斐揚、艾爾貝塔等暖色城鎮 |
| purple_stone | 02_03 | 克魔島、尼芙菲姆、艾爾迪卡斯特 |
| pale_stone | 04_01 | 其他城鎮、室內圖、塔內 |
| grass | 01_04 | 原野預設 |
| meadow | 04_02 | 普隆德拉／毀葛原野、新手區 |
| dry_field | 03_03 | 拉赫、菲音斯原野 |
| rocky | 02_04 | 妙勒尼、艾音布羅克、里希塔樂、卡米達 |
| forest | 03_01 | 森林／叢林 |
| desert | 02_01 | 沙漠；夢羅克、菲音斯 |
| beach | 03_02 | 海邊／島嶼（鏡像拼接） |
| snow | 02_02 | 冰穴、雪地；薑餅城、莫斯科 |
| volcano | 03_04 | 火山／熔岩 |
| ashen_rock | 04_03 | 墓地／地獄／監獄／深淵 |
| mossy_stone | 04_04 | 神殿／遺跡／金字塔 |

注意：素材第 1 列檔名與內容錯一格（01_02 檔名寫 warm_cobble 實為廣場、01_03 寫 field_grass 實為暖色石磚、01_04 是草地），腳本照內容對。

---

以下是原本的規劃（512×512 每城一張），保留作分類參考。

## 城鎮（40 個，每個一張）

| 檔名 | 城鎮 |
|---|---|
| `images/maps/town/prontera.jpg` | 盧恩 米德加茲王國 首都普隆德拉 |
| `images/maps/town/alberta.jpg` | 港都 艾爾貝塔 |
| `images/maps/town/aldebaran.jpg` | 運河之都 艾爾帕蘭 |
| `images/maps/town/amatsu.jpg` | 天水之國 天津町 |
| `images/maps/town/ayothaya.jpg` | 哎喲泰雅 |
| `images/maps/town/brasilis.jpg` | 巴西 |
| `images/maps/town/comodo.jpg` | 海邊之都 克魔島 |
| `images/maps/town/dewata.jpg` | 德瓦他 |
| `images/maps/town/ecl_in01.jpg` | 埃克拉珠內部 |
| `images/maps/town/einbech.jpg` | 採礦村艾音貝赫 |
| `images/maps/town/einbroch.jpg` | 鋼鐵之都 艾音布羅克 |
| `images/maps/town/dicastes01.jpg` | 邪派首都 艾爾迪卡斯特 |
| `images/maps/town/geffen.jpg` | 魔法之都 吉芬 |
| `images/maps/town/hugel.jpg` | 田園都市 毀葛 |
| `images/maps/town/izlude.jpg` | 衛星都市 依斯魯得島 |
| `images/maps/town/yuno.jpg` | 秀發茲發德共和國首都朱諾 |
| `images/maps/town/gonryun.jpg` | 神仙之島崑崙 |
| `images/maps/town/lasagna.jpg` | 港口都市 羅札納 |
| `images/maps/town/lighthalzen.jpg` | 企業之都里希塔樂鎮 |
| `images/maps/town/louyang.jpg` | 古都龍之城 |
| `images/maps/town/xmas.jpg` | 白雪村 薑餅城(Lutie) |
| `images/maps/town/malangdo.jpg` | 綿綿島 |
| `images/maps/town/malaya.jpg` | 馬來港 |
| `images/maps/town/manuk.jpg` | 礦村魔怒克 |
| `images/maps/town/mid_camp.jpg` | 米德加爾特聯盟營區 |
| `images/maps/town/mora.jpg` | 草精族穆拉村 |
| `images/maps/town/morocc.jpg` | 沙漠之都 夢羅克 |
| `images/maps/town/moscovia.jpg` | 莫斯科 |
| `images/maps/town/nameless_n.jpg` | 無名島 |
| `images/maps/town/niflheim.jpg` | 亡者國都 尼芙菲姆 |
| `images/maps/town/payon.jpg` | 山岳之都 斐揚 |
| `images/maps/town/rachel.jpg` | 阿盧納貝茲 教國首都 拉赫 |
| `images/maps/town/harboro1.jpg` | 洛克理奇岩嶺 |
| `images/maps/town/sp_cor.jpg` | 特別警戒區柯爾 |
| `images/maps/town/splendide.jpg` | 守護精靈前線陣地史波浪壯麗 |
| `images/maps/town/umbala.jpg` | 雨檀族村落 汶巴拉 |
| `images/maps/town/ba_maison.jpg` | 霸肋門德宅邸 |
| `images/maps/town/veins.jpg` | 峽谷村 菲音斯 |
| `images/maps/town/verus04.jpg` | 貝魯茲考古地 |
| `images/maps/town/wolfvill.jpg` | 灰狼村 |

## 野外／地城（依類型共用）

| 檔名 | 類型 | 張數 |
|---|---|---|
| `images/maps/volcano.jpg` | 火山／熔岩 | 4 |
| `images/maps/snow.jpg` | 雪地／冰洞 | 3 |
| `images/maps/sewer.jpg` | 地下水道 | 9 |
| `images/maps/mine.jpg` | 礦坑 | 6 |
| `images/maps/factory.jpg` | 工廠／研究所 | 10 |
| `images/maps/ruins.jpg` | 金字塔／遺跡 | 11 |
| `images/maps/tower.jpg` | 塔內 | 28 |
| `images/maps/castle.jpg` | 城堡／宮殿 | 14 |
| `images/maps/temple.jpg` | 神殿／教堂 | 14 |
| `images/maps/grave.jpg` | 墓地／地獄／監獄 | 8 |
| `images/maps/cave.jpg` | 洞窟／地洞 | 21 |
| `images/maps/beach.jpg` | 海邊／島嶼 | 6 |
| `images/maps/desert.jpg` | 沙漠／荒原 | 13 |
| `images/maps/forest.jpg` | 森林／叢林 | 15 |
| `images/maps/field.jpg` | 原野草原 | 143 |

### 火山／熔岩（volcano）

斯卡勒伯熔岩（dic_dun02）、斯卡勒伯熔岩（dic_dun03）、菲音斯 托爾火山密穴 1樓（thor_v01）、菲音斯 托爾火山密穴 2樓（thor_v02）

### 雪地／冰洞（snow）

拉赫冰穴 1樓（ice_dun01）、拉赫冰穴 2樓（ice_dun02）、拉赫冰穴 3樓（ice_dun03）

### 地下水道（sewer）

地下水道（harboro2）、普隆德拉地下水道 1樓（prt_sewb1）、普隆德拉地下水道 2樓（prt_sewb2）、普隆德拉地下水道 3樓（prt_sewb3）、普隆德拉地下水道 4樓（prt_sewb4）、克雷斯特漢姆古城 地下水道 2樓（gl_sew02）、克雷斯特漢姆古城 地下水道 4樓（gl_sew04）、克雷斯特漢姆古城 地下水道 1樓（gl_sew01）、克雷斯特漢姆古城 地下水道 3樓（gl_sew03）

### 礦坑（mine）

艾音貝赫礦山 2樓（ein_dun02）、妙勒尼廢礦 1樓（mjo_dun01）、妙勒尼廢礦 2樓（mjo_dun02）、妙勒尼廢礦 3樓（mjo_dun03）、洛克理奇岩嶺礦山（rockmi1）、艾音貝赫礦山 1樓（ein_dun01）

### 工廠／研究所（factory）

機械娃娃工廠 1樓（kh_dun01）、機械娃娃工廠 2樓（kh_dun02）、活體實驗研究所 地下1樓（lhz_dun01）、活體實驗研究所 地下 2樓（lhz_dun02）、活體實驗研究所 地下 3樓（lhz_dun03）、實驗體廢棄場魯杜斯一樓（sp_rudus）、實驗體廢棄場魯杜斯二樓（sp_rudus2）、實驗體廢棄場魯杜斯三樓（sp_rudus3）、薑餅城玩具工廠倉庫（xmas_dun01）、實驗洞-OPTATIO（verus01）

### 金字塔／遺跡（ruins）

優配擂斯廢墟外部（juperos_01）、優配擂斯廢墟內部（juperos_02）、夢羅克金字塔 1樓（moc_pryd01）、夢羅克金字塔地下1樓 夢魘（moc_prydn1）、夢羅克金字塔地下2樓 夢魘（moc_prydn2）、優配擂斯東邊廢墟（ver_eju）、夢羅克金字塔 2樓（moc_pryd02）、夢羅克金字塔 3樓（moc_pryd03）、夢羅克金字塔 4樓（moc_pryd04）、夢羅克金字塔 地下1樓（moc_pryd05）、夢羅克金字塔 地下 2樓（moc_pryd06）

### 塔內（tower）

達納托斯塔台前（hu_fild01）、發樂斯 燈塔島（cmd_fild07）、達納托斯塔台上層部（tha_t06）、達納托斯塔台上層部 天使之房（tha_t07）、艾爾帕蘭鐘塔 地下1樓（alde_dun01）、艾爾帕蘭鐘塔 地下 2樓（alde_dun02）、艾爾帕蘭鐘塔 地上2樓（c_tower2）、艾爾帕蘭鐘塔 地上1樓（c_tower1）、艾爾帕蘭鐘塔 地下 3樓（alde_dun03）、艾爾帕蘭鐘塔 地上3樓（c_tower3）、艾爾帕蘭鐘塔 地下 4樓（alde_dun04）、艾爾帕蘭鐘塔 地上4樓（c_tower4）、彩虹橋高塔 1樓（ecl_tdun01）、彩虹橋高塔 2樓（ecl_tdun02）、彩虹橋高塔 3樓（ecl_tdun03）、達納托斯塔台下層部 博物館入口（tha_t01）、達納托斯塔台下層部 博物館（tha_t02）、達納托斯塔台下層部 廢棄空間（tha_t03）、達納托斯塔台下層部 廢棄空間（tha_t04）、達納托斯塔台上層部（tha_t05）、達納托斯塔台上層部 天使之房（tha_t08）、達納托斯塔台上層部 煩惱之房（tha_t09）、達納托斯塔台上層部 悲傷之房（tha_t10）、達納托斯塔台上層部 絕望之房（tha_t11）、達納托斯塔台上層部 憎恨之房（tha_t12）、艾爾貝塔沈船 1樓（treasure01）、艾爾貝塔沈船 2樓（treasure02）、艾爾貝塔 船舶內（alb_ship）

### 城堡／宮殿（castle）

克雷斯特漢姆古城（glast_01）、皇宮洞穴（dew_dun02）、克雷斯特漢姆古城 1樓（gl_cas01）、克雷斯特漢姆古城 地下監獄 1樓（gl_prison）、克雷斯特漢姆古城 2樓（gl_cas02）、克雷斯特漢姆古城 修道院（gl_church）、克雷斯特漢姆古城 地下公墓（gl_chyard）、克雷斯特漢姆古城 地下洞穴 1樓（gl_dun01）、克雷斯特漢姆古城 地下洞穴 2樓（gl_dun02）、克雷斯特漢姆古城 室內（gl_in01）、克雷斯特漢姆古城 騎士團 1樓（gl_knt01）、克雷斯特漢姆古城 騎士團 2樓（gl_knt02）、克雷斯特漢姆古城 地下監獄 2樓（gl_prison1）、克雷斯特漢姆古城 樓梯密穴（gl_step）

### 神殿／教堂（temple）

毀葛奧丁神殿西區（odin_tem01）、毀葛奧丁神殿南區（odin_tem02）、毀葛奧丁神殿北區（odin_tem03）、無名島修道院 1樓（abbey01）、無名島修道院 地下1樓（abbey02）、無名島修道院 地下2樓（abbey03）、哎喲泰雅 古神殿迷宮（ayo_dun01）、哎喲泰雅 古神殿內部（ayo_dun02）、崑崙西王母神殿（gon_dun01）、拉赫神殿聖域一樓北區（ra_san01）、拉赫神殿聖域一樓西區（ra_san02）、拉赫神殿聖域一樓東區（ra_san03）、拉赫神殿聖域一樓南區（ra_san04）、拉赫神殿聖域一樓中區（ra_san05）

### 墓地／地獄／監獄（grave）

毀葛深淵湖水（hu_fild05）、爾邁斯峽谷(深淵峽谷)（yuno_fild07）、毀葛深淵湖水 地下洞穴 3樓（abyss_03）、普隆德拉地下監獄（prt_prison）、毀葛深淵湖水 地下洞穴 1樓（abyss_01）、毀葛深淵湖水 地下洞穴 2樓（abyss_02）、夢羅克螞蟻地獄密穴 1樓（anthell01）、夢羅克螞蟻地獄密穴 2樓（anthell02）

### 洞窟／地洞（cave）

依斯魯得島 海盜地洞密穴 5樓（iz_dun04）、依斯魯得島 海盜地洞密穴 6樓（iz_dun05）、斐揚洞穴 1樓（pay_dun00）、天津町 榻榻米迷宮（ama_dun01）、克魔島西邊洞穴加露（beach_dun）、克魔島北邊洞穴盧安達（beach_dun2）、克魔島東邊洞穴馬吾（beach_dun3）、吉芬獸人地下洞穴 1樓（orcsdun01）、吉芬獸人地下洞穴 2樓（orcsdun02）、斐揚洞穴 2樓（pay_dun01）、斐揚洞穴 3樓（pay_dun02）、斐揚洞穴 4樓(廢村)（pay_dun03）、斐揚洞穴 5樓(廢村)（pay_dun04）、普隆德拉迷宮森林 1樓（prt_maze01）、普隆德拉迷宮森林 2樓（prt_maze02）、普隆德拉迷宮森林 3樓（prt_maze03）、研究洞-WISH（verus02）、依斯魯得島 海盜地洞密穴 1樓（iz_dun00）、依斯魯得島 海盜地洞密穴 2樓（iz_dun01）、依斯魯得島 海盜地洞密穴 3樓（iz_dun02）、依斯魯得島 海盜地洞密穴 4樓（iz_dun03）

### 海邊／島嶼（beach）

啟 海伊洛別墅（yuno_fild02）、朱諾 啟 海伊洛學院（yuno_fild08）、克魔島巴不其卡森林（cmd_fild01）、克魔島克克魔海邊（cmd_fild02）、克魔島基乃依沼澤地（cmd_fild03）、克魔島克克魔海邊（cmd_fild04）

### 沙漠／荒原（desert）

蘇克拉特沙漠（moc_fild01）、蘇克拉特沙漠（pay_fild04）、蘇克拉特沙漠（moc_fild07）、蘇克拉特沙漠（moc_fild11）、蘇克拉特沙漠（moc_fild12）、蘇克拉特沙漠（moc_fild16）、蘇克拉特沙漠（moc_fild17）、蘇克拉特沙漠（moc_fild18）、蘇克拉特沙漠（moc_fild02）、蘇克拉特沙漠（moc_fild03）、蘇克拉特沙漠（moc_fild13）、契瓦瓦沙漠（rockrdg2）、契瓦瓦沙漠（rockrdg1）

### 森林／叢林（forest）

汶巴拉嚕嚕卡森林（um_fild01）、汶巴拉滬家森林（um_fild02）、汶巴拉卡拉拉森林（um_fild03）、汶巴拉滬家叢林（um_fild04）、斐揚森林（pay_fild01）、斐揚森林（pay_fild02）、斐揚森林（pay_fild03）、斐揚森林（pay_fild06）、斐揚森林（pay_fild07）、斐揚森林（pay_fild08）、斐揚森林（pay_fild09）、斐揚森林（pay_fild10）、天津町 地下森林戰場（ama_dun02）、莫斯科森林（mosk_dun01）、莫斯科森林深處（mosk_dun02）

### 原野草原（field）

毀葛原野（hu_fild02）、毀葛原野（hu_fild04）、毀葛原野（hu_fild06）、爾邁斯 瀑雷德（yuno_fild03）、爾邁斯 瀑雷德（yuno_fild04）、爾邁斯 瀑雷德（yuno_fild06）、拉赫 阿巫敦拉草原（ra_fild01）、拉赫 伊達平原（ra_fild03）、拉赫 阿巫敦拉草原（ra_fild04）、拉赫 阿巫敦拉草原（ra_fild05）、拉赫 伊達平原（ra_fild08）、拉赫 伊達平原（ra_fild12）、浦勒吐盧納（ra_fild06）、里希塔樂鎮原野（lhz_fild01）、里希塔樂鎮原野(死神峽谷)（lhz_fild02）、里希塔樂鎮原野（lhz_fild03）、艾音布羅克原野（ein_fild03）、艾音布羅克原野（ein_fild04）、艾音布羅克原野（ein_fild05）、艾音布羅克原野（ein_fild06）、艾音布羅克原野（ein_fild07）、艾音布羅克原野（ein_fild08）、艾音布羅克原野（ein_fild09）、秀發茲發德國界檢查站（yuno_fild01）、秀發茲發德 警備隊營地（yuno_fild09）、朱諾原野（yuno_fild11）、秀發茲發德 國界檢查站（yuno_fild12）、妙勒妙勒尼山脈 北邊山麓（mjolnir_12）、菲音斯原野（ve_fild01）、菲音斯原野（ve_fild02）、菲音斯原野（ve_fild03）、菲音斯原野（ve_fild04）、菲音斯原野（ve_fild07）、妙勒妙勒尼山脈北區（mjolnir_01）、吉芬原野（gef_fild04）、冷豔舞姬村（gef_fild05）、吉芬原野（gef_fild06）、吉芬原野（gef_fild07）、吉芬原野（gef_fild08）、吉芬原野（gef_fild09）、獸人村（gef_fild10）、吉芬原野（gef_fild11）、妙勒妙勒尼山脈北區（mjolnir_02）、妙勒妙勒尼山脈北區（mjolnir_03）、妙勒妙勒尼山脈北區（mjolnir_04）、妙勒妙勒尼山脈北區（mjolnir_05）、妙勒妙勒尼山脈南區（mjolnir_06）、妙勒妙勒尼山脈南區（mjolnir_07）、妙勒妙勒尼山脈南區（mjolnir_08）、妙勒妙勒尼山脈 南邊山麓（mjolnir_09）、妙勒妙勒尼山脈南區（mjolnir_10）、妙勒妙勒尼山脈南區（mjolnir_11）、普隆德拉原野（prt_fild00）、普隆德拉 區域（prt_fild01）、普隆德拉原野（prt_fild02）、普隆德拉原野（prt_fild03）、吉芬原野（gef_fild00）、普隆德拉原野（prt_fild04）、普隆德拉原野（prt_fild05）、普隆德拉原野（prt_fild06）、普隆德拉原野（prt_fild07）、普隆德拉原野（prt_fild08）、普隆德拉原野（prt_fild09）、普隆德拉原野（prt_fild10）、普隆德拉原野（prt_fild11）、吉芬原野（gef_fild01）、吉芬原野（gef_fild02）、吉芬原野（gef_fild03）、要塞都市 山特樂曼西區（cmd_fild06）、要塞都市 山特樂曼東區（cmd_fild08）、要塞都市 山特樂曼南區（cmd_fild09）、良龜村（tur_dun01）、葛帔尼亞（gefenia01）、優配擂斯中心部（jupe_core）、哎喲泰雅原野（ayo_fild01）、德瓦他原野_賈提族部落（dew_fild01）、彩虹橋北部（bif_fild02）、開枝散葉的大地（ecl_fild01）、崑崙原野（gon_fild01）、普隆德拉區域（prt_fild08a）、普隆德拉區域（prt_fild08b）、普隆德拉區域（prt_fild08c）、普隆德拉區域（prt_fild08d）、新手修練場（new_1-3）、龍之城原野（lou_fild01）、薑餅城原野（xmas_fild01）、星光珊瑚地區（mal_dun01）、巴勒攸 馬西瓦哥（ma_fild01）、普勒斯特（ma_fild02）、尼芙菲姆 偏遠村落斯凱領頓（nif_fild01）、尼芙菲姆 鬼峽谷（nif_fild02）、被入侵的普隆德拉（prt_q）、禾貝勒開米勒之泉(天地樹葉樹幹)（yggdrasil01）、天津町 地下神舍（ama_dun03）、哎喲泰雅原野（ayo_fild02）、卡米達隧道（dic_dun01）、吉芬地下密穴 1樓（gef_dun00）、吉芬地下密穴 2樓（gef_dun01）、吉芬地下密穴 3樓（gef_dun02）、葛帔尼亞密穴（gef_dun03）、崑崙神仙的圍棋臺（gon_dun02）、崑崙武陵道院（gon_dun03）、夢羅克人面獅身像 地下1樓（in_sphinx1）、夢羅克人面獅身像 地下 2樓（in_sphinx2）、夢羅克人面獅身像 地下 3樓（in_sphinx3）、夢羅克人面獅身像 地下 4樓（in_sphinx4）、夢羅克人面獅身像 地下 5樓（in_sphinx5）、龍之城王陵（lou_dun01）、龍之城王陵內部（lou_dun02）、龍之城審良宮（lou_dun03）、朱諾 諾可羅德 2樓（mag_dun02）、莫斯科原野（mosk_fild02）、良龜村密穴（tur_dun02）、良龜村（tur_dun03）、舊良宮（tur_dun04）、地下沼澤區（tur_dun05）、薑餅城玩具分類場（xmas_dun02）、天津町原野（ama_fild01）、彩虹橋南部（bif_fild01）、卡米達山麓（dic_fild01）、卡米達山麓（dic_fild02）、葛帔尼亞（gefenia04）、葛帔尼亞（gefenia02）、葛帔尼亞（gefenia03）、魔怒克原野（man_fild01）、魔怒克原野（man_fild03）、魔怒克原野（man_fild02）、史波浪壯麗原野（spl_fild02）、史波浪壯麗原野（spl_fild03）、史波浪壯麗原野（spl_fild01）、朱諾 諾可羅德 1樓（mag_dun01）、ba_2whs01（ba_2whs01）、ba_2whs02（ba_2whs02）、ba_pw01（ba_pw01）、ba_lib（ba_lib）、ba_pw03（ba_pw03）、ba_bath（ba_bath）、ba_lost（ba_lost）、ba_pw02（ba_pw02）、特別警戒區歐斯（sp_os）、貝魯茲外圍隧道（ver_tunn）、貝魯茲 中央廣場（verus03）、地下碉堡（un_bunker）
