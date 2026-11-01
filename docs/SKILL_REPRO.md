# 技能可重現分類（D8）

> `node scripts/report_skill_repro.js` 產生。範圍：rAthena `skill_tree.yml` 新手～進階二轉（不含生命體以外的擴充職業）。
> 類別標準：**戰鬥**＝作用在自己／隊友／怪物、戰鬥機制能做；**系統**＝作用在現有系統（掉落、金錢、商店、製作、精煉、圖鑑）；**新系統**＝要先做出遊戲沒有的系統；**無法**＝依賴自由移動、真人玩家、PvP／攻城、地形物件。
> 「說明／轉譯」是放置版的可能做法，採用與否由使用者決定。遊戲現況欄的括號是目前的遊戲技能 id。

共 347 個技能：戰鬥 288、系統 32、新系統 12、無法 15。遊戲現況：現有 202、遊戲改成被動 116、缺少 29。

## 初心者（Novice）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| Basic Skill | `nv_basic` | 系統 | 缺少 | 基本動作解鎖；本作只當前置技能 |
| 急救術 | `nv_firstaid` | 戰鬥 | 現有（`novice_firstaid`） |  |
| Play Dead | `nv_trickdead` | 無法 | 缺少 | 轉譯：裝死期間怪物停止攻擊（緊急避難） |
| Call Baby | `we_callbaby` | 無法 | 缺少 | 婚姻／養子系統 |

## 劍士（Swordman）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 單手劍使用熟練度 | `sm_sword` | 戰鬥 | 現有（`swordmastery`） |  |
| 雙手劍使用熟練度 | `sm_twohand` | 戰鬥 | 現有（`twoswordmastery`） |  |
| 快速恢復 | `sm_recovery` | 戰鬥 | 現有（`increasehp`） |  |
| 狂擊 | `sm_bash` | 戰鬥 | 現有（`bash`） |  |
| 挑釁 | `sm_provoke` | 戰鬥 | 現有（`provoke`） |  |
| 怒爆 | `sm_magnum` | 戰鬥 | 現有（`magnumbreak`） |  |
| 霸體 | `sm_endure` | 戰鬥 | 現有（`endure`） |  |
| 移動時恢復HP | `sm_movingrecovery` | 戰鬥 | 現有（`hpmove`） |  |
| 攻擊弱點 | `sm_fatalblow` | 戰鬥 | 現有（`fatalblow`） |  |
| 狂暴狀態 | `sm_autoberserk` | 戰鬥 | 遊戲改成被動（`berserk_sword`） |  |

## 魔法師（Mage）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 禪心 | `mg_srecovery` | 戰鬥 | 現有（`zenrecovery`） |  |
| 火狩 | `mg_sight` | 戰鬥 | 遊戲改成被動（`sight`） |  |
| 心靈爆破 | `mg_napalmbeat` | 戰鬥 | 現有（`napalmbeat`） |  |
| 暗之障壁 | `mg_safetywall` | 戰鬥 | 現有（`safetywall`） |  |
| 聖靈召喚 | `mg_soulstrike` | 戰鬥 | 現有（`soulstrike`） |  |
| 冰箭術 | `mg_coldbolt` | 戰鬥 | 現有（`coldbolt`） |  |
| 冰凍術 | `mg_frostdiver` | 戰鬥 | 遊戲改成被動（`frostdiver`） |  |
| 石化術 | `mg_stonecurse` | 戰鬥 | 遊戲改成被動（`stonecurse`） |  |
| 火球術 | `mg_fireball` | 戰鬥 | 現有（`fireball`） |  |
| 火焰之壁 | `mg_firewall` | 戰鬥 | 現有（`firewall`） |  |
| 火箭術 | `mg_firebolt` | 戰鬥 | 現有（`firebolt`） |  |
| 雷擊術 | `mg_lightningbolt` | 戰鬥 | 現有（`lightningbolt`） |  |
| 雷爆術 | `mg_thunderstorm` | 戰鬥 | 現有（`thunderstorm`） |  |
| 能量外套 | `mg_energycoat` | 戰鬥 | 遊戲改成被動（`energycoat`） |  |

## 弓箭手（Archer）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 鶚梟之眼 | `ac_owl` | 戰鬥 | 現有（`owleye`） |  |
| 蒼鷹之眼 | `ac_vulture` | 戰鬥 | 現有（`vultureeye`） |  |
| 心神凝聚 | `ac_concentration` | 戰鬥 | 現有（`improveconc`） |  |
| 二連矢 | `ac_double` | 戰鬥 | 現有（`doublestrafe`） |  |
| 箭雨 | `ac_shower` | 戰鬥 | 現有（`arrowshower`） |  |
| 製作箭 | `ac_makingarrow` | 系統 | 遊戲改成被動（`createarrow`） | 製作箭矢 |
| 衝鋒箭 | `ac_chargearrow` | 戰鬥 | 現有（`chargearrow`） |  |

