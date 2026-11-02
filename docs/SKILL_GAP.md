# 官方技能缺口（T9 第二部分）

> 2026-11-02 盤點。範圍：rAthena `skill_tree.yml` 新手～進階二轉（D4），對照目前的 `js/skills.js`。

## 總覽

| 狀態 | 數量 |
|---|---|
| 官方技能總數（含各職業重複） | 380 |
| 遊戲完全沒有 | 26 |
| 官方是主動技，遊戲改成被動觸發（原作者的改編） | 104 |
| 標「未實裝」只當前置技能 | 3（傳送之陣、陷阱探查、地元素領域） |

## 完全沒有的 26 個

- novice 缺 3: nv_basic nv_trickdead we_callbaby
- acolyte 缺 0:  | 未實裝 al_warp
- merchant 缺 3: mc_changecart all_buying_store mc_cartdecorate
- thief 缺 2: tf_pickstone tf_throwstone
- knight 缺 1: kn_onehand
- wizard 缺 1: wz_sightblaster
- blacksmith 缺 2: bs_twohandsword bs_adrenaline2
- hunter 缺 4: ht_shockwave ht_springtrap ht_phantasmic ht_power | 未實裝 ht_talkiebox
- sage 缺 0:  | 未實裝 sa_landprotector
- rogue 缺 4: rg_graffiti rg_flaggraffiti rg_cleaner rg_gangster
- alchemist 缺 4: am_berserkpitcher am_twilight1 am_twilight2 am_twilight3
- clown 缺 1: cg_marionette
- gypsy 缺 1: cg_marionette

多數依賴本作沒有的系統：手推車外觀、塗鴉、婚姻、撿石頭、馬里奧內特（綁定隊友）、生命體。真正能做成戰鬥技的：`kn_onehand`（單手劍加速）、`wz_sightblaster`、`bs_twohandsword`、`bs_adrenaline2`、`ht_springtrap`／`ht_shockwave`、`ht_phantasmic`、`ht_power`、`am_berserkpitcher`。

## 主動改被動的 104 個

原作者把大量主動技改成「普攻時機率觸發」或常駐效果，D8 要求回歸官方。可依性質分批：

- **可放進 4 格的攻擊／控場技**（約 36 個）：冰凍術、石化術、緩速術、沉默之術、衝鋒攻擊、長矛刺擊、投擲長矛、大地之擊、傷害增壓、巧打、魔擊術、黑暗瞬間、浸透勁、彈指神通、阿修羅霸凰拳、猛虎硬派山、卸除系列…
- **輔助／常駐增益**：能量外套、光之盾、犧牲祈福、金剛不壞、爆氣、自動念咒、速讀術…（可改成輔助技能自動補）
- **依賴新系統**：製作箭、露天商店、偷竊、配藥、武器精煉、肯貝特製作、生命體…（維持被動或另案）
- **武僧連段**：蓄氣、連環全身掌、猛龍誇強、阿修羅霸凰拳，需要先設計連段機制

### 第一批：增益類（2026-11-02 已還原）

改成官方的主動增益，效果結束、冷卻好就由輔助技能自動補：

| 技能 | 改前（原作者的被動） | 改後（官方） |
|---|---|---|
| 能量外套 | 自動戰鬥頁勾選，固定減傷 30% | 持續 300 秒，依 SP 每 20% 一階減傷 6~30%、每次扣最大 SP 1~3% |
| 光之盾 | 機率完全免傷＋常駐攻速懲罰 | 持續 180 秒，遠距離物理傷害 −20~80%、攻速 −20~0% |
| 犧牲祈福 | 常駐 ASPD +1~3 | 全隊變動詠唱 −10~20%，60 秒 |
| 速讀術 | 雙倍投擲機率 +20% | 下 5 次變動詠唱減半 |
| 自動念咒 | 常駐 | 持續 120~390 秒期間才觸發 |
| 雙劍挌擋 | 常駐 10~55% | 持續 15~60 秒，23~50% |
| 致命塗毒 | 攻擊中毒怪時機率觸發 10 秒 | 消耗毒藥瓶，裝備 ATK ×280~400%，40~120 秒 |
| 手推車加速 | 自動循環 | 60 秒生怪 +20% |
| 毒性反彈 | 常駐 | 持續 20~60 秒，反擊 ATK 130~400% |

暫不還原（自動補會壞掉放置玩法）：狂怒之槍（期間不能用技能、HP 持續下降）、反擊（0.4~2 秒的架勢）、金剛不壞（要氣球體，跟武僧連段一起做）、極速回復（要坐下）。

### 第二批：傷害類（2026-11-02 已還原）

改成官方主動技，可以放進 4 格：

