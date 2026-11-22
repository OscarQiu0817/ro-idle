"""披肩服飾圖層（使用者 2026-11-22：披肩服飾也做轉蛋）。
   清單由 scripts/gen_costumes.js 寫在 scripts/out/costume_robes.json（grf_ex/sprite/로브 的資料夾名）。
   同一件披肩各職業的 .spr 幾乎都一樣、只有 .act 不同：同一份 spr 只轉一張圖集，各職業各自一份 clip。
   輸出 images/paperdoll/costume/robe_<資料夾>_<male|female>[_n].png ＋ js/costume_robes/<資料夾>.js
   （載入後寫進 window.PAPERDOLL：img／clip 的 key 都是 robe/<資料夾>/<職業>/<性別>）。
   錨點：披肩的 act 沒有錨點時座標就是身體原點（paperdollAlign 照武器那條處理）。
   python scripts/gen_costume_robes.py [資料夾…] """
import hashlib, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from ro_sprite import read_spr
from ro_paperdoll import read_act_anchors, ACTIONS
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROBE = os.path.join(ROOT, 'grf_ex', 'sprite', '로브')
OUT_IMG = os.path.join(ROOT, 'images', 'paperdoll', 'costume')
OUT_JS = os.path.join(ROOT, 'js', 'costume_robes')
GENDERS = {'남': 'male', '여': 'female'}
# 紙娃娃職業 key → 韓文檔名（女性另有的寫在 JOB_KR_F）
JOB_KR = {
    'novice': '초보자', 'swordsman': '검사', 'mage': '마법사', 'archer': '궁수', 'acolyte': '성직자', 'merchant': '상인', 'thief': '도둑',
    'knight': '기사', 'priest': '프리스트', 'wizard': '위저드', 'blacksmith': '제철공', 'hunter': '헌터', 'assassin': '어세신',
    'crusader': '크루세이더', 'monk': '몽크', 'sage': '세이지', 'rogue': '로그', 'alchemist': '연금술사', 'bard': '바드',
    'lordknight': '로드나이트', 'highpriest': '하이프리', 'highwizard': '하이위저드', 'whitesmith': '화이트스미스', 'sniper': '스나이퍼',
    'assassincross': '어쌔신크로스', 'paladin': '팔라딘', 'champion': '챔피온', 'professor': '프로페서', 'stalker': '스토커',
    'creator': '크리에이터', 'clown': '클라운', 'runeknight': '룬나이트', 'warlock': '워록', 'ranger': '레인져', 'archbishop': '아크비숍',
    'mechanic': '미케닉', 'guillotinecross': '길로틴크로스', 'royalguard': '가드', 'sorcerer': '소서러', 'minstrel': '민스트럴',
    'sura': '슈라', 'geneticist': '제네릭', 'shadowchaser': '쉐도우체이서',
    'dancer': '무희', 'gypsy': '집시', 'wanderer': '원더러',
    'knight_mount': '페코페코_기사', 'crusader_mount': '신페코크루세이더', 'lordknight_mount': '로드페코', 'paladin_mount': '페코팔라딘',
}
JOB_KR_F = {'bard': '무희', 'clown': '집시', 'minstrel': '원더러'}


def atlas(order, out_png):
    rects, x, y, row_h, W = [], 0, 0, 0, 1024
    for im in order:
        if x + im.width > W:
            x, y, row_h = 0, y + row_h + 1, 0
        rects.append([x, y, im.width, im.height])
        x += im.width + 1
        row_h = max(row_h, im.height)
    img = Image.new('RGBA', (W if order else 1, max(1, y + row_h)), (0, 0, 0, 0))
    for im, r_ in zip(order, rects):
        img.alpha_composite(im, (r_[0], r_[1]))
    img.save(out_png, optimize=True)
    return rects


