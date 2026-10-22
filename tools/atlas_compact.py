"""Gọn atlas ô đất: chỉ giữ ô mà data/terrain.json đang dùng, xếp lại liền nhau (atlas to làm vẽ chậm trên điện thoại).
Dùng: python3 -I tools/atlas_compact.py   (chạy sau tools/tiles_v2.py)"""
import json
from pathlib import Path
from PIL import Image

idx = json.loads(Path('data/tiles.json').read_text())
terrain = json.loads(Path('data/terrain.json').read_text())
S = idx['size']
used = sorted({n for t in terrain['types'] for n, _ in t['tiles']}, key=list(idx['tiles']).index)
old = Image.open(idx['atlas']).convert('RGB')
cols = 8
rows = (len(used) + cols - 1) // cols
new = Image.new('RGB', (cols * S, rows * S))
tiles = {}
for i, n in enumerate(used):
    x, y = idx['tiles'][n]
    new.paste(old.crop((x, y, x + S, y + S)), ((i % cols) * S, (i // cols) * S))
    tiles[n] = [(i % cols) * S, (i // cols) * S]
idx['tiles'] = tiles
new.save(idx['atlas'], quality=88, method=6)
Path('data/tiles.json').write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n')
print('atlas', new.size, len(used), 'ô')
