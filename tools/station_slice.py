# Cắt 2 tấm chủ dự án gửi 23/10/2026 17h (nền hồng #FA03FB):
#   assets/town/_source/tran-phap-gpt.png   → 12 trận pháp truyền tống  → assets/town/tp-*.png
#   assets/town/_source/kien-truc-2-gpt.png → 18 điện / nhà / tháp      → assets/town/nha-*.png
# Tự tìm từng hình theo cụm điểm liền (không cần ghi ô cắt tay), xếp theo hàng trái → phải.
# Ghi kích thước hiển thị vào data/art/stations-art.json (cùng dạng props của data/art/sprites.json).
# Chạy: python3 -I tools/station_slice.py
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *p: os.path.join(ROOT, *p)

# (tên, chiều cao trên bản đồ px) theo thứ tự hàng trên → dưới, trái → phải
TP = [('tp-thai-cuc', 104), ('tp-phu-thach', 104), ('tp-thien-mon', 108), ('tp-tinh-tru', 100),
      ('tp-dinh-xoay', 104), ('tp-thac-mon', 112), ('tp-co-tich', 96), ('tp-mon-xoay', 108),
      ('tp-loi-di', 64), ('tp-lien-hoa', 84), ('tp-bat-quai', 88), ('tp-hoa-mon', 96)]
NHA = [('nha-dai-dien', 150), ('nha-dien-co', 120), ('nha-dien-nho', 120), ('nha-thap-bao', 150), ('nha-dien-dai', 110),
       ('nha-dinh-co', 104), ('nha-quan-tro', 96), ('nha-lau-canh', 104), ('nha-tiem-1', 90), ('nha-tiem-2', 90), ('nha-kho-go', 90),
       ('nha-nho-1', 70), ('nha-cho-1', 70), ('nha-cho-2', 72), ('nha-nho-2', 70), ('nha-nho-3', 70), ('nha-cho-3', 70), ('nha-nho-4', 70)]


def keyed(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.clip((np.minimum(r, b) - g - 90) / 110, 0, 1)  # 1 = nền hồng
    r2 = np.where(m > 0, np.minimum(r, np.maximum(g, r - (r - g) * m)), r)  # khử viền hồng
    b2 = np.where(m > 0, np.minimum(b, np.maximum(g, b - (b - g) * m)), b)
    return np.dstack([r2, g, b2, (1 - m) * 255]).clip(0, 255).astype(np.uint8)


def blobs(rgba, n, grow):
    a = rgba[..., 3] > 60
    lab, k = ndimage.label(ndimage.binary_dilation(a, iterations=grow))  # gộp mảnh rời của cùng 1 hình (đá bay, đèn)
    sl = ndimage.find_objects(lab)
    sizes = ndimage.sum(a, lab, range(1, k + 1))
    keep = sorted(range(k), key=lambda i: -sizes[i])[:n]
    boxes = [(sl[i][1].start, sl[i][0].start, sl[i][1].stop, sl[i][0].stop, i + 1) for i in keep]
    # xếp theo hàng: tâm y gần nhau (< 1/6 chiều cao tấm) cùng hàng
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, H = [], rgba.shape[0]
    for b in boxes:
        if rows and abs((rows[-1][0][1] + rows[-1][0][3]) / 2 - (b[1] + b[3]) / 2) < H / 6: rows[-1].append(b)
        else: rows.append([b])
    return [b for row in rows for b in sorted(row, key=lambda b: b[0])], lab


def run(src, names, out, grow):
    rgba = keyed(J('assets/town/_source', src))
    boxes, lab = blobs(rgba, len(names), grow)
    assert len(boxes) == len(names), (src, len(boxes))
    for (name, h), (x0, y0, x1, y1, li) in zip(names, boxes):
        part = rgba[y0:y1, x0:x1].copy()
        part[..., 3] = np.where(lab[y0:y1, x0:x1] == li, part[..., 3], 0)
        im = Image.fromarray(part, 'RGBA')
        im = im.crop(im.getbbox())
        k = min(1, (h * 2) / im.height)  # lưu gấp đôi cỡ hiển thị cho nét
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im = im.quantize(256, method=Image.FASTOCTREE).convert('RGBA')
        path = J('assets/town', f'{name}.png')
        im.save(path, optimize=True)
        out[name] = {'src': f'assets/town/{name}.png', 'w': round(im.width / im.height * h), 'h': h}


if __name__ == '__main__':
    P = {}
    run('tran-phap-gpt.png', TP, P, 9)
    run('kien-truc-2-gpt.png', NHA, P, 2)  # nhà đứng sát nhau: gộp ít
    with open(J('data/art/stations-art.json'), 'w') as f:
        json.dump({'_ghi_chu': 'Sinh bằng tools/station_slice.py — KHÔNG sửa tay. Trận pháp + điện các trạm (chủ dự án 23/10).', 'props': P}, f, ensure_ascii=False, indent=1)
    print(len(P), 'hình')
