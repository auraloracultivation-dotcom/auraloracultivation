"""Gộp các manifest phụ (m1.json, m2.json…) trong một thư mục thành manifest.json rồi xoá file phụ.
Dùng: python3 -I tools/merge_manifest.py <thư mục> m1 m2 …"""
import json
import sys
from pathlib import Path

d = Path(sys.argv[1])
out = []
for name in sys.argv[2:]:
    p = d / f'{name}.json'
    out += json.loads(p.read_text())
    p.unlink()
(d / 'manifest.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(len(out), 'món →', d / 'manifest.json')
