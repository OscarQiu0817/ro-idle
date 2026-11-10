"""T28 精煉視窗素材：grf_ex/refining_renewal/*.bmp → images/ui/refine/

  python scripts/gen_refine_ui.py

背景（262×301）每段動畫拼成一條橫向 webp（成功／失敗畫面的右按鈕底框修成跟左邊一樣高）；按鈕／格子轉 png，品紅 #FF00FF 當透明。
"""
import os
from PIL import Image

SRC = os.path.join('grf_ex', 'refining_renewal')
OUT = os.path.join('images', 'ui', 'refine')
SEQS = {
  'wait': ('bg_refining_wait_%02d', range(0, 4)),
  'ready_a': ('bg_refininga_ready_%02d', range(0, 3)),       # a：有鐵匠的祝福（粉色寶石）
  'ready_b': ('bg_refiningb_ready_%02d', range(0, 3)),       # b：只有一般材料
  'proc_a': ('bg_refininga_process_%02d', range(0, 9)),
  'proc_b': ('bg_refiningb_process_%02d', range(0, 9)),
  'proc': ('bg_refining_process_%02d', range(9, 14)),        # 共用：鐵鎚敲下
  'success': ('bg_refining_success_%02d', range(0, 17)),
  'fail': ('bg_refining_fail_%02d', range(0, 20)),
}


def keyed(path):
  im = Image.open(path).convert('RGBA')
  im.putdata([(0, 0, 0, 0) if p[:3] == (255, 0, 255) else p for p in im.getdata()])
  return im


def even_buttons(f):
  """成功／失敗畫面：右邊「再精煉一次」的底框比左邊「返回」高 12px（按鈕 50 vs 38），看起來底部突出。
  把右格 y 252 以下換成左格的左右鏡像，兩格一樣高（使用者 2026-11-09）。"""
  w, h = f.size
  patch = f.crop((w - 1 - 243, 252, w - 1 - 140 + 1, h)).transpose(Image.FLIP_LEFT_RIGHT)
  f.paste(patch, (140, 252))
  return f


def main():
  os.makedirs(OUT, exist_ok=True)
  for name, (pat, rng) in SEQS.items():
    frames = [Image.open(os.path.join(SRC, (pat % i) + '.bmp')).convert('RGB') for i in rng]
    if name in ('success', 'fail'):
      frames = [even_buttons(f) for f in frames]
    w, h = frames[0].size
    strip = Image.new('RGB', (w * len(frames), h))
    for k, f in enumerate(frames):
      strip.paste(f, (k * w, 0))
    strip.save(os.path.join(OUT, name + '.webp'), quality=82, method=6)
  for f in sorted(os.listdir(SRC)):
    if f.startswith(('bt_', 'slot_', 'ico_')) and f.endswith('.bmp'):
      keyed(os.path.join(SRC, f)).save(os.path.join(OUT, f[:-4] + '.png'), optimize=True)


if __name__ == '__main__':
  main()
