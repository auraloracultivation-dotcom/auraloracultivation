"""Icon vật phẩm bản 2 (chủ dự án 23/10/2026): 56 icon (linh thảo, khoáng, đặc biệt, đan, phôi, công pháp, vật phẩm nhiệm vụ).

Nguồn: assets/items/_source/icon-*.webp — nền hồng, lưới cột × hàng, nhãn tên đen bên dưới (tấm linh thảo: nhãn dồn xuống cuối).
Mỗi ô lưới = 1 icon (gom mọi mảnh trong ô — tia sáng, hạt rời), bỏ nhãn. Ra atlas assets/items/icons.webp ô 96×96:
icon cũ không có bản mới vẫn giữ (phóng từ 64). Ghi data/art/sprites.json → icons.
Dùng: python3 -I tools/icons_v2.py [xem-trước.png]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key  # noqa: E402
from cut_objects import drop_labels, objects  # noqa: E402

SRC = Path('assets/items/_source')
SPRITES = Path('data/art/sprites.json')
S = 96
HERB = ['thanh-tam', 'linh-chi-non', 'bat-nha', 'huyet-linh', 'diem-chi', 'xich-qua', 'han-linh', 'bang-chi',
        'tuyet-lien', 'huyen-linh', 'u-minh', 'co-lien', 'hac-linh', 'tan-the', 'hu-khong']
CP = ['tamphap.luyen-khi', 'chieu.kiem-khi', 'khe.linh-thu', 'than.canh-phong', 'phap-tuong.thien-thu',
      'tamphap.thanh-tam', 'chieu.hoi-linh', 'than.lang-ba']
cp_ids = lambda k: [f'skill.{k}.001', f'item.congphap.{k}.001']
SLOTS = ['vu-khi', 'trang-phuc', 'nhan', 'day-chuyen', 'mat-na', 'linh-thu', 'canh', 'phap-tuong']

# Dải nhãn tên (y0, y1) trên mỗi tấm — đo bằng hàng điểm ảnh đen; ô icon = khoảng giữa hai dải nhãn
BANDS = {'icon-khoang': [(213, 250), (467, 504), (704, 742), (947, 986)], 'icon-dan-phoi': [(209, 248), (460, 499), (690, 729), (939, 978)],
         'icon-bi-kip': [(371, 421), (768, 817)], 'icon-thao': [(190, 196), (375, 381), (553, 559), (740, 1024)]}
# (tấm, cột, hàng, (bỏ), [mã cho từng ô theo hàng → cột])
SHEETS = [
    ('icon-thao', 4, 4, (0, 0.72), [[f'item.thao.{h}.001'] for h in HERB] + [['item.khoang.huyen-thiet-vun.001']]),
    ('icon-khoang', 4, 4, (0, 1), [[f'item.khoang.{k}.001'] for k in
        ['tinh-sa', 'xich-thiet', 'huyet-ngoc', 'han-thiet', 'bang-ngoc', 'huyen-thiet', 'u-ngoc', 'hac-thiet', 'hu-ngoc']]
        + [[f'item.dacbiet.{k}.001'] for k in ['huyet-yeu-tinh', 'hon-thu-tinh', 'tinh-hon', 'tinh-hon-co']]
        + [[f'item.dan.{k}.001'] for k in ['truc-co', 'ket-dan', 'nguyen-anh']]),
    ('icon-dan-phoi', 4, 4, (0, 1), [[f'item.dan.{k}.001'] for k in ['hoa-than', 'tieu-hoi-huyet', 'hoi-linh', 'cuong-cong', 'cuong-the', 'duy-tri']]
        + [[f'slot.{s}'] for s in SLOTS] + [cp_ids(CP[0]), cp_ids(CP[1])]),
    ('icon-bi-kip', 4, 2, (0, 1), [cp_ids(k) for k in CP[2:]] + [['item.nhiemvu.manh-truyen-thua.001'], ['item.nhiemvu.dau-an-huyet-sai.001']]),
]


def cells(name, cols, rows, yr, ids):
    rgb = np.asarray(Image.open(SRC / f'{name}.webp').convert('RGB'))
    rgb, alpha = key(rgb)
    H, W = alpha.shape
    bands = BANDS[name]
    for b0, b1 in bands: alpha[max(0, b0 - 9):b1 + 10] = 0  # xoá dải nhãn (kể cả viền dưới)
    tops = [0] + [b1 + 10 for _, b1 in bands[:-1]]
    bots = [b0 - 9 for b0, _ in bands]
    cw = W / cols
    out = {}
    for k, idl in enumerate(ids):
        r, c = divmod(k, cols)
        X0, X1, Y0, Y1 = int(c * cw), int((c + 1) * cw), tops[r], bots[r]
        A = alpha[Y0:Y1, X0:X1]
        sub = A > 60
        lab, n = ndimage.label(ndimage.binary_dilation(sub, iterations=3))
        if not n: raise SystemExit(f'{name}: ô {r},{c} trống')
        sizes = ndimage.sum(sub, lab, range(1, n + 1))
        keep = []
        for j, sl in enumerate(ndimage.find_objects(lab)):
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if h <= 12 and w >= 40: continue  # mẩu viền nhãn dẹt dài
            if sizes[j] >= 0.04 * sizes.max(): keep.append(j + 1)
        m = np.isin(lab, keep) & (alpha[Y0:Y1, X0:X1] > 0)
        # đường kẻ ngang mảnh (≤ 4 điểm dày, dài ≥ 45% ô) ở 1/3 dưới hoặc trên cùng ô → xoá
        line = np.zeros_like(m)
        for yy in range(m.shape[0]):
            if (yy > m.shape[0] * 0.66 or yy < m.shape[0] * 0.08) and m[yy].sum() > 0.3 * m.shape[1]:
                line[yy] = m[yy]
        thin = line & ~ndimage.binary_opening(m, structure=np.ones((5, 1)))
        m &= ~ndimage.binary_dilation(thin, structure=np.ones((3, 1)))
        # vạch nằm riêng ở đáy (cách hình một khe): mọi cụm dẹt ≤ 5 điểm cao ở 1/4 dưới ô → bỏ
        lab2, n2 = ndimage.label(m)
        for j, sl in enumerate(ndimage.find_objects(lab2), 1):
            if sl[0].stop - sl[0].start <= 5 and sl[1].stop - sl[1].start >= 25 and sl[0].start > m.shape[0] * 0.75: m[lab2 == j] = False
        rowc = m.sum(axis=1)
        last = np.flatnonzero(rowc)[-1]
        # đáy ô: đường kẻ mảnh (1–4 hàng) cách phần hình phía trên một khe trống → bỏ
        k = last
        while k > 0 and rowc[k] > 0: k -= 1
        if last - k <= 5 and k > 0 and rowc[max(0, k - 3):k + 1].sum() == 0: m[k + 1:last + 1] = False
        ys, xs = np.nonzero(m)
        ys0, xs0 = ys.min(), xs.min()
        a = np.where(m, alpha[Y0:Y1, X0:X1], 0)[ys0:ys.max() + 1, xs0:xs.max() + 1].astype(np.uint8)
        rr = rgb[Y0:Y1, X0:X1][ys0:ys.max() + 1, xs0:xs.max() + 1]
        im = Image.fromarray(np.dstack([rr, a]), 'RGBA')
        im.thumbnail((S - 6, S - 6), Image.LANCZOS)
        tile = Image.new('RGBA', (S, S)); tile.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
        for i in idl: out[i] = tile
    return out


def fit(im):
    im = im.copy(); im.thumbnail((S - 6, S - 6), Image.LANCZOS)
    tile = Image.new('RGBA', (S, S)); tile.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
    return tile


def recolor(t, hue, sat=1.0):
    """Xoay sắc độ (0–1) + nhân độ bão hoà, giữ kênh trong suốt."""
    a = t.getchannel('A')
    h, s_, v = t.convert('RGB').convert('HSV').split()
    h = h.point(lambda x: (x + int(hue * 255)) % 256)
    s_ = s_.point(lambda x: min(255, int(x * sat)))
    out = Image.merge('HSV', (h, s_, v)).convert('RGB').convert('RGBA'); out.putalpha(a)
    return out


# mã mới → (icon gốc, xoay sắc độ, độ bão hoà)
DERIVED = {'item.thao.tho-nguyen.001': ('item.thao.thanh-tam.001', 0.78, 1.2),  # cỏ vàng óng
           'item.dan.tang-tho.001': ('item.dan.truc-co.001', 0.1, 1.1),
           'item.dan.tu-vi.001': ('item.dan.hoi-linh.001', 0.5, 1.0),
           'item.dan.vien-man.001': ('item.dan.hoa-than.001', 0.75, 1.3)}


def main():
    sp = json.loads(SPRITES.read_text())
    old = sp['icons']
    oim = Image.open(old['src']).convert('RGBA')
    tiles = {}
    for k, n in old['map'].items():  # icon cũ (giữ khi chưa có bản mới)
        os_ = old['size']
        t = oim.crop(((n % old['cols']) * os_, (n // old['cols']) * os_, (n % old['cols'] + 1) * os_, (n // old['cols'] + 1) * os_))
        tiles[k] = t.resize((S, S), Image.LANCZOS) if os_ != S else t
    new = {}
    for spec in SHEETS: new.update(cells(*spec))
    # Đan phương / công thức phôi: chưa có ảnh riêng → icon đan / phôi tương ứng + dấu cuộn giấy nhỏ ở góc (vẽ bằng code)
    from PIL import ImageDraw
    def with_scroll(t):
        t = t.copy(); d = ImageDraw.Draw(t)
        x0, y0, x1, y1 = S - 34, S - 26, S - 4, S - 4
        d.rounded_rectangle((x0, y0, x1, y1), 4, fill=(236, 214, 160, 255), outline=(92, 58, 24, 255), width=2)
        for yy in (y0 + 7, y0 + 12, y0 + 17): d.line((x0 + 6, yy, x1 - 6, yy), fill=(140, 96, 48, 255), width=1)
        d.ellipse((x0 - 4, y0 - 1, x0 + 5, y1 + 1), fill=(200, 170, 110, 255), outline=(92, 58, 24, 255), width=2)
        return t
    for k in list(tiles):
        if k.startswith('item.danphuong.'):
            src = 'item.dan.' + k.split('.')[2] + '.001'
            if src in new: new[k] = with_scroll(new[src])
        elif k.startswith('item.congthuc.'):
            src = 'slot.' + k.split('.')[2]
            if src in new: new[k] = with_scroll(new[src])
    # Tiền tệ (23/10): tấm 3 hình không nhãn — thỏi vàng, linh thạch, tiên ngọc
    for k, (_, im) in zip(['cur.vang', 'linh-thach', 'cur.tien-ngoc'], objects(SRC / 'icon-tien-te.webp', merge=24)):
        new[k] = fit(im)
    # Thọ nguyên / tiên đan: chưa có ảnh riêng → đổi màu icon có sẵn
    for k, (src, hue, sat) in DERIVED.items(): new[k] = recolor(new[src], hue, sat)
    new['item.danphuong.tang-tho.001'] = with_scroll(new['item.dan.tang-tho.001'])  # Đan phương Trường Sinh Đan
    tiles.update(new)
    cols = 16
    keys = list(tiles)
    atlas = Image.new('RGBA', (cols * S, ((len(keys) + cols - 1) // cols) * S))
    for i, k in enumerate(keys): atlas.alpha_composite(tiles[k], ((i % cols) * S, (i // cols) * S))
    atlas.save('assets/items/icons.webp', quality=90, method=6)
    sp['icons'] = {'src': 'assets/items/icons.webp', 'size': S, 'cols': cols, 'map': {k: i for i, k in enumerate(keys)},
                   '_v2': sorted(new)}
    SPRITES.write_text(json.dumps(sp, ensure_ascii=False) + '\n')
    print(len(new), 'icon mới /', len(keys))
    if len(sys.argv) > 1:
        prev = Image.new('RGBA', (12 * S, ((len(new) + 11) // 12) * S), (60, 64, 72, 255))
        for i, k in enumerate(sorted(new, key=list(new).index)): prev.alpha_composite(new[k], ((i % 12) * S, (i // 12) * S))
        prev.save(sys.argv[1])


if __name__ == '__main__':
    main()
