"""技能音效轉檔（T24，2026-11-14）：只取 scripts/out/skill_fx_plan.json 用得到的官方音效，
從 grf_ex/wav（= data\\wav）轉成 OGG 放 WAV/skill/<官方路徑>.ogg（例如 WAV/skill/effect/ef_firehit.ogg）。

  python scripts/gen_skill_sfx.py      需要 ffmpeg（在 PATH 上）
"""
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'grf_ex', 'wav')
OUT = os.path.join(ROOT, 'WAV', 'skill')


def main():
    plan = json.load(open(os.path.join(ROOT, 'scripts', 'out', 'skill_fx_plan.json'), encoding='utf-8'))['plan']
    need = sorted({w for lst in plan.values() for L in lst for w in (L.get('wav') or [])})
    total_in = total_out = 0
    for w in need:
        src = os.path.join(SRC, w + '.wav')
        dst = os.path.join(OUT, w + '.ogg')
        if not os.path.exists(src):
            print('缺', w)
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.exists(dst):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:a', 'libvorbis', '-q:a', '3', dst], check=True)
        total_in += os.path.getsize(src)
        total_out += os.path.getsize(dst)
    print('音效', len(need), '個', round(total_in / 1e6, 1), 'MB →', round(total_out / 1e6, 1), 'MB')


if __name__ == '__main__':
    main()