## 服事（Acolyte）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 天使之護 | `al_dp` | 戰鬥 | 現有（`divineprotection`） |  |
| 天使之擊 | `al_demonbane` | 戰鬥 | 現有（`angelic`） |  |
| 光獵 | `al_ruwach` | 戰鬥 | 現有（`ruwach`） |  |
| 光之障壁 | `al_pneuma` | 戰鬥 | 現有（`pneuma`） |  |
| 瞬間移動 | `al_teleport` | 無法 | 遊戲改成被動（`teleport`） | 轉譯：立即換一批怪，或脫離戰鬥 |
| 傳送之陣 | `al_warp` | 無法 | 現有（`warpportal`） | 轉譯：快速回城或移動到記錄點 |
| 治癒術 | `al_heal` | 戰鬥 | 現有（`heal`） |  |
| 加速術 | `al_incagi` | 戰鬥 | 現有（`increaseagi`） |  |
| 緩速術 | `al_decagi` | 戰鬥 | 遊戲改成被動（`decreaseagi`） |  |
| 天使之淚 | `al_holywater` | 系統 | 遊戲改成被動（`holywater`） | 製作聖水 |
| 天使之光 | `al_crucis` | 戰鬥 | 現有（`signumcrusis`） |  |
| 天使之障壁 | `al_angelus` | 戰鬥 | 現有（`angelusbarrier`） |  |
| 天使之賜福 | `al_blessing` | 戰鬥 | 現有（`blessing`） |  |
| 治療術 | `al_cure` | 戰鬥 | 遊戲改成被動（`cure`） |  |
| 神聖之光 | `al_holylight` | 戰鬥 | 現有（`holylight`） |  |

## 商人（Merchant）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 負重量上升 | `mc_inccarry` | 系統 | 現有（`weightup`） | 負重上限 |
| 低價買進 | `mc_discount` | 系統 | 現有（`discount`） | 商店買價折扣 |
| 高價賣出 | `mc_overcharge` | 系統 | 現有（`overcharge`） | 商店賣價提高 |
| 手推車使用 | `mc_pushcart` | 系統 | 現有（`pushcart`） | 手推車（手推車攻擊等技能的前置） |
| 物品鑑定 | `mc_identify` | 系統 | 遊戲改成被動（`itemappraisal`） | 鑑定未鑑定道具 |
| 露天商店 | `mc_vending` | 系統 | 遊戲改成被動（`vending`） | 露天商店 |
| 金錢攻擊 | `mc_mammonite` | 戰鬥 | 現有（`mammonite`） |  |
| 手推車攻擊 | `mc_cartrevolution` | 戰鬥 | 現有（`cartattack`） |  |
| 改裝手推車 | `mc_changecart` | 新系統 | 缺少 | 手推車外觀 |
| 大聲吶喊 | `mc_loud` | 戰鬥 | 現有（`loudexclamation`） |  |
| Open Buying Store | `all_buying_store` | 新系統 | 缺少 | 收購商店 |
| 改裝手推車2 | `mc_cartdecorate` | 新系統 | 缺少 | 手推車外觀 |

## 盜賊（Thief）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 二刀連擊 | `tf_double` | 戰鬥 | 現有（`doubleattack`） |  |
| 殘影 | `tf_miss` | 戰鬥 | 現有（`improvedodge`） |  |
| 偷竊 | `tf_steal` | 戰鬥 | 遊戲改成被動（`steal`） |  |
| 隱匿 | `tf_hiding` | 戰鬥 | 現有（`hiding`） |  |
| 施毒 | `tf_poison` | 戰鬥 | 現有（`envenom`） |  |
| 解毒 | `tf_detoxify` | 戰鬥 | 遊戲改成被動（`detoxify`） |  |
| 噴砂 | `tf_sprinklesand` | 戰鬥 | 遊戲改成被動（`sandman`） |  |
| 後退迴避 | `tf_backsliding` | 戰鬥 | 遊戲改成被動（`backsliding`） |  |
| 撿石頭 | `tf_pickstone` | 無法 | 缺少 | 轉譯：取得石頭道具（擲石的彈藥） |
| 投擲石頭 | `tf_throwstone` | 戰鬥 | 缺少 | 需要石頭道具 |

## 騎士（Knight）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 長矛使用熟練度 | `kn_spearmastery` | 戰鬥 | 現有（`spearmastery`） |  |
| 連刺攻擊 | `kn_pierce` | 戰鬥 | 現有（`pierce`） |  |
| 騎乘攻擊 | `kn_brandishspear` | 戰鬥 | 現有（`brandishspear`） |  |
| 長矛刺擊 | `kn_spearstab` | 戰鬥 | 遊戲改成被動（`spearstab`） |  |
| 投擲長矛攻擊 | `kn_spearboomerang` | 戰鬥 | 遊戲改成被動（`spearboomerang`） |  |
| 雙手劍攻擊速度增加 | `kn_twohandquicken` | 戰鬥 | 現有（`twohandquicken`） |  |
| 反擊 | `kn_autocounter` | 戰鬥 | 遊戲改成被動（`counter`） |  |
| 怪物互擊 | `kn_bowlingbash` | 戰鬥 | 現有（`bowlingbash`） |  |
| 騎乘術 | `kn_riding` | 戰鬥 | 現有（`riding`） |  |
| 騎兵修練 | `kn_cavaliermastery` | 戰鬥 | 現有（`cavaliermastery`） |  |
| 衝鋒攻擊 | `kn_chargeatk` | 戰鬥 | 遊戲改成被動（`charge`） |  |
| 單手劍攻擊速度增加 | `kn_onehand` | 戰鬥 | 缺少 |  |

