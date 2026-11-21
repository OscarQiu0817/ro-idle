"""RO 圖檔（spr／act）→ 紙娃娃圖層（js/paperdoll_layers.js 的格式）。
   img：圖集＋每張小圖的矩形；clip：每個動作每格 [錨點x, 錨點y, [圖, x, y, 翻轉, …]]。
   動作對照是從原本騎士身體圖層比對出來的 act 編號，身體、頭飾、武器都適用。 """
import os
from ro_sprite import Reader, read_spr
from PIL import Image

# 動作名 → (act 編號, 只取第一格)
ACTIONS = {
    'idle': (0, True), 'idle_s': (6, True), 'walk': (8, False), 'walk_s': (14, False),
    'hit': (48, False), 'die': (56, False), 'cast': (32, False), 'ready_s': (38, False),
    'attack': (40, False), 'slash': (80, False), 'atk88': (88, False),
}
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


