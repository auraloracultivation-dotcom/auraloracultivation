"""Đóng gói tài nguyên THỬ NGHIỆM (quái, linh thú, hiệu ứng, icon) từ các tấm chủ dự án gửi + gói miễn phí.

Dùng: python3 -I tools/asset_build.py <thư mục nguồn>
  <thư mục nguồn> chứa ảnh gốc (tên như trong bảng SRC dưới) và các gói đã giải nén (thư mục con).
Ra:  assets/sprites/*.png  assets/effects/*.png  assets/items/icons.png  data/art/sprites.json
Ảnh gốc KHÔNG đưa vào repo (nặng, sẽ được thay) — danh sách ở bảng SRC, giấy phép ở assets/CREDITS.md.
Muốn thay hình: sửa bảng MONSTERS / FX / ICONS rồi chạy lại.
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image, ImageSequence

sys.path.insert(0, os.path.dirname(__file__))
from sheet_cut import load_keyed, crop  # noqa: E402

SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else '.'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = {k: os.path.join(ROOT, v) for k, v in {'spr': 'assets/sprites', 'fx': 'assets/effects', 'items': 'assets/items'}.items()}
for d in OUT.values():
    os.makedirs(d, exist_ok=True)

# Ảnh nguồn chủ dự án gửi (21/10/2026)
SRC = {
    'soi-loi': '5e9ebce9-image.png', 'ky-lan': '3a1d2d82-image.png', 'thu-cuoi-tim': '89ebf01a-image.png',
    'kiem-bang': 'b8464263-image.png', 'truong-moc': 'bb0e15b8-image.png', 'riu-tho': '2f2b2e10-image.png',
    'thien-kiep': '4319fc54-image.png', 'truong-hoa': 'f62d16ac-image.png', 'canh-vat': 'e9c03de6-image.png',
    'linh-chau': 'bc746396-image.png', 'cong-phap': '9e3eeb69-image.png', 'truc-cuon': 'd9c48738-image.png',
    'dan-phuong': '51e27582-image.png', 'doi-lua': '0c95c49b-image.gif', 'quai-nho': '0ed12cb1-image.jpg',
    'khoi': '2c28dace-image.gif', 'kien-truc': '83c561a8-image.png', 'dao-noi': 'eb4afdd1-image.png',
    'canh-vat-2': '66f9bd2c-image.png',
}
src = lambda k: os.path.join(SRC_DIR, SRC[k])
pack = lambda pat: glob.glob(os.path.join(SRC_DIR, '**', pat), recursive=True)[0]


def tight(img):
    b = img.getbbox()
    return img.crop(b) if b else img


def grid(x0, x1, y0, y1, n):
    w = (x1 - x0) / n
    return [(int(x0 + i * w), y0, int(x0 + (i + 1) * w), y1) for i in range(n)]


def main_blob(img, keep=0.08):
    """Bỏ mảnh vụn lọt từ hình bên cạnh: giữ các cụm lớn (≥ keep × cụm lớn nhất)."""
    from scipy import ndimage
    a = np.array(img)[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    if n <= 1:
        return img
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    ok = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= keep * sizes.max()])
    arr = np.array(img)
    arr[..., 3] = np.where(ok, arr[..., 3], 0)
    return tight(Image.fromarray(arr, 'RGBA'))


def cut(key, bg, boxes, erase=(), blob=False):
    """erase: các ô chữ/nhãn cần xoá trước khi cắt (x0, y0, x1, y1)."""
    rgb, a = load_keyed(src(key), bg)
    a = a.copy()
    for x0, y0, x1, y1 in erase:
        a[y0:y1, x0:x1] = 0
    out = [tight(crop(rgb, a, b)) for b in boxes]
    return [main_blob(f) for f in out] if blob else out


def scale_all(frames, max_h):
    h = max(f.height for f in frames)
    k = min(1, max_h / h)
    return [f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS) for f in frames] if k < 1 else frames


def sheet(anims, max_h, out, anchor='bottom'):
    """anims: {tên: [ảnh]} → 1 tấm, mỗi hàng 1 hoạt ảnh, ô bằng nhau; căn giữa-đáy (nhân vật) hoặc giữa (hiệu ứng)."""
    allf = scale_all([f for fs in anims.values() for f in fs], max_h)
    it = iter(allf)
    anims = {k: [next(it) for _ in fs] for k, fs in anims.items()}
    cw = max(f.width for f in allf) + 2
    ch = max(f.height for f in allf) + 2
    cols = max(len(fs) for fs in anims.values())
    im = Image.new('RGBA', (cw * cols, ch * len(anims)))
    meta = {}
    for r, (name, fs) in enumerate(anims.items()):
        for c, f in enumerate(fs):
            x = c * cw + (cw - f.width) // 2
            y = r * ch + (ch - f.height - 1 if anchor == 'bottom' else (ch - f.height) // 2)
            im.alpha_composite(f, (x, y))
        meta[name] = {'row': r, 'n': len(fs)}
    im.save(out, optimize=True)
    return {'src': os.path.relpath(out, ROOT), 'fw': cw, 'fh': ch, 'anims': meta}


# ---------------- Quái / linh thú ----------------
def tiny_rpg(pat, rows, cell=100):
    im = Image.open(pack(pat)).convert('RGBA')
    out = {}
    for name, (r, n) in rows.items():
        out[name] = [tight(im.crop((c * cell, r * cell, c * cell + cell, r * cell + cell))) for c in range(n)]
    return out


def knight():
    def strip(f, n=None):
        im = Image.open(pack(f'Sprites/{f}.png')).convert('RGBA')
        n = n or im.width // 112
        return [tight(im.crop((i * 112, 0, i * 112 + 112, 96))) for i in range(n)]
    return {'idle': strip('IDLE'), 'walk': strip('WALK'), 'attack': strip('ATTACK 1'), 'hurt': strip('HURT'), 'death': strip('DEATH')}


def gif_frames(key):
    im = Image.open(src(key))
    return [tight(f.convert('RGBA')) for f in ImageSequence.Iterator(im)]


def small_monster(i):
    """quai-nho.jpg: 12 quái 100×100 (4 cột × 3 hàng), nền tím xám → xoá nền theo màu góc."""
    im = np.array(Image.open(src('quai-nho')).convert('RGB')).astype(int)
    r, c = divmod(i, 4)
    cell = im[r * 133:(r + 1) * 133, c * 100:(c + 1) * 100]
    bg = np.array([65, 58, 76])
    a = (np.abs(cell - bg).sum(2) > 40).astype(np.uint8) * 255
    return tight(Image.fromarray(np.dstack([cell.astype(np.uint8), a]), 'RGBA'))


def run_monsters():
    S = {}
    tr = 'Characters(100x100 split)'
    S['orc'] = sheet(tiny_rpg(f'{tr}/Orc/Orc/Orc.png', {'idle': (0, 6), 'walk': (1, 8), 'attack': (2, 6), 'hurt': (4, 4), 'death': (5, 4)}), 64, f"{OUT['spr']}/orc.png")
    S['soldier'] = sheet(tiny_rpg(f'{tr}/Soldier/Soldier/Soldier.png', {'idle': (0, 6), 'walk': (1, 8), 'attack': (2, 6), 'hurt': (5, 4), 'death': (6, 4)}), 64, f"{OUT['spr']}/soldier.png")
    S['demon'] = sheet(tiny_rpg(f'{tr}/Demon_A/Demon_A/Demon_A.png', {'idle': (0, 6), 'walk': (1, 8), 'attack': (2, 7), 'hurt': (4, 4), 'death': (5, 4)}), 64, f"{OUT['spr']}/demon.png")
    S['blood'] = sheet(tiny_rpg(f'{tr}/Blood Monster_A/Blood Monster_A/Blood Monster_A.png', {'idle': (0, 6), 'walk': (1, 8), 'attack': (2, 8), 'hurt': (4, 4), 'death': (5, 4)}), 64, f"{OUT['spr']}/blood.png")
    S['knight'] = sheet(knight(), 96, f"{OUT['spr']}/knight.png")
    bat = gif_frames('doi-lua')
    S['doi-lua'] = sheet({'idle': bat, 'walk': bat, 'attack': bat}, 96, f"{OUT['spr']}/doi-lua.png")
    # Quái chủ dự án vẽ (nền xanh lá): 15 sói lôi, 17 rắn ba đầu, 26 quái xúc tu
    w = cut('soi-loi', 'green', grid(28, 1513, 36, 168, 7) + grid(28, 1513, 192, 316, 7), erase=[(15, 8, 92, 70), (15, 350, 92, 410), (15, 724, 92, 782)], blob=True)
    S['soi-loi'] = sheet({'idle': w[:7], 'walk': w[:7], 'attack': w[7:13], 'death': w[13:]}, 128, f"{OUT['spr']}/soi-loi.png")
    h = cut('soi-loi', 'green', grid(30, 1514, 372, 526, 8) + grid(28, 1514, 544, 701, 8), erase=[(15, 8, 92, 70), (15, 350, 92, 410), (15, 724, 92, 782)], blob=True)
    S['ran-ba-dau'] = sheet({'idle': h[:4], 'walk': h[:8], 'attack': h[8:14], 'death': h[14:]}, 128, f"{OUT['spr']}/ran-ba-dau.png")
    t = cut('soi-loi', 'green', grid(23, 1514, 759, 937, 8), erase=[(15, 8, 92, 70), (15, 350, 92, 410), (15, 724, 92, 782)], blob=True)
    S['xuc-tu'] = sheet({'idle': t[:4], 'walk': t[:4], 'attack': t[4:7], 'death': t[7:]}, 128, f"{OUT['spr']}/xuc-tu.png")
    k = cut('ky-lan', 'green', grid(6, 1528, 22, 171, 12) + grid(6, 1528, 211, 332, 12) + grid(6, 1528, 506, 668, 12) + grid(6, 1520, 857, 991, 9), blob=True)
    S['ky-lan-loi'] = sheet({'idle': k[:12], 'walk': k[12:24], 'attack': k[24:36], 'death': k[36:]}, 160, f"{OUT['spr']}/ky-lan-loi.png")
    m = cut('thu-cuoi-tim', 'magenta', grid(9, 1528, 52, 230, 7) + grid(9, 1518, 287, 449, 8) + grid(9, 1528, 502, 678, 7), blob=True)
    S['thu-tim'] = sheet({'idle': m[:7], 'walk': m[7:15], 'attack': m[15:]}, 128, f"{OUT['spr']}/thu-tim.png")
    names = ['gai-dat', 'sach-yeu', 'dau-lau', 'oc-gai', 'nhan-cau', 'nam', 'nhen', 'slime', 'ca-quai', 'ruoi', 'ran', 'bach-tuoc']
    for i, n in enumerate(names):  # quái nhỏ 1 hình tĩnh — code tự nhún, KHÔNG giả nhiều khung
        S[n] = sheet({'idle': [small_monster(i)]}, 48, f"{OUT['spr']}/{n}.png")
    # Linh thú: chó trắng (pet1_free), nhìn sang TRÁI
    dog = Image.open(pack('pet1.png')).convert('RGBA')
    cellp = lambda r, c: tight(dog.crop((c * 128, r * 128, c * 128 + 128, r * 128 + 128)))
    S['cho-trang'] = sheet({'idle': [cellp(0, c) for c in range(4)] + [cellp(1, 0), cellp(1, 1)],
                            'walk': [cellp(4, c) for c in range(4)] + [cellp(5, 0), cellp(5, 1)]}, 48, f"{OUT['spr']}/cho-trang.png")
    S['cho-trang']['face'] = -1
    return S


# ---------------- Hiệu ứng ----------------
def frostwindz(pack_name, vfx, n):
    im = Image.open(pack(f'{pack_name}*/{vfx}/sprite-sheet/sprite-sheet.png')).convert('RGBA')
    cols = im.width // 128
    return [im.crop(((i % cols) * 128, (i // cols) * 128, (i % cols) * 128 + 128, (i // cols) * 128 + 128)) for i in range(n)]


def run_fx():
    F = {}
    def add(name, frames, max_h, fps=14, anchor='center'):
        F[name] = sheet({'play': [f for f in frames if f.getbbox()]}, max_h, f"{OUT['fx']}/{name}.png", anchor)
        F[name]['fps'] = fps
    add('kiem-bang-bay', cut('kiem-bang', 'magenta', [(1100, 20, 1530, 250)]), 64)
    add('kiem-bang-no', cut('kiem-bang', 'magenta', [(215, 240, 395, 600), (400, 240, 685, 600), (690, 240, 1080, 600), (1085, 240, 1530, 600)]), 96)
    add('moc-troi', cut('truong-moc', 'magenta', grid(210, 1530, 690, 880, 5), erase=[(0, 0, 215, 1024), (0, 660, 300, 725)]), 96, 10, 'bottom')
    add('tho-vong', cut('riu-tho', 'magenta', grid(10, 1514, 493, 676, 6)), 128, 12, 'bottom')
    add('hoa-cot', cut('truong-hoa', 'magenta', grid(205, 1515, 460, 650, 5)), 112, 12, 'bottom')
    add('may-kiep', cut('thien-kiep', 'magenta', [(10, 40, 95, 140), (100, 40, 190, 140), (195, 40, 330, 140), (330, 0, 485, 140),
                                                   (485, 0, 655, 140), (655, 0, 875, 140), (880, 0, 1095, 140), (1100, 0, 1300, 140), (1300, 0, 1530, 140)]), 96, 8)
    add('set-danh', cut('thien-kiep', 'magenta', grid(15, 1530, 165, 300, 16), erase=[(0, 158, 380, 206)]), 112, 18, 'bottom')
    add('chem-x', frostwindz('Pixel_Art_VFX_-_Vampire', 'VFX5', 10), 64, 20)
    add('cham-mau', frostwindz('Pixel_Art_VFX_-_Vampire', 'VFX2', 9), 48, 20)
    add('mat-quy', frostwindz('Pixel_Art_VFX_-_Vampire', 'VFX3', 6), 48, 10)
    add('sao-den', frostwindz('Pixel_Art_VFX_-_Vampire', 'VFX1', 10), 80, 16)
    add('vong-lua', frostwindz('Pixel_Art_VFX_-_Fire_Mage', 'VFX3', 12), 80, 16)
    add('no-lua', frostwindz('Pixel_Art_VFX_-_Fire_Mage', 'VFX1', 7), 64, 16)
    smoke = Image.open(src('khoi'))
    frames = []
    for f in ImageSequence.Iterator(smoke):
        a = np.array(f.convert('RGB')).astype(int)
        al = (np.abs(a - np.array([66, 82, 102])).sum(2) > 30).astype(np.uint8) * 255
        frames.append(tight(Image.fromarray(np.dstack([a.astype(np.uint8), al]), 'RGBA')))
    add('khoi', frames, 40, 10)
    return F


# ---------------- Icon vật phẩm (64×64) ----------------
def run_icons():
    icons = {}
    env_rgb, env_a = load_keyed(src('canh-vat'), 'magenta')
    herbs = [(21, 96), (99, 174), (178, 259), (260, 340), (346, 420), (431, 519), (531, 639), (645, 742), (744, 829), (832, 917),
             (924, 1016), (1025, 1111), (1123, 1205), (1210, 1300), (1300, 1400), (1410, 1520)]
    herb = lambda i: tight(crop(env_rgb, env_a, (herbs[i][0], 681, herbs[i][1], 792)))
    ores = [(18, 119), (121, 211), (216, 305), (312, 399), (406, 495), (499, 587), (594, 682), (692, 778), (790, 881), (886, 977),
            (982, 1073), (1078, 1130), (1135, 1174), (1181, 1221), (1226, 1268), (1272, 1313), (1317, 1358), (1362, 1402), (1405, 1455), (1461, 1510)]
    ore = lambda i: tight(crop(env_rgb, env_a, (ores[i][0], 577, ores[i][1], 678)))
    for slug, i in {'thanh-tam': 0, 'linh-chi-non': 8, 'bat-nha': 1, 'huyet-linh': 3, 'diem-chi': 7, 'xich-qua': 15, 'han-linh': 5,
                    'bang-chi': 10, 'tuyet-lien': 12, 'huyen-linh': 2, 'u-minh': 6, 'co-lien': 11, 'hac-linh': 13, 'tan-the': 14, 'hu-khong': 4}.items():
        icons[f'item.thao.{slug}.001'] = herb(i)
    for slug, i in {'huyen-thiet-vun': 0, 'tinh-sa': 2, 'xich-thiet': 5, 'huyet-ngoc': 14, 'han-thiet': 8, 'bang-ngoc': 13,
                    'huyen-thiet': 1, 'u-ngoc': 16, 'hac-thiet': 9, 'hu-ngoc': 18}.items():
        icons[f'item.khoang.{slug}.001'] = ore(i)

    def cells(key, cols, rows, box, label_h=0):
        rgb, a = load_keyed(src(key), 'magenta')
        x0, y0, x1, y1 = box
        cw, ch = (x1 - x0) / cols, (y1 - y0) / rows
        return lambda r, c: tight(crop(rgb, a, (int(x0 + c * cw), int(y0 + r * ch), int(x0 + (c + 1) * cw), int(y0 + (r + 1) * ch - label_h))))
    orb = cells('linh-chau', 7, 5, (0, 0, 1536, 1024))
    for slug, rc in {'huyet-yeu-tinh': (4, 2), 'hon-thu-tinh': (4, 1), 'tinh-hon': (4, 5), 'tinh-hon-co': (4, 0)}.items():
        icons[f'item.dacbiet.{slug}.001'] = orb(*rc)
    # Đan dược = linh châu; đan phương / công thức phôi = trục cuộn; sách công pháp = sách
    for slug, rc in {'truc-co': (0, 2), 'ket-dan': (1, 5), 'nguyen-anh': (2, 2), 'hoa-than': (3, 6), 'tieu-hoi-huyet': (3, 2),
                     'hoi-linh': (0, 3), 'cuong-cong': (0, 4), 'cuong-the': (0, 1), 'duy-tri': (1, 6)}.items():
        icons[f'item.dan.{slug}.001'] = orb(*rc)
    icons['item.phu.bao-ho.001'] = orb(3, 0)
    book = cells('cong-phap', 5, 4, (0, 0, 1536, 1024))
    for sid, rc in {'skill.tamphap.luyen-khi.001': (1, 2), 'skill.chieu.kiem-khi.001': (0, 0), 'skill.khe.linh-thu.001': (3, 3),
                    'skill.than.canh-phong.001': (3, 1), 'skill.phap-tuong.thien-thu.001': (0, 4), 'skill.tamphap.thanh-tam.001': (2, 3),
                    'skill.chieu.hoi-linh.001': (0, 2), 'skill.than.lang-ba.001': (3, 4)}.items():
        icons[sid] = book(*rc)
        icons['item.congphap.' + sid.split('.', 1)[1]] = book(*rc)
    scroll = cells('truc-cuon', 5, 4, (0, 0, 1536, 1024), 66)
    icons['item.nhiemvu.dau-an-huyet-sai.001'] = scroll(1, 0)
    icons['item.nhiemvu.manh-truyen-thua.001'] = scroll(2, 2)
    dp = cells('dan-phuong', 5, 4, (0, 0, 1536, 1024), 52)  # đan phương → icon đan (Luyện đan + Kho)
    for slug, n in {'truc-co': 1, 'ket-dan': 12, 'nguyen-anh': 7, 'hoa-than': 20, 'tieu-hoi-huyet': 13, 'hoi-linh': 15,
                    'cuong-cong': 3, 'cuong-the': 10, 'duy-tri': 16}.items():
        icons[f'item.danphuong.{slug}.001'] = dp(*divmod(n - 1, 5))
    for slot, n in {'vu-khi': 18, 'trang-phuc': 10, 'nhan': 15, 'day-chuyen': 5, 'mat-na': 6, 'linh-thu': 13, 'canh': 8, 'phap-tuong': 20}.items():
        icons[f'item.congthuc.{slot}.001'] = scroll(*divmod(n - 1, 5))
    shik = Image.open(pack("#1 - Transparent Icons.png")).convert('RGBA')
    si = lambda i: tight(shik.crop(((i % 16) * 32, (i // 16) * 32, (i % 16) * 32 + 32, (i // 16) * 32 + 32)))
    for slot, i in {'vu-khi': 82, 'trang-phuc': 117, 'nhan': 133, 'day-chuyen': 134, 'mat-na': 115, 'canh': 60, 'phap-tuong': 62, 'linh-thu': 314}.items():
        icons[f'slot.{slot}'] = si(i)
    icons['linh-thach'] = si(206)
    # Atlas 64×64 mỗi ô
    S = 64
    keys = list(icons)
    cols = 16
    atlas = Image.new('RGBA', (cols * S, ((len(keys) + cols - 1) // cols) * S))
    idx = {}
    for n, k in enumerate(keys):
        im = icons[k]
        sm = im.width <= 32 and im.height <= 32  # icon 32 điểm: phóng nguyên lần cho sắc
        f = (S - 4) / max(im.size)
        im = im.resize((max(1, round(im.width * f)), max(1, round(im.height * f))), Image.NEAREST if sm else Image.LANCZOS)
        x, y = (n % cols) * S, (n // cols) * S
        atlas.alpha_composite(im, (x + (S - im.width) // 2, y + (S - im.height) // 2))
        idx[k] = n
    atlas.save(f"{OUT['items']}/icons.png", optimize=True)
    return {'src': 'assets/items/icons.png', 'size': S, 'cols': cols, 'map': idx}


# ---------------- Công trình thành (Thanh Vân Thành) ----------------
# (khoá, tấm, ô cắt trên ảnh gốc, cao trên bản đồ tính bằng điểm). Ảnh ra cao gấp đôi để sắc khi phóng.
PROPS = [
    ('dien-chinh', 'kien-truc', (5, 5, 650, 305), 170), ('kho-hang', 'kien-truc', (655, 15, 1050, 295), 105),
    ('te-dan', 'kien-truc', (1065, 0, 1535, 305), 120), ('cong-thanh', 'kien-truc', (5, 305, 300, 495), 110),
    ('tuong-thanh', 'kien-truc', (300, 310, 718, 495), 62), ('cau-da', 'kien-truc', (728, 375, 958, 500), 50),
    ('ho-sen', 'kien-truc', (962, 320, 1170, 500), 66), ('dai-thien-van', 'kien-truc', (1180, 320, 1315, 505), 88),
    ('tuong-tien-nhan', 'kien-truc', (1320, 300, 1515, 510), 92), ('nha-nho', 'kien-truc', (5, 495, 195, 665), 70),
    ('kho-go', 'kien-truc', (200, 505, 380, 660), 58), ('lo-luyen-dan', 'kien-truc', (385, 495, 565, 660), 66),
    ('dai-linh-chau', 'kien-truc', (565, 505, 745, 660), 54), ('cot-co', 'kien-truc', (760, 495, 870, 660), 56),
    ('bia-da', 'kien-truc', (885, 525, 1005, 660), 34), ('co-treo', 'kien-truc', (1115, 515, 1245, 660), 48),
    ('den-da', 'kien-truc', (1250, 545, 1305, 660), 28), ('cay-tung', 'kien-truc', (1310, 540, 1530, 665), 46),
    ('phap-tran', 'kien-truc', (15, 830, 255, 1015), 60), ('truyen-tong', 'dao-noi', (1295, 290, 1520, 515), 92),
    ('cay-anh-dao', 'dao-noi', (112, 625, 205, 728), 44), ('cay-bonsai', 'dao-noi', (15, 625, 105, 728), 44),
]


def run_props():
    out_dir = os.path.join(ROOT, 'assets/town')
    os.makedirs(out_dir, exist_ok=True)
    keyed = {}
    P = {}
    for key, sheet_key, box, h in PROPS:
        if sheet_key not in keyed:
            keyed[sheet_key] = load_keyed(src(sheet_key), 'magenta')
        rgb, a = keyed[sheet_key]
        im = main_blob(tight(crop(rgb, a, box)), 0.05)
        k = min(1, (h * 2) / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        path = os.path.join(out_dir, f'{key}.png')
        im.save(path, optimize=True)
        P[key] = {'src': os.path.relpath(path, ROOT), 'w': round(im.width / im.height * h), 'h': h}
    return P


# ---------------- Cây cối, đá, hoa cỏ rải trên bản đồ ----------------
# (khoá, ô cắt trên tấm canh-vat-2, cao trên bản đồ, loại: tree = cây (chặn ở gốc), rock = đá/tinh thể (chặn), small = cỏ hoa (đi xuyên))
DECOR = [
    ('anh-dao', (20, 9, 190, 171), 58, 'tree'), ('hoa-trang', (215, 11, 387, 173), 58, 'tree'), ('cay-xanh', (401, 10, 551, 174), 58, 'tree'),
    ('cay-do', (571, 11, 721, 173), 58, 'tree'), ('cay-vang', (743, 10, 894, 173), 58, 'tree'), ('lieu', (912, 9, 1063, 174), 60, 'tree'),
    ('tu-dang', (1091, 10, 1254, 173), 60, 'tree'), ('tung-cong', (1264, 10, 1413, 175), 54, 'tree'), ('thong', (1434, 16, 1524, 173), 60, 'tree'),
    ('truc', (13, 179, 125, 293), 48, 'tree'), ('truc-2', (177, 180, 265, 292), 48, 'tree'), ('chuoi', (463, 188, 576, 295), 42, 'tree'),
    ('dua', (560, 181, 696, 296), 50, 'tree'), ('co-thu', (15, 384, 154, 542), 62, 'tree'), ('cay-hoc', (150, 386, 287, 543), 58, 'tree'),
    ('cay-con', (417, 396, 487, 482), 34, 'tree'), ('cay-con-2', (509, 397, 575, 482), 34, 'tree'), ('cay-tron', (604, 386, 694, 482), 40, 'tree'),
    ('bui-1', (701, 196, 782, 295), 26, 'small'), ('bui-2', (794, 193, 868, 293), 26, 'small'), ('bui-3', (879, 193, 951, 294), 26, 'small'),
    ('hoa-1', (964, 202, 1039, 297), 18, 'small'), ('hoa-2', (1043, 194, 1111, 297), 18, 'small'), ('hoa-3', (1116, 194, 1182, 297), 18, 'small'),
    ('lau-1', (1366, 190, 1434, 297), 26, 'small'), ('lau-2', (1437, 189, 1520, 298), 26, 'small'), ('co-1', (16, 316, 98, 371), 12, 'small'),
    ('co-2', (103, 316, 181, 372), 12, 'small'), ('hoa-nho-1', (195, 308, 242, 373), 12, 'small'), ('hoa-nho-2', (251, 309, 296, 373), 12, 'small'),
    ('hoa-nho-3', (301, 309, 347, 373), 12, 'small'), ('hoa-nho-4', (356, 311, 400, 373), 12, 'small'), ('hoa-nho-5', (407, 312, 449, 373), 12, 'small'),
    ('hoa-nho-6', (455, 312, 497, 373), 12, 'small'), ('la', (504, 316, 564, 376), 12, 'small'), ('nam-do', (738, 311, 808, 380), 16, 'small'),
    ('nam-tim', (817, 310, 891, 380), 16, 'small'), ('nam-xanh', (904, 311, 973, 384), 16, 'small'), ('hoa-cam', (984, 310, 1049, 383), 16, 'small'),
    ('hoa-bang', (1059, 307, 1128, 383), 18, 'small'), ('da-lon', (722, 386, 808, 469), 34, 'rock'), ('da-2', (817, 392, 904, 470), 30, 'rock'),
    ('da-3', (914, 399, 985, 469), 24, 'rock'), ('da-reu', (990, 401, 1069, 469), 22, 'rock'), ('da-vun', (1072, 422, 1130, 467), 10, 'small'),
    ('da-vun-2', (1134, 424, 1177, 465), 10, 'small'), ('da-nhon', (1220, 387, 1282, 467), 32, 'rock'), ('da-nhon-2', (1286, 394, 1360, 468), 30, 'rock'),
    ('da-nhon-3', (1365, 407, 1435, 470), 24, 'rock'), ('nui-da', (15, 630, 137, 734), 48, 'rock'), ('hang-da', (142, 637, 275, 734), 46, 'rock'),
    ('hang-da-2', (277, 628, 435, 734), 46, 'rock'), ('bia-co', (438, 637, 515, 735), 32, 'rock'), ('bia-co-2', (520, 637, 603, 735), 30, 'rock'),
    ('tang-da', (608, 650, 709, 735), 28, 'rock'), ('cot-da', (715, 635, 781, 735), 34, 'rock'), ('cot-da-2', (835, 637, 898, 731), 32, 'rock'),
    ('phe-tich', (899, 636, 1016, 734), 32, 'rock'), ('phe-tich-2', (1018, 649, 1079, 731), 28, 'rock'), ('da-cum', (15, 743, 119, 811), 26, 'rock'),
    ('da-den', (127, 745, 195, 812), 24, 'rock'), ('da-dung', (205, 747, 270, 814), 24, 'rock'), ('da-dung-2', (277, 743, 349, 815), 26, 'rock'),
    ('da-dung-3', (358, 742, 409, 815), 24, 'rock'), ('tinh-den', (722, 474, 805, 549), 24, 'rock'), ('tinh-trang', (816, 481, 905, 550), 24, 'rock'),
    ('tinh-cam', (909, 481, 984, 551), 24, 'rock'), ('tinh-vang', (991, 481, 1072, 553), 24, 'rock'), ('tinh-luc', (1074, 476, 1218, 557), 26, 'rock'),
    ('tinh-tim', (1219, 474, 1298, 559), 28, 'rock'), ('tinh-do', (1299, 474, 1377, 559), 28, 'rock'), ('tinh-lam', (1378, 477, 1453, 560), 28, 'rock'),
    ('tinh-bang', (1456, 476, 1520, 557), 30, 'rock'), ('go-1', (17, 564, 122, 626), 14, 'small'), ('go-2', (130, 563, 221, 630), 14, 'small'),
    ('go-3', (225, 568, 310, 629), 14, 'small'), ('goc-cay', (688, 558, 788, 632), 22, 'rock'), ('re-kho', (793, 556, 934, 635), 22, 'small'),
    ('re-kho-2', (939, 562, 1039, 636), 22, 'small'), ('goc-nho', (407, 494, 497, 547), 18, 'small'), ('den-dat', (1468, 645, 1518, 728), 22, 'rock'),
    ('den-dat-2', (495, 737, 542, 817), 24, 'rock'),
]


def run_decor():
    rgb, a = load_keyed(src('canh-vat-2'), 'magenta')
    ims = []
    for key, box, h, kind in DECOR:
        im = main_blob(tight(crop(rgb, a, box)), 0.15)
        k = min(1, (h * 2) / im.height)
        ims.append((key, im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS), h, kind))
    W = 1024
    x = y = row_h = 0
    pos = []
    for key, im, h, kind in ims:  # xếp kệ đơn giản
        if x + im.width > W:
            x, y, row_h = 0, y + row_h + 2, 0
        pos.append((x, y)); x += im.width + 2; row_h = max(row_h, im.height)
    atlas = Image.new('RGBA', (W, y + row_h))
    out = {}
    for (key, im, h, kind), (px, py) in zip(ims, pos):
        atlas.alpha_composite(im, (px, py))
        w = round(im.width / im.height * h)
        r = 4 if kind == 'tree' else round(w * 0.32) if kind == 'rock' else 0
        out[key] = {'x': px, 'y': py, 'sw': im.width, 'sh': im.height, 'w': w, 'h': h, 'kind': kind, 'r': r}
    os.makedirs(os.path.join(ROOT, 'assets/decor'), exist_ok=True)
    atlas.save(os.path.join(ROOT, 'assets/decor/atlas.png'), optimize=True)
    return {'src': 'assets/decor/atlas.png', 'items': out}


if __name__ == '__main__':
    data = {'_ghi_chu': 'Sinh bằng tools/asset_build.py — KHÔNG sửa tay. Hình thử nghiệm, chủ dự án sẽ thay.',
            'sheets': run_monsters(), 'fx': run_fx(), 'icons': run_icons(), 'props': run_props(), 'decor': run_decor()}
    os.makedirs(os.path.join(ROOT, 'data/art'), exist_ok=True)
    with open(os.path.join(ROOT, 'data/art/sprites.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print('xong:', len(data['sheets']), 'sheet,', len(data['fx']), 'hiệu ứng,', len(data['icons']['map']), 'icon')