## 十字軍（Crusader）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 信任 | `cr_trust` | 戰鬥 | 現有（`cr_trust`） |  |
| 自動防禦 | `cr_autoguard` | 戰鬥 | 現有（`autoguard`） |  |
| 盾擊 | `cr_shieldcharge` | 戰鬥 | 現有（`cr_shieldcharge`） |  |
| 迴旋盾擊 | `cr_shieldboomerang` | 戰鬥 | 現有（`cr_shieldboomerang`） |  |
| 反射盾 | `cr_reflectshield` | 戰鬥 | 現有（`cr_reflectshield`） |  |
| 聖十字攻擊 | `cr_holycross` | 戰鬥 | 現有（`cr_holycross`） |  |
| 聖十字審判 | `cr_grandcross` | 戰鬥 | 現有（`grandcross`） |  |
| 犧牲 | `cr_devotion` | 戰鬥 | 現有（`cr_devotion`） |  |
| 神祐之光 | `cr_providence` | 戰鬥 | 現有（`cr_providence`） |  |
| 光之盾 | `cr_defender` | 戰鬥 | 遊戲改成被動（`cr_defender`） |  |
| 長矛加速術 | `cr_spearquicken` | 戰鬥 | 現有（`cr_spearquicken`） |  |
| 退縮 | `cr_shrink` | 戰鬥 | 遊戲改成被動（`cr_shrink`） |  |

## 巫師（Wizard）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 火柱攻擊 | `wz_firepillar` | 戰鬥 | 遊戲改成被動（`firepillar`） |  |
| 火之獵殺 | `wz_sightrasher` | 戰鬥 | 遊戲改成被動（`firebolt_wiz`） |  |
| 隕石術 | `wz_meteor` | 戰鬥 | 現有（`meteorstorm`） |  |
| 雷鳴術 | `wz_jupitel` | 戰鬥 | 現有（`jupitel`） |  |
| 怒雷強擊 | `wz_vermilion` | 戰鬥 | 現有（`lordofvermillion`） |  |
| 水球術 | `wz_waterball` | 戰鬥 | 現有（`waterball`） |  |
| 冰刃之牆 | `wz_icewall` | 戰鬥 | 遊戲改成被動（`icewall`） |  |
| 霜凍之術 | `wz_frostnova` | 戰鬥 | 遊戲改成被動（`frostdiver_wiz`） |  |
| 暴風雪 | `wz_stormgust` | 戰鬥 | 現有（`stormgust`） |  |
| 地震術 | `wz_earthspike` | 戰鬥 | 現有（`earthspike`） |  |
| 崩裂術 | `wz_heavendrive` | 戰鬥 | 現有（`heavensdrive`） |  |
| 泥沼地 | `wz_quagmire` | 戰鬥 | 遊戲改成被動（`quagmire`） |  |
| 怪物情報 | `wz_estimation` | 系統 | 遊戲改成被動（`sense`） | 顯示怪物情報（圖鑑／介面） |
| 火狩芽 | `wz_sightblaster` | 戰鬥 | 缺少 |  |

## 賢者（Sage）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 進化之書 | `sa_advancedbook` | 戰鬥 | 現有（`sa_advancedbook`） |  |
| 取消施法 | `sa_castcancel` | 戰鬥 | 遊戲改成被動（`sa_castcancel`） |  |
| 魔法懲罰 | `sa_magicrod` | 戰鬥 | 遊戲改成被動（`sa_magicrod`） |  |
| 念咒拆除 | `sa_spellbreaker` | 戰鬥 | 遊戲改成被動（`sa_spellbreaker`） |  |
| 自由施法 | `sa_freecast` | 戰鬥 | 現有（`sa_freecast`） |  |
| 自動念咒 | `sa_autospell` | 戰鬥 | 遊戲改成被動（`sa_autospell`） |  |
| 火屬性附加 | `sa_flamelauncher` | 戰鬥 | 現有（`sa_flamelauncher`） |  |
| 水屬性附加 | `sa_frostweapon` | 戰鬥 | 現有（`sa_frostweapon`） |  |
| 風屬性附加 | `sa_lightningloader` | 戰鬥 | 現有（`sa_lightningloader`） |  |
| 地屬性附加 | `sa_seismicweapon` | 戰鬥 | 現有（`sa_seismicweapon`） |  |
| 龍知識 | `sa_dragonology` | 戰鬥 | 現有（`sa_dragonology`） |  |
| 火元素領域 | `sa_volcano` | 戰鬥 | 現有（`sa_volcano`） |  |
| 水元素領域 | `sa_deluge` | 戰鬥 | 現有（`sa_deluge`） |  |
| 風元素領域 | `sa_violentgale` | 戰鬥 | 現有（`sa_violentgale`） |  |
| 地元素領域 | `sa_landprotector` | 戰鬥 | 現有（`sa_landprotector`） |  |
| 魔法效果解除 | `sa_dispell` | 戰鬥 | 遊戲改成被動（`sa_dispell`） |  |
| 隨機技能 | `sa_abracadabra` | 戰鬥 | 遊戲改成被動（`sa_abracadabra`） |  |
| 肯貝特製作 | `sa_createcon` | 系統 | 遊戲改成被動（`sa_createcon`） | 製作屬性轉換器 |
| 水屬性元素更換 | `sa_elementwater` | 戰鬥 | 遊戲改成被動（`sa_elementwater`） |  |
| 地屬性元素更換 | `sa_elementground` | 戰鬥 | 遊戲改成被動（`sa_elementearth`） |  |
| 火屬性元素更換 | `sa_elementfire` | 戰鬥 | 遊戲改成被動（`sa_elementfire`） |  |
| 風屬性元素更換 | `sa_elementwind` | 戰鬥 | 遊戲改成被動（`sa_elementwind`） |  |