def convert(folder):
    imgs, clips = {}, {}   # 圖集 key → meta；職業 key → (圖集 key, clip)
    for gk, g in GENDERS.items():
        groups = {}   # spr md5 → { spr, used:{(typ,idx):i}, order:[], jobs:{job: clip} }
        for job, kr in JOB_KR.items():
            name = JOB_KR_F.get(job, kr) if g == 'female' else kr
            base = os.path.join(ROBE, folder, gk, f'{name}_{gk}')
            if not os.path.exists(base + '.act'):
                continue
            # 新一點的披肩只有一份共用 spr 放在資料夾根目錄（<資料夾>.spr），各職業只有 act
            spr = base + '.spr' if os.path.exists(base + '.spr') else os.path.join(ROBE, folder, folder + '.spr')
            if not os.path.exists(spr):
                continue
            h = hashlib.md5(open(spr, 'rb').read()).hexdigest()
            grp = groups.get(h)
            if not grp:
                ims, rgba = read_spr(spr)
                grp = groups[h] = {'ims': ims, 'rgba': rgba, 'used': {}, 'order': [], 'jobs': {}}
            acts = read_act_anchors(base + '.act')
            clip = {}
            for an, (ai, first) in list(ACTIONS.items()) + [('idle_n', (4, True)), ('walk_n', (12, False))]:   # 朝上（背面）
                if ai >= len(acts):
                    continue
                out = []
                for layers, anchors in (acts[ai][:1] if first else acts[ai]):
                    flat = []
                    for x, y, idx, mirror, typ in layers:
                        pool = grp['rgba'] if typ == 1 else grp['ims']
                        if idx < 0 or idx >= len(pool):
                            continue
                        k = (typ, idx)
                        if k not in grp['used']:
                            grp['used'][k] = len(grp['order']); grp['order'].append(pool[idx])
                        flat += [grp['used'][k], x, y, 1 if mirror else 0]
                    ax, ay = anchors[0] if anchors else (0, 0)
                    out.append([ax, ay, flat])
                clip[an] = out
            grp['jobs'][job] = clip
        for n, grp in enumerate(sorted(groups.values(), key=lambda x: -len(x['jobs']))):
            fn = f'robe_{folder}_{g}' + (f'_{n}' if n else '') + '.png'
            akey = fn[:-4]
            imgs[akey] = {'src': 'images/paperdoll/costume/' + fn, 'f': atlas(grp['order'], os.path.join(OUT_IMG, fn))}
            for job, clip in grp['jobs'].items():
                north = {k: clip.pop(k) for k in ('idle_n', 'walk_n') if k in clip}
                clips[f'robe/{folder}/{job}/{g}'] = [akey, clip]
                if len(north) == 2:
                    clips[f'n/robe/{folder}/{job}/{g}'] = [akey, north]
    if not clips:
        return False
    js = ('(function (P) { if (!P) return;\n'
          f'  const A = {json.dumps(imgs, ensure_ascii=False, separators=(",", ":"))};\n'
          f'  const C = {json.dumps(clips, ensure_ascii=False, separators=(",", ":"))};\n'
          '  for (const k in C) { P.img[k] = A[C[k][0]]; P.clip[k] = C[k][1]; }\n'
          f'  (window.COSTUME_ROBE_LOADED = window.COSTUME_ROBE_LOADED || {{}})[{json.dumps(folder)}] = 1;\n'
          '})(window.PAPERDOLL);\n')
    open(os.path.join(OUT_JS, f'{folder}.js'), 'w', encoding='utf-8').write(js)
    return True


def main():
    todo = sys.argv[1:] or json.load(open(os.path.join(ROOT, 'scripts', 'out', 'costume_robes.json'), encoding='utf-8'))
    os.makedirs(OUT_IMG, exist_ok=True)
    os.makedirs(OUT_JS, exist_ok=True)
    ok = fail = 0
    for i, folder in enumerate(todo):
        try:
            if convert(folder):
                ok += 1
            else:
                fail += 1; print('empty', folder)
        except Exception as e:   # 壞檔就跳過
            fail += 1
            print('skip', folder, e)
        print(f'{i + 1}/{len(todo)} {folder}', flush=True)
    print('converted', ok, 'failed', fail)


if __name__ == '__main__':
    main()
