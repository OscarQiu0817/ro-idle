"""技能特效離線轉檔（T24，使用者 2026-11-14：火箭術／冰箭術／雷擊術／火球術先做樣品）

  python scripts/gen_skill_fx.py
    → images/effects/skill/<名稱>/000.png …（透明底 PNG 動畫格）
    → js/skill_fx_data.js（SKILL_FX_ANIM：每組的格數、每格毫秒、畫布大小、錨點）

素材：grf_ex/effect（= data\\texture\\effect，.str 與貼圖）、grf_ex/sprite/이팩트（特效 .spr／.act）。
規則照 roBrowser（Str.js／StrEffect.js／BoltRain.js／EffectTable.js）：
  .str：STRM 0x94，逐圖層關鍵格；type 0＝基準格、type 1＝變化量，morph＝基準＋變化量×經過格數；
        四角 xy 畫成四邊形，混色 srcalpha／destalpha（5,2＝加亮；5,6＝一般）。
  發光圖層先畫在黑底上（加法混色），最後轉成「亮度＝透明度」的 RGBA，網頁用一般疊圖就接近官方加亮效果。
  火箭／冰箭（BoltRain）：單支箭從斜上方以 2.75 單位／tick（60 tick／秒）落下，落地後 5 tick 全亮、20 tick 淡出，
        落點開一圈 ring_yellow／ring_blue；這裡預畫「一支箭」的序列，網頁依技能等級每 10 tick 放一支。
純 Pillow，不需要 numpy。
"""
import json
import math
import os
import struct
import sys

from PIL import Image, ImageChops, ImageMath

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'lib'))
from ro_sprite import read_spr, read_act, render_motion  # noqa: E402

TEX = os.path.join(ROOT, 'grf_ex', 'effect')
SPR = os.path.join(ROOT, 'grf_ex', 'sprite', '이팩트')
OUT = os.path.join(ROOT, 'images', 'effects', 'skill')
OUT_JS = os.path.join(ROOT, 'js', 'skill_fx_data.js')
FRAME_MS = 33          # 輸出約 30fps（手調的四招）
# 整批轉的其他技能：省容量（使用者 2026-11-14 要求先縮小再擴充）——15fps、最多 30 格、0.4 倍、品質 72
BATCH_FRAME_MS, BATCH_MAX_FRAMES, BATCH_SCALE, BATCH_QUALITY = 66, 30, 0.4, 72
_tex_cache = {}


def load_tex(name):
    name = name.replace('\\', '/').split('/')[-1]
    if name in _tex_cache:
        return _tex_cache[name]
    path = os.path.join(TEX, name)
    if not os.path.exists(path):
        alt = [f for f in os.listdir(TEX) if f.lower() == name.lower()]
        path = os.path.join(TEX, alt[0]) if alt else None
    if not path:
        _tex_cache[name] = None
        return None
    im = Image.open(path).convert('RGBA')
    if path.lower().endswith('.bmp'):   # RO 的 bmp 用洋紅色當透明
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if r > 250 and g < 5 and b > 250:
                    px[x, y] = (0, 0, 0, 0)
    _tex_cache[name] = im
    return im


# ---------- 四邊形貼圖（透視變換，純 Python 解 8 元一次方程） ----------
def solve(A, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-12:
            return None
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]


def perspective_coeffs(dst, src):
    """PIL PERSPECTIVE 要的是「輸出座標 → 輸入座標」，所以 dst 是畫布上的四角、src 是貼圖四角"""
    A, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return solve(A, b)