## 獵人（Hunter）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 滑動陷阱 | `ht_skidtrap` | 戰鬥 | 遊戲改成被動（`skidtrap`） |  |
| 地雷陷阱 | `ht_landmine` | 戰鬥 | 遊戲改成被動（`trap`） |  |
| 定位陷阱 | `ht_anklesnare` | 戰鬥 | 遊戲改成被動（`claymoretrap`） |  |
| 魔耗陷阱 | `ht_shockwave` | 戰鬥 | 缺少 |  |
| 睡魔陷阱 | `ht_sandman` | 戰鬥 | 遊戲改成被動（`sleeptrap`） |  |
| 強光陷阱 | `ht_flasher` | 戰鬥 | 遊戲改成被動（`flasher`） |  |
| 霜凍陷阱 | `ht_freezingtrap` | 戰鬥 | 遊戲改成被動（`freezingtrap`） |  |
| 定時爆炸陷阱 | `ht_blastmine` | 戰鬥 | 遊戲改成被動（`blastmine`） |  |
| 爆散陷阱 | `ht_claymoretrap` | 戰鬥 | 遊戲改成被動（`magnumbreak_h`） |  |
| 陷阱移除 | `ht_removetrap` | 無法 | 遊戲改成被動（`removetrap`） | 回收地上的陷阱 |
| 陷阱探查 | `ht_talkiebox` | 無法 | 遊戲改成被動（`researchtrap`） | 留言陷阱 |
| 動物殺手 | `ht_beastbane` | 戰鬥 | 現有（`animalslayer`） |  |
| 馴鷹術 | `ht_falcon` | 戰鬥 | 現有（`huntingmastery`） |  |
| 鋼製喙 | `ht_steelcrow` | 戰鬥 | 現有（`falconnastery`） |  |
| 閃電衝擊 | `ht_blitzbeat` | 戰鬥 | 現有（`blitzbeat`） |  |
| 獵鷹尋敵 | `ht_detecting` | 戰鬥 | 遊戲改成被動（`falcondelivery`） |  |
| 爆破陷阱 | `ht_springtrap` | 無法 | 缺少 | 破壞他人的陷阱 |
| 幻影箭 | `ht_phantasmic` | 戰鬥 | 缺少 |  |
| 動物猛擊 | `ht_power` | 戰鬥 | 缺少 |  |

## 詩人（Bard）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 操控樂器 | `ba_musicallesson` | 戰鬥 | 現有（`ba_musicallesson`） |  |
| 樂器攻擊 | `ba_musicalstrike` | 戰鬥 | 現有（`ba_musicalstrike`） |  |
| 不諧和音 | `ba_dissonance` | 戰鬥 | 遊戲改成被動（`ba_dissonance`） |  |
| Unbarring Octave | `ba_frostjoker` | 戰鬥 | 缺少 |  |
| 吹口哨 | `ba_whistle` | 戰鬥 | 現有（`ba_whistle`） |  |
| 刺客的黃昏 | `ba_assassincross` | 戰鬥 | 現有（`ba_assassincross`） |  |
| 布萊奇之詩 | `ba_poembragi` | 戰鬥 | 現有（`ba_poembragi`） |  |
| 伊登的蘋果 | `ba_appleidun` | 戰鬥 | 現有（`ba_appleidun`） |  |
| 臨機應變 | `bd_adaptation` | 戰鬥 | 現有（`bd_adaptation`） |  |
| 安可 | `bd_encore` | 戰鬥 | 現有（`bd_encore`） |  |
| 搖籃曲 | `bd_lullaby` | 戰鬥 | 現有（`bd_lullaby`） |  |
| 經驗值倍增 | `bd_richmankim` | 系統 | 現有（`bd_richmankim`） | 經驗值加成（合奏） |
| 永遠的混沌 | `bd_eternalchaos` | 戰鬥 | 現有（`bd_eternalchaos`） |  |
| 戰鼓震天 | `bd_drumbattlefield` | 戰鬥 | 現有（`bd_drumbattlefield`） |  |
| 尼貝隆根之戒指 | `bd_ringnibelungen` | 戰鬥 | 現有（`bd_ringnibelungen`） |  |
| 洛奇的悲鳴 | `bd_rokisweil` | 戰鬥 | 現有（`bd_rokisweil`） |  |
| 觸媒之所 | `bd_intoabyss` | 戰鬥 | 現有（`bd_intoabyss`） |  |
| 不死神齊格弗里德 | `bd_siegfried` | 戰鬥 | 現有（`bd_siegfried`） |  |
| 陣痛之聲 | `ba_pangvoice` | 戰鬥 | 遊戲改成被動（`ba_pangvoice`） |  |

## 舞孃（Dancer）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 練習舞蹈 | `dc_dancinglesson` | 戰鬥 | 現有（`dc_dancinglesson`） |  |
| 纏箭投擲 | `dc_throwarrow` | 戰鬥 | 現有（`dc_throwarrow`） |  |
| 醜陋之舞 | `dc_uglydance` | 戰鬥 | 遊戲改成被動（`dc_uglydance`） |  |
| 驚聲尖叫 | `dc_scream` | 戰鬥 | 遊戲改成被動（`dc_scream`） |  |
| 哼唱之音 | `dc_humming` | 戰鬥 | 現有（`dc_humming`） |  |
| 勿忘我 | `dc_dontforgetme` | 戰鬥 | 現有（`dc_dontforgetme`） |  |
| 女神之吻 | `dc_fortunekiss` | 戰鬥 | 現有（`dc_fortunekiss`） |  |
| 為您服務 | `dc_serviceforyou` | 戰鬥 | 現有（`dc_serviceforyou`） |  |
| 眨眼之誘 | `dc_winkcharm` | 戰鬥 | 遊戲改成被動（`dc_winkcharm`） |  |

