"""武器刀光圖層（使用者 2026-11-23：刀光位置怪、只閃一下）。
   原本的武器圖層轉檔只收了刀光檔（<武器>_검광.act）第一張，有的連座標都錯。
   這支照官方刀光檔整段轉成獨立圖層 key＝「<武器圖層 key>/glow」，動作與格數跟武器圖層一樣；
   刀光檔有錨點的格子照錨點對齊身體（同頭髮）；另外記下武器本身每格有幾個圖層（trim），遊戲載入時把武器圖層裡那張舊刀光切掉（js/paperdoll.js）。
   輸出：js/paperdoll_glow.js ＋ images/paperdoll/glow/*.png
   python -X utf8 scripts/gen_paperdoll_glow.py """
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
sys.path.insert(0, os.path.dirname(__file__))
from ro_sprite import read_spr
from ro_paperdoll import read_act_anchors, ACTIONS
from gen_paperdoll_north import source, atlas as _atlas   # 同一套檔名對照
import gen_paperdoll_north as N
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_IMG = os.path.join(ROOT, 'images', 'paperdoll', 'glow')
OUT_JS = os.path.join(ROOT, 'js', 'paperdoll_glow.js')


def main():
    os.makedirs(OUT_IMG, exist_ok=True)
    N.OUT_IMG = OUT_IMG   # atlas() 寫到 glow 資料夾
    data = json.loads(subprocess.check_output(['node', '-e',
        "global.window={};require('./js/paperdoll_layers.js');const P=window.PAPERDOLL;const o={};"
        "for(const k in P.clip){if(!k.startsWith('weapon/'))continue;o[k]=Object.fromEntries(Object.entries(P.clip[k]).map(([a,f])=>[a,f.length]));}"
        "console.log(JSON.stringify(o))"], cwd=ROOT))
    img, clip, trim = {}, {}, {}
    stat = {'ok': 0, 'noglow': 0, 'empty': 0}
    for key, acts in sorted(data.items()):
        base = source(key, {})
        if not base or not os.path.exists(base + '_검광.act') or not os.path.exists(base + '_검광.spr'):
            stat['noglow'] += 1
            continue
        g_acts = read_act_anchors(base + '_검광.act')
        w_acts = read_act_anchors(base + '.act') if os.path.exists(base + '.act') else []
        ims, rgba = read_spr(base + '_검광.spr')
        used, order, c, t = {}, [], {}, {}
        for an, n in acts.items():
            if an not in ACTIONS:
                continue
            ai, first = ACTIONS[an]
            if ai >= len(g_acts):
                continue
            frames = g_acts[ai][:1] if first else g_acts[ai]
            out, any_layer = [], False
            for fi in range(n):
                flat = []
                ax, ay = 0, 0
                if fi < len(frames) and frames[fi][1]:
                    # 刀光檔有錨點的要對齊身體錨點（跟頭髮同一條規則，paperdollAlign 處理）；沒錨點的跟武器一樣用身體原點
                    ax, ay = frames[fi][1][0]
                if fi < len(frames):
                    for x, y, idx, mirror, typ in frames[fi][0]:
                        pool = rgba if typ == 1 else ims
                        if idx < 0 or idx >= len(pool):
                            continue
                        k = (typ, idx)
                        if k not in used:
                            used[k] = len(order); order.append(pool[idx])
                        flat += [used[k], x, y, 1 if mirror else 0]
                if flat:
                    any_layer = True
                out.append([ax, ay, flat])
            if not any_layer:
                continue
            c[an] = out
            # 武器本身每格的圖層數（舊轉檔把刀光接在後面，載入時切回這個數）
            wf = (w_acts[ai][:1] if first else w_acts[ai]) if ai < len(w_acts) else []
            t[an] = [sum(1 for (x, y, idx, m, typ) in (wf[fi][0] if fi < len(wf) else []) if idx >= 0) for fi in range(n)]
        if not c:
            stat['empty'] += 1
            continue
        fn = re.sub(r'[^a-z0-9_]', '_', key.lower()) + '.png'
        meta = _atlas(order, fn)
        meta['src'] = 'images/paperdoll/glow/' + fn
        gk = key + '/glow'
        img[gk], clip[gk], trim[key] = meta, c, t
        stat['ok'] += 1
    js = ('/* 由 scripts/gen_paperdoll_glow.py 產生，不要手改。武器刀光（官方 _검광 整段），trim＝武器本身每格圖層數 */\n'
          '(function (P) { if (!P) return;\n'
          f'  Object.assign(P.img, {json.dumps(img, ensure_ascii=False, separators=(",", ":"))});\n'
          f'  Object.assign(P.clip, {json.dumps(clip, ensure_ascii=False, separators=(",", ":"))});\n'
          f'  P.glowTrim = {json.dumps(trim, separators=(",", ":"))};\n'
          '})(window.PAPERDOLL);\n')
    open(OUT_JS, 'w', encoding='utf-8').write(js)
    print(stat)


if __name__ == '__main__':
    main()