| 技能 | 改前（原作者的被動觸發） | 改後（官方，台服技能表） |
|---|---|---|
| 長矛刺擊 | 被打時機率反擊暈眩，等級上限 1 | ATK 120~300%、擊退 6 格，等級上限 10 |
| 投擲長矛 | 怪 ≥2 時每 5 秒隨機一隻，等級上限 1 | ATK 150~350%、射程 3~11 格，等級上限 5 |
| 衝鋒攻擊 | 普攻機率觸發 | ATK 700%、擊退 2 格 |
| 火之獵殺 | 被打時觸發 | 自身 15×15、MATK 120~300%、擊退 |
| 霜凍之術 | 被打時觸發，等級上限 1 | 自身 7×7、MATK 73~133%、冰凍 38~83%，等級上限 10 |
| 傷害增壓 | 普攻 5~25% 機率追加 | ATK 140~300%、50% 出血 |
| 巧打 | 普攻機率追加 | ATK 60~150%、10~55% 隨機異常 |
| 黑暗瞬間 | 普攻 20% 機率全體 | 自身 5×5、ATK 320~1400%、10~55% 異常 |
| 魔擊術 | 普攻 20% 機率追加 | MATK 100% 吃物理防禦 |
| 噴砂 | 普攻機率黑暗 | 地屬性 130%、20% 黑暗 |

### 第三批：控場類（2026-11-02 已還原）

| 技能 | 改前（原作者的被動觸發） | 改後（官方，台服技能表） | 放哪 |
|---|---|---|---|
| 冰凍術 | 被打時凍結攻擊者，等級上限 1 | MATK 110~200%、冰凍 38~65%（3~30 秒），等級上限 10 | 4 格 |
| 石化術 | 被打時凍結攻擊者，等級上限 1 | 消耗紅礦石，石化 24~60%，等級上限 10 | 4 格 |
| 緩速術 | 被打時暈眩攻擊者 | 53~80% 緩速：AGI −3~12、移速 −25%，40~130 秒 | 4 格 |
| 沉默之術 | 普攻 20% 機率沉默，等級上限 1 | 沉默 30~60 秒，等級上限 10 | 4 格 |
| 天使之怒 | 每 10 秒下一擊 ×2 | 目標下一次受到的傷害 ×2 | 4 格 |
| 卸除武器／頭盔／盾牌／鎧甲、所有卸除 | 普攻機率觸發 | 主動擲骰 10~30%（所有卸除 7~15%），75~135 秒 | 4 格 |
| 大地之擊 | 普攻機率暈眩 | 5×5 暈眩 30~70% | 輔助（有怪就放） |
| 冷笑話、驚聲尖叫 | 普攻機率全體異常 | 畫面內冰凍 20~40%／暈眩 30~50% | 輔助（有怪就放） |

順手修正：rAthena 範圍 −1（整個畫面）以前被當成半徑 −1，冷笑話與驚聲尖叫一隻都打不到；`skills.js` 裡冷笑話有兩份定義，後面那份舊的蓋掉前面的，已刪除。

### 第四批：冷門控場（2026-11-02）

照官方做：陣痛之聲（混亂、出血各 50%）、眨眼之誘（迷惑人型／天使／惡魔 10 秒不攻擊、受傷解除）、魔法效果解除（黃礦石，60~100% 清除增益）、精神撼動（魔防 −12~60%、魔攻 +20~100%）、緊密的約束（目標定身 10 秒、自己迴避 +50）、退縮（900 秒內自動防禦擋下時 50% 暈眩）。

改成未實裝、只當前置技能：心神互換（怪物沒有 SP）、精神耗弱術（官方限 PvP）、念咒拆除（怪物沒有詠唱與 SP）、脅持（沒有地圖移動）。原本原作者的被動效果隨之移除。

逐項清單：