## 祭司（Priest）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 復活術 | `all_resurrection` | 戰鬥 | 遊戲改成被動（`resurrection`） |  |
| 鈍器使用熟練度 | `pr_macemastery` | 戰鬥 | 現有（`maceMastery`） |  |
| 神威祈福 | `pr_impositio` | 戰鬥 | 現有（`impositio_manus`） |  |
| 犧牲祈福 | `pr_suffragium` | 戰鬥 | 遊戲改成被動（`assumptio`） |  |
| 撒水祈福 | `pr_aspersio` | 戰鬥 | 現有（`aspersio`） |  |
| 聖之祈福 | `pr_benedictio` | 戰鬥 | 現有（`sanctuary_holy`） |  |
| 光耀之堂 | `pr_sanctuary` | 戰鬥 | 現有（`sanctuary`） |  |
| 緩毒術 | `pr_slowpoison` | 戰鬥 | 現有（`slowpoison`） |  |
| 痊癒術 | `pr_strecovery` | 戰鬥 | 現有（`strecovery`） |  |
| 霸邪之陣 | `pr_kyrie` | 戰鬥 | 現有（`kyrie`） |  |
| 聖母之頌歌 | `pr_magnificat` | 戰鬥 | 現有（`magnificat`） |  |
| 幸運之頌歌 | `pr_gloria` | 戰鬥 | 現有（`gloria`） |  |
| 沉默之術 | `pr_lexdivina` | 戰鬥 | 遊戲改成被動（`impositio`） |  |
| 轉生術 | `pr_turnundead` | 戰鬥 | 現有（`turnundead`） |  |
| 天使之怒 | `pr_lexaeterna` | 戰鬥 | 遊戲改成被動（`angelus`） |  |
| 十字驅魔攻擊 | `pr_magnus` | 戰鬥 | 現有（`asperio`） |  |
| 捨身取義 | `pr_redemptio` | 戰鬥 | 遊戲改成被動（`suffragium`） |  |

## 武僧（Monk）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 鐵沙掌 | `mo_ironhand` | 戰鬥 | 現有（`mo_ironhand`） |  |
| 運氣調息 | `mo_spiritsrecovery` | 戰鬥 | 現有（`mo_spiritsrecovery`） |  |
| 蓄氣 | `mo_callspirits` | 戰鬥 | 遊戲改成被動（`mo_callspirits`） |  |
| 吸氣 | `mo_absorbspirits` | 戰鬥 | 遊戲改成被動（`mo_absorbspirits`） |  |
| 六合拳 | `mo_tripleattack` | 戰鬥 | 現有（`mo_tripleattack`） |  |
| 弓身彈影 | `mo_bodyrelocation` | 戰鬥 | 遊戲改成被動（`mo_bodyrelocation`） |  |
| 移花接木 | `mo_dodge` | 戰鬥 | 現有（`mo_dodge`） |  |
| 浸透勁 | `mo_investigate` | 戰鬥 | 遊戲改成被動（`mo_investigate`） |  |
| 彈指神通 | `mo_fingeroffensive` | 戰鬥 | 遊戲改成被動（`mo_fingeroffensive`） |  |
| 金剛不壞 | `mo_steelbody` | 戰鬥 | 遊戲改成被動（`mo_steelbody`） |  |
| 真劍百破道 | `mo_bladestop` | 戰鬥 | 遊戲改成被動（`mo_bladestop`） |  |
| 爆氣 | `mo_explosionspirits` | 戰鬥 | 遊戲改成被動（`mo_explosionspirits`） |  |
| 阿修羅霸凰拳 | `mo_extremityfist` | 戰鬥 | 遊戲改成被動（`mo_extremityfist`） |  |
| 連環全身掌 | `mo_chaincombo` | 戰鬥 | 遊戲改成被動（`mo_chaincombo`） |  |
| 猛龍誇強 | `mo_combofinish` | 戰鬥 | 遊戲改成被動（`mo_combofinish`） |  |
| 振氣注入 | `mo_kitranslation` | 戰鬥 | 遊戲改成被動（`mo_kitranslation`） |  |
| 發勁 | `mo_balkyoung` | 戰鬥 | 遊戲改成被動（`mo_balkyoung`） |  |

