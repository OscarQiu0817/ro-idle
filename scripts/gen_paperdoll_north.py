"""朝上（背面）的站立與走路圖層（使用者 2026-11-22：角色做朝上走路）。
   原本的紙娃娃圖層只有正面、側面；這裡從 grf_ex 補 RO 的朝北動作：站立 act 4、走路 act 12。
   key 一律是「n/＋原本的圖層 key」，動作名 idle_n／walk_n，畫法跟原本一樣（paperdoll.js 會把圖層換成 n/ 版）。
   輸出：
     js/paperdoll_n/core.js           身體（含騎乘）、頭髮、武器（第一次往上走才載入）
     js/paperdoll_n/hat_<view>.js     頭飾（含服飾頭飾），各自用到才載入
     images/paperdoll/north/*.png
   頭髮：照髮色套 grf_ex/palette/머리 的調色盤（跟原本的圖層一樣），每個髮型×髮色一張。
   披肩服飾的朝上動作由 scripts/gen_costume_robes.py 一起轉。
   python scripts/gen_paperdoll_north.py """
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from ro_sprite import read_spr
from ro_paperdoll import read_act_anchors
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'grf_ex', 'sprite', '인간족')
OUT_IMG = os.path.join(ROOT, 'images', 'paperdoll', 'north')
OUT_JS = os.path.join(ROOT, 'js', 'paperdoll_n')
GK = {'male': '남', 'female': '여'}
NORTH = {'idle_n': (4, True), 'walk_n': (12, False)}
sys.path.insert(0, os.path.dirname(__file__))
from gen_costume_robes import JOB_KR, JOB_KR_F   # noqa: E402（同一份職業對照）
# 騎乘：身體檔名、武器資料夾（同 gen_mount_paperdoll.py）
MOUNT_BODY = {'knight_mount': '페코페코_기사', 'crusader_mount': '신페코크루세이더', 'lordknight_mount': '로드페코', 'paladin_mount': '페코팔라딘'}
MOUNT_WEAPON = {'knight_mount': '페코페코_기사', 'crusader_mount': '신페코크루세이더', 'lordknight_mount': '페코페코_기사', 'paladin_mount': '신페코크루세이더'}
WEAPON_KR = {'sword1': '검', 'sword2': '양손검', 'dagger': '단검', 'axe1': '도끼', 'axe2': '양손도끼', 'spear1': '창', 'spear2': '양손창',
             'mace': '클럽', 'rod1': '롯드', 'rod2': '롯드', 'bow': '활', 'katar': '카타르_카타르', 'knuckle': '너클', 'book': '책',
             'whip': '채찍', 'instrument': '악기'}


def job_kr(job, g):
    return JOB_KR_F.get(job, JOB_KR.get(job)) if g == 'female' else JOB_KR.get(job)


def layer(spr, act, pal=None):
    """回傳 (圖片清單, clip)；沒有朝北動作回 None"""
    ims, rgba = read_spr(spr, pal)
    acts = read_act_anchors(act)
    used, order, clip = {}, [], {}
    for name, (ai, first) in NORTH.items():
        if ai >= len(acts):
            return None
        out = []
        for layers, anchors in (acts[ai][:1] if first else acts[ai]):
            flat = []
            for x, y, idx, mirror, typ in layers:
                pool = rgba if typ == 1 else ims
                if idx < 0 or idx >= len(pool):
                    continue
                k = (typ, idx)
                if k not in used:
                    used[k] = len(order); order.append(pool[idx])
                flat += [used[k], x, y, 1 if mirror else 0]
            ax, ay = anchors[0] if anchors else (0, 0)
            out.append([ax, ay, flat])
        clip[name] = out
    return order, clip


def atlas(order, fn):
    rects, x, y, row_h, W = [], 0, 0, 0, 1024
    for im in order:
        if x + im.width > W:
            x, y, row_h = 0, y + row_h + 1, 0
        rects.append([x, y, im.width, im.height]); x += im.width + 1; row_h = max(row_h, im.height)
    img = Image.new('RGBA', (W if order else 1, max(1, y + row_h)), (0, 0, 0, 0))
    for im, r_ in zip(order, rects):
        img.alpha_composite(im, (r_[0], r_[1]))
    img.save(os.path.join(OUT_IMG, fn), optimize=True)
    return {'src': 'images/paperdoll/north/' + fn, 'f': rects}


def source(key, view_name):
    p = key.split('/')
    if p[0] == 'body':
        job, g = p[1], p[2]
        kr = MOUNT_BODY.get(job) or job_kr(job, g)
        return kr and os.path.join(SPR, '몸통', GK[g], f'{kr}_{GK[g]}')
    if p[0] == 'head' and len(p) == 4:
        return os.path.join(SPR, '머리통', GK[p[1]], f'{p[2]}_{GK[p[1]]}')
    if p[0] == 'weapon':
        job, g, cat = p[1], p[2], p[3]
        folder = MOUNT_WEAPON.get(job) or {'royalguard': '로얄가드'}.get(job) or job_kr(job, g)
        w = WEAPON_KR.get(cat)
        return folder and w and os.path.join(SPR, folder, f'{folder}_{GK[g]}_{w}')
    if p[0] == 'hat':
        n = view_name.get(int(p[1]))
        return n and os.path.join(ROOT, 'grf_ex', 'sprite', '악세사리', GK[p[2]], GK[p[2]] + n)
    return None


