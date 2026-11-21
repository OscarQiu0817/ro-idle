"""獵鷹圖集：grf_ex/sprite/몬스터/매.spr → images/mob_anim/falcon.png；매2.spr → falcon2.png（進階二轉的獵鷹，外觀不同）
   排法跟原本 falcon 一樣：方向 1（朝左側面），待機 8 格（act 1）＋俯衝 1 格（act 9），寫進 images/mob_anim/index.json 與 js/mob_anim_index.js。
   原本的 falcon 是之前手動產生的；這支只補 falcon2，排法照它。
   python scripts/gen_falcon_anim.py """
import hashlib, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from ro_sprite import read_spr, read_act, render_motion
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'grf_ex', 'sprite', '몬스터')
OUT = os.path.join(ROOT, 'images', 'mob_anim')
INDEX_JSON = os.path.join(OUT, 'index.json')
INDEX_JS = os.path.join(ROOT, 'js', 'mob_anim_index.js')
SRC = {'falcon2': '매2'}   # 原本的 falcon（매）已經在 index.json 裡，排法相同
COLS = 9


def build(key, name):
    spr = read_spr(os.path.join(SPR, name + '.spr'))
    acts, delays = read_act(os.path.join(SPR, name + '.act'))
    seq = [('idle', 1), ('attack', 9)]
    frames, actions = [], {}
    for act, ai in seq:
        start = len(frames)
        for layers in acts[ai]:
            frames.append(render_motion(layers, spr, 256))
        actions[act] = {'start': start, 'frames': len(frames) - start, 'delay': round(delays[ai] * 25)}
    # 所有格內容聯集＝格子大小；原點在格子裡的位置＝錨點
    boxes = [im.getbbox() for im, _ in frames]
    l = min(b[0] for b in boxes); t = min(b[1] for b in boxes); r = max(b[2] for b in boxes); btm = max(b[3] for b in boxes)
    cw, ch = r - l, btm - t
    ox, oy = frames[0][1]
    rows = (len(frames) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (cw * COLS, ch * rows), (0, 0, 0, 0))
    for i, (im, _) in enumerate(frames):
        sheet.alpha_composite(im.crop((l, t, r, btm)), ((i % COLS) * cw, (i // COLS) * ch))
    path = os.path.join(OUT, key + '.png')
    sheet.save(path, optimize=True)
    idle = [boxes[i] for i in range(actions['idle']['frames'])]
    fit = [max(b[2] for b in idle) - min(b[0] for b in idle), max(b[3] for b in idle) - min(b[1] for b in idle)]
    v = hashlib.md5(open(path, 'rb').read()).hexdigest()[:8]
    return {'cell': [cw, ch], 'anchor': [ox - l, oy - t], 'fit': fit, 'cols': COLS, 'actions': actions, 'spr': None, 'v': v, 'faces': 'left'}


idx = json.load(open(INDEX_JSON, encoding='utf-8'))
for key, name in SRC.items():
    idx[key] = build(key, name)
    print(key, idx[key]['cell'], idx[key]['anchor'])
json.dump(idx, open(INDEX_JSON, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
js = open(INDEX_JS, encoding='utf-8').read()
head = js[:js.index('{')]
tail = js[js.rindex('}') + 1:]
open(INDEX_JS, 'w', encoding='utf-8').write(head + json.dumps(idx, ensure_ascii=False, separators=(',', ':')) + tail)