## 鐵匠（Blacksmith）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 鐵製造 | `bs_iron` | 系統 | 現有（`ironworking`） | 鍛造（重製中） |
| 鋼製造 | `bs_steel` | 系統 | 現有（`steelworking`） | 鍛造（重製中） |
| 屬性石製造 | `bs_enchantedstone` | 系統 | 現有（`elementalstone`） | 鍛造（重製中） |
| 神之金屬研究 | `bs_orideocon` | 系統 | 現有（`oridecon`） | 鍛造成功率 |
| 短劍製作 | `bs_dagger` | 系統 | 現有（`daggercraft`） | 鍛造（重製中） |
| 單手劍製作 | `bs_sword` | 系統 | 缺少 | 鍛造（重製中） |
| 雙手劍製作 | `bs_twohandsword` | 系統 | 缺少 | 鍛造（重製中） |
| 斧頭製作 | `bs_axe` | 系統 | 現有（`axecraft`） | 鍛造（重製中） |
| 鈍器製作 | `bs_mace` | 系統 | 現有（`macecraft`） | 鍛造（重製中） |
| 拳套製作 | `bs_knuckle` | 系統 | 現有（`knucklecraft`） | 鍛造（重製中） |
| 長矛製作 | `bs_spear` | 系統 | 現有（`spearcraft`） | 鍛造（重製中） |
| 武器保有 | `bs_hiltbinding` | 戰鬥 | 現有（`hiltbinding`） | 另有鍛造加成（重製中） |
| 尋找礦石 | `bs_findingore` | 系統 | 現有（`findingore`） | 打怪額外掉礦石 |
| 武器研究 | `bs_weaponresearch` | 戰鬥 | 現有（`weaponresearch`） | 另有鍛造加成（重製中） |
| 武器修理 | `bs_repairweapon` | 新系統 | 遊戲改成被動（`weaponrepair`） | 裝備損壞系統 |
| 強化火屬性 | `bs_skintemper` | 戰鬥 | 現有（`skintemper`） |  |
| 大地之擊 | `bs_hammerfall` | 戰鬥 | 遊戲改成被動（`hammerfall`） |  |
| 速度激發 | `bs_adrenaline` | 戰鬥 | 現有（`adrenaline`） |  |
| 無視體型攻擊 | `bs_weaponperfect` | 戰鬥 | 現有（`overthrust`） |  |
| 凶砍 | `bs_overthrust` | 戰鬥 | 現有（`overthrustbuff`） |  |
| 武器值最大化 | `bs_maximize` | 戰鬥 | 現有（`maximize`） |  |
| 詭計的商術 | `bs_unfairlytrick` | 戰鬥 | 現有（`weaponfusion`） |  |
| 貪婪 | `bs_greed` | 無法 | 遊戲改成被動（`greed`） | 掉落已自動入包，沒有作用 |
| 所有速度激發 | `bs_adrenaline2` | 戰鬥 | 缺少 |  |

## 鍊金術師（Alchemist）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 斧頭和單手劍使用熟練度 | `am_axemastery` | 戰鬥 | 現有（`am_axemastery`） |  |
| 知識藥水 | `am_learningpotion` | 系統 | 現有（`am_learningpotion`） | 製藥成功率 |
| 配藥 | `am_pharmacy` | 系統 | 遊戲改成被動（`am_pharmacy`） | 製藥 |
| 火煙瓶投擲 | `am_demonstration` | 戰鬥 | 現有（`am_demonstration`） |  |
| 強酸攻擊 | `am_acidterror` | 戰鬥 | 現有（`am_acidterror`） |  |
| 藥水投擲 | `am_potionpitcher` | 戰鬥 | 遊戲改成被動（`am_potionpitcher`） |  |
| 生物調撥 | `am_cannibalize` | 戰鬥 | 現有（`am_cannibalize`） |  |
| 氣泡蟲召喚 | `am_spheremine` | 戰鬥 | 現有（`am_spheremine`） |  |
| 化學武器保護 | `am_cp_weapon` | 新系統 | 現有（`am_cp_weapon`） | 裝備損壞／剝離系統 |
| 化學盾牌保護 | `am_cp_shield` | 新系統 | 現有（`am_cp_shield`） | 裝備損壞／剝離系統 |
| 化學鎧甲保護 | `am_cp_armor` | 新系統 | 現有（`am_cp_armor`） | 裝備損壞／剝離系統 |
| 化學頭盔保護 | `am_cp_helm` | 新系統 | 現有（`am_cp_helm`） | 裝備損壞／剝離系統 |
| 生命倫理 | `am_bioethics` | 新系統 | 現有（`am_bioethics`） | 生命體（決定不做） |
| 生命體召喚 | `am_callhomun` | 新系統 | 現有（`am_callhomun`） | 生命體（決定不做） |
| 安息 | `am_rest` | 新系統 | 遊戲改成被動（`am_rest`） | 生命體（決定不做） |
| 復活生命體 | `am_resurrecthomun` | 新系統 | 遊戲改成被動（`am_resurrecthomun`） | 生命體（決定不做） |
| 菠色克投擲 | `am_berserkpitcher` | 戰鬥 | 缺少 |  |
| 寬廣配藥1 | `am_twilight1` | 系統 | 缺少 | 大量製藥 |
| 寬廣配藥2 | `am_twilight2` | 系統 | 缺少 | 大量製藥 |
| 寬廣配藥3 | `am_twilight3` | 系統 | 缺少 | 大量製藥 |

## 刺客（Assassin）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 右手修練 | `as_right` | 戰鬥 | 現有（`rightmaster`） |  |
| 左手修練 | `as_left` | 戰鬥 | 現有（`leftmaster`） |  |
| 拳刃修練 | `as_katar` | 戰鬥 | 現有（`katarmastery`） |  |
| 偽裝 | `as_cloaking` | 戰鬥 | 現有（`cloaking`） |  |
| 音速投擲 | `as_sonicblow` | 戰鬥 | 現有（`sonicblow`） |  |
| 無影之牙 | `as_grimtooth` | 戰鬥 | 現有（`grimtooth`） |  |
| 塗毒 | `as_enchantpoison` | 戰鬥 | 現有（`enchantweapon`） |  |
| 毒性反彈 | `as_poisonreact` | 戰鬥 | 遊戲改成被動（`poisonreact`） |  |
| 病毒散播 | `as_venomdust` | 戰鬥 | 遊戲改成被動（`venomdust`） |  |
| 毒性感染 | `as_splasher` | 戰鬥 | 遊戲改成被動（`venominfusion`） |  |
| 超音速投擲 | `as_sonicaccel` | 戰鬥 | 現有（`sonicblow_max`） |  |
| 毒刃 | `as_venomknife` | 戰鬥 | 現有（`enchantblade`） |  |

