"""Đóng gói hình trang bị cho game: PNG → WebP (nhẹ ~5 lần) và gom manifest thành một chỉ mục dữ liệu.

Dùng: python3 -I tools/art_pack.py
- Mọi assets/equipment/<ô>/art.*.png → .webp (chất lượng 90, giữ trong suốt), xoá PNG, sửa tên trong manifest.json.
- Áp sửa tay trong data/equipment/overrides.json (ví dụ flip vũ khí).
- Ghi data/equipment/art.json: { "<ô>": [ {id, file (đường dẫn từ gốc repo), w, h, anchor, ...} ] }.
Code game chỉ đọc data/equipment/art.json, không đọc manifest trong assets.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
EQ = ROOT / 'assets' / 'equipment'
SLOTS = ['trang-phuc', 'mat-na', 'vu-khi', 'canh', 'phap-tuong', 'nhan', 'day-chuyen', 'phap-bao', 'linh-thu']
KEEP = {'id', 'w', 'h', 'anchor', 'angle', 'hands', 'hem', 'flip', 'pair', 'limbs'}


def main():
    index = {}
    ov_path = ROOT / 'data' / 'equipment' / 'overrides.json'
    ov = json.loads(ov_path.read_text()) if ov_path.exists() else {}
    for slot in SLOTS:
        d = EQ / slot
        man_path = d / 'manifest.json'
        if not man_path.exists():
            index[slot] = []
            continue
        man = json.loads(man_path.read_text())
        for it in man:
            png = d / it['file']
            if png.suffix == '.png' and png.exists():
                webp = png.with_suffix('.webp')
                Image.open(png).save(webp, 'WEBP', quality=90, method=6)
                png.unlink()
                it['file'] = webp.name
        man_path.write_text(json.dumps(man, ensure_ascii=False, indent=1))
        index[slot] = [{**{k: v for k, v in {**it, **ov.get(it['id'], {})}.items() if k in KEEP},
                        'file': f'assets/equipment/{slot}/{it["file"]}'} for it in man]
    out = ROOT / 'data' / 'equipment' / 'art.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')))
    print({k: len(v) for k, v in index.items()})


if __name__ == '__main__':
    main()
