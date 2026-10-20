"""Chuẩn hoá ảnh trang phục kiểu My Heroes cho lắp ráp bằng code.

Dùng: python3 -I tools/outfit_strip.py <thư mục trang-phuc>   (sửa tại chỗ các art.outfit.*.png, cập nhật manifest.json)

Mỗi ảnh:
- Khử viền hồng (mép còn ám nền hồng → đổi về màu viền tối).
- Xoá 2 bàn tay tròn vẽ sẵn (khối màu da ở 2 bên, nửa dưới) và vá lại bằng màu xung quanh;
  ghi vị trí tay vào manifest (`hands`) để code đặt tay đúng chỗ cũ.
- Xoá 2 bàn chân vẽ sẵn dưới gấu áo (code vẽ giày riêng); ghi `hem` = đáy gấu áo.
- Ghi `neck` = đường cắt đầu/áo (tỉ lệ theo gấu áo), ngay dưới cằm.
Cần opencv (chỉ dùng khi chuẩn bị asset, không chạy trong game/CI).
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage


def defringe(a):
    rgb, al = a[..., :3].astype(int), a[..., 3]
    edge = (al > 0) & ndimage.binary_dilation(al == 0, iterations=2)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    pink = edge & (r > g + 35) & (b > g + 35)
    a[pink, :3] = (34, 22, 30)
    return a


def find_neck(path, hem):
    """Đường cắt đầu/áo = ngay dưới cằm: đáy khối màu da lớn nhất (mặt) ở nửa trên, tỉ lệ theo gấu áo.
    Ngoài khoảng 0,70–0,80 (tóc hồng, áo trắng bị nhầm là da) thì dùng giá trị chung 0,755."""
    a = np.array(Image.open(path).convert('RGBA')).astype(int)
    H, W = a.shape[:2]
    r, g, b, al = (a[..., i] for i in range(4))
    skin = (al > 0) & (r > 215) & (g > 165) & (b > 130) & (r - b < 100) & (r - g > 12)
    skin[:, :int(W * .2)] = False
    skin[:, int(W * .8):] = False
    lab, _ = ndimage.label(skin)
    best = None
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        s = (lab[sl] == i).sum()
        if (sl[0].start + sl[0].stop) / 2 < hem * .8 and (best is None or s > best[0]):
            best = (s, sl)
    neck = (best[1][0].stop + 1) / hem if best else None
    return round(neck, 3) if neck and .70 <= neck <= .80 else 0.755


def strip(path):
    a = np.array(Image.open(path).convert('RGBA'))
    a = defringe(a)
    H, W = a.shape[:2]
    rgb, al = a[..., :3].astype(int), a[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    skin = (al > 0) & (r > 205) & (g > 160) & (b > 120) & (r - b < 110)
    skin[: int(H * .70)] = False
    lab, n = ndimage.label(skin)
    hands = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        m = lab == i
        s = m.sum()
        cy, cx = ndimage.center_of_mass(m)
        if 25 < s < 900 and (cx < W * .36 or cx > W * .64):
            hands.append((cx, cy, m))
    # chọn cặp trái–phải cùng độ cao nhất (tránh nhầm trang sức, tóc màu sáng)
    L = [h for h in hands if h[0] < W / 2]
    R = [h for h in hands if h[0] >= W / 2]
    if L and R:
        hands = list(min(((l, r) for l in L for r in R), key=lambda p: abs(p[0][1] - p[1][1])))
    else:
        hands = L[:1] + R[:1]
    mask = np.zeros((H, W), np.uint8)
    for cx, cy, m in hands:
        mask |= ndimage.binary_dilation(m, iterations=3).astype(np.uint8)
    # chân: các khối tối nhỏ tách khỏi gấu áo ở đáy ảnh
    rows = (al > 0).sum(1)
    hem = H
    for y in range(H - 1, int(H * .8), -1):
        if rows[y] > W * .42:
            hem = y + 1
            break
    feet = np.zeros((H, W), bool)
    feet[hem:] = al[hem:] > 0
    out = a.copy()
    if mask.any():
        hm = mask.astype(bool)
        body = (al > 0) & ~hm
        # thân không tay: bao lồi của phần thân ở các hàng có tay → chỗ tay đè lên áo được lấp lại
        ys, xs = np.nonzero(body & (np.arange(H)[:, None] > H * .55))
        hull = np.zeros((H, W), np.uint8)
        if len(xs):
            cv2.fillConvexPoly(hull, cv2.convexHull(np.stack([xs, ys], 1).astype(np.int32)), 1)
        keep = hm & hull.astype(bool)
        # tô màu: điểm trong suốt lấy màu điểm thân gần nhất, rồi vá vùng tay từ màu thân
        _, (iy, ix) = ndimage.distance_transform_edt(~body, return_indices=True)
        base = a[..., :3][iy, ix]
        out[..., :3] = cv2.inpaint(np.ascontiguousarray(base), hm.astype(np.uint8), 4, cv2.INPAINT_TELEA)
        out[..., :3] = np.where(hm[..., None], out[..., :3], a[..., :3])
        out[..., 3] = np.where(hm, np.where(keep, 255, 0), al)
    out[feet, 3] = 0
    Image.fromarray(out).save(path, optimize=True)
    return {'hands': [[round(cx, 1), round(cy, 1)] for cx, cy, _ in hands], 'hem': int(hem)}


def main():
    d = Path(sys.argv[1])
    man = json.loads((d / 'manifest.json').read_text())
    for it in man:
        if 'hem' in it:  # đã chuẩn hoá
            if 'neck' not in it:
                it['neck'] = 0.64 if it.get('limbs') else find_neck(d / it['file'], it['hem'])
            continue
        if '.tan-thu.' in it['id']:  # mẫu tân thủ vẽ sẵn tay chân: giữ nguyên, code không vẽ tay/chân
            it.update({'limbs': True, 'hands': [], 'hem': it['h'], 'anchor': [round(it['w'] / 2, 1), it['h']],
                       'neck': 0.64})
            continue
        info = strip(d / it['file'])
        it.update(info)
        it['anchor'] = [round(it['w'] / 2, 1), info['hem']]
        it['neck'] = find_neck(d / it['file'], info['hem'])
        if len(info['hands']) != 2:
            print('⚠ không thấy đủ 2 tay:', it['file'], info['hands'])
    (d / 'manifest.json').write_text(json.dumps(man, ensure_ascii=False, indent=1))
    print(len(man), 'trang phục đã chuẩn hoá')


if __name__ == '__main__':
    main()
