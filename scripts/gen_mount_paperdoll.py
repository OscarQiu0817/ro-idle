"""騎乘（大嘴鳥）紙娃娃圖層：grf_ex 的騎乘身體＋騎乘武器 → images/paperdoll/*_mount_* ＋ js/paperdoll_mount.js
   使用者 2026-11-21：主城租大嘴鳥後整套動畫（站、走、攻擊、受擊、倒下、詠唱）。
   格式跟 js/paperdoll_layers.js 一樣（img：圖集＋每張小圖的矩形；clip：每個動作每格 [錨點x, 錨點y, [圖, x, y, 翻轉, …]]），
   頭、頭飾照身體錨點對齊，所以沿用原本的頭髮與頭飾圖層。
   動作對照（從原本騎士圖層比對出來的 act 編號）：見 ACTIONS。
   python scripts/gen_mount_paperdoll.py """
import json, os, struct, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from ro_sprite import Reader, read_spr
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'grf_ex', 'sprite', '인간족')
OUT_IMG = os.path.join(ROOT, 'images', 'paperdoll')
OUT_JS = os.path.join(ROOT, 'js', 'paperdoll_mount.js')

# 動作名 → (act 編號, 只取第一格)
ACTIONS = {
    'idle': (0, True), 'idle_s': (6, True), 'walk': (8, False), 'walk_s': (14, False),
    'hit': (48, False), 'die': (56, False), 'cast': (32, False), 'ready_s': (38, False),
    'attack': (40, False), 'slash': (80, False), 'atk88': (88, False),
}
# 圖層職業名 → (身體檔名, 武器資料夾／前綴)
MOUNTS = {
    'knight_mount': ('페코페코_기사', '페코페코_기사'),
    'crusader_mount': ('신페코크루세이더', '신페코크루세이더'),
    'lordknight_mount': ('로드페코', '페코페코_기사'),     # 官方領主騎士沿用騎士的騎乘武器
    'paladin_mount': ('페코팔라딘', '신페코크루세이더'),   # 聖殿十字軍沿用十字軍的
}
WEAPONS = {'검': 'sword1', '양손검': 'sword2', '단검': 'dagger', '도끼': 'axe1', '양손도끼': 'axe2', '창': 'spear1', '양손창': 'spear2', '클럽': 'mace'}
GENDERS = {'남': 'male', '여': 'female'}
# 武器圖層用哪個攻擊動作：跟原本騎士同一套
ATK_OF = {'sword1': 'slash', 'sword2': 'slash', 'dagger': 'slash', 'axe1': 'slash', 'axe2': 'slash', 'mace': 'slash', 'spear1': 'atk88', 'spear2': 'atk88'}


def read_act_anchors(path):
    """read_act 的版本，但留下錨點（頭要對齊身體的那個點）"""
    r = Reader(open(path, 'rb').read())
    assert r.bytes(2) == b'AC'
    ver = r.take('H'); n_act = r.take('H'); r.bytes(10)
    acts = []
    for _ in range(n_act):
        mos = []
        for _ in range(r.take('I')):
            r.bytes(32)
            layers = []
            for _ in range(r.take('I')):
                x, y, idx, mirror = r.take('iiii')
                typ = 0
                if ver >= 0x200:
                    r.bytes(4); r.take('f')
                    if ver >= 0x204: r.take('f')
                    _angle, typ = r.take('ii')
                    if ver >= 0x205: r.take('ii')
                layers.append((x, y, idx, mirror, typ))
            if ver >= 0x200: r.take('i')
            anchors = []
            if ver >= 0x203:
                for _ in range(r.take('I')):
                    _u, ax, ay, _a = r.take('iiii'); anchors.append((ax, ay))
            mos.append((layers, anchors))
        acts.append(mos)
    return acts


def build_layer(spr_path, act_path, out_png, rel_src):
    images, rgba = read_spr(spr_path)
    acts = read_act_anchors(act_path)
    used, order = {}, []
    clip = {}
    for name, (ai, first) in ACTIONS.items():
        if ai >= len(acts):
            continue
        frames = acts[ai][:1] if first else acts[ai]
        out = []
        for layers, anchors in frames:
            flat = []
            for x, y, idx, mirror, typ in layers:
                pool = rgba if typ == 1 else images
                if idx < 0 or idx >= len(pool):
                    continue
                key = (typ, idx)
                if key not in used:
                    used[key] = len(order); order.append(pool[idx])
                flat += [used[key], x, y, 1 if mirror else 0]
            ax, ay = anchors[0] if anchors else (0, 0)
            out.append([ax, ay, flat])
        clip[name] = out
    # 圖集：一列排滿 1024 寬就換列，小圖之間留 1px
    rects, x, y, row_h, W = [], 0, 0, 0, 1024
    for im in order:
        if x + im.width > W:
            x, y, row_h = 0, y + row_h + 1, 0
        rects.append([x, y, im.width, im.height])
        x += im.width + 1
        row_h = max(row_h, im.height)
    H = max(1, y + row_h)
    atlas = Image.new('RGBA', (W if order else 1, H), (0, 0, 0, 0))
    for im, r_ in zip(order, rects):
        atlas.alpha_composite(im, (r_[0], r_[1]))
    atlas.save(out_png, optimize=True)
    return {'src': rel_src, 'f': rects}, clip


def main():
    img, clip, atk = {}, {}, {}
    for job, (body, wbase) in MOUNTS.items():
        for gk, g in GENDERS.items():
            sp = os.path.join(SPR, '몸통', gk, f'{body}_{gk}')
            key = f'body/{job}/{g}'
            name = f'body_{job}_{g}.png'
            img[key], clip[key] = build_layer(sp + '.spr', sp + '.act', os.path.join(OUT_IMG, name), 'images/paperdoll/' + name)
            for wk, cat in WEAPONS.items():
                wp = os.path.join(SPR, wbase, f'{wbase}_{gk}_{wk}')
                if not os.path.exists(wp + '.spr'):
                    continue
                key = f'weapon/{job}/{g}/{cat}'
                name = f'weapon_{job}_{g}_{cat}.png'
                img[key], clip[key] = build_layer(wp + '.spr', wp + '.act', os.path.join(OUT_IMG, name), 'images/paperdoll/' + name)
                atk[key] = ATK_OF[cat]
            print(job, g, 'ok')
    js = ('/* 由 scripts/gen_mount_paperdoll.py 產生，不要手改。騎乘（大嘴鳥）身體與武器圖層，接在 paperdoll_layers.js 後面。 */\n'
          '(function (P) {\n  if (!P) return;\n'
          f'  Object.assign(P.img, {json.dumps(img, ensure_ascii=False, separators=(",", ":"))});\n'
          f'  Object.assign(P.clip, {json.dumps(clip, ensure_ascii=False, separators=(",", ":"))});\n'
          f'  Object.assign(P.atk, {json.dumps(atk, ensure_ascii=False, separators=(",", ":"))});\n'
          '})(window.PAPERDOLL);\n')
    open(OUT_JS, 'w', encoding='utf-8').write(js)
    print('wrote', OUT_JS, len(js), 'bytes')


main()