def js_wrap(img, clip, flag):
    return ('(function (P) { if (!P) return;\n'
            f'  Object.assign(P.img, {json.dumps(img, ensure_ascii=False, separators=(",", ":"))});\n'
            f'  Object.assign(P.clip, {json.dumps(clip, ensure_ascii=False, separators=(",", ":"))});\n'
            f'  (window.PAPERDOLL_N = window.PAPERDOLL_N || {{}})[{json.dumps(flag)}] = 1;\n'
            '})(window.PAPERDOLL);\n')


def main():
    keys = json.loads(subprocess.check_output(['node', '-e',
        "global.window={};require('./js/paperdoll_layers.js');require('./js/paperdoll_mount.js');console.log(JSON.stringify(Object.keys(window.PAPERDOLL.clip)))"], cwd=ROOT))
    hats_lazy = json.load(open(os.path.join(ROOT, 'scripts', 'out', 'costume_hats.json'), encoding='utf-8'))
    for v in hats_lazy:
        keys += [f'hat/{v}/male', f'hat/{v}/female']
    view_name = json.loads(subprocess.check_output(['node', '-e', r"""
const fs=require('fs');const src=fs.readFileSync('scripts/lib/lub.js','utf8').replace("d.toString('utf8', pos, pos + n - 1)","new TextDecoder('euc-kr').decode(d.subarray(pos, pos + n - 1))");
const m={exports:{}};new Function('module','exports','require',src)(m,m.exports,require);
const AN=m.exports.readLub('grf_ex/accname.lub').AccNameTable, AI=m.exports.readLub('grf_ex/accessoryid.lub').ACCESSORY_IDs;
const o={};for(const [k,v] of Object.entries(AN)){const id=AI[k.replace('ACCESSORY_IDs.','')];if(id!=null)o[id]=v;}console.log(JSON.stringify(o));"""], cwd=ROOT))
    view_name = {int(k): v for k, v in view_name.items()}
    os.makedirs(OUT_IMG, exist_ok=True); os.makedirs(OUT_JS, exist_ok=True)
    core_img, core_clip, hats = {}, {}, {}
    head_cache = {}
    stat = {'ok': 0, 'nosrc': 0, 'noact': 0}
    missing = []
    for key in sorted(set(keys)):
        base = source(key, view_name)
        if not base or not os.path.exists(base + '.spr') or not os.path.exists(base + '.act'):
            stat['nosrc'] += 1; missing.append(key); continue
        nk = 'n/' + key
        if key.startswith('head/'):   # 髮色套調色盤
            g_, st_, co_ = key.split('/')[1:4]
            palf = os.path.join(ROOT, 'grf_ex', 'palette', '머리', f'머리{st_}_{GK[g_]}_{co_}.pal')
            pal = open(palf, 'rb').read() if os.path.exists(palf) else None
            ck = (base, co_ if pal else '')
            if ck not in head_cache:
                r = layer(base + '.spr', base + '.act', pal)
                head_cache[ck] = r and (atlas(r[0], 'head_' + '_'.join(key.split('/')[1:4]) + '.png'), r[1])
            r = head_cache[ck]
            if not r:
                stat['noact'] += 1; continue
            core_img[nk], core_clip[nk] = r
            stat['ok'] += 1
            continue
        r = layer(base + '.spr', base + '.act')
        if not r:
            stat['noact'] += 1; continue
        fn = re.sub(r'[^a-z0-9_]', '_', key.lower()) + '.png'
        meta = atlas(r[0], fn)
        if key.startswith('hat/'):
            v = key.split('/')[1]
            hats.setdefault(v, ({}, {}))
            hats[v][0][nk], hats[v][1][nk] = meta, r[1]
        else:
            core_img[nk], core_clip[nk] = meta, r[1]
        stat['ok'] += 1
    open(os.path.join(OUT_JS, 'core.js'), 'w', encoding='utf-8').write(
        '/* 由 scripts/gen_paperdoll_north.py 產生，不要手改。朝上的身體、頭髮、武器 */\n' + js_wrap(core_img, core_clip, 'core'))
    for v, (img, clip) in hats.items():
        open(os.path.join(OUT_JS, f'hat_{v}.js'), 'w', encoding='utf-8').write(js_wrap(img, clip, 'hat_' + v))
    print(stat, 'hat files', len(hats))
    print('missing sample', [k for k in missing if not k.startswith('head/')][:30])


if __name__ == '__main__':
    main()
