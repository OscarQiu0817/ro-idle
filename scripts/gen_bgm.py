"""地圖背景音樂（使用者 2026-11-17）：照官方 data\\mp3nametable.txt 的「地圖 → BGM」對照，
把用得到的曲目從 grf_ex/BGM 轉成 OGG 放 music/bgm/<編號>.ogg，對照表輸出 js/bgm_table.js。

  python scripts/gen_bgm.py          只做城鎮（town: true）
  python scripts/gen_bgm.py --all    遊戲裡全部地圖

需要 ffmpeg（在 PATH 上）。同一首曲目的地圖共用一個檔案；沒轉的曲目不寫進對照表（那張圖就安靜）。
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'grf_ex', 'BGM')
TABLE = os.path.join(ROOT, 'grf_ex', 'mp3nametable.txt')
OUT_DIR = os.path.join(ROOT, 'music', 'bgm')
OUT_JS = os.path.join(ROOT, 'js', 'bgm_table.js')


def load_table():
    # 一行一筆：prontera.rsw#bgm\\08.mp3#；註解是韓文（cp949），只取 ASCII 部分
    out = {}
    with open(TABLE, encoding='latin1') as f:
        for ln in f:
            m = re.match(r'\s*([A-Za-z0-9_@\-]+)\.rsw#bgm\\\\(\w+)\.mp3#', ln, re.I)
            if m:
                out[m.group(1).lower()] = m.group(2)
    return out


def load_maps():
    src = open(os.path.join(ROOT, 'js', 'world_data.js'), encoding='utf-8').read()
    return json.loads(re.search(r'const WORLD_MAPS = (\[.*?\]);', src, re.S).group(1))


def main():
    every = '--all' in sys.argv
    table = load_table()
    maps = [m for m in load_maps() if every or m.get('town')]
    pick = {m['id']: table[m['id'].lower()] for m in maps if m['id'].lower() in table}
    tracks = sorted(set(pick.values()))
    os.makedirs(OUT_DIR, exist_ok=True)
    total_in = total_out = 0
    ok = set()
    for t in tracks:
        src = os.path.join(SRC, t + '.mp3')
        dst = os.path.join(OUT_DIR, t + '.ogg')
        if not os.path.exists(src):
            print('缺', t)
            continue
        if not os.path.exists(dst):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-c:a', 'libvorbis', '-q:a', '0', dst], check=True)
        total_in += os.path.getsize(src)
        total_out += os.path.getsize(dst)
        ok.add(t)
    # 已經轉好的檔（先前跑過 --all）也照收，免得只跑城鎮時把野外的對照拿掉
    have = {f[:-4] for f in os.listdir(OUT_DIR) if f.endswith('.ogg')}
    full = {m['id']: table[m['id'].lower()] for m in load_maps() if m['id'].lower() in table and table[m['id'].lower()] in have}
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('/* 由 scripts/gen_bgm.py 產生，勿手改。地圖 id → music/bgm/<編號>.ogg（官方 mp3nametable） */\n')
        f.write('const MAP_BGM = ' + json.dumps(dict(sorted(full.items())), ensure_ascii=False, separators=(',', ':')) + ';\n')
    miss = [m['id'] for m in maps if m['id'].lower() not in table]
    print('地圖', len(maps), '有對照', len(pick), '沒對照', miss[:10])
    print('曲目', len(ok), '首', round(total_in / 1e6, 1), 'MB →', round(total_out / 1e6, 1), 'MB；對照表', len(full), '張圖')


if __name__ == '__main__':
    main()
