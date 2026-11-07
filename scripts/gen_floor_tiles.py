"""地板素材 → 可平鋪的戰鬥背景。

來源：images/maps/ro_idle_terrain_atlas_v1/*.png（384×256 概念圖裁切，四邊不無縫）
輸出：images/maps/floor/<key>.jpg（data.js 的 MAP_FLOOR_FILES 讀這些檔名）

做法：先切掉外圈 TRIM px（圖集格線殘影），再把右／下 FADE px 疊回左／上做漸層，
寬高各少 FADE px，四邊就接得起來。海邊（左水右沙）用鏡像拼接，漸層會把水沙混成一團。

用法：python scripts/gen_floor_tiles.py
"""
import os
from PIL import Image

SRC = 'images/maps/ro_idle_terrain_atlas_v1'
OUT = 'images/maps/floor'
TRIM = 4
FADE = 56

# 輸出 key → 來源檔。第 1 列檔名與內容錯一格（01_02 是廣場、01_03 是暖色石磚、01_04 是草地），照內容對
FLOORS = {
  'stone_plaza': ('01_02_town_warm_cobble.png', 'mirror'),
  'grey_cobble': ('01_01_town_stone_plaza.png', 'fade'),
  'warm_cobble': ('01_03_field_grass.png', 'fade'),
  'grass': ('01_04_field_sandy_grass.png', 'fade'),
  'desert': ('02_01_desert_sand.png', 'fade'),
  'snow': ('02_02_snow_ice.png', 'fade'),
  'purple_stone': ('02_03_town_purple_stone.png', 'fade'),
  'rocky': ('02_04_rocky_field.png', 'fade'),
  'forest': ('03_01_forest_grass.png', 'fade'),
  'beach': ('03_02_beach_shore.png', 'mirror'),
  'dry_field': ('03_03_dry_yellow_field.png', 'fade'),
  'volcano': ('03_04_volcanic_ground.png', 'fade'),
  'pale_stone': ('04_01_town_pale_stone.png', 'fade'),
  'meadow': ('04_02_flower_meadow.png', 'fade'),
  'ashen_rock': ('04_03_dungeon_ashen_rock.png', 'fade'),
  'mossy_stone': ('04_04_old_mossy_stone.png', 'fade'),
}


def ramp_mask(w, h, horizontal):
  m = Image.new('L', (w, h))
  px = m.load()
  n = w if horizontal else h
  for i in range(n):
    v = int(255 * (1 - (i + 0.5) / n))
    if horizontal:
      for y in range(h):
        px[i, y] = v
    else:
      for x in range(w):
        px[x, i] = v
  return m


def fade_tile(im):
  w, h = im.size
  # 水平：右邊 FADE 欄疊到左邊，左緣全是右條、往右漸變回原圖
  body = im.crop((0, 0, w - FADE, h))
  strip = im.crop((w - FADE, 0, w, h))
  body.paste(strip, (0, 0), ramp_mask(FADE, h, True))
  w -= FADE
  # 垂直同理
  out = body.crop((0, 0, w, h - FADE))
  strip = body.crop((0, h - FADE, w, h))
  out.paste(strip, (0, 0), ramp_mask(w, FADE, False))
  return out


def mirror_tile(im):
  w, h = im.size
  out = Image.new('RGB', (w * 2, h * 2))
  out.paste(im, (0, 0))
  out.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
  out.paste(im.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
  out.paste(im.transpose(Image.ROTATE_180), (w, h))
  return out


def main():
  os.makedirs(OUT, exist_ok=True)
  for key, (fn, mode) in FLOORS.items():
    im = Image.open(os.path.join(SRC, fn)).convert('RGB')
    w, h = im.size
    im = im.crop((TRIM, TRIM, w - TRIM, h - TRIM))
    tile = mirror_tile(im) if mode == 'mirror' else fade_tile(im)
    tile.save(os.path.join(OUT, key + '.jpg'), quality=88)
    print(key, tile.size)


if __name__ == '__main__':
  main()
