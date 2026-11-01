/* 技能圖示與狀態圖示
   node scripts/gen_skill_icons.js
     grf_ex/skill_img/<rAthena 技能名小寫>.bmp → images/skills/<技能 id>.png（洋紅 255,0,255 去背）
     grf_ex/effect/<原版檔名>.tga           → images/skills/status/<技能 id>.png（右側加成欄）
   狀態圖對照：先查手動表 STATUS，再查 grf_ex/status.yml（技能→EFST）+ stateiconimginfo.lub（EFST→檔名）。
   lub 只收較新的圖示，經典 buff（賜福等）寫死在客戶端，所以手動表仍是主力；兩邊都沒有的 buff 畫面上改用技能圖示。
   產出 js/skill_icon_data.js：有狀態圖的 key 清單，前端據此決定用哪張，避免 404。 */
const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');
const { loadGameData, ROOT } = require('./lib/game_data');

const SRC = path.join(ROOT, 'grf_ex', 'skill_img');
const OUT = path.join(ROOT, 'images', 'skills');
// 原版檔名跟技能 id 不同的
const ALIAS = { ba_frostjoker: 'ba_frostjoke', cg_specialsinger: 'skid_cg_specialsinger' };
const EFFECT = path.join(ROOT, 'grf_ex', 'effect');
const STATUS_OUT = path.join(OUT, 'status');
// buff 的 key（技能 id；沒有技能來源的藥水用 type_<buff type>）→ 原版狀態圖檔名
const STATUS = {
  sm_endure: 'endure', sm_autoberserk: '폭기', ac_concentration: '집중력향상', mc_loud: '고성지르기',
  tf_hiding: '하이딩', mg_energycoat: '에너지코트',
  al_angelus: '안젤루스', al_incagi: '민첩성증가', al_blessing: '블레싱', pr_kyrie: '기리에엘레이손',
  kn_twohandquicken: '투핸드퀴큰', kn_onehand: 'i_onehand',
  bs_adrenaline: '아드레날린러쉬', bs_weaponperfect: '웨폰퍼펙션', bs_overthrust: '오버트러스트', bs_maximize: '맥시마이즈파워',
  ws_overthrustmax: 'i_오버맥스', as_cloaking: '클로킹', as_enchantpoison: '인찬트포이즌',
  pr_magnificat: '마니피캇', pr_gloria: '글로리아', pr_benedictio: '성체강복', pr_aspersio: '아스페르시오',
  pr_slowpoison: '슬로우포이즌', pr_impositio: '임포시티오마누스',
  cr_autoguard: '오토가드', cr_devotion: '헌신', cr_reflectshield: '리플렉트쉴드', cr_spearquicken: '스피어퀴큰',
  hw_magicpower: '마법력증폭', mo_explosionspirits: '폭기', mo_steelbody: 'steelbody',
  ba_whistle: 'whistle', ba_assassincross: 'assassincross', ba_poembragi: 'poembragi', ba_appleidun: 'appleidun',
  dc_humming: 'humming', dc_dontforgetme: 'dontforgetme', dc_fortunekiss: 'fortunekiss', dc_serviceforyou: 'serviceforyou',
  bd_adaptation: 'adaptation', bd_intoabyss: 'intoabyss', bd_eternalchaos: 'eternalchaos', bd_siegfried: 'siegfried',
  bd_richmankim: 'richmankim', bd_drumbattlefield: 'drumbattlefield', bd_ringnibelungen: 'ringnibelungen',
  sa_flamelauncher: '프레임런처', sa_frostweapon: '프로스트웨폰', sa_lightningloader: '라이트닝로더', sa_seismicweapon: '사이즈믹웨폰',
  am_cp_helm: '케미컬프로텍션[헬름]', am_cp_shield: '케미컬프로텍션[쉴드]', am_cp_armor: '케미컬프로텍션[아머]', am_cp_weapon: '케미컬프로텍션[웨폰]',
  pf_doublecasting: 'i_더블캐스팅', st_preserve: 'i_프리저브', st_chasewalk: 'i_체이스힘',
  cr_defender: '디펜더', al_decagi: '민첩성감소', al_crucis: '시그넘크루시스', sm_provoke: '프로보크',
  sa_autospell: '오토스펠', ws_cartboost: '카트부스트', as_poisonreact: '포이즌리액트', pf_spiderweb: 'spiderweb',
  lk_aurablade: 'icon04', sn_windwalk: 'icon06', sn_sight: 'icon09',
  type_aspd: '공속물약',
};

