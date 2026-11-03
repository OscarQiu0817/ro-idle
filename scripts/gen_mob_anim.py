"""怪物動畫圖集（images/mob_anim/<imgId>.png）與索引（index.json、js/mob_anim_index.js）

  python scripts/gen_mob_anim.py <怪物編號> [...]
  python scripts/gen_mob_anim.py --missing       # 地圖上會出現、但還沒有動畫圖的怪（清單由 node 先算好，見下方）

來源：grf_ex/sprite/몬스터/<sprite>.spr／.act；sprite 名稱查 grf_ex/jobname.lub（JT_<AegisName>），
怪物編號 → AegisName 查 mob_db_re.yml。
排版跟既有的圖一樣：方向 0；待機、走路、攻擊、受擊、死亡依序排成一張，每列 cols 格；
cell＝所有格內容的聯集大小、anchor＝腳底在格子裡的位置、fit＝待機那幾格的內容大小、delay＝act 間隔 ×25ms。
沒有靜態圖（images/monsters/<imgId>.png）的，順便用待機第一格產生。
"""
import hashlib
import json
import math
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from ro_sprite import read_spr, read_act, render_motion  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
SPR_DIR = os.path.join(ROOT, 'grf_ex', 'sprite', '몬스터')
OUT_DIR = os.path.join(ROOT, 'images', 'mob_anim')
STATIC_DIR = os.path.join(ROOT, 'images', 'monsters')
INDEX_JSON = os.path.join(OUT_DIR, 'index.json')
INDEX_JS = os.path.join(ROOT, 'js', 'mob_anim_index.js')
ACTIONS = [('idle', 0), ('walk', 1), ('attack', 2), ('hit', 3), ('die', 4)]
MAX_SHEET_W = 1024


def sprite_names():
    """怪物編號 → sprite 檔名（node 讀 jobname.lub，lub 是 Lua 位元碼）"""
    js = r"""
const fs = require('fs');
const { readLub } = require('./scripts/lib/lub');
const J = readLub('grf_ex/jobname.lub').JobNameTable;
const out = {};
for (const m of fs.readFileSync('mob_db_re.yml', 'utf8').matchAll(/^ {2}- Id: (\d+)\r?\n {4}AegisName: (\w+)/mg)) {
  out[m[1]] = (J['jobtbl.JT_' + m[2]] || m[2]).toLowerCase();
}
process.stdout.write(JSON.stringify(out));
"""
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def missing_ids():
    js = r"""
const fs = require('fs');
const H = require('./tools/harness'); const g = H.boot();
const on = new Set();
g.MAPS.forEach(m => m.monsters.forEach(o => on.add(o.id)));
Object.values(g.MVP_MAP_DATA).forEach(l => l.forEach(i => on.add(i)));
const ids = [...on].map(k => g.MONSTERS[k]).filter(m => m && !fs.existsSync('images/mob_anim/' + m.imgId + '.png')).map(m => m.imgId);
process.stdout.write('IDS:' + JSON.stringify([...new Set(ids)]));
"""
    out = subprocess.check_output(['node', '-e', js], cwd=ROOT).decode('utf8', 'replace')
    return json.loads(out[out.index('IDS:') + 4:])     # harness 會印 [data] 訊息


def export(mid, spr_name):
    spr_path, act_path = (os.path.join(SPR_DIR, spr_name + ext) for ext in ('.spr', '.act'))
    if not (os.path.exists(spr_path) and os.path.exists(act_path)):
        return None, '找不到 ' + spr_name + '.spr／.act'
    spr = read_spr(spr_path)
    acts, delays = read_act(act_path)
    frames, meta = [], {}
    for name, group in ACTIONS:
        i = group * 8
        if i >= len(acts) or not acts[i]:
            i = 0                                   # 動作不夠的（物件類）用待機代替
        start = len(frames)
        for layers in acts[i]:
            frames.append(render_motion(layers, spr))
        meta[name] = {'start': start, 'frames': len(acts[i]), 'delay': round(delays[i] * 25) if i < len(delays) else 100}
    boxes = [im.getbbox() for im, _ in frames]
    if not any(boxes):
        return None, '所有格都是空的'
    ox, oy = frames[0][1]
    xs = [b for b in boxes if b]
    x0, y0 = min(b[0] for b in xs), min(b[1] for b in xs)
    x1, y1 = max(b[2] for b in xs), max(b[3] for b in xs)
    cw, ch = x1 - x0, y1 - y0
    idle = [b for b in boxes[meta['idle']['start']:meta['idle']['start'] + meta['idle']['frames']] if b] or xs
    fit = [max(b[2] for b in idle) - min(b[0] for b in idle), max(b[3] for b in idle) - min(b[1] for b in idle)]
    cols = max(1, min(len(frames), MAX_SHEET_W // max(1, cw)))
    rows = math.ceil(len(frames) / cols)
    from PIL import Image
    sheet = Image.new('RGBA', (cols * cw, rows * ch), (0, 0, 0, 0))
    for n, (im, _) in enumerate(frames):
        sheet.alpha_composite(im.crop((x0, y0, x1, y1)), ((n % cols) * cw, (n // cols) * ch))
    out = os.path.join(OUT_DIR, f'{mid}.png')
    sheet.quantize(colors=255, method=Image.Quantize.FASTOCTREE).save(out, optimize=True)
    v = hashlib.md5(open(out, 'rb').read()).hexdigest()[:8]
    static = os.path.join(STATIC_DIR, f'{mid}.png')
    if not os.path.exists(static):
        first = frames[meta['idle']['start']][0]
        first.crop(first.getbbox()).save(static, optimize=True)
    return {'cell': [cw, ch], 'anchor': [ox - x0, oy - y0], 'fit': fit, 'cols': cols, 'actions': meta, 'spr': None, 'v': v}, None


def main():
    args = sys.argv[1:]
    ids = missing_ids() if args == ['--missing'] else [int(a) for a in args]
    names = sprite_names()
    table = json.load(open(INDEX_JSON, encoding='utf8'))
    done, failed = [], []
    for mid in ids:
        entry, why = export(mid, names.get(str(mid), ''))
        if entry:
            table[str(mid)] = entry
            done.append(mid)
        else:
            failed.append(f'{mid}（{why}）')
    text = json.dumps(table, ensure_ascii=False, separators=(',', ':'))
    open(INDEX_JSON, 'w', encoding='utf8').write(text)
    open(INDEX_JS, 'w', encoding='utf8').write('window.MOB_ANIM_TABLE=' + text + ';\n')
    print(f'匯出 {len(done)} 隻：{" ".join(map(str, done))}')
    if failed:
        print(f'失敗 {len(failed)} 隻：' + '、'.join(failed))


if __name__ == '__main__':
    main()
