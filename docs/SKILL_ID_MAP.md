# 技能 id 對照表（3a）

> **2026-11-01 已套用**（`node scripts/rename_skill_ids.js --write`，實際對照存在 `scripts/out/skill_rename_map.json`）。下方是套用前的比對紀錄。
>
> - 改名 162 個：本表 158 個＋4 個「對不到」其實是官方技能、只是名稱不同：`frostjoke`→`ba_frostjoker`、`swordcraft`→`bs_sword`、`bc_slimpitcher`→`cr_slimpitcher`、`bc_fullprotection`→`cr_fullprotection`
> - 修正：`berserk_sword` 改對劍士的 `sm_autoberserk`（原本對到傭兵的 `MER_AUTOBERSERK`）
> - 刪除 6 個：`novice_basicskill`、`novice_hpboost`、`novice_flee`、`cartrevo`（原作者自創）、`zenrecovery`（祭司的禪心，與魔法師 `mg_srecovery` 重複）、`dispell_magic`（沒有職業使用，與 `sa_dispell` 重複；引用它的瓦爾基里 蘭特克力斯卡片改指 `sa_dispell`）
> - 同名的道具 id、技能類型、被動屬性（例：`heal`、`steal`）只在技能語境下改名

> `node scripts/gen_skill_id_map.js` 產生。新 id ＝ rAthena 技能名稱轉小寫。
> 依據：id 本身／技能名稱裡的英文＝skill_db Description／中文名＝ro_skill_data nameZh／id＝rAthena 名稱去掉職業前綴。

共 328 個技能：對到 253、只靠中文名對到 53、需確認 14、對不到 8。

## 對不到（請決定保留、刪除或指定對應）（8）

| 遊戲 id | 名稱 | 新 id（rAthena 小寫） | 依據 |
|---|---|---|---|
| `novice_basicskill` | 基礎訓練 Basic Training | — | — |
| `novice_hpboost` | 體能強化 HP Boost | — | — |
| `novice_flee` | 閃避提升 Flee Boost | — | — |
| `swordcraft` | 劍製作 | — | — |
| `cartrevo` | 手推車衝撞 | — | — |
| `frostjoke` | 冷笑話 Frost Joke | — | 中文名→ |
| `bc_slimpitcher` | 纖細藥水投擲 Slim Pitcher | — | 中文名→ |
| `bc_fullprotection` | 所有化學武器保護 Full Chemical Protection | — | 中文名→ |

## 需確認（依據互相衝突，或多個技能對到同一個）（14）

| 遊戲 id | 名稱 | 新 id（rAthena 小寫） | 依據 |
|---|---|---|---|
| `berserk_sword` | 狂暴狀態 Berserk | `mer_autoberserk` | 英文名→MER_AUTOBERSERK；中文名→SM_AUTOBERSERK |
| `spregen` | 禪心 | `mg_srecovery` | 中文名→MG_SRECOVERY；同對到 zenrecovery |
| `claymoretrap` | 定位陷阱 | `ht_anklesnare` | 中文名→HT_ANKLESNARE；id 後綴→HT_CLAYMORETRAP |
| `researchtrap` | 陷阱探查 | `ht_talkiebox` | 中文名→HT_TALKIEBOX；id 後綴→RA_RESEARCHTRAP |
| `overthrust` | 無視體型攻擊 | `bs_weaponperfect` | 中文名→BS_WEAPONPERFECT；id 後綴→BS_OVERTHRUST |
| `rightmaster` | 右手修練 | `as_right` | 中文名→AS_RIGHT/KO_RIGHT |
| `leftmaster` | 左手修練 | `as_left` | 中文名→AS_LEFT/KO_LEFT |
| `enchantblade` | 毒刃 | `as_venomknife` | 中文名→AS_VENOMKNIFE；id 後綴→RK_ENCHANTBLADE |
| `zenrecovery` | 禪心 | `mg_srecovery` | 中文名→MG_SRECOVERY；同對到 spregen |
| `impositio` | 沉默之術 | `pr_lexdivina` | 中文名→PR_LEXDIVINA；id 後綴→PR_IMPOSITIO |
| `angelus` | 天使之怒 | `pr_lexaeterna` | 中文名→PR_LEXAETERNA；id 後綴→AL_ANGELUS |
| `suffragium` | 捨身取義 | `pr_redemptio` | 中文名→PR_REDEMPTIO；id 後綴→PR_SUFFRAGIUM |
| `dispell_magic` | 魔法效果解除 | `sa_dispell` | 中文名→SA_DISPELL；同對到 sa_dispell |
| `sa_dispell` | 魔法效果解除 Dispell | `sa_dispell` | id→SA_DISPELL；英文名→SA_DISPELL；中文名→SA_DISPELL；同對到 dispell_magic |

## 只靠中文名對到（遊戲 id 與技能內容不一致，請過目）（53）