- `sm_autoberserk(狂暴狀態):berserk`
- `mg_sight(火狩):fleeFlat`
- `mg_energycoat(能量外套):energyCoatUnlock`
- `mg_frostdiver(冰凍術):onHitMagicStunProc`
- `mg_stonecurse(石化術):onHitMagicStunProc`
- `ac_makingarrow(製作箭):arrowCraft`
- `mc_vending(露天商店):vending`
- `mc_identify(物品鑑定):triStatBonus`
- `tf_detoxify(解毒):autoDetox`
- `tf_sprinklesand(噴砂):sandmanProc`
- `tf_backsliding(後退迴避):backslideDodge`
- `tf_steal(偷竊):steal`
- `al_teleport(瞬間移動):fleeFlat`
- `al_cure(治療術):partyAutoCure`
- `al_decagi(緩速術):onHitStunProc`
- `al_holywater(天使之淚):autoDetox`
- `kn_chargeatk(衝鋒攻擊):chargeRandomProc`
- `kn_spearstab(長矛刺擊):spearCounterProc`
- `kn_spearboomerang(投擲長矛):spearBoomerangProc`
- `kn_autocounter(反擊):counterAttack`
- `wz_estimation(怪物情報):fleeFlat`
- `wz_sightrasher(火之獵殺):onHitAoeProc`
- `wz_frostnova(霜凍之術):onHitAoeStunProc`
- `ht_detecting(獵鷹尋敵):critRate`
- `ht_removetrap(陷阱移除):trapCdReduction`
- `bs_repairweapon(武器修理):atkFlat`
- `bs_hammerfall(大地之擊):hammerfallProc`
- `bs_greed(貪婪):greedProc`
- `as_poisonreact(毒性反彈):poisonReact`
- `as_splasher(毒性感染):venominfusionProc`
- `pr_suffragium(犧牲祈福):aspdFlat`
- `all_resurrection(復活術):onDeathRevive1`
- `pr_lexdivina(沉默之術):onAttackSilenceProc`
- `pr_lexaeterna(天使之怒):angelusProc`
- `pr_redemptio(捨身取義):onDeathRevive2`
- `ba_frostjoker(冷笑話):onAttackAoeAilment`
- `lk_berserk(狂怒之槍):frenzyProc`
- `lk_tensionrelax(極速回復):regenDoubleProc`
- `lk_parrying(雙劍挌擋):parryingProc`
- `lk_headcrush(傷害增壓):onAttackStrikeProc`
- `lk_jointbeat(巧打):onAttackStrikeProc`
- `asc_cdp(毒液製作):materialCraft`
- `asc_edp(致命塗毒):edpProc`
- `asc_meteorassault(黑暗瞬間):onAttackPhysAoeProc`
- `ws_weaponrefine(武器精煉):refineBonus`
- `ws_cartboost(手推車加速):cartBoost`
- `hw_ganbantein(咖般塔音):ganbanteinProc`
- `hw_magiccrasher(魔擊術):magicCrasherProc`
- `cr_defender(光之盾):defenderPassive`
- `cr_shrink(退縮):shrinkStun`
- `ba_dissonance(不諧和音):onAttackAoeMagic`
- `ba_pangvoice(陣痛之聲):onAttackDualAilment`
- `dc_scream(驚聲尖叫):onAttackAoeAilment`
- `dc_uglydance(醜陋之舞):onAttackAoeAilment`
- `dc_winkcharm(眨眼之誘):onAttackDualAilment`
- `rg_stealcoin(偷錢):stealCoin`
- `rg_raid(潛擊):raidProc`
- `rg_intimidate(脅持):intimidateProc`
- `rg_striphelm(卸除頭盔):stripProc`
- `rg_stripshield(卸除盾牌):stripProc`
- `rg_striparmor(卸除鎧甲):stripProc`
- `rg_stripweapon(卸除武器):stripProc`
- `rg_closeconfine(緊密的約束):closeConfineProc`
- `mo_callspirits(蓄氣):callSpirits`
- `mo_absorbspirits(吸氣):absorbSpirits`
- `mo_explosionspirits(爆氣):explosionSpirits`
- `mo_bladestop(真劍百破道):bladeStop`
- `mo_chaincombo(連環全身掌):chainCombo`
- `mo_combofinish(猛龍誇強):comboFinish`
- `mo_steelbody(金剛不壞):steelBody`
- `mo_investigate(浸透勁):investigate`
- `mo_fingeroffensive(彈指神通):fingerOffensive`
- `mo_extremityfist(阿修羅霸凰拳):extremityFist`
- `mo_bodyrelocation(弓身彈影):bodyRelocation`
- `mo_balkyoung(發勁):balkyoung`
- `mo_kitranslation(振氣注入):kiTranslation`
- `sa_castcancel(取消施法):skillSpCostReduce`
- `sa_autospell(自動念咒):sageAutoSpell`
- `sa_magicrod(魔法懲罰):magicRod`
- `sa_spellbreaker(念咒拆除):spellBreaker`
- `sa_dispell(魔法效果解除):dispellProc`
- `sa_abracadabra(隨機技能):abracadabra`
- `sa_createcon(肯貝特製作):elementConverter`
- `sa_elementfire(火屬性元素更換):elementChange`
- `sa_elementwater(水屬性元素更換):elementChange`
- `sa_elementwind(風屬性元素更換):elementChange`
- `sa_elementground(地屬性元素更換):elementChange`
- `am_pharmacy(配藥):pharmacy`
- `am_potionpitcher(藥水投擲):potionPitcher`
- `am_rest(安息):homunDiscount`
- `am_resurrecthomun(復活生命體):homunDiscount`
- `pf_memorize(速讀術):memorize`
- `pf_soulchange(心神互換):soulChange`
- `pf_soulburn(精神耗弱術):soulBurn`
- `pf_mindbreaker(精神撼動):mindBreaker`
- `cg_specialsinger(職人演奏家):aspdFlat`
- `cg_tarotcard(命運的塔羅牌):tarotCard`
- `cr_slimpitcher(纖細藥水投擲):potionPitcher`
- `st_preserve(自由保護):preserve`
- `st_fullstrip(所有卸除):fullStrip`
- `ch_soulcollect(狂蓄氣):soulCollect`
- `ch_palmstrike(猛虎硬派山):palmStrike`
- `ch_tigerfist(伏虎拳):tigerFist`
- `ch_chaincrush(氣絕崩擊):chainCrush`
