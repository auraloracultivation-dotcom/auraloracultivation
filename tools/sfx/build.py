"""Sinh toàn bộ âm thanh game: assets/audio/sfx/<id>.mp3 và assets/audio/bgm/<id>.mp3.
Dùng: python3 -I tools/sfx/build.py [lọc-id]   (vd. "sfx.he" chỉ sinh các tiếng hệ)
Danh sách id ↔ file ↔ âm lượng ở data/audio.json (code chỉ gọi id)."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import combat, music, skills, ui  # noqa: E402
from dsp import write_mp3  # noqa: E402

ROOT = HERE.parent.parent
only = sys.argv[1] if len(sys.argv) > 1 else ''
made = {}
for cat in (combat, skills, ui):
    for sid, fn in cat.SOUNDS.items():
        if only and not sid.startswith(only):
            continue
        made[sid] = write_mp3(fn(), ROOT / 'assets/audio/sfx' / f'{sid[4:]}.mp3', 112)
for mid, fn in music.MUSIC.items():
    if only and not mid.startswith(only):
        continue
    made[mid] = write_mp3(fn(), ROOT / 'assets/audio/bgm' / f'{mid[4:]}.mp3', 96)
for k, v in made.items():
    print(f'{k:28s} {v:6.2f} s')
# đối chiếu data/audio.json: id nào khai báo mà chưa có file
cfg = json.loads((ROOT / 'data/audio.json').read_text(encoding='utf-8'))
missing = [k for sec in ('sfx', 'music') for k, e in cfg.get(sec, {}).items() if not (ROOT / e['file']).exists()]
print('thiếu file:', missing or 'không')