| 遊戲 id | 名稱 | 新 id（rAthena 小寫） | 依據 |
|---|---|---|---|
| `hpmove` | 移動時恢復HP | `sm_movingrecovery` | 中文名→SM_MOVINGRECOVERY |
| `createarrow` | 製作箭 | `ac_makingarrow` | 中文名→AC_MAKINGARROW |
| `owleye` | 鶚梟之眼 | `ac_owl` | 中文名→AC_OWL |
| `vultureeye` | 蒼鷹之眼 | `ac_vulture` | 中文名→AC_VULTURE |
| `improveconc` | 心神凝聚 | `ac_concentration` | 中文名→AC_CONCENTRATION |
| `doublestrafe` | 二連矢 | `ac_double` | 中文名→AC_DOUBLE |
| `arrowshower` | 箭雨 | `ac_shower` | 中文名→AC_SHOWER |
| `itemappraisal` | 物品鑑定 | `mc_identify` | 中文名→MC_IDENTIFY |
| `loudexclamation` | 大聲吶喊 | `mc_loud` | 中文名→MC_LOUD |
| `cartattack` | 手推車攻擊 | `mc_cartrevolution` | 中文名→MC_CARTREVOLUTION |
| `weightup` | 負重量上升 | `mc_inccarry` | 中文名→MC_INCCARRY |
| `doubleattack` | 二刀連擊 | `tf_double` | 中文名→TF_DOUBLE |
| `improvedodge` | 殘影 | `tf_miss` | 中文名→TF_MISS |
| `envenom` | 施毒 | `tf_poison` | 中文名→TF_POISON |
| `warpportal` | 傳送之陣 | `al_warp` | 中文名→AL_WARP |
| `divineprotection` | 天使之護 | `al_dp` | 中文名→AL_DP |
| `angelusbarrier` | 天使之障壁 | `al_angelus` | 中文名→AL_ANGELUS |
| `increaseagi` | 加速術 | `al_incagi` | 中文名→AL_INCAGI |
| `decreaseagi` | 緩速術 | `al_decagi` | 中文名→AL_DECAGI |
| `angelic` | 天使之擊 | `al_demonbane` | 中文名→AL_DEMONBANE |
| `signumcrusis` | 天使之光 | `al_crucis` | 中文名→AL_CRUCIS |
| `sense` | 怪物情報 | `wz_estimation` | 中文名→WZ_ESTIMATION |
| `firebolt_wiz` | 火之獵殺 | `wz_sightrasher` | 中文名→WZ_SIGHTRASHER |
| `meteorstorm` | 隕石術 | `wz_meteor` | 中文名→WZ_METEOR |
| `lordofvermillion` | 怒雷強擊 | `wz_vermilion` | 中文名→WZ_VERMILION |
| `frostdiver_wiz` | 霜凍之術 | `wz_frostnova` | 中文名→WZ_FROSTNOVA |
| `heavensdrive` | 崩裂術 | `wz_heavendrive` | 中文名→WZ_HEAVENDRIVE |
| `falcondelivery` | 獵鷹尋敵 | `ht_detecting` | 中文名→HT_DETECTING |
| `huntingmastery` | 馴鷹術 | `ht_falcon` | 中文名→HT_FALCON |
| `falconnastery` | 鋼製喙 | `ht_steelcrow` | 中文名→HT_STEELCROW |
| `trap` | 地雷陷阱 | `ht_landmine` | 中文名→HT_LANDMINE |
| `sleeptrap` | 睡魔陷阱 | `ht_sandman` | 中文名→HT_SANDMAN |
| `magnumbreak_h` | 爆散陷阱 | `ht_claymoretrap` | 中文名→HT_CLAYMORETRAP |
| `animalslayer` | 動物殺手 | `ht_beastbane` | 中文名→HT_BEASTBANE |
| `weaponrepair` | 武器修理 | `bs_repairweapon` | 中文名→BS_REPAIRWEAPON |
| `ironworking` | 鐵製造 | `bs_iron` | 中文名→BS_IRON |
| `steelworking` | 鋼製造 | `bs_steel` | 中文名→BS_STEEL |
| `elementalstone` | 屬性石製造 | `bs_enchantedstone` | 中文名→BS_ENCHANTEDSTONE |
| `oridecon` | 神之金屬研究 | `bs_orideocon` | 中文名→BS_ORIDEOCON |
| `daggercraft` | 短劍製作 | `bs_dagger` | 中文名→BS_DAGGER |
| `axecraft` | 斧頭製作 | `bs_axe` | 中文名→BS_AXE |
| `knucklecraft` | 拳套製作 | `bs_knuckle` | 中文名→BS_KNUCKLE |
| `macecraft` | 鈍器製作 | `bs_mace` | 中文名→BS_MACE |
| `spearcraft` | 長矛製作 | `bs_spear` | 中文名→BS_SPEAR |
| `overthrustbuff` | 凶砍 | `bs_overthrust` | 中文名→BS_OVERTHRUST |
| `weaponfusion` | 詭計的商術 | `bs_unfairlytrick` | 中文名→BS_UNFAIRLYTRICK |
| `katarmastery` | 拳刃修練 | `as_katar` | 中文名→AS_KATAR |
| `enchantweapon` | 塗毒 | `as_enchantpoison` | 中文名→AS_ENCHANTPOISON |
| `venominfusion` | 毒性感染 | `as_splasher` | 中文名→AS_SPLASHER |
| `sonicblow_max` | 超音速投擲 | `as_sonicaccel` | 中文名→AS_SONICACCEL |
| `sanctuary_holy` | 聖之祈福 | `pr_benedictio` | 中文名→PR_BENEDICTIO |
| `asperio` | 十字驅魔攻擊 | `pr_magnus` | 中文名→PR_MAGNUS |
| `impositio_manus` | 神威祈福 | `pr_impositio` | 中文名→PR_IMPOSITIO |

## 對到（兩種以上依據一致，或 id 本身就是 rAthena 名稱）（253）