## 流氓（Rogue）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 強奪 | `rg_snatcher` | 戰鬥 | 現有（`rg_snatcher`） |  |
| 偷錢 | `rg_stealcoin` | 戰鬥 | 遊戲改成被動（`rg_stealcoin`） |  |
| 背刺 | `rg_backstap` | 戰鬥 | 現有（`rg_backstap`） |  |
| 潛遁 | `rg_tunneldrive` | 無法 | 現有（`rg_tunneldrive`） | 轉譯：隱匿狀態下仍可行動 |
| 潛擊 | `rg_raid` | 戰鬥 | 遊戲改成被動（`rg_raid`） |  |
| 卸除武器 | `rg_stripweapon` | 戰鬥 | 遊戲改成被動（`rg_stripweapon`） |  |
| 卸除盾牌 | `rg_stripshield` | 戰鬥 | 遊戲改成被動（`rg_stripshield`） |  |
| 卸除鎧甲 | `rg_striparmor` | 戰鬥 | 遊戲改成被動（`rg_striparmor`） |  |
| 卸除頭盔 | `rg_striphelm` | 戰鬥 | 遊戲改成被動（`rg_striphelm`） |  |
| 脅持 | `rg_intimidate` | 戰鬥 | 遊戲改成被動（`rg_intimidate`） |  |
| 塗鴉 | `rg_graffiti` | 無法 | 缺少 | 地面塗鴉 |
| 旗幟塗鴉 | `rg_flaggraffiti` | 無法 | 缺少 | 攻城戰旗幟塗鴉 |
| 清洗 | `rg_cleaner` | 無法 | 缺少 | 清除塗鴉 |
| 流氓天國 | `rg_gangster` | 無法 | 缺少 | 影響其他坐下的玩家 |
| 強制減價 | `rg_compulsion` | 系統 | 現有（`rg_compulsion`） | 商店買價折扣 |
| 抄襲 | `rg_plagiarism` | 戰鬥 | 現有（`rg_plagiarism`） | 複製怪物施放的技能 |
| 緊密的約束 | `rg_closeconfine` | 戰鬥 | 遊戲改成被動（`rg_closeconfine`） |  |

## 騎士領主（Lord_Knight）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 靈氣劍 | `lk_aurablade` | 戰鬥 | 現有（`lk_aurablade`） |  |
| 雙劍挌擋 | `lk_parrying` | 戰鬥 | 遊戲改成被動（`lk_parrying`） |  |
| 集中攻擊 | `lk_concentration` | 戰鬥 | 現有（`lk_concentration`） |  |
| 極速回復 | `lk_tensionrelax` | 戰鬥 | 遊戲改成被動（`lk_tensionrelax`） |  |
| 狂怒之槍 | `lk_berserk` | 戰鬥 | 遊戲改成被動（`lk_berserk`） |  |
| 螺旋擊刺 | `lk_spiralpierce` | 戰鬥 | 現有（`lk_spiralpierce`） |  |
| 傷害增壓 | `lk_headcrush` | 戰鬥 | 遊戲改成被動（`lk_headcrush`） |  |
| 巧打 | `lk_jointbeat` | 戰鬥 | 遊戲改成被動（`lk_jointbeat`） |  |

## 聖殿十字軍（Paladin）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 神之威壓 | `pa_pressure` | 戰鬥 | 現有（`pa_pressure`） |  |
| 捨命攻擊 | `pa_sacrifice` | 戰鬥 | 現有（`pa_sacrifice`） |  |
| 聖音 | `pa_gospel` | 戰鬥 | 現有（`pa_gospel`） |  |
| 連續盾擊 | `pa_shieldchain` | 戰鬥 | 現有（`pa_shieldchain`） |  |

## 超魔導師（High_Wizard）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 吸魂術 | `hw_souldrain` | 戰鬥 | 現有（`hw_souldrain`） |  |
| 魔擊術 | `hw_magiccrasher` | 戰鬥 | 遊戲改成被動（`hw_magiccrasher`） |  |
| 魔力增幅 | `hw_magicpower` | 戰鬥 | 現有（`hw_magicpower`） |  |
| 念力連擊 | `hw_napalmvulcan` | 戰鬥 | 現有（`hw_napalmvulcan`） |  |
| 咖般塔音 | `hw_ganbantein` | 戰鬥 | 遊戲改成被動（`hw_ganbantein`） |  |
| 重力原野 | `hw_gravitation` | 戰鬥 | 現有（`hw_gravitation`） |  |

