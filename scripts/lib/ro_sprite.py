"""讀 RO 客戶端的 .spr／.act，把某個動作的某一格畫成 RGBA 圖（Pillow）。

格式參考 roBrowser（Spr.js／Act.js）：
  spr：indexed（2.1 版 RLE：0 後面接連續 0 的個數）＋ RGBA（由下往上、ABGR）；檔尾 256 色調色盤，0 號透明。
  act：動作 → 格（motion）→ 圖層（x, y 是圖中心相對腳底的位移、鏡像、顏色、縮放、旋轉）；檔尾每個動作的間隔（×25ms）。
怪物的動作是 8 方向一組：動作 i、方向 d 的索引＝i × 8 + d。
"""
import struct
from PIL import Image


class Reader:
    def __init__(self, data):
        self.d, self.p = data, 0

    def take(self, fmt):
        v = struct.unpack_from('<' + fmt, self.d, self.p)
        self.p += struct.calcsize('<' + fmt)
        return v if len(v) > 1 else v[0]

    def bytes(self, n):
        b = self.d[self.p:self.p + n]
        self.p += n
        return b


def read_spr(path):
    r = Reader(open(path, 'rb').read())
    assert r.bytes(2) == b'SP'
    minor, major = r.take('B'), r.take('B')
    ver = (major << 8) | minor
    n_idx = r.take('H')
    n_rgba = r.take('H') if ver >= 0x200 else 0
    raw = []
    for _ in range(n_idx):
        w, h = r.take('H'), r.take('H')
        if ver >= 0x201:
            size = r.take('H')
            src, out, i = r.bytes(size), bytearray(), 0
            while i < len(src):
                c = src[i]
                if c == 0:
                    out.extend(b'\0' * src[i + 1])
                    i += 2
                else:
                    out.append(c)
                    i += 1
            raw.append((w, h, bytes(out[:w * h]).ljust(w * h, b'\0')))
        else:
            raw.append((w, h, r.bytes(w * h)))
    rgba = []
    for _ in range(n_rgba):
        w, h = r.take('H'), r.take('H')
        rgba.append((w, h, r.bytes(w * h * 4)))
    pal = r.d[-1024:]
    images = []
    for w, h, px in raw:
        im = Image.frombytes('P', (w, h), px)
        im.putpalette(bytes(b for i in range(256) for b in pal[i * 4:i * 4 + 3]))
        im = im.convert('RGBA')
        alpha = Image.frombytes('L', (w, h), bytes(0 if v == 0 else 255 for v in px))
        im.putalpha(alpha)
        images.append(im)
    rgba_images = []
    for w, h, px in rgba:
        out = bytearray(w * h * 4)
        for y in range(h):
            for x in range(w):
                s = ((h - y - 1) * w + x) * 4
                d = (y * w + x) * 4
                out[d:d + 4] = bytes((px[s + 3], px[s + 2], px[s + 1], px[s]))
        rgba_images.append(Image.frombytes('RGBA', (w, h), bytes(out)))
    return images, rgba_images


def read_act(path):
    r = Reader(open(path, 'rb').read())
    assert r.bytes(2) == b'AC'
    ver = r.take('H')
    n_act = r.take('H')
    r.bytes(10)
    actions = []
    for _ in range(n_act):
        motions = []
        for _ in range(r.take('I')):
            r.bytes(32)
            layers = []
            for _ in range(r.take('I')):
                x, y, idx, mirror = r.take('iiii')
                color, sx, sy, angle, typ = (255, 255, 255, 255), 1.0, 1.0, 0, 0
                if ver >= 0x200:
                    color = tuple(r.bytes(4))
                    sx = r.take('f')
                    sy = r.take('f') if ver >= 0x204 else sx
                    angle, typ = r.take('ii')
                    if ver >= 0x205:
                        r.take('ii')
                layers.append(dict(x=x, y=y, idx=idx, mirror=mirror, color=color, sx=sx, sy=sy, angle=angle, typ=typ))
            if ver >= 0x200:
                r.take('i')
            if ver >= 0x203:
                for _ in range(r.take('I')):
                    r.bytes(16)
            motions.append(layers)
        actions.append(motions)
    delays = [4.0] * n_act
    try:
        if ver >= 0x201:
            for _ in range(r.take('I')):
                r.bytes(40)
        if ver >= 0x202:
            delays = [r.take('f') for _ in range(n_act)]
    except struct.error:
        pass
    return actions, delays


def render_motion(layers, spr, canvas=512):
    """畫一格。回傳 (圖, 原點座標)：原點在畫布中央，之後再依內容裁切"""
    images, rgba_images = spr
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    ox = oy = canvas // 2
    for L in layers:
        if L['idx'] < 0:
            continue
        pool = rgba_images if L['typ'] == 1 else images
        if L['idx'] >= len(pool):
            continue
        im = pool[L['idx']]
        if L['color'] != (255, 255, 255, 255):
            r_, g_, b_, a_ = L['color']
            px = im.split()
            im = Image.merge('RGBA', [p.point(lambda v, k=k: v * k // 255) for p, k in zip(px, (r_, g_, b_, a_))])
        w, h = max(1, round(im.width * abs(L['sx']))), max(1, round(im.height * abs(L['sy'])))
        if (w, h) != im.size:
            im = im.resize((w, h), Image.NEAREST)
        if L['mirror']:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if L['angle']:
            im = im.rotate(-L['angle'], expand=True, resample=Image.NEAREST)
        out.alpha_composite(im, (ox + L['x'] - im.width // 2, oy + L['y'] - im.height // 2))
    return out, (ox, oy)