async function main() {
  const { SKILLS } = loadGameData();
  fs.mkdirSync(OUT, { recursive: true });
  const missing = [];
  let n = 0;
  for (const id of Object.keys(SKILLS)) {
    const src = path.join(SRC, (ALIAS[id] || id) + '.bmp');
    if (!fs.existsSync(src)) { missing.push(id); continue; }
    const img = await Jimp.read(src);
    const d = img.bitmap.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] >= 0xfe && d[i + 1] <= 3 && d[i + 2] >= 0xfe) d[i + 3] = 0;
    }
    await img.write(path.join(OUT, id + '.png'));
    n++;
  }
  console.log(`輸出 ${n} 張 → images/skills/`);
  if (missing.length) console.log('找不到圖：' + missing.join(' '));

  // 狀態圖：只輸出遊戲裡有的技能（藥水的 type_ 一律輸出）
  fs.mkdirSync(STATUS_OUT, { recursive: true });
  const keys = [];
  const noFile = [];
  const auto = autoStatusMap(SKILLS);
  for (const [key, file] of Object.entries({ ...auto, ...STATUS })) {
    if (!key.startsWith('type_') && !SKILLS[key]) continue;
    const src = path.join(EFFECT, /\.tga$/i.test(file) ? file : file + '.tga');
    if (!fs.existsSync(src)) { noFile.push(key + '→' + file); continue; }
    const tga = readTga(fs.readFileSync(src));
    const img = new Jimp({ width: tga.width, height: tga.height });
    img.bitmap.data.set(tga.data);
    await img.write(path.join(STATUS_OUT, key + '.png'));
    keys.push(key);
  }
  console.log(`狀態圖 ${keys.length} 張 → images/skills/status/`);
  if (noFile.length) console.log('找不到狀態圖：' + noFile.join(' '));
  fs.writeFileSync(path.join(ROOT, 'js', 'skill_icon_data.js'),
    '/* 由 scripts/gen_skill_icons.js 產生，勿手動修改。有狀態圖（images/skills/status/）的 buff key */\n'
    + 'const SKILL_STATUS_ICONS = new Set(' + JSON.stringify(keys.sort()) + ');\n');
}
/* status.yml（DurationLookup 技能 → Icon EFST）× stateiconimginfo.lub（EFST → 檔名）。檔案不在就回空表 */
function autoStatusMap(SKILLS) {
  const yml = path.join(ROOT, 'grf_ex', 'status.yml'), lubPath = path.join(ROOT, 'grf_ex', 'stateiconimginfo.lub');
  if (!fs.existsSync(yml) || !fs.existsSync(lubPath)) return {};
  const lub = readStateIconLub(fs.readFileSync(lubPath));
  const files = new Map(fs.readdirSync(EFFECT).map(f => [f.toLowerCase(), f]));
  const out = {};
  for (const e of fs.readFileSync(yml, 'utf8').split(/\n  - Status: /).slice(1)) {
    const icon = (e.match(/Icon: (\S+)/) || [])[1], skill = ((e.match(/DurationLookup: (\S+)/) || [])[1] || '').toLowerCase();
    const real = icon && lub[icon] && files.get(lub[icon].toLowerCase());
    if (real && SKILLS[skill] && !out[skill]) out[skill] = real;
  }
  return out;
}
/* Lua 5.1 bytecode：追 GETTABLE EFST_IDs.EFST_x → SETTABLE [..][EFST_x] = "檔名" */
function readStateIconLub(b) {
  let p = 12;
  const u8 = () => b[p++], i32 = () => { const v = b.readInt32LE(p); p += 4; return v; };
  const str = () => { const n = i32(); if (!n) return null; const s = new TextDecoder('euc-kr').decode(b.slice(p, p + n - 1)); p += n; return s; };
  const map = {};
  const fn = () => {
    str(); i32(); i32(); u8(); u8(); u8(); u8();
    const code = []; for (let n = i32(); n--; p += 4) code.push(b.readUInt32LE(p));
    const K = []; for (let n = i32(); n--;) { const t = u8(); K.push(t === 1 ? !!u8() : t === 3 ? (p += 8, 0) : t === 4 ? str() : null); }
    const reg = {}, rk = x => x >= 256 ? K[x - 256] : reg[x], isEfst = v => typeof v === 'string' && v.startsWith('EFST_');
    for (const ins of code) {
      const op = ins & 63, A = (ins >> 6) & 255, C = (ins >>> 14) & 511, B = (ins >>> 23) & 511;
      if (op === 6) reg[A] = isEfst(rk(C)) ? rk(C) : undefined;
      else if (op === 9) { if (isEfst(rk(B)) && typeof rk(C) === 'string') map[rk(B)] = rk(C); }
      else if (op !== 0 && op !== 10) reg[A] = undefined;
    }
    for (let n = i32(); n--;) fn();
    for (let n = i32(); n--;) i32();
    for (let n = i32(); n--;) { str(); i32(); i32(); }
    for (let n = i32(); n--;) str();
  };
  fn();
  return map;
}
/* TGA（未壓縮或 RLE、24/32 位元）→ RGBA。jimp 不支援 TGA */
function readTga(buf) {
  const idLen = buf[0], type = buf[2], width = buf.readUInt16LE(12), height = buf.readUInt16LE(14);
  const bpp = buf[16] >> 3, topDown = !!(buf[17] & 0x20);
  if (![2, 10].includes(type) || ![3, 4].includes(bpp)) throw new Error('不支援的 TGA 格式 ' + type + '/' + bpp * 8);
  const px = Buffer.alloc(width * height * 4);
  let p = 18 + idLen + (buf[1] ? buf.readUInt16LE(5) * (buf[7] >> 3) : 0), i = 0;
  const put = (o) => {
    const x = i % width, y = Math.floor(i / width), row = topDown ? y : height - 1 - y, d = (row * width + x) * 4;
    px[d] = buf[o + 2]; px[d + 1] = buf[o + 1]; px[d + 2] = buf[o]; px[d + 3] = bpp === 4 ? buf[o + 3] : 255;
    i++;
  };
  while (i < width * height) {
    if (type === 2) { put(p); p += bpp; continue; }
    const h = buf[p++], n = (h & 0x7f) + 1;
    if (h & 0x80) { for (let k = 0; k < n; k++) put(p); p += bpp; }
    else for (let k = 0; k < n; k++) { put(p); p += bpp; }
  }
  return { width, height, data: px };
}

main();