| 遊戲 id | 名稱 | 新 id（rAthena 小寫） | 依據 |
|---|---|---|---|
| `novice_firstaid` | 急救術 First Aid | `nv_firstaid` | 英文名→NV_FIRSTAID |
| `fatalblow` | 攻擊弱點 Fatal Blow | `sm_fatalblow` | 英文名→SM_FATALBLOW；中文名→SM_FATALBLOW；id 後綴→SM_FATALBLOW |
| `bash` | 狂擊 Bash | `sm_bash` | 英文名→SM_BASH/MS_BASH；中文名→SM_BASH；id 後綴→SM_BASH/MS_BASH |
| `magnumbreak` | 怒爆 Magnum Break | `sm_magnum` | 英文名→SM_MAGNUM/MS_MAGNUM；中文名→SM_MAGNUM |
| `provoke` | 挑釁 Provoke | `sm_provoke` | 英文名→SM_PROVOKE/MER_PROVOKE；中文名→SM_PROVOKE；id 後綴→SM_PROVOKE/MER_PROVOKE |
| `endure` | 霸體 Endure | `sm_endure` | 英文名→SM_ENDURE；中文名→SM_ENDURE；id 後綴→SM_ENDURE |
| `increasehp` | 快速恢復 Increase HP Recovery | `sm_recovery` | 英文名→SM_RECOVERY；中文名→SM_RECOVERY |
| `swordmastery` | 單手劍熟練度 Sword Mastery | `sm_sword` | 英文名→SM_SWORD |
| `twoswordmastery` | 雙手劍熟練度 Two-Handed Sword Mastery | `sm_twohand` | 英文名→SM_TWOHAND |
| `sight` | 火狩 | `mg_sight` | 中文名→MG_SIGHT；id 後綴→MG_SIGHT/SN_SIGHT/MER_SIGHT |
| `energycoat` | 能量外套 | `mg_energycoat` | 中文名→MG_ENERGYCOAT；id 後綴→MG_ENERGYCOAT |
| `firebolt` | 火箭術 | `mg_firebolt` | 中文名→MG_FIREBOLT；id 後綴→MG_FIREBOLT |
| `fireball` | 火球術 | `mg_fireball` | 中文名→MG_FIREBALL；id 後綴→MG_FIREBALL |
| `firewall` | 火焰之壁 | `mg_firewall` | 中文名→MG_FIREWALL；id 後綴→MG_FIREWALL |
| `lightningbolt` | 雷擊術 | `mg_lightningbolt` | 中文名→MG_LIGHTNINGBOLT；id 後綴→MG_LIGHTNINGBOLT |
| `thunderstorm` | 雷爆術 | `mg_thunderstorm` | 中文名→MG_THUNDERSTORM；id 後綴→MG_THUNDERSTORM |
| `coldbolt` | 冰箭術 | `mg_coldbolt` | 中文名→MG_COLDBOLT；id 後綴→MG_COLDBOLT |
| `frostdiver` | 冰凍術 | `mg_frostdiver` | 中文名→MG_FROSTDIVER；id 後綴→MG_FROSTDIVER |
| `stonecurse` | 石化術 | `mg_stonecurse` | 中文名→MG_STONECURSE；id 後綴→MG_STONECURSE |
| `napalmbeat` | 心靈爆破 | `mg_napalmbeat` | 中文名→MG_NAPALMBEAT；id 後綴→MG_NAPALMBEAT |
| `soulstrike` | 聖靈召喚 | `mg_soulstrike` | 中文名→MG_SOULSTRIKE；id 後綴→MG_SOULSTRIKE |
| `safetywall` | 暗之障壁 | `mg_safetywall` | 中文名→MG_SAFETYWALL；id 後綴→MG_SAFETYWALL |
| `chargearrow` | 衝鋒箭 | `ac_chargearrow` | 中文名→AC_CHARGEARROW；id 後綴→AC_CHARGEARROW/MA_CHARGEARROW |
| `vending` | 露天商店 | `mc_vending` | 中文名→MC_VENDING；id 後綴→MC_VENDING |
| `discount` | 低價買進 | `mc_discount` | 中文名→MC_DISCOUNT；id 後綴→MC_DISCOUNT |
| `overcharge` | 高價賣出 | `mc_overcharge` | 中文名→MC_OVERCHARGE；id 後綴→MC_OVERCHARGE |
| `pushcart` | 手推車使用 | `mc_pushcart` | 中文名→MC_PUSHCART；id 後綴→MC_PUSHCART |
| `mammonite` | 金錢攻擊 | `mc_mammonite` | 中文名→MC_MAMMONITE；id 後綴→MC_MAMMONITE |
| `detoxify` | 解毒 | `tf_detoxify` | 中文名→TF_DETOXIFY；id 後綴→TF_DETOXIFY |
| `sandman` | 噴砂 | `tf_sprinklesand` | 中文名→TF_SPRINKLESAND；id 後綴→HT_SANDMAN/GM_SANDMAN/MA_SANDMAN |
| `backsliding` | 後退迴避 | `tf_backsliding` | 中文名→TF_BACKSLIDING；id 後綴→TF_BACKSLIDING |
| `steal` | 偷竊 | `tf_steal` | 中文名→TF_STEAL；id 後綴→TF_STEAL |
| `hiding` | 隱匿 | `tf_hiding` | 中文名→TF_HIDING；id 後綴→TF_HIDING |
| `teleport` | 瞬間移動 | `al_teleport` | 中文名→AL_TELEPORT；id 後綴→AL_TELEPORT |
| `ruwach` | 光獵 | `al_ruwach` | 中文名→AL_RUWACH；id 後綴→AL_RUWACH |
| `pneuma` | 光之障壁 | `al_pneuma` | 中文名→AL_PNEUMA；id 後綴→AL_PNEUMA |
| `cure` | 治療術 | `al_cure` | 中文名→AL_CURE；id 後綴→AL_CURE |
| `heal` | 治癒術 | `al_heal` | 中文名→AL_HEAL；id 後綴→AL_HEAL/HLIF_HEAL |
| `blessing` | 天使之賜福 | `al_blessing` | 中文名→AL_BLESSING；id 後綴→AL_BLESSING/CASH_BLESSING/MER_BLESSING |
| `holywater` | 天使之淚 | `al_holywater` | 中文名→AL_HOLYWATER；id 後綴→AL_HOLYWATER |
| `holylight` | 神聖之光 | `al_holylight` | 中文名→AL_HOLYLIGHT；id 後綴→AL_HOLYLIGHT |
| `riding` | 騎乘術 Peco Peco Ride | `kn_riding` | 中文名→KN_RIDING；id 後綴→KN_RIDING |
| `charge` | 衝鋒攻擊 Charge Attack | `kn_chargeatk` | 英文名→KN_CHARGEATK；中文名→KN_CHARGEATK |
| `cavaliermastery` | 騎兵修練 Cavalier Mastery | `kn_cavaliermastery` | 英文名→KN_CAVALIERMASTERY；中文名→KN_CAVALIERMASTERY；id 後綴→KN_CAVALIERMASTERY |
| `bowlingbash` | 怪物互擊 Bowling Bash | `kn_bowlingbash` | 英文名→KN_BOWLINGBASH/MS_BOWLINGBASH；中文名→KN_BOWLINGBASH；id 後綴→KN_BOWLINGBASH/MS_BOWLINGBASH |
| `pierce` | 連刺攻擊 Pierce | `kn_pierce` | 英文名→KN_PIERCE/ML_PIERCE；中文名→KN_PIERCE；id 後綴→KN_PIERCE/ML_PIERCE |
| `twohandquicken` | 雙手劍加速 Twohand Quicken | `kn_twohandquicken` | 英文名→KN_TWOHANDQUICKEN/MER_QUICKEN；id 後綴→KN_TWOHANDQUICKEN |
| `spearmastery` | 長矛熟練度 Spear Mastery | `kn_spearmastery` | 英文名→KN_SPEARMASTERY；id 後綴→KN_SPEARMASTERY |
| `spearstab` | 長矛刺擊 Spear Stab | `kn_spearstab` | 英文名→KN_SPEARSTAB；中文名→KN_SPEARSTAB；id 後綴→KN_SPEARSTAB |
| `spearboomerang` | 投擲長矛 Spear Boomerang | `kn_spearboomerang` | 英文名→KN_SPEARBOOMERANG；id 後綴→KN_SPEARBOOMERANG |
| `brandishspear` | 騎乘攻擊 Brandish Spear | `kn_brandishspear` | 英文名→KN_BRANDISHSPEAR/ML_BRANDISH；中文名→KN_BRANDISHSPEAR；id 後綴→KN_BRANDISHSPEAR |
| `counter` | 反擊 Counter Attack | `kn_autocounter` | 英文名→KN_AUTOCOUNTER；中文名→KN_AUTOCOUNTER；id 後綴→TK_COUNTER |
| `firepillar` | 火柱攻擊 | `wz_firepillar` | 中文名→WZ_FIREPILLAR；id 後綴→WZ_FIREPILLAR |
| `jupitel` | 雷鳴術 | `wz_jupitel` | 中文名→WZ_JUPITEL；id 後綴→WZ_JUPITEL |
| `waterball` | 水球術 | `wz_waterball` | 中文名→WZ_WATERBALL；id 後綴→WZ_WATERBALL |
| `icewall` | 冰刃之牆 | `wz_icewall` | 中文名→WZ_ICEWALL；id 後綴→WZ_ICEWALL |
| `stormgust` | 暴風雪 | `wz_stormgust` | 中文名→WZ_STORMGUST；id 後綴→WZ_STORMGUST |
| `earthspike` | 地震術 | `wz_earthspike` | 中文名→WZ_EARTHSPIKE；id 後綴→WZ_EARTHSPIKE |
| `quagmire` | 泥沼地 | `wz_quagmire` | 中文名→WZ_QUAGMIRE；id 後綴→WZ_QUAGMIRE |
| `blitzbeat` | 閃電衝擊 | `ht_blitzbeat` | 中文名→HT_BLITZBEAT；id 後綴→HT_BLITZBEAT |
| `skidtrap` | 滑動陷阱 | `ht_skidtrap` | 中文名→HT_SKIDTRAP；id 後綴→HT_SKIDTRAP/MA_SKIDTRAP |
| `flasher` | 強光陷阱 | `ht_flasher` | 中文名→HT_FLASHER；id 後綴→HT_FLASHER |
| `freezingtrap` | 霜凍陷阱 | `ht_freezingtrap` | 中文名→HT_FREEZINGTRAP；id 後綴→HT_FREEZINGTRAP/MA_FREEZINGTRAP |
| `blastmine` | 定時爆炸陷阱 | `ht_blastmine` | 中文名→HT_BLASTMINE；id 後綴→HT_BLASTMINE |
| `removetrap` | 陷阱移除 | `ht_removetrap` | 中文名→HT_REMOVETRAP；id 後綴→HT_REMOVETRAP/MA_REMOVETRAP |
| `hiltbinding` | 武器保有 | `bs_hiltbinding` | 中文名→BS_HILTBINDING；id 後綴→BS_HILTBINDING |
| `findingore` | 尋找礦石 | `bs_findingore` | 中文名→BS_FINDINGORE；id 後綴→BS_FINDINGORE |
| `weaponresearch` | 武器研究 | `bs_weaponresearch` | 中文名→BS_WEAPONRESEARCH；id 後綴→BS_WEAPONRESEARCH |
| `hammerfall` | 大地之擊 | `bs_hammerfall` | 中文名→BS_HAMMERFALL；id 後綴→BS_HAMMERFALL |
| `adrenaline` | 速度激發 | `bs_adrenaline` | 中文名→BS_ADRENALINE；id 後綴→BS_ADRENALINE |
| `skintemper` | 強化火屬性 | `bs_skintemper` | 中文名→BS_SKINTEMPER；id 後綴→BS_SKINTEMPER |
| `maximize` | 武器值最大化 | `bs_maximize` | 中文名→BS_MAXIMIZE；id 後綴→BS_MAXIMIZE |
| `greed` | 貪婪 | `bs_greed` | 中文名→BS_GREED；id 後綴→BS_GREED |
| `cloaking` | 偽裝 | `as_cloaking` | 中文名→AS_CLOAKING；id 後綴→AS_CLOAKING |
| `sonicblow` | 音速投擲 | `as_sonicblow` | 中文名→AS_SONICBLOW；id 後綴→AS_SONICBLOW |
| `grimtooth` | 無影之牙 | `as_grimtooth` | 中文名→AS_GRIMTOOTH；id 後綴→AS_GRIMTOOTH |
| `poisonreact` | 毒性反彈 | `as_poisonreact` | 中文名→AS_POISONREACT；id 後綴→AS_POISONREACT |
| `venomdust` | 病毒散播 | `as_venomdust` | 中文名→AS_VENOMDUST；id 後綴→AS_VENOMDUST |
| `maceMastery` | 鈍器使用熟練度 | `pr_macemastery` | 中文名→PR_MACEMASTERY；id 後綴→PR_MACEMASTERY |
| `sanctuary` | 光耀之堂 | `pr_sanctuary` | 中文名→PR_SANCTUARY；id 後綴→PR_SANCTUARY |
| `magnificat` | 聖母之頌歌 | `pr_magnificat` | 中文名→PR_MAGNIFICAT；id 後綴→PR_MAGNIFICAT/MER_MAGNIFICAT |
| `gloria` | 幸運之頌歌 | `pr_gloria` | 中文名→PR_GLORIA；id 後綴→PR_GLORIA |
| `kyrie` | 霸邪之陣 | `pr_kyrie` | 中文名→PR_KYRIE；id 後綴→PR_KYRIE/MER_KYRIE |
| `assumptio` | 犧牲祈福 | `pr_suffragium` | 中文名→PR_SUFFRAGIUM；id 後綴→HP_ASSUMPTIO/CASH_ASSUMPTIO |
| `aspersio` | 撒水祈福 | `pr_aspersio` | 中文名→PR_ASPERSIO；id 後綴→PR_ASPERSIO |
| `slowpoison` | 緩毒術 | `pr_slowpoison` | 中文名→PR_SLOWPOISON；id 後綴→PR_SLOWPOISON |
| `resurrection` | 復活術 | `all_resurrection` | 中文名→；id 後綴→ALL_RESURRECTION |
| `turnundead` | 轉生術 | `pr_turnundead` | 中文名→PR_TURNUNDEAD；id 後綴→PR_TURNUNDEAD |
| `autoguard` | 自動防禦 Auto Guard | `cr_autoguard` | 中文名→CR_AUTOGUARD；id 後綴→CR_AUTOGUARD/ML_AUTOGUARD |
| `grandcross` | 聖十字審判 Grand Cross | `cr_grandcross` | 英文名→CR_GRANDCROSS；中文名→CR_GRANDCROSS；id 後綴→CR_GRANDCROSS |
| `strecovery` | 痊癒術 | `pr_strecovery` | 中文名→PR_STRECOVERY；id 後綴→PR_STRECOVERY |
| `lk_berserk` | 狂怒之槍 Frenzy | `lk_berserk` | id→LK_BERSERK；英文名→LK_BERSERK/MS_BERSERK；中文名→LK_BERSERK |
| `lk_tensionrelax` | 極速回復 Tension Relax | `lk_tensionrelax` | id→LK_TENSIONRELAX；中文名→LK_TENSIONRELAX |
| `lk_parrying` | 雙劍挌擋 Parrying | `lk_parrying` | id→LK_PARRYING；英文名→LK_PARRYING；中文名→LK_PARRYING |
| `lk_headcrush` | 傷害增壓 Head Crush | `lk_headcrush` | id→LK_HEADCRUSH；中文名→LK_HEADCRUSH |
| `lk_jointbeat` | 巧打 Joint Beat | `lk_jointbeat` | id→LK_JOINTBEAT；中文名→LK_JOINTBEAT |
| `lk_spiralpierce` | 螺旋擊刺 Spiral Pierce | `lk_spiralpierce` | id→LK_SPIRALPIERCE；英文名→LK_SPIRALPIERCE/ML_SPIRALPIERCE；中文名→LK_SPIRALPIERCE |
| `lk_aurablade` | 靈氣劍 Aura Blade | `lk_aurablade` | id→LK_AURABLADE；英文名→LK_AURABLADE；中文名→LK_AURABLADE |
| `lk_concentration` | 集中攻擊 Concentration | `lk_concentration` | id→LK_CONCENTRATION；英文名→LK_CONCENTRATION；中文名→LK_CONCENTRATION |
| `asc_katar` | 高階拳刃修練 Advanced Katar Mastery | `asc_katar` | id→ASC_KATAR；英文名→ASC_KATAR；中文名→ASC_KATAR |
| `asc_cdp` | 毒液製作 Create Deadly Poison | `asc_cdp` | id→ASC_CDP；英文名→ASC_CDP；中文名→ASC_CDP |
| `asc_edp` | 致命塗毒 Enchant Deadly Poison | `asc_edp` | id→ASC_EDP；英文名→ASC_EDP；中文名→ASC_EDP |
| `asc_breaker` | 心靈震波 Soul Destroyer | `asc_breaker` | id→ASC_BREAKER；英文名→ASC_BREAKER；中文名→ASC_BREAKER |
| `asc_meteorassault` | 黑暗瞬間 Meteor Assault | `asc_meteorassault` | id→ASC_METEORASSAULT；英文名→ASC_METEORASSAULT；中文名→ASC_METEORASSAULT |
| `ws_weaponrefine` | 武器精煉 Weapon Refine | `ws_weaponrefine` | id→WS_WEAPONREFINE；中文名→WS_WEAPONREFINE |
| `ws_cartboost` | 手推車加速 Cart Boost | `ws_cartboost` | id→WS_CARTBOOST；英文名→WS_CARTBOOST/GN_CARTBOOST；中文名→GN_CARTBOOST/WS_CARTBOOST |
| `ws_cartterm` | 手推車終結技 Cart Termination | `ws_carttermination` | 英文名→WS_CARTTERMINATION；中文名→WS_CARTTERMINATION |
| `ws_meltdown` | 野蠻凶砍 Meltdown | `ws_meltdown` | id→WS_MELTDOWN；中文名→WS_MELTDOWN |
| `ws_overthrustmax` | 凶砍最大值 Maximum Overthrust | `ws_overthrustmax` | id→WS_OVERTHRUSTMAX；中文名→WS_OVERTHRUSTMAX |
| `sn_windwalk` | 風之步 Wind Walk | `sn_windwalk` | id→SN_WINDWALK；中文名→SN_WINDWALK |
| `sn_sharpshooting` | 銳利射擊 Sharp Shooting | `sn_sharpshooting` | id→SN_SHARPSHOOTING；中文名→SN_SHARPSHOOTING |
| `sn_sight` | 狙殺瞄準 True Sight | `sn_sight` | id→SN_SIGHT；中文名→SN_SIGHT |
| `sn_falconassault` | 獵鷹突擊 Falcon Assault | `sn_falconassault` | id→SN_FALCONASSAULT；英文名→SN_FALCONASSAULT；中文名→SN_FALCONASSAULT |
| `hw_ganbantein` | 咖般塔音 Ganbantein | `hw_ganbantein` | id→HW_GANBANTEIN；英文名→HW_GANBANTEIN；中文名→HW_GANBANTEIN |
| `hw_napalmvulcan` | 念力連擊 Napalm Vulcan | `hw_napalmvulcan` | id→HW_NAPALMVULCAN；英文名→HW_NAPALMVULCAN；中文名→HW_NAPALMVULCAN |
| `hw_souldrain` | 吸魂術 Soul Drain | `hw_souldrain` | id→HW_SOULDRAIN；英文名→HW_SOULDRAIN；中文名→HW_SOULDRAIN |
| `hw_magiccrasher` | 魔擊術 Magic Crasher | `hw_magiccrasher` | id→HW_MAGICCRASHER；中文名→HW_MAGICCRASHER |
| `hw_magicpower` | 魔力增幅 Mystical Amplification | `hw_magicpower` | id→HW_MAGICPOWER；英文名→HW_MAGICPOWER；中文名→HW_MAGICPOWER |
| `hw_gravitation` | 重力原野 Gravitation Field | `hw_gravitation` | id→HW_GRAVITATION；英文名→HW_GRAVITATION；中文名→HW_GRAVITATION |
| `hp_manarecharge` | 魔力減免 Mana Recharge | `hp_manarecharge` | id→HP_MANARECHARGE；英文名→HP_MANARECHARGE；中文名→HP_MANARECHARGE |
| `hp_basilica` | 神聖殿堂 Basilica | `hp_basilica` | id→HP_BASILICA；英文名→HP_BASILICA；中文名→HP_BASILICA |
| `hp_assumptio` | 聖母之祈福 Assumptio | `hp_assumptio` | id→HP_ASSUMPTIO；英文名→HP_ASSUMPTIO；中文名→HP_ASSUMPTIO |
| `hp_meditatio` | 冥想 Meditatio | `hp_meditatio` | id→HP_MEDITATIO；英文名→HP_MEDITATIO；中文名→HP_MEDITATIO |
| `cr_shieldcharge` | 盾擊 Shield Charge | `cr_shieldcharge` | id→CR_SHIELDCHARGE；中文名→CR_SHIELDCHARGE |
| `cr_shieldboomerang` | 迴旋盾擊 Shield Boomerang | `cr_shieldboomerang` | id→CR_SHIELDBOOMERANG；英文名→CR_SHIELDBOOMERANG；中文名→CR_SHIELDBOOMERANG |
| `cr_defender` | 光之盾 Defender | `cr_defender` | id→CR_DEFENDER；英文名→NPC_DEFENDER；中文名→CR_DEFENDER |
| `cr_shrink` | 退縮 Shrink | `cr_shrink` | id→CR_SHRINK；英文名→CR_SHRINK；中文名→CR_SHRINK |
| `cr_devotion` | 犧牲 Devotion | `cr_devotion` | id→CR_DEVOTION；中文名→CR_DEVOTION |
| `cr_reflectshield` | 反射盾 Reflect Shield | `cr_reflectshield` | id→CR_REFLECTSHIELD；中文名→CR_REFLECTSHIELD |
| `cr_trust` | 信任 Faith | `cr_trust` | id→CR_TRUST；英文名→CR_TRUST；中文名→CR_TRUST |
| `cr_holycross` | 聖十字攻擊 Holy Cross | `cr_holycross` | id→CR_HOLYCROSS；英文名→CR_HOLYCROSS；中文名→CR_HOLYCROSS |
| `cr_providence` | 神祐之光 Providence | `cr_providence` | id→CR_PROVIDENCE；中文名→CR_PROVIDENCE |
| `cr_spearquicken` | 長矛加速術 Spear Quicken | `cr_spearquicken` | id→CR_SPEARQUICKEN；英文名→CR_SPEARQUICKEN；中文名→CR_SPEARQUICKEN |
| `ba_musicallesson` | 操控樂器 Musical Lesson | `ba_musicallesson` | id→BA_MUSICALLESSON；中文名→BA_MUSICALLESSON |
| `ba_dissonance` | 不諧和音 Dissonance | `ba_dissonance` | id→BA_DISSONANCE；中文名→BA_DISSONANCE |
| `ba_whistle` | 吹口哨 Whistle | `ba_whistle` | id→BA_WHISTLE；中文名→BA_WHISTLE |
| `ba_assassincross` | 刺客的黃昏 Assassin Cross | `ba_assassincross` | id→BA_ASSASSINCROSS；中文名→BA_ASSASSINCROSS |
| `ba_poembragi` | 布萊奇之詩 Poem of Bragi | `ba_poembragi` | id→BA_POEMBRAGI；中文名→BA_POEMBRAGI |
| `ba_appleidun` | 伊登的蘋果 Apple of Idun | `ba_appleidun` | id→BA_APPLEIDUN；中文名→BA_APPLEIDUN |
| `ba_musicalstrike` | 樂器攻擊 Musical Strike | `ba_musicalstrike` | id→BA_MUSICALSTRIKE；中文名→BA_MUSICALSTRIKE |
| `ba_pangvoice` | 陣痛之聲 Pang Voice | `ba_pangvoice` | id→BA_PANGVOICE；英文名→BA_PANGVOICE；中文名→BA_PANGVOICE |
| `dc_dancinglesson` | 練習舞蹈 Dancing Lesson | `dc_dancinglesson` | id→DC_DANCINGLESSON；中文名→DC_DANCINGLESSON |
| `dc_scream` | 驚聲尖叫 Scream | `dc_scream` | id→DC_SCREAM；中文名→DC_SCREAM |
| `dc_uglydance` | 醜陋之舞 Ugly Dance | `dc_uglydance` | id→DC_UGLYDANCE；中文名→DC_UGLYDANCE |
| `dc_humming` | 哼唱之音 Humming | `dc_humming` | id→DC_HUMMING；中文名→DC_HUMMING |
| `dc_dontforgetme` | 勿忘我 Don't Forget Me | `dc_dontforgetme` | id→DC_DONTFORGETME；中文名→DC_DONTFORGETME |
| `dc_fortunekiss` | 女神之吻 Fortune Kiss | `dc_fortunekiss` | id→DC_FORTUNEKISS；中文名→DC_FORTUNEKISS |
| `dc_serviceforyou` | 為您服務 Service For You | `dc_serviceforyou` | id→DC_SERVICEFORYOU；中文名→DC_SERVICEFORYOU |
| `dc_throwarrow` | 纏箭投擲 Throw Arrow | `dc_throwarrow` | id→DC_THROWARROW；中文名→DC_THROWARROW |
| `dc_winkcharm` | 眨眼之誘 Wink of Charm | `dc_winkcharm` | id→DC_WINKCHARM；英文名→DC_WINKCHARM；中文名→DC_WINKCHARM |
| `bd_adaptation` | 臨機應變 Adaptation | `bd_adaptation` | id→BD_ADAPTATION；中文名→BD_ADAPTATION |
| `bd_encore` | 安可 Encore | `bd_encore` | id→BD_ENCORE；英文名→BD_ENCORE；中文名→BD_ENCORE |
| `bd_lullaby` | 搖籃曲 Lullaby | `bd_lullaby` | id→BD_LULLABY；英文名→BD_LULLABY；中文名→BD_LULLABY/SO_ARRULLO |
| `bd_intoabyss` | 觸媒之所 Into the Abyss | `bd_intoabyss` | id→BD_INTOABYSS；中文名→BD_INTOABYSS |
| `bd_rokisweil` | 洛奇的悲鳴 Loki's Veil | `bd_rokisweil` | id→BD_ROKISWEIL；中文名→BD_ROKISWEIL |
| `bd_eternalchaos` | 永遠的混沌 Eternal Chaos | `bd_eternalchaos` | id→BD_ETERNALCHAOS；中文名→BD_ETERNALCHAOS |
| `bd_siegfried` | 不死神齊格弗里德 Siegfried | `bd_siegfried` | id→BD_SIEGFRIED；中文名→BD_SIEGFRIED |
| `bd_richmankim` | 經驗值倍增 Mental Sensing | `bd_richmankim` | id→BD_RICHMANKIM；英文名→BD_RICHMANKIM；中文名→BD_RICHMANKIM |
| `bd_drumbattlefield` | 戰鼓震天 Battle Theme | `bd_drumbattlefield` | id→BD_DRUMBATTLEFIELD；英文名→BD_DRUMBATTLEFIELD；中文名→BD_DRUMBATTLEFIELD |
| `bd_ringnibelungen` | 尼貝隆根之戒指 Ring of Nibelungen | `bd_ringnibelungen` | id→BD_RINGNIBELUNGEN；中文名→BD_RINGNIBELUNGEN |
| `rg_snatcher` | 強奪 Snatcher | `rg_snatcher` | id→RG_SNATCHER；中文名→RG_SNATCHER |
| `rg_stealcoin` | 偷錢 Steal Coin | `rg_stealcoin` | id→RG_STEALCOIN；中文名→RG_STEALCOIN |
| `rg_backstap` | 背刺 Back Stab | `rg_backstap` | id→RG_BACKSTAP；英文名→RG_BACKSTAP；中文名→RG_BACKSTAP |
| `rg_tunneldrive` | 潛遁 Tunnel Drive | `rg_tunneldrive` | id→RG_TUNNELDRIVE；中文名→RG_TUNNELDRIVE |
| `rg_raid` | 潛擊 Raid | `rg_raid` | id→RG_RAID；中文名→RG_RAID |
| `rg_intimidate` | 脅持 Intimidate | `rg_intimidate` | id→RG_INTIMIDATE；英文名→RG_PLAGIARISM；中文名→RG_INTIMIDATE |
| `rg_plagiarism` | 抄襲 Plagiarism | `rg_plagiarism` | id→RG_PLAGIARISM；中文名→RG_PLAGIARISM |
| `rg_striphelm` | 卸除頭盔 Strip Helm | `rg_striphelm` | id→RG_STRIPHELM；中文名→RG_STRIPHELM |
| `rg_stripshield` | 卸除盾牌 Strip Shield | `rg_stripshield` | id→RG_STRIPSHIELD；中文名→RG_STRIPSHIELD |
| `rg_striparmor` | 卸除鎧甲 Strip Armor | `rg_striparmor` | id→RG_STRIPARMOR；中文名→RG_STRIPARMOR |
| `rg_stripweapon` | 卸除武器 Strip Weapon | `rg_stripweapon` | id→RG_STRIPWEAPON；中文名→RG_STRIPWEAPON |
| `rg_compulsion` | 強制減價 Compulsion Discount | `rg_compulsion` | id→RG_COMPULSION；中文名→RG_COMPULSION |
| `rg_closeconfine` | 緊密的約束 Close Confine | `rg_closeconfine` | id→RG_CLOSECONFINE；英文名→RG_CLOSECONFINE；中文名→RG_CLOSECONFINE |
| `mo_ironhand` | 鐵沙掌 Iron Hand | `mo_ironhand` | id→MO_IRONHAND；中文名→MO_IRONHAND |
| `mo_callspirits` | 蓄氣 Call Spirits | `mo_callspirits` | id→MO_CALLSPIRITS；中文名→MO_CALLSPIRITS |
| `mo_absorbspirits` | 吸氣 Absorb Spirits | `mo_absorbspirits` | id→MO_ABSORBSPIRITS；中文名→MO_ABSORBSPIRITS |
| `mo_explosionspirits` | 爆氣 Explosion Spirits | `mo_explosionspirits` | id→MO_EXPLOSIONSPIRITS；中文名→MO_EXPLOSIONSPIRITS |
| `mo_dodge` | 移花接木 Dodge | `mo_dodge` | id→MO_DODGE；英文名→MO_DODGE；中文名→MO_DODGE |
| `mo_bladestop` | 真劍百破道 Blade Stop | `mo_bladestop` | id→MO_BLADESTOP；中文名→MO_BLADESTOP |
| `mo_spiritsrecovery` | 運氣調息 Spiritual Cadence | `mo_spiritsrecovery` | id→MO_SPIRITSRECOVERY；英文名→MO_SPIRITSRECOVERY；中文名→MO_SPIRITSRECOVERY |
| `mo_tripleattack` | 六合拳 Triple Attack | `mo_tripleattack` | id→MO_TRIPLEATTACK；中文名→MO_TRIPLEATTACK |
| `mo_chaincombo` | 連環全身掌 Chain Combo | `mo_chaincombo` | id→MO_CHAINCOMBO；中文名→MO_CHAINCOMBO |
| `mo_combofinish` | 猛龍誇強 Combo Finish | `mo_combofinish` | id→MO_COMBOFINISH；中文名→MO_COMBOFINISH |
| `mo_steelbody` | 金剛不壞 Steel Body | `mo_steelbody` | id→MO_STEELBODY；中文名→MO_STEELBODY |
| `mo_investigate` | 浸透勁 Investigate | `mo_investigate` | id→MO_INVESTIGATE；中文名→MO_INVESTIGATE |
| `mo_fingeroffensive` | 彈指神通 Finger Offensive | `mo_fingeroffensive` | id→MO_FINGEROFFENSIVE；中文名→MO_FINGEROFFENSIVE |
| `mo_extremityfist` | 阿修羅霸凰拳 Asura Strike | `mo_extremityfist` | id→MO_EXTREMITYFIST；英文名→MO_EXTREMITYFIST；中文名→MO_EXTREMITYFIST |
| `mo_bodyrelocation` | 弓身彈影 Body Relocation | `mo_bodyrelocation` | id→MO_BODYRELOCATION；中文名→MO_BODYRELOCATION |
| `mo_balkyoung` | 發勁 Ki Explosion | `mo_balkyoung` | id→MO_BALKYOUNG；英文名→MO_BALKYOUNG；中文名→MO_BALKYOUNG |
| `mo_kitranslation` | 振氣注入 Ki Translation | `mo_kitranslation` | id→MO_KITRANSLATION；英文名→MO_KITRANSLATION；中文名→MO_KITRANSLATION |
| `sa_advancedbook` | 進化之書 Advanced Book | `sa_advancedbook` | id→SA_ADVANCEDBOOK；中文名→SA_ADVANCEDBOOK |
| `sa_dragonology` | 龍知識 Dragonology | `sa_dragonology` | id→SA_DRAGONOLOGY；英文名→SA_DRAGONOLOGY；中文名→SA_DRAGONOLOGY |
| `sa_flamelauncher` | 火屬性附加 Flame Launcher | `sa_flamelauncher` | id→SA_FLAMELAUNCHER；英文名→NC_FLAMELAUNCHER；中文名→SA_FLAMELAUNCHER |
| `sa_frostweapon` | 水屬性附加 Frost Weapon | `sa_frostweapon` | id→SA_FROSTWEAPON；中文名→SA_FROSTWEAPON |
| `sa_lightningloader` | 風屬性附加 Lightning Loader | `sa_lightningloader` | id→SA_LIGHTNINGLOADER；中文名→SA_LIGHTNINGLOADER |
| `sa_seismicweapon` | 地屬性附加 Seismic Weapon | `sa_seismicweapon` | id→SA_SEISMICWEAPON；中文名→SA_SEISMICWEAPON |
| `sa_volcano` | 火元素領域 Volcano | `sa_volcano` | id→SA_VOLCANO；英文名→SA_VOLCANO；中文名→SA_VOLCANO |
| `sa_deluge` | 水元素領域 Deluge | `sa_deluge` | id→SA_DELUGE；英文名→SA_DELUGE；中文名→SA_DELUGE |
| `sa_violentgale` | 風元素領域 Violent Gale | `sa_violentgale` | id→SA_VIOLENTGALE；中文名→SA_VIOLENTGALE |
| `sa_landprotector` | 地元素領域 Land Protector | `sa_landprotector` | id→SA_LANDPROTECTOR；中文名→SA_LANDPROTECTOR |
| `sa_castcancel` | 取消施法 Cast Cancel | `sa_castcancel` | id→SA_CASTCANCEL；英文名→SA_CASTCANCEL；中文名→SA_CASTCANCEL |
| `sa_freecast` | 自由施法 Free Cast | `sa_freecast` | id→SA_FREECAST；英文名→SA_FREECAST；中文名→SA_FREECAST |
| `sa_autospell` | 自動念咒 Auto Spell | `sa_autospell` | id→SA_AUTOSPELL；中文名→SA_AUTOSPELL |
| `sa_magicrod` | 魔法懲罰 Magic Rod | `sa_magicrod` | id→SA_MAGICROD；英文名→SA_MAGICROD；中文名→SA_MAGICROD |
| `sa_spellbreaker` | 念咒拆除 Spell Breaker | `sa_spellbreaker` | id→SA_SPELLBREAKER；英文名→SA_SPELLBREAKER；中文名→SA_SPELLBREAKER |
| `sa_abracadabra` | 隨機技能 Abracadabra | `sa_abracadabra` | id→SA_ABRACADABRA；中文名→SA_ABRACADABRA |
| `sa_createcon` | 肯貝特製作 Create Converter | `sa_createcon` | id→SA_CREATECON；中文名→SA_CREATECON |
| `sa_elementfire` | 火屬性元素更換 Elemental Change Fire | `sa_elementfire` | id→SA_ELEMENTFIRE；英文名→SA_ELEMENTFIRE；中文名→SA_ELEMENTFIRE |
| `sa_elementwater` | 水屬性元素更換 Elemental Change Water | `sa_elementwater` | id→SA_ELEMENTWATER；英文名→SA_ELEMENTWATER；中文名→SA_ELEMENTWATER |
| `sa_elementwind` | 風屬性元素更換 Elemental Change Wind | `sa_elementwind` | id→SA_ELEMENTWIND；英文名→SA_ELEMENTWIND；中文名→SA_ELEMENTWIND |
| `sa_elementearth` | 地屬性元素更換 Elemental Change Earth | `sa_elementground` | 英文名→SA_ELEMENTGROUND；中文名→SA_ELEMENTGROUND |
| `am_learningpotion` | 知識藥水 Learning Potion | `am_learningpotion` | id→AM_LEARNINGPOTION；中文名→AM_LEARNINGPOTION |
| `am_pharmacy` | 配藥 Pharmacy | `am_pharmacy` | id→AM_PHARMACY；中文名→AM_PHARMACY |
| `am_axemastery` | 斧頭和單手劍使用熟練度 Axe Mastery | `am_axemastery` | id→AM_AXEMASTERY；英文名→AM_AXEMASTERY；中文名→AM_AXEMASTERY |
| `am_potionpitcher` | 藥水投擲 Potion Pitcher | `am_potionpitcher` | id→AM_POTIONPITCHER；中文名→AM_POTIONPITCHER |
| `am_demonstration` | 火煙瓶投擲 Demonstration | `am_demonstration` | id→AM_DEMONSTRATION；中文名→AM_DEMONSTRATION |
| `am_acidterror` | 強酸攻擊 Acid Terror | `am_acidterror` | id→AM_ACIDTERROR；英文名→AM_ACIDTERROR；中文名→AM_ACIDTERROR |
| `am_spheremine` | 氣泡蟲召喚 Sphere Mine | `am_spheremine` | id→AM_SPHEREMINE；中文名→AM_SPHEREMINE |
| `am_cannibalize` | 生物調撥 Cannibalize | `am_cannibalize` | id→AM_CANNIBALIZE；中文名→AM_CANNIBALIZE |
| `am_cp_helm` | 化學頭盔保護 Chemical Protection Helm | `am_cp_helm` | id→AM_CP_HELM；中文名→AM_CP_HELM |
| `am_cp_shield` | 化學盾牌保護 Chemical Protection Shield | `am_cp_shield` | id→AM_CP_SHIELD；中文名→AM_CP_SHIELD |
| `am_cp_armor` | 化學鎧甲保護 Chemical Protection Armor | `am_cp_armor` | id→AM_CP_ARMOR；中文名→AM_CP_ARMOR |
| `am_cp_weapon` | 化學武器保護 Chemical Protection Weapon | `am_cp_weapon` | id→AM_CP_WEAPON；中文名→AM_CP_WEAPON |
| `am_bioethics` | 生命倫理 Bioethics | `am_bioethics` | id→AM_BIOETHICS；英文名→AM_BIOETHICS；中文名→AM_BIOETHICS |
| `am_callhomun` | 生命體召喚 Call Homunculus | `am_callhomun` | id→AM_CALLHOMUN；英文名→AM_CALLHOMUN；中文名→AM_CALLHOMUN |
| `am_rest` | 安息 Rest | `am_rest` | id→AM_REST；中文名→AM_REST |
| `am_resurrecthomun` | 復活生命體 Resurrect Homunculus | `am_resurrecthomun` | id→AM_RESURRECTHOMUN；中文名→AM_RESURRECTHOMUN |
| `pa_shieldchain` | 連續盾擊 Shield Chain | `pa_shieldchain` | id→PA_SHIELDCHAIN；英文名→PA_SHIELDCHAIN；中文名→PA_SHIELDCHAIN |
| `pa_pressure` | 神之威壓 Pressure | `pa_pressure` | id→PA_PRESSURE；中文名→PA_PRESSURE |
| `pa_sacrifice` | 捨命攻擊 Sacrifice | `pa_sacrifice` | id→PA_SACRIFICE；英文名→CR_DEVOTION/ML_DEVOTION；中文名→PA_SACRIFICE |
| `pa_gospel` | 聖音 Gospel | `pa_gospel` | id→PA_GOSPEL；中文名→PA_GOSPEL |
| `pf_spiderweb` | 易燃之網 Spider Web | `pf_spiderweb` | id→PF_SPIDERWEB；中文名→PF_SPIDERWEB |
| `pf_fogwall` | 薄霧牆 Fog Wall | `pf_fogwall` | id→PF_FOGWALL；中文名→PF_FOGWALL |
| `pf_doublecasting` | 雙倍投擲 Double Casting | `pf_doublecasting` | id→PF_DOUBLECASTING；英文名→PF_DOUBLECASTING；中文名→PF_DOUBLECASTING |
| `pf_memorize` | 速讀術 Memorize | `pf_memorize` | id→PF_MEMORIZE；中文名→PF_MEMORIZE |
| `pf_hpconversion` | HP轉換 HP Conversion | `pf_hpconversion` | id→PF_HPCONVERSION；中文名→PF_HPCONVERSION |
| `pf_soulchange` | 心神互換 Soul Change | `pf_soulchange` | id→PF_SOULCHANGE；中文名→PF_SOULCHANGE |
| `pf_soulburn` | 精神耗弱術 Soul Burn | `pf_soulburn` | id→PF_SOULBURN；中文名→PF_SOULBURN |
| `pf_mindbreaker` | 精神撼動 Mind Breaker | `pf_mindbreaker` | id→PF_MINDBREAKER；英文名→PF_MINDBREAKER；中文名→PF_MINDBREAKER |
| `cg_moonlit` | 落花伴著月光下的水車小屋 Moonlit Water Mill | `cg_moonlit` | id→CG_MOONLIT；中文名→CG_MOONLIT |
| `cg_specialsinger` | 職人演奏家 Longing for Freedom | `cg_specialsinger` | id→CG_SPECIALSINGER；中文名→CG_SPECIALSINGER |
| `cg_hermode` | 海羅默德的手杖 Wand of Hermode | `cg_hermode` | id→CG_HERMODE；英文名→CG_HERMODE；中文名→CG_HERMODE |
| `cg_tarotcard` | 命運的塔羅牌 Tarot Card of Fate | `cg_tarotcard` | id→CG_TAROTCARD；英文名→CG_TAROTCARD；中文名→CG_TAROTCARD |
| `cg_arrowvulcan` | 奧義箭亂舞 Arrow Vulcan | `cg_arrowvulcan` | id→CG_ARROWVULCAN；中文名→CG_ARROWVULCAN |
| `bc_aciddemonstration` | 強酸火煙瓶投擲 Acid Demonstration | `cr_aciddemonstration` | 英文名→CR_ACIDDEMONSTRATION；中文名→ |
| `st_rejectsword` | 霸王魂 Reject Sword | `st_rejectsword` | id→ST_REJECTSWORD；中文名→ST_REJECTSWORD |
| `st_chasewalk` | 暗影追蹤 Chase Walk | `st_chasewalk` | id→ST_CHASEWALK；中文名→ST_CHASEWALK |
| `st_preserve` | 自由保護 Preserve | `st_preserve` | id→ST_PRESERVE；英文名→ST_PRESERVE；中文名→ST_PRESERVE |
| `st_fullstrip` | 所有卸除 Full Strip | `st_fullstrip` | id→ST_FULLSTRIP；中文名→ST_FULLSTRIP |
| `ch_soulcollect` | 狂蓄氣 Soul Collect | `ch_soulcollect` | id→CH_SOULCOLLECT；英文名→SP_SOULCOLLECT；中文名→CH_SOULCOLLECT |
| `ch_palmstrike` | 猛虎硬派山 Palm Strike | `ch_palmstrike` | id→CH_PALMSTRIKE；中文名→CH_PALMSTRIKE |
| `ch_tigerfist` | 伏虎拳 Tiger Fist | `ch_tigerfist` | id→CH_TIGERFIST；中文名→CH_TIGERFIST |
| `ch_chaincrush` | 氣絕崩擊 Chain Crush | `ch_chaincrush` | id→CH_CHAINCRUSH；中文名→CH_CHAINCRUSH |

