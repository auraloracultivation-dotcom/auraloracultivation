"""Icon Bảng xếp hạng VẼ BẰNG CODE (23/10/2026) chờ ảnh chủ dự án: lấy khung icon Nhiệm vụ, xoá hình giữa, vẽ cúp vàng 3 bậc.
Dùng: python3 -I tools/icon_bxh.py → assets/ui/icons/bxh.png"""
from PIL import Image, ImageDraw

im = Image.open('assets/ui/icons/nhiem-vu.png').convert('RGBA')
W, H = im.size
px = im.load()
bg = px[W // 2, 14]  # nền xanh đậm trong khung
d = ImageDraw.Draw(im)
d.rectangle((14, 13, W - 15, H - 14), fill=bg)  # xoá cuộn giấy, giữ viền + 4 hạt ngọc ở góc
for corner in ((4, 4), (W - 22, 4), (4, H - 22), (W - 22, H - 22)):  # dán lại góc ngọc gốc
    src = Image.open('assets/ui/icons/nhiem-vu.png').convert('RGBA').crop((*corner, corner[0] + 18, corner[1] + 18))
    im.alpha_composite(src, corner)
O, G1, G2, G3 = (58, 34, 14, 255), (255, 226, 120, 255), (244, 186, 70, 255), (190, 120, 34, 255)
cx = W // 2
# bục 3 bậc
for x0, x1, top, col in ((cx - 30, cx - 11, 62, G3), (cx + 11, cx + 30, 66, G3), (cx - 12, cx + 12, 56, G2)):
    d.rectangle((x0, top, x1, 77), fill=col, outline=O, width=2)
d.text((cx - 3, 59), '1', fill=O)
# cúp
d.polygon([(cx - 17, 18), (cx + 17, 18), (cx + 13, 36), (cx + 5, 43), (cx - 5, 43), (cx - 13, 36)], fill=G2, outline=O)
d.polygon([(cx - 14, 20), (cx - 4, 20), (cx - 6, 36), (cx - 11, 34)], fill=G1)  # ánh sáng
for s in (-1, 1):  # quai
    d.arc((cx + s * 17 - 8, 20, cx + s * 17 + 8, 34), 270 if s > 0 else 90, 90 if s > 0 else 270, fill=O, width=3)
d.rectangle((cx - 3, 43, cx + 3, 49), fill=G3, outline=O)
d.rectangle((cx - 10, 49, cx + 10, 55), fill=G2, outline=O, width=2)
im.save('assets/ui/icons/bxh.png', optimize=True)
print('ok', im.size)