def draw_quad(canvas, tex, corners, color, additive):
    """canvas：黑底 RGB；corners：v0,v1,v2,v3（貼圖左上、右上、左下、右下）"""
    W, H = canvas.size
    c = perspective_coeffs(corners, [(0, 0), (tex.width, 0), (0, tex.height), (tex.width, tex.height)])
    if not c:
        return
    warped = tex.transform((W, H), Image.PERSPECTIVE, c, Image.BILINEAR)
    r, g, b, a = warped.split()
    cr, cg, cb, ca = color
    r = r.point(lambda v: int(v * cr)); g = g.point(lambda v: int(v * cg)); b = b.point(lambda v: int(v * cb))
    a = a.point(lambda v: int(v * ca))
    rgb = Image.merge('RGB', (r, g, b))
    if additive:
        prem = Image.composite(rgb, Image.new('RGB', (W, H)), a)   # rgb×a
        canvas.paste(ImageChops.add(canvas, prem))
    else:
        canvas.paste(Image.composite(rgb, canvas, a))


def draw_ring(canvas, tex, cx, cy, r, width, color, seg=24, squash=0.5):
    """地面光圈（roBrowser prim ring）：貼圖是一條環帶，沿圓周分段貼，上緣在外、下緣在內；地面視角壓扁成橢圓"""
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        u0, u1 = int(tex.width * i / seg), max(int(tex.width * i / seg) + 1, int(tex.width * (i + 1) / seg))
        part = tex.crop((u0, 0, u1, tex.height))
        pt = lambda a, rr: (cx + math.cos(a) * rr, cy + math.sin(a) * rr * squash)
        draw_quad(canvas, part, [pt(a0, r + width), pt(a1, r + width), pt(a0, r), pt(a1, r)], color, True)


def to_rgba(canvas):
    """黑底加亮圖 → 透明底：alpha＝最亮的通道，顏色除回 alpha"""
    r, g, b = canvas.split()
    a = ImageChops.lighter(ImageChops.lighter(r, g), b)
    f = lambda A: A['convert'](A['min'](A['c'] * 255 / (A['a'] + (A['a'] == 0)), 255), 'L')
    chans = [ImageMath.lambda_eval(f, c=ch, a=a) for ch in (r, g, b)]
    return Image.merge('RGBA', chans + [a])


def crop_frames(frames, anchor):
    """所有格共用一個裁切框（動畫才不會跳），回傳 (frames, 新錨點)"""
    box = None
    for f in frames:
        bb = f.getbbox()
        if bb:
            box = bb if not box else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
    if not box:
        return frames, anchor
    return [f.crop(box) for f in frames], (anchor[0] - box[0], anchor[1] - box[1])


# 顯示縮放（官方特效照 RO 畫面像素畫，本作角色較小）：在這裡先縮好再存，網頁照原大小播，不浪費像素
SCALE = {'firehit': 0.42, 'windhit': 0.5, 'lightning': 0.75, 'firebolt': 0.8, 'coldbolt': 0.8, 'fireball': 0.9}
DEFAULT_SCALE = 0.5


def scale_of(name):
    for k, v in SCALE.items():
        if name.startswith(k):
            return v
    return DEFAULT_SCALE


