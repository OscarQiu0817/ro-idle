/* 技能特效計畫（T24，2026-11-14）：從 roBrowser 的 SkillEffect.js／EffectTable.js（當純文字解析，不執行）
   算出每個技能要播哪些特效圖層、播在施法者還是目標，給 scripts/gen_skill_fx.py 轉檔用。

   node scripts/gen_skill_fx_plan.js <roBrowser 的 src/DB 資料夾或放那四個檔的資料夾>
     需要：SkillEffect.js、EffectTable.js（MrAntares/roBrowserLegacy）
     → scripts/out/skill_fx_plan.json

   只收「轉得出來」的圖層：STR（.str 動畫）、SPR（特效精靈圖）、3D／2D（精靈圖或單張貼圖的光點）。
   FUNC（程式畫的）、CYLINDER（圓柱）、TRAIL 等先略過，之後一類一類補。 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
if (!SRC) { console.error('用法：node scripts/gen_skill_fx_plan.js <roBrowser 資料夾>'); process.exit(1); }
const find = f => [path.join(SRC, f), path.join(SRC, 'Skills', f), path.join(SRC, 'Effects', f)].find(p => fs.existsSync(p));
const SE = fs.readFileSync(find('SkillEffect.js'), 'utf8');
const ET = fs.readFileSync(find('EffectTable.js'), 'utf8');
const ROOT = path.join(__dirname, '..');
const { SKILLS } = require('./lib/game_data').loadGameData();
const TEX = path.join(ROOT, 'grf_ex', 'effect');
const SPR = path.join(ROOT, 'grf_ex', 'sprite', '이팩트');
const texSet = new Set(fs.readdirSync(TEX).map(x => x.toLowerCase()));
const sprSet = new Set(fs.readdirSync(SPR).map(x => x.toLowerCase()));

// 檔名裡的 \xNN 是 EUC-KR 韓文
const BS = String.fromCharCode(92);
const HEXRE = new RegExp(BS + BS + 'x([0-9a-fA-F]{2})', 'g');
const kname = s => {
  if (!s || !s.includes(BS + 'x')) return s;
  const b = Buffer.from(s.replace(HEXRE, (m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1');
  return new TextDecoder('euc-kr').decode(b);
};

/* ---- 技能 → 特效 id ---- */
const skills = {};
for (const m of SE.matchAll(/^SkillEffect\[SK\.(\w+)\]\s*=\s*(\{[^\n]*?\}|SkillEffect\[SK\.(\w+)\])\s*;/gm)) {
  if (m[3]) { if (skills[m[3]]) skills[m[1]] = skills[m[3]]; continue; }
  const e = {};
  for (const p of m[2].matchAll(/(\w+)\s*:\s*(\[[^\]]*\]|'[^']*'|"[^"]*"|-?\d+(?:\.\d+)?|true|false)/g)) {
    e[p[1]] = p[2].replace(/['"]/g, '');
  }
  skills[m[1]] = e;
}

/* ---- 特效 id → 圖層 ---- */
const effects = {};
const marks = [...ET.matchAll(/^\t(\d+|'[\w-]+'|\w+)\s*:\s*\[/gm)];
const VAL = /^\s*(\w+)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?|true|false|\[[^\]\n]*\])\s*,?\s*$/;
marks.forEach((m, i) => {
  const key = m[1].replace(/'/g, '');
  const body = ET.slice(m.index, i + 1 < marks.length ? marks[i + 1].index : ET.length);
  effects[key] = body.split(/\n\t\t\{/).slice(1).map(b => {
    const L = { func: /\bfunc\s*:|function\s*\(|=>/.test(b) };
    b.split('\n').forEach(line => {
      const x = line.match(VAL);
      if (!x) return;
      let v = x[2];
      if (/^['"]/.test(v)) v = kname(v.slice(1, -1));
      else if (v === 'true' || v === 'false') v = v === 'true';
      else if (/^\[/.test(v)) { try { v = JSON.parse(v.replace(/'/g, '"')); } catch (e) { return; } }
      else if (v.includes('/')) { const [a, c] = v.split('/').map(Number); v = a / c; }
      else v = Number(v);
      if (!(x[1] in L)) L[x[1]] = v;
    });
    return L;
  });
});

/* ---- 圖層轉成轉檔／播放計畫 ---- */
const strFile = f => { const n = f.replace('%d', '1').toLowerCase(); return texSet.has(n + '.str') ? f : null; };
const sprFile = f => (f && sprSet.has(f.toLowerCase() + '.spr') ? f : null);
const texFile = f => { if (!f) return null; const n = f.replace(/^effect\//i, ''); return texSet.has(n.toLowerCase()) ? n : null; };
const sheets = {};   // 要轉的素材：name → {kind, file, ...}
const safe = s => s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '') || 'k' + Buffer.from(s).toString('hex').slice(0, 12);
// 音效（官方 data\wav\<路徑>.wav）：%d 照 rand 展開；只留 grf_ex/wav 裡找得到的
function wavList(L) {
  const wavs = [];
  if (L.wav) {
    const base = String(L.wav).split(BS).join('/');
    const list = L.rand && base.includes('%d') ? Array.from({ length: L.rand[1] - L.rand[0] + 1 }, (_, i) => base.replace('%d', L.rand[0] + i)) : [base.replace('%d', '1')];
    list.forEach(w => { if (fs.existsSync(path.join(ROOT, 'grf_ex', 'wav', w + '.wav'))) wavs.push(w); });
  }
  return wavs;
}
function soundOnly(L) {
  const wavs = wavList(L);
  return wavs.length ? { wav: wavs, wavDelay: L.delayWav || 0, delay: L.delayOffset || 0 } : null;
}
function layerPlan(L) {
  const wavs = wavList(L);
  const common = { wav: wavs.length ? wavs : undefined, wavDelay: L.delayWav || 0, delay: L.delayOffset || L.delayFrame ? (L.delayOffset || 0) + (L.delayFrame ? L.delayFrame * 0 : 0) : 0,
    head: !!L.head, yOffset: L.yOffset || 0, alphaMax: L.alphaMax != null ? L.alphaMax : 1 };
  if (L.func) return null;
  if (L.type === 'STR' && L.file && strFile(L.file)) {
    const variants = L.rand ? Array.from({ length: L.rand[1] - L.rand[0] + 1 }, (_, i) => L.file.replace('%d', L.rand[0] + i)) : [L.file];
    const names = variants.filter(v => texSet.has(v.toLowerCase() + '.str')).map(v => { const n = 'str_' + safe(v); sheets[n] = { kind: 'str', file: v }; return n; });
    return names.length ? Object.assign({ play: 'anim', fx: names }, common) : null;
  }
  if (L.type === 'SPR' && sprFile(L.file)) {
    const n = 'spr_' + safe(L.file); sheets[n] = { kind: 'spr', file: L.file };
    return Object.assign({ play: 'anim', fx: [n], repeat: !!L.repeat, duration: L.duration || 0 }, common);
  }
  if ((L.type === '3D' || L.type === '2D') && (sprFile(L.spriteName) || texFile(L.file))) {
    let n;
    if (sprFile(L.spriteName)) { n = 'spr_' + safe(L.spriteName); sheets[n] = { kind: 'spr', file: L.spriteName }; }
    else { const f = texFile(L.file); n = 'tex_' + safe(f); sheets[n] = { kind: 'tex', file: f }; }
    return Object.assign({ play: 'particle', fx: [n], duration: L.duration || 500, dup: Math.min(8, L.duplicate || 1),
      gap: L.timeBetweenDupli || 0, size: L.size || 100, rx: L.posxRand || 0, ry: L.posyRand || 0,
      rise: (L.poszEnd || 0) - (L.poszStart || 0), fadeIn: !!L.fadeIn, fadeOut: L.fadeOut !== false }, common);
  }
  return null;
}
// 播在哪裡：OnCaster／Caster 結尾 → 施法者；ground → 目標地面；其餘 → 目標（自身增益技的目標就是自己）
const where = k => (/caster/i.test(k) ? 'caster' : /ground/i.test(k) ? 'ground' : 'target');
const plan = {};
let nLayers = 0, nSkip = 0;
for (const [sk, e] of Object.entries(skills)) {
  const list = [];
  for (const k in e) {
    if (!/effect/i.test(k) || /^(hitEffectOnce|.*Once)$/i.test(k)) continue;
    String(e[k]).replace(/[[\]]/g, '').split(',').map(x => x.trim()).filter(Boolean).forEach(id => {
      (effects[id] || []).forEach(L => {
        const p = layerPlan(L);
        if (p) { list.push(Object.assign({ at: where(k), key: k }, p)); nLayers++; return; }
        nSkip++;
        // 畫面還轉不出來的圖層（程式畫的、圓柱…），音效先收：只播聲音
        const s = soundOnly(L);
        if (s) list.push(Object.assign({ at: where(k), key: k, play: 'sound', fx: [] }, s));
      });
    });
  }
  const id = sk.toLowerCase();
  if (list.length && SKILLS[id] && !SKILLS[id].unimplemented) plan[id] = list;   // 只收本作有實作的技能
}
// 素材只留計畫裡用得到的
for (const n of Object.keys(sheets)) if (!Object.values(plan).some(l => l.some(p => p.fx.includes(n)))) delete sheets[n];
const OUT = path.join(ROOT, 'scripts', 'out', 'skill_fx_plan.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ sheets, plan }, null, 0));
console.log('技能', Object.keys(plan).length, '圖層', nLayers, '略過', nSkip, '素材', Object.keys(sheets).length, '→', OUT);