## 智者（Professor）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| HP轉換 | `pf_hpconversion` | 戰鬥 | 現有（`pf_hpconversion`） |  |
| 心神互換 | `pf_soulchange` | 戰鬥 | 遊戲改成被動（`pf_soulchange`） |  |
| 精神耗弱術 | `pf_soulburn` | 戰鬥 | 遊戲改成被動（`pf_soulburn`） |  |
| 精神撼動 | `pf_mindbreaker` | 戰鬥 | 遊戲改成被動（`pf_mindbreaker`） |  |
| 速讀術 | `pf_memorize` | 戰鬥 | 遊戲改成被動（`pf_memorize`） |  |
| 薄霧牆 | `pf_fogwall` | 戰鬥 | 遊戲改成被動（`pf_fogwall`） |  |
| 易燃之網 | `pf_spiderweb` | 戰鬥 | 現有（`pf_spiderweb`） |  |
| 雙倍投擲 | `pf_doublecasting` | 戰鬥 | 現有（`pf_doublecasting`） |  |

## 神射手（Sniper）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 狙殺瞄準 | `sn_sight` | 戰鬥 | 現有（`sn_sight`） |  |
| 獵鷹突擊 | `sn_falconassault` | 戰鬥 | 現有（`sn_falconassault`） |  |
| 銳利射擊 | `sn_sharpshooting` | 戰鬥 | 現有（`sn_sharpshooting`） |  |
| 風之步 | `sn_windwalk` | 戰鬥 | 現有（`sn_windwalk`） |  |

## 搞笑藝人（Clown）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 奧義箭亂舞 | `cg_arrowvulcan` | 戰鬥 | 現有（`cg_arrowvulcan`） |  |
| 落花伴著月光下的水車小屋 | `cg_moonlit` | 戰鬥 | 現有（`cg_moonlit`） |  |
| 傀儡師的把戲 | `cg_marionette` | 戰鬥 | 缺少 |  |
| 職人演奏家 | `cg_specialsinger` | 戰鬥 | 遊戲改成被動（`cg_specialsinger`） |  |
| 海羅默德的手杖 | `cg_hermode` | 戰鬥 | 現有（`cg_hermode`） |  |
| 命運的塔羅牌 | `cg_tarotcard` | 戰鬥 | 遊戲改成被動（`cg_tarotcard`） |  |

## 神官（High_Priest）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 聖母之祈福 | `hp_assumptio` | 戰鬥 | 現有（`hp_assumptio`） |  |
| 神聖殿堂 | `hp_basilica` | 戰鬥 | 現有（`hp_basilica`） |  |
| 冥想 | `hp_meditatio` | 戰鬥 | 現有（`hp_meditatio`） |  |
| 魔力減免 | `hp_manarecharge` | 戰鬥 | 現有（`hp_manarecharge`） |  |

## 武術宗師（Champion）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 猛虎硬派山 | `ch_palmstrike` | 戰鬥 | 遊戲改成被動（`ch_palmstrike`） |  |
| 伏虎拳 | `ch_tigerfist` | 戰鬥 | 遊戲改成被動（`ch_tigerfist`） |  |
| 氣絕崩擊 | `ch_chaincrush` | 戰鬥 | 遊戲改成被動（`ch_chaincrush`） |  |
| 狂蓄氣 | `ch_soulcollect` | 戰鬥 | 遊戲改成被動（`ch_soulcollect`） |  |

## 神工匠（Whitesmith）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 野蠻凶砍 | `ws_meltdown` | 戰鬥 | 現有（`ws_meltdown`） |  |
| 手推車加速 | `ws_cartboost` | 戰鬥 | 遊戲改成被動（`ws_cartboost`） |  |
| 武器精煉 | `ws_weaponrefine` | 系統 | 遊戲改成被動（`ws_weaponrefine`） | 精煉 |
| 手推車終結技 | `ws_carttermination` | 戰鬥 | 現有（`ws_cartterm`） |  |
| 凶砍最大值 | `ws_overthrustmax` | 戰鬥 | 現有（`ws_overthrustmax`） |  |

## 創造者（Creator）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| Aid Condensed Potion | `cr_slimpitcher` | 戰鬥 | 缺少 |  |
| Full Protection | `cr_fullprotection` | 戰鬥 | 缺少 |  |
| 強酸火煙瓶投擲 | `cr_aciddemonstration` | 戰鬥 | 現有（`bc_aciddemonstration`） |  |

## 十字刺客（Assassin_Cross）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 高階拳刃修練 | `asc_katar` | 戰鬥 | 現有（`asc_katar`） |  |
| 致命塗毒 | `asc_edp` | 戰鬥 | 遊戲改成被動（`asc_edp`） |  |
| 心靈震波 | `asc_breaker` | 戰鬥 | 現有（`asc_breaker`） |  |
| 黑暗瞬間 | `asc_meteorassault` | 戰鬥 | 遊戲改成被動（`asc_meteorassault`） |  |
| 毒液製作 | `asc_cdp` | 系統 | 遊戲改成被動（`asc_cdp`） | 製作毒藥瓶 |

## 神行太保（Stalker）

| 技能 | rAthena | 類別 | 遊戲現況 | 說明／轉譯 |
|---|---|---|---|---|
| 暗影追蹤 | `st_chasewalk` | 無法 | 現有（`st_chasewalk`） | 轉譯：隱匿狀態下的移速／STR 加成 |
| 霸王魂 | `st_rejectsword` | 戰鬥 | 現有（`st_rejectsword`） |  |
| 自由保護 | `st_preserve` | 戰鬥 | 遊戲改成被動（`st_preserve`） |  |
| 所有卸除 | `st_fullstrip` | 戰鬥 | 遊戲改成被動（`st_fullstrip`） |  |