def save(name, frames, anchor, frame_ms, meta, scale=None, quality=82):
    """一招一張 WebP 合圖（格狀排列），meta 記格數、每格大小、欄數、錨點"""
    while len(frames) > 1 and not frames[0].getbbox():   # 開頭的空白格（官方延遲）去掉，施放當下就出現
        frames = frames[1:]
    while len(frames) > 1 and not frames[-1].getbbox():
        frames = frames[:-1]
    frames, anchor = crop_frames(frames, anchor)
    sc = scale if scale is not None else scale_of(name)
    if sc != 1:
        w, h = max(1, round(frames[0].width * sc)), max(1, round(frames[0].height * sc))
        frames = [f.resize((w, h), Image.LANCZOS) for f in frames]
        anchor = (anchor[0] * sc, anchor[1] * sc)
    n, fw, fh = len(frames), frames[0].width, frames[0].height
    cols = max(1, min(n, math.ceil(math.sqrt(n * fh / max(1, fw)))))
    rows = math.ceil(n / cols)
    sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, ((i % cols) * fw, (i // cols) * fh))
    os.makedirs(OUT, exist_ok=True)
    old = os.path.join(OUT, name)
    if os.path.isdir(old):                                   # 舊版逐格 PNG 資料夾
        for f in os.listdir(old):
            os.remove(os.path.join(old, f))
        os.rmdir(old)
    sheet.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=quality, method=6, alpha_quality=quality)
    meta[name] = {'n': n, 'ms': frame_ms, 'w': fw, 'h': fh, 'cols': cols, 'ax': round(anchor[0], 1), 'ay': round(anchor[1], 1)}
    print(name, n, '格', (fw, fh), os.path.getsize(os.path.join(OUT, name + '.webp')) // 1024, 'KB')


# ---------- .str ----------
def read_str(path):
    d = open(path, 'rb').read()
    p = 0

    def take(fmt):
        nonlocal p
        v = struct.unpack_from('<' + fmt, d, p)
        p += struct.calcsize('<' + fmt)
        return v

    assert d[:4] == b'STRM'
    p = 4
    ver, fps, max_key, nlayer = take('IIII')
    p += 16
    layers = []
    for _ in range(nlayer):
        (ntex,) = take('i')
        texs = []
        for _ in range(ntex):
            raw = d[p:p + 128]; p += 128
            texs.append(raw.split(b'\0')[0].decode('cp949', 'ignore'))
        (nkey,) = take('i')
        keys = []
        for _ in range(nkey):
            frame, typ = take('iI')
            pos = take('2f'); uv = take('8f'); xy = take('8f')
            (aniframe,) = take('f'); (anitype,) = take('I'); (delay,) = take('f'); (angle,) = take('f')
            color = take('4f'); src, dst, mt = take('III')
            keys.append(dict(frame=frame, type=typ, pos=pos, xy=xy, aniframe=aniframe, anitype=anitype, delay=delay,
                             angle=angle / (1024 / 360), color=[c / 255 for c in color], src=src, dst=dst))
        layers.append(dict(texs=texs, keys=keys))
    return fps, max_key, layers


def str_key_at(layer, k):
    keys = layer['keys']
    fi = ti = -1
    for i, key in enumerate(keys):
        if key['frame'] <= k:
            if key['type'] == 0:
                fi = i
            elif key['type'] == 1:
                ti = i
    if fi < 0:
        return None
    f = keys[fi]
    # 最後一個基準格之後沒有新的基準格、也已經過了最後一格 → 圖層結束
    last = max(key['frame'] for key in keys)
    if k > last and not (ti == fi + 1 and keys[ti]['frame'] == f['frame']):
        return None
    if ti != fi + 1 or keys[ti]['frame'] != f['frame']:
        return dict(f)
    t = keys[ti]
    dlt = k - f['frame']
    out = dict(f)
    out['pos'] = [f['pos'][i] + t['pos'][i] * dlt for i in range(2)]
    out['xy'] = [f['xy'][i] + t['xy'][i] * dlt for i in range(8)]
    out['angle'] = f['angle'] + t['angle'] * dlt
    out['color'] = [f['color'][i] + t['color'][i] * dlt for i in range(4)]
    n = max(1, len(layer['texs']))
    if t['anitype'] == 1:
        out['aniframe'] = f['aniframe'] + t['aniframe'] * dlt
    elif t['anitype'] == 2:
        out['aniframe'] = min(f['aniframe'] + t['delay'] * dlt, n - 1)
    elif t['anitype'] == 3:
        out['aniframe'] = (f['aniframe'] + t['delay'] * dlt) % n
    elif t['anitype'] == 4:
        out['aniframe'] = (f['aniframe'] - t['delay'] * dlt) % n
    else:
        out['aniframe'] = 0
    return out


def render_str(name, meta, size=400, scale=1.0, out_name=None, max_frames=60, frame_ms=FRAME_MS):
    fps, max_key, layers = read_str(os.path.join(TEX, name + '.str'))
    frames = []
    step = fps * frame_ms / 1000
    k = 0.0
    while k < max_key:
        canvas = Image.new('RGB', (size, size))
        ki = int(k)
        for L in layers:
            key = str_key_at(L, ki)
            if not key or not L['texs']:
                continue
            tex = load_tex(L['texs'][min(len(L['texs']) - 1, max(0, int(key['aniframe'])))])
            if tex is None:
                continue
            col = [max(0.0, min(1.0, c)) for c in key['color']]
            if col[3] <= 0.004:
                continue
            cx, cy = size / 2 + (key['pos'][0] - 320) * scale, size / 2 + (key['pos'][1] - 320) * scale
            xs, ys = key['xy'][0:4], key['xy'][4:8]
            a = math.radians(key['angle'])
            ca, sa = math.cos(a), math.sin(a)
            pts = []
            for x, y in zip(xs, ys):
                x, y = x * scale, y * scale
                pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
            # strip 順序 v0=(xy0,xy4) v1=(xy1,xy5) v2=(xy3,xy7) v3=(xy2,xy6)
            corners = [pts[0], pts[1], pts[3], pts[2]]
            draw_quad(canvas, tex, corners, col, key['dst'] == 2)
        frames.append(to_rgba(canvas))
        k += step
        if len(frames) >= max_frames:
            break
    save(out_name or name, frames, (size // 2, size // 2), frame_ms, meta, scale=None if out_name is None else BATCH_SCALE,
         quality=82 if out_name is None else BATCH_QUALITY)


# ---------- .str 即時畫（使用者 2026-11-14：.str 全改 WebGL 即時畫，js/str_player.js 播） ----------
STR_OUT = os.path.join(ROOT, 'images', 'effects', 'str')
TEX_OUT = os.path.join(ROOT, 'images', 'effects', 'tex')
_tex_written = {}


def str_additive(key):
    """混色 dst 2（ONE）、7（DESTALPHA，不透明畫面上＝1）、0 都是加亮"""
    return key['dst'] in (2, 7, 0)


def tex_png(t):
    """貼圖輸出成共用 WebP；韓文或含 # 等符號的檔名換成 ASCII（k_ + utf-8 十六進位前 12 碼）"""
    import hashlib
    base = os.path.splitext(t.replace('\\', '/').split('/')[-1])[0].lower()
    if base in _tex_written:
        return _tex_written[base]
    png = (base if all(c.isascii() and (c.isalnum() or c in '_-') for c in base) else 'k_' + hashlib.md5(base.encode('utf-8')).hexdigest()[:12]) + '.webp'
    im = load_tex(t)
    if im is None:
        _tex_written[base] = None
        return None
    os.makedirs(TEX_OUT, exist_ok=True)
    im.save(os.path.join(TEX_OUT, png), 'WEBP', quality=90, alpha_quality=90, method=6)   # 有損 q90：大小約 PNG 的 1/5，縮小加亮後看不出差別
    _tex_written[base] = png
    return png


def _num(v, nd):
    v = round(v, nd)
    return int(v) if v == int(v) else v


def export_str(file):
    """關鍵格 → images/effects/str/<file>.js；回傳 (k0, k1, fps)：看得到的第一格與最後一格之後"""
    fps, max_key, layers = read_str(os.path.join(TEX, file + '.str'))
    out_layers, kept = [], []
    for L in layers:
        if not L['keys'] or not L['texs']:
            continue
        names = [tex_png(t) for t in L['texs']]
        if not any(names):
            continue
        names = [n or next(x for x in names if x) for n in names]
        keys = [[k['frame'], k['type'], _num(k['pos'][0], 2), _num(k['pos'][1], 2)] + [_num(v, 2) for v in k['xy']]
                + [_num(k['aniframe'], 3), k['anitype'], _num(k['delay'], 3), _num(k['angle'], 2)]
                + [_num(c, 4) for c in k['color']] + [1 if str_additive(k) else 0] for k in L['keys']]
        out_layers.append({'tex': names, 'keys': keys})
        kept.append(L)
    k0, k1 = None, 0
    for k in range(max_key):
        for L in kept:
            key = str_key_at(L, k)
            if key and key['color'][3] > 0.004:
                k0 = k if k0 is None else k0
                k1 = k + 1
                break
    k0 = k0 or 0
    k1 = k1 or max_key
    os.makedirs(STR_OUT, exist_ok=True)
    with open(os.path.join(STR_OUT, file + '.js'), 'w', encoding='utf-8') as f:
        f.write('(window.STR_DATA=window.STR_DATA||{})["%s"]=' % file
                + json.dumps({'fps': fps, 'maxKey': max_key, 'k0': k0, 'k1': k1, 'layers': out_layers}, separators=(',', ':')) + ';\n')
    return k0, k1, fps


def str_meta(file, scale):
    """SKILL_FX_ANIM 的即時畫項目：str 檔名、sc 縮放；n＝1、ms＝整段毫秒（重播次數照這個算）"""
    k0, k1, fps = export_str(file)
    return {'str': file, 'sc': scale, 'n': 1, 'ms': max(1, round((k1 - k0) * 1000 / fps))}


# ---------- 精靈圖（.spr／.act 動作 0） ----------
def render_spr(name, meta, action=0, out_name=None):
    spr = read_spr(os.path.join(SPR, name + '.spr'))
    acts, delays = read_act(os.path.join(SPR, name + '.act'))
    frames = [render_motion(m, spr, canvas=256)[0] for m in acts[action]][:60]
    save(out_name or name, frames, (128, 128), max(16, int(delays[action] * 25)), meta, scale=None if out_name is None else 0.6,
         quality=82 if out_name is None else BATCH_QUALITY)


def render_tex(file, out_name, meta):
    im = load_tex(file)
    if im is None:
        return
    im = im.copy()
    if im.getchannel('A').getextrema()[0] == 255:   # 沒有透明度的貼圖官方用加亮疊：黑底→透明（亮度＝透明度）
        im = to_rgba(im.convert('RGB'))
    im.thumbnail((64, 64), Image.LANCZOS)
    save(out_name, [im], (im.width / 2, im.height / 2), 100, meta, scale=1.0)


# ---------- 火箭／冰箭：單支箭落下（BoltRain） ----------
def render_bolt(kind, meta):
    U = 2.2                                   # 1 世界單位 ≈ 2.2px（角色約 88px 高）
    if kind == 'fire':
        texs = [load_tex('불화살%d.tga' % i) for i in range(1, 7)]
        L, Wd, ring = 14, 3.5, load_tex('ring_yellow.tga')
    else:
        texs = [load_tex('icearrow.tga')]
        L, Wd, ring = 11.5, 3.8, load_tex('ring_blue.tga')
    sx, up = 30, 60                           # 起點：往右上（BoltRain 是 x 25~35、高 60）
    dist = math.hypot(sx, up)
    flight = math.ceil(dist / 2.75)
    size = 300
    gx, gy = 150, 230                         # 落點（畫布座標）
    frames = []
    life = flight + 25
    t = 0.0
    while t < life + 30:
        canvas = Image.new('RGB', (size, size))
        ti = int(t)
        if ti <= life:
            prog = min(1.0, ti / flight)
            hx, hy = gx + sx * U * (1 - prog), gy - up * U * 0.75 * (1 - prog)
            alpha = 1.0 if ti <= flight + 5 else max(0.0, 1 - (ti - flight - 5) / 20)
            ang = math.atan2(up * U * 0.75, -sx * U)        # 箭頭朝落點
            dx, dy = math.cos(ang), math.sin(ang)
            nx, ny = -dy, dx
            tail = (hx - dx * 2 * L * U, hy - dy * 2 * L * U)
            w = Wd * U
            # 貼圖 U：尾 0 → 頭 1；V：-W 側 1、+W 側 0
            corners = [(tail[0] + nx * w, tail[1] + ny * w), (hx + nx * w, hy + ny * w),
                       (tail[0] - nx * w, tail[1] - ny * w), (hx - nx * w, hy - ny * w)]
            tex = texs[ti % len(texs)]
            draw_quad(canvas, tex, corners, (1, 1, 1, alpha), True)
        rt = t - flight
        if 0 <= rt < 30:                       # 落點光圈：半徑擴張、淡入再淡出
            rad = (1.2 * rt + 0.5 * (-2 * 1.2 / 70) * rt * rt) * U * 1.1
            ra = min(1.0, rt * 25.4 / 255) * (1.0 if rt < 20 else max(0, 1 - (rt - 20) / 10))
            draw_ring(canvas, ring, gx, gy, max(1, rad), 10 * U, (1, 1, 1, ra))
        frames.append(to_rgba(canvas))
        t += 60 * FRAME_MS / 1000
    save(kind + 'bolt', frames, (gx, gy), FRAME_MS, meta)


def main():
    import json
    import re
    meta = {}
    HAND_STR = ['firehit1', 'firehit2', 'firehit3', 'windhit1', 'windhit2', 'windhit3', 'lightning']
    if '--js-only' in sys.argv or '--str' in sys.argv:
        # --js-only：只依新的計畫重寫 js/skill_fx_data.js，動畫格沿用現有的（不重畫）
        # --str：合圖沿用，.str 類重新輸出關鍵格（舊的 .str 合圖刪掉）
        m = re.search(r'const SKILL_FX_ANIM = (.*?);\r?\n', open(OUT_JS, encoding='utf-8').read())
        meta = json.loads(m.group(1))
        if '--str' in sys.argv:
            for n in list(meta):
                if n in HAND_STR or n.startswith('str_'):
                    old = os.path.join(OUT, n + '.webp')
                    if os.path.exists(old):
                        os.remove(old)
                    del meta[n]
            for n in HAND_STR:
                meta[n] = str_meta(n, scale_of(n))
    if not meta:
        for n in HAND_STR:
            meta[n] = str_meta(n, scale_of(n))
        render_spr('fireball', meta)
        render_bolt('fire', meta)
        render_bolt('cold', meta)
    # 照 scripts/gen_skill_fx_plan.js 產生的計畫整批轉（其他技能）
    plan_path = os.path.join(ROOT, 'scripts', 'out', 'skill_fx_plan.json')
    plan = {}
    if os.path.exists(plan_path):
        P = json.load(open(plan_path, encoding='utf-8'))
        for n, sh in P['sheets'].items():
            if n in meta:
                continue
            try:
                if sh['kind'] == 'str':
                    meta[n] = str_meta(sh['file'], BATCH_SCALE)
                elif sh['kind'] == 'spr':
                    render_spr(sh['file'], meta, out_name=n)
                else:
                    render_tex(sh['file'], n, meta)
            except Exception as e:   # 單一素材壞掉不擋整批
                print('略過', n, e)
        plan = {sk: [L for L in lst if all(f in meta for f in L['fx'])] for sk, lst in P['plan'].items()}
        plan = {sk: lst for sk, lst in plan.items() if lst}
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* 由 scripts/gen_skill_fx.py 產生，勿手改。一招一張合圖 images/effects/skill/<名稱>.webp（格狀排列）。\n'
                '   n 格數、ms 每格毫秒、w/h 每格大小（已是顯示大小）、cols 欄數、ax/ay 錨點（貼在目標的那一點）。\n'
                '   有 str 的是官方 .str 即時畫（js/str_player.js）：str 關鍵格檔名、sc 縮放、ms 整段毫秒。 */\n'
                'const SKILL_FX_ANIM = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
                '/* 各技能的特效圖層（roBrowser 官方定義轉來）：at 播在 caster／target／ground；play anim 整段播、particle 光點 */\n'
                'const SKILL_FX_PLAN = ' + json.dumps(plan, ensure_ascii=False) + ';\n')
    print('寫入', OUT_JS)


if __name__ == '__main__':
    main()
