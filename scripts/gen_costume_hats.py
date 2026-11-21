"""頭部服飾缺的頭飾圖層（使用者 2026-11-21：用到再載入）。
   清單由 scripts/gen_costumes.js 寫在 scripts/out/costume_hats.json（View → 頭飾檔名）。
   每個 View 輸出：images/paperdoll/costume/hat_<view>_<male|female>.png ＋ js/costume_hats/<view>.js
   （載入後 Object.assign 進 window.PAPERDOLL，跟原本的 hat/<view>/<gender> 圖層同格式）。
   python scripts/gen_costume_hats.py """
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from ro_paperdoll import build_layer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACC = os.path.join(ROOT, 'grf_ex', 'sprite', '악세사리')
OUT_IMG = os.path.join(ROOT, 'images', 'paperdoll', 'costume')
OUT_JS = os.path.join(ROOT, 'js', 'costume_hats')
GENDERS = {'남': 'male', '여': 'female'}

todo = json.load(open(os.path.join(ROOT, 'scripts', 'out', 'costume_hats.json'), encoding='utf-8'))
os.makedirs(OUT_IMG, exist_ok=True)
os.makedirs(OUT_JS, exist_ok=True)
ok = fail = 0
for view, name in todo.items():
    img, clip = {}, {}
    try:
        for gk, g in GENDERS.items():
            base = os.path.join(ACC, gk, gk + name)
            key = f'hat/{view}/{g}'
            fn = f'hat_{view}_{g}.png'
            img[key], clip[key] = build_layer(base + '.spr', base + '.act', os.path.join(OUT_IMG, fn), 'images/paperdoll/costume/' + fn)
    except Exception as e:   # 壞檔就跳過，清單那邊會當作沒有圖
        fail += 1
        print('skip', view, e)
        continue
    js = ('(function (P) { if (!P) return;\n'
          f'  Object.assign(P.img, {json.dumps(img, ensure_ascii=False, separators=(",", ":"))});\n'
          f'  Object.assign(P.clip, {json.dumps(clip, ensure_ascii=False, separators=(",", ":"))});\n'
          f'  (window.COSTUME_HAT_LOADED = window.COSTUME_HAT_LOADED || {{}})[{view}] = 1;\n'
          '})(window.PAPERDOLL);\n')
    open(os.path.join(OUT_JS, f'{view}.js'), 'w', encoding='utf-8').write(js)
    ok += 1
print('converted', ok, 'failed', fail)
