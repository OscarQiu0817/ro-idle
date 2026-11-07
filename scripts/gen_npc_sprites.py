"""城鎮 NPC 外觀圖（images/npc/<sprite>.png）

  python scripts/gen_npc_sprites.py            # js/towns.js 用到的全部
  python scripts/gen_npc_sprites.py 4_m_03 ...  # 指定

來源：grf_ex/sprite/npc/<sprite>.spr／.act。取待機（動作 0）、方向 0（面向畫面）第一格，裁到內容大小；
圖的底邊就是腳底（towns.js 的 NPC 以底邊對齊站位）。
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))
from ro_sprite import read_spr, read_act, render_motion  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
SPR_DIR = os.path.join(ROOT, 'grf_ex', 'sprite', 'npc')
OUT_DIR = os.path.join(ROOT, 'images', 'npc')


def names_in_towns():
    text = open(os.path.join(ROOT, 'js', 'towns.js'), encoding='utf8').read()
    found = set(re.findall(r"'([0-9a-z][0-9a-z_]*)'", text))
    return sorted(n for n in found if os.path.exists(os.path.join(SPR_DIR, n + '.spr')))


def export(name):
    spr = read_spr(os.path.join(SPR_DIR, name + '.spr'))
    acts, _ = read_act(os.path.join(SPR_DIR, name + '.act'))
    if not acts or not acts[0]:
        return '沒有動作'
    im, _ = render_motion(acts[0][0], spr)
    box = im.getbbox()
    if not box:
        return '空白'
    im.crop(box).save(os.path.join(OUT_DIR, name + '.png'), optimize=True)
    return None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    names = sys.argv[1:] or names_in_towns()
    bad = [f'{n}（{why}）' for n in names for why in [export(n)] if why]
    print(f'匯出 {len(names) - len(bad)} 張')
    if bad:
        print('失敗：' + '、'.join(bad))


if __name__ == '__main__':
    main()
