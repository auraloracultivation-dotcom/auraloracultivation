"""Icon kỹ năng lấy từ thư viện hiệu ứng (chủ dự án 24/10/2026) cho 14 kỹ năng trước đây mượn khung hiệu ứng làm icon.
PICK: mã kỹ năng → mã hình lib.<tấm>.<hàng>.<cột> (xem tools/fx_library.py). Ra assets/ui/skills/<mã>.png (96×96)
+ gameplay.json skills.<mã>.icon_url. Sau đó chạy tools/skill_medals.py để làm huy hiệu tròn.
Dùng: python3 -I tools/skill_icons_lib.py
"""
import json
from pathlib import Path

from PIL import Image

PICK = {
    'hoa-cau': '4.5.4', 'bang-tien': '9.3.2', 'moc-lien': '4.3.6', 'kiem-khi': '9.6.5', 'khong-che': '9.2.4',
    'phong-nhan': '1.1.8', 'loi-kich': '3.7.4', 'dia-thu': '3.8.6', 'thuy-long': '9.3.7', 'nguyen-anh': '4.8.8',
    'ho-the': '3.8.5', 'van-kiem': '9.6.6', 'hac-dong': '4.4.8', 'phuong-hoang': '4.5.8',
}


def cell(lib, code):
    t, r, c = (int(x) for x in code.split('.'))
    sh = lib['sheets'][str(t)]
    assert c <= sh['rows'][r - 1], code
    C = lib['cell']
    return Image.open(sh['src']).convert('RGBA').crop(((c - 1) * C, (r - 1) * C, c * C, r * C))


def main():
    lib = json.loads(Path('data/art/fx-lib.json').read_text())
    gp = json.loads(Path('data/gameplay.json').read_text())
    for sid, code in PICK.items():
        p = f'assets/ui/skills/{sid}.png'
        cell(lib, code).save(p)
        gp['skills'][sid]['icon_url'] = p
        print(sid, '←', code)
    Path('data/gameplay.json').write_text(json.dumps(gp, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
